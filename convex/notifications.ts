import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./authHelpers";

/**
 * Check if a notification with dedupeKey already exists.
 */
export const getByDedupeKey = query({
  args: {
    dedupeKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();
  },
});

/**
 * Record a new notification entry.
 */
export const recordNotification = mutation({
  args: {
    userId: v.string(),
    businessId: v.id("businesses"),
    channel: v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("in_app")
    ),
    template: v.string(),
    payload: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("delivered")
    ),
    providerMessageId: v.optional(v.string()),
    dedupeKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if dedupeKey exists
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();

    if (existing) {
      return existing._id;
    }

    const now = new Date().toISOString();
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      businessId: args.businessId,
      channel: args.channel,
      template: args.template,
      payload: args.payload,
      status: args.status,
      providerMessageId: args.providerMessageId,
      sentAt: args.status === "sent" || args.status === "delivered" ? now : undefined,
      dedupeKey: args.dedupeKey,
      createdAt: now,
    });
  },
});

/**
 * Update status of a notification record.
 */
export const updateNotificationStatus = mutation({
  args: {
    dedupeKey: v.optional(v.string()),
    providerMessageId: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("delivered")
    ),
  },
  handler: async (ctx, args) => {
    let doc = null;

    if (args.dedupeKey) {
      const key = args.dedupeKey;
      doc = await ctx.db
        .query("notifications")
        .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", key))
        .first();
    }

    if (!doc && args.providerMessageId) {
      const all = await ctx.db.query("notifications").collect();
      doc = all.find((n) => n.providerMessageId === args.providerMessageId) || null;
    }

    if (doc) {
      await ctx.db.patch(doc._id, {
        status: args.status,
        sentAt: args.status === "sent" || args.status === "delivered" ? new Date().toISOString() : doc.sentAt,
      });
      return { success: true, notificationId: doc._id };
    }

    return { success: false, reason: "Notification not found" };
  },
});

/**
 * Get in-app notifications for authenticated user.
 */
export const getInAppNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user.clerkId))
      .collect();

    return notifications
      .filter((n) => n.channel === "in_app")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
});

/**
 * Opt-out SMS and WhatsApp for user by phone (e.g. from STOP keyword).
 */
export const optOutByPhone = mutation({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    const cleanTarget = args.phone.replace(/\D/g, "");

    const matchedUsers = allUsers.filter((u) => {
      if (!u.phone) return false;
      const cleanU = u.phone.replace(/\D/g, "");
      return cleanU === cleanTarget || cleanU.slice(-10) === cleanTarget.slice(-10);
    });

    for (const u of matchedUsers) {
      await ctx.db.patch(u._id, {
        notificationPrefs: {
          ...u.notificationPrefs,
          sms: false,
          whatsapp: false,
        },
        updatedAt: new Date().toISOString(),
      });
    }

    return { count: matchedUsers.length };
  },
});
