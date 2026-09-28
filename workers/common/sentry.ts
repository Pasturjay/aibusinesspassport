export interface WorkerEnv {
  SENTRY_DSN?: string;
  ENVIRONMENT?: string;
  [key: string]: unknown;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}

/**
 * Lightweight, zero-dependency Sentry error reporter for Cloudflare Workers.
 * Captures exceptions and sends them asynchronously to the Sentry ingest API.
 */
export async function captureWorkerException(
  error: unknown,
  env: WorkerEnv,
  context?: { service: string; url?: string; requestId?: string }
): Promise<void> {
  const dsn = env.SENTRY_DSN;
  if (!dsn) {
    console.error(`[${context?.service || "worker"}] Exception:`, error);
    return;
  }

  try {
    const urlObj = new URL(dsn);
    const key = urlObj.username;
    const projectId = urlObj.pathname.replace(/^\//, "");
    const host = urlObj.host;

    const event = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: new Date().toISOString(),
      platform: "javascript",
      level: "error",
      environment: env.ENVIRONMENT || "production",
      tags: {
        service: context?.service || "worker",
        requestId: context?.requestId || "unknown",
      },
      exception: {
        values: [
          {
            type: error instanceof Error ? error.name : "Error",
            value: error instanceof Error ? error.message : String(error),
            stacktrace: error instanceof Error ? { frames: [] } : undefined,
          },
        ],
      },
      request: context?.url ? { url: context.url } : undefined,
    };

    const endpoint = `https://${host}/api/${projectId}/store/?sentry_version=7&sentry_key=${key}&sentry_client=worker-sentry/1.0`;

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
  } catch (sentryErr) {
    console.error("Failed to forward exception to Sentry:", sentryErr);
  }
}
