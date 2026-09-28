import { ExtractedRequirement } from "./extractor";

export interface MatchedRequirement extends ExtractedRequirement {
  matchStatus: "available" | "needs_preparation" | "missing";
  matchedDocumentId?: string;
  matchedBrainPath?: string;
  matchConfidence: number;
  gapNote?: string;
}

export function matchRequirementsAgainstBusinessData(
  requirements: ExtractedRequirement[],
  brainSnapshot: Record<string, any>,
  vaultDocuments: Array<Record<string, any>> = [],
  currentDate: Date = new Date()
): MatchedRequirement[] {
  return requirements.map((req) => {
    const textLower = req.text.toLowerCase();
    let matchStatus: "available" | "needs_preparation" | "missing" = "missing";
    let matchedDocumentId: string | undefined = undefined;
    let matchedBrainPath: string | undefined = undefined;
    let matchConfidence = req.confidence;
    let gapNote: string | undefined = undefined;

    // 1. Check Vault Documents
    for (const doc of vaultDocuments) {
      const docTypeLower = (doc.docType || doc.category || "").toLowerCase();
      const fileNameLower = (doc.fileName || "").toLowerCase();

      if (
        (textLower.includes("tax clearance") && (docTypeLower.includes("tax") || fileNameLower.includes("tax"))) ||
        (textLower.includes("cac") && (docTypeLower.includes("cac") || fileNameLower.includes("cac"))) ||
        (textLower.includes("pension") && (docTypeLower.includes("pension") || fileNameLower.includes("pencom"))) ||
        (textLower.includes("itf") && (docTypeLower.includes("itf") || fileNameLower.includes("itf")))
      ) {
        matchedDocumentId = doc._id || doc.id || "doc_matched";

        // Check expiry date
        if (doc.expiresAt) {
          const expDate = new Date(doc.expiresAt);
          if (expDate.getTime() < currentDate.getTime()) {
            matchStatus = "needs_preparation";
            gapNote = `Document '${doc.fileName}' is expired (${doc.expiresAt}). Upload an updated copy.`;
          } else {
            matchStatus = "available";
          }
        } else {
          matchStatus = "available";
        }
        break;
      }
    }

    // 2. Check Brain Snapshot paths if not satisfied by Vault
    if (matchStatus === "missing") {
      if (textLower.includes("cac") || textLower.includes("registration number") || textLower.includes("rc number")) {
        if (brainSnapshot.identity?.rcNumber) {
          matchedBrainPath = "identity.rcNumber";
          matchStatus = "available";
        }
      } else if (textLower.includes("tin") || textLower.includes("tax identification")) {
        if (brainSnapshot.identity?.tin) {
          matchedBrainPath = "identity.tin";
          matchStatus = "available";
        }
      } else if (textLower.includes("similar project") || textLower.includes("past performance") || textLower.includes("experience")) {
        const experience = brainSnapshot.experience || [];
        if (Array.isArray(experience) && experience.length > 0) {
          matchedBrainPath = "experience[]";
          if (experience.length >= 3) {
            matchStatus = "available";
          } else {
            matchStatus = "needs_preparation";
            gapNote = `Tender asks for projects, but only ${experience.length} verified project(s) recorded in Business Brain.`;
          }
        }
      } else if (textLower.includes("capability statement") || textLower.includes("company profile")) {
        matchedBrainPath = "services[]";
        matchStatus = "needs_preparation";
        gapNote = "Can be generated instantly using Document Studio.";
      }
    }

    // 3. LOW CONFIDENCE PROTECTION: Never auto-mark 'available' if confidence < 0.8
    if (matchConfidence < 0.8 && matchStatus === "available") {
      matchStatus = "needs_preparation";
      gapNote = "Requirement match confidence is below 80%. Verify manually before submission.";
    }

    return {
      ...req,
      matchStatus,
      matchedDocumentId,
      matchedBrainPath,
      matchConfidence,
      gapNote,
    };
  });
}
