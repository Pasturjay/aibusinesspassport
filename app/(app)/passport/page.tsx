"use client";

import { useState } from "react";
import { PASSPORT_THEMES, PassportStyleTheme } from "@/lib/passport/themes";

export default function OwnerPassportDashboardPage() {
  const [selectedTheme, setSelectedTheme] = useState<PassportStyleTheme>("professional");
  const [tagline, setTagline] = useState("Leading Supply Chain & Technology Solutions Provider in West Africa");
  const [nfcEnabled, setNfcEnabled] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Field visibility state
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, "public" | "private" | "on_request">>({
    rcNumber: "public",
    industry: "public",
    contact: "public",
    capabilities: "public",
    experience: "public",
    people: "on_request",
  });

  // Mock Incoming Document Requests
  const [requests, setRequests] = useState([
    {
      id: "req_1",
      requesterName: "Nkechi Amadi",
      requesterCompany: "Access Bank Plc (Credit Risk)",
      requesterEmail: "n.amadi@accessbankplc.com",
      requestedItems: ["registration", "compliance_docs"],
      message: "For SME Credit Facility Application #FAC-99182",
      status: "pending",
      createdAt: "2026-09-27",
    },
    {
      id: "req_2",
      requesterName: "Tunde Bakare",
      requesterCompany: "Lagos State Procurement Agency",
      requesterEmail: "tunde.bakare@lagos.gov.ng",
      requestedItems: ["company_profile", "certifications"],
      message: "Tender evaluation for Lagos Smart Freight Network",
      status: "approved",
      createdAt: "2026-09-25",
    },
  ]);

  // Selected request for approval modal
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [selectedDocsForPackage, setSelectedDocsForPackage] = useState<string[]>(["cac_cert", "tax_clearance"]);
  const [gapInput, setGapInput] = useState("");

  // Scan Analytics Mock
  const analytics = {
    totalScans: 142,
    qrScans: 68,
    nfcScans: 44,
    linkScans: 30,
    contactsSaved: 59,
  };

  const passportId = "BP-NG-77A91B";
  const theme = PASSPORT_THEMES[selectedTheme];

  const handleSaveSettings = () => {
    setSaveNotice("Passport preferences saved successfully!");
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleApproveRequest = (reqId: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "approved" } : r))
    );
    setApprovingRequestId(null);
    setSaveNotice("Document request approved & share link generated!");
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleDeclineRequest = (reqId: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "declined" } : r))
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verifiable Business Passport</h1>
          <p className="text-sm text-gray-600">
            Customize your shareable public card, manage NFC & QR codes, and approve verified document requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/p/${passportId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            🔗 View Live Card
          </a>
        </div>
      </div>

      {saveNotice && (
        <div className="rounded-lg bg-green-50 p-4 text-xs font-semibold text-green-800 border border-green-200">
          ✓ {saveNotice}
        </div>
      )}

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-gray-500">Total Scans & Views</span>
          <span className="mt-1 block text-2xl font-bold text-gray-900">{analytics.totalScans}</span>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-gray-500">QR Code Scans</span>
          <span className="mt-1 block text-2xl font-bold text-blue-600">{analytics.qrScans}</span>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-gray-500">NFC Tap Events</span>
          <span className="mt-1 block text-2xl font-bold text-purple-600">{analytics.nfcScans}</span>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-gray-500">Contacts Saved</span>
          <span className="mt-1 block text-2xl font-bold text-green-600">{analytics.contactsSaved}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Settings & Customizations */}
        <div className="space-y-6 lg:col-span-2">
          {/* Theme & Style Selector */}
          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Passport Theme & Card Style</h2>
            <p className="text-xs text-gray-500">Select a card theme that reflects your brand identity.</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.keys(PASSPORT_THEMES) as PassportStyleTheme[]).map((tKey) => {
                const t = PASSPORT_THEMES[tKey];
                return (
                  <button
                    key={tKey}
                    onClick={() => setSelectedTheme(tKey)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      selectedTheme === tKey
                        ? "border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/20"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="block text-xs font-bold text-gray-900">{t.name}</span>
                    <span className="block text-[11px] text-gray-500 mt-1 line-clamp-2">{t.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Identity & Tagline Controls */}
          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Tagline & Card Controls</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Business Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <span className="text-sm font-medium text-gray-900">Enable NFC vCard Sharing</span>
                  <p className="text-xs text-gray-500">Allows physical NFC business cards to trigger contact saving.</p>
                </div>
                <input
                  type="checkbox"
                  checked={nfcEnabled}
                  onChange={(e) => setNfcEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <span className="text-sm font-medium text-gray-900">Passport Card Active</span>
                  <p className="text-xs text-gray-500">When toggled off, public link returns unavailable card.</p>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Field Visibility Section */}
              <div className="border-t pt-3 space-y-2">
                <span className="text-xs font-semibold text-gray-900 block">Field Privacy & Visibility Settings</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.keys(fieldVisibility).map((key) => (
                    <div key={key} className="flex items-center justify-between border rounded p-2 bg-gray-50">
                      <span className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                      <select
                        value={fieldVisibility[key]}
                        onChange={(e) =>
                          setFieldVisibility((prev) => ({
                            ...prev,
                            [key]: e.target.value as "public" | "private" | "on_request",
                          }))
                        }
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="public">Public</option>
                        <option value="on_request">On Request</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </section>

          {/* Incoming Document Requests */}
          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Incoming Document Requests</h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                {requests.filter((r) => r.status === "pending").length} Pending
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Verifiers and clients can request verified document bundles from your public passport card.
            </p>

            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-semibold text-sm text-gray-900">{req.requesterName}</span>
                      <p className="text-xs text-gray-600">{req.requesterCompany} ({req.requesterEmail})</p>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                        req.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : req.status === "declined"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {req.status.toUpperCase()}
                    </span>
                  </div>

                  {req.message && (
                    <p className="text-xs italic text-gray-700 bg-gray-50 p-2 rounded">&quot;{req.message}&quot;</p>
                  )}

                  <div className="text-xs text-gray-500">
                    Requested Items: <span className="font-semibold text-gray-800">{req.requestedItems.join(", ")}</span>
                  </div>

                  {req.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setApprovingRequestId(req.id)}
                        className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Approve & Grant Bundle
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.id)}
                        className="rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Col: Live Card Preview */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Live Preview</h2>
          <div className={`rounded-xl border p-4 transition-all ${theme.containerClass}`}>
            <div className={theme.headerClass}>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badgeClass}`}>
                ✓ Verified
              </span>
              <h3 className={`mt-2 text-lg font-bold text-white`}>Acme Logistics Ltd</h3>
              <p className="text-xs opacity-80 mt-0.5">{tagline}</p>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">RC Number:</span>
                <span className="font-bold">RC-1928374</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">State:</span>
                <span className="font-bold">Lagos</span>
              </div>
              <div className="pt-2">
                <span className="block font-semibold mb-1">Actions Preview:</span>
                <div className="space-y-1.5">
                  <div className={`rounded p-2 text-center text-xs ${theme.accentButtonClass}`}>
                    🎴 Save Contact (vCard)
                  </div>
                  <div className={`rounded p-2 text-center text-xs ${theme.secondaryButtonClass}`}>
                    🔒 Request Verified Docs
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Approval Modal */}
      {approvingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Approve Document Package Bundle</h3>
            <p className="text-xs text-gray-500">
              Select vault documents to bundle into a secure, time-limited share link (expires in 7 days).
            </p>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-gray-700">Select Vault Documents</label>
              {[
                { id: "cac_cert", label: "CAC Incorporation Certificate (Verified)" },
                { id: "tax_clearance", label: "FIRS Tax Clearance 2025 (Verified)" },
                { id: "company_profile", label: "Standard Verified Company Profile" },
              ].map((doc) => (
                <label key={doc.id} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedDocsForPackage.includes(doc.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedDocsForPackage((prev) => [...prev, doc.id]);
                      else setSelectedDocsForPackage((prev) => prev.filter((d) => d !== doc.id));
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{doc.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Disclose Missing Gaps (Optional)</label>
              <input
                type="text"
                value={gapInput}
                onChange={(e) => setGapInput(e.target.value)}
                placeholder="e.g. Audited 2024 Financials currently in audit"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setApprovingRequestId(null)}
                className="w-1/3 rounded-lg border border-gray-300 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveRequest(approvingRequestId)}
                className="w-2/3 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Approve & Generate Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
