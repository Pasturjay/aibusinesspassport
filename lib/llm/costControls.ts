/**
 * AI Cost Controls, Spend Caps & Kill-Switch.
 * Prevents runaway LLM generation API charges.
 */

export interface AICostConfig {
  dailyPerBusinessCapNaira: number; // e.g. ₦1,000 per business daily cap
  dailyGlobalCapNaira: number;       // e.g. ₦100,000 global daily cap
  killSwitchActive: boolean;
}

export function isAIGenerationAllowed(
  currentBusinessDailySpendNaira: number,
  currentGlobalDailySpendNaira: number,
  config?: Partial<AICostConfig>
): { allowed: boolean; reason?: string } {
  const killSwitch = process.env.TOGGLE_AI_GENERATIONS === "false" || config?.killSwitchActive;
  if (killSwitch) {
    return {
      allowed: false,
      reason: "AI Generation kill-switch is currently active. Generation features temporarily paused.",
    };
  }

  const businessCap = config?.dailyPerBusinessCapNaira ?? 1000; // ₦1,000
  if (currentBusinessDailySpendNaira >= businessCap) {
    return {
      allowed: false,
      reason: `Daily per-business AI generation spend limit (₦${businessCap.toLocaleString()}) reached.`,
    };
  }

  const globalCap = config?.dailyGlobalCapNaira ?? 100000; // ₦100,000
  if (currentGlobalDailySpendNaira >= globalCap) {
    return {
      allowed: false,
      reason: `Global daily AI generation cap (₦${globalCap.toLocaleString()}) reached. Please try again tomorrow.`,
    };
  }

  return { allowed: true };
}
