import { NextRequest, NextResponse } from "next/server";
import { isStopKeyword } from "@/lib/notifications/consent";

/**
 * Multi-channel Notification Delivery Status & SMS Callback Webhook.
 * Processes delivery receipts from Termii, Africa's Talking, and Brevo,
 * as well as inbound SMS opt-out "STOP" commands.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) || {};

    // 1. Check for incoming SMS STOP opt-out command
    const text = body.text || body.message || body.sms || "";
    const phone = body.from || body.phone_number || body.phoneNumber || "";

    if (phone && text && isStopKeyword(text)) {
      console.log(`[Notification Webhook] Opt-out requested via STOP command from ${phone}`);
      return NextResponse.json({
        success: true,
        action: "opted_out",
        phone,
      });
    }

    // 2. Delivery Status Webhook Updates
    const status = body.status || body.event || "delivered";
    const messageId = body.message_id || body.messageId || body.providerMessageId;

    console.log(`[Notification Webhook] Delivery status update: ${messageId} -> ${status}`);

    return NextResponse.json({
      success: true,
      status: "received",
      messageId,
    });
  } catch (error: any) {
    console.error("[Notification Webhook Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
