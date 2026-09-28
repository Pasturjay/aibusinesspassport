"use client";

import { useState } from "react";
import { evaluateRules } from "@/lib/compliance/rulesEngine";

interface AdminRuleItem {
  id: string;
  ruleKey: string;
  version: number;
  title: string;
  summary: string;
  appliesWhen: string;
  agency: string;
  status: "draft" | "in_review" | "published" | "retired";
  authorId: string;
  reviewedBy: string;
  lastReviewedAt: string;
  sourceUrlStatus: "ok" | "failed" | "pending";
  changeNote: string;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    "rules" | "staleness" | "templates" | "expected_docs" | "queues" | "audit_logs"
  >("rules");

  const [ruleStatusFilter, setRuleStatusFilter] = useState<"all" | "draft" | "in_review" | "published" | "retired">("all");
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>("rule_1");

  // Predicate Builder State
  const [predPath, setPredPath] = useState("identity.businessType");
  const [predOperator, setPredOperator] = useState("equals");
  const [predValue, setPredValue] = useState("limited_company");

  // Two-Person Publish Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [reviewerId, setReviewerId] = useState("user_editor_reviewer_99");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Mock Admin User State
  const currentAdmin = {
    userId: "user_admin_author_01",
    role: "admin" as const,
    name: "Admin Author",
  };

  // Demo Business Personas for Predicate Testing
  const demoPersonas = [
    {
      name: "Lekki Green Energies Ltd",
      type: "limited_company",
      state: "Lagos",
      employees: 12,
      snapshot: {
        identity: { businessType: "limited_company", address: { state: "Lagos" } },
        operations: { hasEmployees: true, employeeCount: 12, hasPhysicalShop: true, sellsOnline: true },
      },
    },
    {
      name: "Kano Agro Processing Enterprise",
      type: "business_name",
      state: "Kano",
      employees: 3,
      snapshot: {
        identity: { businessType: "business_name", address: { state: "Kano" } },
        operations: { hasEmployees: true, employeeCount: 3, hasPhysicalShop: true, sellsOnline: false },
      },
    },
    {
      name: "Abuja Tech Foundation",
      type: "incorporated_trustees",
      state: "FCT",
      employees: 0,
      snapshot: {
        identity: { businessType: "incorporated_trustees", address: { state: "FCT" } },
        operations: { hasEmployees: false, employeeCount: 0, hasPhysicalShop: false, sellsOnline: true },
      },
    },
  ];

  // Mock Rules List
  const [rules, setRules] = useState<AdminRuleItem[]>([
    {
      id: "rule_1",
      ruleKey: "CAC_ANNUAL_RETURN",
      version: 1,
      title: "File CAC Annual Returns",
      summary: "Annual statutory obligation for registered Nigerian businesses.",
      appliesWhen: JSON.stringify({
        field: "identity.businessType",
        operator: "in",
        value: ["limited_company", "business_name"],
      }),
      agency: "CAC",
      status: "published",
      authorId: "user_admin_author_01",
      reviewedBy: "user_editor_reviewer_99",
      lastReviewedAt: "2026-02-10",
      sourceUrlStatus: "ok",
      changeNote: "Initial published baseline",
    },
    {
      id: "rule_2",
      ruleKey: "FIRS_CIT_FILING",
      version: 2,
      title: "File Companies Income Tax (CIT)",
      summary: "Annual CIT return due 6 months after financial year end.",
      appliesWhen: JSON.stringify({
        field: "identity.businessType",
        operator: "equals",
        value: "limited_company",
      }),
      agency: "FIRS",
      status: "draft",
      authorId: "user_admin_author_01",
      reviewedBy: "",
      lastReviewedAt: "2025-08-01", // >180 days stale
      sourceUrlStatus: "failed",
      changeNote: "Updated filing deadline logic for SME tax exemption threshold",
    },
  ]);

  // Handler for publishing with Two-Person enforcement
  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPublishError(null);

    if (!changeNote.trim()) {
      setPublishError("Change note is required to publish a rule");
      return;
    }

