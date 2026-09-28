/**
 * Admin Revenue Reporting & Take-Rate Calculator.
 * Aggregates revenue across Subscriptions, Print Margins, Professional Referrals, and Done-for-Me Jobs.
 * Operates strictly in integer Kobo.
 */

export interface SubscriptionRecord {
  _id: string;
  tier: "free" | "plus" | "pro" | "pro_plus";
  amountKobo: number;
  status: string;
  createdAt: string;
}

export interface PrintOrderRecord {
  _id: string;
  amountKobo: number;
  marginKobo?: number;
  platformMarginPct: number;
  status: string;
  createdAt: string;
}

export interface ReferralRecord {
  _id: string;
  leadFeeKobo?: number;
  status: string;
  createdAt: string;
}

export interface DoneForMeJobRecord {
  _id: string;
  service: string;
  quoteKobo?: number;
  paidAt?: string;
  status: string;
  createdAt: string;
}

export interface RevenueStreamSummary {
  streamName: string;
  grossRevenueKobo: number;
  netPlatformRevenueKobo: number;
  takeRatePct: number;
  transactionCount: number;
  formattedGrossNaira: string;
  formattedNetNaira: string;
}

export interface RevenueSummaryReport {
  generatedAt: string;
  period: string;
  totalGrossRevenueKobo: number;
  totalNetPlatformRevenueKobo: number;
  overallTakeRatePct: number;
  formattedTotalGrossNaira: string;
  formattedTotalNetNaira: string;
  streams: {
    subscriptions: RevenueStreamSummary;
    printMarketplace: RevenueStreamSummary;
    referrals: RevenueStreamSummary;
    doneForMe: RevenueStreamSummary;
  };
}

export function formatNaira(kobo: number): string {
  return (kobo / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
}

/**
 * Compute the comprehensive revenue report across all 4 monetization streams.
 */
export function calculateRevenueReport(
  subscriptions: SubscriptionRecord[],
  printOrders: PrintOrderRecord[],
  referrals: ReferralRecord[],
  doneForMeJobs: DoneForMeJobRecord[],
  periodLabel: string = "All Time"
): RevenueSummaryReport {
  // 1. Subscriptions (100% platform take-rate)
  const activeSubs = subscriptions.filter((s) => s.status === "active" || s.amountKobo > 0);
  const subGrossKobo = activeSubs.reduce((sum, s) => sum + s.amountKobo, 0);

  const subscriptionsStream: RevenueStreamSummary = {
    streamName: "Subscriptions (SaaS)",
    grossRevenueKobo: subGrossKobo,
    netPlatformRevenueKobo: subGrossKobo,
    takeRatePct: 100,
    transactionCount: activeSubs.length,
    formattedGrossNaira: formatNaira(subGrossKobo),
    formattedNetNaira: formatNaira(subGrossKobo),
  };

  // 2. Transactional Print Marketplace (Platform margin is the net revenue)
  const completedPrints = printOrders.filter((p) => p.status !== "cancelled");
  const printGrossKobo = completedPrints.reduce((sum, p) => sum + p.amountKobo, 0);
  const printNetKobo = completedPrints.reduce(
    (sum, p) => sum + (p.marginKobo ?? Math.round(p.amountKobo * (p.platformMarginPct / 100))),
    0
  );
  const printTakeRate = printGrossKobo > 0 ? Math.round((printNetKobo / printGrossKobo) * 100) : 0;

  const printStream: RevenueStreamSummary = {
    streamName: "Print Marketplace",
    grossRevenueKobo: printGrossKobo,
    netPlatformRevenueKobo: printNetKobo,
    takeRatePct: printTakeRate,
    transactionCount: completedPrints.length,
    formattedGrossNaira: formatNaira(printGrossKobo),
    formattedNetNaira: formatNaira(printNetKobo),
  };

  // 3. Professional Referrals (Lead fees collected per converted/contacted lead)
  const paidReferrals = referrals.filter((r) => r.leadFeeKobo && r.leadFeeKobo > 0);
  const referralGrossKobo = paidReferrals.reduce((sum, r) => sum + (r.leadFeeKobo ?? 0), 0);

  const referralStream: RevenueStreamSummary = {
    streamName: "Professional Referrals",
    grossRevenueKobo: referralGrossKobo,
    netPlatformRevenueKobo: referralGrossKobo,
    takeRatePct: 100,
    transactionCount: paidReferrals.length,
    formattedGrossNaira: formatNaira(referralGrossKobo),
    formattedNetNaira: formatNaira(referralGrossKobo),
  };

  // 4. Done-for-Me Jobs (Paid service quotes)
  const paidJobs = doneForMeJobs.filter(
    (j) => j.status === "paid" || j.status === "in_progress" || j.status === "completed"
  );
  const dfmGrossKobo = paidJobs.reduce((sum, j) => sum + (j.quoteKobo ?? 0), 0);

  const dfmStream: RevenueStreamSummary = {
    streamName: "Done-for-Me Services",
    grossRevenueKobo: dfmGrossKobo,
    netPlatformRevenueKobo: dfmGrossKobo,
    takeRatePct: 100,
    transactionCount: paidJobs.length,
    formattedGrossNaira: formatNaira(dfmGrossKobo),
    formattedNetNaira: formatNaira(dfmGrossKobo),
  };

  // Aggregate Totals
  const totalGrossRevenueKobo =
    subGrossKobo + printGrossKobo + referralGrossKobo + dfmGrossKobo;
  const totalNetPlatformRevenueKobo =
    subGrossKobo + printNetKobo + referralGrossKobo + dfmGrossKobo;

  const overallTakeRatePct =
    totalGrossRevenueKobo > 0
      ? Math.round((totalNetPlatformRevenueKobo / totalGrossRevenueKobo) * 100)
      : 100;

  return {
    generatedAt: new Date().toISOString(),
    period: periodLabel,
    totalGrossRevenueKobo,
    totalNetPlatformRevenueKobo,
    overallTakeRatePct,
    formattedTotalGrossNaira: formatNaira(totalGrossRevenueKobo),
    formattedTotalNetNaira: formatNaira(totalNetPlatformRevenueKobo),
    streams: {
      subscriptions: subscriptionsStream,
      printMarketplace: printStream,
      referrals: referralStream,
      doneForMe: dfmStream,
    },
  };
}

/**
 * Format revenue report into downloadable CSV content.
 */
export function exportRevenueReportCSV(report: RevenueSummaryReport): string {
  const lines: string[] = [];

  lines.push("AI Business Passport - Revenue Breakdown Report");
  lines.push(`Generated At,${report.generatedAt}`);
  lines.push(`Period,${report.period}`);
  lines.push(`Total Gross Revenue (NGN),${report.formattedTotalGrossNaira}`);
  lines.push(`Total Net Platform Revenue (NGN),${report.formattedTotalNetNaira}`);
  lines.push(`Overall Take-Rate (%),${report.overallTakeRatePct}%`);
  lines.push("");

  lines.push(
    "Stream Name,Gross Revenue (Kobo),Net Platform Revenue (Kobo),Gross Revenue (NGN),Net Revenue (NGN),Take Rate (%),Transaction Count"
  );

  const streamList = [
    report.streams.subscriptions,
    report.streams.printMarketplace,
    report.streams.referrals,
    report.streams.doneForMe,
  ];

  for (const s of streamList) {
    lines.push(
      `"${s.streamName}",${s.grossRevenueKobo},${s.netPlatformRevenueKobo},"${s.formattedGrossNaira}","${s.formattedNetNaira}",${s.takeRatePct}%,${s.transactionCount}`
    );
  }

  return lines.join("\n");
}
