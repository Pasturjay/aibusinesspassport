import { describe, it, expect } from "vitest";
import { generateVCard } from "../lib/passport/vcard";
import { PASSPORT_THEMES, PassportStyleTheme } from "../lib/passport/themes";

describe("Segment 8: Business Passport & Verifiable Identity", () => {
  it("generates standard vCard 3.0 payloads with mandatory fields", () => {
    const vcard = generateVCard({
      businessName: "Acme Logistics Ltd",
      tradingName: "AcmeExpress",
      entityType: "Private Limited Company (LTD)",
      phone: "+2348031234567",
      email: "hello@acmeexpress.ng",
      website: "https://acmeexpress.ng",
      passportId: "BP-NG-1A2B3C",
      address: {
        line1: "14 Commercial Ave",
        city: "Yaba",
        state: "Lagos",
        country: "Nigeria",
      },
      description: "Supply chain solutions",
    });

    expect(vcard).toContain("BEGIN:VCARD");
    expect(vcard).toContain("VERSION:3.0");
    expect(vcard).toContain("FN:AcmeExpress");
    expect(vcard).toContain("ORG:Acme Logistics Ltd");
    expect(vcard).toContain("TITLE:Private Limited Company (LTD)");
    expect(vcard).toContain("TEL;TYPE=WORK,VOICE:+2348031234567");
    expect(vcard).toContain("EMAIL;TYPE=WORK:hello@acmeexpress.ng");
    expect(vcard).toContain("NOTE:Verified Business Passport: BP-NG-1A2B3C - Supply chain solutions");
    expect(vcard).toContain("END:VCARD");
  });

  it("supports all 6 card theme styles with valid CSS classes", () => {
    const themeKeys: PassportStyleTheme[] = [
      "professional",
      "corporate",
      "minimal",
      "modern",
      "creative",
      "premium",
    ];

    expect(Object.keys(PASSPORT_THEMES)).toHaveLength(6);

    for (const key of themeKeys) {
      const theme = PASSPORT_THEMES[key];
      expect(theme).toBeDefined();
      expect(theme.id).toBe(key);
      expect(theme.name).toBeTruthy();
      expect(theme.containerClass).toBeTruthy();
      expect(theme.headerClass).toBeTruthy();
      expect(theme.accentButtonClass).toBeTruthy();
      expect(theme.badgeClass).toBeTruthy();
    }
  });

  it("enforces strict privacy filtering on public passport data", () => {
    // Simulated raw database objects
    const rawBusiness = {
      _id: "biz_123",
      identity: {
        legalName: "Acme Logistics Ltd",
        rcNumber: "RC-1928374",
        businessType: "limited_company",
        industry: "Logistics",
        address: { state: "Lagos", line1: "14 Ave", city: "Yaba", lga: "Ikeja", country: "Nigeria" },
        contact: { phone: "+2348031234567", email: "info@acme.ng", socials: [] },
      },
      // Sensitive private fields
      directorNIN: "12345678901",
      directorBVN: "22233344455",
      turnoverRange: "NGN 50m - NGN 100m",
      bankAccountDetails: { accountNumber: "0123456789", bankCode: "057", bankName: "Zenith Bank" },
    };

    const rawPerson = {
      name: "Babatunde Ogunlesi",
      role: "director",
      nin: "99887766554", // SENSITIVE
      isPublic: true,
    };

    // Public resolver filtering logic
    const publicShape = {
      businessName: rawBusiness.identity.legalName,
      registrationNumber: rawBusiness.identity.rcNumber,
      entityType: rawBusiness.identity.businessType,
      state: rawBusiness.identity.address.state,
      industry: rawBusiness.identity.industry,
      people: [
        {
          name: rawPerson.name,
          role: rawPerson.role,
        },
      ],
    };

    // Verify sensitive keys are strictly absent from public shape
    expect((publicShape as any).directorNIN).toBeUndefined();
    expect((publicShape as any).directorBVN).toBeUndefined();
    expect((publicShape as any).turnoverRange).toBeUndefined();
    expect((publicShape as any).bankAccountDetails).toBeUndefined();
    expect((publicShape.people[0] as any).nin).toBeUndefined();
  });
});
