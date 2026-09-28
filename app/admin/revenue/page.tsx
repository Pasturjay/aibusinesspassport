"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { exportRevenueReportCSV } from "@/lib/marketplace/revenueReporting";

export default function AdminRevenueDashboardPage() {
  const report = useQuery(api.marketplace.getAdminRevenueReport, { periodLabel: "All Time" });
  const [downloading, setDownloading] = useState(false);

  const handleExportCSV = () => {
    if (!report) return;
    setDownloading(true);
    try {
      const csvString = exportRevenueReportCSV(report);
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `revenue_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export CSV:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full uppercase tracking-wider">
                Admin Console
              </span>
              <span className="text-xs text-slate-500 font-mono">Monetization Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">
              Revenue & Marketplace Performance
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Multi-stream breakdown across Subscriptions, Print Margins, Professional Referrals, and Done-for-Me Jobs.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={!report || downloading}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {downloading ? "Exporting..." : "Export Revenue Report (CSV)"}
          </button>
        </div>

        {/* Loading state */}
        {!report && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-slate-100 rounded w-1/3 mx-auto"></div>
          </div>
        )}

        {/* Summary Metrics */}
        {report && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Total Gross Revenue
                </span>
                <div className="text-3xl md:text-4xl font-extrabold mt-2 text-white">
                  {report.formattedTotalGrossNaira}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Combined gross transaction volume across all channels
                </p>
              </div>

              <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-md border border-emerald-500">
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-100">
                  Platform Net Revenue
                </span>
                <div className="text-3xl md:text-4xl font-extrabold mt-2 text-white">
                  {report.formattedTotalNetNaira}
                </div>
                <p className="text-xs text-emerald-100 mt-2">
                  Actual platform income (SaaS + Margins + Fees)
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Overall Take-Rate
                </span>
                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
                  {report.overallTakeRatePct}%
                  <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium rounded-full">
                    Weighted Avg
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Net platform yield over total GMV
                </p>
              </div>
            </div>

            {/* Stream Breakdown Cards */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Monetization Streams Detail
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Subscriptions */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 text-base">
                      1. Subscriptions (SaaS)
                    </h3>
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                      100% Take Rate
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Net Revenue
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {report.streams.subscriptions.formattedNetNaira}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Active Subscribers
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {report.streams.subscriptions.transactionCount}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Recurring SaaS revenue from Plus, Pro, and Pro+ tiers.
                  </p>
                </div>

                {/* 2. Print Marketplace */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 text-base">
                      2. Print Marketplace
                    </h3>
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
                      {report.streams.printMarketplace.takeRatePct}% Platform Margin
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Gross Volume (GMV)
                      </span>
                      <span className="text-base font-bold text-slate-700">
                        {report.streams.printMarketplace.formattedGrossNaira}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Platform Net Margin
                      </span>
                      <span className="text-lg font-bold text-emerald-600">
                        {report.streams.printMarketplace.formattedNetNaira}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Orders generated from Passport card designs across verified print partners.
                  </p>
                </div>

                {/* 3. Professional Referrals */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 text-base">
                      3. Professional Referrals
                    </h3>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
                      Lead Fee Revenue
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Net Lead Fees
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {report.streams.referrals.formattedNetNaira}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Qualified Leads
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {report.streams.referrals.transactionCount}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Lead fee commissions from verified accountants, lawyers, and registration agents.
                  </p>
                </div>

                {/* 4. Done-for-Me Services */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 text-base">
                      4. Done-for-Me Services
                    </h3>
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200">
                      Pro+ Quoted Services
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Total Job Value
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {report.streams.doneForMe.formattedNetNaira}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Paid Jobs
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {report.streams.doneForMe.transactionCount}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Full-service compliance and registration jobs executed by internal operations team.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
