import { CrispChat } from "@/components/support/crisp-chat";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Crisp chat is loaded, but GA4 is STRICTLY NOT included in (app) */}
      <CrispChat />
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="text-lg font-bold text-blue-600">AI Business Passport</span>
          <nav className="flex space-x-4 text-sm text-gray-600">
            <span className="font-medium text-gray-900">Dashboard</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
