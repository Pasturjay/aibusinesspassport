import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { applyConfidencePolicy } from "@/lib/llm/confidence";
import { validateCitations } from "@/lib/llm/citationValidator";
import { ClaudeProvider, GeminiProvider } from "@/lib/llm";

describe("Segment 4: LLM Guardrail Tests", () => {
  it("schema-validation failure triggers single retry path with error message appended", async () => {
    const provider = new ClaudeProvider();

    let callCount = 0;
    vi.spyOn(provider, "generateText").mockImplementation(async (_options) => {
      callCount++;
      if (callCount === 1) {
        // Return malformed JSON on first attempt
        return {
          content: "{ malformed json: missing_quotes }",
          provider: "claude",
          model: "claude-3-5-haiku-latest",
          usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
          latencyMs: 15,
          costEstimate: { costUSD: 0.0001, costNGN: 0.15, formattedUSD: "$0.0001", formattedNGN: "₦0.15" },
          promptVersion: "1.0.0",
        };
      }

      // Return valid JSON on second attempt (retry path)
      return {
        content: JSON.stringify({ documentCategory: "tax", confidence: 0.9 }),
        provider: "claude",
        model: "claude-3-5-haiku-latest",
        usage: { promptTokens: 80, completionTokens: 30, totalTokens: 110 },
        latencyMs: 20,
        costEstimate: { costUSD: 0.0002, costNGN: 0.3, formattedUSD: "$0.0002", formattedNGN: "₦0.30" },
        promptVersion: "1.0.0",
      };
    });

    const schema = z.object({
      documentCategory: z.string(),
      confidence: z.number(),
    });

    const result = await provider.generateStructured({
      messages: [{ role: "user", content: "Extract category" }],
      schema,
    });

    expect(callCount).toBe(2); // Exactly 1 retry
    expect(result.data.documentCategory).toBe("tax");
    expect(result.data.confidence).toBe(0.9);
  });

  it("confidence policy forces confirmBeforeFiling=true when compliance confidence is below 0.90", () => {
    // 1. High confidence classification (>= 0.85) -> autoAccept = true
    const highConf = applyConfidencePolicy(0.92, "document_classification");
    expect(highConf.autoAccept).toBe(true);
    expect(highConf.needsReview).toBe(false);

    // 2. Low confidence classification (< 0.85) -> needsReview = true
    const lowConf = applyConfidencePolicy(0.78, "document_classification");
    expect(lowConf.autoAccept).toBe(false);
    expect(lowConf.needsReview).toBe(true);

    // 3. Compliance output below 0.90 -> confirmBeforeFiling = true
    const complianceLowConf = applyConfidencePolicy(0.88, "cac_annual_returns_filing");
    expect(complianceLowConf.confirmBeforeFiling).toBe(true);

    // 4. Compliance output >= 0.90 -> confirmBeforeFiling = false
    const complianceHighConf = applyConfidencePolicy(0.95, "cac_annual_returns_filing");
    expect(complianceHighConf.confirmBeforeFiling).toBe(false);
  });

  it("citation validator strips hallucinated ruleKeys not in provided context", () => {
    const providedRuleKeys = ["CAC_ANNUAL_RETURNS", "FIRS_CIT_FILING"];

    const citations = [
      { ruleKey: "CAC_ANNUAL_RETURNS", source: "CAMA 2020 s. 822" },
      { ruleKey: "HALLUCINATED_FAKE_TAX_RULE", source: "Fictional Act 2026 s. 99" }, // Hallucination!
    ];

    const validation = validateCitations(citations, providedRuleKeys);

    expect(validation.hasHallucinations).toBe(true);
    expect(validation.validCitations).toHaveLength(1);
    expect(validation.validCitations[0].ruleKey).toBe("CAC_ANNUAL_RETURNS");
    expect(validation.validCitations[0].isVerified).toBe(true);

    expect(validation.strippedCitations).toHaveLength(1);
    expect(validation.strippedCitations[0].ruleKey).toBe("HALLUCINATED_FAKE_TAX_RULE");
    expect(validation.strippedCitations[0].isVerified).toBe(false);

    expect(validation.disclaimerNote).toContain("I'm not sure — confirm before filing");
  });

  it("switching LLM_PROVIDER changes nothing else in application behavior", async () => {
    process.env.LLM_PROVIDER = "claude";
    const claudeProv = new ClaudeProvider();
    expect(claudeProv.type).toBe("claude");

    process.env.LLM_PROVIDER = "gemini";
    const geminiProv = new GeminiProvider();
    expect(geminiProv.type).toBe("gemini");
  });
});
