import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { CrispChat } from "@/components/support/crisp-chat";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* GA4 loaded ONLY in (marketing) layout */}
      <GoogleAnalytics />
      <CrispChat />
      <main className="flex-1">{children}</main>
    </div>
  );
}
