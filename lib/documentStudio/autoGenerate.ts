import { generateDocument, GenerateDocResult } from "./generator";

/**
 * Auto-generates starter Business Card, Letterhead, and Company Profile from Vault document extractions.
 */
export async function autoGenerateStarterDocs(
  brainSnapshot: Record<string, any>,
  vaultDocuments?: Array<Record<string, any>>
): Promise<{
  profileResult: GenerateDocResult;
  letterheadResult: GenerateDocResult;
  businessCardResult: GenerateDocResult;
}> {
  // 1. Generate Standard Company Profile
  const profileResult = await generateDocument({
    brainSnapshot,
    templateKey: "profile_standard",
    audience: { type: "general" },
    vaultDocuments,
    overrideQCBlock: true,
  });

  // 2. Generate Corporate Letterhead
  const letterheadResult = await generateDocument({
    brainSnapshot,
    templateKey: "letterhead",
    audience: { type: "general" },
    vaultDocuments,
    overrideQCBlock: true,
  });

  // 3. Generate Business Card
  const businessCardResult = await generateDocument({
    brainSnapshot,
    templateKey: "business_card",
    audience: { type: "general" },
    vaultDocuments,
    overrideQCBlock: true,
  });

  return {
    profileResult,
    letterheadResult,
    businessCardResult,
  };
}
