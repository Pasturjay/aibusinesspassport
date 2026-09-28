import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  // Dev only route
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    throw new Error("AI Business Passport Dev Test Exception: Sentry is connected!");
  } catch (error) {
    const eventId = Sentry.captureException(error, {
      tags: {
        environment: "development",
        route: "/api/sentry-test",
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Sentry test event captured successfully",
      eventId,
    });
  }
}
