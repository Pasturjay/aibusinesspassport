/**
 * Professional Referrals & Lead Generation Marketplace Library.
 * Enforces privacy guarantees via advisorGrants and manages lead fee tracking in Kobo.
 */

export type ServiceProviderType = "accountant" | "lawyer" | "agent" | "consultant";
export type ReferralStatus = "new" | "contacted" | "converted" | "closed";

export interface ServiceProvider {
  _id: string;
  type: ServiceProviderType;
  name: string;
  states: string[];
  verified: boolean;
  feeModel: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdvisorGrant {
  businessId: string;
  advisorUserId: string;
  categories: string[];
  expiresAt?: string;
  revokedAt?: string;
  grantedBy: string;
}

export const DEFAULT_LEAD_FEE_KOBO = 250000; // ₦2,500.00 lead fee

/**
 * Filter service providers by service type and state.
 */
export function filterServiceProviders(
  providers: ServiceProvider[],
  filters: {
    type?: ServiceProviderType;
    state?: string;
    verifiedOnly?: boolean;
  }
): ServiceProvider[] {
  return providers.filter((p) => {
    if (filters.verifiedOnly && !p.verified) return false;
    if (filters.type && p.type !== filters.type) return false;
    if (filters.state) {
      const normalizedState = filters.state.toLowerCase().trim();
      const matchesState = p.states.some(
        (s) => s.toLowerCase().trim() === normalizedState || s.toLowerCase() === "all"
      );
      if (!matchesState) return false;
    }
    return true;
  });
}

/**
 * Verify whether an advisor grant permits access to a specific Vault category.
 * Enforces:
 * 1. Grant exists and is active.
 * 2. Not revoked (`revokedAt` is absent).
 * 3. Not expired (`expiresAt` > currentTime).
 * 4. Granted categories include the requested category or "all".
 */
export function verifyAdvisorAccess(
  grant: AdvisorGrant | null | undefined,
  targetCategory: string,
  now: Date = new Date()
): { allowed: boolean; reason?: string } {
  if (!grant) {
    return { allowed: false, reason: "No advisor grant found for this provider" };
  }

  if (grant.revokedAt) {
    return { allowed: false, reason: "Advisor access was revoked by the business owner" };
  }

  if (grant.expiresAt) {
    const expiresDate = new Date(grant.expiresAt);
    if (expiresDate <= now) {
      return { allowed: false, reason: "Advisor access grant has expired" };
    }
  }

  const categoryAllowed =
    grant.categories.includes("all") || grant.categories.includes(targetCategory);

  if (!categoryAllowed) {
    return {
      allowed: false,
      reason: `Access to category '${targetCategory}' has not been explicitly granted`,
    };
  }

  return { allowed: true };
}

/**
 * Validate allowed status transitions for a referral lead.
 */
export function isValidReferralStatusTransition(
  currentStatus: ReferralStatus,
  nextStatus: ReferralStatus
): boolean {
  const allowedTransitions: Record<ReferralStatus, ReferralStatus[]> = {
    new: ["contacted", "closed"],
    contacted: ["converted", "closed"],
    converted: ["closed"],
    closed: [],
  };

  return allowedTransitions[currentStatus]?.includes(nextStatus) ?? false;
}
