import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { track } from "@/lib/analytics/posthog";
import posthog from "posthog-js";

vi.mock("posthog-js", () => {
  return {
    default: {
      capture: vi.fn(),
      identify: vi.fn(),
      group: vi.fn(),
    },
  };
});

describe("PostHog Analytics Wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("strictly attaches businessId to every tracked event in client environment", () => {
    const testBusinessId = "biz_lagos_tech_12345";
    const testUserId = "user_clerk_98765";

    track("document_uploaded", {
      businessId: testBusinessId,
      userId: testUserId,
      documentType: "cac_certificate",
      fileSizeKb: 250,
    });

    // Check group assignment
    expect(posthog.group).toHaveBeenCalledWith("business", testBusinessId);
    expect(posthog.identify).toHaveBeenCalledWith(testUserId);

    // Check event capture payload
    expect(posthog.capture).toHaveBeenCalledWith("document_uploaded", {
      businessId: testBusinessId,
      documentType: "cac_certificate",
      fileSizeKb: 250,
      $groups: {
        business: testBusinessId,
      },
      distinct_id: testUserId,
    });
  });

  it("handles events without explicit userId by attributing to the businessId", () => {
    const testBusinessId = "biz_abuja_retail_555";

    track("passport_viewed", {
      businessId: testBusinessId,
      referrer: "tender_board",
    });

    expect(posthog.group).toHaveBeenCalledWith("business", testBusinessId);
    expect(posthog.capture).toHaveBeenCalledWith("passport_viewed", {
      businessId: testBusinessId,
      referrer: "tender_board",
      $groups: {
        business: testBusinessId,
      },
      distinct_id: `biz_${testBusinessId}`,
    });
  });
});
