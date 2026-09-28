import { describe, it, expect, beforeEach } from "vitest";
import { notify, clearDedupeCache } from "@/lib/notifications";
import { checkQuietHours } from "@/lib/notifications/quietHours";
import { isStopKeyword, NotificationPrefs } from "@/lib/notifications/consent";
import { renderNotificationTemplate, NotificationTemplateKey } from "@/lib/notifications/templates";
import { setMockSmsProvider, setMockWhatsAppProvider, getSmsProvider, getWhatsAppProvider } from "@/lib/notifications/providers";
import { resetDispatchHistory, recordDispatchAttempt, checkFailureRateAndAlert } from "@/lib/notifications/sentryAlerts";
import { SmsProvider, WhatsAppProvider } from "@/lib/notifications/providers/types";

describe("SEGMENT 12: Multi-channel Notifications Acceptance Tests", () => {
  beforeEach(() => {
    clearDedupeCache();
    resetDispatchHistory();
    setMockSmsProvider(null);
    setMockWhatsAppProvider(null);
  });

  describe("1. Provider Resolution & Mocking", () => {
    it("resolves default Termii adapters when env is unset", () => {
      delete process.env.SMS_PROVIDER;
      delete process.env.WHATSAPP_PROVIDER;

      const sms = getSmsProvider();
      const wa = getWhatsAppProvider();

      expect(sms.name).toBe("termii");
      expect(wa.name).toBe("termii");
    });

    it("resolves Africa's Talking when configured via env", () => {
      process.env.SMS_PROVIDER = "africastalking";
      process.env.WHATSAPP_PROVIDER = "africastalking";

      const sms = getSmsProvider();
      const wa = getWhatsAppProvider();

      expect(sms.name).toBe("africastalking");
      expect(wa.name).toBe("africastalking");

      // Reset
      delete process.env.SMS_PROVIDER;
      delete process.env.WHATSAPP_PROVIDER;
    });

    it("allows mock providers to be set for testing", async () => {
      const mockSms: SmsProvider = {
        name: "mock",
        sendSms: async () => ({ success: true, messageId: "mock-sms-123", provider: "mock" }),
      };
      setMockSmsProvider(mockSms);

      const sms = getSmsProvider();
      const res = await sms.sendSms({ to: "+2348012345678", text: "Test SMS" });

      expect(res.success).toBe(true);
      expect(res.messageId).toBe("mock-sms-123");
    });
  });

  describe("2. Deduplication Engine (dedupeKey)", () => {
    it("prevents duplicate notifications when same dedupeKey is provided", async () => {
      const dedupeKey = "biz_01_CAC_ANNUAL_RETURNS_30d";
      const dayDate = new Date("2026-09-28T12:00:00Z");

      const firstRes = await notify({
        businessId: "biz_01",
        userId: "user_01",
        template: "compliance_due",
        payload: { title: "CAC Annual Returns", dueDate: "2026-10-31", daysRemaining: 30 },
        dedupeKey,
        channels: ["email"],
        testCurrentDate: dayDate,
      });

      expect(firstRes.success).toBe(true);
      expect(firstRes.status).toBe("sent");

      const secondRes = await notify({
        businessId: "biz_01",
        userId: "user_01",
        template: "compliance_due",
        payload: { title: "CAC Annual Returns", dueDate: "2026-10-31", daysRemaining: 30 },
        dedupeKey,
        channels: ["email"],
        testCurrentDate: dayDate,
      });

      expect(secondRes.success).toBe(true);
      expect(secondRes.status).toBe("deduped");
      expect(secondRes.dedupeKey).toBe(dedupeKey);
    });
  });

  describe("3. Quiet Hours (21:00 - 07:00 WAT Window)", () => {
    it("detects quiet hours at 22:00 WAT (Night)", () => {
      // 21:00 UTC is 22:00 WAT (UTC+1)
      const nightDate = new Date("2026-09-28T21:00:00Z");
      const check = checkQuietHours(nightDate);

      expect(check.isQuiet).toBe(true);
      expect(check.currentHourWAT).toBe(22);
    });

    it("detects active hours at 14:00 WAT (Daytime)", () => {
      // 13:00 UTC is 14:00 WAT (UTC+1)
      const dayDate = new Date("2026-09-28T13:00:00Z");
      const check = checkQuietHours(dayDate);

      expect(check.isQuiet).toBe(false);
      expect(check.currentHourWAT).toBe(14);
    });

    it("delays non-urgent notifications during quiet hours", async () => {
      const nightDate = new Date("2026-09-28T21:00:00Z"); // 22:00 WAT

      const res = await notify({
        businessId: "biz_01",
        userId: "user_01",
        template: "follow_up_reminder",
        payload: { title: "Update Bio", action: "Please review your company bio." },
        testCurrentDate: nightDate,
        isUrgent: false,
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe("quiet_hours_delayed");
      expect(res.quietHoursActive).toBe(true);
      expect(res.nextAllowedAt).toBeDefined();
    });

    it("bypasses quiet hours when isUrgent = true", async () => {
      const nightDate = new Date("2026-09-28T21:00:00Z"); // 22:00 WAT

      const res = await notify({
        businessId: "biz_01",
        userId: "user_01",
        template: "payment_failed",
        payload: { tier: "pro", amount: "₦15,000" },
        testCurrentDate: nightDate,
        isUrgent: true,
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe("sent");
    });
  });

  describe("4. Channel Fallback Cascade (WhatsApp -> SMS -> Email -> In-App)", () => {
    it("falls back to Email when WhatsApp and SMS providers fail", async () => {
      const failingWa: WhatsAppProvider = {
        name: "mock",
        sendWhatsApp: async () => ({ success: false, error: "WA Network Timeout", provider: "mock" }),
      };
      const failingSms: SmsProvider = {
        name: "mock",
        sendSms: async () => ({ success: false, error: "SMS Gateway Error", provider: "mock" }),
      };

      setMockWhatsAppProvider(failingWa);
      setMockSmsProvider(failingSms);

      const dayDate = new Date("2026-09-28T12:00:00Z");

      const res = await notify({
        businessId: "biz_01",
        userId: "user_01",
        template: "document_request_received",
        payload: { requesterName: "Amina Lawal", requesterCompany: "Apex Zenith" },
        channels: ["whatsapp", "sms", "email"],
        testCurrentDate: dayDate,
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe("fallback_sent");
      expect(res.channelUsed).toBe("email");
      expect(res.attempts?.length).toBe(3);
      expect(res.attempts?.[0]).toEqual({ channel: "whatsapp", success: false, error: "WA Network Timeout" });
      expect(res.attempts?.[1]).toEqual({ channel: "sms", success: false, error: "SMS Gateway Error" });
      expect(res.attempts?.[2].channel).toBe("email");
      expect(res.attempts?.[2].success).toBe(true);
    });
  });

  describe("5. Consent & STOP Keyword Opt-Out", () => {
    it("recognizes STOP, UNSUBSCRIBE, and END keywords", () => {
      expect(isStopKeyword("STOP")).toBe(true);
      expect(isStopKeyword(" stop ")).toBe(true);
      expect(isStopKeyword("unsubscribe")).toBe(true);
      expect(isStopKeyword("END")).toBe(true);
      expect(isStopKeyword("Hello World")).toBe(false);
    });

    it("respects user notification preferences and skips disabled channels", async () => {
      const userPrefs: NotificationPrefs = {
        email: true,
        sms: false, // User opted out of SMS
        whatsapp: false, // User opted out of WhatsApp
        inApp: true,
      };

      const dayDate = new Date("2026-09-28T12:00:00Z");

      const res = await notify({
        businessId: "biz_01",
        userId: "user_01",
        template: "compliance_due",
        payload: { title: "FIRS Tax Return", dueDate: "2026-10-31" },
        channels: ["whatsapp", "sms", "email"],
        userNotificationPrefs: userPrefs,
        testCurrentDate: dayDate,
      });

      expect(res.success).toBe(true);
      expect(res.channelUsed).toBe("email");
      // Should not attempt whatsapp or sms because user opted out of both
      expect(res.attempts?.some((a) => a.channel === "whatsapp")).toBe(false);
      expect(res.attempts?.some((a) => a.channel === "sms")).toBe(false);
    });
  });

  describe("6. Zero Private Data in SMS / WhatsApp Templates", () => {
    const templates: NotificationTemplateKey[] = [
      "compliance_due",
      "compliance_overdue",
      "document_expiring",
      "document_request_received",
      "request_decided",
      "follow_up_reminder",
      "payment_failed",
      "welcome",
      "onboarding_abandoned",
    ];

    it("verifies zero private NIN / BVN / sensitive financial numbers in text messages", () => {
      for (const tpl of templates) {
        const rendered = renderNotificationTemplate(tpl, {
          title: "Test Filing",
          dueDate: "2026-12-31",
          legalName: "Acme Nigeria Ltd",
          userName: "Tunde",
          nin: "12345678901",
          bvn: "22233344455",
          accountNumber: "0123456789",
        });

        const textUpper = rendered.bodyText.toUpperCase();

        expect(textUpper).not.toContain("NIN:");
        expect(textUpper).not.toContain("BVN:");
        expect(textUpper).not.toContain("12345678901");
        expect(textUpper).not.toContain("22233344455");
        expect(rendered.bodyText).toContain("https://");
      }
    });
  });

  describe("7. Failure Rate Tracking & Sentry Alerts (>5% over 1 hour)", () => {
    it("triggers Sentry failure rate alert when failure rate exceeds 5%", async () => {
      // Record 19 failures out of 20 attempts = 95% failure rate
      for (let i = 0; i < 19; i++) {
        recordDispatchAttempt(false, "sms");
      }
      recordDispatchAttempt(true, "email");

      const alertResult = await checkFailureRateAndAlert(5);

      expect(alertResult.total).toBe(20);
      expect(alertResult.failures).toBe(19);
      expect(alertResult.failureRate).toBe(0.95); // 95%
      expect(alertResult.alertTriggered).toBe(true);
    });

    it("does not trigger alert when failure rate is below 5%", async () => {
      // Record 20 successful dispatches = 0% failure rate
      for (let i = 0; i < 20; i++) {
        recordDispatchAttempt(true, "sms");
      }

      const alertResult = await checkFailureRateAndAlert(5);

      expect(alertResult.total).toBe(20);
      expect(alertResult.failures).toBe(0);
      expect(alertResult.failureRate).toBe(0);
      expect(alertResult.alertTriggered).toBe(false);
    });
  });
});
