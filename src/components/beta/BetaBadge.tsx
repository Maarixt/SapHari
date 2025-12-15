import { isBetaMode } from '@/lib/betaConfig';
import { cn } from '@/lib/utils';

interface BetaBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function BetaBadge({ className, size = 'sm' }: BetaBadgeProps) {
  if (!isBetaMode()) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold uppercase tracking-wider",
        "bg-amber-500/20 text-amber-600 dark:bg-amber-500/30 dark:text-amber-400",
        "border border-amber-500/30 dark:border-amber-500/40",
        "dark:shadow-[0_0_8px_rgba(245,158,11,0.3)]",
        size === 'sm' && "px-1.5 py-0.5 text-[9px]",
        size === 'md' && "px-2 py-0.5 text-[10px]",
        className
      )}
    >
      Beta
    </span>
  );
}
