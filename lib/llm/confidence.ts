/**
 * AI Business Passport - Centralized Confidence Policy Engine
 * 
 * Non-Negotiable Principle #2:
 * Source-backed AI accuracy with human-in-the-loop safety.
 */

export interface ConfidenceThresholdConfig {
  classificationAutoAccept: number;
  complianceConfirmBeforeFilingThreshold: number;
}

export const CONFIDENCE_CONFIG: ConfidenceThresholdConfig = {
  classificationAutoAccept: 0.85,
  complianceConfirmBeforeFilingThreshold: 0.9,
};

export interface ConfidencePolicyDecision {
  confidence: number;
  kind: string;
  autoAccept: boolean;
  needsReview: boolean;
  confirmBeforeFiling: boolean;
}

/**
 * Evaluates extraction/generation confidence against regulatory threshold policies.
 */
export function applyConfidencePolicy(
  confidence: number,
  kind: string = "document_classification"
): ConfidencePolicyDecision {
  const normalizedConfidence = Math.max(0.0, Math.min(1.0, confidence));

  const autoAccept = normalizedConfidence >= CONFIDENCE_CONFIG.classificationAutoAccept;
  const needsReview = !autoAccept;

  const isComplianceKind =
    kind.includes("compliance") ||
    kind.includes("filing") ||
    kind.includes("cac") ||
    kind.includes("tax") ||
    kind.includes("legal");

  const confirmBeforeFiling = isComplianceKind
    ? normalizedConfidence < CONFIDENCE_CONFIG.complianceConfirmBeforeFilingThreshold
    : normalizedConfidence < CONFIDENCE_CONFIG.classificationAutoAccept;

  return {
    confidence: normalizedConfidence,
    kind,
    autoAccept,
    needsReview,
    confirmBeforeFiling,
  };
}
