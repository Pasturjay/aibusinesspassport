/**
 * i18n Message Catalogues & Translation Engine for AI Business Passport.
 * Primary locale: en-NG (Nigerian English).
 * Scaffolding provided for Pidgin (pcm-NG), Yoruba (yo-NG), Igbo (ig-NG), Hausa (ha-NG).
 */

export type SupportedLocale = "en-NG" | "pcm-NG" | "yo-NG" | "ig-NG" | "ha-NG";

export interface TranslationDictionary {
  [key: string]: string;
}

export const TRANSLATIONS: Record<SupportedLocale, TranslationDictionary> = {
  "en-NG": {
    "app.title": "AI Business Passport",
    "hero.tagline": "Tell us about your business once...",
    "hero.subheading": "Nigeria's AI-powered business operating system. Deterministic compliance, verifiable identity, document intelligence, and tender readiness in one place.",
    "hero.cta.start": "Start Free Passport",
    "hero.cta.pricing": "View Pricing",
    "pillars.title": "Core Operating Pillars",
    "pillars.compliance.title": "Deterministic Compliance",
    "pillars.compliance.desc": "Never miss a CAC, FIRS, LIRS, or SCUML filing. Explicit rules engine evaluated directly against your Business Brain.",
    "pillars.vault.title": "Intelligent Business Vault",
    "pillars.vault.desc": "Bank-grade encrypted document storage with automated OCR, data extraction, and expiration tracking.",
    "pillars.passport.title": "Verifiable Identity Passport",
    "pillars.passport.desc": "Instant public profile with live-pointer QR, NFC, vCard 3.0, and granular privacy controls.",
    "pillars.tenders.title": "Tender & Bid Readiness",
    "pillars.tenders.desc": "Automatic requirement extraction, document matching, and pre-submission compliance audit.",
    "pricing.title": "Simple, Transparent Pricing",
    "pricing.free": "Free Idea Plan",
    "pricing.plus": "Plus Plan",
    "pricing.pro": "Pro Plan",
    "pricing.pro_plus": "Pro+ Done-For-Me Plan",
    "faq.title": "Frequently Asked Questions",
    "trust.title": "How We Handle Compliance Guidance",
    "trust.disclaimer": "AI Business Passport provides automated regulatory tracking based on official statutory guidelines. This is not formal legal advice.",
    "offline.notice": "You are currently offline. Displaying cached Business Passport & Vault list.",
  },
  "pcm-NG": {
    "app.title": "AI Business Passport",
    "hero.tagline": "Tell us about your business once...",
    "hero.subheading": "Naija AI business passport. Keep your CAC, FIRS, and business documents ready sharp-sharp.",
    "hero.cta.start": "Start Free Passport",
    "hero.cta.pricing": "Check Price",
  },
  "yo-NG": {
    "app.title": "AI Business Passport",
    "hero.tagline": "Sọ fun wa nipa ipilẹ itaja rẹ lẹẹkan...",
  },
  "ig-NG": {
    "app.title": "AI Business Passport",
    "hero.tagline": "Gwa anyị gbasara azụmahịa gị otu ugboro...",
  },
  "ha-NG": {
    "app.title": "AI Business Passport",
    "hero.tagline": "Shaida mana game da kasuwancinku sau ɗaya...",
  },
};

let currentLocale: SupportedLocale = "en-NG";

export function setLocale(locale: SupportedLocale): void {
  if (TRANSLATIONS[locale]) {
    currentLocale = locale;
  }
}

export function getLocale(): SupportedLocale {
  return currentLocale;
}

/**
 * Translate a key with optional parameter interpolation.
 * Example: t("welcome.user", { name: "Amina" })
 */
export function t(key: string, params?: Record<string, string | number>, locale?: SupportedLocale): string {
  const targetLocale = locale || currentLocale;
  const dict = TRANSLATIONS[targetLocale] || TRANSLATIONS["en-NG"];
  let text = dict[key] || TRANSLATIONS["en-NG"][key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      text = text.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, "g"), String(paramValue));
    });
  }

  return text;
}
