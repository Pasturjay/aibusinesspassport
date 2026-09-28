import { describe, it, expect } from "vitest";
import { calculatePrintPrice, PRINT_CATALOGUE } from "../lib/marketplace/printing";
import {
  filterServiceProviders,
  verifyAdvisorAccess,
  isValidReferralStatusTransition,
  DEFAULT_LEAD_FEE_KOBO,
  ServiceProvider,
  AdvisorGrant,
} from "../lib/marketplace/referrals";
import {
  isValidDoneForMeTransition,
  formatQuoteNaira,
  DONE_FOR_ME_CATALOG,
} from "../lib/marketplace/doneForMe";
import {
  calculateRevenueReport,
  exportRevenueReportCSV,
  SubscriptionRecord,
  PrintOrderRecord,
  ReferralRecord,
  DoneForMeJobRecord,
} from "../lib/marketplace/revenueReporting";

describe("SEGMENT 16: Transactional and Services Revenue Test Suite", () => {
  // ==========================================================================
  // 1. PRINT MARKETPLACE
  // ==========================================================================
  describe("Print Marketplace Pricing & Platform Margin Engine", () => {
    it("should calculate exact integer Kobo price and platform margin with no float bugs", () => {
      // 100 Business cards at ₦50.00 (5,000 Kobo) unit cost from partner
      // Partner cost = 500,000 Kobo (₦5,000.00)
      // 15% margin = 75,000 Kobo (₦750.00)
      // Total amount = 575,000 Kobo (₦5,750.00)
      const calc = calculatePrintPrice("business_card", 100, 5000, 15);

      expect(calc.partnerCostKobo).toBe(500000);
      expect(calc.marginKobo).toBe(75000);
      expect(calc.totalAmountKobo).toBe(575000);
      expect(calc.platformMarginPct).toBe(15);
      expect(Number.isInteger(calc.partnerCostKobo)).toBe(true);
      expect(Number.isInteger(calc.marginKobo)).toBe(true);
      expect(Number.isInteger(calc.totalAmountKobo)).toBe(true);
    });

    it("should fall back to default catalogue unit price when partner price omitted", () => {
      const defaultItem = PRINT_CATALOGUE["letterhead"];
      const calc = calculatePrintPrice("letterhead", 200, undefined, 20);

      const expectedPartnerCost = defaultItem.defaultUnitPriceKobo * 200;
      const expectedMargin = Math.round(expectedPartnerCost * 0.2);

      expect(calc.partnerCostKobo).toBe(expectedPartnerCost);
      expect(calc.marginKobo).toBe(expectedMargin);
      expect(calc.totalAmountKobo).toBe(expectedPartnerCost + expectedMargin);
    });
  });

  // ==========================================================================
  // 2. PROFESSIONAL REFERRALS & PRIVACY GUARANTEE
  // ==========================================================================
  describe("Professional Referrals & Advisor Privacy Engine", () => {
    const mockProviders: ServiceProvider[] = [
      {
        _id: "prov-1",
        type: "accountant",
        name: "Ade & Co Chartered Accountants",
        states: ["Lagos", "Ogun"],
        verified: true,
        feeModel: "per_lead",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      {
        _id: "prov-2",
        type: "lawyer",
        name: "Lex Legal Practice",
        states: ["Abuja", "Lagos"],
        verified: true,
        feeModel: "per_lead",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      {
        _id: "prov-3",
        type: "agent",
        name: "Fast CAC Registration Service",
        states: ["Kano"],
        verified: false,
        feeModel: "per_lead",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ];

    it("should filter service providers by type and state", () => {
      const lagosAccountants = filterServiceProviders(mockProviders, {
        type: "accountant",
        state: "Lagos",
      });

      expect(lagosAccountants.length).toBe(1);
      expect(lagosAccountants[0]._id).toBe("prov-1");

      const verifiedOnly = filterServiceProviders(mockProviders, {
        verifiedOnly: true,
      });
      expect(verifiedOnly.length).toBe(2);
    });

    it("should enforce privacy guarantee via advisorGrants checks", () => {
      const validGrant: AdvisorGrant = {
        businessId: "biz-1",
        advisorUserId: "user-adv-1",
        categories: ["tax", "finance"],
        grantedBy: "owner-1",
      };

      // Category granted -> Allowed
      const taxCheck = verifyAdvisorAccess(validGrant, "tax");
      expect(taxCheck.allowed).toBe(true);

      // Category not granted -> Denied
      const registrationCheck = verifyAdvisorAccess(validGrant, "registration");
      expect(registrationCheck.allowed).toBe(false);

      // Revoked grant -> Denied
      const revokedGrant: AdvisorGrant = {
        ...validGrant,
        revokedAt: "2026-05-01T10:00:00Z",
      };
      const revokedCheck = verifyAdvisorAccess(revokedGrant, "tax");
      expect(revokedCheck.allowed).toBe(false);
      expect(revokedCheck.reason).toContain("revoked");

      // Expired grant -> Denied
      const expiredGrant: AdvisorGrant = {
        ...validGrant,
        expiresAt: "2026-01-01T00:00:00Z",
      };
      const expiredCheck = verifyAdvisorAccess(expiredGrant, "tax", new Date("2026-06-01"));
      expect(expiredCheck.allowed).toBe(false);
      expect(expiredCheck.reason).toContain("expired");
    });

    it("should validate referral status transitions correctly", () => {
      expect(isValidReferralStatusTransition("new", "contacted")).toBe(true);
      expect(isValidReferralStatusTransition("contacted", "converted")).toBe(true);
      expect(isValidReferralStatusTransition("converted", "closed")).toBe(true);
      expect(isValidReferralStatusTransition("closed", "new")).toBe(false);
      expect(DEFAULT_LEAD_FEE_KOBO).toBe(250000);
    });
  });

  // ==========================================================================
  // 3. DONE-FOR-ME (PRO+) WORKFLOW
  // ==========================================================================
  describe("Done-for-Me Services Engine", () => {
    it("should validate Done-for-Me status workflow transitions", () => {
      expect(isValidDoneForMeTransition("requested", "quoted")).toBe(true);
      expect(isValidDoneForMeTransition("quoted", "accepted")).toBe(true);
      expect(isValidDoneForMeTransition("accepted", "paid")).toBe(true);
      expect(isValidDoneForMeTransition("paid", "in_progress")).toBe(true);
      expect(isValidDoneForMeTransition("in_progress", "completed")).toBe(true);
      expect(isValidDoneForMeTransition("completed", "in_progress")).toBe(false);
    });

    it("should format quote amounts in Naira correctly", () => {
      const quoteKobo = DONE_FOR_ME_CATALOG.cac_business_name.suggestedBaselineKobo;
      const formatted = formatQuoteNaira(quoteKobo);
      expect(formatted).toContain("25,000");
    });
  });

  // ==========================================================================
  // 4. REVENUE REPORTING & CSV EXPORT
  // ==========================================================================
  describe("Revenue Reporting & CSV Exporter", () => {
    const mockSubscriptions: SubscriptionRecord[] = [
      { _id: "sub-1", tier: "plus", amountKobo: 500000, status: "active", createdAt: "2026-01" },
      { _id: "sub-2", tier: "pro", amountKobo: 1500000, status: "active", createdAt: "2026-01" },
    ];

    const mockPrintOrders: PrintOrderRecord[] = [
      {
        _id: "print-1",
        amountKobo: 575000,
        marginKobo: 75000,
        platformMarginPct: 15,
        status: "delivered",
        createdAt: "2026-01",
      },
    ];

    const mockReferrals: ReferralRecord[] = [
      { _id: "ref-1", leadFeeKobo: 250000, status: "converted", createdAt: "2026-01" },
    ];

    const mockDoneForMe: DoneForMeJobRecord[] = [
      {
        _id: "dfm-1",
        service: "cac_business_name",
        quoteKobo: 2500000,
        paidAt: "2026-01-15",
        status: "completed",
        createdAt: "2026-01",
      },
    ];

    it("should aggregate revenue across all 4 monetization streams accurately", () => {
      const report = calculateRevenueReport(
        mockSubscriptions,
        mockPrintOrders,
        mockReferrals,
        mockDoneForMe
      );

      // Subscriptions = 2,000,000 Kobo (₦20,000)
      // Print Gross = 575,000 Kobo, Net Margin = 75,000 Kobo
      // Referrals Net = 250,000 Kobo
      // Done-for-Me Net = 2,500,000 Kobo
      // Total Gross = 2,000,000 + 575,000 + 250,000 + 2,500,000 = 5,325,000 Kobo
      // Total Net = 2,000,000 + 75,000 + 250,000 + 2,500,000 = 4,825,000 Kobo

      expect(report.totalGrossRevenueKobo).toBe(5325000);
      expect(report.totalNetPlatformRevenueKobo).toBe(4825000);
      expect(report.streams.subscriptions.netPlatformRevenueKobo).toBe(2000000);
      expect(report.streams.printMarketplace.netPlatformRevenueKobo).toBe(75000);
      expect(report.streams.referrals.netPlatformRevenueKobo).toBe(250000);
      expect(report.streams.doneForMe.netPlatformRevenueKobo).toBe(2500000);
    });

    it("should export revenue report to CSV correctly", () => {
      const report = calculateRevenueReport(
        mockSubscriptions,
        mockPrintOrders,
        mockReferrals,
        mockDoneForMe
      );

      const csv = exportRevenueReportCSV(report);

      expect(csv).toContain("AI Business Passport - Revenue Breakdown Report");
      expect(csv).toContain("Stream Name,Gross Revenue (Kobo)");
      expect(csv).toContain("Subscriptions (SaaS)");
      expect(csv).toContain("Print Marketplace");
      expect(csv).toContain("Professional Referrals");
      expect(csv).toContain("Done-for-Me Services");
    });
  });
});
