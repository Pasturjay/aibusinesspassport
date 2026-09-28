import { DOCUMENT_TEMPLATES, INDUSTRY_TEMPLATE_PACKS, DocumentTemplateDefinition } from "./templates";
import { runDocumentQC, QCReport } from "./qc";
import { completeLLM } from "@/lib/llm";
import { checkGrounding, GroundingCheckResult } from "./groundingChecker";
import { DISCLAIMER_LEGAL } from "@/lib/copy";

export interface GenerateDocOptions {
  brainSnapshot: Record<string, any>;
  templateKey: string;
  audience?: {
    name?: string;
    type?: "government" | "investor" | "corporate" | "retail" | "general";
  };
  industry?: string;
  vaultDocuments?: Array<Record<string, any>>;
  overrideQCBlock?: boolean;
}

export interface GeneratedDocSection {
  key: string;
  title: string;
  content: string;
}

export interface GenerateDocResult {
  success: boolean;
  qcReport: QCReport;
  documentTitle?: string;
  confirmBeforeFiling?: boolean;
  sections?: GeneratedDocSection[];
  groundingResult?: GroundingCheckResult;
  aiMeta?: {
    model: string;
    promptVersion: string;
    tokens: number;
    costEstimate: string;
  };
  error?: string;
}

export async function generateDocument(options: GenerateDocOptions): Promise<GenerateDocResult> {
  const { brainSnapshot, templateKey, audience, industry, vaultDocuments, overrideQCBlock } = options;

  const templateDef: DocumentTemplateDefinition | undefined = DOCUMENT_TEMPLATES[templateKey];

  if (!templateDef) {
    return {
      success: false,
      qcReport: {
        passed: false,
        errors: [{ field: "templateKey", issue: `Unknown template '${templateKey}'`, fixLink: "/documents/templates" }],
        warnings: [],
        missingFields: [],
        inconsistencies: [],
        contradictions: [],
      },
      error: `Invalid template key '${templateKey}'`,
    };
  }

  // 1. Pre-Generation QC Pass
  const qcReport = await runDocumentQC(brainSnapshot, templateKey, vaultDocuments);

  if (!qcReport.passed && !overrideQCBlock) {
    return {
      success: false,
      qcReport,
      error: "Pre-generation QC checks failed. Resolve missing required fields before proceeding.",
    };
  }

  // 2. Audience Tone Selection
  const audienceType = audience?.type || "general";
  let toneInstruction = "";

  switch (audienceType) {
    case "government":
      toneInstruction = "Use a formal, authoritative, evidence-backed regulatory tone tailored for government procurement panels and statutory inspectors.";
      break;
    case "investor":
      toneInstruction = "Use a growth-focused, metric-driven, scalable value proposition tone tailored for venture capital and angel investors.";
      break;
    case "corporate":
      toneInstruction = "Use a professional, SLA-focused, ROI-driven executive corporate tone suitable for enterprise decision-makers.";
      break;
    case "retail":
      toneInstruction = "Use an engaging, customer-centric, brand-oriented clear tone.";
      break;
    case "general":
    default:
      toneInstruction = "Use a professional, clear, accessible, plain-language business tone.";
      break;
  }

  // 3. Industry Pack Override Prompts
  let industrySupplemental = "";
  if (industry && INDUSTRY_TEMPLATE_PACKS[industry]) {
    const pack = INDUSTRY_TEMPLATE_PACKS[industry];
    industrySupplemental = `Industry Context (${pack.name}): Priority focus on ${pack.priorityFocus}.`;
  }

  // 4. Assemble Generation Instructions & Sections
  const generatedSections: GeneratedDocSection[] = [];
  let totalTokens = 0;

  const systemPrompt = `You are the Document Studio Engine for AI Business Passport in Nigeria.
Your job is to generate a formal document section based ONLY on the provided Business Brain snapshot.

STRICT GROUNDING POLICY:
- You MUST ONLY use facts, numbers, dates, addresses, credentials, and services explicitly present in the snapshot.
- DO NOT invent, hallucinate, or extrapolate facts that are not present.
- If a detail is missing or not provided in the snapshot, write a clear placeholder in the format '[Add: <description>]'.
- Tone Directive: ${toneInstruction}
- ${industrySupplemental}`;

  for (const sec of templateDef.sections) {
    const userPrompt = `Section: ${sec.title}
Section Key: ${sec.key}
Description: ${sec.description}
Default Directive: ${sec.defaultPrompt}

Target Audience: ${audience?.name ? audience.name + " (" + audienceType + ")" : audienceType}

Business Brain Data Snapshot:
${JSON.stringify(brainSnapshot, null, 2)}

Generate the text for this section in clean GitHub-style Markdown.`;

    try {
      const llmRes = await completeLLM(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { tier: "strong" }
      );

      totalTokens += llmRes.usage?.totalTokens || 500;
      let sectionContent = llmRes.content;

      // Append legal disclaimer if required for legal templates (e.g. contracts)
      if ((templateDef.legalDisclaimerRequired || templateDef.confirmBeforeFiling) && sec.key === templateDef.sections[templateDef.sections.length - 1].key) {
        sectionContent += `\n\n---\n> **LEGAL NOTICE**: ${DISCLAIMER_LEGAL}`;
      }

      generatedSections.push({
        key: sec.key,
        title: sec.title,
        content: sectionContent,
      });
    } catch (err) {
      // Fallback section placeholder on error
      generatedSections.push({
        key: sec.key,
        title: sec.title,
        content: `### ${sec.title}\n\n[Add: Content for ${sec.title} could not be automatically generated. Please edit manually.]`,
      });
    }
  }

  // 5. Automated Grounding Checker
  const fullDocText = generatedSections.map((s) => s.content).join("\n\n");
  const groundingResult = checkGrounding(fullDocText, brainSnapshot);

  return {
    success: true,
    qcReport,
    documentTitle: templateDef.title,
    confirmBeforeFiling: templateDef.confirmBeforeFiling,
    sections: generatedSections,
    groundingResult,
    aiMeta: {
      model: process.env.LLM_MODEL_STRONG || "claude-3-5-sonnet-20241022",
      promptVersion: `v${templateDef.version}.1`,
      tokens: totalTokens,
      costEstimate: `₦${((totalTokens / 1000) * 2.5).toFixed(2)}`,
    },
  };
}
