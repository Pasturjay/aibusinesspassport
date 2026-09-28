import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/sentry-test/route";
import * as Sentry from "@sentry/nextjs";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(() => "test-sentry-event-id-12345"),
}));

describe("Sentry Dev Test Route (/api/sentry-test)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 Not Found in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await GET();
    expect(response.status).toBe(404);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("captures test exception and returns 200 in development mode", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.message).toBe("Sentry test event captured successfully");
    expect(data.eventId).toBe("test-sentry-event-id-12345");

    expect(Sentry.captureException).toHaveBeenCalled();
  });
});
