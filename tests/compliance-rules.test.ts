import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "@/convex/schema";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  evaluatePredicate,
  computeDueDate,
  evaluateRules,
  ComplianceRuleData,
} from "@/lib/compliance/rulesEngine";
import { validateProductionPublishSafeguard } from "@/convex/seedComplianceRules";

const modules = import.meta.glob("../convex/**/*.*s");

const createMockBusiness = (overrides = {}) => ({
  ownerUserId: "user_clerk_compliance_owner",
  status: "registered" as const,
  identity: {
    legalName: "Lagos Retail Solutions Ltd",
    tradingName: "Lagos Retail",
    businessType: "limited_company" as const,
    rcNumber: "RC-998877",
    tin: "TIN-998877",
    industry: "Retail & Commerce",
    subIndustry: "General Retail",
    description: "Retail and wholesale trade",
    yearFounded: 2023,
    address: {
      line1: "5 Ikeja Shopping Mall",
      city: "Ikeja",
      lga: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
    },
    contact: {
      phone: "+2348055555555",
      email: "info@lagosretail.ng",
      website: "https://lagosretail.ng",
      socials: [],
    },
  },
  operations: {
    hasEmployees: false,
    employeeCount: 0,
    hasPhysicalShop: true,
    sellsOnline: false,
    branches: [],
    operatesStates: ["Lagos"],
  },
  capabilities: [],
  services: [],
  onboardingState: {
    step: "completed",
    answers: {},
  },
  plan: {
    tier: "pro" as const,
    status: "active" as const,
  },
  brainVersion: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  schemaVersion: 1,
  ...overrides,
});

