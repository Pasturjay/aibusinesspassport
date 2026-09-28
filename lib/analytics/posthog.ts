import posthog from "posthog-js";
import { PostHog as PostHogNode } from "posthog-node";

export interface TrackPayload {
  businessId: string;
  userId?: string;
  [key: string]: unknown;
}

let serverClient: PostHogNode | null = null;

function getServerClient(): PostHogNode | null {
  if (typeof window !== "undefined") return null;
  const apiKey = process.env.POSTHOG_PROJECT_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return null;
  if (!serverClient) {
    serverClient = new PostHogNode(apiKey, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    });
  }
  return serverClient;
}

export function initClientPostHog() {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // hand-tracked with Next.js router
  });
}

/**
 * Universal PostHog track wrapper enforcing businessId tagging.
 * Guaranteed to attach businessId to both client and server events.
 */
export function track(event: string, properties: TrackPayload): void {
  const { businessId, userId, ...customProps } = properties;

  const eventPayload = {
    ...customProps,
    businessId,
    $groups: {
      business: businessId,
    },
    distinct_id: userId || `biz_${businessId}`,
  };

  if (typeof window !== "undefined") {
    // Client-side execution
    if (userId) {
      posthog.identify(userId);
    }
    posthog.group("business", businessId);
    posthog.capture(event, eventPayload);
  } else {
    // Server-side execution
    const server = getServerClient();
    if (server) {
      server.capture({
        distinctId: userId || `biz_${businessId}`,
        event,
        properties: eventPayload,
        groups: { business: businessId },
      });
    }
  }
}

export const trackPostHogEvent = track;
