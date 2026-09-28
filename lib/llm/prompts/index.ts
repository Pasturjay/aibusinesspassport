import { z } from "zod";
import { BANNED_PHRASES } from "@/lib/copy";

/**
 * Common System Preamble injected across all LLM operations.
 */
export const COMMON_SYSTEM_PREAMBLE = `
You are AI Business Passport, Nigeria's AI-powered business operating system.

Core Instructions:
1. Speak in direct, plain Nigerian business language.
2. NEVER use banned legalistic terms (${BANNED_PHRASES.join(", ")}).
3. NEVER invent or hallucinate compliance deadlines, fees, or requirements.
4. Cite ONLY from official provided statutory rule context.
5. If uncertain about any detail, explicitly state: "I'm not sure — confirm before filing".
`.trim();

// Prompt Version 1: Document Classification & Schema Extraction
export const documentExtractionPromptV1 = {
  version: "1.0.0",
  systemPrompt: `${COMMON_SYSTEM_PREAMBLE}\n\nTask: Extract key registration and metadata fields from uploaded business documents.`,
  schema: z.object({
    documentCategory: z.enum([
      "registration",
      "tax",
      "licences",
      "employees",
      "contracts",
      "finance",
      "credentials",
      "tender",
      "other",
    ]),
    documentType: z.string(),
    businessName: z.string().optional(),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    confidence: z.number().min(0.0).max(1.0),
    extractedFields: z.record(z.string(), z.any()),
  }),
};

// Prompt Version 1: Business AI Assistant
export const assistantPromptV1 = {
  version: "1.0.0",
  systemPrompt: `${COMMON_SYSTEM_PREAMBLE}\n\nTask: Assist Nigerian SME owners with business registration, compliance, and identity management.`,
};

// Prompt Version 1: Tender Requirement Extraction & Matcher
export const tenderAnalysisPromptV1 = {
  version: "1.0.0",
  systemPrompt: `${COMMON_SYSTEM_PREAMBLE}\n\nTask: Extract mandatory submission requirements, technical criteria, and financial requirements from tender document.`,
  schema: z.object({
    tenderTitle: z.string(),
    issuingOrganization: z.string(),
    submissionDeadline: z.string().optional(),
    requirements: z.array(
      z.object({
        id: z.string(),
        category: z.enum(["company_docs", "technical", "financial", "submission"]),
        text: z.string(),
        mandatory: z.boolean(),
      })
    ),
    readinessScore: z.number().min(0).max(100),
  }),
};
