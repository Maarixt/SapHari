import React from "react";

export function KpiCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: number;
}) {
  return (
    <div className="rounded-2xl bg-white border border-ink-200 shadow-soft overflow-hidden">
      <div className="h-1 bg-brand-500" />
      <div className="p-4">
        <div className="text-sm text-ink-600">{label}</div>
        <div className="text-2xl font-bold text-ink-900">{value}</div>
        {trend !== undefined && (
          <div className="text-xs mt-1 text-ink-600">
            {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}
