import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || process.env.SVIX_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return new Response("Error: Missing webhook secret", { status: 500 });
  }

  // Get the Svix headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no svix headers, reject forged request
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", { status: 400 });
  }

  // Get raw body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with headers
  try {
    const verified = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
    evt = verified as unknown as WebhookEvent;
  } catch (err) {
    console.error("Error verifying Svix webhook signature:", err);
    return new Response("Error: Invalid signature", { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, phone_numbers, public_metadata } = evt.data;
    const primaryEmail = email_addresses?.[0]?.email_address || "";
    const primaryPhone = phone_numbers?.[0]?.phone_number;
    const fullName = [first_name, last_name].filter(Boolean).join(" ") || "Business Owner";
    const role = (public_metadata?.role as any) || "owner";

    // Requirement #3: On user created, DO NOT create a business yet (onboarding creates it)
    await fetchMutation(api.users.upsertUserFromWebhook, {
      clerkId: id,
      email: primaryEmail,
      name: fullName,
      phone: primaryPhone,
      role,
    });
  } else if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      await fetchMutation(api.users.deleteUserFromWebhook, { clerkId: id });
    }
  }

  return new Response(JSON.stringify({ success: true, event: eventType }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
