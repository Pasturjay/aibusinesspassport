import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireBusinessAccess } from "./authHelpers";

/**
 * Grant category-level view access to an advisor (accountant, lawyer, or consultant).
 * Story C4: Owner can grant access to specific Vault categories with optional expiry.
 */
export const grantAdvisorAccess = mutation({
  args: {
    businessId: v.id("businesses"),
    advisorClerkId: v.string(),
    categories: v.array(v.string()),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only business owner (or admin) can grant advisor access
    const { user } = await requireBusinessAccess(ctx, args.businessId, "owner");

    const now = new Date().toISOString();

    // Check if an existing grant exists
    const existing = await ctx.db
      .query("advisorGrants")
      .withIndex("by_business_advisor", (q) =>
        q.eq("businessId", args.businessId).eq("advisorUserId", args.advisorClerkId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        categories: args.categories,
        expiresAt: args.expiresAt,
        revokedAt: undefined, // Clear any previous revocation
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("advisorGrants", {
      businessId: args.businessId,
      advisorUserId: args.advisorClerkId,
      categories: args.categories,
      expiresAt: args.expiresAt,
      grantedBy: user.clerkId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Immediately revoke advisor access (Story C4).
 * Revoked grant loses access instantly.
 */
export const revokeAdvisorAccess = mutation({
  args: {
    grantId: v.id("advisorGrants"),
  },
  handler: async (ctx, args) => {
    const grant = await ctx.db.get(args.grantId);
    if (!grant) {
      throw new Error("Advisor grant not found");
    }

    // Require owner access to revoke
    await requireBusinessAccess(ctx, grant.businessId, "owner");

    const now = new Date().toISOString();
    await ctx.db.patch(args.grantId, {
      revokedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * List active & historical advisor grants for a business.
 */
export const getAdvisorGrants = query({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");

    return await ctx.db
      .query("advisorGrants")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();
  },
});

/**
 * Query documents in a category enforcing advisor category grants (Story C4).
 */
export const getCategoryDocuments = query({
  args: {
    businessId: v.id("businesses"),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    // Strictly enforced by requireBusinessAccess
    await requireBusinessAccess(ctx, args.businessId, "advisor", args.category);

    return await ctx.db
      .query("documents")
      .withIndex("by_business_category", (q) =>
        q.eq("businessId", args.businessId).eq("category", args.category as any)
      )
      .collect();
  },
});
