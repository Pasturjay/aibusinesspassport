/**
 * Centralized Registry of Official Nigerian Government Portals & Links.
 * 
 * Non-Negotiable Principle #1 & #6:
 * AI Business Passport sits ABOVE official government portals as guidance and identity layer.
 * We deep-link founders to official portals; we do NOT scrape, bypass, or automate official portals.
 */

export interface OfficialPortalLink {
  agency: string;
  name: string;
  description: string;
  url: string;
}

export const OFFICIAL_PORTAL_LINKS: Record<string, OfficialPortalLink> = {
  cac_registration: {
    agency: "CAC",
    name: "Corporate Affairs Commission Portal",
    description: "Official portal for business name reservation, company registration, and making changes to your registered business.",
    url: "https://post.cac.gov.ng",
  },
  cac_crs: {
    agency: "CAC",
    name: "CAC Company Registration System (CRS)",
    description: "Search registered company names and verify RC/BN numbers.",
    url: "https://crs.cac.gov.ng",
  },
  firs_taxpro_max: {
    agency: "FIRS",
    name: "FIRS TaxPro Max Portal",
    description: "Official Federal Inland Revenue Service portal for TIN verification, VAT, and CIT tax filing.",
    url: "https://taxpromax.firs.gov.ng",
  },
  scuml_registration: {
    agency: "SCUML / EFCC",
    name: "Special Control Unit Against Money Laundering",
    description: "Official registration for Designated Non-Financial Businesses and Professions (DNFBPs).",
    url: "https://scuml.gva.ng",
  },
  lirs_tax_portal: {
    agency: "LIRS",
    name: "Lagos State Internal Revenue Service (eTax)",
    description: "Official portal for Lagos State Personal Income Tax (PAYE) and Direct Assessment.",
    url: "https://etax.lirs.net",
  },
  itf_portal: {
    agency: "ITF",
    name: "Industrial Training Fund Portal",
    description: "Official portal for employer training compliance and statutory contributions.",
    url: "https://itf.gov.ng",
  },
  nsitf_portal: {
    agency: "NSITF",
    name: "Nigeria Social Insurance Trust Fund (ECA)",
    description: "Official Employees' Compensation Act registration and portal.",
    url: "https://nsitf.gov.ng",
  },
  pencom_portal: {
    agency: "PenCom",
    name: "National Pension Commission Portal",
    description: "Official pension compliance certificate and employer registration portal.",
    url: "https://pencom.gov.ng",
  },
};
