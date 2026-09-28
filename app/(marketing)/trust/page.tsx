import Link from "next/link";
import { t } from "@/lib/i18n";

export default function TrustPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 md:p-16 font-sans">
      <div className="max-w-4xl mx-auto space-y-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 text-sm font-medium">
          ← Back to Main Site
        </Link>

        <header className="space-y-4 border-b border-slate-800 pb-8">
          <span className="px-3 py-1 bg-sky-950 text-sky-400 text-xs font-semibold rounded-full border border-sky-800">
            Trust & Transparency
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white">
            {t("trust.title")}
          </h1>
          <p className="text-slate-400 text-base">
            Detailed breakdown of our statutory sources, 180-day rule review cycle, and deterministic decision pipeline.
          </p>
        </header>

        <section className="space-y-6 text-slate-300 text-sm leading-relaxed">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
            <h2 className="text-xl font-bold text-white">1. Statutory Sources & Regulatory Bodies</h2>
            <p>
              AI Business Passport evaluates compliance based on official statutory guidelines published by Nigerian regulatory authorities:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400">
              <li><strong className="text-slate-200">CAC (Corporate Affairs Commission):</strong> Companies and Allied Matters Act (CAMA 2020) annual returns and filing rules.</li>
              <li><strong className="text-slate-200">FIRS (Federal Inland Revenue Service):</strong> Companies Income Tax (CIT), VAT, and Tax Clearance Certificates.</li>
              <li><strong className="text-slate-200">LIRS (Lagos State Internal Revenue Service):</strong> Pay-As-You-Earn (PAYE) and state tax compliance.</li>
              <li><strong className="text-slate-200">SCUML (Special Control Unit Against Money Laundering):</strong> Anti-money laundering certification for Designated Non-Financial Businesses and Professions (DNFBPs).</li>
              <li><strong className="text-slate-200">ITF, NSITF, PENCOM:</strong> Statutory employee pension and compensation contribution rules.</li>
            </ul>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
            <h2 className="text-xl font-bold text-white">2. Deterministic Execution & 180-Day Review Cycle</h2>
            <p>
              We maintain a non-negotiable architectural separation between deterministic logic and LLM generation:
            </p>
            <p>
              Every compliance rule has a <code className="text-sky-400">lastReviewedAt</code> timestamp. If a rule has not been reviewed by an authorized human editor within 180 days, the engine automatically forces <code className="text-sky-400">confirmBeforeFiling = true</code> and flags the item as <code className="text-sky-400">needs_review</code>.
            </p>
          </div>

          <div className="bg-amber-950/40 border border-amber-800/60 p-6 rounded-2xl space-y-3 text-amber-200">
            <h2 className="text-xl font-bold text-amber-100">3. Plain-Language Disclaimer</h2>
            <p>{t("trust.disclaimer")}</p>
            <p>
              While our rules engine is maintained by compliance professionals, statutory obligations vary by specific business transactions. For complex corporate actions, we recommend consulting a verified legal or tax practitioner through our Professional Referrals directory.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
