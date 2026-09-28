/**
 * AI Business Passport - Deterministic Statutory Compliance Rules Engine
 * 
 * Non-Negotiable Principle #2:
 * NO LLM in the decision path! Regulatory compliance is 100% deterministic,
 * evaluated via predicate DSL over the Business Brain schema.
 */

export type Predicate =
  | { all: Predicate[] }
  | { any: Predicate[] }
  | { not: Predicate }
  | { path: string; equals: any }
  | { path: string; in: any[] }
  | { path: string; gt: number }
  | { path: string; lt: number }
  | { path: string; exists: boolean };

export interface RuleRecurrence {
  frequency: string; // "annual" | "monthly" | "event_triggered"
  dueDateRule: string; // e.g. "FIXED:06-30", "MONTHS_AFTER_REG:6", "DAYS_AFTER_EVENT:30"
}

export interface RuleSource {
  name: string;
  url?: string;
}

export interface ComplianceRuleData {
  ruleKey: string;
  version: number;
  title: string;
  plainLanguageSummary: string;
  appliesWhen: Predicate | string; // JSON predicate DSL
  obligationType: string;
  recurrence: RuleRecurrence;
  jurisdiction: string;
  agency: string;
  steps: Array<{ title: string; description: string; link?: string }>;
  estimatedCost?: string;
  source: RuleSource;
  effectiveDate: string;
  lastReviewedAt: string;
  reviewedBy: string;
  status: "draft" | "in_review" | "published" | "retired";
  confidenceIfMatched: number;
}

export interface EvaluatedComplianceItem {
  ruleKey: string;
  ruleVersion: number;
  title: string;
  plainSummary: string;
  status: "needs_attention" | "coming_up" | "completed" | "potentially_applicable" | "needs_review" | "verified";
  dueDate: string;
  source: string;
  lastReviewedAt: string;
  effectiveDate: string;
  confidence: number;
  confirmBeforeFiling: boolean;
  staleRule: boolean;
}

/**
 * Resolves dot-notation JSON paths against Business Brain objects.
 */
export function getByPath(obj: any, pathStr: string): any {
  if (!obj || !pathStr) return undefined;
  const parts = pathStr.split(".");
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[part];
  }
  return curr;
}

/**
 * Evaluates predicate DSL deterministically.
 */
export function evaluatePredicate(predicate: Predicate | string, brainSnapshot: any): boolean {
  if (typeof predicate === "string") {
    try {
      predicate = JSON.parse(predicate) as Predicate;
    } catch {
      return false;
    }
  }

  if ("all" in predicate) {
    return predicate.all.every((p) => evaluatePredicate(p, brainSnapshot));
  }
  if ("any" in predicate) {
    return predicate.any.some((p) => evaluatePredicate(p, brainSnapshot));
  }
  if ("not" in predicate) {
    return !evaluatePredicate(predicate.not, brainSnapshot);
  }

  const val = getByPath(brainSnapshot, predicate.path);

  if ("equals" in predicate) {
    return val === predicate.equals;
  }
  if ("in" in predicate) {
    return Array.isArray(predicate.in) && predicate.in.includes(val);
  }
  if ("gt" in predicate) {
    return typeof val === "number" && val > predicate.gt;
  }
  if ("lt" in predicate) {
    return typeof val === "number" && val < predicate.lt;
  }
  if ("exists" in predicate) {
    const exists = val !== undefined && val !== null && val !== "";
    return predicate.exists ? exists : !exists;
  }

  return false;
}

/**
 * Computes deterministic statutory due dates.
 */
export function computeDueDate(
  dueDateRule: string,
  brainSnapshot: any,
  eventDate?: string,
  currentYear: number = new Date().getFullYear()
): string {
  if (!dueDateRule) return `${currentYear}-12-31`;

  if (dueDateRule.startsWith("FIXED:")) {
    const monthDay = dueDateRule.replace("FIXED:", ""); // e.g. "06-30"
    return `${currentYear}-${monthDay}`;
  }

  if (dueDateRule.startsWith("MONTHS_AFTER_REG:")) {
    const months = parseInt(dueDateRule.replace("MONTHS_AFTER_REG:", ""), 10) || 6;
    const yearFounded = brainSnapshot?.identity?.yearFounded || currentYear;
    const regDate = new Date(`${yearFounded}-01-01`);
    regDate.setMonth(regDate.getMonth() + months);
    return regDate.toISOString().split("T")[0];
  }

  if (dueDateRule.startsWith("DAYS_AFTER_EVENT:")) {
    const days = parseInt(dueDateRule.replace("DAYS_AFTER_EVENT:", ""), 10) || 30;
    const baseDate = eventDate ? new Date(eventDate) : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    return baseDate.toISOString().split("T")[0];
  }

  return `${currentYear}-12-31`;
}

/**
 * Core Rules Engine Execution Entry Point.
 */
export function evaluateRules(
  brainSnapshot: any,
  rules: ComplianceRuleData[],
  staleThresholdDays: number = 180,
  eventContext?: { type: string; eventDate?: string }
): EvaluatedComplianceItem[] {
  const results: EvaluatedComplianceItem[] = [];
  const now = new Date();

  for (const rule of rules) {
    // 1. Only published rules run (unless in test mode)
    if (rule.status !== "published") {
      continue;
    }

    // 2. Evaluate predicate DSL
    const isMatched = evaluatePredicate(rule.appliesWhen, brainSnapshot);
    if (!isMatched) {
      continue;
    }

    // 3. Compute statutory due date
    const dueDate = computeDueDate(rule.recurrence.dueDateRule, brainSnapshot, eventContext?.eventDate);
    const dueTime = new Date(dueDate).getTime();
    const daysUntilDue = Math.ceil((dueTime - now.getTime()) / (1000 * 60 * 60 * 24));

    // 4. Stale Rule Guard Check (lastReviewedAt > 180 days)
    const lastReviewedTime = new Date(rule.lastReviewedAt).getTime();
    const daysSinceReview = Math.floor((now.getTime() - lastReviewedTime) / (1000 * 60 * 60 * 24));
    const isStale = daysSinceReview > staleThresholdDays;

    // 5. Determine plain-language status
    let status: EvaluatedComplianceItem["status"] = "coming_up";
    let confirmBeforeFiling = rule.confidenceIfMatched < 0.9;

    if (isStale) {
      status = "needs_review";
      confirmBeforeFiling = true; // Stale rule forces confirmBeforeFiling = true
    } else if (daysUntilDue <= 14) {
      status = "needs_attention";
    } else if (daysUntilDue <= 90) {
      status = "coming_up";
    } else {
      status = "potentially_applicable";
    }

    results.push({
      ruleKey: rule.ruleKey,
      ruleVersion: rule.version,
      title: rule.title,
      plainSummary: rule.plainLanguageSummary,
      status,
      dueDate,
      source: rule.source.name,
      lastReviewedAt: rule.lastReviewedAt,
      effectiveDate: rule.effectiveDate,
      confidence: rule.confidenceIfMatched,
      confirmBeforeFiling,
      staleRule: isStale,
    });
  }

  return results;
}
