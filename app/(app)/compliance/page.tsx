"use client";

import { useState } from "react";
import { PRODUCT_COPY } from "@/lib/copy";

export interface ComplianceItemUI {
  id: string;
  ruleKey: string;
  ruleVersion: number;
  title: string;
  plainSummary: string;
  status: "needs_attention" | "coming_up" | "completed" | "needs_review";
  dueDate: string;
  source: string;
  lastReviewedAt: string;
  confirmBeforeFiling: boolean;
  staleRule?: boolean;
  steps: Array<{ title: string; description: string; link?: string }>;
}

export default function ComplianceCenterPage() {
  const [activeItem, setActiveItem] = useState<ComplianceItemUI | null>(null);
  const [handleMode, setHandleMode] = useState<"simple" | "show_me" | "do_it_for_me">("simple");
  const [changeText, setChangeText] = useState("");
  const [changeMessage, setChangeMessage] = useState<string | null>(null);

  // Mock Compliance Items
  const [items, setItems] = useState<ComplianceItemUI[]>([
    {
      id: "comp-1",
      ruleKey: "CAC_ANNUAL_RETURNS",
      ruleVersion: 1,
      title: "File CAC Annual Returns",
      plainSummary: "File your annual returns with CAC to keep your registered status active.",
      status: "needs_attention",
      dueDate: "2026-06-30",
      source: "CAMA 2020 s. 822",
      lastReviewedAt: "2026-01-15T10:00:00Z",
      confirmBeforeFiling: false,
      steps: [
        { title: "Gather Financial Summary", description: "Collect turnover and director details for the past financial year." },
        { title: "Submit on CAC Portal", description: "Log in to post.cac.gov.ng and pay statutory filing fee." },
      ],
    },
    {
      id: "comp-2",
      ruleKey: "STATE_PAYE_FILING",
      ruleVersion: 1,
      title: "File State PAYE Tax Returns",
      plainSummary: "File your annual employee tax returns with Lagos State Internal Revenue Service (LIRS).",
      status: "coming_up",
      dueDate: "2026-01-31",
      source: "Personal Income Tax Act (PITA) s. 41",
      lastReviewedAt: "2024-05-01T00:00:00Z", // Stale rule (> 180 days)
      confirmBeforeFiling: true,
      staleRule: true,
      steps: [
        { title: "Prepare Form H1", description: "Compile employee tax deduction schedule." },
        { title: "Upload on eTax", description: "File tax schedule on LIRS eTax portal." },
      ],
    },
    {
      id: "comp-3",
      ruleKey: "FIRS_CIT_FILING",
      ruleVersion: 1,
      title: "File FIRS Companies Income Tax",
      plainSummary: "File your annual corporate tax return with FIRS on TaxPro Max.",
      status: "completed",
      dueDate: "2025-06-30",
      source: "Companies Income Tax Act (CITA) Cap C21 LFN 2004",
      lastReviewedAt: "2026-02-01T00:00:00Z",
      confirmBeforeFiling: false,
      steps: [],
    },
  ]);

  const needsAttentionItems = items.filter((i) => i.status === "needs_attention" || i.status === "needs_review");
  const comingUpItems = items.filter((i) => i.status === "coming_up");
  const completedItems = items.filter((i) => i.status === "completed");

  const handleMarkComplete = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "completed" } : i))
    );
    setActiveItem(null);
  };

  const handleRecordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeText.trim()) return;

    // Simulate change event processing
    setChangeMessage("Change recorded! The Rules Engine evaluated your update and refreshed your compliance obligations.");
    setChangeText("");

    // Dynamically surface new item if employees mentioned
    if (changeText.toLowerCase().includes("hire") || changeText.toLowerCase().includes("employee")) {
      const newItem: ComplianceItemUI = {
        id: `comp-${Date.now()}`,
        ruleKey: "NSITF_ECA_FILING",
        ruleVersion: 1,
        title: "Register for NSITF Employees Compensation",
        plainSummary: "Contribute 1% monthly payroll for employee workplace injury insurance.",
        status: "needs_attention",
        dueDate: "2026-04-30",
        source: "Employees Compensation Act 2010",
        lastReviewedAt: new Date().toISOString(),
        confirmBeforeFiling: false,
        steps: [{ title: "Register on NSITF Portal", description: "Upload employee payroll list." }],
      };
      setItems((prev) => [newItem, ...prev]);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{PRODUCT_COPY.complianceSectionTitle}</h1>
        <p className="text-sm text-gray-600">
          Track statutory deadlines, tax filings, and regulatory requirements backed by official Nigerian sources.
        </p>
      </div>

      {/* Story D3: "Tell us what changed" Input */}
      <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-gray-900">Tell us what changed in your business</h2>
        <p className="text-xs text-gray-600">
          Did you hire employees, open a new branch, or start a new activity? Tell us in plain language:
        </p>

        <form onSubmit={handleRecordChange} className="space-y-3">
          <input
            type="text"
            value={changeText}
            onChange={(e) => setChangeText(e.target.value)}
            placeholder="e.g. I just hired 2 new staff members in Lagos..."
            className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!changeText.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Update & Re-evaluate Obligations
          </button>
        </form>

        {changeMessage && (
          <div className="rounded-md bg-green-50 p-3 text-xs font-medium text-green-800">
            {changeMessage}
          </div>
        )}
      </section>

      {/* Section 1: Needs Attention */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <span className="h-3 w-3 rounded-full bg-red-600" />
          <h2 className="text-lg font-bold text-gray-900">Needs Attention</h2>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
            {needsAttentionItems.length}
          </span>
        </div>

        <div className="space-y-3">
          {needsAttentionItems.map((item) => (
            <div key={item.id} className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-base text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-600">{item.plainSummary}</p>
                </div>
                <span className="text-xs font-semibold text-red-600 whitespace-nowrap">
                  Due: {item.dueDate}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
                <span className="text-gray-500">
                  Source: <strong>{item.source}</strong> &bull; Reviewed: {item.lastReviewedAt.split("T")[0]}
                </span>
                <button
                  onClick={() => setActiveItem(item)}
                  className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Handle this
                </button>
              </div>
            </div>
          ))}

          {needsAttentionItems.length === 0 && (
            <p className="text-xs text-gray-500 italic">No urgent compliance items requiring immediate attention.</p>
          )}
        </div>
      </section>

      {/* Section 2: Coming Up */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <span className="h-3 w-3 rounded-full bg-yellow-500" />
          <h2 className="text-lg font-bold text-gray-900">Coming Up</h2>
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
            {comingUpItems.length}
          </span>
        </div>

        <div className="space-y-3">
          {comingUpItems.map((item) => (
            <div key={item.id} className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-base text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-600">{item.plainSummary}</p>
                </div>
                <span className="text-xs font-semibold text-yellow-700 whitespace-nowrap">
                  Due: {item.dueDate}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
                <span className="text-gray-500">
                  Source: <strong>{item.source}</strong>
                </span>
                <button
                  onClick={() => setActiveItem(item)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Handle this
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Completed */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <span className="h-3 w-3 rounded-full bg-green-600" />
          <h2 className="text-lg font-bold text-gray-900">Completed</h2>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
            {completedItems.length}
          </span>
        </div>

        <div className="space-y-3">
          {completedItems.map((item) => (
            <div key={item.id} className="rounded-xl border bg-gray-50 p-4 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-900">{item.title}</span>
                <p className="text-gray-500">{item.plainSummary}</p>
              </div>
              <span className="font-semibold text-green-700">Completed ✓</span>
            </div>
          ))}
        </div>
      </section>

      {/* Item Detail Modal ("Handle this") */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{activeItem.title}</h3>
                <p className="text-xs text-gray-500">Source: {activeItem.source} &bull; Reviewed: {activeItem.lastReviewedAt.split("T")[0]}</p>
              </div>
              <button onClick={() => setActiveItem(null)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            {/* Confirm-before-filing warning banner */}
            {(activeItem.confirmBeforeFiling || activeItem.staleRule) && (
              <div className="rounded-md bg-yellow-50 p-3 text-xs text-yellow-900 border border-yellow-200">
                <strong>{PRODUCT_COPY.confirmBeforeFilingPrompt}</strong>
                {activeItem.staleRule && (
                  <p className="mt-1">Notice: Statutory rule was last reviewed over 180 days ago. Confirm details before filing.</p>
                )}
              </div>
            )}

            {/* Execution Modes Tabs */}
            <div className="flex rounded-md bg-gray-100 p-1 text-xs font-medium">
              <button
                onClick={() => setHandleMode("simple")}
                className={`flex-1 rounded py-1.5 ${handleMode === "simple" ? "bg-white text-blue-900 shadow-sm" : "text-gray-600"}`}
              >
                Simple Summary
              </button>
              <button
                onClick={() => setHandleMode("show_me")}
                className={`flex-1 rounded py-1.5 ${handleMode === "show_me" ? "bg-white text-blue-900 shadow-sm" : "text-gray-600"}`}
              >
                Show Me (Steps)
              </button>
              <button
                onClick={() => setHandleMode("do_it_for_me")}
                className={`flex-1 rounded py-1.5 ${handleMode === "do_it_for_me" ? "bg-white text-blue-900 shadow-sm" : "text-gray-600"}`}
              >
                Do It For Me
              </button>
            </div>

            {/* Mode 1: Simple Summary */}
            {handleMode === "simple" && (
              <div className="space-y-2 text-xs text-gray-700">
                <p>{activeItem.plainSummary}</p>
                <p className="font-semibold text-gray-900">Due Date: {activeItem.dueDate}</p>
              </div>
            )}

            {/* Mode 2: Show Me Steps */}
            {handleMode === "show_me" && (
              <div className="space-y-3 text-xs">
                {activeItem.steps.map((step, idx) => (
                  <div key={idx} className="rounded-md border p-3 space-y-1">
                    <strong className="block text-gray-900">{idx + 1}. {step.title}</strong>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Mode 3: Do It For Me */}
            {handleMode === "do_it_for_me" && (
              <div className="space-y-3 rounded-md bg-blue-50/50 p-4 border border-blue-100 text-xs">
                <h4 className="font-bold text-blue-900">Done-For-You Filing Service</h4>
                <p className="text-blue-800">
                  Connect with a verified professional agent or lawyer to handle this filing for your business.
                </p>
                <button
                  onClick={() => alert("Done-for-me request submitted!")}
                  className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Request Professional Assistance
                </button>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <button
                onClick={() => handleMarkComplete(activeItem.id)}
                className="rounded-md bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
              >
                Mark Complete Manually
              </button>
              <button
                onClick={() => setActiveItem(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-400 pt-4">
        {PRODUCT_COPY.trustNotice}
      </p>
    </div>
  );
}
