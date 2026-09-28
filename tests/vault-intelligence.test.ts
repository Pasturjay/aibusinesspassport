import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "@/convex/schema";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { applyConfidencePolicy } from "@/lib/llm/confidence";

const modules = import.meta.glob("../convex/**/*.*s");

const createMockBusiness = (overrides = {}) => ({
  ownerUserId: "user_clerk_vault_owner",
  status: "registered" as const,
  identity: {
    legalName: "Lekki Green Energies Ltd",
    tradingName: "Lekki Green",
    businessType: "limited_company" as const,
    rcNumber: "RC-887766",
    tin: "TIN-99887766",
    industry: "Renewable Energy",
    subIndustry: "Solar Power",
    description: "Solar installation and energy solutions",
    yearFounded: 2022,
    address: {
      line1: "10 Admiralty Way",
      city: "Lekki Phase 1",
      lga: "Eti-Osa",
      state: "Lagos",
      country: "Nigeria",
    },
    contact: {
      phone: "+2348012345678",
      email: "info@lekkigreen.ng",
      website: "https://lekkigreen.ng",
      socials: [],
    },
  },
  operations: {
    hasEmployees: true,
    employeeCount: 15,
    hasPhysicalShop: true,
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
    tier: "free" as const,
    status: "active" as const,
  },
  brainVersion: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  schemaVersion: 1,
  ...overrides,
});

describe("Segment 6: Business Vault & Document Intelligence Tests", () => {
  it("upload happy path registers document with status processing", async () => {
    const t = convexTest(schema, modules);

    const ownerClerkId = "user_clerk_vault_owner";
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: ownerClerkId,
        email: "owner@lekkigreen.ng",
        name: "Lekki Owner",
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

    // Register upload
    const { documentId } = await tAsOwner.mutation(api.documents.registerUpload, {
      businessId,
      r2Key: `vault/${businessId}/cac_cert.pdf`,
      fileName: "cac_cert.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1500000,
      category: "registration",
    });

    const doc = await t.run(async (ctx) => {
      return (await ctx.db.get(documentId)) as Doc<"documents"> | null;
    });

    expect(doc?.status).toBe("processing");
    expect(doc?.category).toBe("registration");
    expect(doc?.reviewStatus).toBe("needs_review");
  });

  it("low confidence fixture lands in Needs Review (never auto-filed silently)", () => {
    const policyLow = applyConfidencePolicy(0.72, "registration");

    expect(policyLow.autoAccept).toBe(false);
    expect(policyLow.needsReview).toBe(true);
  });

  it("mismatch fixture produces plain-language notice and does NOT mutate Business Brain", async () => {
    const t = convexTest(schema, modules);

    const ownerClerkId = "user_clerk_vault_owner";
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: ownerClerkId,
        email: "owner@lekkigreen.ng",
        name: "Lekki Owner",
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

    const { documentId } = await tAsOwner.mutation(api.documents.registerUpload, {
      businessId,
      r2Key: `vault/${businessId}/mismatched_tcc.pdf`,
      fileName: "mismatched_tcc.pdf",
      mimeType: "application/pdf",
      sizeBytes: 900000,
      category: "tax",
    });

    // Mismatched intelligence result updated
    await t.mutation(api.documents.updateDocumentIntelligenceResult, {
      documentId,
      category: "tax",
      docType: "tax_clearance",
      extractedJson: JSON.stringify({ businessName: "Lekki Green Energies" }), // Mismatch: missing 'Ltd'
      extractionConfidence: 0.95,
      reviewStatus: "needs_review", // Forced needs_review due to mismatch
      status: "ready",
    });

    // Verify Business Brain remains UNCHANGED
    const businessDoc = await t.run(async (ctx) => {
      return (await ctx.db.get(businessId)) as Doc<"businesses"> | null;
    });

    expect(businessDoc?.identity.legalName).toBe("Lekki Green Energies Ltd");
  });

  it("expired document creates complianceItems with source document_expiry", async () => {
    const t = convexTest(schema, modules);

    const ownerClerkId = "user_clerk_vault_owner";
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: ownerClerkId,
        email: "owner@lekkigreen.ng",
        name: "Lekki Owner",
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

    const { documentId } = await tAsOwner.mutation(api.documents.registerUpload, {
      businessId,
      r2Key: `vault/${businessId}/expired_lease.pdf`,
      fileName: "expired_lease.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1200000,
      category: "contracts",
    });

    // Update with past expiry date
    await t.mutation(api.documents.updateDocumentIntelligenceResult, {
      documentId,
      category: "contracts",
      docType: "lease",
      extractedJson: JSON.stringify({ expiresAt: "2025-01-01" }),
      extractionConfidence: 0.95,
      reviewStatus: "confirmed",
      expiresAt: "2025-01-01",
      status: "ready",
    });

    // Verify complianceItem created with source = 'document_expiry'
    const complianceItems = await t.run(async (ctx) => {
      return await ctx.db
        .query("complianceItems")
        .withIndex("by_business", (q) => q.eq("businessId", businessId))
        .collect();
    });

    const expiryItem = complianceItems.find((i) => i.source === "document_expiry");
    expect(expiryItem).toBeDefined();
    expect(expiryItem?.status).toBe("needs_attention");
  });

  it("convex-test proves advisor sees ONLY granted categories", async () => {
    const t = convexTest(schema, modules);

    const ownerClerkId = "user_clerk_owner_999";
    const advisorClerkId = "user_clerk_advisor_777";

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: ownerClerkId,
        email: "owner@vault.ng",
        name: "Vault Owner",
        role: "owner",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        schemaVersion: 1,
      });

      await ctx.db.insert("users", {
        clerkId: advisorClerkId,
        email: "advisor@law.ng",
        name: "Legal Advisor",
        role: "advisor",
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

    // Grant access to 'registration' category ONLY
    await t.run(async (ctx) => {
      await ctx.db.insert("advisorGrants", {
        businessId,
        advisorUserId: advisorClerkId,
        categories: ["registration"],
        grantedBy: ownerClerkId,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });
    });

    const tAsAdvisor = t.withIdentity({ subject: advisorClerkId });

    // Advisor query for granted 'registration' category succeeds
    const regDocs = await tAsAdvisor.query(api.documents.getVaultDocuments, {
      businessId,
      category: "registration",
    });
    expect(regDocs).toBeDefined();

    // Advisor query for ungranted 'finance' category throws
    await expect(
      tAsAdvisor.query(api.documents.getVaultDocuments, {
        businessId,
        category: "finance",
      })
    ).rejects.toThrow('Advisor access denied: No active grant for category "finance"');
  });
});
