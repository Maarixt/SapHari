import { useState, useEffect } from 'react';
import { X, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isBetaMode, getBetaNoticeDismissed, setBetaNoticeDismissed } from '@/lib/betaConfig';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function BetaNoticeBanner() {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    if (isBetaMode() && user) {
      const dismissed = getBetaNoticeDismissed(user.id);
      setIsDismissed(dismissed);
    }
  }, [user]);

  if (!isBetaMode() || isDismissed || !user) return null;

  const handleDismiss = () => {
    setBetaNoticeDismissed(user.id);
    setIsDismissed(true);
  };

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)]",
        "bg-amber-50/95 dark:bg-amber-950/95 backdrop-blur-sm",
        "border border-amber-300 dark:border-amber-700",
        "rounded-lg shadow-lg",
        "animate-in slide-in-from-top-4 fade-in duration-300"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            SapHari is currently in Beta
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
            Some features may change, and occasional disruptions may occur as improvements are deployed.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-7 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-200/50 dark:text-amber-300 dark:hover:text-amber-100 dark:hover:bg-amber-800/50"
        >
          Got it
        </Button>
        <button
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
