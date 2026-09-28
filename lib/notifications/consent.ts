/**
 * Consent and Opt-In / Opt-Out Manager for Multi-Channel Notifications.
 * Handles STOP keyword processing and channel preference checking.
 */

export interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  inApp: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: true,
  sms: true,
  whatsapp: true,
  inApp: true,
};

/**
 * Checks if incoming text is an opt-out keyword like "STOP", "UNSUBSCRIBE", or "END".
 */
export function isStopKeyword(text: string): boolean {
  if (!text) return false;
  const clean = text.trim().toUpperCase();
  return clean === "STOP" || clean === "UNSUBSCRIBE" || clean === "END" || clean === "CANCEL" || clean === "QUIT";
}

/**
 * Validates whether a notification can be sent on a given channel based on user preferences.
 */
export function canSendChannel(
  prefs: NotificationPrefs | undefined,
  channel: "email" | "sms" | "whatsapp" | "in_app"
): boolean {
  const currentPrefs = prefs || DEFAULT_NOTIFICATION_PREFS;

  switch (channel) {
    case "email":
      return currentPrefs.email !== false;
    case "sms":
      return currentPrefs.sms !== false;
    case "whatsapp":
      return currentPrefs.whatsapp !== false;
    case "in_app":
      return currentPrefs.inApp !== false;
    default:
      return true;
  }
}
