import { mutation } from "./_generated/server";
import { v } from "convex/values";
import placeholderRules from "./seeds/complianceRules.placeholder.json";

/**
 * Seed & Publish Compliance Rules Mutation.
 * Safeguard: Refuses to publish placeholder rules when NODE_ENV === "production".
 */
export function validateProductionPublishSafeguard(
  rulesToPublish: Array<{ title: string; status: string }>,
  nodeEnv: string = process.env.NODE_ENV || "development"
) {
  if (nodeEnv === "production") {
    const hasPlaceholder = rulesToPublish.some(
      (r) => r.title.includes("[PLACEHOLDER") || r.status === "draft"
    );
    if (hasPlaceholder) {
      throw new Error(
        "Production Safeguard Error: Cannot publish draft placeholder rules in production environment!"
      );
    }
  }
}

export const seedPlaceholderRules = mutation({
  args: {
    forceProduction: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const env = args.forceProduction ? "production" : process.env.NODE_ENV || "development";

    // Enforce Production Safeguard
    validateProductionPublishSafeguard(placeholderRules, env);

    const now = new Date().toISOString();
    let seededCount = 0;

    for (const rule of placeholderRules) {
      const existing = await ctx.db
        .query("complianceRules")
        .withIndex("by_rule_key", (q) => q.eq("ruleKey", rule.ruleKey))
        .unique();

      if (!existing) {
        await ctx.db.insert("complianceRules", {
          ruleKey: rule.ruleKey,
          version: rule.version,
          title: rule.title,
          plainLanguageSummary: rule.plainLanguageSummary,
          appliesWhen: JSON.stringify(rule.appliesWhen),
          obligationType: rule.obligationType,
          recurrence: rule.recurrence,
          jurisdiction: rule.jurisdiction,
          agency: rule.agency,
          steps: rule.steps,
          estimatedCost: rule.estimatedCost,
          source: rule.source,
          effectiveDate: rule.effectiveDate,
          lastReviewedAt: rule.lastReviewedAt,
          reviewedBy: rule.reviewedBy,
          status: rule.status as any,
          confidenceIfMatched: rule.confidenceIfMatched,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        });
        seededCount++;
      }
    }

    return { seededCount };
  },
});