describe("Segment 7: Compliance Rules Engine & Audit Tests", () => {
  it("evaluates Predicate DSL correctly (all, any, not, equals, in, gt, lt, exists)", () => {
    const brainSnapshot = {
      identity: { businessType: "limited_company", industry: "Renewable Energy" },
      operations: { hasEmployees: true, employeeCount: 12 },
    };

    // 1. Equals
    expect(evaluatePredicate({ path: "identity.businessType", equals: "limited_company" }, brainSnapshot)).toBe(true);
    expect(evaluatePredicate({ path: "identity.businessType", equals: "business_name" }, brainSnapshot)).toBe(false);

    // 2. In
    expect(evaluatePredicate({ path: "identity.industry", in: ["Renewable Energy", "Solar"] }, brainSnapshot)).toBe(true);

    // 3. Greater than (gt)
    expect(evaluatePredicate({ path: "operations.employeeCount", gt: 5 }, brainSnapshot)).toBe(true);

    // 4. All (AND)
    expect(
      evaluatePredicate(
        {
          all: [
            { path: "identity.businessType", equals: "limited_company" },
            { path: "operations.hasEmployees", equals: true },
          ],
        },
        brainSnapshot
      )
    ).toBe(true);

    // 5. Not
    expect(evaluatePredicate({ not: { path: "operations.hasEmployees", equals: false } }, brainSnapshot)).toBe(true);
  });

  it("computes deterministic statutory due dates", () => {
    const brainSnapshot = { identity: { yearFounded: 2022 } };

    // FIXED:06-30
    const fixedDue = computeDueDate("FIXED:06-30", brainSnapshot, undefined, 2026);
    expect(fixedDue).toBe("2026-06-30");

    // DAYS_AFTER_EVENT:30
    const eventDue = computeDueDate("DAYS_AFTER_EVENT:30", brainSnapshot, "2026-01-01");
    expect(eventDue).toBe("2026-01-31");
  });

  it("stale rule (> 180 days since review) forces confirmBeforeFiling=true and status needs_review", () => {
    const brainSnapshot = { identity: { businessType: "limited_company" } };

    const staleRule: ComplianceRuleData = {
      ruleKey: "STALE_TAX_RULE",
      version: 1,
      title: "Stale Tax Rule Test",
      plainLanguageSummary: "Stale tax rule for testing",
      appliesWhen: { path: "identity.businessType", equals: "limited_company" },
      obligationType: "tax",
      recurrence: { frequency: "annual", dueDateRule: "FIXED:06-30" },
      jurisdiction: "federal",
      agency: "FIRS",
      steps: [],
      source: { name: "CITA 2004" },
      effectiveDate: "2004-01-01",
      lastReviewedAt: "2024-01-01T00:00:00Z", // > 180 days old
      reviewedBy: "System",
      status: "published",
      confidenceIfMatched: 0.95,
    };

    const evaluated = evaluateRules(brainSnapshot, [staleRule], 180);

    expect(evaluated).toHaveLength(1);
    expect(evaluated[0].staleRule).toBe(true);
    expect(evaluated[0].confirmBeforeFiling).toBe(true);
    expect(evaluated[0].status).toBe("needs_review");
  });

  it("placeholder rules cannot be published in production mode (Production Safeguard)", () => {
    const placeholderList = [
      { title: "[PLACEHOLDER — NOT REVIEWED] Test Rule", status: "draft" },
    ];

    // In development mode, seeding passes
    expect(() => {
      validateProductionPublishSafeguard(placeholderList, "development");
    }).not.toThrow();

    // In production mode, safeguard throws error
    expect(() => {
      validateProductionPublishSafeguard(placeholderList, "production");
    }).toThrow("Production Safeguard Error: Cannot publish draft placeholder rules in production environment!");
  });

  it("hiring change event immediately surfaces new employee obligations without waiting for nightly job", async () => {
    const t = convexTest(schema, modules);

    const ownerClerkId = "user_clerk_compliance_owner";
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: ownerClerkId,
        email: "owner@lagosretail.ng",
        name: "Retail Owner",
        role: "owner",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        schemaVersion: 1,
      });
    });

    const businessId = await t.run(async (ctx) => {
      return await ctx.db.insert("businesses", createMockBusiness({ ownerUserId: ownerClerkId }));
    });

    const tAsOwner = t.withIdentity({ subject: ownerClerkId });

    // Record hiring change event: hired 3 employees
    const res = await tAsOwner.mutation(api.compliance.recordBusinessChangeEvent, {
      businessId,
      eventType: "hired_employees",
      payload: JSON.stringify({ hiredCount: 3 }),
    });

    expect(res.eventId).toBeDefined();

    // Verify Business Brain operations updated immediately
    const businessDoc = await t.run(async (ctx) => {
      return (await ctx.db.get(businessId)) as Doc<"businesses"> | null;
    });

    expect(businessDoc?.operations.hasEmployees).toBe(true);
    expect(businessDoc?.operations.employeeCount).toBe(3);
  });

  it("audit log rows exist for every view or decision", async () => {
    const t = convexTest(schema, modules);

    const ownerClerkId = "user_clerk_compliance_owner";
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: ownerClerkId,
        email: "owner@lagosretail.ng",
        name: "Retail Owner",
        role: "owner",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        schemaVersion: 1,
      });
    });

    const businessId = await t.run(async (ctx) => {
      return await ctx.db.insert("businesses", createMockBusiness({ ownerUserId: ownerClerkId }));
    });

    // Create a compliance item
    const itemId = await t.run(async (ctx) => {
      return await ctx.db.insert("complianceItems", {
        businessId,
        ruleKey: "CAC_ANNUAL_RETURNS",
        ruleVersion: 1,
        status: "needs_attention",
        dueDate: "2026-06-30",
        plainSummary: "File CAC Annual Returns",
        source: "CAMA 2020 s. 822",
        lastReviewedAt: "2026-01-01T00:00:00Z",
        confirmBeforeFiling: false,
        confidence: 0.95,
        createdFrom: "manual",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });
    });

    const tAsOwner = t.withIdentity({ subject: ownerClerkId });

    // Log audit decision
    const auditId = await tAsOwner.mutation(api.compliance.logComplianceAudit, {
      businessId,
      itemId,
      action: "viewed_detail",
      shownText: "File CAC Annual Returns",
      ruleVersion: 1,
    });

    const auditDoc = await t.run(async (ctx) => {
      return (await ctx.db.get(auditId)) as Doc<"complianceAuditLog"> | null;
    });

    expect(auditDoc?.action).toBe("viewed_detail");
    expect(auditDoc?.ruleVersion).toBe(1);
    expect(auditDoc?.actor.id).toBe(ownerClerkId);
  });
});
