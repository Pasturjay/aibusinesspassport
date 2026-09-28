/**
 * LLM Token Pricing Table & Cost Calculator for AI Business Passport.
 * Calculates per-call cost estimates in USD and NGN.
 */

export interface ModelPricing {
  inputPerMillionUSD: number;
  outputPerMillionUSD: number;
}

export const USD_TO_NGN_RATE = 1500.0;

export const PRICING_TABLE: Record<string, ModelPricing> = {
  // Claude Models
  "claude-3-5-haiku-latest": { inputPerMillionUSD: 1.0, outputPerMillionUSD: 5.0 },
  "claude-3-5-sonnet-latest": { inputPerMillionUSD: 3.0, outputPerMillionUSD: 15.0 },
  "claude-3-haiku-20240307": { inputPerMillionUSD: 0.25, outputPerMillionUSD: 1.25 },

  // Gemini Models
  "gemini-1.5-flash": { inputPerMillionUSD: 0.075, outputPerMillionUSD: 0.3 },
  "gemini-1.5-pro": { inputPerMillionUSD: 1.25, outputPerMillionUSD: 5.0 },
  "gemini-2.0-flash": { inputPerMillionUSD: 0.1, outputPerMillionUSD: 0.4 },

  // Fallback defaults
  default: { inputPerMillionUSD: 1.0, outputPerMillionUSD: 4.0 },
};

export interface CostEstimate {
  costUSD: number;
  costNGN: number;
  formattedUSD: string;
  formattedNGN: string;
}

export function calculateCost(
  model: string,
  promptTokens: number = 0,
  completionTokens: number = 0
): CostEstimate {
  const pricing = PRICING_TABLE[model] || PRICING_TABLE.default;

  const inputCost = (promptTokens / 1_000_000) * pricing.inputPerMillionUSD;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPerMillionUSD;
  const costUSD = inputCost + outputCost;
  const costNGN = costUSD * USD_TO_NGN_RATE;

  return {
    costUSD,
    costNGN,
    formattedUSD: `$${costUSD.toFixed(6)}`,
    formattedNGN: `₦${costNGN.toFixed(2)}`,
  };
}
