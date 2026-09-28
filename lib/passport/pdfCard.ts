/**
 * Printable Business Card PDF Specification Generator.
 * Output Dimensions: 90x55mm at 300DPI (1063x650px) with 3mm bleed marks.
 */

export interface BusinessCardSpecs {
  widthMm: number;
  heightMm: number;
  dpi: number;
  bleedMm: number;
  front: {
    legalName: string;
    tradingName?: string;
    tagline?: string;
    passportId: string;
    qrSvg: string;
  };
  back: {
    contactPhone?: string;
    contactEmail?: string;
    website?: string;
    addressState?: string;
    services: string[];
  };
}

export function buildBusinessCardSpecs(passportData: any, qrSvg: string): BusinessCardSpecs {
  return {
    widthMm: 90,
    heightMm: 55,
    dpi: 300,
    bleedMm: 3,
    front: {
      legalName: passportData.legalName || "Verified Nigerian Enterprise",
      tradingName: passportData.tradingName,
      tagline: passportData.tagline || "Verified Business Passport",
      passportId: passportData.passportId || "BP-NG-000000",
      qrSvg,
    },
    back: {
      contactPhone: passportData.phone || "+234 800 000 0000",
      contactEmail: passportData.email || "info@business.ng",
      website: `https://passport.ng/p/${passportData.passportId}`,
      addressState: passportData.state || "Nigeria",
      services: passportData.services ? passportData.services.slice(0, 3).map((s: any) => s.name || s) : [],
    },
  };
}
