/**
 * PostHog Feature Flags Engine.
 * Stages pilot rollouts by Tier (free, plus, pro, pro_plus) and Target City (Lagos, Abuja, Kano, Port Harcourt).
 */

export interface FeatureFlagContext {
  tier: "free" | "plus" | "pro" | "pro_plus";
  city: string;
  userRole?: string;
}

export const PILOT_CITIES = ["lagos", "abuja", "kano", "port_harcourt"];

export function isFeatureEnabledForContext(
  featureKey: string,
  context: FeatureFlagContext
): boolean {
  const cityNormalized = context.city.toLowerCase().trim();
  const isPilotCity = PILOT_CITIES.includes(cityNormalized) || cityNormalized === "all";

  switch (featureKey) {
    case "tender_assistant":
      return (context.tier === "pro" || context.tier === "pro_plus") && isPilotCity;
    case "document_studio":
      return (context.tier === "pro" || context.tier === "pro_plus");
    case "nfc_sharing":
      return context.tier !== "free";
    case "done_for_me":
      return context.tier === "pro_plus";
    case "compliance_calendar":
      return context.tier !== "free";
    default:
      return true;
  }
}
