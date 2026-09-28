/**
 * Network & Save-Data Header Utilities.
 * Detects low-bandwidth connections and respects user Save-Data preferences.
 */

export interface ConnectionStatus {
  saveData: boolean;
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
}

export function getNetworkStatus(): ConnectionStatus {
  if (typeof window === "undefined" || !("navigator" in window)) {
    return { saveData: false };
  }

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  if (!connection) {
    return { saveData: false };
  }

  return {
    saveData: Boolean(connection.saveData),
    effectiveType: connection.effectiveType,
    rtt: connection.rtt,
    downlink: connection.downlink,
  };
}

export function isLowBandwidth(): boolean {
  const status = getNetworkStatus();
  if (status.saveData) return true;
  if (status.effectiveType === "2g" || status.effectiveType === "slow-2g") return true;
  return false;
}
