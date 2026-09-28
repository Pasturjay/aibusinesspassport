import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export type Role = "owner" | "staff" | "advisor" | "admin" | "content_editor";

/**
 * Resolves the authenticated user record from the Clerk JWT identity.
 */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated: No user identity present in context");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new Error(`User record not found in Business Brain for Clerk ID: ${identity.subject}`);
  }

  return user;
}

/**
 * Enforces Admin / Content Editor Role access for Admin endpoints.
 * NON-NEGOTIABLE REQUIREMENT: Non-admins get 403 / error from every admin Convex function.
 */
export async function requireAdminUser(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: Role[] = ["admin", "content_editor"]
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`403 Unauthorized: User role "${user.role}" does not have admin permissions`);
  }
  return user;
}

/**
 * Enforces Role-Based Access Control (RBAC) & Advisor Category Grants.
 * Story C4: Advisor read access strictly checked against active, non-expired category grants.
 */
export async function requireBusinessAccess(
  ctx: QueryCtx | MutationCtx,
  businessId: Id<"businesses">,
  actionRole: Role | "owner_billing" = "staff",
  category?: string
): Promise<{ user: Doc<"users">; business: Doc<"businesses"> }> {
  const user = await requireUser(ctx);

  const business = await ctx.db.get(businessId);
  if (!business) {
    throw new Error(`Business record not found for ID: ${businessId}`);
  }

  // 1. System Admins have unrestricted access
  if (user.role === "admin") {
    return { user, business };
  }

  // 2. Business Owner check
  const isOwner = business.ownerUserId === user.clerkId || business.ownerUserId === user._id;
  if (isOwner) {
    return { user, business };
  }

  // 3. Billing restriction check
  if (actionRole === "owner_billing") {
    throw new Error("Unauthorized: Only the business owner can manage billing and subscriptions");
  }

  // 4. Staff Role check
  if (user.role === "staff") {
    return { user, business };
  }

  // 5. Advisor Role check (Story C4)
  if (user.role === "advisor") {
    if (!category) {
      throw new Error("Advisor access denied: Document category must be specified");
    }

    const now = new Date().toISOString();
    const grants = await ctx.db
      .query("advisorGrants")
      .withIndex("by_business_advisor", (q) =>
        q.eq("businessId", businessId).eq("advisorUserId", user.clerkId)
      )
      .collect();

    // Active grant check
    const activeGrant = grants.find((g) => {
      const isNotRevoked = !g.revokedAt;
      const isNotExpired = !g.expiresAt || g.expiresAt > now;
      const hasCategory = g.categories.includes("all") || g.categories.includes(category);
      return isNotRevoked && isNotExpired && hasCategory;
    });

    if (!activeGrant) {
      throw new Error(
        `Advisor access denied: No active grant for category "${category}" on business ID: ${businessId}`
      );
    }

    return { user, business };
  }

  throw new Error(`Unauthorized: User role "${user.role}" does not have access to this business`);
}
