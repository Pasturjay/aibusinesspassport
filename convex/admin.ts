import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminUser } from "./authHelpers";

/**
 * List all compliance rules across all statuses and versions.
 */
export const listAllRules = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminUser(ctx);
    const rules = await ctx.db.query("complianceRules").collect();
    return rules;
  },
});

/**
 * Create a new rule draft.
 */
export const createRuleDraft = mutation({
  args: {
    ruleKey: v.string(),
    title: v.string(),
    plainLanguageSummary: v.string(),
    appliesWhen: v.string(),
    obligationType: v.string(),
    recurrence: v.object({
      frequency: v.string(),
      dueDateRule: v.string(),
    }),
    jurisdiction: v.string(),
    agency: v.string(),
    steps: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        link: v.optional(v.string()),
      })
    ),
    estimatedCost: v.optional(v.string()),
    source: v.object({
      name: v.string(),
      url: v.optional(v.string()),
    }),
    effectiveDate: v.string(),
    confidenceIfMatched: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx);

    // Find highest version for this ruleKey
    const existingRules = await ctx.db
      .query("complianceRules")
      .withIndex("by_rule_key", (q) => q.eq("ruleKey", args.ruleKey))
      .collect();

    const maxVersion = existingRules.reduce((max, r) => Math.max(max, r.version), 0);
    const nextVersion = maxVersion + 1;
    const now = new Date().toISOString();

    const ruleId = await ctx.db.insert("complianceRules", {
      ruleKey: args.ruleKey,
      version: nextVersion,
      title: args.title,
      plainLanguageSummary: args.plainLanguageSummary,
      appliesWhen: args.appliesWhen,
      obligationType: args.obligationType,
      recurrence: args.recurrence,
      jurisdiction: args.jurisdiction,
      agency: args.agency,
      steps: args.steps,
      estimatedCost: args.estimatedCost,
      source: args.source,
      effectiveDate: args.effectiveDate,
      lastReviewedAt: now,
      reviewedBy: admin.clerkId || admin._id,
      status: "draft",
      confidenceIfMatched: args.confidenceIfMatched,
      authorId: admin.clerkId || admin._id,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    await ctx.db.insert("adminAuditLogs", {
      adminUserId: admin.clerkId || admin._id,
      adminRole: admin.role,
      action: "create_rule_draft",
      targetId: ruleId,
      targetType: "complianceRule",
      details: JSON.stringify({ ruleKey: args.ruleKey, version: nextVersion }),
      createdAt: now,
    });

    return ruleId;
  },
});

/**
 * Update an existing rule draft.
 * IMMUTABILITY REQUIREMENT: Throws error if rule is published.
 */
export const updateRuleDraft = mutation({
  args: {
    ruleId: v.id("complianceRules"),
    title: v.optional(v.string()),
    plainLanguageSummary: v.optional(v.string()),
    appliesWhen: v.optional(v.string()),
    obligationType: v.optional(v.string()),
    recurrence: v.optional(
      v.object({
        frequency: v.string(),
        dueDateRule: v.string(),
      })
    ),
    jurisdiction: v.optional(v.string()),
    agency: v.optional(v.string()),
    steps: v.optional(
      v.array(
        v.object({
          title: v.string(),
          description: v.string(),
          link: v.optional(v.string()),
        })
      )
    ),
    estimatedCost: v.optional(v.string()),
    source: v.optional(
      v.object({
        name: v.string(),
        url: v.optional(v.string()),
      })
    ),
    effectiveDate: v.optional(v.string()),
    confidenceIfMatched: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx);

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    if (rule.status === "published") {
      throw new Error("Cannot edit a published rule directly. Published versions are immutable. Create a new draft version instead.");
    }

    const now = new Date().toISOString();
    const patch: Record<string, any> = { updatedAt: now };

    if (args.title !== undefined) patch.title = args.title;
    if (args.plainLanguageSummary !== undefined) patch.plainLanguageSummary = args.plainLanguageSummary;
    if (args.appliesWhen !== undefined) patch.appliesWhen = args.appliesWhen;
    if (args.obligationType !== undefined) patch.obligationType = args.obligationType;
    if (args.recurrence !== undefined) patch.recurrence = args.recurrence;
    if (args.jurisdiction !== undefined) patch.jurisdiction = args.jurisdiction;
    if (args.agency !== undefined) patch.agency = args.agency;
    if (args.steps !== undefined) patch.steps = args.steps;
    if (args.estimatedCost !== undefined) patch.estimatedCost = args.estimatedCost;
    if (args.source !== undefined) patch.source = args.source;
    if (args.effectiveDate !== undefined) patch.effectiveDate = args.effectiveDate;
    if (args.confidenceIfMatched !== undefined) patch.confidenceIfMatched = args.confidenceIfMatched;

    await ctx.db.patch(args.ruleId, patch);

    await ctx.db.insert("adminAuditLogs", {
      adminUserId: admin.clerkId || admin._id,
      adminRole: admin.role,
      action: "update_rule_draft",
      targetId: args.ruleId,
      targetType: "complianceRule",
      details: JSON.stringify({ ruleKey: rule.ruleKey, version: rule.version }),
      createdAt: now,
    });

    return args.ruleId;
  },
});

