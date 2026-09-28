import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireBusinessAccess } from "./authHelpers";

/**
 * List connections for a business (Story H1).
 */
export const listConnections = query({
  args: { businessId: v.id("businesses") },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();

    return connections.reverse();
  },
});

/**
 * Update connection tags, notes, follow-up reminder date, or block requester (Story H2).
 */
export const updateConnection = mutation({
  args: {
    connectionId: v.id("connections"),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    followUpAt: v.optional(v.string()),
    status: v.optional(v.string()), // "active" | "blocked" | "archived"
  },
  handler: async (ctx, args) => {
    const conn = await ctx.db.get(args.connectionId);
    if (!conn) {
      throw new Error("Connection not found");
    }

    await requireBusinessAccess(ctx, conn.businessId, "staff");

    const now = new Date().toISOString();
    const patch: Record<string, any> = { updatedAt: now };

    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.followUpAt !== undefined) patch.followUpAt = args.followUpAt;
    if (args.status !== undefined) patch.status = args.status;

    await ctx.db.patch(args.connectionId, patch);
    return args.connectionId;
  },
});

/**
 * Send My Passport Back action: sends passport card share link to connection via notification.
 */
export const sendPassportBack = mutation({
  args: {
    businessId: v.id("businesses"),
    connectionId: v.id("connections"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");

    const conn = await ctx.db.get(args.connectionId);
    if (!conn || conn.businessId !== args.businessId) {
      throw new Error("Connection not found");
    }

    if (conn.status === "blocked") {
      throw new Error("Cannot send passport to a blocked contact");
    }

    const passport = await ctx.db
      .query("passports")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .unique();

    const passportId = passport?.passportId || "BP-NG-000000";
    const now = new Date().toISOString();

    // Create notification entry
    const notifId = await ctx.db.insert("notifications", {
      userId: conn.email || "guest",
      businessId: args.businessId,
      channel: "email",
      template: "passport_share_back",
      payload: JSON.stringify({
        recipientName: conn.name,
        passportId,
        message: args.message || "Here is my verified Business Passport card.",
      }),
      status: "queued",
      dedupeKey: `share_${conn._id}_${Date.now()}`,
      createdAt: now,
    });

    await ctx.db.patch(args.connectionId, {
      lastContactedAt: now,
      updatedAt: now,
    });

    return notifId;
  },
});
