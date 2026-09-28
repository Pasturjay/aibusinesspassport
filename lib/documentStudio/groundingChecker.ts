/**
 * Automated Grounding & Hallucination Checker for Document Studio.
 * Verifies that no un-grounded facts, dates, names, or numbers appear in generated documents
 * that were not provided in the input Business Brain snapshot or wrapped in [Add: ...] placeholders.
 */

export interface GroundingCheckResult {
  isGrounded: boolean;
  unseenFacts: string[];
  placeholdersFound: string[];
}

export function checkGrounding(
  generatedText: string,
  snapshot: Record<string, any>
): GroundingCheckResult {
  const snapshotJson = JSON.stringify(snapshot).toLowerCase();
  const unseenFacts: string[] = [];

  // Extract all placeholders like [Add: ...]
  const placeholderRegex = /\[Add:\s*[^\]]+\]/gi;
  const placeholdersFound = generatedText.match(placeholderRegex) || [];

  // Remove placeholders from text before scanning for hallucinated numbers/proper nouns
  const textWithoutPlaceholders = generatedText.replace(placeholderRegex, "");

  // 1. Extract 4+ digit numbers (likely years, amounts, phone numbers, RC numbers, TINs)
  const numberMatches = textWithoutPlaceholders.match(/\b\d{4,}\b/g) || [];
  for (const num of numberMatches) {
    if (!snapshotJson.includes(num)) {
      // Allow common generic dates like current year or standard formatting numbers
      const numInt = parseInt(num, 10);
      const isYear = numInt >= 2020 && numInt <= 2030;
      if (!isYear) {
        unseenFacts.push(`Unseen number '${num}' not present in snapshot.`);
      }
    }
  }

  // 2. Extract Proper Nouns (Capitalized words or phrases not standard English or template headers)
  const properNounRegex = /\b[A-Z][a-z]{3,}\b/g;
  const properNouns = textWithoutPlaceholders.match(properNounRegex) || [];

  const commonWords = new Set([
    "Company", "Services", "Executive", "Summary", "Overview", "Nigeria", "Federal", "Republic",
    "Section", "Tender", "Corporate", "Business", "Government", "Client", "Project", "Management",
    "Technical", "Commercial", "Agreement", "Contract", "Invoice", "Quotation", "Proposal",
    "Director", "Secretary", "Manager", "Department", "Compliance", "Registration", "Clearance",
    "Notice", "Important", "Required", "Optional", "Total", "Subtotal", "Amount", "Description",
    "Transmittal", "Submission", "Committee", "Subject", "Formal", "Dear", "Vendor", "Entity",
    "Limited", "Liability", "Incorporation", "Headquarters", "Statutory", "Index", "Attached",
    "Pending", "Approach", "Capability", "Methodology", "Master", "Checklist", "Date", "Minister",
    "Ministry", "Power", "Electrification", "Rural", "Solar", "Generator", "Installation",
    "Procurement", "Profile", "Type", "Identification", "Requirement", "Status", "Certificate",
    "Draft", "Brain", "Past", "Projects", "Anything", "Page", "Gemini", "Mock", "Output", "Response"
  ]);

  for (const noun of properNouns) {
    if (commonWords.has(noun)) continue;
    const lowerNoun = noun.toLowerCase();

    // Check if present in snapshot JSON
    if (!snapshotJson.includes(lowerNoun)) {
      // Allow if it appears in standard boilerplate
      const isStandardBoilerplate = ["nigeria", "lagos", "abuja", "cama", "firs", "pencom", "itf"].includes(lowerNoun);
      if (!isStandardBoilerplate) {
        unseenFacts.push(`Unseen proper noun/fact '${noun}' not present in snapshot.`);
      }
    }
  }

  const isGrounded = unseenFacts.length === 0;

  return {
    isGrounded,
    unseenFacts,
    placeholdersFound,
  };
}
