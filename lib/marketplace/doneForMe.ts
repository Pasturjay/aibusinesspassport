/**
 * Done-for-Me (Pro+) Service Request & Quote Engine.
 * Manages custom compliance & registration job workflows from request to Vault document hand-back.
 */

export type DoneForMeStatus =
  | "requested"
  | "quoted"
  | "accepted"
  | "paid"
  | "in_progress"
  | "completed";

export interface DoneForMeServiceCatalogItem {
  serviceId: string;
  title: string;
  description: string;
  suggestedBaselineKobo: number; // Kobo integer
  estimatedTurnaroundDays: number;
}

export const DONE_FOR_ME_CATALOG: Record<string, DoneForMeServiceCatalogItem> = {
  cac_business_name: {
    serviceId: "cac_business_name",
    title: "CAC Business Name Registration",
    description: "Complete filing of Business Name with CAC including Certificate & Status Report",
    suggestedBaselineKobo: 2500000, // ₦25,000.00
    estimatedTurnaroundDays: 3,
  },
  cac_limited_company: {
    serviceId: "cac_limited_company",
    title: "CAC Limited Liability Company Registration",
    description: "Full incorporation of 1M Share Capital Limited Liability Company with CAC",
    suggestedBaselineKobo: 6500000, // ₦65,000.00
    estimatedTurnaroundDays: 5,
  },
  scuml_registration: {
    serviceId: "scuml_registration",
    title: "SCUML Certificate Processing",
    description: "SCUML anti-money laundering registration & certificate issuance with EFCC",
    suggestedBaselineKobo: 4000000, // ₦40,000.00
    estimatedTurnaroundDays: 7,
  },
  tax_clearance: {
    serviceId: "tax_clearance",
    title: "Tax Clearance Certificate (TCC) Filing",
    description: "FIRS Tax Clearance Certificate processing and filing assistance",
    suggestedBaselineKobo: 5000000, // ₦50,000.00
    estimatedTurnaroundDays: 10,
  },
  pencom_nsitf_compliance: {
    serviceId: "pencom_nsitf_compliance",
    title: "PENCOM / NSITF Employee Clearance",
    description: "Statutory pension and employee compensation clearance certificate processing",
    suggestedBaselineKobo: 3500000, // ₦35,000.00
    estimatedTurnaroundDays: 5,
  },
};

/**
 * Validate status transitions for a Done-for-Me job.
 */
export function isValidDoneForMeTransition(
  currentStatus: DoneForMeStatus,
  nextStatus: DoneForMeStatus
): boolean {
  const allowedTransitions: Record<DoneForMeStatus, DoneForMeStatus[]> = {
    requested: ["quoted", "completed"], // Can jump to completed if instant
    quoted: ["accepted", "requested"],
    accepted: ["paid"],
    paid: ["in_progress"],
    in_progress: ["completed"],
    completed: [],
  };

  return allowedTransitions[currentStatus]?.includes(nextStatus) ?? false;
}

/**
 * Format Done-for-Me quote in Naira.
 */
export function formatQuoteNaira(quoteKobo: number): string {
  return (quoteKobo / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
}
