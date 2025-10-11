import React from "react";

export default function AppShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-ink-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4 grid gap-4">{children}</main>
    </div>
  );
}
