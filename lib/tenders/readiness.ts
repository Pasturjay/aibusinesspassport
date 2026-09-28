import { MatchedRequirement } from "./matcher";

export interface TenderReadinessResult {
  availableCount: number;
  needsPrepCount: number;
  missingCount: number;
  mandatoryMissingCount: number;
  score: number; // 0 - 100
  mandatoryMissingList: MatchedRequirement[];
  todoPriorityList: Array<{
    reqId: string;
    text: string;
    mandatory: boolean;
    action: "upload_document" | "generate_studio" | "accept_risk";
    disqualificationRisk: "HIGH" | "MEDIUM" | "LOW";
  }>;
}

export function calculateTenderReadiness(
  matchedRequirements: MatchedRequirement[],
  deadlineStr?: string,
  currentDate: Date = new Date()
): TenderReadinessResult {
  let availableCount = 0;
  let needsPrepCount = 0;
  let missingCount = 0;

  const mandatoryReqs = matchedRequirements.filter((r) => r.mandatory);
  const optionalReqs = matchedRequirements.filter((r) => !r.mandatory);

  const mandatoryMissingList: MatchedRequirement[] = [];

  for (const r of matchedRequirements) {
    if (r.matchStatus === "available") {
      availableCount++;
    } else if (r.matchStatus === "needs_preparation") {
      needsPrepCount++;
      if (r.mandatory) {
        mandatoryMissingList.push(r);
      }
    } else {
      missingCount++;
      if (r.mandatory) {
        mandatoryMissingList.push(r);
      }
    }
  }

  // Calculate Weighted Score (70% Mandatory, 30% Optional)
  let mandatoryScore = 100;
  if (mandatoryReqs.length > 0) {
    const matchedMandatory = mandatoryReqs.filter((r) => r.matchStatus === "available").length;
    const prepMandatory = mandatoryReqs.filter((r) => r.matchStatus === "needs_preparation").length;
    mandatoryScore = ((matchedMandatory + prepMandatory * 0.5) / mandatoryReqs.length) * 100;
  }

  let optionalScore = 100;
  if (optionalReqs.length > 0) {
    const matchedOptional = optionalReqs.filter((r) => r.matchStatus === "available").length;
    optionalScore = (matchedOptional / optionalReqs.length) * 100;
  }

  let score = Math.round(mandatoryScore * 0.7 + optionalScore * 0.3);
  if (mandatoryMissingList.length > 0 && score > 60) {
    // Heavily cap score if disqualifying mandatory items are missing
    score = Math.min(score, 59);
  }

  // Calculate Deadline Proximity
  let isDeadlineNear = false;
  if (deadlineStr) {
    const deadlineDate = new Date(deadlineStr);
    const daysRemaining = (deadlineDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysRemaining <= 7) {
      isDeadlineNear = true;
    }
  }

  // Build Prioritized To-Do List
  const todoPriorityList = matchedRequirements
    .filter((r) => r.matchStatus !== "available")
    .map((r) => {
      let action: "upload_document" | "generate_studio" | "accept_risk" = "upload_document";

      if (r.category === "submission" || r.text.toLowerCase().includes("profile") || r.text.toLowerCase().includes("capability")) {
        action = "generate_studio";
      } else if (!r.mandatory) {
        action = "accept_risk";
      }

      const disqualificationRisk: "HIGH" | "MEDIUM" | "LOW" = r.mandatory
        ? isDeadlineNear
          ? "HIGH"
          : "MEDIUM"
        : "LOW";

      return {
        reqId: r.id,
        text: r.text,
        mandatory: r.mandatory,
        action,
        disqualificationRisk,
      };
    })
    .sort((a, b) => {
      // Prioritize HIGH risk mandatory items at the top
      if (a.disqualificationRisk === "HIGH" && b.disqualificationRisk !== "HIGH") return -1;
      if (b.disqualificationRisk === "HIGH" && a.disqualificationRisk !== "HIGH") return 1;
      if (a.mandatory && !b.mandatory) return -1;
      if (!a.mandatory && b.mandatory) return 1;
      return 0;
    });

  return {
    availableCount,
    needsPrepCount,
    missingCount,
    mandatoryMissingCount: mandatoryMissingList.length,
    score,
    mandatoryMissingList,
    todoPriorityList,
  };
}
