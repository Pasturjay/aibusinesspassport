import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { t, setLocale, getLocale } from "../lib/i18n";
import { analyzeReadingLevel, countSyllables, calculateFleschKincaid } from "../scripts/check-reading-level";
import { isLowBandwidth } from "../lib/utils/network";
import { ResumableUploader } from "../lib/utils/resumableUpload";
import sitemap from "../app/sitemap";

describe("SEGMENT 17: Public Site & Delivery Quality Acceptance Test Suite", () => {
  // ==========================================================================
  // 1. GA4 ANALYTICS ROUTE ENFORCEMENT
  // ==========================================================================
  describe("GA4 Script Route Scope Verification", () => {
    it("should include GoogleAnalytics ONLY in marketing layout and ABSENT from (app) layout", () => {
      const marketingLayoutPath = path.join(process.cwd(), "app", "(marketing)", "layout.tsx");
      const appLayoutPath = path.join(process.cwd(), "app", "(app)", "layout.tsx");

      const marketingContent = fs.readFileSync(marketingLayoutPath, "utf-8");
      const appContent = fs.readFileSync(appLayoutPath, "utf-8");

      // GA4 present on marketing layout
      expect(marketingContent).toContain("GoogleAnalytics");

      // GA4 STRICTLY ABSENT from app layout
      expect(appContent).not.toContain("GoogleAnalytics");
      expect(appContent).not.toContain("gtag");
      expect(appContent).not.toContain("NEXT_PUBLIC_GA4_MEASUREMENT_ID");
    });
  });

  // ==========================================================================
  // 2. PWA MANIFEST, SERVICE WORKER & OFFLINE FALLBACK
  // ==========================================================================
  describe("PWA Infrastructure Verification", () => {
    it("should have a valid web app manifest.json", () => {
      const manifestPath = path.join(process.cwd(), "public", "manifest.json");
      expect(fs.existsSync(manifestPath)).toBe(true);

      const content = fs.readFileSync(manifestPath, "utf-8");
      const json = JSON.parse(content);

      expect(json.name).toBe("AI Business Passport");
      expect(json.display).toBe("standalone");
      expect(json.start_url).toBe("/");
    });

    it("should have a Service Worker with caching and offline fallback handling", () => {
      const swPath = path.join(process.cwd(), "public", "sw.js");
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, "utf-8");
      expect(swContent).toContain("passport-cache-v1");
      expect(swContent).toContain("offline.html");
      expect(swContent).toContain("BACKGROUND_SYNC_UPLOADS");
    });

    it("should have an offline.html fallback page", () => {
      const offlinePath = path.join(process.cwd(), "public", "offline.html");
      expect(fs.existsSync(offlinePath)).toBe(true);

      const content = fs.readFileSync(offlinePath, "utf-8");
      expect(content).toContain("You are currently offline");
      expect(content).toContain("AI Business Passport");
    });
  });

  // ==========================================================================
  // 3. ACCESSIBILITY & PLAIN-LANGUAGE READING LEVEL
  // ==========================================================================
  describe("Plain-Language Reading Level Checker", () => {
    it("should calculate syllables and Flesch-Kincaid grade level accurately", () => {
      expect(countSyllables("business")).toBeGreaterThanOrEqual(2);
      expect(countSyllables("compliance")).toBeGreaterThanOrEqual(2);

      const fkgl = calculateFleschKincaid(100, 5, 150);
      expect(fkgl).toBeGreaterThan(0);
      expect(Number.isFinite(fkgl)).toBe(true);
    });

    it("should flag complex sentences above target grade level", () => {
      const plainText = "Tell us about your business once. Keep your documents compliant.";
      const analysis = analyzeReadingLevel(plainText, 8);

      expect(analysis.isCompliant).toBe(true);
      expect(analysis.gradeLevel).toBeLessThanOrEqual(8);

      const complexText = "Notwithstanding statutory obligations pursuant to section 402 of the Companies and Allied Matters Act, any non-compliant corporate entity shall incur cumulative administrative monetary penalties.";
      const complexAnalysis = analyzeReadingLevel(complexText, 8);

      expect(complexAnalysis.isCompliant).toBe(false);
      expect(complexAnalysis.flaggedSentences.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 4. i18n TRANSLATIONS & DIALECT SCAFFOLDING
  // ==========================================================================
  describe("i18n Message Catalog & Interpolation", () => {
    it("should translate keys with fallback to en-NG", () => {
      setLocale("en-NG");
      expect(getLocale()).toBe("en-NG");

      expect(t("app.title")).toBe("AI Business Passport");
      expect(t("hero.tagline")).toContain("Tell us about your business once");

      // Pidgin translation
      expect(t("hero.subheading", undefined, "pcm-NG")).toContain("Naija AI business passport");

      // Fallback test for missing key in Yoruba
      expect(t("pillars.compliance.title", undefined, "yo-NG")).toBe("Deterministic Compliance");
    });
  });

  // ==========================================================================
  // 5. LOW-BANDWIDTH & SEO UTILITIES
  // ==========================================================================
  describe("Low-Bandwidth & SEO Utilities", () => {
    it("should calculate chunked resumable upload bounds correctly", () => {
      expect(typeof isLowBandwidth()).toBe("boolean");
      const dummyFile = new File(["a".repeat(1024 * 1024)], "test.pdf", { type: "application/pdf" });
      const uploader = new ResumableUploader(dummyFile, { chunkSizeBytes: 256 * 1024 });

      // 1MB file / 256KB chunk = 4 chunks
      expect(uploader.getTotalChunks()).toBe(4);
      expect(uploader.getChunk(0).size).toBe(256 * 1024);
    });

    it("should generate dynamic sitemap routes", () => {
      const routes = sitemap();
      expect(routes.length).toBeGreaterThanOrEqual(4);

      const urls = routes.map((r) => r.url);
      expect(urls).toContain("https://app.aibusinesspassport.ng");
      expect(urls).toContain("https://app.aibusinesspassport.ng/trust");
    });
  });
});
