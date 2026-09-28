import { describe, it, expect } from "vitest";
import { DOCUMENT_TEMPLATES, INDUSTRY_TEMPLATE_PACKS } from "@/lib/documentStudio/templates";
import { evaluateDeterministicQC, runDocumentQC } from "@/lib/documentStudio/qc";
import { checkGrounding } from "@/lib/documentStudio/groundingChecker";
import { generateDocument } from "@/lib/documentStudio/generator";
import { exportToPDFBuffer } from "@/lib/documentStudio/pdfExport";
import { exportToDOCXBuffer } from "@/lib/documentStudio/docxExport";
import { DISCLAIMER_LEGAL } from "@/lib/copy";

describe("SEGMENT 13: Document Studio Acceptance Tests", () => {
  const completeBrainSnapshot = {
    identity: {
      legalName: "Apex Zenith Logistics Ltd",
      tradingName: "Apex Logistics",
      businessType: "limited_company",
      rcNumber: "RC-1849201",
      tin: "29481029-0001",
      industry: "logistics",
      description: "Premier freight, interstate haulage, and warehousing service provider.",
      yearFounded: 2021,
      address: {
        line1: "15 Commercial Avenue, Ikeja",
        city: "Ikeja",
        lga: "Ikeja",
        state: "Lagos",
        country: "Nigeria",
      },
      contact: {
        phone: "+2348030001122",
        email: "info@apexzenith.ng",
        website: "https://apexzenith.ng",
        socials: [],
      },
    },
    operations: {
      hasEmployees: true,
      employeeCount: 25,
      hasPhysicalShop: true,
      sellsOnline: true,
      branches: [],
      operatesStates: ["Lagos", "Rivers", "FCT Abuja"],
    },
    capabilities: [
      { name: "Interstate Fleet Haulage", description: "GPS-tracked heavy-duty trucks operating across 36 states." },
      { name: "Cold-Chain Logistics", description: "Temperature-controlled transit for perishable goods." },
    ],
    services: [
      { name: "Freight Haulage", description: "Bulk cargo transit", priceRange: "₦500,000 - ₦2,500,000" },
      { name: "Warehousing", description: "Short and long term storage", priceRange: "₦100,000/month" },
    ],
    people: [
      { name: "Chidi Okonkwo", role: "director", email: "chidi@apexzenith.ng", isPublic: true },
    ],
    credentials: [
      { name: "Haulage Operating Licence", type: "licence", issuer: "Lagos State Ministry of Transport", expiresAt: "2027-12-31", verificationStatus: "document_backed", isPublic: true },
    ],
    experience: [
      { clientName: "Dangote Sugar Plc", projectTitle: "Regional Sugar Distribution", year: 2023, description: "Haulage of 5,000 MT refined sugar", isPublic: true },
    ],
    brainVersion: 1,
  };

  describe("1. Template Definitions & Industry Packs", () => {
    it("contains all 14 starting v0 templates", () => {
      const templateKeys = Object.keys(DOCUMENT_TEMPLATES);
      expect(templateKeys).toContain("profile_standard");
      expect(templateKeys).toContain("profile_corporate");
      expect(templateKeys).toContain("profile_procurement");
      expect(templateKeys).toContain("profile_tender");
      expect(templateKeys).toContain("profile_investor");
      expect(templateKeys).toContain("profile_one_page");
      expect(templateKeys).toContain("quotation");
      expect(templateKeys).toContain("invoice");
      expect(templateKeys).toContain("contract");
      expect(templateKeys).toContain("proposal");
      expect(templateKeys).toContain("capability_statement");
      expect(templateKeys).toContain("eoi");
      expect(templateKeys).toContain("letterhead");
      expect(templateKeys).toContain("business_card");
    });

    it("includes industry packs for construction, ICT, logistics, retail, hospitality, agriculture", () => {
      expect(INDUSTRY_TEMPLATE_PACKS).toHaveProperty("construction");
      expect(INDUSTRY_TEMPLATE_PACKS).toHaveProperty("ict");
      expect(INDUSTRY_TEMPLATE_PACKS).toHaveProperty("logistics");
      expect(INDUSTRY_TEMPLATE_PACKS).toHaveProperty("retail");
      expect(INDUSTRY_TEMPLATE_PACKS).toHaveProperty("hospitality");
      expect(INDUSTRY_TEMPLATE_PACKS).toHaveProperty("agriculture");
    });
  });

  describe("2. Pre-Generation QC Pass (Deterministic & LLM)", () => {
    it("blocks document generation when required Brain fields are missing", async () => {
      const incompleteBrain = {
        identity: {
          legalName: "Incomplete Ltd",
          description: "Missing RC and TIN",
        },
      };

      const detResult = evaluateDeterministicQC(incompleteBrain, "profile_procurement");

      expect(detResult.errors.length).toBeGreaterThan(0);
      expect(detResult.missingFields).toContain("identity.rcNumber");
      expect(detResult.missingFields).toContain("identity.tin");
      expect(detResult.errors[0].fixLink).toContain("/brain?focus=");

      const fullQC = await runDocumentQC(incompleteBrain, "profile_procurement");
      expect(fullQC.passed).toBe(false);
    });

    it("passes QC for a business with complete Brain fields", async () => {
      const detResult = evaluateDeterministicQC(completeBrainSnapshot, "profile_standard");
      expect(detResult.errors.length).toBe(0);
    });
  });

  describe("3. Strict Grounding & Hallucination Enforcement", () => {
    it("detects ungrounded proper nouns or hallucinated numbers", () => {
      const hallucinatedText = "Apex Zenith Logistics Ltd was founded in 2021. We partner with UnknownCorp and operate 9999 trucks.";

      const grounding = checkGrounding(hallucinatedText, completeBrainSnapshot);

      expect(grounding.isGrounded).toBe(false);
      expect(grounding.unseenFacts.some((f) => f.includes("9999") || f.includes("UnknownCorp"))).toBe(true);
    });

    it("allows text that is strictly grounded or wrapped in [Add: ...] placeholders", () => {
      const groundedText = "Apex Zenith Logistics Ltd provides Freight Haulage in Lagos, Rivers, and FCT Abuja. Contact: [Add: Emergency Phone].";

      const grounding = checkGrounding(groundedText, completeBrainSnapshot);

      expect(grounding.isGrounded).toBe(true);
      expect(grounding.placeholdersFound.length).toBe(1);
    });
  });

  describe("4. Audience Tone Adaptation & Legal Disclaimers", () => {
    it("attaches legal disclaimer and sets confirmBeforeFiling for contract template", async () => {
      const result = await generateDocument({
        brainSnapshot: completeBrainSnapshot,
        templateKey: "contract",
        audience: { type: "corporate" },
      });

      expect(result.success).toBe(true);
      expect(result.confirmBeforeFiling).toBe(true);
      const lastSection = result.sections?.[result.sections.length - 1];
      expect(lastSection?.content).toContain(DISCLAIMER_LEGAL);
    });
  });

  describe("5. PDF and DOCX Exports", () => {
    it("generates valid non-empty PDF export HTML/buffer containing Passport QR link", async () => {
      const pdfBuffer = await exportToPDFBuffer({
        businessName: "Apex Zenith Logistics Ltd",
        rcNumber: "RC-1849201",
        tin: "29481029-0001",
        passportId: "pass_apex_123",
        documentTitle: "Corporate Profile",
        sections: [
          { key: "summary", title: "Executive Summary", content: "Apex Zenith is a logistics firm." },
        ],
      });

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(100);
      const pdfString = pdfBuffer.toString("utf-8");
      expect(pdfString).toContain("Apex Zenith Logistics Ltd");
      expect(pdfString).toContain("https://app.aibusinesspassport.ng/p/pass_apex_123");
    });

    it("generates valid non-empty DOCX buffer", async () => {
      const docxBuffer = await exportToDOCXBuffer({
        businessName: "Apex Zenith Logistics Ltd",
        documentTitle: "Commercial Quotation",
        sections: [
          { key: "pricing", title: "Pricing Schedule", content: "Freight: ₦500,000" },
        ],
      });

      expect(docxBuffer).toBeDefined();
      expect(docxBuffer.length).toBeGreaterThan(50);
      expect(docxBuffer.toString("utf-8")).toContain("Apex Zenith Logistics Ltd");
    });
  });
});
