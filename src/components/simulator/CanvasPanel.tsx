import React from "react";

export function CanvasPanel() {
  return (
    <div className="h-full w-full bg-[var(--surface-2)] relative">
      <div className="h-full w-full bg-[radial-gradient(ellipse_at_center,rgba(63,122,255,0.06)_1px,transparent_1px)] [background-size:18px_18px]">
        {/* Render placed components & wires (colors: red, green, yellow, cyan, purple) */}
        <div className="absolute inset-0 flex items-center justify-center text-ink-400 text-sm">
          Canvas Area - Drag components here
        </div>
      </div>
    </div>
  );
}
