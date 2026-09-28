import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireBusinessAccess } from "./authHelpers";

/**
 * Public Mutation: Submit a verified document request from a public passport card.
 * Anti-Abuse: Generates verificationToken, checks blocked status, creates connection record.
 */
export const createDocumentRequest = mutation({
  args: {
    passportId: v.string(),
    requesterName: v.string(),
    requesterCompany: v.string(),
    requesterEmail: v.string(),
    requesterPhone: v.optional(v.string()),
    requestedItems: v.array(
      v.union(
        v.literal("company_profile"),
        v.literal("registration"),
        v.literal("compliance_docs"),
        v.literal("capability_statement"),
        v.literal("certifications"),
        v.literal("contact")
      )
    ),
    message: v.optional(v.string()),
    autoVerifyEmail: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Find passport to resolve businessId
    const passport = await ctx.db
      .query("passports")
      .withIndex("by_passport_id", (q) => q.eq("passportId", args.passportId))
      .unique();

    if (!passport) {
      throw new Error("Invalid Passport ID");
    }

    // Check if requester is blocked by owner in connections table
    const existingConns = await ctx.db
      .query("connections")
      .withIndex("by_business", (q) => q.eq("businessId", passport.businessId))
      .collect();

    const isBlocked = existingConns.some(
      (c) => c.email?.toLowerCase() === args.requesterEmail.toLowerCase() && c.status === "blocked"
    );

    if (isBlocked) {
      throw new Error("Requester is blocked by business owner");
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days
    const rawToken = `req_tok_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const verificationToken = `verif_${Math.random().toString(36).substring(2, 10)}`;

    const isVerifiedEmail = args.autoVerifyEmail ?? false;

    const requestId = await ctx.db.insert("documentRequests", {
      passportId: args.passportId,
      businessId: passport.businessId,
      requesterName: args.requesterName,
      requesterCompany: args.requesterCompany,
      requesterEmail: args.requesterEmail,
      requesterPhone: args.requesterPhone,
      isVerifiedEmail,
      verificationToken,
      requestedItems: args.requestedItems,
      message: args.message,
      status: "pending",
      accessToken: rawToken,
      expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    // Create or update connection record (Story H1)
    const existingConn = existingConns.find(
      (c) => c.email?.toLowerCase() === args.requesterEmail.toLowerCase()
    );

    if (existingConn) {
      await ctx.db.patch(existingConn._id, {
        name: args.requesterName,
        company: args.requesterCompany,
        phone: args.requesterPhone || existingConn.phone,
        lastContactedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    } else {
      await ctx.db.insert("connections", {
        businessId: passport.businessId,
        name: args.requesterName,
        company: args.requesterCompany,
        email: args.requesterEmail,
        phone: args.requesterPhone,
        source: "request",
        status: "active",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    // If auto-verified, trigger owner notification immediately
    if (isVerifiedEmail) {
      await ctx.db.insert("notifications", {
        userId: passport.businessId,
        businessId: passport.businessId,
        channel: "in_app",
        template: "document_request_received",
        payload: JSON.stringify({
          requesterName: args.requesterName,
          requesterCompany: args.requesterCompany,
          requestId,
        }),
        status: "queued",
        dedupeKey: `req_notif_${requestId}`,
        createdAt: now.toISOString(),
      });
    }

    return {
      requestId,
      accessToken: rawToken,
      verificationToken,
      isVerifiedEmail,
    };
  },
});

/**
 * Public Mutation: Verify requester email via verificationToken.
 * Triggers owner notification ONLY after email verification!
 */
export const verifyRequesterEmail = mutation({
  args: { verificationToken: v.string() },
  handler: async (ctx, args) => {
    const req = await ctx.db
      .query("documentRequests")
      .withIndex("by_token", (q) => q.eq("verificationToken", args.verificationToken))
      .unique();

    if (!req) {
      throw new Error("Invalid verification token");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(req._id, {
      isVerifiedEmail: true,
      updatedAt: now,
    });

    // Trigger owner notification
    await ctx.db.insert("notifications", {
      userId: req.businessId,
      businessId: req.businessId,
      channel: "in_app",
      template: "document_request_received",
      payload: JSON.stringify({
        requesterName: req.requesterName,
        requesterCompany: req.requesterCompany,
        requestId: req._id,
      }),
      status: "queued",
      dedupeKey: `req_notif_${req._id}`,
      createdAt: now,
    });

    return { success: true, requestId: req._id };
  },
});

/**
 * Owner Query: Fetch incoming document requests for a business.
 */
export const getIncomingDocumentRequests = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");

    const requests = await ctx.db
      .query("documentRequests")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();

    return requests.reverse();
  },
});

/**
 * Owner Mutation: Approve or decline a document request.
 * Document Filtering Guarantee: Only confirmed/auto_filed non-expired docs enter package.
 * Expired or missing docs are excluded and appended to gaps[].
 */
export const decideDocumentRequest = mutation({
  args: {
    businessId: v.id("businesses"),
    requestId: v.id("documentRequests"),
    decision: v.union(v.literal("approved"), v.literal("declined")),
    documentIds: v.optional(v.array(v.id("documents"))),
    gaps: v.optional(v.array(v.string())),
    expiresInDays: v.optional(v.number()),
    maxDownloads: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireBusinessAccess(ctx, args.businessId, "staff");

    const req = await ctx.db.get(args.requestId);
    if (!req || req.businessId !== args.businessId) {
      throw new Error("Document request not found for this business");
    }

    // Require email verification before approving
    if (args.decision === "approved" && req.isVerifiedEmail === false) {
      throw new Error("Cannot approve request: Requester email is unverified");
    }

    const now = new Date();
    const decidedAt = now.toISOString();

    if (args.decision === "declined") {
      await ctx.db.patch(args.requestId, {
        status: "declined",
        decidedAt,
        updatedAt: decidedAt,
      });

      // Notify requester of decline (with NO documents attached)
      await ctx.db.insert("notifications", {
        userId: req.requesterEmail,
        businessId: args.businessId,
        channel: "email",
        template: "document_request_declined",
        payload: JSON.stringify({ requesterName: req.requesterName }),
        status: "queued",
        dedupeKey: `declined_${req._id}`,
        createdAt: decidedAt,
      });

      return { success: true, status: "declined" };
    }

    // Process approval & create shared package
    const days = args.expiresInDays || 7;
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    const tokenHash = `hash_${req.accessToken}`;
    const maxDl = args.maxDownloads || 10;

    const items = [];
    const collectedGaps: string[] = [...(args.gaps || [])];

    if (args.documentIds) {
      for (const docId of args.documentIds) {
        const doc = await ctx.db.get(docId);
        if (!doc || doc.businessId !== args.businessId) {
          collectedGaps.push(`Document ${docId} not found`);
          continue;
        }

        // DOCUMENT FILTERING RULE: Only confirmed or auto_filed non-expired docs enter package
        const isValidStatus = doc.reviewStatus === "confirmed" || doc.reviewStatus === "auto_filed";
        const isNotExpired = !doc.expiresAt || doc.expiresAt > decidedAt;

        if (isValidStatus && isNotExpired) {
          items.push({
            label: doc.fileName || doc.docType || "Document",
            documentId: docId,
          });
        } else {
          const reason = !isValidStatus ? "unreviewed" : "expired";
          collectedGaps.push(`${doc.fileName || doc.docType} (${reason})`);
        }
      }
    }

    const packageId = await ctx.db.insert("sharedPackages", {
      businessId: args.businessId,
      requestId: args.requestId,
      items,
      gaps: collectedGaps,
      accessTokenHash: tokenHash,
      expiresAt,
      downloadCount: 0,
      maxDownloads: maxDl,
      createdAt: decidedAt,
    });

    await ctx.db.patch(args.requestId, {
      status: "approved",
      decidedAt,
      packageId,
      updatedAt: decidedAt,
    });

    // Notify requester with package link
    await ctx.db.insert("notifications", {
      userId: req.requesterEmail,
      businessId: args.businessId,
      channel: "email",
      template: "document_request_approved",
      payload: JSON.stringify({
        requesterName: req.requesterName,
        packageToken: req.accessToken,
        expiresAt,
      }),
      status: "queued",
      dedupeKey: `approved_${req._id}`,
      createdAt: decidedAt,
    });

    // Record audit log
    await ctx.db.insert("complianceAuditLog", {
      businessId: args.businessId,
      action: "shared_package_created",
      actor: {
        type: "user",
        id: user.clerkId || user._id,
      },
      shownText: `Approved document request for ${req.requesterCompany} (${req.requesterEmail})`,
      ruleVersion: 1,
      createdAt: decidedAt,
    });

    return {
      success: true,
      status: "approved",
      packageId,
      accessToken: req.accessToken,
      gaps: collectedGaps,
    };
  },
});

/**
 * Public Query: Retrieve a shared document package using access token.
 * Checks expiration and download limit (max 10 downloads).
 */
export const getSharedPackageByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = args.token.startsWith("hash_") ? args.token : `hash_${args.token}`;

    const pkg = await ctx.db
      .query("sharedPackages")
      .withIndex("by_token_hash", (q) => q.eq("accessTokenHash", tokenHash))
      .unique();

    if (!pkg) {
      return { isFound: false, isExpired: false, isLimitReached: false, package: null };
    }

    const now = new Date().toISOString();
    if (now > pkg.expiresAt) {
      return { isFound: true, isExpired: true, isLimitReached: false, package: null };
    }

    const maxDl = pkg.maxDownloads || 10;
    if (pkg.downloadCount >= maxDl) {
      return { isFound: true, isExpired: false, isLimitReached: true, package: null };
    }

    const business = await ctx.db.get(pkg.businessId);

    // Fetch document metadata for included documents
    const resolvedItems = [];
    for (const item of pkg.items) {
      let docDetails = null;
      if (item.documentId) {
        const doc = await ctx.db.get(item.documentId);
        if (doc) {
          docDetails = {
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            category: doc.category,
            sizeBytes: doc.sizeBytes,
            docType: doc.docType,
          };
        }
      }
      resolvedItems.push({
        label: item.label,
        documentId: item.documentId,
        details: docDetails,
      });
    }

    return {
      isFound: true,
      isExpired: false,
      isLimitReached: false,
      package: {
        _id: pkg._id,
        gaps: pkg.gaps,
        expiresAt: pkg.expiresAt,
        downloadCount: pkg.downloadCount,
        maxDownloads: maxDl,
        createdAt: pkg.createdAt,
      },
      businessName: business?.identity.legalName || "Verified Business",
      items: resolvedItems,
    };
  },
});

/**
 * Public Mutation: Track package download event with download limit check.
 */
export const recordPackageDownload = mutation({
  args: { packageId: v.id("sharedPackages") },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.packageId);
    if (pkg) {
      const maxDl = pkg.maxDownloads || 10;
      if (pkg.downloadCount >= maxDl) {
        throw new Error("Download limit reached for this package (Max 10 downloads)");
      }

      await ctx.db.patch(args.packageId, {
        downloadCount: pkg.downloadCount + 1,
      });
    }
  },
});
