import Link from "next/link";
import Script from "next/script";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { t } from "@/lib/i18n";

export default function MarketingHomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AI Business Passport",
    "operatingSystem": "Web, Android, iOS",
    "applicationCategory": "BusinessApplication",
    "description": "Nigeria's AI-Powered Business Operating System. Deterministic compliance, verifiable identity, document intelligence, and tender readiness.",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "NGN",
      "lowPrice": "0",
      "highPrice": "25000",
      "offerCount": "4"
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Structured Data JSON-LD */}
      <Script
        id="structured-data-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-sky-500/20">
              P
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              AI Business Passport
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#pillars" className="hover:text-white transition-colors">Pillars</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#personas" className="hover:text-white transition-colors">Who It&apos;s For</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <Link href="/trust" className="hover:text-sky-400 transition-colors">Trust & Compliance</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/app"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-sky-500/20 text-sm"
              aria-label="Open App Dashboard"
            >
              Open App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-6 relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-950/80 border border-sky-800/60 rounded-full text-xs font-semibold text-sky-400">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            Nigeria&apos;s First AI Business Operating System
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.15]">
            {t("hero.tagline")}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 mt-2">
              Stay Compliant & Tender-Ready Always.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-300 leading-relaxed">
            {t("hero.subheading")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/app"
              className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold rounded-xl transition-all shadow-xl shadow-sky-500/25 text-base flex items-center justify-center gap-2"
            >
              {t("hero.cta.start")}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <a
              href="#pricing"
              className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold rounded-xl transition-all text-base flex items-center justify-center"
            >
              {t("hero.cta.pricing")}
            </a>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section id="pillars" className="py-20 px-6 border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              {t("pillars.title")}
            </h2>
            <p className="text-slate-400 text-base">
              Built specifically for Nigerian business realities: CAC, FIRS, LIRS, SCUML, ITF, NSITF, PENCOM compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Pillar 1 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 hover:border-sky-500/50 transition-colors">
              <div className="w-12 h-12 bg-sky-950 text-sky-400 rounded-xl flex items-center justify-center font-bold text-xl border border-sky-800/40">
                01
              </div>
              <h3 className="text-xl font-bold text-white">
                {t("pillars.compliance.title")}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t("pillars.compliance.desc")}
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 hover:border-teal-500/50 transition-colors">
              <div className="w-12 h-12 bg-teal-950 text-teal-400 rounded-xl flex items-center justify-center font-bold text-xl border border-teal-800/40">
                02
              </div>
              <h3 className="text-xl font-bold text-white">
                {t("pillars.vault.title")}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t("pillars.vault.desc")}
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 hover:border-indigo-500/50 transition-colors">
              <div className="w-12 h-12 bg-indigo-950 text-indigo-400 rounded-xl flex items-center justify-center font-bold text-xl border border-indigo-800/40">
                03
              </div>
              <h3 className="text-xl font-bold text-white">
                {t("pillars.passport.title")}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t("pillars.passport.desc")}
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 bg-emerald-950 text-emerald-400 rounded-xl flex items-center justify-center font-bold text-xl border border-emerald-800/40">
                04
              </div>
              <h3 className="text-xl font-bold text-white">
                {t("pillars.tenders.title")}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t("pillars.tenders.desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 border-t border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              {t("pricing.title")}
            </h2>
            <p className="text-slate-400 text-base">
              No hidden fees. Scale from single-idea startup to enterprise procurement readiness.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Free */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-200">{t("pricing.free")}</h3>
                <div className="text-3xl font-black text-white">₦0 <span className="text-xs font-normal text-slate-400">/mo</span></div>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>✓ Idea Assistant</li>
                  <li>✓ Basic Passport Profile</li>
                  <li>✓ Basic Vault Storage</li>
                  <li>✓ Basic Compliance Checklist</li>
                </ul>
              </div>
              <Link href="/app" className="min-h-[44px] w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-center block text-sm">
                Start Free
              </Link>
            </div>

            {/* Plus */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-200">{t("pricing.plus")}</h3>
                <div className="text-3xl font-black text-white">₦5,000 - ₦8,000 <span className="text-xs font-normal text-slate-400">/mo</span></div>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>✓ Everything in Free</li>
                  <li>✓ Verifiable Badge + QR</li>
                  <li>✓ Full Document Intelligence</li>
                  <li>✓ Compliance Calendar & Alerts</li>
                </ul>
              </div>
              <Link href="/app" className="min-h-[44px] w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-center block text-sm">
                Upgrade to Plus
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-slate-900 border-2 border-sky-500 p-6 rounded-2xl space-y-6 flex flex-col justify-between relative shadow-xl shadow-sky-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full">
                Most Popular
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-sky-400">{t("pricing.pro")}</h3>
                <div className="text-3xl font-black text-white">₦15,000 - ₦25,000 <span className="text-xs font-normal text-slate-400">/mo</span></div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li>✓ Everything in Plus</li>
                  <li>✓ Document Studio (Tenders & Contracts)</li>
                  <li>✓ Full Tender Assistant & Scoring</li>
                  <li>✓ NFC Business Card Sharing</li>
                </ul>
              </div>
              <Link href="/app" className="min-h-[44px] w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2.5 rounded-xl text-center block text-sm">
                Start Pro Trial
              </Link>
            </div>

            {/* Pro+ */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-200">{t("pricing.pro_plus")}</h3>
                <div className="text-3xl font-black text-white">Custom Quote</div>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>✓ Everything in Pro</li>
                  <li>✓ Dedicated Done-for-Me Concierge</li>
                  <li>✓ Hand-off Filings to Experts</li>
                  <li>✓ SLA Guaranteed Turnaround</li>
                </ul>
              </div>
              <Link href="/app" className="min-h-[44px] w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-center block text-sm">
                Contact Ops Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 px-6 border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-white">{t("faq.title")}</h2>
            <p className="text-slate-400 text-sm">Clear, plain-language answers to your top questions.</p>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-base">Is my business data safe in the Vault?</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Yes. All documents stored in Cloudflare R2 are encrypted at rest and in transit. Your documents are never shared publicly unless you explicitly generate a public share link or grant an advisor access.
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-base">How does deterministic compliance work?</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We use an explicit rules engine (no LLM in the decision path) that evaluates statutory requirements directly against your Business Brain (jurisdiction, business structure, employee count, annual turnover).
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-base">Can I access my Passport offline?</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Yes! AI Business Passport is built as a Progressive Web App (PWA). Once opened, your owner Passport and Vault document metadata are cached locally for offline viewing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Footers */}
      <footer className="py-12 px-6 border-t border-slate-800 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-semibold text-slate-200">AI Business Passport © 2026</p>
            <p className="mt-1">Nigeria&apos;s AI-Powered Business Operating System.</p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/trust" className="hover:text-sky-400 transition-colors">Trust & Compliance</Link>
            <Link href="/explainers" className="hover:text-sky-400 transition-colors">SEO Explainers</Link>
          </div>
        </div>
      </footer>

      {/* PWA Install Prompt Banner */}
      <InstallPrompt />
    </div>
  );
}