/**
 * Submit a draft rule for two-person review.
 */
export const submitRuleForReview = mutation({
  args: { ruleId: v.id("complianceRules") },
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx);

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.ruleId, {
      status: "in_review",
      updatedAt: now,
    });

    await ctx.db.insert("adminAuditLogs", {
      adminUserId: admin.clerkId || admin._id,
      adminRole: admin.role,
      action: "submit_rule_review",
      targetId: args.ruleId,
      targetType: "complianceRule",
      details: JSON.stringify({ ruleKey: rule.ruleKey, version: rule.version }),
      createdAt: now,
    });
  },
});

/**
 * Publish a rule.
 * ENFORCES:
 * 1. Two-person rule: Author cannot self-publish.
 * 2. Mandatory change note.
 * 3. Immutable versioning: Creates new version or publishes draft version, keeping old published versions intact.
 */
export const publishRule = mutation({
  args: {
    ruleId: v.id("complianceRules"),
    changeNote: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx);
    const reviewerId = admin.clerkId || admin._id;

    if (!args.changeNote || !args.changeNote.trim()) {
      throw new Error("Change note is required to publish a rule");
    }

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    // TWO-PERSON RULE ENFORCEMENT
    if (rule.authorId && rule.authorId === reviewerId) {
      throw new Error("Two-person rule violation: Author cannot self-publish a rule");
    }

    const now = new Date().toISOString();

    // Check version numbers for this ruleKey
    const allVersions = await ctx.db
      .query("complianceRules")
      .withIndex("by_rule_key", (q) => q.eq("ruleKey", rule.ruleKey))
      .collect();

    const maxVersion = allVersions.reduce((max, r) => Math.max(max, r.version), 0);
    const targetVersion = rule.status === "draft" || rule.status === "in_review" ? Math.max(rule.version, maxVersion) : maxVersion + 1;

    // Publish current draft/review item
    await ctx.db.patch(args.ruleId, {
      version: targetVersion,
      status: "published",
      reviewedBy: reviewerId,
      lastReviewedAt: now,
      changeNote: args.changeNote,
      updatedAt: now,
    });

    // Log admin audit event
    await ctx.db.insert("adminAuditLogs", {
      adminUserId: reviewerId,
      adminRole: admin.role,
      action: "publish_rule",
      targetId: args.ruleId,
      targetType: "complianceRule",
      details: JSON.stringify({
        ruleKey: rule.ruleKey,
        version: targetVersion,
        changeNote: args.changeNote,
        authorId: rule.authorId,
        reviewedBy: reviewerId,
      }),
      createdAt: now,
    });

    return args.ruleId;
  },
});

/**
 * Retire a published rule.
 */
export const retireRule = mutation({
  args: { ruleId: v.id("complianceRules") },
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx);

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Rule not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.ruleId, {
      status: "retired",
      updatedAt: now,
    });

    await ctx.db.insert("adminAuditLogs", {
      adminUserId: admin.clerkId || admin._id,
      adminRole: admin.role,
      action: "retire_rule",
      targetId: args.ruleId,
      targetType: "complianceRule",
      details: JSON.stringify({ ruleKey: rule.ruleKey, version: rule.version }),
      createdAt: now,
    });
  },
});

/**
 * Staleness Dashboard Query.
 * Returns published rules unreviewed in >90 days (warning), >180 days (critical), or failed source URLs.
 */
export const getStalenessDashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminUser(ctx);

    const rules = await ctx.db
      .query("complianceRules")
      .withIndex("by_agency")
      .collect();

    const published = rules.filter((r) => r.status === "published");
    const now = new Date();

    const warning90Days: typeof published = [];
    const critical180Days: typeof published = [];
    const failedSourceUrls: typeof published = [];

    for (const rule of published) {
      const lastRev = new Date(rule.lastReviewedAt || rule.updatedAt);
      const diffDays = Math.floor((now.getTime() - lastRev.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays >= 180) {
        critical180Days.push(rule);
      } else if (diffDays >= 90) {
        warning90Days.push(rule);
      }

      if (rule.sourceUrlStatus === "failed") {
        failedSourceUrls.push(rule);
      }
    }

    return {
      totalPublished: published.length,
      warning90Days,
      critical180Days,
      failedSourceUrls,
    };
  },
});

