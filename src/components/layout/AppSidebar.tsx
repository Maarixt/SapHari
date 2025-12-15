import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
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
import { AddDeviceDialog } from '@/components/devices/AddDeviceDialog';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BetaBadge } from '@/components/beta/BetaBadge';
import { BetaFeedbackModal } from '@/components/beta/BetaFeedbackModal';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { currentOrg, isOwnerOrAdmin, pendingInvites } = useOrganizations();
  const { signOut } = useAuth();
  const { isMaster } = useMasterAccount();
  const navigate = useNavigate();
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);

  const mainNavItems = [
    { path: '/app/devices', label: 'Devices', icon: Cpu },
    { path: '/app/automations', label: 'Automations', icon: Zap },
    { path: '/app/alerts', label: 'Alerts', icon: Bell },
  ];

  const orgNavItems = [
    { path: '/app/org/members', label: 'Members & Access', icon: Users },
    { path: '/app/org/invites', label: 'Invites', icon: Mail, badge: pendingInvites.length },
    { path: '/app/settings', label: 'Settings', icon: Settings },
  ];

  const handleDeviceAdded = () => {
    setShowAddDevice(false);
    // Optionally navigate to devices page after adding
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            {!collapsed && (
              <>
                <span className="font-semibold text-lg">SapHari</span>
                <BetaBadge />
              </>
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
                onClick={() => setShowAddDevice(true)}
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
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink 
                        to={item.path}
                        className={({ isActive }) => cn(
                          "flex items-center gap-2 w-full",
                          isActive && "bg-muted text-foreground font-medium"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Organization Section */}
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className={cn(!currentOrg && "text-muted-foreground/50")}>
                Organization
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              {!currentOrg && !collapsed && (
                <p className="px-2 py-1 text-xs text-muted-foreground/70">
                  Select or create an organization
                </p>
              )}
              <SidebarMenu>
                {orgNavItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton 
                      asChild 
                      tooltip={item.label}
                      disabled={!currentOrg || (!isOwnerOrAdmin && item.path !== '/app/org/invites')}
                    >
                      <NavLink 
                        to={item.path}
                        className={({ isActive }) => cn(
                          "flex items-center gap-2 w-full",
                          isActive && currentOrg && "bg-muted text-foreground font-medium",
                          (!currentOrg || (!isOwnerOrAdmin && item.path !== '/app/org/invites')) && 
                            "opacity-50 pointer-events-none"
                        )}
                        onClick={(e) => {
                          if (!currentOrg || (!isOwnerOrAdmin && item.path !== '/app/org/invites')) {
                            e.preventDefault();
                          }
                        }}
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
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Pending Invites for non-admin users */}
          {pendingInvites.length > 0 && !isOwnerOrAdmin && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                {!collapsed && <SidebarGroupLabel>Invitations</SidebarGroupLabel>}
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Pending Invites">
                        <NavLink 
                          to="/app/org/invites"
                          className={({ isActive }) => cn(
                            "flex items-center gap-2 w-full",
                            isActive && "bg-muted text-foreground font-medium"
                          )}
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
                        </NavLink>
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
                        <NavLink 
                          to="/master"
                          className={({ isActive }) => cn(
                            "flex items-center gap-2 w-full",
                            isActive && "bg-muted text-foreground font-medium"
                          )}
                        >
                          <Shield className="h-4 w-4" />
                          {!collapsed && <span>Master Dashboard</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-sidebar-border">
          <div className="space-y-2">
            <BetaFeedbackModal collapsed={collapsed} />
            <ThemeToggle collapsed={collapsed} />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => signOut()}
                  tooltip="Sign Out"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Sign Out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarFooter>
      </Sidebar>

      <CreateOrgDialog open={showCreateOrg} onOpenChange={setShowCreateOrg} />
      <AddDeviceDialog 
        open={showAddDevice} 
        onOpenChange={setShowAddDevice}
        onDeviceAdded={handleDeviceAdded}
      />
    </>
  );
}
