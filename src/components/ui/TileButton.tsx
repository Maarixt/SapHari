import { ReactNode } from 'react';

interface TileButtonProps {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function TileButton({ label, icon, onClick, active, className = "" }: TileButtonProps) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl border transition shadow-soft hover:shadow-card",
        "p-4 border-ink-200",
        active ? "bg-brand-500 text-white" : "bg-white text-ink-900 hover:bg-[var(--surface)]",
        className
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {icon && <span className={`text-xl ${active ? "opacity-90" : "text-brand-600"}`}>{icon}</span>}
        <span className="font-medium">{label}</span>
      </div>
    </button>
  );
}
