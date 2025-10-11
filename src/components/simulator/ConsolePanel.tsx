import React from "react";

export function ConsolePanel() {
  return (
    <div className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-ink-700">Console</div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition">
            Run
          </button>
          <button className="px-3 py-1 rounded-xl bg-white border border-ink-200 hover:bg-[var(--surface)] transition">
            Stop
          </button>
          <button className="px-3 py-1 rounded-xl bg-white border border-ink-200 hover:bg-[var(--surface)] transition">
            Clear
          </button>
        </div>
      </div>
      <div className="flex-1 rounded-xl bg-white border border-ink-200 p-2 text-xs text-ink-700 overflow-auto font-mono">
        <div className="text-ink-500">Ready to simulate...</div>
      </div>
    </div>
  );
}
