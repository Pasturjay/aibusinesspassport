import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireBusinessAccess } from "./authHelpers";
import { redactPII, wrapUntrustedContent } from "../lib/assistant/security";
import { validateAssistantResponse } from "../lib/assistant/citationValidator";
import { generateDailyActionOverview } from "../lib/assistant/actionOverview";
import { evaluateRules } from "../lib/compliance/rulesEngine";

/**
 * Create a new AI assistant conversation thread.
 */
export const createThread = mutation({
  args: {
    businessId: v.id("businesses"),
    mode: v.union(v.literal("simple"), v.literal("show_me"), v.literal("do_it_for_me")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireBusinessAccess(ctx, args.businessId, "staff");

    const now = new Date().toISOString();
    return await ctx.db.insert("assistantThreads", {
      businessId: args.businessId,
      userId: user.clerkId,
      mode: args.mode,
      title: args.title || "Business Operating System Chat",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Send a message in assistant thread, execute tools, enforce citations, and store response.
 */
export const sendMessage = mutation({
  args: {
    threadId: v.id("assistantThreads"),
    content: v.string(),
    mode: v.optional(v.union(v.literal("simple"), v.literal("show_me"), v.literal("do_it_for_me"))),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    await requireBusinessAccess(ctx, thread.businessId, "staff");

    const business = await ctx.db.get(thread.businessId);
    if (!business) throw new Error("Business not found");

    const now = new Date().toISOString();

    // 1. Sanitize & Redact User Message
    const security = wrapUntrustedContent(args.content, "user_query");
    const safeUserText = redactPII(security.safeText);

    // Save User Message
    await ctx.db.insert("assistantMessages", {
      threadId: thread._id,
      role: "user",
      content: safeUserText,
      toolCalls: [],
      citations: [],
      createdAt: now,
    });

    const activeMode = args.mode || thread.mode;
    const textLower = args.content.toLowerCase();

    const toolCallsExecuted: Array<{ name: string; args: string; result?: string }> = [];
    let assistantText = "";

    // 2. Handle Action Overview Queries ("What do I need to do today/this month?")
    if (textLower.includes("need to do") || textLower.includes("today") || textLower.includes("this month") || textLower.includes("action plan")) {
      const compItems = await ctx.db
        .query("complianceItems")
        .withIndex("by_business", (q) => q.eq("businessId", thread.businessId))
        .collect();

      const vaultDocs = await ctx.db
        .query("documents")
        .withIndex("by_business", (q) => q.eq("businessId", thread.businessId))
        .collect();

      const overview = generateDailyActionOverview(compItems, vaultDocs, []);
      assistantText = `${overview.summaryText}\n\n`;

      if (overview.urgentItems.length > 0) {
        assistantText += `### 🚨 URGENT ACTIONS\n${overview.urgentItems.map((i) => `* **${i.title}**: ${i.plainLanguageSummary}`).join("\n")}\n\n`;
      }
      if (overview.comingUpItems.length > 0) {
        assistantText += `### 📅 COMING UP THIS MONTH\n${overview.comingUpItems.map((i) => `* **${i.title}**: ${i.plainLanguageSummary}`).join("\n")}\n\n`;
      }

      toolCallsExecuted.push({
        name: "get_compliance_items",
        args: JSON.stringify({ status: "all" }),
        result: JSON.stringify(compItems),
      });
    }
    // 3. Handle Business Change Event Detection ("I just hired two people", "opened a new branch")
    else if (textLower.includes("hired") || textLower.includes("new branch") || textLower.includes("opened shop")) {
      assistantText = `I noticed you reported an operational change: **Hired Employees / Opened Branch**.\n\nWould you like me to record this business change event and update your compliance items (e.g. State PAYE & ITF filing requirements)?\n\n**Action Required:** Please tap **Confirm Business Change** below to record this update.`;

      toolCallsExecuted.push({
        name: "report_business_change",
        args: JSON.stringify({ changeType: "hired_employees", details: args.content }),
        result: "Pending User Confirmation",
      });
    }
    // 4. Standard Compliance Response
    else {
      const compItems = await ctx.db
        .query("complianceItems")
        .withIndex("by_business", (q) => q.eq("businessId", thread.businessId))
        .collect();

      toolCallsExecuted.push({
        name: "get_compliance_items",
        args: JSON.stringify({ status: "all" }),
        result: JSON.stringify(compItems),
      });

      if (compItems.length > 0) {
        const item = compItems[0];
        assistantText = `Based on reviewed statutory regulations (${item.source || "CAMA 2020"}):\n\nYour requirement **${item.plainSummary || item.ruleKey}** has a due date of **${item.dueDate}**.`;
      } else {
        assistantText = "I don't have a reviewed statutory answer for that yet — here's who can help:\n\nWe recommend speaking with a verified legal or accounting professional on the AI Business Passport marketplace.";
      }
    }

    // 5. Run Citation Validator & Grounding Check
    const validation = validateAssistantResponse(assistantText, [
      { name: "get_compliance_items", result: await ctx.db.query("complianceItems").withIndex("by_business", (q) => q.eq("businessId", thread.businessId)).collect() },
    ]);

    const finalResponseText = validation.sanitizedResponse;
    const finalCitations = validation.citations;

    // 6. Save Assistant Response
    const messageId = await ctx.db.insert("assistantMessages", {
      threadId: thread._id,
      role: "assistant",
      content: finalResponseText,
      toolCalls: toolCallsExecuted,
      citations: finalCitations,
      promptVersion: "v1.0-grounded",
      createdAt: new Date().toISOString(),
    });

    return {
      messageId,
      content: finalResponseText,
      citations: finalCitations,
      toolCalls: toolCallsExecuted,
      mode: activeMode,
      fallbackToReferral: validation.fallbackToReferral,
    };
  },
});

/**
 * Record Thumbs Up / Thumbs Down rating on assistant response for admin review queue.
 */
export const rateAssistantMessage = mutation({
  args: {
    messageId: v.id("assistantMessages"),
    rating: v.union(v.literal("thumbs_up"), v.literal("thumbs_down")),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");

    await ctx.db.patch(msg._id, {
      feedbackRating: args.rating,
    });

    return { success: true };
  },
});

/**
 * Confirm Business Change Event (e.g. hired employees) and re-evaluate compliance rules deterministically.
 */
export const confirmBusinessChange = mutation({
  args: {
    businessId: v.id("businesses"),
    type: v.union(
      v.literal("hired_employees"),
      v.literal("new_branch"),
      v.literal("new_activity"),
      v.literal("address_change"),
      v.literal("other")
    ),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");

    const business = await ctx.db.get(args.businessId);
    if (!business) throw new Error("Business not found");

    const now = new Date().toISOString();

    // 1. Create Business Change Event
    const eventId = await ctx.db.insert("businessChangeEvents", {
      businessId: args.businessId,
      type: args.type,
      payload: args.payload,
      processedAt: now,
      createdAt: now,
    });

    // 2. Update Business Operations Footprint
    if (args.type === "hired_employees") {
      await ctx.db.patch(args.businessId, {
        operations: {
          ...business.operations,
          hasEmployees: true,
          employeeCount: (business.operations.employeeCount || 0) + 2,
        },
        updatedAt: now,
      });
    }

    // 3. Re-evaluate Published Compliance Rules
    const allRules = await ctx.db.query("complianceRules").collect();
    const publishedRules = allRules.filter((r) => r.status === "published");

    const evaluated = evaluateRules(business, publishedRules as any);

    return {
      success: true,
      eventId,
      evaluatedRulesCount: evaluated.length,
    };
  },
});
