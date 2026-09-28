export type Tier = "free" | "plus" | "pro" | "pro_plus";

export type FeatureFlag =
  | "idea_assistant"
  | "basic_profile"
  | "basic_passport"
  | "basic_vault"
  | "basic_checklist"
  | "full_passport"
  | "all_passport_styles"
  | "qr_verification_badge"
  | "card_generator"
  | "printable_cards"
  | "printable_docs"
  | "compliance_calendar"
  | "document_intelligence"
  | "business_ai"
  | "company_profile_generator"
  | "reminders"
  | "document_studio"
  | "industry_templates"
  | "tender_analysis"
  | "tender_engine"
  | "bid_readiness"
  | "consistency_checker"
  | "nfc"
  | "nfc_sharing"
  | "advisor_grants"
  | "done_for_me";

export type CounterKey =
  | "aiGenerations"
  | "tenderAnalyses"
  | "ocrPages"
  | "assistantMessages";

export type PayPerUseSKU =
  | "profile_generation"
  | "tender_package"
  | "print_order"
  | "document_pack";

export interface SKUDetails {
  sku: PayPerUseSKU;
  name: string;
  priceKobo: number;
  priceFormatted: string;
  featureMap: FeatureFlag;
}

export const PAY_PER_USE_SKUS: Record<PayPerUseSKU, SKUDetails> = {
  profile_generation: {
    sku: "profile_generation",
    name: "Single Company Profile Generation",
    priceKobo: 300000, // ₦3,000
    priceFormatted: "₦3,000",
    featureMap: "company_profile_generator",
  },
  tender_package: {
    sku: "tender_package",
    name: "Single Tender Analysis & Response Pack",
    priceKobo: 1000000, // ₦10,000
    priceFormatted: "₦10,000",
    featureMap: "tender_analysis",
  },
  print_order: {
    sku: "print_order",
    name: "Printable Business Card Pack",
    priceKobo: 500000, // ₦5,000
    priceFormatted: "₦5,000",
    featureMap: "printable_cards",
  },
  document_pack: {
    sku: "document_pack",
    name: "Document Studio Template Pack",
    priceKobo: 400000, // ₦4,000
    priceFormatted: "₦4,000",
    featureMap: "document_studio",
  },
};

export const PLAN_PRICING = {
  free: { monthlyKobo: 0, annualKobo: 0, formattedMonthly: "₦0", formattedAnnual: "₦0" },
  plus: { monthlyKobo: 750000, annualKobo: 7500000, formattedMonthly: "₦7,500", formattedAnnual: "₦75,000" },
  pro: { monthlyKobo: 2000000, annualKobo: 20000000, formattedMonthly: "₦20,000", formattedAnnual: "₦200,000" },
  pro_plus: { monthlyKobo: 5000000, annualKobo: 50000000, formattedMonthly: "₦50,000", formattedAnnual: "₦500,000" },
};

export const TIER_QUOTAS: Record<Tier, Record<CounterKey, number>> = {
  free: {
    aiGenerations: 10,
    tenderAnalyses: 0,
    ocrPages: 5,
    assistantMessages: 20,
  },
  plus: {
    aiGenerations: 100,
    tenderAnalyses: 2,
    ocrPages: 50,
    assistantMessages: 200,
  },
  pro: {
    aiGenerations: 1000,
    tenderAnalyses: 20,
    ocrPages: 500,
    assistantMessages: 2000,
  },
  pro_plus: {
    aiGenerations: 5000,
    tenderAnalyses: 100,
    ocrPages: 2000,
    assistantMessages: 10000,
  },
};

/**
 * Single source of truth helper for subscription plan feature entitlements.
 */
export function can(tier: Tier = "free", feature: FeatureFlag): boolean {
  // Free tier features
  if (
    feature === "idea_assistant" ||
    feature === "basic_profile" ||
    feature === "basic_passport" ||
    feature === "basic_vault" ||
    feature === "basic_checklist"
  ) {
    return true;
  }

  // Plus tier features
  if (
    feature === "full_passport" ||
    feature === "all_passport_styles" ||
    feature === "qr_verification_badge" ||
    feature === "card_generator" ||
    feature === "printable_cards" ||
    feature === "printable_docs" ||
    feature === "compliance_calendar" ||
    feature === "document_intelligence" ||
    feature === "business_ai" ||
    feature === "company_profile_generator" ||
    feature === "reminders"
  ) {
    return tier === "plus" || tier === "pro" || tier === "pro_plus";
  }

  // Pro tier features
  if (
    feature === "document_studio" ||
    feature === "industry_templates" ||
    feature === "tender_analysis" ||
    feature === "tender_engine" ||
    feature === "bid_readiness" ||
    feature === "consistency_checker" ||
    feature === "nfc" ||
    feature === "nfc_sharing" ||
    feature === "advisor_grants"
  ) {
    return tier === "pro" || tier === "pro_plus";
  }

  // Pro+ tier features
  if (feature === "done_for_me") {
    return tier === "pro_plus";
  }

  return false;
}

/**
 * Helper to calculate remaining counter quota.
 */
export function remaining(tier: Tier = "free", counter: CounterKey, currentCount: number = 0): number {
  const maxQuota = TIER_QUOTAS[tier]?.[counter] ?? 0;
  return Math.max(0, maxQuota - currentCount);
}
