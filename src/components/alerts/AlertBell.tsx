import React from "react";

export default function AlertBell({ unread = 0 }: { unread?: number }) {
  return (
    <button className="relative rounded-xl border border-ink-200 bg-white px-3 py-2 hover:bg-[var(--surface)]">
      🔔
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent-red" />
      )}
    </button>
  );
}
