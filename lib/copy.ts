/**
 * AI Business Passport - Plain-Language Product Copy Dictionary
 * 
 * Non-Negotiable Principle #5:
 * Avoid complex legal/statutory jargon. Speak in direct, plain Nigerian business language.
 */

export const BANNED_PHRASES = [
  "statutory compliance obligations",
  "post-incorporation filing",
  "corporate documentation repository",
  "regulatory obligations",
] as const;

export type BannedPhrase = (typeof BANNED_PHRASES)[number];

export const PHRASE_REPLACEMENTS: Record<BannedPhrase, string> = {
  "statutory compliance obligations": "what your business needs to stay compliant",
  "post-incorporation filing": "make changes to your registered business",
  "corporate documentation repository": "Your Business Documents",
  "regulatory obligations": "things your business needs to do",
};

export const PRODUCT_COPY = {
  // Trust & Guidance Disclaimers
  trustNotice: "This assessment is based on the information you gave us. It is not binding legal or tax advice.",
  confirmBeforeFilingPrompt: "Please review and confirm these details before filing.",

  // Navigation & Sections
  complianceSectionTitle: "What your business needs to stay compliant",
  filingsSectionTitle: "Make changes to your registered business",
  documentsVaultTitle: "Your Business Documents",
  tasksOverviewTitle: "Things your business needs to do",

  // Business Passport Public Verification
  passportBadgeVerified: "Verified Business Identity",
  passportBadgePending: "Verification in Progress",
  passportPublicSubtitle: "Public credential issued by AI Business Passport",

  // Action Buttons
  getStarted: "Get your business started",
  viewPassport: "View Business Passport",
  downloadDocument: "Download document",
} as const;

export const DISCLAIMER_LEGAL = "This document was generated using AI Business Passport. It is provided for informational and draft purposes only. Legal and statutory documents should be reviewed by a qualified legal practitioner before execution.";
