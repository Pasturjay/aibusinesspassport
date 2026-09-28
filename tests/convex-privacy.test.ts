import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "@/convex/schema";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

const modules = import.meta.glob("../convex/**/*.*s");

const createMockBusiness = (overrides = {}) => ({
  ownerUserId: "user_clerk_lagos_owner",
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
    operatesStates: ["Lagos", "Oyo"],
  },
  capabilities: [
    { name: "Solar Design", description: "C&I solar design and engineering" },
  ],
  services: [
    { name: "Solar Audit", description: "Energy audit for commercial buildings" },
  ],
  onboardingState: {
    step: "completed",
    answers: {},
  },
  plan: {
    tier: "pro" as const,
    status: "active" as const,
  },
  brainVersion: 1,
  directorNIN: "11223344556",
  directorBVN: "22334455667",
  turnoverRange: "50m-250m NGN",
  bankAccountDetails: {
    accountNumber: "0123456789",
    bankCode: "058",
    bankName: "GTBank",
  },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  schemaVersion: 1,
  ...overrides,
});

describe("Convex Privacy by Design & Compliance Rules", () => {
  it("strictly enforces minimal public shape and prevents leakage of private owner fields", async () => {
    const t = convexTest(schema, modules);

    // 1. Seed business with sensitive private fields
    const businessId = await t.run(async (ctx) => {
      return await ctx.db.insert("businesses", createMockBusiness());
    });

    // 2. Seed public passport
    await t.run(async (ctx) => {
      await ctx.db.insert("passports", {
        businessId,
        passportId: "BP-NG-887766",
        passportSlug: "lekki-green-energies-rc887766",
        style: "professional",
        fieldVisibility: {},
        isActive: true,
        nfcEnabled: false,
        isVerified: true,
        status: "verified",
        issuedAt: "2026-01-10T12:00:00Z",
        createdAt: "2026-01-10T12:00:00Z",
        updatedAt: "2026-01-10T12:00:00Z",
        schemaVersion: 1,
      });
    });

    // 3. Query through public resolver query
    const publicResult = await t.query(api.passports.getPublicPassport, {
      passportSlug: "lekki-green-energies-rc887766",
    });

    expect(publicResult).not.toBeNull();
    // Verify public shape fields exist
    expect(publicResult?.businessName).toBe("Lekki Green Energies Ltd");
    expect(publicResult?.registrationNumber).toBe("RC-887766");
    expect(publicResult?.entityType).toBe("limited_company");
    expect(publicResult?.state).toBe("Lagos");
    expect(publicResult?.industry).toBe("Renewable Energy");
    expect(publicResult?.isVerified).toBe(true);

    // CRITICAL: Verify private fields are completely stripped at query level
    const publicKeys = Object.keys(publicResult as object);
    expect(publicKeys).not.toContain("directorNIN");
    expect(publicKeys).not.toContain("directorBVN");
    expect(publicKeys).not.toContain("turnoverRange");
    expect(publicKeys).not.toContain("bankAccountDetails");
    expect(publicKeys).not.toContain("taxId");
    expect(publicKeys).not.toContain("ownerUserId");
    expect(publicKeys).not.toContain("address");
  });

  it("permits full profile access only to authorized business owner", async () => {
    const t = convexTest(schema, modules);

    const businessId = await t.run(async (ctx) => {
      return await ctx.db.insert(
        "businesses",
        createMockBusiness({
          ownerUserId: "user_owner_valid",
          identity: {
            legalName: "Kano Agro Processing Ltd",
            businessType: "limited_company",
            rcNumber: "RC-445566",
            tin: "TIN-445566",
            industry: "Agriculture",
            description: "Agro processing",
            address: {
              line1: "Bompai Industrial Estate",
              city: "Kano",
              lga: "Nasarawa",
              state: "Kano",
              country: "Nigeria",
            },
            contact: {
              phone: "+2348022222222",
              email: "info@kanoagro.ng",
              socials: [],
            },
          },
          directorNIN: "99887766554",
        })
      );
    });

    // Owner query succeeds with correct ownerId
    const ownerData = await t.query(api.passports.getOwnerPassport, {
      businessId,
      ownerId: "user_owner_valid",
    });
    expect(ownerData?.business.directorNIN).toBe("99887766554");

    // Owner query fails when unauthorized user requests
    await expect(
      t.query(api.passports.getOwnerPassport, {
        businessId,
        ownerId: "user_attacker_unauthorized",
      })
    ).rejects.toThrow("Unauthorized access to business profile");
  });

  it("enforces confirmBeforeFiling=true in mutation when confidence is low (< 0.85)", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "user_owner_1",
        email: "owner@ibadantech.ng",
        name: "Owner User",
        role: "owner",
        locale: "en-NG",
        notificationPrefs: {
          email: true,
          sms: true,
          whatsapp: true,
          inApp: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });
    });

    const businessId = await t.run(async (ctx) => {
      return await ctx.db.insert(
        "businesses",
        createMockBusiness({
          ownerUserId: "user_owner_1",
          identity: {
            legalName: "Ibadan Tech Hub",
            businessType: "business_name",
            rcNumber: "BN-112233",
            tin: "TIN-112233",
            industry: "Information Technology",
            description: "Tech hub and incubator",
            address: {
              line1: "Bodija",
              city: "Ibadan",
              lga: "Ibadan North",
              state: "Oyo",
              country: "Nigeria",
            },
            contact: {
              phone: "+2348033333333",
              email: "info@ibadantech.ng",
              socials: [],
            },
          },
        })
      );
    });

    const asOwner = t.withIdentity({ subject: "user_owner_1" });

    // Non-Negotiable Principle #2:
    // Low confidence output (0.72) must force confirmBeforeFiling = true
    const complianceItemId = await asOwner.mutation(api.passports.createComplianceItem, {
      businessId,
      title: "CAC Annual Return Filing",
      category: "CAC",
      dueDate: "2026-06-30",
      source: "CAMA 2020 s. 822",
      lastReviewedAt: "2026-01-15T10:00:00Z",
      effectiveDate: "2025 Calendar Year",
      confidence: 0.72, // Below 0.85 threshold
      confirmBeforeFiling: false, // Attempted to bypass confirmation
    });

    const item = await t.run(async (ctx) => {
      return await ctx.db.get(complianceItemId);
    });

    const complianceDoc = item as Doc<"complianceItems">;

    // Enforced in mutation logic, not in prompts!
    expect(complianceDoc?.confirmBeforeFiling).toBe(true);
    expect(complianceDoc?.source).toBe("CAMA 2020 s. 822");
  });
});

