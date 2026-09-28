import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireBusinessAccess } from "./authHelpers";

/**
 * Idempotent Passport Creation Mutation with Collision-Safe ID Generation.
 */
export const create = mutation({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    // 1. Idempotency check: Return existing passport if already created
    const existing = await ctx.db
      .query("passports")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .unique();

    if (existing) {
      return {
        passportId: existing.passportId,
        passportSlug: existing.passportSlug || existing.passportId.toLowerCase(),
      };
    }

    const business = await ctx.db.get(args.businessId);
    if (!business) {
      throw new Error("Business not found");
    }

    // 2. Collision-safe ID Generator Loop
    let passportId = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 15) {
      attempts++;
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      passportId = `BP-NG-${randomSuffix}`;

      const checkDB = await ctx.db
        .query("passports")
        .withIndex("by_passport_id", (q) => q.eq("passportId", passportId))
        .unique();

      if (!checkDB) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      throw new Error("Failed to generate unique Passport ID after retries");
    }

    const cleanLegalName = business.identity.legalName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const passportSlug = `${cleanLegalName}-${passportId.toLowerCase()}`;
    const now = new Date().toISOString();

    // Default field visibility rules:
    // public = legalName, tradingName, industry, description, services, city/state, phone, email, logo
    // private = tin, financials, people's NIN, addresses of directors
    // on_request = registration number details, compliance documents, credentials documents
    const defaultFieldVisibility: Record<string, "public" | "private" | "on_request"> = {
      legalName: "public",
      tradingName: "public",
      industry: "public",
      description: "public",
      services: "public",
      city: "public",
      state: "public",
      phone: "public",
      email: "public",
      logo: "public",
      rcNumber: "on_request",
      complianceDocs: "on_request",
      credentialsDocs: "on_request",
      tin: "private",
      financials: "private",
      directorNIN: "private",
      directorAddresses: "private",
    };

    const newId = await ctx.db.insert("passports", {
      businessId: args.businessId,
      passportId,
      passportSlug,
      style: "professional",
      fieldVisibility: defaultFieldVisibility,
      tagline: "Verified Nigerian Enterprise",
      isActive: true,
      nfcEnabled: true,
      isVerified: true,
      status: "active",
      issuedAt: now.split("T")[0],
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    return {
      passportId,
      passportSlug,
      id: newId,
    };
  },
});

/**
 * Public Passport Resolver Query (`getPublic`).
 * STRICT MINIMAL PUBLIC SHAPE:
 * - Includes ONLY fields where fieldVisibility is "public"
 * - "on_request" fields return ONLY boolean { available: true } (NO VALUES)
 * - "private" fields are NEVER present in return object
 * - If isActive = false, returns { available: false, message: "This Passport is not available" }
 */
