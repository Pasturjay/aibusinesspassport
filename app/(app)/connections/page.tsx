"use client";

import { useState } from "react";

export default function ConnectionsNetworkingPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | "requests" | "scans" | "blocked">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Mock Connections Data (Story H1, H2)
  const [connections, setConnections] = useState([
    {
      id: "conn_1",
      name: "Nkechi Amadi",
      company: "Access Bank Plc (Credit Risk)",
      email: "n.amadi@accessbankplc.com",
      phone: "+234 802 111 2222",
      source: "request",
      tags: ["bank", "credit_lead"],
      notes: "Met regarding SME credit facility #FAC-99182",
      lastContactedAt: "2026-09-27",
      followUpAt: "2026-10-05",
      status: "active",
    },
    {
      id: "conn_2",
      name: "Tunde Bakare",
      company: "Lagos State Procurement Agency",
      email: "tunde.bakare@lagos.gov.ng",
      phone: "+234 803 333 4444",
      source: "passport_scan",
      tags: ["government", "tender"],
      notes: "Scanned QR card at Lagos Trade Fair 2026",
      lastContactedAt: "2026-09-25",
      followUpAt: "2026-09-30",
      status: "active",
    },
    {
      id: "conn_3",
      name: "Spammy Marketer",
      company: "Unknown Spammer",
      email: "spam@unsolicited.com",
      phone: "+234 800 000 0000",
      source: "request",
      tags: ["spam"],
      notes: "Unsolicited promotional requests",
      lastContactedAt: "2026-09-20",
      followUpAt: undefined,
      status: "blocked",
    },
  ]);

  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [followUpDateInput, setFollowUpDateInput] = useState("");

  const handleSendPassportBack = (connName: string) => {
    setActionNotice(`Passport share link successfully sent back to ${connName}!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleToggleBlock = (connId: string, currentStatus: string) => {
    const newStatus = currentStatus === "blocked" ? "active" : "blocked";
    setConnections((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, status: newStatus } : c))
    );
    setActionNotice(newStatus === "blocked" ? "Contact blocked successfully." : "Contact unblocked.");
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSaveNotes = (connId: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === connId ? { ...c, notes: noteInput, followUpAt: followUpDateInput || c.followUpAt } : c
      )
    );
    setEditingNotesId(null);
    setActionNotice("Connection notes & follow-up reminder saved!");
    setTimeout(() => setActionNotice(null), 3000);
  };

  const filteredConns = connections.filter((c) => {
    if (activeFilter === "blocked") return c.status === "blocked";
    if (c.status === "blocked") return false;
    if (activeFilter === "requests") return c.source === "request";
    if (activeFilter === "scans") return c.source === "passport_scan";
    return true;
  }).filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connections & Networking Log</h1>
          <p className="text-sm text-gray-600">
            Manage leads, verifiers, and contacts who saved your card or requested documents (Epic H).
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="rounded-lg bg-green-50 p-4 text-xs font-semibold text-green-800 border border-green-200">
          ✓ {actionNotice}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="flex gap-2 text-xs font-medium">
          {[
            { key: "all", label: "All Contacts" },
            { key: "requests", label: "Document Requesters" },
            { key: "scans", label: "QR / NFC Scans" },
            { key: "blocked", label: "Blocked Requesters" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as any)}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                activeFilter === tab.key
                  ? "bg-gray-900 text-white font-bold"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, company, or email..."
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none sm:w-64"
        />
      </div>

      {/* Connection List */}
      <div className="space-y-4">
        {filteredConns.map((conn) => (
          <div key={conn.id} className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">{conn.name}</h3>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                    {conn.source.replace("_", " ")}
                  </span>
                  {conn.status === "blocked" && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 uppercase">
                      BLOCKED
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{conn.company}</p>
                <p className="text-xs text-gray-500">{conn.email} &bull; {conn.phone}</p>
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-0">
                <button
                  onClick={() => handleSendPassportBack(conn.name)}
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  📨 Send Passport Back
                </button>
                <button
                  onClick={() => handleToggleBlock(conn.id, conn.status)}
                  className={`rounded border px-3 py-1.5 text-xs font-semibold ${
                    conn.status === "blocked"
                      ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      : "border-red-300 text-red-700 hover:bg-red-50"
                  }`}
                >
                  {conn.status === "blocked" ? "Unblock" : "Block"}
                </button>
              </div>
            </div>

            {/* Notes & Tags */}
            <div className="text-xs space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-gray-700">Tags:</span>
                {conn.tags.map((tag, idx) => (
                  <span key={idx} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                    #{tag}
                  </span>
                ))}
              </div>

              {conn.notes && (
                <p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
                  <strong className="text-gray-900">Notes:</strong> {conn.notes}
                </p>
              )}

              {conn.followUpAt && (
                <div className="inline-flex items-center gap-1 rounded bg-amber-50 px-2.5 py-1 text-amber-900 font-semibold border border-amber-200">
                  ⏰ Follow-up Scheduled: {conn.followUpAt}
                </div>
              )}
            </div>

            {/* Edit Notes Trigger */}
            <div className="pt-1">
              {editingNotesId === conn.id ? (
                <div className="space-y-3 pt-2 bg-gray-50 p-3 rounded-lg border">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700">Add Notes</label>
                    <textarea
                      rows={2}
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Add meeting outcome or contact details..."
                      className="mt-1 w-full rounded border border-gray-300 p-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700">Set Follow-up Reminder Date</label>
                    <input
                      type="date"
                      value={followUpDateInput}
                      onChange={(e) => setFollowUpDateInput(e.target.value)}
                      className="mt-1 rounded border border-gray-300 p-1.5 text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveNotes(conn.id)}
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingNotesId(null)}
                      className="rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNoteInput(conn.notes || "");
                    setFollowUpDateInput(conn.followUpAt || "");
                    setEditingNotesId(conn.id);
                  }}
                  className="text-xs text-blue-600 font-medium hover:underline"
                >
                  + Edit Notes & Follow-up Reminder
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
