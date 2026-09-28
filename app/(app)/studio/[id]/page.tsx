"use client";

import { useState } from "react";
import { DISCLAIMER_LEGAL } from "@/lib/copy";

interface Section {
  key: string;
  title: string;
  content: string;
}

interface VersionEntry {
  id: string;
  version: number;
  sectionKey: string;
  actor: "user" | "ai";
  createdAt: string;
}

export default function DocumentStudioEditorPage({ params }: { params: { id: string } }) {
  const docId = params.id;

  // Mock Document Studio State for Interactive Editor UI
  const [documentTitle] = useState("Corporate Company Profile");
  const [sections, setSections] = useState<Section[]>([
    {
      key: "exec_summary",
      title: "Executive Summary",
      content: "Apex Zenith Logistics Ltd is a premier freight and supply chain solutions provider operating across Lagos, Rivers, and FCT Abuja. Founded in 2021, we specialise in interstate haulage and warehousing.",
    },
    {
      key: "products_services",
      title: "Products & Core Services",
      content: "1. Interstate Fleet Haulage\n2. Warehouse Logistics Management\n3. Cold-Chain Agricultural Transport",
    },
    {
      key: "statutory_compliance",
      title: "Statutory Identity & Compliance",
      content: "CAC RC Number: RC-1849201 | Tax Identification Number (TIN): 29481029-0001 | FIRS Tax Clearance Valid through 2026-12-31.",
    },
  ]);

  const [history, setHistory] = useState<VersionEntry[]>([
    { id: "v2", version: 2, sectionKey: "exec_summary", actor: "user", createdAt: "2026-09-28 14:30" },
    { id: "v1", version: 1, sectionKey: "exec_summary", actor: "ai", createdAt: "2026-09-28 14:00" },
  ]);

  const [activeTab, setActiveTab] = useState<"editor" | "history" | "data_source">("editor");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleSectionChange = (key: string, newContent: string) => {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, content: newContent } : s))
    );
  };

  const handleRegenerateSection = (key: string) => {
    setActionNotice(`Regenerating section '${key}' with AI grounding...`);
    setTimeout(() => {
      setSections((prev) =>
        prev.map((s) =>
          s.key === key
            ? {
                ...s,
                content: s.content + "\n\n[Regenerated with updated Brain snapshot data]",
              }
            : s
        )
      );
      setHistory((prev) => [
        {
          id: `v${prev.length + 1}`,
          version: prev.length + 1,
          sectionKey: key,
          actor: "ai",
          createdAt: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      setActionNotice(`Section '${key}' regenerated successfully!`);
      setTimeout(() => setActionNotice(null), 3000);
    }, 1000);
  };

  const handleSyncToBrain = () => {
    if (window.confirm("Sync edited company details back to your main Business Brain snapshot?")) {
      setActionNotice("Successfully synced edited fields back to Business Brain!");
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleExport = (format: "pdf" | "docx" | "letterhead") => {
    setActionNotice(`Exporting document as ${format.toUpperCase()}...`);
    setTimeout(() => {
      alert(`Download started for ${documentTitle}.${format === "letterhead" ? "pdf" : format}`);
      setActionNotice(null);
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 uppercase">
              Document Studio
            </span>
            <span className="text-xs text-gray-500">&bull; Doc ID: {docId}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{documentTitle}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncToBrain}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Update My Business Details
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            Export PDF
          </button>
          <button
            onClick={() => handleExport("docx")}
            className="rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-gray-800"
          >
            Export DOCX
          </button>
          <button
            onClick={() => handleExport("letterhead")}
            className="rounded-lg border border-blue-600 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
          >
            Letterhead PDF
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-800 border border-blue-200">
          ℹ {actionNotice}
        </div>
      )}

      {/* Main Grid: Left Editor (70%), Right Data/History (30%) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Section Editor (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-xl border bg-white p-5 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase border-b pb-2">Document Sections</h2>

            {sections.map((sec) => (
              <div key={sec.key} className="space-y-2 border-b pb-6 last:border-b-0">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                    {sec.title}
                  </label>
                  <button
                    onClick={() => handleRegenerateSection(sec.key)}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    ↻ Regenerate Section
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={sec.content}
                  onChange={(e) => handleSectionChange(sec.key, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            ))}

            {/* Standard Legal Disclaimer Footer */}
            <div className="rounded-lg bg-amber-50 p-3 text-[11px] text-amber-900 border border-amber-200">
              <strong>LEGAL DISCLAIMER:</strong> {DISCLAIMER_LEGAL}
            </div>
          </div>
        </div>

        {/* Right Column: Data Source Highlighting & Version History (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <button
                onClick={() => setActiveTab("editor")}
                className={`text-xs font-bold ${activeTab === "editor" ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "text-gray-500"}`}
              >
                Data Grounding
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`text-xs font-bold ${activeTab === "history" ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "text-gray-500"}`}
              >
                Version History ({history.length})
              </button>
            </div>

            {activeTab === "editor" && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600">
                  Highlighted facts extracted directly from your verified <strong>Business Brain</strong>:
                </p>
                <div className="rounded border bg-gray-50 p-2.5 space-y-1.5 font-mono text-[11px]">
                  <div><strong className="text-blue-700">identity.legalName:</strong> Apex Zenith Logistics Ltd</div>
                  <div><strong className="text-blue-700">identity.rcNumber:</strong> RC-1849201</div>
                  <div><strong className="text-blue-700">identity.tin:</strong> 29481029-0001</div>
                  <div><strong className="text-blue-700">operations.operatesStates:</strong> [&quot;Lagos&quot;, &quot;Rivers&quot;, &quot;FCT Abuja&quot;]</div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600">Revision trail for section updates:</p>
                <div className="space-y-2">
                  {history.map((ver) => (
                    <div key={ver.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <span className="font-bold text-gray-900">Rev v{ver.version} &bull; {ver.sectionKey}</span>
                        <p className="text-[10px] text-gray-500">Actor: {ver.actor.toUpperCase()} &bull; {ver.createdAt}</p>
                      </div>
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Saved
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
