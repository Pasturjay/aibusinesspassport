import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { runAIEvaluations } from "../scripts/run-evals";
import { calculateAITrustMetrics, calculateActivationFunnel } from "../lib/analytics/dashboards";
import { isFeatureEnabledForContext } from "../lib/featureFlags/posthog";

describe("SEGMENT 19: End-to-End Verification & Pilot Launch Acceptance Test Suite", () => {
  // ==========================================================================
  // 1. AI QUALITY GATES CI VERIFICATION
  // ==========================================================================
  describe("AI Quality Gates Evaluation Benchmark", () => {
    it("should meet or exceed all thresholds stored in evals/thresholds.json", () => {
      const fixturesDir = path.join(process.cwd(), "evals", "fixtures");
      const thresholdsPath = path.join(process.cwd(), "evals", "thresholds.json");

      expect(fs.existsSync(fixturesDir)).toBe(true);
      expect(fs.existsSync(thresholdsPath)).toBe(true);

      const evalResults = runAIEvaluations(fixturesDir, thresholdsPath);

      expect(evalResults.passed).toBe(true);
      expect(evalResults.documentClassificationAccuracy).toBeGreaterThanOrEqual(0.95);
      expect(evalResults.extractionFieldAccuracy).toBeGreaterThanOrEqual(0.90);
      expect(evalResults.confidenceCalibration).toBeGreaterThanOrEqual(0.85);
      expect(evalResults.groundingAccuracy).toBeGreaterThanOrEqual(0.95);
      expect(evalResults.tenderExtractionAccuracy).toBeGreaterThanOrEqual(0.90);
    });
  });

  // ==========================================================================
  // 2. ANALYTICS & AI-TRUST DASHBOARDS
  // ==========================================================================
  describe("Analytics & AI-Trust Metrics Engine", () => {
    it("should calculate AI generation failure rate and confidence flag rate accurately", () => {
      const mockGenerations: { status: "success" | "failed" }[] = [
        { status: "success" },
        { status: "success" },
        { status: "success" },
        { status: "failed" },
      ];

      const mockEvaluations = [
        { confidence: 0.95, confirmBeforeFiling: false },
        { confidence: 0.70, confirmBeforeFiling: true }, // Flagged
        { confidence: 0.90, confirmBeforeFiling: false },
      ];

      const metrics = calculateAITrustMetrics(mockGenerations, mockEvaluations);

      expect(metrics.totalGenerations).toBe(4);
      expect(metrics.failedGenerations).toBe(1);
      expect(metrics.aiGenerationFailureRatePct).toBe(25);

      expect(metrics.totalComplianceEvaluations).toBe(3);
      expect(metrics.lowConfidenceFlaggedItems).toBe(1);
      expect(metrics.confidenceFlagRatePct).toBe(33.3);
    });

    it("should calculate activation funnel and conversion metrics", () => {
      const funnel = calculateActivationFunnel(100, 80, 45, 200, 30, 2);

      expect(funnel.onboardingStarted).toBe(100);
      expect(funnel.onboardingCompleted).toBe(80);
      expect(funnel.activationConversionRatePct).toBe(80);
      expect(funnel.freeToPaidConversionRatePct).toBe(15);
    });
  });

  // ==========================================================================
  // 3. POSTHOG FEATURE FLAGS ROLLOUT STAGING
  // ==========================================================================
  describe("Feature Flags Rollout Staging by Tier and City", () => {
    it("should enable tender assistant only for Pro/Pro+ tiers in pilot cities", () => {
      // Pro tier in Lagos -> Enabled
      expect(
        isFeatureEnabledForContext("tender_assistant", { tier: "pro", city: "Lagos" })
      ).toBe(true);

      // Plus tier in Lagos -> Disabled (Requires Pro)
      expect(
        isFeatureEnabledForContext("tender_assistant", { tier: "plus", city: "Lagos" })
      ).toBe(false);

      // Pro tier in Non-pilot city -> Disabled
      expect(
        isFeatureEnabledForContext("tender_assistant", { tier: "pro", city: "UnknownCity" })
      ).toBe(false);
    });
  });

  // ==========================================================================
  // 4. PILOT LAUNCH CHECKLIST (LAUNCH.MD)
  // ==========================================================================
  describe("Pilot Launch Checklist Verification", () => {
    it("should have zero unchecked blocking items in docs/LAUNCH.md", () => {
      const launchPath = path.join(process.cwd(), "docs", "LAUNCH.md");
      expect(fs.existsSync(launchPath)).toBe(true);

      const content = fs.readFileSync(launchPath, "utf-8");

      // Verify no unchecked [BLOCKING] items exist
      const uncheckedBlocking = content
        .split("\n")
        .filter((line) => line.includes("[BLOCKING]") && line.includes("- [ ]"));

      expect(uncheckedBlocking).toEqual([]);
      expect(content).toContain("[BLOCKING] Compliance Rules Expert Review");
      expect(content).toContain("[BLOCKING] Legal Policy Review");
    });
  });
});
