"use client";

import { useState, useEffect } from "react";
import { can, FeatureFlag, Tier, PAY_PER_USE_SKUS, PayPerUseSKU, PLAN_PRICING } from "@/lib/entitlements";
import { trackPostHogEvent } from "@/lib/analytics/posthog";

interface UpgradeGateProps {
  feature: FeatureFlag;
  businessTier?: Tier;
  businessId?: string;
  children: React.ReactNode;
}

export function UpgradeGate({
  feature,
  businessTier = "free",
  businessId,
  children,
}: UpgradeGateProps) {
  const isAllowed = can(businessTier, feature);
  const [purchasingSku, setPurchasingSku] = useState<string | null>(null);

  // Track upgrade prompt viewed event
  useEffect(() => {
    if (!isAllowed && businessId) {
      trackPostHogEvent("upgrade_prompt_viewed", {
        businessId,
        feature,
        tier: businessTier,
      });
    }
  }, [isAllowed, businessId, feature, businessTier]);

  if (isAllowed) {
    return <>{children}</>;
  }

  // Find matching pay-per-use SKU for this feature if available
  const matchingSku = (Object.values(PAY_PER_USE_SKUS) as typeof PAY_PER_USE_SKUS[PayPerUseSKU][]).find(
    (s) => s.featureMap === feature
  );

  const handleStartUpgrade = (tierChoice: "plus" | "pro") => {
    if (businessId) {
      trackPostHogEvent("upgrade_started", {
        businessId,
        targetTier: tierChoice,
        feature,
      });
    }
    // Redirect or open checkout
    window.location.href = `/settings/billing?upgrade=${tierChoice}`;
  };

  const handlePayPerUse = () => {
    if (!matchingSku) return;
    setPurchasingSku(matchingSku.sku);
    if (businessId) {
      trackPostHogEvent("upgrade_started", {
        businessId,
        sku: matchingSku.sku,
        feature,
      });
    }
    setTimeout(() => {
      setPurchasingSku(null);
      alert(`Pay-per-use checkout initiated for ${matchingSku.name} (${matchingSku.priceFormatted})!`);
    }, 1000);
  };

  return (
    <div className="relative rounded-xl border border-amber-200 bg-amber-50/40 p-6 text-center shadow-xs space-y-4">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xl font-bold">
        🔒
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900">Feature Locked for Current Plan</h3>
        <p className="mt-1 text-xs text-gray-600 max-w-md mx-auto">
          Accessing <span className="font-semibold text-gray-900">{feature.replace(/_/g, " ")}</span> requires an active subscription or pay-per-use pass.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {/* Option 1: Subscribe to Plan */}
        <button
          onClick={() => handleStartUpgrade("plus")}
          className="w-full sm:w-auto rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition-colors"
        >
          Subscribe to Plus ({PLAN_PRICING.plus.formattedMonthly}/mo)
        </button>

        {/* Option 2: Pay-Per-Use SKU (if available for this feature) */}
        {matchingSku && (
          <button
            onClick={handlePayPerUse}
            disabled={purchasingSku !== null}
            className="w-full sm:w-auto rounded-lg border border-amber-600 bg-white px-5 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 shadow-xs transition-colors"
          >
            {purchasingSku ? "Initiating..." : `Pay Just for This Once (${matchingSku.priceFormatted})`}
          </button>
        )}
      </div>

      <p className="text-[11px] text-gray-400">
        Upgrade anytime. Unused credits rollover for active subscriptions.
      </p>
    </div>
  );
}
