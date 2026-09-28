import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 md:p-16 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="text-sky-400 hover:text-sky-300 text-sm font-medium">
          ← Back to Main Site
        </Link>
        <h1 className="text-3xl md:text-4xl font-black text-white">Privacy Policy</h1>
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>At AI Business Passport, we prioritize the confidentiality and protection of your business information.</p>
          <h2 className="text-lg font-bold text-white mt-6">1. Encrypted Storage</h2>
          <p>Vault documents are stored in Cloudflare R2 with strict access controls. Private fields are never exposed publicly.</p>
          <h2 className="text-lg font-bold text-white mt-6">2. Scoped Advisor Grants</h2>
          <p>External advisors only access categories you explicitly grant with optional expiration dates.</p>
        </div>
      </div>
    </div>
  );
}
