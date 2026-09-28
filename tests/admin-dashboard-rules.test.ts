import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

describe("SEGMENT 8: Admin Dashboard & Rules Management Acceptance Tests", () => {
  it("enforces RBAC: non-admin roles get 403 / unauthorized error from admin Convex functions", async () => {
    const t = convexTest(schema, modules);

    // 1. Seed non-admin user (role: owner)
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "user_regular_owner",
        email: "owner@sme.ng",
        name: "Standard Founder",
        role: "owner",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });
    });

    const nonAdminContext = t.withIdentity({ subject: "user_regular_owner" });

    // Non-admin attempting to list all rules must fail
    await expect(nonAdminContext.query(api.admin.listAllRules, {})).rejects.toThrow(
      "403 Unauthorized"
    );

    // Non-admin attempting to create a rule draft must fail
    await expect(
      nonAdminContext.mutation(api.admin.createRuleDraft, {
        ruleKey: "TEST_RULE_KEY",
        title: "Test Rule",
        plainLanguageSummary: "Summary",
        appliesWhen: JSON.stringify({ field: "identity.businessType", operator: "equals", value: "limited_company" }),
        obligationType: "annual",
        recurrence: { frequency: "annual", dueDateRule: "FIXED_CALENDAR:12-31" },
        jurisdiction: "federal",
        agency: "CAC",
        steps: [],
        source: { name: "CAC Portal" },
        effectiveDate: "2026-01-01",
        confidenceIfMatched: 1.0,
      })
    ).rejects.toThrow("403 Unauthorized");
  });

  it("enforces Two-Person Rule: author cannot self-publish a rule draft", async () => {
    const t = convexTest(schema, modules);

    // 1. Seed Admin Author user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "user_admin_author_01",
        email: "author@admin.gov.ng",
        name: "Admin Author",
        role: "admin",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });
    });

    const authorCtx = t.withIdentity({ subject: "user_admin_author_01" });

    // 2. Author creates rule draft
    const ruleId = await authorCtx.mutation(api.admin.createRuleDraft, {
      ruleKey: "CAC_FILING_TEST",
      title: "File CAC Test",
      plainLanguageSummary: "Test summary",
      appliesWhen: JSON.stringify({ field: "identity.businessType", operator: "equals", value: "limited_company" }),
      obligationType: "annual",
      recurrence: { frequency: "annual", dueDateRule: "FIXED_CALENDAR:12-31" },
      jurisdiction: "federal",
      agency: "CAC",
      steps: [],
      source: { name: "CAC Portal" },
      effectiveDate: "2026-01-01",
      confidenceIfMatched: 1.0,
    });

    // 3. Author attempts to self-publish (must throw error!)
    await expect(
      authorCtx.mutation(api.admin.publishRule, {
        ruleId,
        changeNote: "Self publishing attempt",
      })
    ).rejects.toThrow("Two-person rule violation: Author cannot self-publish a rule");
  });

  it("enforces Published Rule Immutability: editing a published rule throws error", async () => {
    const t = convexTest(schema, modules);

    // 1. Seed Author and Reviewer Admin users
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "user_admin_author_01",
        email: "author@admin.gov.ng",
        name: "Admin Author",
        role: "admin",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      await ctx.db.insert("users", {
        clerkId: "user_admin_reviewer_02",
        email: "reviewer@admin.gov.ng",
        name: "Admin Reviewer",
        role: "content_editor",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });
    });

    const authorCtx = t.withIdentity({ subject: "user_admin_author_01" });
    const reviewerCtx = t.withIdentity({ subject: "user_admin_reviewer_02" });

    // 2. Author creates rule draft
    const ruleId = await authorCtx.mutation(api.admin.createRuleDraft, {
      ruleKey: "TAX_CLEARANCE_TEST",
      title: "Tax Clearance Rule",
      plainLanguageSummary: "Tax clearance summary",
      appliesWhen: JSON.stringify({ field: "identity.businessType", operator: "equals", value: "limited_company" }),
      obligationType: "annual",
      recurrence: { frequency: "annual", dueDateRule: "FIXED_CALENDAR:06-30" },
      jurisdiction: "federal",
      agency: "FIRS",
      steps: [],
      source: { name: "FIRS Portal" },
      effectiveDate: "2026-01-01",
      confidenceIfMatched: 1.0,
    });

    // 3. Reviewer publishes the rule
    await reviewerCtx.mutation(api.admin.publishRule, {
      ruleId,
      changeNote: "Initial published baseline for 2026",
    });

    // 4. Attempting to edit the published rule directly MUST fail
    await expect(
      authorCtx.mutation(api.admin.updateRuleDraft, {
        ruleId,
        title: "Attempting to mutate published rule",
      })
    ).rejects.toThrow("Cannot edit a published rule directly");
  });

  it("versioning guarantee: rule edit creates new version while existing items keep pointing to old version", async () => {
    const t = convexTest(schema, modules);

    // 1. Seed business & existing complianceItem pointing to v1
    const { itemId } = await t.run(async (ctx) => {
      const bId = await ctx.db.insert("businesses", {
        ownerUserId: "user_owner_1",
        status: "registered",
        identity: {
          legalName: "Test SME Ltd",
          businessType: "limited_company",
          industry: "Technology",
          description: "SME Tech",
          address: { line1: "1 Main St", city: "Lagos", lga: "Ikeja", state: "Lagos", country: "Nigeria" },
          contact: { phone: "+23480000000", email: "sme@test.ng", socials: [] },
        },
        operations: { hasEmployees: true, hasPhysicalShop: false, sellsOnline: true, branches: [], operatesStates: ["Lagos"] },
        capabilities: [],
        services: [],
        onboardingState: { step: "completed", answers: {} },
        plan: { tier: "free", status: "active" },
        brainVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      const cId = await ctx.db.insert("complianceItems", {
        businessId: bId,
        ruleKey: "CAC_ANNUAL_RETURN",
        ruleVersion: 1,
        status: "needs_attention",
        dueDate: "2026-06-30",
        plainSummary: "CAC Annual Return (v1 reference)",
        source: "CAC Rule v1",
        lastReviewedAt: "2026-01-01",
        confirmBeforeFiling: false,
        confidence: 0.95,
        createdFrom: "onboarding",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { businessId: bId, itemId: cId };
    });

    // Verify existing item points to version 1
    const itemBefore = await t.run(async (ctx) => await ctx.db.get(itemId));
    expect(itemBefore?.ruleVersion).toBe(1);

    // Seed admin author and reviewer
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "user_admin_author_01",
        email: "author@admin.gov.ng",
        name: "Admin Author",
        role: "admin",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      await ctx.db.insert("users", {
        clerkId: "user_admin_reviewer_02",
        email: "reviewer@admin.gov.ng",
        name: "Admin Reviewer",
        role: "content_editor",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });
    });

    const authorCtx = t.withIdentity({ subject: "user_admin_author_01" });
    const reviewerCtx = t.withIdentity({ subject: "user_admin_reviewer_02" });

    // Create v2 draft for same ruleKey
    const v2RuleId = await authorCtx.mutation(api.admin.createRuleDraft, {
      ruleKey: "CAC_ANNUAL_RETURN",
      title: "CAC Annual Return (Version 2)",
      plainLanguageSummary: "Updated v2 summary",
      appliesWhen: JSON.stringify({ field: "identity.businessType", operator: "equals", value: "limited_company" }),
      obligationType: "annual",
      recurrence: { frequency: "annual", dueDateRule: "FIXED_CALENDAR:06-30" },
      jurisdiction: "federal",
      agency: "CAC",
      steps: [],
      source: { name: "CAC Portal 2026" },
      effectiveDate: "2026-01-01",
      confidenceIfMatched: 1.0,
    });

    // Reviewer publishes v2
    await reviewerCtx.mutation(api.admin.publishRule, {
      ruleId: v2RuleId,
      changeNote: "Published version 2 with updated statutory references",
    });

    // CRITICAL ACCEPTANCE CHECK: Existing item STILL points to version 1
    const itemAfter = await t.run(async (ctx) => await ctx.db.get(itemId));
    expect(itemAfter?.ruleVersion).toBe(1);
  });
});
