import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./authHelpers";

/**
 * Get current authenticated user details.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await requireUser(ctx);
  },
});

/**
 * Update user notification preferences.
 */
export const updateNotificationPrefs = mutation({
  args: {
    notificationPrefs: v.object({
      email: v.boolean(),
      sms: v.boolean(),
      whatsapp: v.boolean(),
      inApp: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      notificationPrefs: args.notificationPrefs,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  },
});

/**
 * Set active business for multi-tenant switcher.
 */
export const setActiveBusiness = mutation({
  args: {
    businessId: v.id("businesses"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      activeBusinessId: args.businessId,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  },
});

/**
 * Clerk Webhook Handler Mutation: Upsert User.
 * Requirement #3: On created, DO NOT create a business yet (onboarding creates it).
 */
export const upsertUserFromWebhook = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("owner"),
        v.literal("staff"),
        v.literal("advisor"),
        v.literal("admin"),
        v.literal("content_editor")
      )
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const now = new Date().toISOString();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        phone: args.phone,
        updatedAt: now,
      });
      return existing._id;
    }

    // New user creation - DO NOT create a business (onboarding creates it)
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      phone: args.phone,
      role: args.role || "owner",
      locale: "en-NG",
      notificationPrefs: {
        email: true,
        sms: true,
        whatsapp: true,
        inApp: true,
      },
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
  },
});

/**
 * Clerk Webhook Handler Mutation: Delete User.
 */
export const deleteUserFromWebhook = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { success: true };
  },
});
