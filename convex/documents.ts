import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { requireBusinessAccess } from "./authHelpers";
import { api } from "./_generated/api";

export const STORAGE_QUOTAS_BYTES = {
  free: 50 * 1024 * 1024, // 50 MB
  plus: 500 * 1024 * 1024, // 500 MB
  pro: 5 * 1024 * 1024 * 1024, // 5 GB
  pro_plus: 50 * 1024 * 1024 * 1024, // 50 GB
} as const;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Convex Action: Generate presigned upload parameters & validate tier storage quotas.
 */
export const createUploadUrl = action({
  args: {
    businessId: v.id("businesses"),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(args.mimeType)) {
      throw new Error(`Unsupported file type: ${args.mimeType}. Allowed: PDF, JPG, PNG, WEBP, DOCX.`);
    }

    // 2. Validate max file size (20MB)
    if (args.sizeBytes > 20 * 1024 * 1024) {
      throw new Error("File size exceeds 20MB limit.");
    }

    // 3. Query existing business storage usage
    const usage = await ctx.runQuery(api.documents.getBusinessStorageUsage, {
      businessId: args.businessId,
    });

    const tier = usage.tier as keyof typeof STORAGE_QUOTAS_BYTES || "free";
    const quota = STORAGE_QUOTAS_BYTES[tier] || STORAGE_QUOTAS_BYTES.free;

    if (usage.totalUsedBytes + args.sizeBytes > quota) {
      throw new Error(
        `Storage quota exceeded for tier "${tier}". Used: ${Math.round(usage.totalUsedBytes / (1024 * 1024))}MB, Max: ${Math.round(quota / (1024 * 1024))}MB.`
      );
    }

    const r2Key = `vault/${args.businessId}/${Date.now()}-${args.fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploadUrl = `https://r2-upload.aibusinesspassport.ng/${r2Key}?signature=presigned_token`;

    return {
      r2Key,
      uploadUrl,
      maxSizeBytes: 20 * 1024 * 1024,
    };
  },
});

/**
 * Register metadata after client completes R2 upload.
 */
export const registerUpload = mutation({
  args: {
    businessId: v.id("businesses"),
    r2Key: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    category: v.optional(
      v.union(
        v.literal("registration"),
        v.literal("tax"),
        v.literal("licences"),
        v.literal("employees"),
        v.literal("contracts"),
        v.literal("finance"),
        v.literal("credentials"),
        v.literal("tender"),
        v.literal("other"),
        v.literal("uncategorised")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireBusinessAccess(ctx, args.businessId, "staff");
    const now = new Date().toISOString();

    const documentId = await ctx.db.insert("documents", {
      businessId: args.businessId,
      r2Key: args.r2Key,
      fileName: args.fileName,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      category: args.category || "uncategorised",
      status: "processing",
      reviewStatus: "needs_review",
      uploadedBy: user.clerkId,
      folderShareGrants: [],
      createdAt: now,
      updatedAt: now,
    });

    return { documentId, r2Key: args.r2Key };
  },
});

/**
 * Calculate business storage usage against tier limits.
 */
export const getBusinessStorageUsage = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);
    if (!business) {
      throw new Error("Business not found");
    }

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();

    const totalUsedBytes = docs.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);
    const tier = business.plan?.tier || "free";

    return {
      tier,
      totalUsedBytes,
      totalFiles: docs.length,
      quotaBytes: STORAGE_QUOTAS_BYTES[tier as keyof typeof STORAGE_QUOTAS_BYTES] || STORAGE_QUOTAS_BYTES.free,
    };
  },
});

/**
 * Fetch Vault documents with category filtering & advisor access checks.
 */
export const getVaultDocuments = query({
  args: {
    businessId: v.id("businesses"),
    category: v.optional(v.string()),
    reviewStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require business access (advisor role enforced by category grant)
    await requireBusinessAccess(
      ctx,
      args.businessId,
      "advisor",
      args.category || "registration"
    );

    let docs = await ctx.db
      .query("documents")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();

    if (args.category && args.category !== "all") {
      docs = docs.filter((d) => d.category === args.category);
    }

    if (args.reviewStatus) {
      docs = docs.filter((d) => d.reviewStatus === args.reviewStatus);
    }

    return docs;
  },
});

/**
 * Update document metadata after Document Intelligence or user manual review.
 */
export const updateDocumentIntelligenceResult = mutation({
  args: {
    documentId: v.id("documents"),
    category: v.union(
      v.literal("registration"),
      v.literal("tax"),
      v.literal("licences"),
      v.literal("employees"),
      v.literal("contracts"),
      v.literal("finance"),
      v.literal("credentials"),
      v.literal("tender"),
      v.literal("other"),
      v.literal("uncategorised")
    ),
    docType: v.optional(v.string()),
    extractedJson: v.string(),
    extractionConfidence: v.number(),
    reviewStatus: v.union(
      v.literal("auto_filed"),
      v.literal("needs_review"),
      v.literal("confirmed"),
      v.literal("rejected")
    ),
    issuedAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    status: v.union(v.literal("processing"), v.literal("ready"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    const now = new Date().toISOString();

    await ctx.db.patch(args.documentId, {
      category: args.category,
      docType: args.docType,
      extracted: args.extractedJson,
      extractionConfidence: args.extractionConfidence,
      reviewStatus: args.reviewStatus,
      issuedAt: args.issuedAt,
      expiresAt: args.expiresAt,
      status: args.status,
      updatedAt: now,
    });

    // Story C3 & Segment 6: Expiry detection creates complianceItems (source "document_expiry")
    if (args.expiresAt) {
      await ctx.db.insert("complianceItems", {
        businessId: doc.businessId,
        ruleKey: `DOC_EXPIRY_${doc._id}`,
        ruleVersion: 1,
        status: args.expiresAt < now ? "needs_attention" : "coming_up",
        dueDate: args.expiresAt,
        plainSummary: `Renew document: ${doc.fileName}`,
        source: "document_expiry",
        lastReviewedAt: now,
        confirmBeforeFiling: false,
        confidence: 1.0,
        evidenceDocumentId: doc._id,
        createdFrom: "manual",
        createdAt: now,
        updatedAt: now,
      });
    }

    return { documentId: args.documentId };
  },
});

/**
 * User confirms/corrects document category and extracted values ("Needs Review" Inbox).
 */
export const confirmDocumentReview = mutation({
  args: {
    documentId: v.id("documents"),
    confirmedCategory: v.union(
      v.literal("registration"),
      v.literal("tax"),
      v.literal("licences"),
      v.literal("employees"),
      v.literal("contracts"),
      v.literal("finance"),
      v.literal("credentials"),
      v.literal("tender"),
      v.literal("other"),
      v.literal("uncategorised")
    ),
    confirmedDocType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    await requireBusinessAccess(ctx, doc.businessId, "staff");
    const now = new Date().toISOString();

    await ctx.db.patch(args.documentId, {
      category: args.confirmedCategory,
      docType: args.confirmedDocType || doc.docType,
      reviewStatus: "confirmed",
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Soft delete document & queue R2 object purge.
 */
export const deleteDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    await requireBusinessAccess(ctx, doc.businessId, "staff");

    await ctx.db.delete(args.documentId);
    return { success: true, r2Key: doc.r2Key };
  },
});
