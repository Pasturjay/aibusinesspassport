import { describe, it, expect, beforeEach } from "vitest";
import path from "path";
import { auditConvexFunctions } from "../scripts/audit-convex-access";
import { encryptField, decryptField } from "../lib/crypto/encryption";
import { scrubPIIFromText, scrubSentryEvent } from "../lib/logging/sentryScrubber";
import { checkRateLimit, clearRateLimitStore } from "../lib/security/rateLimiter";
import { buildDataExportPackage, buildDeletionAuditRecord } from "../lib/privacy/dataRights";
import { isAIGenerationAllowed } from "../lib/llm/costControls";

describe("SEGMENT 18: Hardening & Codebase Security Acceptance Test Suite", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  // ==========================================================================
  // 1. CONVEX ACCESS AUDIT CI CHECK
  // ==========================================================================
  describe("Convex Access Control Audit", () => {
    it("should pass access audit with 0 unprotected Convex functions", () => {
      const convexDir = path.join(process.cwd(), "convex");
      const result = auditConvexFunctions(convexDir);

      expect(result.totalFunctions).toBeGreaterThan(0);
      expect(result.unprotectedFunctions).toEqual([]);
      expect(result.isPassed).toBe(true);
    });
  });

  // ==========================================================================
  // 2. PRIVACY & AES-256-GCM FIELD-LEVEL ENCRYPTION
  // ==========================================================================
  describe("Field-Level Encryption & Key Management", () => {
    it("should encrypt and decrypt sensitive fields (NIN, TIN, Financials) accurately", () => {
      const plainNIN = "22334455667";
      const encrypted = encryptField(plainNIN);

      expect(encrypted.ciphertext).not.toBe(plainNIN);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      const decrypted = decryptField(encrypted);
      expect(decrypted).toBe(plainNIN);
    });
  });

  // ==========================================================================
  // 3. SENTRY PII SCRUBBER
  // ==========================================================================
  describe("Sentry PII Redaction & Log Scrubbing", () => {
    it("should redact NIN, TIN, email, phone, and tokens from log payloads", () => {
      const rawLog = "User NIN 22334455667 with TIN 12345678-0001 email founder@apex.ng phone 08012345678 token sk_test_1234567890abcdef12345";
      const scrubbed = scrubPIIFromText(rawLog);

      expect(scrubbed).not.toContain("22334455667");
      expect(scrubbed).not.toContain("founder@apex.ng");
      expect(scrubbed).not.toContain("08012345678");
      expect(scrubbed).toContain("[REDACTED_NIN]");
      expect(scrubbed).toContain("[REDACTED_EMAIL]");
      expect(scrubbed).toContain("[REDACTED_PHONE]");
    });

    it("should scrub Sentry event breadcrumbs and message fields", () => {
      const event = {
        message: "Failed login for founder@example.com",
        breadcrumbs: [{ message: "Phone input: 08099998888" }],
      };

      const scrubbed = scrubSentryEvent(event);
      expect(scrubbed.message).toContain("[REDACTED_EMAIL]");
      expect(scrubbed.breadcrumbs[0].message).toContain("[REDACTED_PHONE]");
    });
  });

  // ==========================================================================
  // 4. RATE LIMITING & ENUMERATION SHIELD
  // ==========================================================================
  describe("Public Endpoint Rate Limiter & Enumeration Shield", () => {
    it("should allow requests up to limit and block passportId scraping", () => {
      const ip = "192.168.1.100";
      const config = { maxRequests: 5, windowMs: 60000 };

      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit(ip, config);
        expect(res.allowed).toBe(true);
      }

      // 6th request should be blocked
      const blockedRes = checkRateLimit(ip, config);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.resetInMs).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 5. NDPA DATA SUBJECT RIGHTS
  // ==========================================================================
  describe("NDPA Data Subject Rights (Export & Erasure)", () => {
    it("should build comprehensive data export package", () => {
      const business = { _id: "biz-1", legalName: "Apex Zenith Ltd" };
      const docs = [{ _id: "doc-1", fileName: "cac.pdf", category: "registration" }];
      const items = [{ _id: "item-1" }];

      const exportPkg = buildDataExportPackage(business, docs, items);
      expect(exportPkg.legalName).toBe("Apex Zenith Ltd");
      expect(exportPkg.vaultDocumentsList.length).toBe(1);
    });

    it("should build deletion audit record", () => {
      const audit = buildDeletionAuditRecord("biz-1");
      expect(audit.status).toBe("completed");
      expect(audit.recordsPurged).toContain("vault_documents_r2");
    });
  });

  // ==========================================================================
  // 6. AI COST CONTROLS & KILL-SWITCH
  // ==========================================================================
  describe("AI Spend Caps & Emergency Kill-Switch", () => {
    it("should enforce per-business and global AI spend caps", () => {
      // Under cap -> Allowed
      expect(isAIGenerationAllowed(500, 10000).allowed).toBe(true);

      // Over business cap -> Denied
      const bizOver = isAIGenerationAllowed(1500, 10000);
      expect(bizOver.allowed).toBe(false);
      expect(bizOver.reason).toContain("Daily per-business");

      // Over global cap -> Denied
      const globalOver = isAIGenerationAllowed(500, 150000);
      expect(globalOver.allowed).toBe(false);
      expect(globalOver.reason).toContain("Global daily");
    });

    it("should respect emergency kill-switch toggle", () => {
      const killed = isAIGenerationAllowed(0, 0, { killSwitchActive: true });
      expect(killed.allowed).toBe(false);
      expect(killed.reason).toContain("kill-switch");
    });
  });
});
