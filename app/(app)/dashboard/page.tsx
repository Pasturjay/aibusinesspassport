import { PRODUCT_COPY } from "@/lib/copy";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600">
          Welcome to your business operations center.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            {PRODUCT_COPY.complianceSectionTitle}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Track key deadlines, tax notices, and regulatory status.
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            {PRODUCT_COPY.documentsVaultTitle}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Access, upload, and organize your certificates and records securely.
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            {PRODUCT_COPY.filingsSectionTitle}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Update directors, business address, and registered details.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs text-blue-700">
          {PRODUCT_COPY.trustNotice}
        </p>
      </div>
    </div>
  );
}
