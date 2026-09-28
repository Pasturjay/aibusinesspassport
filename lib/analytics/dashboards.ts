/**
 * Analytics & Trust Metrics Dashboard Engine.
 * Tracks activation funnel, conversion, churn, and the two AI-trust numbers:
 * 1. aiGenerationFailureRate (%)
 * 2. confidenceFlagRate (% of items requiring confirmBeforeFiling due to low confidence < 0.85)
 */

export interface AnalyticsEvent {
  eventName: string;
  businessId?: string;
  userId?: string;
  properties?: Record<string, any>;
  timestamp: string;
}

export interface AITrustMetrics {
  totalGenerations: number;
  failedGenerations: number;
  aiGenerationFailureRatePct: number;
  totalComplianceEvaluations: number;
  lowConfidenceFlaggedItems: number;
  confidenceFlagRatePct: number;
}

export interface ActivationFunnelMetrics {
  onboardingStarted: number;
  onboardingCompleted: number;
  activationConversionRatePct: number;
  passportSharesCount: number;
  freeToPaidConversionRatePct: number;
  churnRatePct: number;
}

export function calculateAITrustMetrics(
  generationLogs: { status: "success" | "failed" }[],
  complianceEvaluations: { confidence: number; confirmBeforeFiling: boolean }[]
): AITrustMetrics {
  const totalGenerations = generationLogs.length;
  const failedGenerations = generationLogs.filter((g) => g.status === "failed").length;
  const aiGenerationFailureRatePct =
    totalGenerations > 0 ? Math.round((failedGenerations / totalGenerations) * 1000) / 10 : 0;

  const totalComplianceEvaluations = complianceEvaluations.length;
  const lowConfidenceFlaggedItems = complianceEvaluations.filter(
    (c) => c.confirmBeforeFiling || c.confidence < 0.85
  ).length;
  const confidenceFlagRatePct =
    totalComplianceEvaluations > 0
      ? Math.round((lowConfidenceFlaggedItems / totalComplianceEvaluations) * 1000) / 10
      : 0;

  return {
    totalGenerations,
    failedGenerations,
    aiGenerationFailureRatePct,
    totalComplianceEvaluations,
    lowConfidenceFlaggedItems,
    confidenceFlagRatePct,
  };
}

export function calculateActivationFunnel(
  startedCount: number,
  completedCount: number,
  passportShares: number,
  totalFreeUsers: number,
  convertedPaidUsers: number,
  churnedUsers: number
): ActivationFunnelMetrics {
  const activationRate = startedCount > 0 ? Math.round((completedCount / startedCount) * 1000) / 10 : 0;
  const freeToPaidRate = totalFreeUsers > 0 ? Math.round((convertedPaidUsers / totalFreeUsers) * 1000) / 10 : 0;
  const churnRate = convertedPaidUsers > 0 ? Math.round((churnedUsers / convertedPaidUsers) * 1000) / 10 : 0;

  return {
    onboardingStarted: startedCount,
    onboardingCompleted: completedCount,
    activationConversionRatePct: activationRate,
    passportSharesCount: passportShares,
    freeToPaidConversionRatePct: freeToPaidRate,
    churnRatePct: churnRate,
  };
}