    const selectedRule = rules.find((r) => r.id === selectedRuleId);
    if (!selectedRule) return;

    // TWO-PERSON RULE CHECK
    if (selectedRule.authorId === currentAdmin.userId && reviewerId === currentAdmin.userId) {
      setPublishError("Two-person rule violation: Author cannot self-publish a rule");
      return;
    }

    // Publish rule
    setRules((prev) =>
      prev.map((r) =>
        r.id === selectedRuleId
          ? {
              ...r,
              version: r.version + 1,
              status: "published",
              reviewedBy: reviewerId,
              lastReviewedAt: new Date().toISOString().split("T")[0],
              changeNote: changeNote,
            }
          : r
      )
    );

    setShowPublishModal(false);
    setPublishSuccess(`Rule ${selectedRule.ruleKey} successfully published as version ${selectedRule.version + 1}!`);
    setTimeout(() => setPublishSuccess(null), 4000);
  };

  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6 sm:px-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Admin Control Center</h1>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
              Role: {currentAdmin.role}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Rules engine CRUD, version diffs, predicate builder, template manager, staleness dashboard, and audit logs.
          </p>
        </div>
      </div>

      {publishSuccess && (
        <div className="rounded-lg bg-green-50 p-4 text-xs font-semibold text-green-800 border border-green-200">
          ✓ {publishSuccess}
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2 text-sm font-medium">
        {[
          { key: "rules", label: "📜 Rules CRUD & Diff" },
          { key: "staleness", label: "🚨 Staleness Dashboard" },
          { key: "templates", label: "📄 Document Templates" },
          { key: "expected_docs", label: "📁 Expected Docs Manager" },
          { key: "queues", label: "📥 Admin Queues & Reviews" },
          { key: "audit_logs", label: "🔒 Immutable Audit Logs" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-lg px-4 py-2 transition-all ${
              activeTab === tab.key
                ? "bg-gray-900 text-white font-semibold"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Rules CRUD, Predicate Builder & Version Diff */}
      {activeTab === "rules" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Rules List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Compliance Rules</h2>
              <button
                onClick={() => {
                  const newRule = {
                    id: `rule_${Date.now()}`,
                    ruleKey: "SCUML_REGISTRATION",
                    version: 1,
                    title: "Register with SCUML",
                    summary: "Special Control Unit Against Money Laundering requirement.",
                    appliesWhen: JSON.stringify({ field: "identity.industry", operator: "equals", value: "Real Estate" }),
                    agency: "SCUML",
                    status: "draft" as const,
                    authorId: currentAdmin.userId,
                    reviewedBy: "",
                    lastReviewedAt: new Date().toISOString().split("T")[0],
                    sourceUrlStatus: "ok" as const,
                    changeNote: "New draft rule created",
                  };
                  setRules([newRule, ...rules]);
                  setSelectedRuleId(newRule.id);
                }}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                + New Rule Draft
              </button>
            </div>

            {/* Status Filter Pills */}
            <div className="flex gap-1 text-xs">
              {(["all", "draft", "in_review", "published", "retired"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setRuleStatusFilter(st)}
                  className={`rounded px-2.5 py-1 capitalize ${
                    ruleStatusFilter === st
                      ? "bg-gray-900 text-white font-bold"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {rules
                .filter((r) => ruleStatusFilter === "all" || r.status === ruleStatusFilter)
                .map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRuleId(r.id)}
                    className={`cursor-pointer rounded-lg border p-3 transition-all ${
                      selectedRuleId === r.id
                        ? "border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-gray-900">{r.ruleKey} v{r.version}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          r.status === "published"
                            ? "bg-green-100 text-green-800"
                            : r.status === "in_review"
                            ? "bg-purple-100 text-purple-800"
                            : r.status === "retired"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 font-medium mt-1">{r.title}</p>
                    <p className="text-[11px] text-gray-500 mt-1">Agency: {r.agency} &bull; Author: {r.authorId}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Right 2 Columns: Rule Inspector, Predicate Builder & Demo Tester */}
          <div className="space-y-6 lg:col-span-2">
            {selectedRule ? (
              <>
                {/* Rule Detail Header */}
                <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-start justify-between border-b pb-4">
                    <div>
                      <span className="font-mono text-xs font-semibold text-blue-600">{selectedRule.ruleKey} (Version {selectedRule.version})</span>
                      <h2 className="text-xl font-bold text-gray-900">{selectedRule.title}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedRule.summary}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedRule.status !== "published" ? (
                        <button
                          onClick={() => {
                            setPublishError(null);
                            setShowPublishModal(true);
                          }}
                          className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700"
                        >
                          🚀 Publish Rule
                        </button>
                      ) : (
                        <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                          ✓ Published (Immutable)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Version Diff & Change Note */}
                  <div className="rounded-lg bg-gray-50 p-4 space-y-2 border text-xs">
                    <span className="font-bold text-gray-900 block">Version Change Note:</span>
                    <p className="text-gray-700 italic">&quot;{selectedRule.changeNote || "No change note recorded."}&quot;</p>
                    <div className="text-[11px] text-gray-500 pt-1 flex gap-4">
                      <span>Author: <strong className="text-gray-800">{selectedRule.authorId}</strong></span>
                      <span>Reviewer: <strong className="text-gray-800">{selectedRule.reviewedBy || "Pending Review"}</strong></span>
                      <span>Last Reviewed: <strong className="text-gray-800">{selectedRule.lastReviewedAt}</strong></span>
                    </div>
                  </div>

                  {/* Predicate Builder Panel */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-bold text-gray-900">Predicate Builder (`appliesWhen`)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg border text-xs">
                      <div>
                        <label className="block text-gray-500 font-medium mb-1">Target Path</label>
                        <select
                          value={predPath}
                          onChange={(e) => setPredPath(e.target.value)}
                          className="w-full rounded border border-gray-300 p-2 bg-white"
                        >
                          <option value="identity.businessType">identity.businessType</option>
                          <option value="identity.address.state">identity.address.state</option>
                          <option value="operations.employeeCount">operations.employeeCount</option>
                          <option value="operations.hasEmployees">operations.hasEmployees</option>
                          <option value="operations.sellsOnline">operations.sellsOnline</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-500 font-medium mb-1">Operator</label>
                        <select
                          value={predOperator}
                          onChange={(e) => setPredOperator(e.target.value)}
                          className="w-full rounded border border-gray-300 p-2 bg-white"
                        >
                          <option value="equals">equals</option>
                          <option value="in">in</option>
                          <option value="gt">greater than (gt)</option>
                          <option value="lt">less than (lt)</option>
                          <option value="exists">exists</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-500 font-medium mb-1">Comparison Value</label>
                        <input
                          type="text"
                          value={predValue}
                          onChange={(e) => setPredValue(e.target.value)}
                          className="w-full rounded border border-gray-300 p-2 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Demo Business Matching Panel */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-bold text-gray-900">Test Against Seeded Demo Personas</h3>
                    <div className="space-y-2">
                      {demoPersonas.map((persona, idx) => {
                        // Test rule against persona
                        const mockRuleForEngine = {
                          ruleKey: selectedRule.ruleKey,
                          version: selectedRule.version,
                          title: selectedRule.title,
                          plainLanguageSummary: selectedRule.summary,
                          appliesWhen: JSON.stringify({ field: predPath, operator: predOperator, value: predValue }),
                          obligationType: "annual",
                          recurrence: { frequency: "annual", dueDateRule: "FIXED_CALENDAR:12-31" },
                          jurisdiction: "federal",
                          agency: selectedRule.agency,
                          steps: [],
                          source: { name: "Official Portal" },
                          effectiveDate: "2026-01-01",
                          lastReviewedAt: selectedRule.lastReviewedAt,
                          reviewedBy: selectedRule.reviewedBy,
                          status: "published",
                          confidenceIfMatched: 1.0,
                        };

                        const evalResults = evaluateRules(persona.snapshot, [mockRuleForEngine as any]);
                        const isMatched = evalResults.length > 0;

                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                              isMatched ? "bg-green-50/60 border-green-200" : "bg-gray-50 border-gray-200 opacity-60"
                            }`}
                          >
                            <div>
                              <span className="font-bold text-gray-900 block">{persona.name}</span>
                              <span className="text-gray-500 text-[11px]">
                                {persona.type} &bull; {persona.state} &bull; Employees: {persona.employees}
                              </span>
                            </div>
                            <span
                              className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                                isMatched ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {isMatched ? "✓ Matched" : "No Match"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-gray-500">Select a rule from the left panel to inspect details.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Staleness Dashboard */}
      {activeTab === "staleness" && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-gray-900">Rule Staleness & Source URL Health</h2>
          <p className="text-xs text-gray-500">
            Rules unreviewed in &gt;90 days trigger warning flags; rules unreviewed in &gt;180 days force manual verification.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <span className="text-xs font-semibold text-amber-800 block">Unreviewed &gt;90 Days</span>
              <span className="text-2xl font-bold text-amber-900 mt-1 block">1</span>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <span className="text-xs font-semibold text-red-800 block">Stale &gt;180 Days</span>
              <span className="text-2xl font-bold text-red-900 mt-1 block">1</span>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <span className="text-xs font-semibold text-purple-800 block">Failed Source URLs</span>
              <span className="text-2xl font-bold text-purple-900 mt-1 block">1</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Attention Required</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/40 p-3 text-xs">
                <div>
                  <span className="font-bold text-gray-900">FIRS_CIT_FILING v2</span>
                  <p className="text-gray-600">Last reviewed 2025-08-01 (210 days ago) &bull; Source URL HEAD check failed</p>
                </div>
                <button className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700">
                  Review Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Immutable Audit Logs */}
      {activeTab === "audit_logs" && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Immutable Admin Audit Log</h2>
          <p className="text-xs text-gray-500">Read-only audit record of all rule creations, edits, publishes, and template edits.</p>

          <div className="space-y-2 text-xs">
            {[
              { action: "publish_rule", target: "CAC_ANNUAL_RETURN v1", admin: "user_editor_reviewer_99", time: "2026-09-28 14:10" },
              { action: "create_rule_draft", target: "FIRS_CIT_FILING v2", admin: "user_admin_author_01", time: "2026-09-27 10:45" },
            ].map((log, idx) => (
              <div key={idx} className="flex items-center justify-between border-b pb-2">
                <div>
                  <span className="font-bold text-gray-900 uppercase font-mono">{log.action}</span>
                  <span className="text-gray-600 ml-2">&bull; Target: {log.target}</span>
                </div>
                <div className="text-gray-500">
                  Admin: <span className="font-semibold text-gray-800">{log.admin}</span> &bull; {log.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-Person Publish Modal */}
      {showPublishModal && selectedRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handlePublishSubmit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Publish Rule ({selectedRule.ruleKey})</h3>
            <p className="text-xs text-gray-500">
              Publishing creates an immutable version (v{selectedRule.version + 1}). Non-Negotiable Two-Person Rule: Author cannot self-publish.
            </p>

            {publishError && (
              <div className="rounded bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200">
                ⚠️ {publishError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700">Author ID (Original Creator)</label>
                <input
                  type="text"
                  disabled
                  value={selectedRule.authorId}
                  className="mt-1 w-full rounded border bg-gray-100 p-2 text-gray-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700">Reviewer ID (Must differ from Author) *</label>
                <select
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 p-2 bg-white"
                >
                  <option value="user_editor_reviewer_99">user_editor_reviewer_99 (Authorized Reviewer)</option>
                  <option value="user_admin_author_01">user_admin_author_01 (Author - Will trigger violation)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700">Mandatory Change Note *</label>
                <textarea
                  required
                  rows={2}
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="Explain why this version is being published..."
                  className="mt-1 w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="w-1/3 rounded-lg border border-gray-300 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-2/3 rounded-lg bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700"
              >
                Confirm & Publish Version
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
