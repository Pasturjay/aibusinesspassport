import { captureWorkerException } from "@/workers/common/sentry";

interface DispatchRecord {
  timestamp: number;
  success: boolean;
  channel: string;
}

// In-memory sliding window store for dispatch attempts
const dispatchHistory: DispatchRecord[] = [];
const ONE_HOUR_MS = 60 * 60 * 1000;
let lastAlertTimestamp = 0;

export function resetDispatchHistory(): void {
  dispatchHistory.length = 0;
  lastAlertTimestamp = 0;
}

export function recordDispatchAttempt(success: boolean, channel: string = "unknown"): void {
  const now = Date.now();
  dispatchHistory.push({ timestamp: now, success, channel });
  cleanupOldRecords(now);
}

function cleanupOldRecords(now: number): void {
  const cutoff = now - ONE_HOUR_MS;
  while (dispatchHistory.length > 0 && dispatchHistory[0].timestamp < cutoff) {
    dispatchHistory.shift();
  }
}

export async function checkFailureRateAndAlert(minSampleCount: number = 5): Promise<{
  failureRate: number;
  total: number;
  failures: number;
  alertTriggered: boolean;
}> {
  const now = Date.now();
  cleanupOldRecords(now);

  const total = dispatchHistory.length;
  if (total < minSampleCount) {
    return { failureRate: 0, total, failures: 0, alertTriggered: false };
  }

  const failures = dispatchHistory.filter((r) => !r.success).length;
  const failureRate = failures / total;

  let alertTriggered = false;

  // Threshold: > 5% failure rate over 1 hour
  if (failureRate > 0.05) {
    // Deduplicate alerts within 15 minutes to prevent spam
    if (now - lastAlertTimestamp > 15 * 60 * 1000) {
      lastAlertTimestamp = now;
      alertTriggered = true;

      const errorMessage = `[Notification Engine Alert] Multi-channel notification failure rate exceeded threshold: ${(failureRate * 100).toFixed(1)}% (${failures}/${total} failed in past hour)`;
      console.error(errorMessage);

      await captureWorkerException(
        new Error(errorMessage),
        { SENTRY_DSN: process.env.SENTRY_DSN, ENVIRONMENT: process.env.NODE_ENV || "production" },
        { service: "notification-dispatcher", requestId: `alert-${now}` }
      );
    }
  }

  return { failureRate, total, failures, alertTriggered };
}
