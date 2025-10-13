import { ReactNode } from 'react';

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
}

export function SurfaceCard({ children, className = "" }: SurfaceCardProps) {
  return (
    <div className={`rounded-2xl bg-white border border-ink-200 shadow-soft ${className}`}>
      {children}
    </div>
  );
}
