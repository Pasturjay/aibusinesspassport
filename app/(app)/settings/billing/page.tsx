"use client";

import { useState } from "react";
import { PLAN_PRICING, Tier } from "@/lib/entitlements";
import { trackPostHogEvent } from "@/lib/analytics/posthog";

export default function BillingSettingsPage() {
  const [currentTier, setCurrentTier] = useState<Tier>("plus");
  const [planStatus, setPlanStatus] = useState<"active" | "past_due" | "cancelled">("active");
  const [isAnnual, setIsAnnual] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Mock Billing History
  const [history] = useState([
    {
      id: "inv_101",
      date: "2026-09-01",
      description: "Plus Plan Monthly Subscription",
      amountKobo: 750000, // ₦7,500
      status: "paid",
      pdfUrl: "#",
    },
    {
      id: "inv_100",
      date: "2026-08-01",
      description: "Plus Plan Monthly Subscription",
      amountKobo: 750000, // ₦7,500
      status: "paid",
      pdfUrl: "#",
    },
  ]);

  const businessId = "biz_lekki_01";

  const handleSelectPlan = (targetTier: Tier) => {
    if (targetTier === currentTier) return;

    trackPostHogEvent("upgrade_started", {
      businessId,
      targetTier,
      isAnnual,
    });

    const price = isAnnual
      ? PLAN_PRICING[targetTier].formattedAnnual
      : PLAN_PRICING[targetTier].formattedMonthly;

    if (window.confirm(`Confirm upgrade to ${targetTier.toUpperCase()} Plan (${price})?`)) {
      setCurrentTier(targetTier);
      setPlanStatus("active");

      trackPostHogEvent("upgrade_completed", {
        businessId,
        tier: targetTier,
        amountKobo: isAnnual ? PLAN_PRICING[targetTier].annualKobo : PLAN_PRICING[targetTier].monthlyKobo,
      });

      setActionNotice(`Successfully upgraded to ${targetTier.toUpperCase()} Plan!`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleCancelPlan = () => {
    if (window.confirm("Are you sure you want to cancel your subscription? You will be downgraded to the Free tier at the end of the billing period without data loss.")) {
      setPlanStatus("cancelled");
      setActionNotice("Subscription cancelled. Your data remains fully preserved in read-only mode.");
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription Plans</h1>
          <p className="text-sm text-gray-600">
            Manage your subscription tier, billing interval, and download official payment receipts.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="rounded-lg bg-green-50 p-4 text-xs font-semibold text-green-800 border border-green-200">
          ✓ {actionNotice}
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Plan</span>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-xl font-bold text-gray-900 uppercase">{currentTier} TIER</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  planStatus === "active"
                    ? "bg-green-100 text-green-800"
                    : planStatus === "past_due"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {planStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {currentTier !== "free" && (
            <button
              onClick={handleCancelPlan}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              Cancel Subscription
            </button>
          )}
        </div>

        <div className="text-xs text-gray-600">
          Current Billing Period Ends: <strong className="text-gray-900">2026-10-28</strong>
        </div>
      </div>

      {/* Monthly / Annual Toggle */}
      <div className="flex items-center justify-center gap-3 py-2">
        <span className={`text-xs font-bold ${!isAnnual ? "text-gray-900" : "text-gray-500"}`}>
          Monthly Billing
        </span>
        <button
          onClick={() => setIsAnnual(!isAnnual)}
          className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isAnnual ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold ${isAnnual ? "text-gray-900" : "text-gray-500"}`}>
            Annual Billing
          </span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
            Save ~17%
          </span>
        </div>
      </div>

      {/* Tier Plans Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {(["free", "plus", "pro", "pro_plus"] as Tier[]).map((tierKey) => {
          const pricing = PLAN_PRICING[tierKey];
          const isSelected = currentTier === tierKey;
          const displayPrice = isAnnual ? pricing.formattedAnnual : pricing.formattedMonthly;
          const periodLabel = isAnnual ? "/year" : "/month";

          return (
            <div
              key={tierKey}
              className={`flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all ${
                isSelected
                  ? "border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/10"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 uppercase">{tierKey.replace("_", "+")}</h3>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-2xl font-extrabold text-gray-900">{displayPrice}</span>
                    <span className="text-xs text-gray-500 ml-1">{periodLabel}</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-gray-600 border-t pt-3">
                  {tierKey === "free" && (
                    <>
                      <li>✓ Basic Business Passport</li>
                      <li>✓ Basic Vault Storage</li>
                      <li>✓ Compliance Checklist</li>
                    </>
                  )}
                  {tierKey === "plus" && (
                    <>
                      <li>✓ All Passport Card Themes</li>
                      <li>✓ QR Verification Badge</li>
                      <li>✓ Printable Card Generator</li>
                      <li>✓ Document Intelligence</li>
                      <li>✓ Business AI Assistance</li>
                    </>
                  )}
                  {tierKey === "pro" && (
                    <>
                      <li>✓ Full Document Studio</li>
                      <li>✓ Tender Analysis & Readiness</li>
                      <li>✓ Physical NFC Card Sharing</li>
                      <li>✓ Industry Templates</li>
                    </>
                  )}
                  {tierKey === "pro_plus" && (
                    <>
                      <li>✓ Everything in Pro</li>
                      <li>✓ Done-for-Me Network Access</li>
                      <li>✓ Priority Support & Custom Quotas</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => handleSelectPlan(tierKey)}
                  disabled={isSelected}
                  className={`w-full rounded-lg py-2.5 text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-gray-100 text-gray-400 cursor-default"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isSelected ? "Current Plan" : `Select ${tierKey.toUpperCase()}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Receipts & Invoices Table */}
      <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Billing History & Receipts</h2>

        <div className="space-y-2 text-xs">
          {history.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between border-b pb-3 pt-1">
              <div>
                <span className="font-bold text-gray-900">{inv.description}</span>
                <p className="text-gray-500">{inv.date} &bull; Ref: {inv.id}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-gray-900">
                  ₦{(inv.amountKobo / 100).toLocaleString()}
                </span>
                <span className="rounded bg-green-100 px-2 py-0.5 font-bold text-green-800 uppercase">
                  {inv.status}
                </span>
                <a
                  href={inv.pdfUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    alert(`Downloading receipt ${inv.id}...`);
                  }}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Receipt PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
