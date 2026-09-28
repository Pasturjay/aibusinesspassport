/**
 * Provider interfaces for SMS and WhatsApp multi-channel notifications.
 */

export interface SmsSendOptions {
  to: string; // E.164 formatted phone number (e.g. +2348012345678)
  text: string;
  senderId?: string;
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: "termii" | "africastalking" | "twilio" | "mock";
}

export interface SmsProvider {
  name: "termii" | "africastalking" | "twilio" | "mock";
  sendSms(options: SmsSendOptions): Promise<SmsSendResult>;
}

export interface WhatsAppSendOptions {
  to: string; // E.164 formatted phone number
  text?: string;
  template?: string;
  parameters?: Record<string, string>;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: "termii" | "africastalking" | "twilio" | "mock";
}

export interface WhatsAppProvider {
  name: "termii" | "africastalking" | "twilio" | "mock";
  sendWhatsApp(options: WhatsAppSendOptions): Promise<WhatsAppSendResult>;
}
