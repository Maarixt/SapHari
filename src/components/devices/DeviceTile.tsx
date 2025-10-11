import React from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

type Relay = {
  id: string;
  label: string;
  state: boolean;
  pin: number;
  loading?: boolean;
};

export default function DeviceTile({
  name,
  deviceId,
  online,
  temp,
  levelPct,
  relays,
  onToggle,
}: {
  name: string;
  deviceId: string;
  online: boolean;
  temp?: number;
  levelPct?: number;
  relays?: Relay[];
  onToggle?: (id: string, next: boolean) => void;
}) {
  return (
    <SurfaceCard className="overflow-hidden">
      <div className="h-1 bg-brand-500" />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-ink-900">{name}</div>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              online
                ? "bg-accent-green/15 text-accent-green"
                : "bg-ink-200 text-ink-700"
            }`}
          >
            {online ? "Online" : "Offline"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(relays ?? []).map((r) => (
            <button
              key={r.id}
              onClick={() => onToggle?.(r.id, !r.state)}
              disabled={!online || r.loading}
              className={[
                "rounded-xl border px-3 py-2 text-sm transition",
                r.state
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-ink-900 border-ink-200 hover:bg-[var(--surface)]",
              ].join(" ")}
              aria-pressed={r.state}
            >
              <div className="flex items-center justify-between">
                <span>{r.label}</span>
                <span className="opacity-70">GPIO {r.pin}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3 text-sm text-ink-700 flex gap-4">
          {temp !== undefined && (
            <div>
              Temp: <b>{temp.toFixed(1)}°C</b>
            </div>
          )}
          {levelPct !== undefined && (
            <div>
              Level: <b>{levelPct}%</b>
            </div>
          )}
        </div>
        <div className="mt-3 text-xs text-ink-500">ID: {deviceId}</div>
      </div>
    </SurfaceCard>
  );
}
