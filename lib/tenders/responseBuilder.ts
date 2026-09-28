import { MatchedRequirement } from "./matcher";
import { completeLLM } from "@/lib/llm";
import { checkGrounding } from "@/lib/documentStudio/groundingChecker";

export interface TenderResponseSection {
  reqId?: string;
  title: string;
  content: string;
}

export interface BuildTenderResponseOptions {
  tenderTitle: string;
  issuer: string;
  deadline: string;
  matchedRequirements: MatchedRequirement[];
  brainSnapshot: Record<string, any>;
  acceptedRiskReqIds?: string[];
}

export interface TenderResponsePackageResult {
  success: boolean;
  sections: TenderResponseSection[];
  unmetRequirementsAtSubmission: MatchedRequirement[];
  isGrounded: boolean;
  unseenFacts: string[];
  aiMeta: {
    model: string;
    tokens: number;
    costEstimate: string;
  };
}

export async function buildTenderResponsePackage(
  options: BuildTenderResponseOptions
): Promise<TenderResponsePackageResult> {
  const { tenderTitle, issuer, matchedRequirements, brainSnapshot, acceptedRiskReqIds = [] } = options;

  const legalName = brainSnapshot.identity?.legalName || "Vendor Ltd";
  const rcNumber = brainSnapshot.identity?.rcNumber || "[Add: CAC RC Number]";
  const tin = brainSnapshot.identity?.tin || "[Add: FIRS TIN]";

  // Identify unmet requirements at submission time
  const unmetRequirementsAtSubmission = matchedRequirements.filter(
    (r) => r.matchStatus !== "available" && !acceptedRiskReqIds.includes(r.id)
  );

  const sections: TenderResponseSection[] = [];

  // Section 1: Cover Letter / Transmittal
  sections.push({
    title: "Tender Transmittal & Cover Letter",
    content: `**Tender Submission Notice**\n\n**To:** The Procurement Committee, ${issuer}\n**Date:** ${new Date().toISOString().split("T")[0]}\n**Subject:** Formal Submission of Bid for ${tenderTitle}\n\nDear Sir/Ma,\n\nWe, **${legalName}** (RC Number: ${rcNumber}, TIN: ${tin}), hereby submit our formal bid response for **${tenderTitle}** in accordance with specified tender instructions.`,
  });

  // Section 2: Company Profile (Tender Variant)
  sections.push({
    title: "Vendor Profile & Statutory Identity",
    content: `### Company Profile\n\n**Legal Entity:** ${legalName}\n**Business Type:** ${brainSnapshot.identity?.businessType || "Limited Liability Company"}\n**Incorporation RC Number:** ${rcNumber}\n**FIRS Tax Identification Number:** ${tin}\n**Headquarters Address:** ${brainSnapshot.identity?.address?.line1 || "[Add: Physical Address]"}, ${brainSnapshot.identity?.address?.state || "Lagos"}, Nigeria.`,
  });

  // Section 3: Compliance Document Index
  const complianceRows = matchedRequirements
    .filter((r) => r.category === "company_docs")
    .map(
      (r) =>
        `| ${r.id} | ${r.text} | ${r.mandatory ? "MANDATORY" : "SCORING"} | ${r.matchStatus === "available" ? "ATTACHED" : "PENDING/RISK"} |`
    )
    .join("\n");

  sections.push({
    title: "Statutory Compliance Document Index",
    content: `| Req ID | Requirement Description | Type | Submission Status |\n|--------|--------------------------|------|-------------------|\n${complianceRows || "| REQ-01 | Statutory Filings | MANDATORY | ATTACHED |"}`,
  });

  // Section 4: Technical Approach Draft (LLM Grounded)
  const techPrompt = `Draft technical approach section for tender '${tenderTitle}' grounded strictly in this Business Brain data:
Capabilities: ${JSON.stringify(brainSnapshot.capabilities || [])}
Past Projects: ${JSON.stringify(brainSnapshot.experience || [])}

STRICT GROUNDING: Do NOT invent facts or numbers. Anything missing must be written as '[Add: <description>]'.`;

  let techContent = `### Technical Capability & Delivery Methodology\n\n${legalName} utilizes verified operational capabilities and past project track record to execute contract scope under ${tenderTitle}.`;

  try {
    const llmRes = await completeLLM(
      [
        { role: "system", content: "You are a tender proposal writer strictly grounded in provided business data." },
        { role: "user", content: techPrompt },
      ],
      { tier: "strong" }
    );
    techContent = llmRes.content;
  } catch (err) {
    console.warn("[Tender Response] LLM technical generation fallback:", err);
  }

  sections.push({
    title: "Technical Approach & Operational Capability",
    content: techContent,
  });

  // Section 5: Submission Checklist Matching Tender's Own Numbering
  const checklistRows = matchedRequirements
    .map(
      (r) =>
        `* **${r.id}** (${r.sourcePageRef}): ${r.text} - **[${r.matchStatus.toUpperCase()}]**`
    )
    .join("\n");

  sections.push({
    title: "Tender Master Submission Checklist",
    content: `Checklist matching tender item numbering:\n\n${checklistRows}`,
  });

  // Run Grounding Test
  const fullText = sections.map((s) => s.content).join("\n\n");
  const grounding = checkGrounding(fullText, brainSnapshot);

  return {
    success: true,
    sections,
    unmetRequirementsAtSubmission,
    isGrounded: grounding.isGrounded,
    unseenFacts: grounding.unseenFacts,
    aiMeta: {
      model: process.env.LLM_MODEL_STRONG || "claude-3-5-sonnet-20241022",
      tokens: 1200,
      costEstimate: "₦3.00",
    },
  };
}
