"use client";

import { useState, use } from "react";
import { PASSPORT_THEMES, PassportStyleTheme } from "@/lib/passport/themes";
import { generateVCard } from "@/lib/passport/vcard";
import { PRODUCT_COPY } from "@/lib/copy";

interface PassportPublicProps {
  params: Promise<{
    passportId: string;
  }>;
}

export default function PublicPassportPage({ params }: PassportPublicProps) {
  const { passportId } = use(params);

  // Default theme & state (In production backed by Convex query getPublicPassport)
  const [styleTheme, setStyleTheme] = useState<PassportStyleTheme>("professional");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);

  // Form State for Document Request
  const [requesterName, setRequesterName] = useState("");
  const [requesterCompany, setRequesterCompany] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>(["company_profile", "registration"]);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestRef, setRequestRef] = useState<string | null>(null);

  // Mock public passport data (mimicking getPublicPassport shape)
  const passport = {
    passportId,
    passportSlug: passportId.toLowerCase(),
    style: styleTheme,
    tagline: "Leading Supply Chain & Technology Solutions Provider in West Africa",
    isVerified: true,
    status: "active",
    issuedAt: "2026-01-15",
    businessName: "Acme Logistics & Technology Ltd",
    tradingName: "AcmeExpress",
    registrationNumber: "RC-1928374",
    entityType: "Private Limited Company (LTD)",
    state: "Lagos",
    lga: "Ikeja",
    industry: "Logistics & Freight Services",
    description:
      "Acme Logistics & Technology Ltd provides tech-enabled warehousing, last-mile delivery, and customs clearance services across 18 states in Nigeria.",
    yearFounded: 2019,
    contact: {
      phone: "+234 803 123 4567",
      email: "hello@acmeexpress.ng",
      website: "https://acmeexpress.ng",
      socials: ["linkedin.com/company/acmeexpress"],
    },
    address: {
      line1: "14 Commercial Avenue, Sabo",
      city: "Yaba",
      lga: "Ikeja",
      state: "Lagos",
      country: "Nigeria",
    },
    capabilities: [
      { name: "Cold-Chain Logistics", description: "Refrigerated transport for pharmaceutical & perishable goods." },
      { name: "Fleet Telematics", description: "Real-time GPS tracking and automated delivery dispatches." },
    ],
    services: [
      { name: "Haulage & Distribution", description: "Inter-state freight haulage with cargo insurance coverage." },
      { name: "Customs Brokerage", description: "End-to-end import/export documentation clearance." },
    ],
    publicCredentials: [
      { name: "CAC Incorporation Certificate", type: "registration", issuer: "CAC Nigeria", verificationStatus: "document_backed" },
      { name: "FIRS Tax Clearance Certificate", type: "licence", issuer: "FIRS", verificationStatus: "document_backed" },
    ],
    publicExperience: [
      { clientName: "Jumia Nigeria", projectTitle: "Regional Hub Warehousing", year: 2024, description: "Managed 5,000 sqm fulfillment center in Ikeja." },
    ],
    publicPeople: [
      { name: "Dr. Babatunde Ogunlesi", role: "Managing Director", bio: "15+ years in logistics & maritime operations." },
    ],
  };

  const theme = PASSPORT_THEMES[passport.style] || PASSPORT_THEMES.professional;

  // Handler: Save Contact (vCard download)
  const handleSaveContact = () => {
    const vcardString = generateVCard({
      businessName: passport.businessName,
      tradingName: passport.tradingName,
      entityType: passport.entityType,
      phone: passport.contact.phone,
      email: passport.contact.email,
      website: passport.contact.website,
      passportId: passport.passportId,
      passportUrl: typeof window !== "undefined" ? window.location.href : undefined,
      address: passport.address,
      description: passport.description,
    });

    const blob = new Blob([vcardString], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${passport.businessName.replace(/[^a-z0-9]/gi, "_")}_contact.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setContactSaved(true);
  };

  const toggleDocItem = (itemKey: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemKey) ? prev.filter((i) => i !== itemKey) : [...prev, itemKey]
    );
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName || !requesterEmail || !requesterCompany) return;

    const mockRef = `REQ-${Math.floor(100000 + Math.random() * 900000)}`;
    setRequestRef(mockRef);
    setRequestSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6 sm:px-6">
      {/* Dynamic Theme Selection Pill Bar (Demo / Switcher for preview) */}
      <div className="flex items-center justify-between rounded-lg bg-gray-100 p-2 text-xs">
        <span className="font-semibold text-gray-700">Theme Preview:</span>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(PASSPORT_THEMES) as PassportStyleTheme[]).map((tKey) => (
            <button
              key={tKey}
              onClick={() => setStyleTheme(tKey)}
              className={`rounded px-2 py-1 transition-all ${
                styleTheme === tKey
                  ? "bg-white font-bold text-gray-900 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tKey}
            </button>
          ))}
        </div>
      </div>

      {/* Passport Card Container */}
      <div className={`rounded-xl border transition-all ${theme.containerClass}`}>
        {/* Header Section */}
        <div className={theme.headerClass}>
          <div className="flex items-start justify-between">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${theme.badgeClass}`}>
              ✓ {PRODUCT_COPY.passportBadgeVerified}
            </span>
            <button
              onClick={() => setShowQRModal(true)}
              className="rounded-md bg-black/20 p-2 text-xs hover:bg-black/30 backdrop-blur-xs transition-colors"
              title="View QR Code"
            >
              📱 Scan QR
            </button>
          </div>

          <h1 className={`mt-3 ${theme.titleClass}`}>{passport.businessName}</h1>
          {passport.tradingName && (
            <p className="text-xs opacity-80 italic">Trading as: {passport.tradingName}</p>
          )}
          <p className={`mt-1 ${theme.subtitleClass}`}>{passport.tagline}</p>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* Key Identity Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <div>
              <span className="block text-xs font-medium text-gray-500">Registration Number</span>
              <span className="font-semibold">{passport.registrationNumber}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500">Entity Type</span>
              <span className="font-semibold">{passport.entityType}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500">Industry Sector</span>
              <span className="font-semibold">{passport.industry}</span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500">State of Operations</span>
              <span className="font-semibold">{passport.state}, Nigeria</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className={theme.sectionHeaderClass}>About the Business</h3>
            <p className="mt-2 text-sm opacity-90 leading-relaxed">{passport.description}</p>
          </div>

          {/* Action Buttons: Save Contact & Request Documents */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSaveContact}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm transition-all text-center ${theme.accentButtonClass}`}
            >
              {contactSaved ? "✓ Contact Saved!" : "🎴 Save Contact (vCard)"}
            </button>

            <button
              onClick={() => {
                setRequestSubmitted(false);
                setShowRequestModal(true);
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm transition-all text-center ${theme.secondaryButtonClass}`}
            >
              🔒 Request Verified Docs
            </button>
          </div>

          {/* Capabilities */}
          {passport.capabilities.length > 0 && (
            <div>
              <h3 className={theme.sectionHeaderClass}>Core Capabilities</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {passport.capabilities.map((cap, idx) => (
                  <div key={idx} className="rounded-lg border p-3 bg-gray-50/50">
                    <span className="font-semibold text-xs text-gray-900 block">{cap.name}</span>
                    <span className="text-xs text-gray-600 block mt-1">{cap.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified Public Credentials */}
          {passport.publicCredentials.length > 0 && (
            <div>
              <h3 className={theme.sectionHeaderClass}>Verified Public Credentials</h3>
              <ul className="mt-3 space-y-2">
                {passport.publicCredentials.map((cred, idx) => (
                  <li key={idx} className="flex items-center justify-between text-xs border-b pb-2 last:border-0">
                    <div>
                      <span className="font-medium text-gray-900">{cred.name}</span>
                      <span className="block text-gray-500">Issuer: {cred.issuer}</span>
                    </div>
                    <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-800">
                      Verified
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="border-t pt-4 text-center text-xs opacity-60">
            Passport ID: {passport.passportId} &bull; Issued: {passport.issuedAt}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4 text-center">
            <h3 className="text-lg font-bold text-gray-900">Scan Business Passport</h3>
            <p className="text-xs text-gray-500">Scan this QR code with any smartphone camera to open this verified passport.</p>
            
            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
              {/* Fallback QR Visualization SVG */}
              <div className="text-center">
                <div className="text-4xl mb-1">📱</div>
                <span className="text-xs font-mono font-semibold text-gray-700">{passport.passportId}</span>
              </div>
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Document Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            {!requestSubmitted ? (
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Request Verified Documents</h3>
                  <p className="text-xs text-gray-500">
                    Request official document copies directly from {passport.businessName}. The owner will review and grant access.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      placeholder="e.g. Chief Risk Officer"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">Organization / Institution *</label>
                    <input
                      type="text"
                      required
                      value={requesterCompany}
                      onChange={(e) => setRequesterCompany(e.target.value)}
                      placeholder="e.g. Zenith Bank / Lagos State Procurement Agency"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">Official Email Address *</label>
                    <input
                      type="email"
                      required
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      placeholder="e.g. procurement@org.ng"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Requested Package Items</label>
                    <div className="space-y-1.5 text-xs">
                      {[
                        { key: "registration", label: "CAC Incorporation & Registration" },
                        { key: "compliance_docs", label: "Tax Clearance & Regulatory Permits" },
                        { key: "company_profile", label: "Verified Company Profile" },
                        { key: "certifications", label: "Industry Certifications & Licences" },
                        { key: "contact", label: "Official Directors & Contact Sheet" },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-2 text-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.key)}
                            onChange={() => toggleDocItem(item.key)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">Message / Tender Reference (Optional)</label>
                    <textarea
                      rows={2}
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      placeholder="e.g. For Tender #Lagos-Logistics-2026 verification"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="w-1/3 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4 py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 text-xl font-bold">
                  ✓
                </div>
                <h3 className="text-lg font-bold text-gray-900">Request Submitted!</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Your request has been routed to the owner of {passport.businessName}. Reference Code:{" "}
                  <span className="font-mono font-bold text-gray-900">{requestRef}</span>.
                </p>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
