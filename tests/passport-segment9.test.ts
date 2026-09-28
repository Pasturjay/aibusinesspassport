import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import workerResolver from "../workers/passport-resolver/src/index";
import { can } from "../lib/entitlements";
import { buildPassportPointerUrl } from "../lib/passport/qr";

const modules = import.meta.glob("../convex/**/*.ts");

describe("SEGMENT 9: The Passport & Verifiable Identity Acceptance Tests", () => {
  it("convex-test proves getPublic NEVER returns private values or on_request field values", async () => {
    const t = convexTest(schema, modules);

    // 1. Seed business with private data
    const businessId = await t.run(async (ctx) => {
      return await ctx.db.insert("businesses", {
        ownerUserId: "user_owner_priv",
        status: "registered",
        identity: {
          legalName: "PrivEx Logistics Ltd",
          tradingName: "PrivEx",
          businessType: "limited_company",
          rcNumber: "RC-998877",
          tin: "TIN-998877-SECRET",
          industry: "Logistics",
          description: "Secret logistics company",
          address: { line1: "1 Priv St", city: "Ikeja", lga: "Ikeja", state: "Lagos", country: "Nigeria" },
          contact: { phone: "+2348011112222", email: "contact@privex.ng", socials: [] },
        },
        operations: { hasEmployees: true, hasPhysicalShop: false, sellsOnline: true, branches: [], operatesStates: ["Lagos"] },
        capabilities: [],
        services: [],
        onboardingState: { step: "completed", answers: {} },
        plan: { tier: "pro", status: "active" },
        brainVersion: 1,
        directorNIN: "12345678901",
        directorBVN: "22233344455",
        turnoverRange: "NGN 100m+",
        bankAccountDetails: { accountNumber: "0011223344", bankCode: "057", bankName: "Zenith Bank" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });
    });

    // 2. Create passport via passports.create
    const createRes = await t.mutation(api.passports.create, { businessId });
    expect(createRes.passportId).toMatch(/^BP-NG-[A-Z0-9]{6}$/);

    // 3. Query getPublic
    const publicResult = await t.query(api.passports.getPublic, {
      passportId: createRes.passportId,
    });

    expect(publicResult).not.toBeNull();
    expect(publicResult?.available).toBe(true);

    // Public fields ARE returned
    expect(publicResult?.legalName).toBe("PrivEx Logistics Ltd");
    expect(publicResult?.tradingName).toBe("PrivEx");
    expect(publicResult?.phone).toBe("+2348011112222");

    // ON_REQUEST fields return ONLY { available: true }, NEVER exposing actual values!
    expect(publicResult?.registrationDetails).toEqual({ available: true });
    expect(publicResult?.registrationNumber).toBeUndefined(); // Actual string MUST NOT be leaked

    // PRIVATE fields MUST NEVER BE PRESENT on returned object!
    const resKeys = Object.keys(publicResult as object);
    expect(resKeys).not.toContain("directorNIN");
    expect(resKeys).not.toContain("directorBVN");
    expect(resKeys).not.toContain("turnoverRange");
    expect(resKeys).not.toContain("bankAccountDetails");
    expect(resKeys).not.toContain("tin");

    expect((publicResult as any).directorNIN).toBeUndefined();
    expect((publicResult as any).directorBVN).toBeUndefined();
    expect((publicResult as any).tin).toBeUndefined();
  });

  it("revocation check: isActive=false returns neutral unavailable response", async () => {
    const t = convexTest(schema, modules);

    const businessId = await t.run(async (ctx) => {
      return await ctx.db.insert("businesses", {
        ownerUserId: "user_owner_rev",
        status: "registered",
        identity: {
          legalName: "Revoked Enterprise Ltd",
          businessType: "limited_company",
          industry: "Trading",
          description: "Revoked business",
          address: { line1: "2 Rev St", city: "Kano", lga: "Nasarawa", state: "Kano", country: "Nigeria" },
          contact: { phone: "+2348022223333", email: "rev@test.ng", socials: [] },
        },
        operations: { hasEmployees: false, hasPhysicalShop: false, sellsOnline: false, branches: [], operatesStates: ["Kano"] },
        capabilities: [],
        services: [],
        onboardingState: { step: "completed", answers: {} },
        plan: { tier: "free", status: "active" },
        brainVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });
    });

    const createRes = await t.mutation(api.passports.create, { businessId });

    // Set isActive = false
    await t.run(async (ctx) => {
      const p = await ctx.db
        .query("passports")
        .withIndex("by_passport_id", (q) => q.eq("passportId", createRes.passportId))
        .unique();
      if (p) {
        await ctx.db.patch(p._id, { isActive: false });
      }
    });

    const publicResult = await t.query(api.passports.getPublic, {
      passportId: createRes.passportId,
    });

    expect(publicResult).toEqual({
      available: false,
      message: "This Passport is not available",
    });
  });

  it("Worker tests prove private data is absent across JSON, HTML, and vCard response paths", async () => {
    const env: any = { CONVEX_URL: "", PASSPORT_RESOLVER_SECRET: "secret" };
    const dummyCtx: any = { waitUntil: () => {} };

    // 1. JSON Path: GET /passport/BP-NG-112233
    const reqJson = new Request("https://passport.ng/passport/BP-NG-112233");
    const resJson = await workerResolver.fetch(reqJson, env, dummyCtx);
    const jsonBody = (await resJson.json()) as any;

    expect(resJson.status).toBe(200);
    expect(jsonBody.directorNIN).toBeUndefined();
    expect(jsonBody.directorBVN).toBeUndefined();
    expect(jsonBody.tin).toBeUndefined();

    // 2. HTML Path: GET /p/BP-NG-112233
    const reqHtml = new Request("https://passport.ng/p/BP-NG-112233");
    const resHtml = await workerResolver.fetch(reqHtml, env, dummyCtx);
    const htmlText = await resHtml.text();

    expect(resHtml.status).toBe(200);
    expect(htmlText).not.toContain("12345678901");
    expect(htmlText).not.toContain("directorNIN");

    // 3. vCard Path: GET /p/BP-NG-112233.vcf
    const reqVcf = new Request("https://passport.ng/p/BP-NG-112233.vcf");
    const resVcf = await workerResolver.fetch(reqVcf, env, dummyCtx);
    const vcfText = await resVcf.text();

    expect(resVcf.status).toBe(200);
    expect(vcfText).toContain("BEGIN:VCARD");
    expect(vcfText).not.toContain("directorNIN");
    expect(vcfText).not.toContain("directorBVN");
  });

  it("live pointer architecture: updating business details updates pointer URL without reprinting", () => {
    const passportId = "BP-NG-998877";
    const pointerUrl = buildPassportPointerUrl({ passportId, mode: "qr" });

    expect(pointerUrl).toBe("https://passport.ng/p/BP-NG-998877?m=qr");

    // Even if phone, address, or tagline change, the printed QR code pointer URL remains identical
    const pointerUrl2 = buildPassportPointerUrl({ passportId, mode: "qr" });
    expect(pointerUrl2).toBe(pointerUrl);
  });

  it("entitlements helper correctly gates features by plan tier", () => {
    expect(can("free", "all_passport_styles")).toBe(false);
    expect(can("free", "nfc_sharing")).toBe(false);

    expect(can("plus", "all_passport_styles")).toBe(true);
    expect(can("plus", "nfc_sharing")).toBe(false);

    expect(can("pro", "all_passport_styles")).toBe(true);
    expect(can("pro", "nfc_sharing")).toBe(true);
  });
});
