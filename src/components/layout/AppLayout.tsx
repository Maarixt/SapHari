import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppBootGate } from '@/components/app/AppBootGate';
import { OrganizationsProvider, useOrganizations } from '@/hooks/useOrganizations';
import { OrgOnboarding } from '@/components/organizations/OrgOnboarding';
import { MQTTProvider } from '@/hooks/useMQTT';
import { RealtimeProvider } from '@/hooks/useRealtime';
import { MQTTDebugPanel } from '@/components/debug/MQTTDebugPanel';
import { Toaster } from 'sonner';
import { BetaNoticeBanner } from '@/components/beta/BetaNoticeBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';

function AppLayoutContent() {
  const { organizations, currentOrg, error, refetch } = useOrganizations();
  const { signOut } = useAuth();
  const { isMaster } = useMasterAccount();

  // Show error state when organizations query failed (don't confuse with "no orgs")
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Could not load organizations</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button onClick={() => signOut()} variant="ghost" size="sm" className="text-muted-foreground">
              Sign out and try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show onboarding only when we successfully loaded and user has no organizations
  if (organizations.length === 0) {
    return <OrgOnboarding />;
  }

  return (
    <SidebarProvider>
      <BetaNoticeBanner />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0 bg-transparent">
          <header className="h-14 flex items-center gap-4 border-b border-border/50 px-4 lg:px-6 bg-background/60 backdrop-blur-md sticky top-0 z-20">
            <SidebarTrigger />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h1 className="font-semibold text-lg truncate">{currentOrg?.name || 'Dashboard'}</h1>
            </div>
          </header>
          <main className="flex-1 min-w-0 p-4 lg:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      {isMaster && <MQTTDebugPanel />}
      <Toaster position="top-right" expand richColors closeButton />
    </SidebarProvider>
  );
}

const useBridge = import.meta.env.VITE_USE_MQTT_BRIDGE === 'true';

/** Only mount MQTT when user has at least one org to avoid 401s from mqtt-credentials during onboarding. */
function AppLayoutWithMQTTGate() {
  const { organizations } = useOrganizations();
  if (organizations.length === 0) {
    return <AppLayoutContent />;
  }
  return (
    <MQTTProvider>
      <AppLayoutContent />
    </MQTTProvider>
  );
}

export function AppLayout() {
  return useBridge ? (
    <RealtimeProvider>
      <OrganizationsProvider>
        <AppBootGate>
          <AppLayoutContent />
        </AppBootGate>
      </OrganizationsProvider>
    </RealtimeProvider>
  ) : (
    <OrganizationsProvider>
      <AppBootGate>
        <AppLayoutWithMQTTGate />
      </AppBootGate>
    </OrganizationsProvider>
  );
}
