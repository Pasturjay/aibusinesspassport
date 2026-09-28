import { DOCUMENT_TEMPLATES, DocumentTemplateDefinition } from "./templates";
import { completeLLM } from "@/lib/llm";

export interface QCError {
  field: string;
  issue: string;
  fixLink: string;
}

export interface QCWarning {
  field: string;
  issue: string;
}

export interface QCReport {
  passed: boolean;
  errors: QCError[];
  warnings: QCWarning[];
  missingFields: string[];
  inconsistencies: string[];
  contradictions: string[];
}

/**
 * Helper to safely resolve nested dot-notation paths from Brain snapshot object.
 */
export function getBrainValue(obj: any, path: string): any {
  if (!obj) return undefined;
  if (path.endsWith("[]")) {
    const arrayPath = path.slice(0, -2);
    const val = getBrainValue(obj, arrayPath);
    return Array.isArray(val) && val.length > 0 ? val : undefined;
  }

  const parts = path.split(".");
  let curr = obj;
  for (const part of parts) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[part];
  }
  return curr;
}

/**
 * Deterministic Pre-Generation QC Check.
 * Validates required Brain paths, credential expiries, experience dates, and name consistency.
 */
export function evaluateDeterministicQC(
  brainSnapshot: Record<string, any>,
  templateKey: string,
  vaultDocuments?: Array<Record<string, any>>,
  currentDate: Date = new Date()
): { errors: QCError[]; warnings: QCWarning[]; missingFields: string[]; inconsistencies: string[] } {
  const templateDef: DocumentTemplateDefinition | undefined = DOCUMENT_TEMPLATES[templateKey];
  const errors: QCError[] = [];
  const warnings: QCWarning[] = [];
  const missingFields: string[] = [];
  const inconsistencies: string[] = [];

  if (!templateDef) {
    errors.push({
      field: "templateKey",
      issue: `Unknown document template '${templateKey}'. Select a valid template.`,
      fixLink: "/documents/templates",
    });
    return { errors, warnings, missingFields, inconsistencies };
  }

  // 1. Required Brain Paths Check
  const requiredPaths = new Set<string>();
  for (const sec of templateDef.sections) {
    for (const path of sec.requiredBrainPaths) {
      requiredPaths.add(path);
    }
  }

  for (const path of requiredPaths) {
    const val = getBrainValue(brainSnapshot, path);
    if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
      missingFields.push(path);
      const friendlyName = path.split(".").pop() || path;
      errors.push({
        field: path,
        issue: `Missing required field '${friendlyName}' for ${templateDef.title}.`,
        fixLink: `/brain?focus=${path}`,
      });
    }
  }

  // 2. Legal Name / Trading Name Inconsistency Check across Brain vs Vault Docs
  const brainLegalName = (brainSnapshot.identity?.legalName || "").trim().toLowerCase();
  if (vaultDocuments && vaultDocuments.length > 0 && brainLegalName) {
    for (const doc of vaultDocuments) {
      if (doc.extracted) {
        try {
          const extractedData = typeof doc.extracted === "string" ? JSON.parse(doc.extracted) : doc.extracted;
          const docName = (extractedData.legalName || extractedData.businessName || "").trim().toLowerCase();
          if (docName && docName !== brainLegalName && !brainLegalName.includes(docName) && !docName.includes(brainLegalName)) {
            const inconsistencyMsg = `Name Mismatch: Vault document '${doc.fileName}' lists business name as "${extractedData.legalName || extractedData.businessName}", but Business Brain has "${brainSnapshot.identity?.legalName}".`;
            inconsistencies.push(inconsistencyMsg);
            warnings.push({
              field: "identity.legalName",
              issue: inconsistencyMsg,
            });
          }
        } catch {
          // Ignore unparseable extracted JSON
        }
      }
    }
  }

  // 3. Expired Credentials Check
  const credentials = brainSnapshot.credentials || [];
  if (Array.isArray(credentials)) {
    for (const cred of credentials) {
      if (cred.expiresAt) {
        const expDate = new Date(cred.expiresAt);
        if (expDate.getTime() < currentDate.getTime()) {
          warnings.push({
            field: `credentials.${cred.name}`,
            issue: `Claimed credential '${cred.name}' expired on ${cred.expiresAt}. Update or renew in Vault before filing.`,
          });
        }
      }
    }
  }

  // 4. Experience Entry Completeness Check
  const experience = brainSnapshot.experience || [];
  if (Array.isArray(experience)) {
    experience.forEach((exp, idx) => {
      if (!exp.year || !exp.clientName || !exp.projectTitle) {
        warnings.push({
          field: `experience[${idx}]`,
          issue: `Experience entry '${exp.projectTitle || "Project " + (idx + 1)}' is missing completion year or client name.`,
        });
      }
    });
  }

  return { errors, warnings, missingFields, inconsistencies };
}

/**
 * Full QC Pass Engine (Deterministic + LLM Contradictions & Superlatives Check).
 */
export async function runDocumentQC(
  brainSnapshot: Record<string, any>,
  templateKey: string,
  vaultDocuments?: Array<Record<string, any>>,
  currentDate: Date = new Date()
): Promise<QCReport> {
  // 1. Run Deterministic Pass
  const detResult = evaluateDeterministicQC(brainSnapshot, templateKey, vaultDocuments, currentDate);

  const contradictions: string[] = [];
  const errors = [...detResult.errors];
  const warnings = [...detResult.warnings];

  // If missing critical errors exist, we can skip expensive LLM check or run it for full feedback
  // 2. LLM Contradictions & Superlatives Check
  try {
    const prompt = `Analyze this Business Brain data for factual contradictions or unsupported superlatives:
Brain Data: ${JSON.stringify({
      legalName: brainSnapshot.identity?.legalName,
      yearFounded: brainSnapshot.identity?.yearFounded,
      description: brainSnapshot.identity?.description,
      experience: brainSnapshot.experience,
      credentials: brainSnapshot.credentials,
    })}

Return JSON object: { "contradictions": ["..."], "superlatives": ["..."] }`;

    const llmRes = await completeLLM(
      [
        { role: "system", content: "You are a legal & compliance QC auditor checking business documents for contradictions." },
        { role: "user", content: prompt },
      ],
      { tier: "fast", responseFormat: "json" }
    );

    let parsed: any = null;
    try {
      parsed = JSON.parse(llmRes.content);
    } catch {
      parsed = null;
    }

    if (parsed && Array.isArray(parsed.contradictions)) {
      for (const item of parsed.contradictions) {
        contradictions.push(item);
        warnings.push({
          field: "contradictions",
          issue: item,
        });
      }
    }

    if (parsed && Array.isArray(parsed.superlatives)) {
      for (const sup of parsed.superlatives) {
        warnings.push({
          field: "superlatives",
          issue: `Unsupported superlative statement: "${sup}". Verify documentation backings.`,
        });
      }
    }
  } catch (err) {
    // If LLM check fails or times out, proceed with deterministic result
    console.warn("[QC Engine] LLM contradiction check fallback:", err);
  }

  const passed = errors.length === 0;

  return {
    passed,
    errors,
    warnings,
    missingFields: detResult.missingFields,
    inconsistencies: detResult.inconsistencies,
    contradictions,
  };
}
