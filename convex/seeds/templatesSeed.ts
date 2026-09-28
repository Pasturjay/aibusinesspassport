import { mutation } from "../_generated/server";
import { DOCUMENT_TEMPLATES } from "../../lib/documentStudio/templates";

/**
 * Seed all starting v0 document templates into the Convex database.
 */
export const seedTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("templates").collect();
    let seededCount = 0;

    for (const [key, tpl] of Object.entries(DOCUMENT_TEMPLATES)) {
      const match = existing.find((t) => t.key === key && t.version === tpl.version);
      if (!match) {
        await ctx.db.insert("templates", {
          key: tpl.key,
          kind: tpl.kind,
          industry: tpl.industry || "all",
          version: tpl.version,
          structure: JSON.stringify(tpl.sections),
          promptTemplate: tpl.description,
          status: "published",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        seededCount++;
      }
    }

    return { success: true, seededCount, totalTemplates: Object.keys(DOCUMENT_TEMPLATES).length };
  },
});
