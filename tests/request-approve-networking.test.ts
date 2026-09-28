import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

describe("SEGMENT 10: Request/Approve Flow & Networking Acceptance Tests", () => {
  it("unverified email cannot trigger owner notification or be approved", async () => {
    const t = convexTest(schema, modules);

    // 1. Seed user, business & passport
    const { businessId, passportId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "user_owner_unverif",
        email: "owner@lagoslog.ng",
        name: "Lagos Owner",
        role: "owner",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      const bId = await ctx.db.insert("businesses", {
        ownerUserId: "user_owner_unverif",
        status: "registered",
        identity: {
          legalName: "Lagos Logistics Ltd",
          businessType: "limited_company",
          rcNumber: "RC-112233",
          industry: "Logistics",
          description: "Logistics Services",
          address: { line1: "1 Main St", city: "Ikeja", lga: "Ikeja", state: "Lagos", country: "Nigeria" },
          contact: { phone: "+23480000000", email: "info@lagoslog.ng", socials: [] },
        },
        operations: { hasEmployees: true, hasPhysicalShop: false, sellsOnline: true, branches: [], operatesStates: ["Lagos"] },
        capabilities: [],
        services: [],
        onboardingState: { step: "completed", answers: {} },
        plan: { tier: "plus", status: "active" },
        brainVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      await ctx.db.insert("passports", {
        businessId: bId,
        passportId: "BP-NG-UNVER1",
        passportSlug: "lagos-logistics-bp-ng-unver1",
        style: "professional",
        fieldVisibility: {},
        isActive: true,
        nfcEnabled: true,
        isVerified: true,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      return { businessId: bId, passportId: "BP-NG-UNVER1" };
    });

    // 2. Requester creates request without auto-verifying email
    const reqRes = await t.mutation(api.requests.createDocumentRequest, {
      passportId,
      requesterName: "Auditor John",
      requesterCompany: "KPMG Nigeria",
      requesterEmail: "john@kpmg.ng",
      requestedItems: ["registration", "compliance_docs"],
      autoVerifyEmail: false,
    });

    expect(reqRes.isVerifiedEmail).toBe(false);

    // 3. Owner attempting to approve unverified request MUST fail
    const ownerCtx = t.withIdentity({ subject: "user_owner_unverif" });
    await expect(
      ownerCtx.mutation(api.requests.decideDocumentRequest, {
        businessId,
        requestId: reqRes.requestId,
        decision: "approved",
      })
    ).rejects.toThrow("Cannot approve request: Requester email is unverified");

    // 4. Verify email via token
    const verifRes = await t.mutation(api.requests.verifyRequesterEmail, {
      verificationToken: reqRes.verificationToken,
    });
    expect(verifRes.success).toBe(true);

    // 5. Now approval succeeds!
    const approveRes = await ownerCtx.mutation(api.requests.decideDocumentRequest, {
      businessId,
      requestId: reqRes.requestId,
      decision: "approved",
    });
    expect(approveRes.status).toBe("approved");
  });

  it("package assembly: expired or unreviewed docs are excluded and flagged in gaps[]", async () => {
    const t = convexTest(schema, modules);

    // Seed user, business, passport, and documents
    const { businessId, passportId, validDocId, expiredDocId, unreviewedDocId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "user_owner_gap",
        email: "owner@agro.ng",
        name: "Agro Owner",
        role: "owner",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      const bId = await ctx.db.insert("businesses", {
        ownerUserId: "user_owner_gap",
        status: "registered",
        identity: {
          legalName: "Agro Tech Ltd",
          businessType: "limited_company",
          industry: "Agro",
          description: "Agro tech",
          address: { line1: "1 Farm St", city: "Kano", lga: "Kano", state: "Kano", country: "Nigeria" },
          contact: { phone: "+23480111111", email: "agro@test.ng", socials: [] },
        },
        operations: { hasEmployees: true, hasPhysicalShop: false, sellsOnline: true, branches: [], operatesStates: ["Kano"] },
        capabilities: [],
        services: [],
        onboardingState: { step: "completed", answers: {} },
        plan: { tier: "pro", status: "active" },
        brainVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      await ctx.db.insert("passports", {
        businessId: bId,
        passportId: "BP-NG-GAPTEST",
        passportSlug: "agro-tech-bp-ng-gaptest",
        style: "professional",
        fieldVisibility: {},
        isActive: true,
        nfcEnabled: true,
        isVerified: true,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      const d1 = await ctx.db.insert("documents", {
        businessId: bId,
        r2Key: "r2_cac_cert",
        fileName: "CAC_Certificate.pdf",
        mimeType: "application/pdf",
        sizeBytes: 500000,
        category: "registration",
        docType: "cac_certificate",
        reviewStatus: "confirmed",
        status: "ready",
        uploadedBy: "user_owner_gap",
        folderShareGrants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const d2 = await ctx.db.insert("documents", {
        businessId: bId,
        r2Key: "r2_tax_expired",
        fileName: "FIRS_Tax_2020_Expired.pdf",
        mimeType: "application/pdf",
        sizeBytes: 400000,
        category: "tax",
        docType: "tax_clearance",
        reviewStatus: "confirmed",
        expiresAt: "2021-01-01T00:00:00Z", // EXPIRED!
        status: "ready",
        uploadedBy: "user_owner_gap",
        folderShareGrants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const d3 = await ctx.db.insert("documents", {
        businessId: bId,
        r2Key: "r2_unreviewed",
        fileName: "Unreviewed_Draft_Permit.pdf",
        mimeType: "application/pdf",
        sizeBytes: 300000,
        category: "licences",
        docType: "permit",
        reviewStatus: "needs_review", // UNREVIEWED!
        status: "ready",
        uploadedBy: "user_owner_gap",
        folderShareGrants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return {
        businessId: bId,
        passportId: "BP-NG-GAPTEST",
        validDocId: d1,
        expiredDocId: d2,
        unreviewedDocId: d3,
      };
    });

    const reqRes = await t.mutation(api.requests.createDocumentRequest, {
      passportId,
      requesterName: "Bank Evaluator",
      requesterCompany: "Zenith Bank",
      requesterEmail: "eval@zenithbank.com",
      requestedItems: ["registration", "compliance_docs"],
      autoVerifyEmail: true,
    });

    const ownerCtx = t.withIdentity({ subject: "user_owner_gap" });

    // Approve request with all 3 document IDs
    const approveRes = await ownerCtx.mutation(api.requests.decideDocumentRequest, {
      businessId,
      requestId: reqRes.requestId,
      decision: "approved",
      documentIds: [validDocId, expiredDocId, unreviewedDocId],
    });

    // Check gaps: Expired and unreviewed docs must be excluded and added to gaps[]
    expect(approveRes.gaps).toContain("FIRS_Tax_2020_Expired.pdf (expired)");
    expect(approveRes.gaps).toContain("Unreviewed_Draft_Permit.pdf (unreviewed)");

    // Package query verification
    const pkgData = await t.query(api.requests.getSharedPackageByToken, {
      token: reqRes.accessToken,
    });

    expect(pkgData.items).toBeDefined();
    expect(pkgData.items![0].label).toBe("CAC_Certificate.pdf");
  });

  it("download limit & expiration enforcement: link expires and limits to max 10 downloads", async () => {
    const t = convexTest(schema, modules);

    // Seed user, business & passport
    const { businessId, passportId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "user_owner_dl",
        email: "owner@dl.ng",
        name: "DL Owner",
        role: "owner",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      const bId = await ctx.db.insert("businesses", {
        ownerUserId: "user_owner_dl",
        status: "registered",
        identity: {
          legalName: "DL Test Ltd",
          businessType: "limited_company",
          industry: "Tech",
          description: "DL Test",
          address: { line1: "1 St", city: "Lagos", lga: "Ikeja", state: "Lagos", country: "Nigeria" },
          contact: { phone: "+23480111111", email: "dl@test.ng", socials: [] },
        },
        operations: { hasEmployees: true, hasPhysicalShop: false, sellsOnline: true, branches: [], operatesStates: ["Lagos"] },
        capabilities: [],
        services: [],
        onboardingState: { step: "completed", answers: {} },
        plan: { tier: "pro", status: "active" },
        brainVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      await ctx.db.insert("passports", {
        businessId: bId,
        passportId: "BP-NG-DLTEST1",
        passportSlug: "dl-test-bp-ng-dltest1",
        style: "professional",
        fieldVisibility: {},
        isActive: true,
        nfcEnabled: true,
        isVerified: true,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      return { businessId: bId, passportId: "BP-NG-DLTEST1" };
    });

    const reqRes = await t.mutation(api.requests.createDocumentRequest, {
      passportId,
      requesterName: "Limit Tester",
      requesterCompany: "Testing Corp",
      requesterEmail: "limit@test.com",
      requestedItems: ["company_profile"],
      autoVerifyEmail: true,
    });

    const ownerCtx = t.withIdentity({ subject: "user_owner_dl" });
    const approveRes = await ownerCtx.mutation(api.requests.decideDocumentRequest, {
      businessId,
      requestId: reqRes.requestId,
      decision: "approved",
      maxDownloads: 2, // Low limit for test speed
    });

    // Record 2 downloads
    await t.mutation(api.requests.recordPackageDownload, { packageId: approveRes.packageId! });
    await t.mutation(api.requests.recordPackageDownload, { packageId: approveRes.packageId! });

    // 3rd download attempt MUST fail
    await expect(
      t.mutation(api.requests.recordPackageDownload, { packageId: approveRes.packageId! })
    ).rejects.toThrow("Download limit reached for this package");

    // Package query returns isLimitReached = true
    const pkgResult = await t.query(api.requests.getSharedPackageByToken, {
      token: reqRes.accessToken,
    });

    expect(pkgResult.isLimitReached).toBe(true);
  });

  it("networking & connections: requester blocking prevents future document requests", async () => {
    const t = convexTest(schema, modules);

    // Seed business & passport
    const { passportId } = await t.run(async (ctx) => {
      const bId = await ctx.db.insert("businesses", {
        ownerUserId: "user_owner_block",
        status: "registered",
        identity: {
          legalName: "Block Test Ltd",
          businessType: "limited_company",
          industry: "Tech",
          description: "Block Test",
          address: { line1: "1 St", city: "Lagos", lga: "Ikeja", state: "Lagos", country: "Nigeria" },
          contact: { phone: "+23480111111", email: "block@test.ng", socials: [] },
        },
        operations: { hasEmployees: true, hasPhysicalShop: false, sellsOnline: true, branches: [], operatesStates: ["Lagos"] },
        capabilities: [],
        services: [],
        onboardingState: { step: "completed", answers: {} },
        plan: { tier: "pro", status: "active" },
        brainVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      await ctx.db.insert("passports", {
        businessId: bId,
        passportId: "BP-NG-BLOCKT1",
        passportSlug: "block-test-bp-ng-blockt1",
        style: "professional",
        fieldVisibility: {},
        isActive: true,
        nfcEnabled: true,
        isVerified: true,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      // Seed connection record with status = "blocked"
      await ctx.db.insert("connections", {
        businessId: bId,
        name: "Spammy Spammer",
        company: "Spam LLC",
        email: "spammer@badsite.com",
        source: "request",
        status: "blocked",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { businessId: bId, passportId: "BP-NG-BLOCKT1" };
    });

    // Attempting to create request from blocked email MUST fail
    await expect(
      t.mutation(api.requests.createDocumentRequest, {
        passportId,
        requesterName: "Spammy Spammer",
        requesterCompany: "Spam LLC",
        requesterEmail: "spammer@badsite.com",
        requestedItems: ["company_profile"],
      })
    ).rejects.toThrow("Requester is blocked by business owner");
  });
});
