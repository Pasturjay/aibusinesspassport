import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "@/convex/schema";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Webhook } from "svix";

const modules = import.meta.glob("../convex/**/*.*s");

const createMockBusiness = (overrides = {}) => ({
  ownerUserId: "user_clerk_owner_123",
  status: "registered" as const,
  identity: {
    legalName: "Lagos Tech Innovations Ltd",
    tradingName: "Lagos Tech",
    businessType: "limited_company" as const,
    rcNumber: "RC-112233",
    tin: "TIN-112233",
    industry: "Software & Technology",
    subIndustry: "SaaS",
    description: "Cloud software solutions",
    yearFounded: 2024,
    address: {
      line1: "1 Victoria Island Way",
      city: "Lagos",
      lga: "Eti-Osa",
      state: "Lagos",
      country: "Nigeria",
    },
    contact: {
      phone: "+2348099999999",
      email: "hello@lagostech.ng",
      socials: [],
    },
  },
  operations: {
    hasEmployees: true,
    employeeCount: 10,
    hasPhysicalShop: false,
    sellsOnline: true,
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

describe("Segment 3: Clerk <-> Convex Identity & Advisor RBAC Controls", () => {
  it("sign-up creates a users row and does NOT create a business yet", async () => {
    const t = convexTest(schema, modules);

    const clerkId = "user_clerk_new_founder_999";
    const userId = await t.mutation(api.users.upsertUserFromWebhook, {
      clerkId,
      email: "founder@lagostech.ng",
      name: "Tunde Bakare",
      phone: "+2348011112222",
      role: "owner",
    });

    expect(userId).toBeDefined();

    // Verify user row exists
    const userDoc = await t.run(async (ctx) => {
      return (await ctx.db.get(userId)) as Doc<"users"> | null;
    });

    expect(userDoc?.clerkId).toBe(clerkId);
    expect(userDoc?.email).toBe("founder@lagostech.ng");
    expect(userDoc?.role).toBe("owner");

    // CRITICAL: On created, DO NOT create a business yet
    const businesses = await t.run(async (ctx) => {
      return await ctx.db
        .query("businesses")
        .withIndex("by_owner", (q) => q.eq("ownerUserId", clerkId))
        .collect();
    });

    expect(businesses).toHaveLength(0);
  });

  it("forged svix webhook signature is rejected", () => {
    const testSecret = "whsec_Mf2WyEoiPMVhJu2pOTBdbYACAYRGEKGz";
    const wh = new Webhook(testSecret);

    const payload = JSON.stringify({ type: "user.created", data: { id: "user_forged" } });
    const fakeHeaders = {
      "svix-id": "msg_fake_123",
      "svix-timestamp": Math.floor(Date.now() / 1000).toString(),
      "svix-signature": "v1,invalid_forged_signature_hash",
    };

    expect(() => {
      wh.verify(payload, fakeHeaders);
    }).toThrow();
  });

  it("advisor cannot read an ungranted category", async () => {
    const t = convexTest(schema, modules);

    // 1. Seed business and advisor user
    const businessId = await t.run(async (ctx) => {
      return await ctx.db.insert("businesses", createMockBusiness());
    });

    const advisorClerkId = "user_clerk_advisor_lawyer";
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: advisorClerkId,
        email: "lawyer@adewale.ng",
        name: "Barrister Adewale",
        role: "advisor",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        schemaVersion: 1,
      });
    });

    // 2. Grant access to 'registration' category ONLY
    await t.run(async (ctx) => {
      await ctx.db.insert("advisorGrants", {
        businessId,
        advisorUserId: advisorClerkId,
        categories: ["registration"], // NOT tax
        grantedBy: "user_clerk_owner_123",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });
    });

    // 3. Advisor queries ungranted 'tax' category -> must throw error
    const tAsAdvisor = t.withIdentity({ subject: advisorClerkId });

    await expect(
      tAsAdvisor.query(api.advisors.getCategoryDocuments, {
        businessId,
        category: "tax",
      })
    ).rejects.toThrow('Advisor access denied: No active grant for category "tax"');
  });

  it("revoked advisor grant loses access immediately", async () => {
    const t = convexTest(schema, modules);

    const ownerClerkId = "user_clerk_owner_123";
    const advisorClerkId = "user_clerk_advisor_accountant";

    // 1. Seed owner user and business
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: ownerClerkId,
        email: "owner@lagostech.ng",
        name: "Lagos Owner",
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

    // 2. Seed advisor user
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: advisorClerkId,
        email: "accountant@audit.ng",
        name: "Accountant Bayo",
        role: "advisor",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        schemaVersion: 1,
      });
    });

    // 3. Grant advisor access to 'finance' category
    const grantId = await t.run(async (ctx) => {
      return await ctx.db.insert("advisorGrants", {
        businessId,
        advisorUserId: advisorClerkId,
        categories: ["finance"],
        grantedBy: ownerClerkId,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });
    });

    // 4. Initial query succeeds while grant is active
    const tAsAdvisor = t.withIdentity({ subject: advisorClerkId });
    const initialDocs = await tAsAdvisor.query(api.advisors.getCategoryDocuments, {
      businessId,
      category: "finance",
    });
    expect(initialDocs).toBeDefined();

    // 5. Owner revokes grant
    const tAsOwner = t.withIdentity({ subject: ownerClerkId });
    await tAsOwner.mutation(api.advisors.revokeAdvisorAccess, { grantId });

    // 6. Advisor attempts query immediately after revocation -> must fail
    await expect(
      tAsAdvisor.query(api.advisors.getCategoryDocuments, {
        businessId,
        category: "finance",
      })
    ).rejects.toThrow('Advisor access denied: No active grant for category "finance"');
  });
});