/**
 * Check rule source URLs (simulated HEAD check).
 */
export const checkRuleSources = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdminUser(ctx);

    const rules = await ctx.db.query("complianceRules").collect();
    const now = new Date().toISOString();
    let checkedCount = 0;

    for (const rule of rules) {
      if (rule.source?.url) {
        // Mark as checked ok (or failed if invalid protocol)
        const isValid = rule.source.url.startsWith("http://") || rule.source.url.startsWith("https://");
        await ctx.db.patch(rule._id, {
          sourceUrlStatus: isValid ? "ok" : "failed",
          lastCheckedAt: now,
        });
        checkedCount++;
      }
    }

    await ctx.db.insert("adminAuditLogs", {
      adminUserId: admin.clerkId || admin._id,
      adminRole: admin.role,
      action: "check_rule_sources",
      targetType: "complianceRules",
      details: JSON.stringify({ checkedCount }),
      createdAt: now,
    });

    return { checkedCount };
  },
});

/**
 * Template Manager: List Document Templates.
 */
export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminUser(ctx);
    return await ctx.db.query("templates").collect();
  },
});

/**
 * Template Manager: Save Document Template Draft.
 */
export const saveTemplateDraft = mutation({
  args: {
    key: v.string(),
    kind: v.string(),
    industry: v.optional(v.string()),
    structure: v.string(),
    promptTemplate: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx);
    const now = new Date().toISOString();

    const existing = await ctx.db
      .query("templates")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .collect();

    const maxVer = existing.reduce((max, t) => Math.max(max, t.version), 0);
    const version = maxVer + 1;

    const id = await ctx.db.insert("templates", {
      key: args.key,
      kind: args.kind,
      industry: args.industry,
      version,
      structure: args.structure,
      promptTemplate: args.promptTemplate,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("adminAuditLogs", {
      adminUserId: admin.clerkId || admin._id,
      adminRole: admin.role,
      action: "save_template",
      targetId: id,
      targetType: "template",
      details: JSON.stringify({ key: args.key, version }),
      createdAt: now,
    });

    return id;
  },
});

/**
 * Expected Documents Manager: List Expected Documents per Business Type.
 */
export const listExpectedDocuments = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminUser(ctx);
    return await ctx.db.query("expectedDocuments").collect();
  },
});

/**
 * Expected Documents Manager: Save Expected Document.
 */
export const saveExpectedDocument = mutation({
  args: {
    businessType: v.union(
      v.literal("business_name"),
      v.literal("limited_company"),
      v.literal("incorporated_trustees"),
      v.literal("unregistered")
    ),
    docType: v.string(),
    label: v.string(),
    category: v.string(),
    mandatory: v.boolean(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx);
    const now = new Date().toISOString();

    const id = await ctx.db.insert("expectedDocuments", {
      businessType: args.businessType,
      docType: args.docType,
      label: args.label,
      category: args.category,
      mandatory: args.mandatory,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("adminAuditLogs", {
      adminUserId: admin.clerkId || admin._id,
      adminRole: admin.role,
      action: "save_expected_doc",
      targetId: id,
      targetType: "expectedDocument",
      details: JSON.stringify({ businessType: args.businessType, docType: args.docType }),
      createdAt: now,
    });

    return id;
  },
});

/**
 * Admin Queues Query: Done-for-Me jobs, referrals, print orders, failed AI jobs, low-confidence review.
 */
export const getAdminQueues = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminUser(ctx);

    const doneForMeJobs = await ctx.db.query("doneForMeJobs").collect();
    const referrals = await ctx.db.query("referrals").collect();
    const printOrders = await ctx.db.query("printOrders").collect();

    // Low confidence docs (<0.85) or needs review
    const allDocs = await ctx.db.query("documents").collect();
    const lowConfidenceDocs = allDocs.filter(
      (d) => (d.extractionConfidence !== undefined && d.extractionConfidence < 0.85) || d.reviewStatus === "needs_review"
    );
    const failedAiJobs = allDocs.filter((d) => d.status === "failed");

    return {
      doneForMeJobs,
      referrals,
      printOrders,
      lowConfidenceDocs,
      failedAiJobs,
    };
  },
});

/**
 * Immutable Admin Audit Log Query.
 */
export const listAdminAuditLogs = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminUser(ctx);
    const logs = await ctx.db.query("adminAuditLogs").collect();
    return logs.reverse();
  },
});
