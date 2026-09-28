export interface CrispUserData {
  email?: string;
  nickname?: string;
  phone?: string;
  avatar?: string;
  businessId?: string;
  businessName?: string;
  plan?: string;
  isCompliant?: boolean;
}

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

/**
 * Configure user and business context within the Crisp widget.
 * Enforces business context awareness in customer support.
 */
export function setCrispUser(data: CrispUserData): void {
  if (typeof window === "undefined") return;

  window.$crisp = window.$crisp || [];

  if (data.email) {
    window.$crisp.push(["set", "user:email", [data.email]]);
  }

  if (data.nickname) {
    window.$crisp.push(["set", "user:nickname", [data.nickname]]);
  }

  if (data.phone) {
    window.$crisp.push(["set", "user:phone", [data.phone]]);
  }

  if (data.avatar) {
    window.$crisp.push(["set", "user:avatar", [data.avatar]]);
  }

  // Set custom business session data
  const sessionData: [string, string | number | boolean][] = [];

  if (data.businessId) {
    sessionData.push(["business_id", data.businessId]);
  }
  if (data.businessName) {
    sessionData.push(["business_name", data.businessName]);
  }
  if (data.plan) {
    sessionData.push(["plan", data.plan]);
  }
  if (typeof data.isCompliant === "boolean") {
    sessionData.push(["is_compliant", data.isCompliant]);
  }

  if (sessionData.length > 0) {
    window.$crisp.push(["set", "session:data", [sessionData]]);
  }
}
