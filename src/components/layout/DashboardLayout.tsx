import { useState, ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { OrganizationsProvider, useOrganizations } from '@/hooks/useOrganizations';
import { OrgOnboarding } from '@/components/organizations/OrgOnboarding';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardLayoutProps {
  children: (props: { currentView: string; setCurrentView: (view: string) => void }) => ReactNode;
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const { organizations, currentOrg, isLoading } = useOrganizations();
  const [currentView, setCurrentView] = useState('devices');

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Show onboarding if no organizations (but still show if they have pending invites)
  if (organizations.length === 0) {
    return <OrgOnboarding />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar onNavigate={setCurrentView} currentView={currentView} />
        <SidebarInset className="flex-1">
          <header className="h-14 flex items-center gap-4 border-b px-4 lg:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg">{currentOrg?.name || 'Dashboard'}</h1>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-6">
            {children({ currentView, setCurrentView })}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <OrganizationsProvider>
      <DashboardContent>{children}</DashboardContent>
    </OrganizationsProvider>
  );
}
