import { describe, it, expect } from "vitest";
import { extractTenderRequirements } from "@/lib/tenders/extractor";
import { matchRequirementsAgainstBusinessData } from "@/lib/tenders/matcher";
import { calculateTenderReadiness } from "@/lib/tenders/readiness";
import { buildTenderResponsePackage } from "@/lib/tenders/responseBuilder";

describe("SEGMENT 14: Tender Assistant Acceptance Tests", () => {
  const sampleTenderFixtureText = `
FEDERAL MINISTRY OF POWER & RURAL ELECTRIFICATION
INVITATION TO TENDER FOR SOLAR GENERATOR INSTALLATION (TENDER REF: FMP/2026/SOLAR/04)

1. MANDATORY ELIGIBILITY REQUIREMENTS:
- REQ-01: Copy of CAC Certificate of Incorporation with RC Number (Mandatory)
- REQ-02: Valid Tax Clearance Certificate (TCC) for preceding 3 years (2023, 2024, 2025) (Mandatory)
- REQ-03: Evidence of PENCOM Compliance Certificate (Mandatory)

2. TECHNICAL & FINANCIAL CAPACITY:
- REQ-04: Evidence of 3 similar solar installation contracts executed in the last 5 years (Mandatory)
- REQ-05: Audited Accounts for 2023, 2024, 2025 (Scoring item)

3. SUBMISSION INSTRUCTIONS:
- REQ-06: Official Capability Statement and Technical Methodology Response (Mandatory)

UNPARSED SCANNED IMAGE SECTION: Scanned wiring schematic diagram page 14.
  `;

  const completeBrainSnapshot = {
    identity: {
      legalName: "Solaris Power Solutions Ltd",
      rcNumber: "RC-998811",
      tin: "10092837-0001",
      industry: "power",
      description: "Solar engineering, inverter installations, and renewable energy.",
      address: { line1: "8 Commercial Avenue, Ikeja", state: "Lagos" },
    },
    capabilities: [
      { name: "Solar Mini-Grid Installation", description: "Design and deployment of 100kW+ solar systems." },
    ],
    services: [
      { name: "Solar Generator Installation", description: "Commercial solar setup" },
    ],
    experience: [
      { clientName: "Lagos State Health Board", projectTitle: "Hospital Solar System", year: 2023, isPublic: true },
      { clientName: "Ogun Water Corp", projectTitle: "Pumping Station Solar", year: 2024, isPublic: true },
      { clientName: "Abuja Tech Hub", projectTitle: "Rooftop Solar Array", year: 2025, isPublic: true },
    ],
  };

  const vaultDocsMissingTax = [
    { docType: "cac_certificate", fileName: "CAC_Cert.pdf", expiresAt: "2030-12-31" },
    { docType: "pension_certificate", fileName: "PENCOM_2026.pdf", expiresAt: "2026-12-31" },
  ];

  describe("1. Fixture Requirement Extraction", () => {
    it("extracts expected requirement count, categories, and mandatory flags", async () => {
      const extraction = await extractTenderRequirements(sampleTenderFixtureText, "solar_tender.pdf");

      expect(extraction.title).toBeDefined();
      expect(extraction.requirements.length).toBeGreaterThanOrEqual(4);

      const mandatoryReqs = extraction.requirements.filter((r) => r.mandatory);
      expect(mandatoryReqs.length).toBeGreaterThan(0);

      const categories = new Set(extraction.requirements.map((r) => r.category));
      expect(categories.has("company_docs")).toBe(true);
    });

    it("surfaces scanned image sections into unparsedSections[]", async () => {
      const extraction = await extractTenderRequirements(sampleTenderFixtureText, "solar_tender.pdf");
      expect(extraction.unparsedSections).toBeDefined();
    });
  });

  describe("2. Matching & Readiness Calculation", () => {
    it("surfaces missing mandatory tax clearance at top of readiness alert list", () => {
      const extractionReqs = [
        { id: "REQ-01", category: "company_docs" as const, text: "Valid Tax Clearance Certificate (TCC)", mandatory: true, sourcePageRef: "Page 4", confidence: 0.9 },
        { id: "REQ-02", category: "company_docs" as const, text: "Copy of CAC Certificate of Incorporation", mandatory: true, sourcePageRef: "Page 4", confidence: 0.9 },
      ];

      const matched = matchRequirementsAgainstBusinessData(extractionReqs, completeBrainSnapshot, vaultDocsMissingTax);
      const readiness = calculateTenderReadiness(matched, "2026-10-15");

      expect(readiness.mandatoryMissingCount).toBeGreaterThan(0);
      expect(readiness.mandatoryMissingList.some((m) => m.text.includes("Tax Clearance"))).toBe(true);
      expect(readiness.todoPriorityList[0].mandatory).toBe(true);
    });

    it("never auto-marks low confidence (<0.8) requirements as available", () => {
      const lowConfReqs = [
        { id: "REQ-99", category: "company_docs" as const, text: "CAC Certificate", mandatory: true, sourcePageRef: "Page 1", confidence: 0.6 },
      ];

      const matched = matchRequirementsAgainstBusinessData(lowConfReqs, completeBrainSnapshot, vaultDocsMissingTax);
      expect(matched[0].matchStatus).not.toBe("available");
      expect(matched[0].matchStatus).toBe("needs_preparation");
    });
  });

  describe("3. Tender Response Package & Grounding Test", () => {
    it("builds response package matching tender item numbering and passing grounding check", async () => {
      const extractionReqs = [
        { id: "REQ-01", category: "company_docs" as const, text: "CAC Certificate", mandatory: true, sourcePageRef: "Page 4", confidence: 0.9 },
        { id: "REQ-02", category: "technical" as const, text: "3 similar solar projects", mandatory: true, sourcePageRef: "Page 7", confidence: 0.9 },
      ];

      const matched = matchRequirementsAgainstBusinessData(extractionReqs, completeBrainSnapshot, vaultDocsMissingTax);

      const responsePkg = await buildTenderResponsePackage({
        tenderTitle: "Solar Generator Installation",
        issuer: "Federal Ministry of Power",
        deadline: "2026-10-15",
        matchedRequirements: matched,
        brainSnapshot: completeBrainSnapshot,
      });

      expect(responsePkg.success).toBe(true);
      expect(responsePkg.sections.length).toBeGreaterThanOrEqual(4);

      const checklistSection = responsePkg.sections.find((s) => s.title.includes("Checklist"));
      expect(checklistSection?.content).toContain("REQ-01");
      expect(checklistSection?.content).toContain("REQ-02");

      expect(responsePkg.isGrounded).toBe(true);
    });
  });
});
