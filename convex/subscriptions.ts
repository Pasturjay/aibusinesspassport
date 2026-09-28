import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireBusinessAccess } from "./authHelpers";

/**
 * Mutation: Update business subscription plan & tier status.
 */
export const updatePlan = mutation({
  args: {
    businessId: v.id("businesses"),
    tier: v.union(v.literal("free"), v.literal("plus"), v.literal("pro"), v.literal("pro_plus")),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("cancelled"),
      v.literal("trialing")
    ),
    paystackCustomerCode: v.optional(v.string()),
    paystackSubscriptionCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const business = await ctx.db.get(args.businessId);
    if (!business) {
      throw new Error("Business not found");
    }

    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Patch business plan
    await ctx.db.patch(args.businessId, {
      plan: {
        tier: args.tier,
        status: args.status,
        currentPeriodEnd: periodEnd,
        paystackCustomerCode: args.paystackCustomerCode || business.plan.paystackCustomerCode,
        paystackSubscriptionCode: args.paystackSubscriptionCode || business.plan.paystackSubscriptionCode,
      },
      updatedAt: now,
    });

    // Create subscription entry
    await ctx.db.insert("subscriptions", {
      businessId: args.businessId,
      tier: args.tier,
      interval: "monthly",
      amountKobo: args.tier === "plus" ? 750000 : args.tier === "pro" ? 2000000 : 0,
      status: args.status,
      paystackCodes: {
        customerCode: args.paystackCustomerCode,
        subscriptionCode: args.paystackSubscriptionCode,
      },
      startedAt: now,
      currentPeriodEnd: periodEnd,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    return args.businessId;
  },
});

/**
 * Mutation: Record pay-per-use SKU purchase.
 */
export const recordPurchase = mutation({
  args: {
    businessId: v.id("businesses"),
    sku: v.union(
      v.literal("tender_package"),
      v.literal("document_pack"),
      v.literal("print_order"),
      v.literal("profile_generation")
    ),
    amountKobo: v.number(),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "owner_billing");
    const now = new Date().toISOString();

    const purchaseId = await ctx.db.insert("purchases", {
      businessId: args.businessId,
      sku: args.sku,
      amountKobo: args.amountKobo,
      status: "fulfilled",
      reference: args.reference,
      fulfilledAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return purchaseId;
  },
});

/**
 * Query: Fetch billing receipts & purchases for a business.
 */
export const getBillingHistory = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");

    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();

    return {
      purchases: purchases.reverse(),
      subscriptions: subscriptions.reverse(),
    };
  },
});
