import { SmsProvider, WhatsAppProvider } from "./types";
import { TermiiSmsAdapter, TermiiWhatsAppAdapter } from "./termii";
import { AfricasTalkingSmsAdapter, AfricasTalkingWhatsAppAdapter } from "./africastalking";
import { TwilioSmsAdapter, TwilioWhatsAppAdapter } from "./twilio";

let mockSmsProvider: SmsProvider | null = null;
let mockWhatsAppProvider: WhatsAppProvider | null = null;

export function setMockSmsProvider(provider: SmsProvider | null): void {
  mockSmsProvider = provider;
}

export function setMockWhatsAppProvider(provider: WhatsAppProvider | null): void {
  mockWhatsAppProvider = provider;
}

export function getSmsProvider(): SmsProvider {
  if (mockSmsProvider) return mockSmsProvider;

  const providerName = (process.env.SMS_PROVIDER || "termii").toLowerCase();

  switch (providerName) {
    case "africastalking":
      return new AfricasTalkingSmsAdapter();
    case "twilio":
      return new TwilioSmsAdapter();
    case "termii":
    default:
      return new TermiiSmsAdapter();
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  if (mockWhatsAppProvider) return mockWhatsAppProvider;

  const providerName = (process.env.WHATSAPP_PROVIDER || "termii").toLowerCase();

  switch (providerName) {
    case "africastalking":
      return new AfricasTalkingWhatsAppAdapter();
    case "twilio":
      return new TwilioWhatsAppAdapter();
    case "termii":
    default:
      return new TermiiWhatsAppAdapter();
  }
}
