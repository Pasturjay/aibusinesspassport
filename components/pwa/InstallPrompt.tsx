"use client";

import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("ServiceWorker registered successfully:", reg.scope))
        .catch((err) => console.error("ServiceWorker registration failed:", err));
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div
      role="banner"
      aria-label="Install App Prompt"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900 text-white p-4 rounded-2xl shadow-xl z-50 border border-slate-800 flex items-center justify-between gap-4"
    >
      <div>
        <h4 className="font-bold text-sm">Install AI Business Passport</h4>
        <p className="text-xs text-slate-400 mt-0.5">
          Access your Passport & Vault offline anytime.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPrompt(false)}
          className="text-xs text-slate-400 hover:text-white px-2 py-1"
          aria-label="Close install prompt"
        >
          Dismiss
        </button>
        <button
          onClick={handleInstallClick}
          className="min-h-[44px] min-w-[44px] bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          Install
        </button>
      </div>
    </div>
  );
}
