import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireBusinessAccess } from "./authHelpers";

/**
 * Single Entry Point for Modifying the Business Brain.
 * Every patch updates the business record and writes an immutable versioned audit log in brainHistory.
 */
export const applyBrainPatch = mutation({
  args: {
    businessId: v.id("businesses"),
    patch: v.string(), // JSON record of field patches
    reason: v.string(),
    actorType: v.optional(v.union(v.literal("user"), v.literal("ai"), v.literal("system"))),
  },
  handler: async (ctx, args) => {
    const { user, business } = await requireBusinessAccess(ctx, args.businessId, "staff");

    const patchData = JSON.parse(args.patch);
    const newVersion = (business.brainVersion || 1) + 1;
    const now = new Date().toISOString();

    // 1. Patch the business record
    await ctx.db.patch(args.businessId, {
      ...patchData,
      brainVersion: newVersion,
      updatedAt: now,
    });

    // 2. Write versioned history audit log
    await ctx.db.insert("brainHistory", {
      businessId: args.businessId,
      version: newVersion,
      patch: args.patch,
      actor: {
        type: args.actorType || "user",
        id: user.clerkId,
      },
      reason: args.reason,
      createdAt: now,
    });

    return { businessId: args.businessId, version: newVersion };
  },
});

/**
 * Onboarding initialization mutation: Create initial Business Brain record.
 */
export const createBusinessOnboarding = mutation({
  args: {
    legalName: v.string(),
    businessType: v.union(
      v.literal("business_name"),
      v.literal("limited_company"),
      v.literal("incorporated_trustees"),
      v.literal("unregistered")
    ),
    state: v.string(),
    lga: v.string(),
    industry: v.string(),
    description: v.string(),
    hasEmployees: v.boolean(),
    hasPhysicalShop: v.boolean(),
    sellsOnline: v.boolean(),
    onboardingStep: v.string(),
    onboardingAnswers: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = new Date().toISOString();

    // Create Business Brain root
    const businessId = await ctx.db.insert("businesses", {
      ownerUserId: user.clerkId,
      status: args.businessType === "unregistered" ? "idea" : "registered",
      identity: {
        legalName: args.legalName,
        businessType: args.businessType,
        industry: args.industry,
        description: args.description,
        address: {
          line1: "Main Office",
          city: args.lga,
          lga: args.lga,
          state: args.state,
          country: "Nigeria",
        },
        contact: {
          phone: user.phone || "",
          email: user.email,
          socials: [],
        },
      },
      operations: {
        hasEmployees: args.hasEmployees,
        hasPhysicalShop: args.hasPhysicalShop,
        sellsOnline: args.sellsOnline,
        branches: [],
        operatesStates: [args.state],
      },
      capabilities: [],
      services: [],
      onboardingState: {
        step: args.onboardingStep,
        completedAt: now,
        answers: args.onboardingAnswers,
      },
      plan: {
        tier: "free",
        status: "active",
      },
      brainVersion: 1,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    // Generate Passport ID e.g. "BP-NG-" + 6 uppercase random alphanumeric
    const passportCode = "BP-NG-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const passportSlug = args.legalName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + passportCode.toLowerCase();

    // Create associated Passport row (free tier: minimal/professional style)
    await ctx.db.insert("passports", {
      businessId,
      passportId: passportCode,
      passportSlug,
      style: "professional",
      fieldVisibility: {},
      isActive: true,
      nfcEnabled: false,
      isVerified: args.businessType !== "unregistered",
      status: args.businessType !== "unregistered" ? "verified" : "pending",
      issuedAt: now,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    // Update active business on user
    await ctx.db.patch(user._id, {
      activeBusinessId: businessId,
      updatedAt: now,
    });

    // Create initial brainHistory entry
    await ctx.db.insert("brainHistory", {
      businessId,
      version: 1,
      patch: JSON.stringify({ legalName: args.legalName, businessType: args.businessType }),
      actor: { type: "user", id: user.clerkId },
      reason: "Initial onboarding business creation",
      createdAt: now,
    });

    return { businessId, passportCode, passportSlug };
  },
});

/**
 * Fetch full Business Brain profile for authorized users.
 */
export const getBusinessBrain = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    const { business } = await requireBusinessAccess(ctx, args.businessId, "staff");
    return business;
  },
});
