import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Cpu, 
  Settings, 
  Users, 
  Mail, 
  Bell, 
  Zap,
  Plus,
  LogOut,
  Shield,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { OrgSwitcher } from '@/components/organizations/OrgSwitcher';
import { CreateOrgDialog } from '@/components/organizations/CreateOrgDialog';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { Badge } from '@/components/ui/badge';

interface AppSidebarProps {
  onNavigate?: (view: string) => void;
  currentView?: string;
}

export function AppSidebar({ onNavigate, currentView }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { currentOrg, isOwnerOrAdmin, pendingInvites } = useOrganizations();
  const { signOut } = useAuth();
  const { isMaster } = useMasterAccount();
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const handleNavClick = (view: string) => {
    onNavigate?.(view);
  };

  const mainNavItems = [
    { id: 'devices', label: 'Devices', icon: Cpu },
    { id: 'automations', label: 'Automations', icon: Zap },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ];

  const adminNavItems = [
    { id: 'members', label: 'Members & Access', icon: Users },
    { id: 'invites', label: 'Invites', icon: Mail, badge: pendingInvites.length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            {!collapsed && (
              <span className="font-semibold text-lg">SapHari</span>
            )}
          </div>
          
          <OrgSwitcher collapsed={collapsed} />
          
          {!collapsed && (
            <div className="flex flex-col gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setShowCreateOrg(true)}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
              <Button 
                size="sm" 
                className="w-full justify-start"
                disabled={!currentOrg}
                onClick={() => handleNavClick('add-device')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent>
          {/* Main Navigation */}
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleNavClick(item.id)}
                      isActive={currentView === item.id}
                      tooltip={item.label}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Admin Section (only for owners/admins) */}
          {isOwnerOrAdmin && (
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel>Organization</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => handleNavClick(item.id)}
                        isActive={currentView === item.id}
                        tooltip={item.label}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && (
                          <span className="flex items-center gap-2 flex-1">
                            {item.label}
                            {item.badge && item.badge > 0 && (
                              <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Pending Invites for all users */}
          {pendingInvites.length > 0 && !isOwnerOrAdmin && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                {!collapsed && <SidebarGroupLabel>Invitations</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleNavClick('pending-invites')}
                        isActive={currentView === 'pending-invites'}
                        tooltip="Pending Invites"
                      >
                        <Mail className="h-4 w-4" />
                        {!collapsed && (
                          <span className="flex items-center gap-2 flex-1">
                            Pending Invites
                            <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                              {pendingInvites.length}
                            </Badge>
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}

          {/* Master Admin Link */}
          {isMaster && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                {!collapsed && <SidebarGroupLabel>Admin</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Master Dashboard">
                        <Link to="/master">
                          <Shield className="h-4 w-4" />
                          {!collapsed && <span>Master Dashboard</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="p-4 border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => signOut()}
                tooltip="Sign Out"
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>Sign Out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <CreateOrgDialog open={showCreateOrg} onOpenChange={setShowCreateOrg} />
    </>
  );
}
