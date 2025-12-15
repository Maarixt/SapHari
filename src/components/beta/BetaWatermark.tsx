import { isBetaMode } from '@/lib/betaConfig';
import { cn } from '@/lib/utils';

interface BetaWatermarkProps {
  className?: string;
}

export function BetaWatermark({ className }: BetaWatermarkProps) {
  if (!isBetaMode()) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none overflow-hidden select-none",
        "hidden sm:flex items-center justify-center",
        className
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "text-[80px] sm:text-[120px] font-black uppercase tracking-widest",
          "text-foreground/[0.03] dark:text-foreground/[0.04]",
          "rotate-[-15deg]"
        )}
      >
        Beta
      </span>
    </div>
  );
}
