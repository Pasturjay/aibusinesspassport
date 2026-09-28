import { SmsProvider, SmsSendOptions, SmsSendResult, WhatsAppProvider, WhatsAppSendOptions, WhatsAppSendResult } from "./types";

export class TwilioSmsAdapter implements SmsProvider {
  name = "twilio" as const;

  async sendSms(options: SmsSendOptions): Promise<SmsSendResult> {
    console.log(`[Twilio SMS Stub] To: ${options.to} | Text: ${options.text}`);
    return {
      success: true,
      messageId: `twilio-sms-stub-${Date.now()}`,
      provider: "twilio",
    };
  }
}

export class TwilioWhatsAppAdapter implements WhatsAppProvider {
  name = "twilio" as const;

  async sendWhatsApp(options: WhatsAppSendOptions): Promise<WhatsAppSendResult> {
    console.log(`[Twilio WhatsApp Stub] To: ${options.to} | Text: ${options.text}`);
    return {
      success: true,
      messageId: `twilio-wa-stub-${Date.now()}`,
      provider: "twilio",
    };
  }
}
