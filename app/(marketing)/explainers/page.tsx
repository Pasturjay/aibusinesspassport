import Link from "next/link";

export default function ExplainersPage() {
  const explainers = [
    {
      slug: "cac-annual-returns-guide",
      title: "Understanding CAC Annual Returns in Nigeria (2026 Guide)",
      summary: "What every business owner needs to know about CAC annual return deadlines, penalties, and status reports under CAMA 2020.",
    },
    {
      slug: "scuml-certificate-requirements",
      title: "SCUML Certificate Registration & DNFBP Compliance",
      summary: "Who needs a SCUML certificate from EFCC, how to apply, and why bank accounts require anti-money laundering clearance.",
    },
    {
      slug: "firs-tax-clearance-tcc",
      title: "How to Obtain an FIRS Tax Clearance Certificate for Tenders",
      summary: "Step-by-step requirements for Tax Clearance Certificates needed for government procurement and corporate bidding.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 md:p-16 font-sans">
      <div className="max-w-4xl mx-auto space-y-10">
        <Link href="/" className="text-sky-400 hover:text-sky-300 text-sm font-medium">
          ← Back to Main Site
        </Link>
        <header className="space-y-4">
          <h1 className="text-3xl md:text-5xl font-black text-white">
            Plain-Language Regulatory Guides
          </h1>
          <p className="text-slate-400 text-base">
            SEO explainers covering Nigerian statutory compliance, tax rules, and procurement readiness.
          </p>
        </header>

        <div className="space-y-6">
          {explainers.map((e) => (
            <div key={e.slug} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-2 hover:border-sky-500/50 transition-colors">
              <h2 className="text-xl font-bold text-white">{e.title}</h2>
              <p className="text-slate-400 text-sm">{e.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
