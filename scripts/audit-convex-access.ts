/**
 * Convex Functions Access Control Audit Script.
 * Asserts every Convex function calls requireUser/requireBusinessAccess/requireAdminUser or is explicitly whitelisted as public with a reason.
 * Fails CI (exit code 1) if an unlisted function is detected.
 */

import fs from "fs";
import path from "path";

export interface PublicWhitelistEntry {
  functionName: string;
  reason: string;
}

export const PUBLIC_WHITELIST: Record<string, PublicWhitelistEntry> = {
  "passports.getPublic": {
    functionName: "passports.getPublic",
    reason: "Public Passport profile resolver endpoint with field-level visibility filtering",
  },
  "passports.recordPassportScan": {
    functionName: "passports.recordPassportScan",
    reason: "Public telemetry endpoint for recording QR/NFC/link scan events",
  },
  "requests.submitPublicRequest": {
    functionName: "requests.submitPublicRequest",
    reason: "Public profile request submission endpoint protected by email OTP & rate limiter",
  },
  "requests.createDocumentRequest": {
    functionName: "requests.createDocumentRequest",
    reason: "Public profile request form endpoint",
  },
  "requests.getSharedPackageByToken": {
    functionName: "requests.getSharedPackageByToken",
    reason: "Token-gated package download endpoint verified against token hash and max download limit",
  },
  "requests.recordPackageDownload": {
    functionName: "requests.recordPackageDownload",
    reason: "Token-gated package download counter logger",
  },
  "seedComplianceRules.seedRules": {
    functionName: "seedComplianceRules.seedRules",
    reason: "Database initial seeding function executed during setup",
  },
  "seedComplianceRules.seedPlaceholderRules": {
    functionName: "seedComplianceRules.seedPlaceholderRules",
    reason: "Database placeholder rules seeding helper",
  },
  "users.syncUser": {
    functionName: "users.syncUser",
    reason: "Clerk webhook user synchronization endpoint",
  },
  "users.upsertUserFromWebhook": {
    functionName: "users.upsertUserFromWebhook",
    reason: "Clerk webhook user upsert endpoint",
  },
  "users.deleteUserFromWebhook": {
    functionName: "users.deleteUserFromWebhook",
    reason: "Clerk webhook user deletion endpoint",
  },
  "subscriptions.updatePlan": {
    functionName: "subscriptions.updatePlan",
    reason: "Paystack webhook subscription status update endpoint",
  },
  "notifications.getByDedupeKey": {
    functionName: "notifications.getByDedupeKey",
    reason: "Internal notification deduplication query",
  },
  "notifications.recordNotification": {
    functionName: "notifications.recordNotification",
    reason: "Internal notification dispatch logger",
  },
  "notifications.optOutByPhone": {
    functionName: "notifications.optOutByPhone",
    reason: "Public SMS STOP keyword opt-out webhook handler",
  },
  "documents.updateDocumentIntelligenceResult": {
    functionName: "documents.updateDocumentIntelligenceResult",
    reason: "Inngest document intelligence pipeline callback endpoint",
  },
};

export interface AuditResult {
  totalFunctions: number;
  protectedFunctions: number;
  whitelistedPublicFunctions: number;
  unprotectedFunctions: string[];
  isPassed: boolean;
}

export function auditConvexFunctions(convexDir: string): AuditResult {
  const unprotectedFunctions: string[] = [];
  let totalFunctions = 0;
  let protectedFunctions = 0;
  let whitelistedPublicFunctions = 0;

  const files = fs.readdirSync(convexDir).filter((f) => {
    return (
      f.endsWith(".ts") &&
      !f.startsWith("_") &&
      f !== "schema.ts" &&
      f !== "auth.config.ts"
    );
  });

  for (const file of files) {
    const filePath = path.join(convexDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const moduleName = file.replace(".ts", "");

    // Regex to match exported queries/mutations/actions
    const fnRegex = /export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*(query|mutation|action)/g;
    let match: RegExpExecArray | null;

    while ((match = fnRegex.exec(content)) !== null) {
      totalFunctions++;
      const fnName = match[1];
      const fullFnKey = `${moduleName}.${fnName}`;

      // Extract function body block (sufficient slice size for long schema args)
      const fnStartIndex = match.index;
      const fnBlock = content.slice(fnStartIndex, fnStartIndex + 15000);

      const isProtected =
        fnBlock.includes("requireUser") ||
        fnBlock.includes("requireBusinessAccess") ||
        fnBlock.includes("requireAdminUser") ||
        fnBlock.includes("internalQuery") ||
        fnBlock.includes("internalMutation");

      if (isProtected) {
        protectedFunctions++;
      } else if (PUBLIC_WHITELIST[fullFnKey]) {
        whitelistedPublicFunctions++;
      } else {
        unprotectedFunctions.push(fullFnKey);
      }
    }
  }

  return {
    totalFunctions,
    protectedFunctions,
    whitelistedPublicFunctions,
    unprotectedFunctions,
    isPassed: unprotectedFunctions.length === 0,
  };
}

// CLI Execution
if (require.main === module) {
  const convexDir = path.join(process.cwd(), "convex");
  const result = auditConvexFunctions(convexDir);

  console.log("=== Convex Access Audit Report ===");
  console.log(`Total Convex Functions Analyzed: ${result.totalFunctions}`);
  console.log(`Protected Functions (RBAC): ${result.protectedFunctions}`);
  console.log(`Whitelisted Public Functions: ${result.whitelistedPublicFunctions}`);

  if (!result.isPassed) {
    console.error("\n❌ ACCESS AUDIT FAILED: Unprotected Convex functions detected!");
    result.unprotectedFunctions.forEach((fn) => console.error(` - ${fn}`));
    process.exit(1);
  } else {
    console.log("\n✅ ACCESS AUDIT PASSED: All Convex functions are secured!");
  }
}