export const getPublic = query({
  args: {
    passportId: v.optional(v.string()),
    passportSlug: v.optional(v.string()),
    passportIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slugOrId = args.passportId || args.passportSlug || args.passportIdentifier;
    if (!slugOrId) {
      return null;
    }

    // 1. Search by passportId index
    let passport = await ctx.db
      .query("passports")
      .withIndex("by_passport_id", (q) => q.eq("passportId", slugOrId))
      .unique();

    // 2. Fallback search by slug
    if (!passport) {
      passport = await ctx.db
        .query("passports")
        .withIndex("by_slug", (q) => q.eq("passportSlug", slugOrId))
        .unique();
    }

    if (!passport) {
      return null;
    }

    // Revocation check: isActive = false returns neutral unavailable response
    if (passport.isActive === false) {
      return {
        available: false,
        message: "This Passport is not available",
      };
    }

    const business = await ctx.db.get(passport.businessId);
    if (!business) {
      return null;
    }

    // Fetch verified document badge status (backed by confirmed/ready uploaded docs)
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_business", (q) => q.eq("businessId", passport.businessId))
      .collect();

    const verifiedDocs = docs.filter(
      (d) => d.status === "ready" && (d.reviewStatus === "confirmed" || d.reviewStatus === "auto_filed")
    );

    const isVerifiedDocBacked = verifiedDocs.length > 0;
    const lastReviewedAt = verifiedDocs.reduce((latest, d) => {
      const dTime = d.updatedAt || d.createdAt;
      return !latest || dTime > latest ? dTime : latest;
    }, "");

    const vis = passport.fieldVisibility || {};

    // 1. PUBLIC FIELDS (ONLY included if vis[field] !== "private" and !== "on_request")
    const publicShape: Record<string, any> = {
      available: true,
      passportId: passport.passportId,
      passportSlug: passport.passportSlug,
      style: passport.style || "professional",
      tagline: passport.tagline || "",
      isVerified: passport.isVerified ?? true,
      status: passport.status || "active",
      issuedAt: passport.issuedAt || passport.createdAt,
      nfcEnabled: passport.nfcEnabled ?? true,
      verifiedBadge: {
        isVerifiedDocBacked,
        badgeLabel: isVerifiedDocBacked ? "Backed by uploaded document" : "Self-declared profile",
        lastReviewedAt: lastReviewedAt || passport.updatedAt,
      },
    };

    // Public Identity
    if (vis.legalName !== "private" && vis.legalName !== "on_request") {
      publicShape.legalName = business.identity.legalName;
      publicShape.businessName = business.identity.legalName;
    }
    if (vis.rcNumber !== "private" && vis.rcNumber !== "on_request") {
      publicShape.registrationNumber = business.identity.rcNumber;
      publicShape.entityType = business.identity.businessType;
    }
    if (vis.tradingName !== "private" && vis.tradingName !== "on_request") {
      publicShape.tradingName = business.identity.tradingName;
    }
    if (vis.industry !== "private" && vis.industry !== "on_request") {
      publicShape.industry = business.identity.industry;
    }
    if (vis.description !== "private" && vis.description !== "on_request") {
      publicShape.description = business.identity.description;
    }
    if (vis.services !== "private" && vis.services !== "on_request") {
      publicShape.services = business.services || [];
    }
    if (vis.city !== "private" && vis.city !== "on_request") {
      publicShape.city = business.identity.address.city;
    }
    if (vis.state !== "private" && vis.state !== "on_request") {
      publicShape.state = business.identity.address.state;
    }
    if (vis.phone !== "private" && vis.phone !== "on_request") {
      publicShape.phone = business.identity.contact.phone;
    }
    if (vis.email !== "private" && vis.email !== "on_request") {
      publicShape.email = business.identity.contact.email;
    }
    if (vis.logo !== "private" && vis.logo !== "on_request") {
      publicShape.logoStorageKey = business.identity.logoStorageKey;
    }

    // 2. ON_REQUEST FIELDS (Returns ONLY { available: true }, NEVER exposing actual values!)
    if (vis.rcNumber === "on_request" || vis.registrationDetails === "on_request") {
      publicShape.registrationDetails = { available: true };
    }
    if (vis.complianceDocs === "on_request") {
      publicShape.complianceDocs = { available: true };
    }
    if (vis.credentialsDocs === "on_request") {
      publicShape.credentialsDocs = { available: true };
    }

    // 3. PRIVATE FIELDS (tin, financials, NIN, director addresses) ARE NEVER ADDED TO publicShape!

    return publicShape;
  },
});

/**
 * Backward-compatible alias for getPublic.
 */
export const getPublicPassport = getPublic;

/**
 * Owner Query (`getOwner`). Returns full unfiltered profile shape for authorized owner/staff.
 */
export const getOwner = query({
  args: {
    businessId: v.id("businesses"),
    ownerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);
    if (!business) {
      throw new Error("Business not found");
    }

    if (args.ownerId && business.ownerUserId !== args.ownerId) {
      throw new Error("Unauthorized access to business profile");
    }

    const passport = await ctx.db
      .query("passports")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .unique();

    return {
      business,
      passport,
    };
  },
});

/**
 * Backward-compatible alias for getOwner.
 */
export const getOwnerPassport = getOwner;

/**
 * Owner Passport Settings Update Mutation.
 */
