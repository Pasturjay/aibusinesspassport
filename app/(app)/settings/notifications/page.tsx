"use client";

import { useState } from "react";
import { NotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from "@/lib/notifications/consent";

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleToggle = (channel: keyof NotificationPrefs) => {
    setPrefs((prev) => ({
      ...prev,
      [channel]: !prev[channel],
    }));
  };

  const handleSave = () => {
    // In real app, calls mutation updateNotificationPrefs
    setSavedNotice("Notification preferences updated successfully!");
    setTimeout(() => setSavedNotice(null), 3000);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6">
      <div className="border-b pb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="text-sm text-gray-600 mt-1">
          Choose which channels you want to receive statutory compliance reminders, document alerts, and request updates on.
        </p>
      </div>

      {savedNotice && (
        <div className="rounded-lg bg-green-50 p-4 text-xs font-semibold text-green-800 border border-green-200">
          ✓ {savedNotice}
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-gray-900 border-b pb-3">Delivery Channels</h2>

        {/* Email */}
        <div className="flex items-center justify-between py-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Email Notifications</h3>
            <p className="text-xs text-gray-500">Receive detailed statutory reports, profile requests, and official receipts.</p>
          </div>
          <button
            onClick={() => handleToggle("email")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              prefs.email ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                prefs.email ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* SMS */}
        <div className="flex items-center justify-between py-2 border-t pt-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">SMS Alerts</h3>
            <p className="text-xs text-gray-500">
              Short urgent alerts for upcoming deadlines. Reply <strong>STOP</strong> at any time to opt out.
            </p>
          </div>
          <button
            onClick={() => handleToggle("sms")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              prefs.sms ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                prefs.sms ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* WhatsApp */}
        <div className="flex items-center justify-between py-2 border-t pt-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">WhatsApp Messages</h3>
            <p className="text-xs text-gray-500">Instant direct compliance reminders and request approval notifications.</p>
          </div>
          <button
            onClick={() => handleToggle("whatsapp")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              prefs.whatsapp ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                prefs.whatsapp ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* In-App */}
        <div className="flex items-center justify-between py-2 border-t pt-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">In-App Notifications</h3>
            <p className="text-xs text-gray-500">Show notification bell indicators within the AI Business Passport app.</p>
          </div>
          <button
            onClick={() => handleToggle("inApp")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              prefs.inApp ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                prefs.inApp ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="border-t pt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
