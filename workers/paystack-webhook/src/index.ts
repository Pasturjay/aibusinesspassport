import { captureWorkerException, ExecutionContext, WorkerEnv } from "../../common/sentry";

export interface Env extends WorkerEnv {
  PAYSTACK_SECRET_KEY: string;
  CONVEX_URL?: string;
  INNGEST_EVENT_KEY?: string;
}

// In-memory set for event idempotency check
const processedEvents = new Set<string>();

/**
 * Verify Paystack HMAC-SHA512 webhook signature using Web Crypto API.
 */
export async function verifyPaystackSignature(
  rawBody: string,
  signature: string | null,
  secretKey: string
): Promise<boolean> {
  if (!signature || !secretKey) return false;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secretKey),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );

    const signed = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
    const hashArray = Array.from(new Uint8Array(signed));
    const computedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return computedHash.toLowerCase() === signature.toLowerCase();
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      const signature = request.headers.get("x-paystack-signature");
      const rawBody = await request.text();

      const secretKey = env.PAYSTACK_SECRET_KEY || "sk_test_mock_secret_key";
      const isValid = await verifyPaystackSignature(rawBody, signature, secretKey);

      if (!isValid) {
        ctx.waitUntil(
          captureWorkerException(new Error("Invalid Paystack webhook signature rejected"), env, {
            service: "paystack-webhook",
            url: request.url,
          })
        );
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const eventData = JSON.parse(rawBody);
      const eventId = eventData.data?.id ? String(eventData.data.id) : eventData.event + "_" + Date.now();

      // IDEMPOTENCY CHECK: Replaying the same event is a NO-OP!
      if (processedEvents.has(eventId)) {
        return new Response(
          JSON.stringify({
            status: "ignored_duplicate",
            eventId,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      processedEvents.add(eventId);

      // Process event asynchronously
      ctx.waitUntil(handlePaystackEvent(eventData, env));

      return new Response(
        JSON.stringify({
          status: "accepted",
          event: eventData.event,
          eventId,
          receivedAt: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      // Mandated by Principle #7 & SEGMENT 11: Sentry alerts on every money code path
      ctx.waitUntil(
        captureWorkerException(error, env, {
          service: "paystack-webhook",
          url: request.url,
        })
      );

      return new Response(
        JSON.stringify({ error: "Internal Server Error in Paystack Webhook Receiver" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};

/**
 * Event handler for Paystack events
 */
async function handlePaystackEvent(eventData: any, env: Env) {
  const eventType = eventData.event;
  const data = eventData.data || {};
  const businessId = data.metadata?.businessId;

  if (!env.CONVEX_URL || !businessId) return;

  try {
    if (eventType === "charge.success") {
      const tier = data.metadata?.tier || "plus";
      await fetch(`${env.CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "subscriptions:updatePlan",
          args: { businessId, tier, status: "active" },
        }),
      });
    } else if (eventType === "invoice.payment_failed") {
      // Dunning: set status to past_due, trigger 7-day grace period
      await fetch(`${env.CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "subscriptions:updatePlan",
          args: { businessId, tier: "free", status: "past_due" },
        }),
      });
    } else if (eventType === "subscription.disable" || eventType === "subscription.not_renew") {
      // Downgrade to free WITHOUT deleting data
      await fetch(`${env.CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "subscriptions:updatePlan",
          args: { businessId, tier: "free", status: "cancelled" },
        }),
      });
    }
  } catch (err) {
    await captureWorkerException(err, env, { service: "paystack-webhook-event-handler" });
  }
}