export const updatePassportSettings = mutation({
  args: {
    businessId: v.id("businesses"),
    style: v.optional(
      v.union(
        v.literal("professional"),
        v.literal("corporate"),
        v.literal("minimal"),
        v.literal("modern"),
        v.literal("creative"),
        v.literal("premium")
      )
    ),
    tagline: v.optional(v.string()),
    nfcEnabled: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    passportSlug: v.optional(v.string()),
    fieldVisibility: v.optional(
      v.record(
        v.string(),
        v.union(v.literal("public"), v.literal("private"), v.literal("on_request"))
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "owner");
    const passport = await ctx.db
      .query("passports")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .unique();

    const now = new Date().toISOString();
    const patch: Record<string, any> = { updatedAt: now };

    if (args.style !== undefined) patch.style = args.style;
    if (args.tagline !== undefined) patch.tagline = args.tagline;
    if (args.nfcEnabled !== undefined) patch.nfcEnabled = args.nfcEnabled;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    if (args.passportSlug !== undefined) patch.passportSlug = args.passportSlug;
    if (args.fieldVisibility !== undefined) patch.fieldVisibility = args.fieldVisibility;

    if (passport) {
      await ctx.db.patch(passport._id, patch);
      return passport._id;
    } else {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newId = await ctx.db.insert("passports", {
        businessId: args.businessId,
        passportId: `BP-NG-${randomSuffix}`,
        style: args.style || "professional",
        tagline: args.tagline || "Verified Nigerian Enterprise",
        fieldVisibility: args.fieldVisibility || {},
        isActive: args.isActive ?? true,
        nfcEnabled: args.nfcEnabled ?? true,
        isVerified: true,
        status: "active",
        issuedAt: now.split("T")[0],
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      });
      return newId;
    }
  },
});

/**
 * Public Mutation to Record Passport Scan Telemetry.
 */
export const recordPassportScan = mutation({
  args: {
    passportId: v.string(),
    method: v.union(v.literal("qr"), v.literal("nfc"), v.literal("link")),
    viewerFingerprintHash: v.optional(v.string()),
    contactSaved: v.optional(v.boolean()),
    referrer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scanId = await ctx.db.insert("passportScans", {
      passportId: args.passportId,
      scannedAt: new Date().toISOString(),
      method: args.method,
      viewerFingerprintHash: args.viewerFingerprintHash,
      contactSaved: args.contactSaved ?? false,
      referrer: args.referrer,
    });
    return scanId;
  },
});

/**
 * Passport Scan Analytics Query for Business Owner.
 */
export const getPassportScansAnalytics = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");
    const passport = await ctx.db
      .query("passports")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .unique();

    if (!passport) {
      return { totalScans: 0, qrScans: 0, nfcScans: 0, linkScans: 0, contactsSaved: 0 };
    }

    const scans = await ctx.db
      .query("passportScans")
      .withIndex("by_passport_id", (q) => q.eq("passportId", passport.passportId))
      .collect();

    const totalScans = scans.length;
    const qrScans = scans.filter((s) => s.method === "qr").length;
    const nfcScans = scans.filter((s) => s.method === "nfc").length;
    const linkScans = scans.filter((s) => s.method === "link").length;
    const contactsSaved = scans.filter((s) => s.contactSaved).length;

    return {
      totalScans,
      qrScans,
      nfcScans,
      linkScans,
      contactsSaved,
      recentScans: scans.slice(-10).reverse(),
    };
  },
});

/**
 * Compliance Item Mutation (for backwards compatibility).
 */
export const createComplianceItem = mutation({
  args: {
    businessId: v.id("businesses"),
    title: v.string(),
    category: v.string(),
    dueDate: v.string(),
    source: v.string(),
    lastReviewedAt: v.string(),
    effectiveDate: v.string(),
    confidence: v.number(),
    confirmBeforeFiling: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");
    const enforcedConfirmBeforeFiling =
      args.confidence < 0.85 ? true : (args.confirmBeforeFiling ?? false);

    return await ctx.db.insert("complianceItems", {
      businessId: args.businessId,
      ruleKey: args.category || "CAC_ANNUAL_RETURN",
      ruleVersion: 1,
      status: "needs_attention",
      dueDate: args.dueDate,
      plainSummary: args.title,
      source: args.source,
      lastReviewedAt: args.lastReviewedAt,
      confirmBeforeFiling: enforcedConfirmBeforeFiling,
      confidence: args.confidence,
      createdFrom: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});
