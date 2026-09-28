"use client";

import { useState, useEffect } from "react";
import { PRODUCT_COPY } from "@/lib/copy";
import { OFFICIAL_PORTAL_LINKS } from "@/lib/officialLinks";

export type OnboardingPath = "start" | "existing";

export interface OnboardingState {
  step: number;
  path?: OnboardingPath;
  businessName: string;
  businessType: "business_name" | "limited_company" | "incorporated_trustees" | "unregistered";
  productsDescription: string;
  state: string;
  lga: string;
  hasEmployees: boolean;
  hasPhysicalShop: boolean;
  sellsOnline: boolean;
  uploadedFileName?: string;
  extractedFields?: {
    legalName?: string;
    rcNumber?: string;
    taxId?: string;
  };
  confirmedFields?: Record<string, boolean>;
  clarifyingQuestionNeeded?: boolean;
  checklistGenerated?: boolean;
}

export default function OnboardingPage() {
  const [state, setState] = useState<OnboardingState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("onboarding_state");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return {
      step: 1,
      businessName: "",
      businessType: "unregistered",
      productsDescription: "",
      state: "Lagos",
      lga: "Eti-Osa",
      hasEmployees: false,
      hasPhysicalShop: false,
      sellsOnline: false,
    };
  });

  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [generatedPassportSlug, setGeneratedPassportSlug] = useState<string | null>(null);

  // Save progress after every step answer
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("onboarding_state", JSON.stringify(state));
    }
  }, [state]);

  const updateState = (patch: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const handleNextStep = () => {
    updateState({ step: state.step + 1 });
  };

  // Document upload extraction handler for Existing Path (Johnson persona)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingDoc(true);
    setTimeout(() => {
      setIsProcessingDoc(false);
      updateState({
        uploadedFileName: file.name,
        extractedFields: {
          legalName: "Johnson Auto Repairs Ltd",
          rcNumber: "RC-1928374",
          taxId: "TIN-88776655",
        },
        confirmedFields: {
          legalName: false,
          rcNumber: false,
          taxId: false,
        },
        step: 3, // Proceed to confirm-to-prefill screen
      });
    }, 1200);
  };

  const handleConfirmField = (field: string) => {
    updateState({
      confirmedFields: {
        ...state.confirmedFields,
        [field]: true,
      },
    });
  };

  const handleFinishOnboarding = () => {
    const code = "BP-NG-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const slug = (state.businessName || "my-business").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + code.toLowerCase();
    setGeneratedPassportSlug(slug);
    setIsCompleted(true);
    if (typeof window !== "undefined") {
      localStorage.removeItem("onboarding_state");
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 px-4 py-6 text-gray-900 sm:px-6">
      {/* Mobile Header Progress */}
      <div className="mb-6 flex items-center justify-between border-b pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Step {state.step} of {state.path === "existing" ? 4 : 6}
        </span>
        <button
          onClick={() => {
            if (window.confirm("Reset onboarding progress?")) {
              localStorage.removeItem("onboarding_state");
              window.location.reload();
            }
          }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Reset
        </button>
      </div>

      {!isCompleted ? (
        <div className="space-y-6">
          {/* SCREEN 1: What do you want to do? */}
          {state.step === 1 && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border">
              <h1 className="text-xl font-bold text-gray-900">What do you want to do?</h1>
              <p className="text-sm text-gray-600">
                Welcome to AI Business Passport. We help you run your business smoothly.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    updateState({ path: "start", businessType: "unregistered", step: 2 });
                  }}
                  className="w-full rounded-lg border border-blue-600 bg-blue-50 p-4 text-left font-semibold text-blue-900 shadow-sm hover:bg-blue-100"
                >
                  Start a new business
                  <span className="block text-xs font-normal text-blue-700">
                    I need help choosing a business name, registering, and staying compliant.
                  </span>
                </button>

                <button
                  onClick={() => {
                    updateState({ path: "existing", businessType: "limited_company", step: 2 });
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white p-4 text-left font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
                >
                  I already have a business
                  <span className="block text-xs font-normal text-gray-500">
                    Upload your CAC certificate or enter details to get your verified Passport.
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* START PATH - SCREEN 2: What will you sell? */}
          {state.path === "start" && state.step === 2 && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-900">What will your business sell or do?</h2>
              <p className="text-xs text-gray-500">Describe your products or services in plain words.</p>
              <textarea
                value={state.productsDescription}
                onChange={(e) => updateState({ productsDescription: e.target.value })}
                placeholder="e.g. Organic skincare products, IT consulting, logistics"
                className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
              />
              <button
                onClick={handleNextStep}
                disabled={!state.productsDescription.trim()}
                className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {/* START PATH - SCREEN 3: Location (State & LGA) */}
          {state.path === "start" && state.step === 3 && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-900">Where is your business located?</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-700">State of Operations</label>
                  <select
                    value={state.state}
                    onChange={(e) => updateState({ state: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 p-2.5"
                  >
                    <option value="Lagos">Lagos</option>
                    <option value="Kano">Kano</option>
                    <option value="Oyo">Oyo</option>
                    <option value="Abuja FCT">Abuja FCT</option>
                    <option value="Rivers">Rivers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Local Government Area (LGA)</label>
                  <input
                    type="text"
                    value={state.lga}
                    onChange={(e) => updateState({ lga: e.target.value })}
                    placeholder="e.g. Eti-Osa, Ikeja, Bodija"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2.5"
                  />
                </div>
              </div>
              <button
                onClick={handleNextStep}
                className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          )}

          {/* START PATH - SCREEN 4: Operational Footprint */}
          {state.path === "start" && state.step === 4 && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-900">Quick details about how you operate</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between border-b pb-3 text-sm">
                  <span>Will you hire employees?</span>
                  <input
                    type="checkbox"
                    checked={state.hasEmployees}
                    onChange={(e) => updateState({ hasEmployees: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                </label>
                <label className="flex items-center justify-between border-b pb-3 text-sm">
                  <span>Will you operate a physical shop or office?</span>
                  <input
                    type="checkbox"
                    checked={state.hasPhysicalShop}
                    onChange={(e) => updateState({ hasPhysicalShop: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                </label>
                <label className="flex items-center justify-between border-b pb-3 text-sm">
                  <span>Will you sell online or via social media?</span>
                  <input
                    type="checkbox"
                    checked={state.sellsOnline}
                    onChange={(e) => updateState({ sellsOnline: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                </label>
              </div>
              <button
                onClick={handleNextStep}
                className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          )}

          {/* START PATH - SCREEN 5: Business Name & Industry Confirmation */}
          {state.path === "start" && state.step === 5 && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-900">Name your business</h2>
              <div>
                <label className="block text-xs font-medium text-gray-700">Proposed Business Name</label>
                <input
                  type="text"
                  value={state.businessName}
                  onChange={(e) => updateState({ businessName: e.target.value })}
                  placeholder="e.g. Sarah Skincare & Beauty"
                  className="mt-1 w-full rounded-md border border-gray-300 p-2.5 text-sm"
                />
              </div>
              <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
                AI Industry Match: <strong>Personal Care & Retail</strong>
              </div>
              <button
                onClick={handleNextStep}
                disabled={!state.businessName.trim()}
                className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Generate Checklist
              </button>
            </div>
          )}

          {/* START PATH - SCREEN 6: Rule-Backed Checklist & Create Business Passport */}
          {state.path === "start" && state.step === 6 && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border">
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                Rule-Backed Checklist Ready
              </span>
              <h2 className="text-xl font-bold text-gray-900">Your Business Checklist</h2>
              
              <div className="space-y-3 text-xs">
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <strong className="block text-sm font-semibold text-gray-900">1. Business Registration (CAC)</strong>
                  <p className="text-gray-600">Reserve your business name on the CAC portal.</p>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <strong className="block text-sm font-semibold text-gray-900">2. Tax ID (FIRS & State IRS)</strong>
                  <p className="text-gray-600">Register for Tax Identification Number (TIN).</p>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <strong className="block text-sm font-semibold text-gray-900">3. {PRODUCT_COPY.documentsVaultTitle}</strong>
                  <p className="text-gray-600">Keep your certificates safely stored.</p>
                </div>
              </div>

              <button
                onClick={handleFinishOnboarding}
                className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Create my free Business Passport
              </button>
            </div>
          )}

          {/* EXISTING PATH - SCREEN 2: Upload CAC Cert (Johnson persona) */}
          {state.path === "existing" && state.step === 2 && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-900">Upload your business certificate</h2>
              <p className="text-xs text-gray-500">
                Upload your CAC certificate or status report. Our AI reads the document details for you.
              </p>

              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <input
                  type="file"
                  id="cac-upload"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <label htmlFor="cac-upload" className="cursor-pointer text-sm font-semibold text-blue-600 hover:underline">
                  {isProcessingDoc ? "Parsing document..." : "Click to select document file"}
                </label>
              </div>

              <div className="border-t pt-4 text-center">
                <button
                  onClick={() => updateState({ step: 3, businessName: "Johnson Auto Repairs Ltd" })}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Skip document upload & enter manually
                </button>
              </div>
            </div>
          )}

          {/* EXISTING PATH - SCREEN 3: Confirm-to-Prefill (Never silently accept) */}
          {state.path === "existing" && state.step === 3 && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border">
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                Confirm Extracted Values
              </span>
              <h2 className="text-lg font-bold text-gray-900">Confirm your details</h2>
              <p className="text-xs text-gray-600">{PRODUCT_COPY.confirmBeforeFilingPrompt}</p>

              <div className="space-y-3 text-xs">
                {Object.entries(state.extractedFields || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <span className="block text-xs font-medium text-gray-500 uppercase">{key}</span>
                      <span className="font-semibold text-gray-900">{value}</span>
                    </div>
                    <button
                      onClick={() => handleConfirmField(key)}
                      className={`rounded px-3 py-1 text-xs font-semibold ${
                        state.confirmedFields?.[key]
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {state.confirmedFields?.[key] ? "Confirmed ✓" : "Confirm"}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleNextStep}
                className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Proceed to Checklist
              </button>
            </div>
          )}

          {/* EXISTING PATH - SCREEN 4: Create Passport */}
          {state.path === "existing" && state.step === 4 && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border">
              <h2 className="text-xl font-bold text-gray-900">Verification Complete</h2>
              <p className="text-xs text-gray-600">Your details have been confirmed and backed by your official records.</p>
              <button
                onClick={handleFinishOnboarding}
                className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Create my free Business Passport
              </button>
            </div>
          )}
        </div>
      ) : (
        /* COMPLETED: Let's Start Guidance Screen with Official Links */
        <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm border">
          <div className="text-center">
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              Verified Passport Issued
            </span>
            <h1 className="mt-2 text-xl font-bold text-gray-900">Let&apos;s Get Started</h1>
            <p className="text-xs text-gray-500">
              Passport ID: <span className="font-semibold text-gray-800">{generatedPassportSlug}</span>
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-sm font-bold text-gray-900">Official Portal Guidance</h2>
            
            <div className="space-y-3">
              <div className="rounded-lg border p-3 text-xs">
                <span className="font-semibold text-gray-900 block">{OFFICIAL_PORTAL_LINKS.cac_registration.name}</span>
                <p className="text-gray-500 mb-2">{OFFICIAL_PORTAL_LINKS.cac_registration.description}</p>
                <a
                  href={OFFICIAL_PORTAL_LINKS.cac_registration.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-blue-600 font-semibold hover:underline"
                >
                  Visit Official CAC Portal &rarr;
                </a>
              </div>

              <div className="rounded-lg border p-3 text-xs">
                <span className="font-semibold text-gray-900 block">{OFFICIAL_PORTAL_LINKS.firs_taxpro_max.name}</span>
                <p className="text-gray-500 mb-2">{OFFICIAL_PORTAL_LINKS.firs_taxpro_max.description}</p>
                <a
                  href={OFFICIAL_PORTAL_LINKS.firs_taxpro_max.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-blue-600 font-semibold hover:underline"
                >
                  Visit FIRS TaxPro Max &rarr;
                </a>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 pt-2">{PRODUCT_COPY.trustNotice}</p>
        </div>
      )}
    </div>
  );
}
