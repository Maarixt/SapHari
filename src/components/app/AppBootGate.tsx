import { useOrganizations } from '@/hooks/useOrganizations';
import { Skeleton } from '@/components/ui/skeleton';

interface AppBootGateProps {
  children: React.ReactNode;
}

/**
 * Blocks rendering until org data is loaded. Shows a consistent skeleton to avoid
 * layout shift and flicker. Must be used inside OrganizationsProvider.
 */
export function AppBootGate({ children }: AppBootGateProps) {
  const { isLoading } = useOrganizations();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-4 sm:p-8 mx-auto">
          <Skeleton className="h-12 w-full bg-muted/50" />
          <Skeleton className="h-32 w-full bg-muted/50" />
          <Skeleton className="h-32 w-full bg-muted/50" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
