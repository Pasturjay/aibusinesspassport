import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminUser, requireBusinessAccess, requireUser } from "./authHelpers";
import { calculatePrintPrice } from "../lib/marketplace/printing";
import { DEFAULT_LEAD_FEE_KOBO, isValidReferralStatusTransition } from "../lib/marketplace/referrals";
import { isValidDoneForMeTransition } from "../lib/marketplace/doneForMe";
import { calculateRevenueReport } from "../lib/marketplace/revenueReporting";

// ============================================================================
// 1. PRINT MARKETPLACE
// ============================================================================

export const createPrintPartner = mutation({
  args: {
    name: v.string(),
    city: v.string(),
    pricing: v.string(), // JSON pricing matrix
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    const now = new Date().toISOString();
    return await ctx.db.insert("printPartners", {
      name: args.name,
      city: args.city,
      pricing: args.pricing,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listPrintPartners = query({
  args: {
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.city) {
      return await ctx.db
        .query("printPartners")
        .withIndex("by_city", (q) => q.eq("city", args.city!))
        .collect();
    }
    return await ctx.db.query("printPartners").collect();
  },
});

export const createPrintOrder = mutation({
  args: {
    businessId: v.id("businesses"),
    partnerId: v.id("printPartners"),
    designDocId: v.id("generatedDocs"),
    itemType: v.string(), // e.g. "business_card", "letterhead", "stickers"
    quantity: v.number(),
    platformMarginPct: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");

    const marginPct = args.platformMarginPct ?? 15;
    const calc = calculatePrintPrice(args.itemType, args.quantity, undefined, marginPct);

    const now = new Date().toISOString();
    const orderId = await ctx.db.insert("printOrders", {
      businessId: args.businessId,
      partnerId: args.partnerId,
      designDocId: args.designDocId,
      itemType: args.itemType,
      quantity: args.quantity,
      amountKobo: calc.totalAmountKobo,
      platformMarginPct: marginPct,
      marginKobo: calc.marginKobo,
      status: "received",
      createdAt: now,
      updatedAt: now,
    });

    // Also record purchase in audit trail
    await ctx.db.insert("purchases", {
      businessId: args.businessId,
      sku: "print_order",
      amountKobo: calc.totalAmountKobo,
      status: "paid",
      reference: `PRINT-${orderId}`,
      fulfilledAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { orderId, totalAmountKobo: calc.totalAmountKobo, marginKobo: calc.marginKobo };
  },
});

export const updatePrintStatus = mutation({
  args: {
    orderId: v.id("printOrders"),
    status: v.union(
      v.literal("received"),
      v.literal("printing"),
      v.literal("shipped"),
      v.literal("delivered")
    ),
    trackingNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Print order not found");

    if (user.role !== "admin") {
      await requireBusinessAccess(ctx, order.businessId, "staff");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.orderId, {
      status: args.status,
      trackingNote: args.trackingNote ?? order.trackingNote,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const ratePrintOrder = mutation({
  args: {
    orderId: v.id("printOrders"),
    rating: v.number(), // 1 to 5
    reviewComment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Print order not found");

    await requireBusinessAccess(ctx, order.businessId, "staff");

    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.orderId, {
      rating: args.rating,
      reviewComment: args.reviewComment,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const getPrintOrders = query({
  args: {
    businessId: v.optional(v.id("businesses")),
  },
  handler: async (ctx, args) => {
    if (args.businessId) {
      await requireBusinessAccess(ctx, args.businessId, "staff");
      return await ctx.db
        .query("printOrders")
        .withIndex("by_business", (q) => q.eq("businessId", args.businessId!))
        .collect();
    }

    await requireAdminUser(ctx);
    return await ctx.db.query("printOrders").collect();
  },
});

// ============================================================================
// 2. PROFESSIONAL REFERRALS MARKETPLACE
// ============================================================================

export const createServiceProvider = mutation({
  args: {
    type: v.union(
      v.literal("accountant"),
      v.literal("lawyer"),
      v.literal("agent"),
      v.literal("consultant")
    ),
    name: v.string(),
    states: v.array(v.string()),
    verified: v.boolean(),
    feeModel: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    const now = new Date().toISOString();
    return await ctx.db.insert("serviceProviders", {
      type: args.type,
      name: args.name,
      states: args.states,
      verified: args.verified,
      feeModel: args.feeModel,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listServiceProviders = query({
  args: {
    type: v.optional(
      v.union(
        v.literal("accountant"),
        v.literal("lawyer"),
        v.literal("agent"),
        v.literal("consultant")
      )
    ),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let providers;
    if (args.type) {
      providers = await ctx.db
        .query("serviceProviders")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    } else {
      providers = await ctx.db.query("serviceProviders").collect();
    }

    if (args.state) {
      const normState = args.state.toLowerCase().trim();
      providers = providers.filter((p) =>
        p.states.some((s) => s.toLowerCase().trim() === normState || s.toLowerCase() === "all")
      );
    }

    return providers;
  },
});

export const createProfessionalReferral = mutation({
  args: {
    businessId: v.id("businesses"),
    providerId: v.id("serviceProviders"),
    context: v.string(),
    leadFeeKobo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");
    const provider = await ctx.db.get(args.providerId);
    if (!provider) throw new Error("Service provider not found");

    const now = new Date().toISOString();
    return await ctx.db.insert("referrals", {
      businessId: args.businessId,
      providerId: args.providerId,
      context: args.context,
      status: "new",
      leadFeeKobo: args.leadFeeKobo ?? DEFAULT_LEAD_FEE_KOBO,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateReferralStatus = mutation({
  args: {
    referralId: v.id("referrals"),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("converted"),
      v.literal("closed")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const referral = await ctx.db.get(args.referralId);
    if (!referral) throw new Error("Referral not found");

    if (user.role !== "admin") {
      await requireBusinessAccess(ctx, referral.businessId, "staff");
    }

    if (!isValidReferralStatusTransition(referral.status as any, args.status)) {
      throw new Error(
        `Invalid status transition from '${referral.status}' to '${args.status}'`
      );
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.referralId, {
      status: args.status,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const getReferrals = query({
  args: {
    businessId: v.optional(v.id("businesses")),
  },
  handler: async (ctx, args) => {
    if (args.businessId) {
      await requireBusinessAccess(ctx, args.businessId, "staff");
      return await ctx.db
        .query("referrals")
        .withIndex("by_business", (q) => q.eq("businessId", args.businessId!))
        .collect();
    }

    await requireAdminUser(ctx);
    return await ctx.db.query("referrals").collect();
  },
});

// ============================================================================
// 3. DONE-FOR-ME (PRO+) JOBS
// ============================================================================

export const requestDoneForMeJob = mutation({
  args: {
    businessId: v.id("businesses"),
    service: v.string(), // e.g. "cac_business_name", "scuml_registration"
    notes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");

    const now = new Date().toISOString();
    return await ctx.db.insert("doneForMeJobs", {
      businessId: args.businessId,
      service: args.service,
      status: "requested",
      notes: args.notes ?? ["Job requested by customer"],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const quoteDoneForMeJob = mutation({
  args: {
    jobId: v.id("doneForMeJobs"),
    quoteKobo: v.number(),
    assignedTo: v.optional(v.string()),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Done-for-Me job not found");

    if (!isValidDoneForMeTransition(job.status as any, "quoted")) {
      throw new Error(`Cannot quote job in status '${job.status}'`);
    }

    const now = new Date().toISOString();
    const updatedNotes = [...job.notes];
    if (args.adminNote) {
      updatedNotes.push(`Admin Quote Note: ${args.adminNote}`);
    }

    await ctx.db.patch(args.jobId, {
      status: "quoted",
      quoteKobo: args.quoteKobo,
      assignedTo: args.assignedTo ?? job.assignedTo,
      notes: updatedNotes,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const acceptAndPayDoneForMeJob = mutation({
  args: {
    jobId: v.id("doneForMeJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Done-for-Me job not found");

    await requireBusinessAccess(ctx, job.businessId, "staff");

    if (!isValidDoneForMeTransition(job.status as any, "accepted")) {
      throw new Error(`Cannot accept job in status '${job.status}'`);
    }

    const now = new Date().toISOString();

    // Move to accepted then paid
    await ctx.db.patch(args.jobId, {
      status: "paid",
      paidAt: now,
      notes: [...job.notes, `Customer accepted and paid quote of ₦${((job.quoteKobo ?? 0) / 100).toLocaleString()}`],
      updatedAt: now,
    });

    return { success: true };
  },
});

export const updateDoneForMeStatus = mutation({
  args: {
    jobId: v.id("doneForMeJobs"),
    status: v.union(v.literal("in_progress"), v.literal("completed")),
    progressNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Done-for-Me job not found");

    if (!isValidDoneForMeTransition(job.status as any, args.status)) {
      throw new Error(`Invalid status transition from '${job.status}' to '${args.status}'`);
    }

    const now = new Date().toISOString();
    const updatedNotes = [...job.notes];
    if (args.progressNote) {
      updatedNotes.push(`Status Update (${args.status}): ${args.progressNote}`);
    }

    await ctx.db.patch(args.jobId, {
      status: args.status,
      notes: updatedNotes,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const completeDoneForMeJob = mutation({
  args: {
    jobId: v.id("doneForMeJobs"),
    deliverableDocumentId: v.id("documents"),
    completionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Done-for-Me job not found");

    const document = await ctx.db.get(args.deliverableDocumentId);
    if (!document) throw new Error("Deliverable document not found in Vault");

    const now = new Date().toISOString();
    const updatedNotes = [...job.notes];
    updatedNotes.push(
      `Job Completed. Deliverable handed back into Vault document ID ${args.deliverableDocumentId}`
    );
    if (args.completionNote) {
      updatedNotes.push(`Admin Completion Note: ${args.completionNote}`);
    }

    await ctx.db.patch(args.jobId, {
      status: "completed",
      deliverableDocumentId: args.deliverableDocumentId,
      notes: updatedNotes,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const getDoneForMeJobs = query({
  args: {
    businessId: v.optional(v.id("businesses")),
  },
  handler: async (ctx, args) => {
    if (args.businessId) {
      await requireBusinessAccess(ctx, args.businessId, "staff");
      return await ctx.db
        .query("doneForMeJobs")
        .withIndex("by_business", (q) => q.eq("businessId", args.businessId!))
        .collect();
    }

    await requireAdminUser(ctx);
    return await ctx.db.query("doneForMeJobs").collect();
  },
});

// ============================================================================
// 4. ADMIN REVENUE REPORT QUERY
// ============================================================================

export const getAdminRevenueReport = query({
  args: {
    periodLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const subscriptions = await ctx.db.query("subscriptions").collect();
    const printOrders = await ctx.db.query("printOrders").collect();
    const referrals = await ctx.db.query("referrals").collect();
    const doneForMeJobs = await ctx.db.query("doneForMeJobs").collect();

    return calculateRevenueReport(
      subscriptions,
      printOrders,
      referrals,
      doneForMeJobs,
      args.periodLabel ?? "All Time"
    );
  },
});
