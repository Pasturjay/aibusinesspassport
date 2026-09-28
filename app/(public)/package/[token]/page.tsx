"use client";

import { useState, use } from "react";

interface PackagePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default function SharedPackagePage({ params }: PackagePageProps) {
  const { token } = use(params);

  // In production, resolves from Convex query `getSharedPackageByToken`
  const mockPackageData = {
    isFound: true,
    isExpired: false,
    businessName: "Acme Logistics & Technology Ltd",
    expiresAt: "2026-10-15T23:59:59.000Z",
    downloadCount: 3,
    items: [
      {
        label: "CAC Incorporation Certificate (RC-1928374)",
        documentId: "doc_cac_1",
        fileName: "CAC_Certificate_Acme_Logistics.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1245000,
        category: "registration",
      },
      {
        label: "FIRS Tax Clearance Certificate 2025",
        documentId: "doc_tax_1",
        fileName: "FIRS_Tax_Clearance_2025.pdf",
        mimeType: "application/pdf",
        sizeBytes: 890000,
        category: "tax",
      },
      {
        label: "Standard Verified Company Profile",
        documentId: "doc_prof_1",
        fileName: "Acme_Logistics_Verified_Profile.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2100000,
        category: "credentials",
      },
    ],
    gaps: ["Audited Financial Statements 2024 (Pending Audit)"],
  };

  const [downloadedCount, setDownloadedCount] = useState(mockPackageData.downloadCount);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const handleDownloadDoc = (fileName: string) => {
    setDownloadedCount((prev) => prev + 1);
    setDownloadNotice(`Downloading ${fileName}...`);
    setTimeout(() => setDownloadNotice(null), 3000);
  };

  if (!mockPackageData.isFound) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900">Package Not Found</h1>
        <p className="text-xs text-gray-500">
          The requested document package link is invalid or may have been revoked.
        </p>
      </div>
    );
  }

  if (mockPackageData.isExpired) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <div className="text-4xl">⌛</div>
        <h1 className="text-xl font-bold text-gray-900">Access Link Expired</h1>
        <p className="text-xs text-gray-500">
          This document bundle link expired on {new Date(mockPackageData.expiresAt).toLocaleDateString()}. Please request a new link from the business owner.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              🔒 Verified Shared Bundle
            </span>
            <h1 className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
              {mockPackageData.businessName}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Authorized Document Package &bull; Shared for Verification
            </p>
          </div>
        </div>

        {downloadNotice && (
          <div className="rounded-md bg-green-50 p-3 text-xs font-medium text-green-800 border border-green-200">
            ✓ {downloadNotice}
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
          <div>
            <span className="font-semibold text-gray-900">Access Token Reference:</span>
            <p className="font-mono text-gray-700">{token.substring(0, 16)}...</p>
          </div>
          <div>
            <span className="font-semibold text-gray-900">Expires On:</span>
            <p className="text-gray-700">{new Date(mockPackageData.expiresAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Bundled Documents List */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Included Verified Documents</h2>
          <div className="space-y-3">
            {mockPackageData.items.map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50/80 transition-colors">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-900 block">{doc.label}</span>
                  <span className="text-[11px] text-gray-500 block">
                    {doc.fileName} &bull; {(doc.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                <button
                  onClick={() => handleDownloadDoc(doc.fileName)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Download File
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Gaps or Missing Requirements Warning */}
        {mockPackageData.gaps.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
            <h3 className="text-xs font-bold text-amber-900">⚠️ Disclosed Gaps & Exclusions</h3>
            <p className="text-[11px] text-amber-800">
              The business owner noted the following requested items were missing or unfulfilled:
            </p>
            <ul className="list-disc list-inside text-xs text-amber-900">
              {mockPackageData.gaps.map((gap, idx) => (
                <li key={idx}>{gap}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t pt-4 text-center text-[11px] text-gray-400">
          Downloads Logged: {downloadedCount} times &bull; Powered by AI Business Passport Nigeria
        </div>
      </div>
    </div>
  );
}
