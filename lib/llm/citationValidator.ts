/**
 * AI Business Passport - Hallucination Guardrail & Citation Validator
 * 
 * Verifies that all citations produced by the AI exist in the provided statutory context.
 * Any hallucinated ruleKey not in validRuleKeys is stripped/replaced.
 */

export interface Citation {
  ruleKey: string;
  source: string;
  version?: number;
  lastReviewedAt?: string;
  isVerified?: boolean;
}

export interface CitationValidationResult {
  validCitations: Citation[];
  strippedCitations: Citation[];
  hasHallucinations: boolean;
  disclaimerNote?: string;
}

export function validateCitations(
  citations: Citation[],
  validRuleKeys: string[]
): CitationValidationResult {
  const validSet = new Set(validRuleKeys);

  const validCitations: Citation[] = [];
  const strippedCitations: Citation[] = [];

  for (const cit of citations) {
    if (validSet.has(cit.ruleKey)) {
      validCitations.push({
        ...cit,
        isVerified: true,
      });
    } else {
      strippedCitations.push({
        ...cit,
        isVerified: false,
      });
    }
  }

  const hasHallucinations = strippedCitations.length > 0;

  return {
    validCitations,
    strippedCitations,
    hasHallucinations,
    disclaimerNote: hasHallucinations
      ? "I'm not sure — confirm before filing. Unverified regulatory citations were stripped from response."
      : undefined,
  };
}
