"use client";

import { useState } from "react";
import { PRODUCT_COPY } from "@/lib/copy";

export default function AccountSettingsPage() {
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    sms: true,
    whatsapp: true,
    inApp: true,
  });

  const [activeBusiness, setActiveBusiness] = useState("Lekki Green Energies Ltd");
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [deletionRequested, setDeletionRequested] = useState(false);

  const togglePref = (key: keyof typeof notificationPrefs) => {
    setNotificationPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleDataExport = () => {
    setExportMessage("Export requested! You will receive an email with your downloadable ZIP archive shortly.");
  };

  const handleAccountDeletion = () => {
    if (window.confirm("Are you sure you want to request account deletion? Your business will be soft-deleted immediately and permanently purged after 30 days.")) {
      setDeletionRequested(true);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account & Business Settings</h1>
        <p className="text-sm text-gray-600">
          Manage your personal profile, notification preferences, advisor grants, and NDPA privacy controls.
        </p>
      </div>

      {/* 1. Active Business Switcher */}
      <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Active Business Profile</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div>
            <span className="block text-xs font-medium text-gray-500">Selected Business</span>
            <span className="font-semibold text-gray-900">{activeBusiness}</span>
          </div>
          <select
            value={activeBusiness}
            onChange={(e) => setActiveBusiness(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="Lekki Green Energies Ltd">Lekki Green Energies Ltd (RC-887766)</option>
            <option value="Kano Agro Processing Ltd">Kano Agro Processing Ltd (RC-445566)</option>
          </select>
        </div>
      </section>

      {/* 2. Notification Preferences */}
      <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Notification Channels</h2>
        <p className="text-xs text-gray-500">
          Choose how you want to receive statutory deadline alerts and document updates.
        </p>

        <div className="space-y-3">
          {(["email", "sms", "whatsapp", "inApp"] as const).map((channel) => (
            <label key={channel} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm font-medium text-gray-700 capitalize">
                {channel === "inApp" ? "In-App Notifications" : `${channel.toUpperCase()} Alerts`}
              </span>
              <input
                type="checkbox"
                checked={notificationPrefs[channel]}
                onChange={() => togglePref(channel)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </section>

      {/* 3. Advisor Access Grants (Story C4) */}
      <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Advisor Access Delegation (Lawyers & Accountants)</h2>
        <p className="text-xs text-gray-500">
          Grant or revoke view access to specific document vault categories for external advisors.
        </p>

        <div className="rounded-md border p-4 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-900">Adewale & Co. (Legal Advisor)</span>
              <p className="text-xs text-gray-500">Categories: registration, contracts &bull; Expires: 2026-12-31</p>
            </div>
            <button
              onClick={() => alert("Advisor grant access updated")}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Revoke Access
            </button>
          </div>
        </div>
      </section>

      {/* 4. NDPA Data Export & Account Deletion */}
      <section className="rounded-xl border border-red-100 bg-red-50/30 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Data Privacy & NDPA Compliance</h2>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Download Data Export</h3>
              <p className="text-xs text-gray-500">Export all business data, documents, and records as a ZIP archive.</p>
            </div>
            <button
              onClick={handleDataExport}
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Request Export
            </button>
          </div>

          {exportMessage && (
            <div className="rounded-md bg-green-50 p-3 text-xs font-medium text-green-800">
              {exportMessage}
            </div>
          )}

          <div className="border-t pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-red-700">Delete Account & Purge Data</h3>
              <p className="text-xs text-gray-500">Soft-deletes immediately, then permanently purges all data after 30 days.</p>
            </div>
            <button
              onClick={handleAccountDeletion}
              disabled={deletionRequested}
              className="inline-flex justify-center rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {deletionRequested ? "Deletion Requested (Pending 30d Purge)" : "Request Deletion"}
            </button>
          </div>
        </div>
      </section>

      <div className="text-center text-xs text-gray-400 pt-4">
        {PRODUCT_COPY.trustNotice}
      </div>
    </div>
  );
}
