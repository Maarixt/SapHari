import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { OrganizationsProvider, useOrganizations } from '@/hooks/useOrganizations';
import { OrgOnboarding } from '@/components/organizations/OrgOnboarding';
import { Skeleton } from '@/components/ui/skeleton';
import { MQTTProvider } from '@/hooks/useMQTT';
import { MQTTDebugPanel } from '@/components/debug/MQTTDebugPanel';
import { Toaster } from 'sonner';
import { BetaNoticeBanner } from '@/components/beta/BetaNoticeBanner';

function AppLayoutContent() {
  const { organizations, currentOrg, isLoading } = useOrganizations();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-full bg-muted/50" />
          <Skeleton className="h-32 w-full bg-muted/50" />
          <Skeleton className="h-32 w-full bg-muted/50" />
        </div>
      </div>
    );
  }

  // Show onboarding if no organizations
  if (organizations.length === 0) {
    return <OrgOnboarding />;
  }

  return (
    <SidebarProvider>
      <BetaNoticeBanner />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 bg-transparent">
          <header className="h-14 flex items-center gap-4 border-b border-border/50 px-4 lg:px-6 bg-background/60 backdrop-blur-md sticky top-0 z-20">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg">{currentOrg?.name || 'Dashboard'}</h1>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      <MQTTDebugPanel />
      <Toaster position="top-right" expand richColors closeButton />
    </SidebarProvider>
  );
}

export function AppLayout() {
  return (
    <MQTTProvider>
      <OrganizationsProvider>
        <AppLayoutContent />
      </OrganizationsProvider>
    </MQTTProvider>
  );
}
