import { NotificationTemplateKey, renderNotificationTemplate, RenderedTemplate } from "./templates";
import { getSmsProvider, getWhatsAppProvider } from "./providers";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { checkQuietHours } from "./quietHours";
import { canSendChannel, NotificationPrefs } from "./consent";
import { recordDispatchAttempt, checkFailureRateAndAlert } from "./sentryAlerts";

export interface NotifyOptions {
  businessId: string;
  userId: string;
  template: NotificationTemplateKey;
  payload: Record<string, any>;
  channels?: Array<"whatsapp" | "sms" | "email" | "in_app">;
  dedupeKey?: string;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
  userNotificationPrefs?: NotificationPrefs;
  overrideQuietHours?: boolean;
  isUrgent?: boolean;
  testCurrentDate?: Date; // For quiet hours unit tests
}

export interface NotifyResult {
  success: boolean;
  status: "sent" | "fallback_sent" | "failed" | "deduped" | "quiet_hours_delayed" | "opted_out";
  channelUsed?: "whatsapp" | "sms" | "email" | "in_app";
  providerMessageId?: string;
  dedupeKey?: string;
  quietHoursActive?: boolean;
  nextAllowedAt?: Date;
  attempts?: Array<{ channel: string; success: boolean; error?: string }>;
  rendered?: RenderedTemplate;
}

// In-memory set of processed dedupe keys for synchronous/unit test environments
const processedDedupeKeys = new Set<string>();

export function clearDedupeCache(): void {
  processedDedupeKeys.clear();
}

export async function notify(options: NotifyOptions): Promise<NotifyResult> {
  const {
    businessId,
    userId,
    template,
    payload,
    dedupeKey,
    userEmail = "founder@example.com",
    userPhone = "+2348000000000",
    userName = "Founder",
    userNotificationPrefs,
    overrideQuietHours = false,
    isUrgent = false,
    testCurrentDate,
  } = options;

  console.log(`[Notification Engine] Dispatching '${template}' for business ${businessId} (user: ${userId})`);

  // 1. Deduplication check
  const actualDedupeKey = dedupeKey || `${userId}_${template}_${Date.now()}`;
  if (dedupeKey && processedDedupeKeys.has(dedupeKey)) {
    return {
      success: true,
      status: "deduped",
      dedupeKey,
    };
  }

  // 2. Quiet hours check
  const quietCheck = checkQuietHours(testCurrentDate);
  if (quietCheck.isQuiet && !isUrgent && !overrideQuietHours) {
    return {
      success: true,
      status: "quiet_hours_delayed",
      quietHoursActive: true,
      nextAllowedAt: quietCheck.nextAllowedWindowAt,
      dedupeKey: actualDedupeKey,
    };
  }

  // 3. Render notification content
  const rendered = renderNotificationTemplate(template, payload);

  // 4. Candidate channel selection & fallback cascade order
  const defaultCascade: Array<"whatsapp" | "sms" | "email" | "in_app"> = ["whatsapp", "sms", "email", "in_app"];
  const candidateChannels = options.channels && options.channels.length > 0 ? options.channels : defaultCascade;

  // Filter against opt-out preferences
  const allowedChannels = candidateChannels.filter((ch) => canSendChannel(userNotificationPrefs, ch));

  if (allowedChannels.length === 0) {
    return {
      success: false,
      status: "opted_out",
      dedupeKey: actualDedupeKey,
      attempts: [],
    };
  }

  const attempts: Array<{ channel: string; success: boolean; error?: string }> = [];
  let successfulChannel: "whatsapp" | "sms" | "email" | "in_app" | undefined = undefined;
  let providerMessageId: string | undefined = undefined;

  // 5. Execute Fallback Cascade
  for (let i = 0; i < allowedChannels.length; i++) {
    const channel = allowedChannels[i];

    if (channel === "whatsapp") {
      const waProvider = getWhatsAppProvider();
      const res = await waProvider.sendWhatsApp({
        to: userPhone,
        text: rendered.bodyText,
        template,
        parameters: payload,
      });

      attempts.push({ channel, success: res.success, error: res.error });
      recordDispatchAttempt(res.success, "whatsapp");

      if (res.success) {
        successfulChannel = "whatsapp";
        providerMessageId = res.messageId;
        break;
      }
    } else if (channel === "sms") {
      const smsProvider = getSmsProvider();
      const res = await smsProvider.sendSms({
        to: userPhone,
        text: rendered.bodyText,
      });

      attempts.push({ channel, success: res.success, error: res.error });
      recordDispatchAttempt(res.success, "sms");

      if (res.success) {
        successfulChannel = "sms";
        providerMessageId = res.messageId;
        break;
      }
    } else if (channel === "email") {
      const emailRes = await sendTransactionalEmail({
        to: userEmail,
        toName: userName,
        subject: rendered.subject,
        htmlContent: rendered.htmlContent,
        textContent: rendered.bodyText,
      });

      attempts.push({ channel, success: emailRes.success, error: emailRes.success ? undefined : "Email dispatch failed" });
      recordDispatchAttempt(emailRes.success, "email");

      if (emailRes.success) {
        successfulChannel = "email";
        providerMessageId = emailRes.messageId;
        break;
      }
    } else if (channel === "in_app") {
      attempts.push({ channel, success: true });
      recordDispatchAttempt(true, "in_app");
      successfulChannel = "in_app";
      providerMessageId = `inapp-${Date.now()}`;
      break;
    }
  }

  // 6. Check Sentry failure rate monitor
  await checkFailureRateAndAlert();

  if (successfulChannel) {
    if (dedupeKey) {
      processedDedupeKeys.add(dedupeKey);
    }

    const isFallback = attempts.length > 1;
    return {
      success: true,
      status: isFallback ? "fallback_sent" : "sent",
      channelUsed: successfulChannel,
      providerMessageId,
      dedupeKey: actualDedupeKey,
      attempts,
      rendered,
    };
  }

  return {
    success: false,
    status: "failed",
    dedupeKey: actualDedupeKey,
    attempts,
    rendered,
  };
}
