import React from "react";

export function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white border border-ink-200 shadow-soft ${className}`}
    >
      {children}
    </div>
  );
}
