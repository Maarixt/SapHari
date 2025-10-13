import React from "react";

export function InspectorPanel() {
  return (
    <div className="p-3 h-full overflow-auto">
      <div className="text-sm font-semibold text-ink-700 mb-2">Inspector</div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-ink-600">Label</label>
          <input
            className="w-full mt-1 px-3 py-2 rounded-xl border border-ink-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            placeholder="Component name"
          />
        </div>
        <div>
          <label className="text-xs text-ink-600">Pin</label>
          <input
            type="number"
            className="w-full mt-1 px-3 py-2 rounded-xl border border-ink-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            placeholder="GPIO pin"
          />
        </div>
        <div>
          <label className="text-xs text-ink-600">Color</label>
          <select className="w-full mt-1 px-3 py-2 rounded-xl border border-ink-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
            <option>Red</option>
            <option>Green</option>
            <option>Yellow</option>
            <option>Cyan</option>
            <option>Purple</option>
          </select>
        </div>
      </div>
    </div>
  );
}
