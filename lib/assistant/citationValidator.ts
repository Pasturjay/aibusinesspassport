export interface Citation {
  ruleKey: string;
  version: number;
  source: string;
  lastReviewedAt: string;
}

export interface GroundedValidationResult {
  isValid: boolean;
  sanitizedResponse: string;
  citations: Citation[];
  fallbackToReferral: boolean;
  referralReason?: string;
}

export function validateAssistantResponse(
  rawResponse: string,
  toolResults: Array<{ name: string; result: any }> = []
): GroundedValidationResult {
  const citations: Citation[] = [];

  // Extract citations returned from rules engine or compliance tool calls
  for (const tool of toolResults) {
    if (tool.name === "get_compliance_items" || tool.name === "evaluate_compliance_for_change") {
      const items = Array.isArray(tool.result) ? tool.result : tool.result?.items || [];
      for (const item of items) {
        if (item.ruleKey && item.source) {
          citations.push({
            ruleKey: item.ruleKey,
            version: item.version || 1,
            source: item.source,
            lastReviewedAt: item.lastReviewedAt || "2026-01-01",
          });
        }
      }
    }
  }

  // Check if response mentions statutory obligations (e.g. CAC, FIRS, LIRS, PENCOM, Tax, Audit, Filing)
  const statutoryKeywords = ["cac", "firs", "lirs", "tax", "pencom", "itf", "annual returns", "cit", "vat", "paye"];
  const mentionsStatutory = statutoryKeywords.some((kw) => rawResponse.toLowerCase().includes(kw));

  // If statutory question asked but NO matching rules or tool results were returned
  if (mentionsStatutory && citations.length === 0 && (!toolResults || toolResults.length === 0)) {
    const referralText = "I don't have a reviewed answer for that yet — here's who can help:\n\nWe recommend speaking with a verified legal or accounting professional on the AI Business Passport marketplace who can guide you on this specific requirement.";
    return {
      isValid: true,
      sanitizedResponse: referralText,
      citations: [],
      fallbackToReferral: true,
      referralReason: "No reviewed deterministic rule matches this compliance question.",
    };
  }

  return {
    isValid: true,
    sanitizedResponse: rawResponse,
    citations,
    fallbackToReferral: false,
  };
}
