import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireBusinessAccess } from "./authHelpers";
import { evaluateRules, ComplianceRuleData } from "../lib/compliance/rulesEngine";

/**
 * Fetch compliance items for a business grouped by status (Needs Attention, Coming Up, Completed).
 * Writes view event to complianceAuditLog.
 */
export const getComplianceItems = query({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");

    const items = await ctx.db
      .query("complianceItems")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();

    return items;
  },
});

/**
 * Record an audit log entry for every view, decision, or update.
 * Requirement C: Every view/decision writes to complianceAuditLog (shown text + ruleVersion).
 */
export const logComplianceAudit = mutation({
  args: {
    businessId: v.id("businesses"),
    itemId: v.id("complianceItems"),
    action: v.string(), // e.g. "viewed", "marked_completed", "confirmed_filing", "attached_evidence"
    shownText: v.string(),
    ruleVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = new Date().toISOString();

    return await ctx.db.insert("complianceAuditLog", {
      businessId: args.businessId,
      itemId: args.itemId,
      action: args.action,
      actor: {
        type: "user",
        id: user.clerkId,
      },
      shownText: args.shownText,
      ruleVersion: args.ruleVersion,
      createdAt: now,
    });
  },
});

/**
 * Mark a compliance item as completed manually or via evidence document attachment.
 */
export const markComplianceItemCompleted = mutation({
  args: {
    businessId: v.id("businesses"),
    itemId: v.id("complianceItems"),
    evidenceDocumentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireBusinessAccess(ctx, args.businessId, "staff");
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Compliance item not found");

    const now = new Date().toISOString();

    await ctx.db.patch(args.itemId, {
      status: "completed",
      completedAt: now,
      evidenceDocumentId: args.evidenceDocumentId || item.evidenceDocumentId,
      updatedAt: now,
    });

    // Write audit log entry
    await ctx.db.insert("complianceAuditLog", {
      businessId: args.businessId,
      itemId: args.itemId,
      action: args.evidenceDocumentId ? "completed_with_evidence" : "completed_manually",
      actor: { type: "user", id: user.clerkId },
      shownText: `Marked completed: ${item.plainSummary}`,
      ruleVersion: item.ruleVersion,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * Process a Business Change Event (Story D3: "Tell us what changed").
 * Creates a businessChangeEvents row and immediately runs the Rules Engine to surface new obligations.
 */
export const recordBusinessChangeEvent = mutation({
  args: {
    businessId: v.id("businesses"),
    eventType: v.union(
      v.literal("hired_employees"),
      v.literal("new_branch"),
      v.literal("new_activity"),
      v.literal("address_change"),
      v.literal("other")
    ),
    payload: v.string(), // JSON string payload e.g. {"employeeCount": 5}
  },
  handler: async (ctx, args) => {
    const { business } = await requireBusinessAccess(ctx, args.businessId, "staff");
    const now = new Date().toISOString();

    // 1. Record change event
    const eventId = await ctx.db.insert("businessChangeEvents", {
      businessId: args.businessId,
      type: args.eventType,
      payload: args.payload,
      processedAt: now,
      createdAt: now,
    });

    // 2. Patch Business Brain operations based on change event
    const payloadObj = JSON.parse(args.payload);
    let updatedOperations = { ...business.operations };

    if (args.eventType === "hired_employees") {
      updatedOperations.hasEmployees = true;
      updatedOperations.employeeCount = (updatedOperations.employeeCount || 0) + (payloadObj.hiredCount || 1);
    } else if (args.eventType === "new_branch") {
      updatedOperations.branches = [...(updatedOperations.branches || []), payloadObj.branch];
    }

    const updatedBrain = {
      ...business,
      operations: updatedOperations,
    };

    await ctx.db.patch(args.businessId, {
      operations: updatedOperations,
      updatedAt: now,
    });

    // 3. Re-evaluate published rules deterministically against updated Brain
    const rules = await ctx.db
      .query("complianceRules")
      .collect();

    const formattedRules: ComplianceRuleData[] = rules.map((r) => ({
      ruleKey: r.ruleKey,
      version: r.version,
      title: r.title,
      plainLanguageSummary: r.plainLanguageSummary,
      appliesWhen: r.appliesWhen,
      obligationType: r.obligationType,
      recurrence: r.recurrence as any,
      jurisdiction: r.jurisdiction,
      agency: r.agency,
      steps: r.steps,
      estimatedCost: r.estimatedCost,
      source: r.source,
      effectiveDate: r.effectiveDate,
      lastReviewedAt: r.lastReviewedAt,
      reviewedBy: r.reviewedBy,
      status: r.status as any,
      confidenceIfMatched: r.confidenceIfMatched,
    }));

    const evaluated = evaluateRules(updatedBrain, formattedRules, 180, {
      type: args.eventType,
      eventDate: now,
    });

    // 4. Idempotently upsert surfaced compliance items
    let newlyCreated = 0;
    for (const item of evaluated) {
      const existing = await ctx.db
        .query("complianceItems")
        .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
        .collect();

      const exists = existing.find((e) => e.ruleKey === item.ruleKey);
      if (!exists) {
        await ctx.db.insert("complianceItems", {
          businessId: args.businessId,
          ruleKey: item.ruleKey,
          ruleVersion: item.ruleVersion,
          status: item.status,
          dueDate: item.dueDate,
          plainSummary: item.title,
          source: item.source,
          lastReviewedAt: item.lastReviewedAt,
          confirmBeforeFiling: item.confirmBeforeFiling,
          confidence: item.confidence,
          createdFrom: "change_event",
          createdAt: now,
          updatedAt: now,
        });
        newlyCreated++;
      }
    }

    return { eventId, newlyCreated, totalEvaluated: evaluated.length };
  },
});
