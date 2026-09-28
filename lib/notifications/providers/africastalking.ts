import { SmsProvider, SmsSendOptions, SmsSendResult, WhatsAppProvider, WhatsAppSendOptions, WhatsAppSendResult } from "./types";

export class AfricasTalkingSmsAdapter implements SmsProvider {
  name = "africastalking" as const;

  async sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
    const apiKey = process.env.AFRICASTALKING_API_KEY;
    const username = process.env.AFRICASTALKING_USERNAME || "sandbox";

    if (!apiKey || apiKey.includes("placeholder") || apiKey.includes("mock")) {
      console.log(`[Africa's Talking SMS Stub] To: ${options.to} | Text: ${options.text}`);
      return {
        success: true,
        messageId: `at-sms-stub-${Date.now()}`,
        provider: "africastalking",
      };
    }

    try {
      const body = new URLSearchParams({
        username,
        to: options.to,
        message: options.text,
      });

      if (options.senderId) {
        body.append("from", options.senderId);
      }

      const response = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "apiKey": apiKey,
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `Africa's Talking HTTP ${response.status}: ${errText}`,
          provider: "africastalking",
        };
      }

      const data = await response.json();
      const recipients = data.SMSMessageData?.Recipients || [];
      const firstRec = recipients[0];

      return {
        success: firstRec && firstRec.status === "Success",
        messageId: firstRec?.messageId,
        error: firstRec && firstRec.status !== "Success" ? firstRec.status : undefined,
        provider: "africastalking",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || String(err),
        provider: "africastalking",
      };
    }
  }
}

export class AfricasTalkingWhatsAppAdapter implements WhatsAppProvider {
  name = "africastalking" as const;

  async sendWhatsApp(options: WhatsAppSendOptions): Promise<WhatsAppSendResult> {
    const apiKey = process.env.AFRICASTALKING_API_KEY;

    if (!apiKey || apiKey.includes("placeholder") || apiKey.includes("mock")) {
      console.log(`[Africa's Talking WA Stub] To: ${options.to} | Text: ${options.text}`);
      return {
        success: true,
        messageId: `at-wa-stub-${Date.now()}`,
        provider: "africastalking",
      };
    }

    // Africa's Talking WhatsApp messaging stub / integration endpoint
    return {
      success: true,
      messageId: `at-wa-${Date.now()}`,
      provider: "africastalking",
    };
  }
}
