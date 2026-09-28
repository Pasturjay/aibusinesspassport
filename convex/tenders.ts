import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireBusinessAccess } from "./authHelpers";
import { extractTenderRequirements } from "../lib/tenders/extractor";
import { matchRequirementsAgainstBusinessData } from "../lib/tenders/matcher";
import { calculateTenderReadiness } from "../lib/tenders/readiness";

/**
 * Process uploaded tender document, extract requirements, run matching, and save record.
 */
export const createTenderFromDocument = mutation({
  args: {
    businessId: v.id("businesses"),
    sourceDocumentId: v.id("documents"),
    documentText: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireBusinessAccess(ctx, args.businessId, "staff");

    const business = await ctx.db.get(args.businessId);
    if (!business) throw new Error("Business not found");

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_business", (q) => q.eq("businessId", args.businessId))
      .collect();

    // 1. Requirement Extraction
    const extraction = await extractTenderRequirements(args.documentText, args.fileName);

    // 2. Matching against Brain & Vault
    const matchedReqs = matchRequirementsAgainstBusinessData(
      extraction.requirements,
      business,
      docs
    );

    // 3. Readiness Calculation
    const readinessResult = calculateTenderReadiness(matchedReqs, extraction.deadline);

    const now = new Date().toISOString();

    const tenderId = await ctx.db.insert("tenders", {
      businessId: args.businessId,
      sourceDocumentId: args.sourceDocumentId,
      title: extraction.title,
      issuer: extraction.issuer,
      deadline: extraction.deadline,
      extractionStatus: "parsed",
      extractionConfidence: extraction.overallConfidence,
      requirements: matchedReqs.map((r) => ({
        id: r.id,
        category: r.category,
        text: r.text,
        mandatory: r.mandatory,
        matchStatus: r.matchStatus,
        matchedDocumentId: r.matchedDocumentId ? (r.matchedDocumentId as any) : undefined,
        matchedBrainPath: r.matchedBrainPath,
        confidence: r.matchConfidence,
        sourcePageRef: r.sourcePageRef,
      })),
      readiness: {
        available: readinessResult.availableCount,
        needsPrep: readinessResult.needsPrepCount,
        missing: readinessResult.missingCount,
        score: readinessResult.score,
        mandatoryMissing: readinessResult.mandatoryMissingCount,
      },
      unparsedSections: extraction.unparsedSections,
      acceptedRiskReqIds: [],
      createdAt: now,
      updatedAt: now,
    });

    return { tenderId, title: extraction.title, readiness: readinessResult };
  },
});

/**
 * Accept a non-mandatory requirement gap as a known risk.
 */
export const acceptKnownRisk = mutation({
  args: {
    tenderId: v.id("tenders"),
    reqId: v.string(),
  },
  handler: async (ctx, args) => {
    const tender = await ctx.db.get(args.tenderId);
    if (!tender) throw new Error("Tender record not found");

    await requireBusinessAccess(ctx, tender.businessId, "staff");

    const currentRisks = tender.acceptedRiskReqIds || [];
    if (!currentRisks.includes(args.reqId)) {
      const updatedRisks = [...currentRisks, args.reqId];
      await ctx.db.patch(tender._id, {
        acceptedRiskReqIds: updatedRisks,
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true };
  },
});

/**
 * Query full tender details with requirements, readiness, and mandatory missing list.
 */
export const getTenderDetails = query({
  args: {
    tenderId: v.id("tenders"),
  },
  handler: async (ctx, args) => {
    const tender = await ctx.db.get(args.tenderId);
    if (!tender) throw new Error("Tender record not found");

    await requireBusinessAccess(ctx, tender.businessId, "staff");

    const mandatoryMissing = tender.requirements.filter(
      (r) => r.mandatory && r.matchStatus !== "available"
    );

    return {
      tender,
      mandatoryMissing,
      unparsedSectionsCount: tender.unparsedSections.length,
    };
  },
});
