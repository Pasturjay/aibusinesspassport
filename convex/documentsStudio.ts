import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireBusinessAccess } from "./authHelpers";
import { GeneratedDocSection } from "../lib/documentStudio/generator";
import { evaluateDeterministicQC } from "../lib/documentStudio/qc";

/**
 * Generate a new document draft in Document Studio after running QC pass.
 */
export const createDocDraft = mutation({
  args: {
    businessId: v.id("businesses"),
    kind: v.union(
      v.literal("profile_standard"),
      v.literal("profile_corporate"),
      v.literal("profile_procurement"),
      v.literal("profile_tender"),
      v.literal("profile_investor"),
      v.literal("profile_one_page"),
      v.literal("quotation"),
      v.literal("invoice"),
      v.literal("contract"),
      v.literal("proposal"),
      v.literal("capability_statement"),
      v.literal("eoi"),
      v.literal("letterhead"),
      v.literal("business_card"),
      v.literal("tender_response")
    ),
    audience: v.object({
      name: v.optional(v.string()),
      type: v.optional(v.string()),
    }),
    industry: v.optional(v.string()),
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");

    const business = await ctx.db.get(args.businessId);
    if (!business) throw new Error("Business not found");

    // Deterministic QC check
    const detQC = evaluateDeterministicQC(business, args.kind);
    const passed = detQC.errors.length === 0;

    const qcReport = {
      passed,
      missingFields: detQC.missingFields,
      inconsistencies: detQC.inconsistencies,
      contradictions: [],
    };

    const now = new Date().toISOString();

    const docId = await ctx.db.insert("generatedDocs", {
      businessId: args.businessId,
      kind: args.kind,
      audience: args.audience,
      industry: args.industry,
      templateId: args.templateId,
      inputSnapshot: business.brainVersion,
      qcReport,
      draftContent: JSON.stringify([]),
      status: passed ? "draft" : "qc_failed",
      confirmBeforeFiling: args.kind === "contract",
      aiMeta: {
        model: "claude-3-5-sonnet-20241022",
        promptVersion: "v0.1",
        tokens: 0,
        costEstimate: "₦0.00",
      },
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    return { docId, passed, qcReport };
  },
});

/**
 * Update a specific section in Document Studio editor.
 * Records version history entry in generatedDocVersions.
 * DOES NOT write back to Business Brain unless updateBrainDetails is explicitly invoked.
 */
export const updateDocSection = mutation({
  args: {
    docId: v.id("generatedDocs"),
    sectionKey: v.string(),
    newContent: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId);
    if (!doc) throw new Error("Document not found");

    await requireBusinessAccess(ctx, doc.businessId, "staff");

    let sections: GeneratedDocSection[] = [];
    try {
      sections = JSON.parse(doc.draftContent);
    } catch {
      sections = [];
    }

    const secIndex = sections.findIndex((s) => s.key === args.sectionKey);
    const previousContent = secIndex !== -1 ? sections[secIndex].content : "";

    if (secIndex !== -1) {
      sections[secIndex].content = args.newContent;
    } else {
      sections.push({ key: args.sectionKey, title: args.sectionKey, content: args.newContent });
    }

    const now = new Date().toISOString();

    // 1. Update generatedDoc record
    await ctx.db.patch(doc._id, {
      draftContent: JSON.stringify(sections),
      updatedAt: now,
    });

    // 2. Insert version history record in generatedDocVersions
    const versions = await ctx.db
      .query("generatedDocVersions")
      .withIndex("by_doc", (q) => q.eq("docId", doc._id))
      .collect();

    await ctx.db.insert("generatedDocVersions", {
      docId: doc._id,
      version: versions.length + 1,
      sectionKey: args.sectionKey,
      previousContent,
      newContent: args.newContent,
      actor: "user",
      createdAt: now,
    });

    return { success: true, version: versions.length + 1 };
  },
});

/**
 * Explicit User Opt-In: Update Business Brain details from edited Document Studio content.
 */
export const updateBusinessDetailsFromDoc = mutation({
  args: {
    businessId: v.id("businesses"),
    patch: v.object({
      description: v.optional(v.string()),
      tradingName: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireBusinessAccess(ctx, args.businessId, "staff");

    const business = await ctx.db.get(args.businessId);
    if (!business) throw new Error("Business not found");

    const now = new Date().toISOString();
    const updatedVersion = business.brainVersion + 1;

    await ctx.db.patch(args.businessId, {
      identity: {
        ...business.identity,
        description: args.patch.description || business.identity.description,
        tradingName: args.patch.tradingName || business.identity.tradingName,
      },
      brainVersion: updatedVersion,
      updatedAt: now,
    });

    // Record Brain History Audit Entry
    await ctx.db.insert("brainHistory", {
      businessId: args.businessId,
      version: updatedVersion,
      patch: JSON.stringify(args.patch),
      actor: { type: "user", id: user.clerkId },
      reason: "Updated Business Brain from Document Studio editor",
      createdAt: now,
    });

    return { success: true, newBrainVersion: updatedVersion };
  },
});

/**
 * Get generated document details with section list and version history.
 */
export const getDocWithHistory = query({
  args: {
    docId: v.id("generatedDocs"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId);
    if (!doc) throw new Error("Document not found");

    await requireBusinessAccess(ctx, doc.businessId, "staff");

    const history = await ctx.db
      .query("generatedDocVersions")
      .withIndex("by_doc", (q) => q.eq("docId", doc._id))
      .collect();

    let sections: GeneratedDocSection[] = [];
    try {
      sections = JSON.parse(doc.draftContent);
    } catch {
      sections = [];
    }

    return {
      doc,
      sections,
      history: history.sort((a, b) => b.version - a.version),
    };
  },
});
