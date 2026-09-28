export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center space-x-2">
            <span className="h-6 w-6 rounded bg-blue-600 text-center font-bold text-white leading-6 text-sm">
              BP
            </span>
            <span className="font-semibold text-sm tracking-tight text-slate-800">
              AI Business Passport
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">Official Verification</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
