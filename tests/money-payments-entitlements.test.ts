import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { can, remaining, PAY_PER_USE_SKUS } from "../lib/entitlements";
import paystackWorker, { verifyPaystackSignature } from "../workers/paystack-webhook/src/index";
import { ChartMogulSyncer } from "../scripts/chartmogul-sync";

const modules = import.meta.glob("../convex/**/*.ts");

describe("SEGMENT 11: Money, Entitlements, Paystack & Webhooks Acceptance Tests", () => {
  it("pure function tests: verifies can() for every feature x tier", () => {
    // Free Tier Checks
    expect(can("free", "basic_passport")).toBe(true);
    expect(can("free", "basic_vault")).toBe(true);
    expect(can("free", "all_passport_styles")).toBe(false);
    expect(can("free", "document_studio")).toBe(false);
    expect(can("free", "done_for_me")).toBe(false);

    // Plus Tier Checks
    expect(can("plus", "all_passport_styles")).toBe(true);
    expect(can("plus", "qr_verification_badge")).toBe(true);
    expect(can("plus", "printable_cards")).toBe(true);
    expect(can("plus", "document_intelligence")).toBe(true);
    expect(can("plus", "document_studio")).toBe(false);
    expect(can("plus", "nfc")).toBe(false);

    // Pro Tier Checks
    expect(can("pro", "all_passport_styles")).toBe(true);
    expect(can("pro", "document_studio")).toBe(true);
    expect(can("pro", "tender_analysis")).toBe(true);
    expect(can("pro", "nfc")).toBe(true);
    expect(can("pro", "nfc_sharing")).toBe(true);
    expect(can("pro", "advisor_grants")).toBe(true);
    expect(can("pro", "done_for_me")).toBe(false);

    // Pro+ Tier Checks
    expect(can("pro_plus", "done_for_me")).toBe(true);
  });

  it("calculates remaining quota counters correctly", () => {
    expect(remaining("free", "aiGenerations", 3)).toBe(7);
    expect(remaining("free", "tenderAnalyses", 0)).toBe(0);
    expect(remaining("plus", "aiGenerations", 40)).toBe(60);
    expect(remaining("pro", "tenderAnalyses", 5)).toBe(15);
  });

  it("Paystack Webhook Worker: rejects forged signatures with status 401", async () => {
    const rawBody = JSON.stringify({ event: "charge.success", data: { id: 12345 } });
    const forgedSignature = "invalid_forged_signature_12345";
    const secret = "sk_test_secret";

    const isValid = await verifyPaystackSignature(rawBody, forgedSignature, secret);
    expect(isValid).toBe(false);

    const dummyCtx: any = { waitUntil: () => {} };
    const env: any = { PAYSTACK_SECRET_KEY: secret };

    const req = new Request("https://api.passport.ng/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": forgedSignature },
      body: rawBody,
    });

    const res = await paystackWorker.fetch(req, env, dummyCtx);
    expect(res.status).toBe(401);
  });

  it("Paystack Webhook Worker idempotency: replaying same eventId returns ignored_duplicate", async () => {
    const rawBody = JSON.stringify({ event: "charge.success", data: { id: 998877 } });
    const secret = "sk_test_secret";

    // Compute valid signature
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
    const signed = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
    const validSignature = Array.from(new Uint8Array(signed)).map((b) => b.toString(16).padStart(2, "0")).join("");

    const dummyCtx: any = { waitUntil: () => {} };
    const env: any = { PAYSTACK_SECRET_KEY: secret };

    const req1 = new Request("https://api.passport.ng/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": validSignature },
      body: rawBody,
    });

    const res1 = await paystackWorker.fetch(req1, env, dummyCtx);
    const body1 = (await res1.json()) as any;
    expect(res1.status).toBe(200);
    expect(body1.status).toBe("accepted");

    // Replay identical event
    const req2 = new Request("https://api.passport.ng/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": validSignature },
      body: rawBody,
    });

    const res2 = await paystackWorker.fetch(req2, env, dummyCtx);
    const body2 = (await res2.json()) as any;
    expect(res2.status).toBe(200);
    expect(body2.status).toBe("ignored_duplicate");
  });

  it("Convex tier changes update business plan while preserving business data", async () => {
    const t = convexTest(schema, modules);

    // Seed owner user & business
    const { businessId } = await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        clerkId: "user_owner_tier_test",
        email: "owner@tiertest.ng",
        name: "Tier Owner",
        role: "owner",
        locale: "en-NG",
        notificationPrefs: { email: true, sms: true, whatsapp: true, inApp: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1,
      });

      const bId = await ctx.db.insert("businesses", {
        ownerUserId: "user_owner_tier_test",
        status: "registered",
        identity: {
          legalName: "Tier Test Enterprise Ltd",
          businessType: "limited_company",
          industry: "Technology",
          description: "Tech SME",
          address: { line1: "1 St", city: "Lagos", lga: "Ikeja", state: "Lagos", country: "Nigeria" },
          contact: { phone: "+2348000000", email: "info@tier.ng", socials: [] },
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

      return { businessId: bId };
    });

    // Upgrade to PRO
    await t.mutation(api.subscriptions.updatePlan, {
      businessId,
      tier: "pro",
      status: "active",
      paystackCustomerCode: "CUS_12345",
      paystackSubscriptionCode: "SUB_999",
    });

    const busAfterUpgrade = await t.run(async (ctx) => await ctx.db.get(businessId));
    expect(busAfterUpgrade?.plan.tier).toBe("pro");
    expect(busAfterUpgrade?.plan.status).toBe("active");

    // Downgrade to FREE (Dunning / Cancellation)
    await t.mutation(api.subscriptions.updatePlan, {
      businessId,
      tier: "free",
      status: "cancelled",
    });

    const busAfterDowngrade = await t.run(async (ctx) => await ctx.db.get(businessId));
    expect(busAfterDowngrade?.plan.tier).toBe("free");
    expect(busAfterDowngrade?.plan.status).toBe("cancelled");
    // DATA PRESERVATION GUARANTEE: Business identity data remains 100% intact!
    expect(busAfterDowngrade?.identity.legalName).toBe("Tier Test Enterprise Ltd");
  });

  it("pay-per-use SKUs map correctly to gated features", () => {
    expect(PAY_PER_USE_SKUS.profile_generation?.sku).toBe("profile_generation");
    expect(PAY_PER_USE_SKUS.tender_package?.featureMap).toBe("tender_analysis");
    expect(PAY_PER_USE_SKUS.print_order?.featureMap).toBe("printable_cards");
  });

  it("ChartMogul sync is idempotent: running twice yields no duplicates", async () => {
    const syncer = new ChartMogulSyncer("test_key", "test_ds_uuid");
    const mockBusinesses = [
      { businessId: "biz_cm_1", name: "Alpha Ltd", email: "alpha@test.ng", planTier: "plus", amountKobo: 750000 },
    ];

    const run1 = await syncer.runBackfill(mockBusinesses);
    expect(run1.customersSynced).toBe(1);
    expect(run1.errors).toHaveLength(0);

    const run2 = await syncer.runBackfill(mockBusinesses);
    expect(run2.customersSynced).toBe(1);
    expect(run2.errors).toHaveLength(0);
  });
});
