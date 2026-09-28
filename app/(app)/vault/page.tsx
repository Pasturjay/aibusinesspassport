"use client";

import { useState } from "react";
import { PRODUCT_COPY } from "@/lib/copy";

export type VaultCategory =
  | "all"
  | "registration"
  | "tax"
  | "licences"
  | "employees"
  | "contracts"
  | "finance"
  | "credentials"
  | "tender"
  | "other";

export interface MockVaultDocument {
  id: string;
  fileName: string;
  category: VaultCategory;
  docType: string;
  sizeBytes: number;
  uploadDate: string;
  status: "processing" | "ready" | "failed";
  reviewStatus: "auto_filed" | "needs_review" | "confirmed";
  confidence?: number;
  mismatchNotice?: string;
  expiresAt?: string;
  isBackedCredential?: boolean;
}

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState<VaultCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Mock Vault Documents Data
  const [documents, setDocuments] = useState<MockVaultDocument[]>([
    {
      id: "doc-1",
      fileName: "CAC_Certificate_RC887766.pdf",
      category: "registration",
      docType: "cac_certificate",
      sizeBytes: 1250000,
      uploadDate: "2026-01-15",
      status: "ready",
      reviewStatus: "confirmed",
      confidence: 0.98,
      isBackedCredential: true,
    },
    {
      id: "doc-2",
      fileName: "TCC_Tax_Clearance_2025.pdf",
      category: "tax",
      docType: "tax_clearance",
      sizeBytes: 890000,
      uploadDate: "2026-02-10",
      status: "ready",
      reviewStatus: "needs_review",
      confidence: 0.78,
      mismatchNotice:
        'Name Mismatch: Document shows "Lekki Green Energies", but Business Brain has "Lekki Green Energies Ltd". Please review.',
      expiresAt: "2026-12-31",
    },
    {
      id: "doc-3",
      fileName: "Office_Lease_Agreement.pdf",
      category: "contracts",
      docType: "lease",
      sizeBytes: 3400000,
      uploadDate: "2026-03-01",
      status: "ready",
      reviewStatus: "auto_filed",
      confidence: 0.92,
      expiresAt: "2026-11-01",
    },
  ]);

  const categories: { key: VaultCategory; label: string }[] = [
    { key: "all", label: "All Vault Files" },
    { key: "registration", label: "Registration" },
    { key: "tax", label: "Tax & FIRS" },
    { key: "licences", label: "Licences" },
    { key: "employees", label: "Employees" },
    { key: "contracts", label: "Contracts" },
    { key: "finance", label: "Finance" },
    { key: "credentials", label: "Credentials" },
  ];

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("File size exceeds 20MB limit.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          // Add newly uploaded document
          const newDoc: MockVaultDocument = {
            id: `doc-${Date.now()}`,
            fileName: file.name,
            category: "uncategorised" as any,
            docType: "pending_classification",
            sizeBytes: file.size,
            uploadDate: new Date().toISOString().split("T")[0],
            status: "ready",
            reviewStatus: "needs_review",
            confidence: 0.82,
          };
          setDocuments((prevDocs) => [newDoc, ...prevDocs]);
          return 100;
        }
        return prev + 30;
      });
    }, 400);
  };

  const handleConfirmDoc = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, reviewStatus: "confirmed" } : d))
    );
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesCategory = activeTab === "all" || doc.category === activeTab;
    const matchesSearch =
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.docType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const needsReviewDocs = documents.filter((d) => d.reviewStatus === "needs_review");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{PRODUCT_COPY.documentsVaultTitle}</h1>
          <p className="text-sm text-gray-600">
            Securely upload, organize, and store your business certificates and records.
          </p>
        </div>

        {/* Tier Storage Indicator */}
        <div className="rounded-lg border bg-white p-3 text-xs shadow-sm">
          <span className="font-semibold text-gray-900">Vault Storage (Free Tier)</span>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 w-32 rounded-full bg-gray-200">
              <div className="h-2 w-12 rounded-full bg-blue-600" />
            </div>
            <span className="text-gray-500">5.5MB / 50MB</span>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 text-center">
        <input
          type="file"
          id="vault-upload"
          onChange={handleSimulatedUpload}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
        />
        <label
          htmlFor="vault-upload"
          className="cursor-pointer inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          Upload Document to Vault
        </label>
        <p className="mt-2 text-xs text-gray-500">
          Supports PDF, JPG, PNG, WEBP, DOCX up to 20MB per file.
        </p>

        {isUploading && (
          <div className="mt-4 mx-auto max-w-xs space-y-1">
            <div className="flex justify-between text-xs text-blue-800">
              <span>Uploading to Cloudflare R2...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-blue-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* "Needs Review" Inbox Banner */}
      {needsReviewDocs.length > 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
              {needsReviewDocs.length} Document(s) Need Review
            </span>
            <span className="text-xs text-yellow-700 font-medium">Trust & Accuracy Verification</span>
          </div>
          <p className="text-xs text-yellow-900">
            Some uploaded documents require your confirmation before they are permanently filed.
          </p>
        </div>
      )}

      {/* Category Tabs & Search Bar */}
      <div className="space-y-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents by name or file type..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="flex overflow-x-auto gap-2 border-b pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
                activeTab === cat.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vault Document List */}
      <div className="space-y-3">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="flex flex-col gap-2 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">{doc.fileName}</span>
                {doc.isBackedCredential && (
                  <span className="rounded bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 border border-green-200">
                    Backed by your uploaded document
                  </span>
                )}
                {doc.reviewStatus === "needs_review" && (
                  <span className="rounded bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800">
                    Needs Review
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>Category: <strong className="capitalize">{doc.category}</strong></span>
                <span>Size: {Math.round(doc.sizeBytes / 1024)} KB</span>
                <span>Uploaded: {doc.uploadDate}</span>
                {doc.expiresAt && <span className="text-red-600 font-medium">Expires: {doc.expiresAt}</span>}
              </div>

              {/* Mismatch Notice Banner */}
              {doc.mismatchNotice && (
                <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-800 border border-red-100">
                  {doc.mismatchNotice}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t pt-2 sm:border-t-0 sm:pt-0">
              {doc.reviewStatus === "needs_review" ? (
                <button
                  onClick={() => handleConfirmDoc(doc.id)}
                  className="rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700"
                >
                  Confirm Details
                </button>
              ) : (
                <button
                  onClick={() => alert(`Downloading ${doc.fileName}...`)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {PRODUCT_COPY.downloadDocument}
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">
            No documents found in this category.
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 pt-4">
        {PRODUCT_COPY.trustNotice}
      </p>
    </div>
  );
}
