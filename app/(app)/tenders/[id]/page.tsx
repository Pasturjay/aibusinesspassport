"use client";

import { useState } from "react";
import Link from "next/link";

interface Requirement {
  id: string;
  category: "company_docs" | "technical" | "financial" | "submission";
  text: string;
  mandatory: boolean;
  matchStatus: "available" | "needs_preparation" | "missing";
  matchedDocumentId?: string;
  sourcePageRef?: string;
}

export default function TenderDetailsPage({ params }: { params: { id: string } }) {
  const tenderId = params.id;

  // Mock Tender Assistant State
  const [tenderTitle] = useState("Supply & Installation of Heavy-Duty Solar Generators");
  const [issuer] = useState("Federal Ministry of Power & Rural Electrification");
  const [deadline] = useState("2026-10-15");
  const [score] = useState(62);
  const [unparsedSections] = useState([
    "Page 14: Scanned diagram of grid interconnection specifications.",
  ]);

  const [acceptedRiskIds, setAcceptedRiskIds] = useState<string[]>([]);
  const [showPreSubmission, setShowPreSubmission] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [requirements] = useState<Requirement[]>([
    {
      id: "REQ-01",
      category: "company_docs",
      text: "Valid Tax Clearance Certificate (TCC) for the last 3 preceding years",
      mandatory: true,
      matchStatus: "needs_preparation",
      sourcePageRef: "Page 4",
    },
    {
      id: "REQ-02",
      category: "company_docs",
      text: "Copy of CAC Certificate of Incorporation",
      mandatory: true,
      matchStatus: "available",
      sourcePageRef: "Page 4",
    },
    {
      id: "REQ-03",
      category: "technical",
      text: "Evidence of at least 3 similar solar installation contracts executed in the last 5 years",
      mandatory: true,
      matchStatus: "available",
      sourcePageRef: "Page 7",
    },
    {
      id: "REQ-04",
      category: "financial",
      text: "Audited Accounts for 2023, 2024, and 2025",
      mandatory: false,
      matchStatus: "missing",
      sourcePageRef: "Page 9",
    },
    {
      id: "REQ-05",
      category: "submission",
      text: "Official Capability Statement and Technical Methodology Response",
      mandatory: true,
      matchStatus: "needs_preparation",
      sourcePageRef: "Page 12",
    },
  ]);

  const mandatoryMissing = requirements.filter(
    (r) => r.mandatory && r.matchStatus !== "available"
  );

  const handleAcceptRisk = (reqId: string) => {
    if (!acceptedRiskIds.includes(reqId)) {
      setAcceptedRiskIds((prev) => [...prev, reqId]);
      setActionNotice(`Requirement ${reqId} marked as accepted known risk.`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleBuildResponse = () => {
    setShowPreSubmission(true);
  };

  const handleConfirmSubmissionExport = () => {
    setActionNotice("Building & Exporting Tender Response Package ZIP...");
    setTimeout(() => {
      alert("Tender Response Package & Attachments ZIP downloaded successfully!");
      setShowPreSubmission(false);
      setActionNotice(null);
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
      {/* Top Disclaimer Banner */}
      <div className="rounded-lg bg-amber-50 p-4 text-xs text-amber-900 border border-amber-200">
        <strong>DISCLAIMER:</strong> Tender readiness score is an automated assessment based on your Business Brain and Vault docs. It is not a legal guarantee of eligibility or tender award.
      </div>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 uppercase">
              Tender Assistant & Bid Readiness
            </span>
            <span className="text-xs text-gray-500">&bull; ID: {tenderId}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{tenderTitle}</h1>
          <p className="text-xs text-gray-600">Issuer: {issuer} &bull; Deadline: <strong>{deadline}</strong></p>
        </div>

        <button
          onClick={handleBuildResponse}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
        >
          Build Tender Response Package
        </button>
      </div>

      {actionNotice && (
        <div className="rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-800 border border-blue-200">
          ℹ {actionNotice}
        </div>
      )}

      {/* Top Mandatory Missing Alert Panel (Disqualification Risk) */}
      {mandatoryMissing.length > 0 && (
        <div className="rounded-xl bg-red-50 p-5 border border-red-200 space-y-3">
          <div className="flex items-center gap-2 text-red-800 font-bold text-sm uppercase">
            <span>⚠ Disqualification Risk: {mandatoryMissing.length} Mandatory Requirement(s) Missing or Need Prep</span>
          </div>
          <p className="text-xs text-red-700">
            Failing to attach these mandatory items before the deadline ({deadline}) will result in automatic bid disqualification.
          </p>
          <ul className="space-y-1.5 text-xs text-red-900 list-disc pl-5 font-semibold">
            {mandatoryMissing.map((m) => (
              <li key={m.id}>
                <strong>{m.id}</strong> ({m.sourcePageRef}): {m.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unparsed Sections Banner */}
      {unparsedSections.length > 0 && (
        <div className="rounded-xl bg-gray-50 p-4 border border-gray-200 space-y-2">
          <h3 className="text-xs font-bold text-gray-900 uppercase">Unparsed Sections Surfaced for Manual Review</h3>
          <ul className="text-xs text-gray-600 list-disc pl-5">
            {unparsedSections.map((sec, i) => (
              <li key={i}>{sec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Readiness Score Card */}
      <div className="rounded-xl border bg-white p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Readiness Score</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-extrabold text-gray-900">{score}%</span>
            <span className={`text-xs font-bold ${score >= 80 ? "text-green-600" : "text-amber-600"}`}>
              {score >= 80 ? "High Bid Readiness" : "Action Required Before Submission"}
            </span>
          </div>
        </div>

        <div className="flex gap-4 text-center">
          <div className="rounded-lg bg-green-50 px-4 py-2 border border-green-200">
            <div className="text-lg font-bold text-green-800">{requirements.filter((r) => r.matchStatus === "available").length}</div>
            <div className="text-[10px] font-semibold text-green-700 uppercase">Available</div>
          </div>
          <div className="rounded-lg bg-amber-50 px-4 py-2 border border-amber-200">
            <div className="text-lg font-bold text-amber-800">{requirements.filter((r) => r.matchStatus === "needs_preparation").length}</div>
            <div className="text-[10px] font-semibold text-amber-700 uppercase">Needs Prep</div>
          </div>
          <div className="rounded-lg bg-red-50 px-4 py-2 border border-red-200">
            <div className="text-lg font-bold text-red-800">{requirements.filter((r) => r.matchStatus === "missing").length}</div>
            <div className="text-[10px] font-semibold text-red-700 uppercase">Missing</div>
          </div>
        </div>
      </div>

      {/* Requirements Matrix Table */}
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b pb-3">Requirements & Gap Resolution Matrix</h2>

        <div className="space-y-3">
          {requirements.map((req) => (
            <div key={req.id} className="flex flex-col md:flex-row md:items-center justify-between border-b pb-3 pt-1 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700">{req.id}</span>
                  <span className="text-xs text-gray-400">({req.sourcePageRef})</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      req.mandatory ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {req.mandatory ? "MANDATORY" : "SCORING"}
                  </span>
                </div>
                <p className="text-xs text-gray-900 font-medium">{req.text}</p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded px-2.5 py-1 text-xs font-bold uppercase ${
                    req.matchStatus === "available"
                      ? "bg-green-100 text-green-800"
                      : req.matchStatus === "needs_preparation"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {req.matchStatus.replace("_", " ")}
                </span>

                {req.matchStatus !== "available" && (
                  <div className="flex items-center gap-2">
                    {req.category === "submission" ? (
                      <Link
                        href="/studio/new"
                        className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Generate in Studio
                      </Link>
                    ) : (
                      <Link
                        href="/vault"
                        className="rounded bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-800"
                      >
                        Upload to Vault
                      </Link>
                    )}
                    {!req.mandatory && (
                      <button
                        onClick={() => handleAcceptRisk(req.id)}
                        disabled={acceptedRiskIds.includes(req.id)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        {acceptedRiskIds.includes(req.id) ? "Risk Accepted" : "Accept Risk"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pre-Submission Checklist Modal */}
      {showPreSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-xl w-full rounded-xl bg-white p-6 space-y-5 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-3">Pre-Submission Audit Checklist</h2>

            <p className="text-xs text-gray-600">
              The following audit record logs all unmet or risk-accepted requirements prior to package compilation:
            </p>

            <div className="rounded border bg-gray-50 p-4 space-y-2 text-xs">
              <h3 className="font-bold text-gray-900">Unmet / Pending Requirements Log:</h3>
              {mandatoryMissing.length === 0 ? (
                <p className="text-green-700 font-semibold">✓ All mandatory statutory requirements satisfied!</p>
              ) : (
                <ul className="list-disc pl-5 text-red-800 font-medium space-y-1">
                  {mandatoryMissing.map((m) => (
                    <li key={m.id}>{m.id}: {m.text}</li>
                  ))}
                </ul>
              )}

              {acceptedRiskIds.length > 0 && (
                <div className="pt-2 border-t">
                  <h4 className="font-bold text-amber-900">Accepted Non-Mandatory Risks:</h4>
                  <p className="text-amber-800">{acceptedRiskIds.join(", ")}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPreSubmission(false)}
                className="rounded-lg border px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Back to Matrix
              </button>
              <button
                onClick={handleConfirmSubmissionExport}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                Confirm & Download Response ZIP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
