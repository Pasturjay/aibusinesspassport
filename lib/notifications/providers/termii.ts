import { SmsProvider, SmsSendOptions, SmsSendResult, WhatsAppProvider, WhatsAppSendOptions, WhatsAppSendResult } from "./types";

export class TermiiSmsAdapter implements SmsProvider {
  name = "termii" as const;

  async sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
    const apiKey = process.env.TERMII_API_KEY;

    if (!apiKey || apiKey.includes("placeholder") || apiKey.includes("mock")) {
      console.log(`[Termii SMS Stub] To: ${options.to} | Text: ${options.text}`);
      return {
        success: true,
        messageId: `termii-sms-stub-${Date.now()}`,
        provider: "termii",
      };
    }

    try {
      const response = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: options.to,
          from: options.senderId || process.env.TERMII_SENDER_ID || "AIPassport",
          sms: options.text,
          type: "plain",
          channel: "generic",
          api_key: apiKey,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `Termii HTTP ${response.status}: ${errText}`,
          provider: "termii",
        };
      }

      const data = await response.json();
      return {
        success: data.message_id ? true : false,
        messageId: data.message_id || data.messageId,
        error: data.message_id ? undefined : data.message || "Failed to dispatch SMS",
        provider: "termii",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || String(err),
        provider: "termii",
      };
    }
  }
}

export class TermiiWhatsAppAdapter implements WhatsAppProvider {
  name = "termii" as const;

  async sendWhatsApp(options: WhatsAppSendOptions): Promise<WhatsAppSendResult> {
    const apiKey = process.env.TERMII_API_KEY;

    if (!apiKey || apiKey.includes("placeholder") || apiKey.includes("mock")) {
      console.log(`[Termii WhatsApp Stub] To: ${options.to} | Text/Template: ${options.text || options.template}`);
      return {
        success: true,
        messageId: `termii-wa-stub-${Date.now()}`,
        provider: "termii",
      };
    }

    try {
      const response = await fetch("https://api.ng.termii.com/api/send/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: options.to,
          device_id: process.env.TERMII_DEVICE_ID || "default",
          template_id: options.template || "default_notification",
          data: options.parameters || { text: options.text || "" },
          api_key: apiKey,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `Termii WA HTTP ${response.status}: ${errText}`,
          provider: "termii",
        };
      }

      const data = await response.json();
      return {
        success: data.message_id ? true : false,
        messageId: data.message_id,
        error: data.message_id ? undefined : data.message || "Failed to send WhatsApp message",
        provider: "termii",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || String(err),
        provider: "termii",
      };
    }
  }
}
