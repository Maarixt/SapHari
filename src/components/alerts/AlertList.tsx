import React from "react";

type AlertItem = {
  id: string;
  device: string;
  msg: string;
  sev: "info" | "warn" | "critical";
  ts: string;
};

export function AlertList({ items }: { items: AlertItem[] }) {
  const color = (s: string) =>
    s === "critical"
      ? "bg-accent-red/15 text-accent-red"
      : s === "warn"
      ? "bg-accent-yellow/20 text-accent-yellow"
      : "bg-brand-100 text-brand-700";

  return (
    <div className="rounded-2xl bg-white border border-ink-200 shadow-soft">
      {items.map((a) => (
        <div
          key={a.id}
          className="p-3 border-b border-ink-200/70 last:border-none flex items-start justify-between"
        >
          <div>
            <div
              className={`inline-flex text-xs px-2 py-0.5 rounded-full ${color(
                a.sev
              )}`}
            >
              {a.sev}
            </div>
            <div className="mt-1 font-medium text-ink-900">{a.msg}</div>
            <div className="text-xs text-ink-600">
              {a.device} • {a.ts}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="text-xs px-2 py-1 rounded-lg bg-white border border-ink-200 hover:bg-[var(--surface)]">
              Ack
            </button>
            <button className="text-xs px-2 py-1 rounded-lg bg-white border border-ink-200 hover:bg-[var(--surface)]">
              Mute
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
