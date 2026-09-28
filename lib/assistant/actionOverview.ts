/**
 * Daily / Monthly Action Overview Generator ("What do I need to do today/this month?") (Story G1).
 * Combines complianceItems + Vault health + pending requests, ranked by urgency.
 */

export interface ActionItem {
  id: string;
  category: "compliance" | "vault" | "request";
  urgency: "URGENT" | "COMING_UP" | "RECOMMENDED";
  title: string;
  dueDate?: string;
  daysRemaining?: number;
  plainLanguageSummary: string;
  actionUrl: string;
}

export interface DailyActionOverviewResult {
  urgentItems: ActionItem[];
  comingUpItems: ActionItem[];
  recommendedItems: ActionItem[];
  totalActionsCount: number;
  summaryText: string;
}

export function generateDailyActionOverview(
  complianceItems: Array<Record<string, any>> = [],
  vaultDocuments: Array<Record<string, any>> = [],
  pendingRequests: Array<Record<string, any>> = [],
  currentDate: Date = new Date()
): DailyActionOverviewResult {
  const urgentItems: ActionItem[] = [];
  const comingUpItems: ActionItem[] = [];
  const recommendedItems: ActionItem[] = [];

  // 1. Process Compliance Items
  for (const item of complianceItems) {
    const title = item.title || item.ruleKey || "Statutory Filing";
    const dueDateStr = item.dueDate || "soon";
    const expTime = item.dueDate ? new Date(item.dueDate).getTime() : currentDate.getTime();
    const daysRemaining = Math.ceil((expTime - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (item.status === "needs_attention" || daysRemaining <= 0) {
      urgentItems.push({
        id: item._id || item.id || `comp_${title}`,
        category: "compliance",
        urgency: "URGENT",
        title,
        dueDate: dueDateStr,
        daysRemaining,
        plainLanguageSummary: daysRemaining <= 0
          ? `OVERDUE: ${title} was due on ${dueDateStr}. File now to avoid penalties.`
          : `URGENT: ${title} is due in ${daysRemaining} day(s) on ${dueDateStr}.`,
        actionUrl: `/dashboard?focus=${item._id || ""}`,
      });
    } else if (daysRemaining <= 30) {
      comingUpItems.push({
        id: item._id || item.id || `comp_${title}`,
        category: "compliance",
        urgency: "COMING_UP",
        title,
        dueDate: dueDateStr,
        daysRemaining,
        plainLanguageSummary: `${title} is due on ${dueDateStr} (${daysRemaining} days remaining).`,
        actionUrl: `/dashboard?focus=${item._id || ""}`,
      });
    }
  }

  // 2. Process Vault Documents Health
  for (const doc of vaultDocuments) {
    if (doc.expiresAt) {
      const expTime = new Date(doc.expiresAt).getTime();
      const daysRemaining = Math.ceil((expTime - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 7) {
        urgentItems.push({
          id: doc._id || doc.id || `vault_${doc.fileName}`,
          category: "vault",
          urgency: "URGENT",
          title: `Document Expiring: ${doc.fileName}`,
          dueDate: doc.expiresAt,
          daysRemaining,
          plainLanguageSummary: `Your document '${doc.fileName}' expires on ${doc.expiresAt}. Upload renewal copy.`,
          actionUrl: "/vault",
        });
      } else if (daysRemaining <= 30) {
        comingUpItems.push({
          id: doc._id || doc.id || `vault_${doc.fileName}`,
          category: "vault",
          urgency: "COMING_UP",
          title: `Document Expiring Soon: ${doc.fileName}`,
          dueDate: doc.expiresAt,
          daysRemaining,
          plainLanguageSummary: `'${doc.fileName}' set to expire on ${doc.expiresAt}.`,
          actionUrl: "/vault",
        });
      }
    }
  }

  // 3. Process Pending Profile Requests
  for (const req of pendingRequests) {
    if (req.status === "pending") {
      recommendedItems.push({
        id: req._id || req.id || `req_${req.requesterName}`,
        category: "request",
        urgency: "RECOMMENDED",
        title: `Profile Request from ${req.requesterName || "Partner"}`,
        plainLanguageSummary: `${req.requesterName || "A partner"} from ${req.requesterCompany || "a company"} requested your Business Passport.`,
        actionUrl: "/requests",
      });
    }
  }

  const totalActionsCount = urgentItems.length + comingUpItems.length + recommendedItems.length;

  let summaryText = "";
  if (totalActionsCount === 0) {
    summaryText = "Your business is 100% up to date! You have zero urgent compliance tasks, expiring documents, or pending requests today.";
  } else {
    summaryText = `Here is your action plan for today:\n- ${urgentItems.length} Urgent Task(s)\n- ${comingUpItems.length} Task(s) Coming Up\n- ${recommendedItems.length} Recommended Action(s)`;
  }

  return {
    urgentItems,
    comingUpItems,
    recommendedItems,
    totalActionsCount,
    summaryText,
  };
}
