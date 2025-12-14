import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { OrganizationsProvider, useOrganizations } from '@/hooks/useOrganizations';
import { OrgOnboarding } from '@/components/organizations/OrgOnboarding';
import { Skeleton } from '@/components/ui/skeleton';
import { MQTTProvider } from '@/hooks/useMQTT';
import { MQTTDebugPanel } from '@/components/debug/MQTTDebugPanel';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/hooks/useTheme';
import { AppBackground } from '@/components/ui/AppBackground';

function AppLayoutContent() {
  const { organizations, currentOrg, isLoading } = useOrganizations();

  // Loading state
  if (isLoading) {
    return (
      <AppBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="space-y-4 w-full max-w-md p-8">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </AppBackground>
    );
  }

  // Show onboarding if no organizations
  if (organizations.length === 0) {
    return (
      <AppBackground>
        <OrgOnboarding />
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <header className="h-14 flex items-center gap-4 border-b px-4 lg:px-6 glass sticky top-0 z-20">
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
    </AppBackground>
  );
}

export function AppLayout() {
  return (
    <ThemeProvider>
      <MQTTProvider>
        <OrganizationsProvider>
          <AppLayoutContent />
        </OrganizationsProvider>
      </MQTTProvider>
    </ThemeProvider>
  );
}
