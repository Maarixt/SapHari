import React from "react";

const groups = [
  {
    name: "Outputs",
    color: "text-accent-purple",
    items: ["LED", "Buzzer", "Relay", "Motor"],
  },
  {
    name: "Inputs",
    color: "text-brand-600",
    items: ["Button", "Touch", "Potentiometer"],
  },
  {
    name: "Sensors",
    color: "text-accent-cyan",
    items: ["DS18B20", "Ultrasonic", "LDR", "PIR"],
  },
  {
    name: "Boards",
    color: "text-ink-700",
    items: ["ESP32", "ESP32-CAM", "Breadboard"],
  },
  {
    name: "Wires",
    color: "text-accent-yellow",
    items: ["Wire", "Jumper", "Rail"],
  },
];

export function LibraryPanel({ onAdd }: { onAdd?: (item: string) => void }) {
  return (
    <div className="p-3 h-full overflow-auto">
      <div className="text-sm font-semibold text-ink-700 mb-2">Components</div>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.name}>
            <div className={`text-xs uppercase tracking-wide ${g.color}`}>
              {g.name}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {g.items.map((it) => (
                <button
                  key={it}
                  onClick={() => onAdd?.(it)}
                  className="rounded-xl border border-ink-200 bg-white hover:bg-[var(--surface)] px-3 py-2 text-sm text-ink-900 shadow-soft"
                >
                  {it}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
