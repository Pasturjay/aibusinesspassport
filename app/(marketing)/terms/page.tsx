import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 md:p-16 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="text-sky-400 hover:text-sky-300 text-sm font-medium">
          ← Back to Main Site
        </Link>
        <h1 className="text-3xl md:text-4xl font-black text-white">Terms of Service</h1>
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>Welcome to AI Business Passport. By accessing or using our platform, you agree to comply with and be bound by these Terms of Service.</p>
          <h2 className="text-lg font-bold text-white mt-6">1. Platform Services</h2>
          <p>AI Business Passport provides business management tools, document intelligence, verifiable identity, and compliance tracking. Accounts are tier-based according to our published entitlements.</p>
          <h2 className="text-lg font-bold text-white mt-6">2. Data Ownership & Privacy</h2>
          <p>You retain 100% ownership of all documents and data uploaded to your Business Brain and Vault. We do not sell or monetize your data.</p>
        </div>
      </div>
    </div>
  );
}
