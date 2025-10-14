import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Settings, 
  LogOut, 
  Search, 
  Moon, 
  Sun, 
  Menu, 
  X,
  Home,
  Cpu,
  AlertTriangle,
  BarChart3,
  Code,
  Crown,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMqttStatus } from '@/hooks/useMqttStatus';
import { reconnectMqtt } from '@/services/mqtt';
import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AlertsBell from '@/components/alerts/AlertsBell';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  onSettingsClick?: () => void;
  onAlertRulesClick?: () => void;
  onSnippetStreamClick?: () => void;
  onDeviceDemoClick?: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Devices', href: '/devices', icon: Cpu },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Simulator', href: '/simulator', icon: Code },
];

export const AppShell = ({ 
  children, 
  onSettingsClick, 
  onAlertRulesClick, 
  onSnippetStreamClick, 
  onDeviceDemoClick 
}: AppShellProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { status, connected } = useMqttStatus();
  const { user, signOut } = useAuth();
  const { isMaster, logout: masterLogout } = useMasterAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Dark mode persistence
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    const isDark = saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      if (isMaster) {
        masterLogout();
        return;
      } else {
        await signOut();
        navigate('/login', { replace: true });
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'status-active';
      case 'connecting': return 'status-warning';
      case 'error': return 'status-danger';
      default: return 'status-offline';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div 
      id="app-shell"
      className="min-h-dvh grid grid-rows-[auto,1fr,auto] bg-[hsl(var(--surface-2))]"
    >
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[hsl(var(--surface))] border-r border-[hsl(var(--border))] lg:translate-x-0 lg:static lg:inset-0",
          "lg:block"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[hsl(var(--brand))] flex items-center justify-center">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-[hsl(var(--text))]">SapHari</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <motion.div
                  key={item.name}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-11",
                      isActive 
                        ? "bg-[hsl(var(--brand))] text-white shadow-sm" 
                        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--muted))]"
                    )}
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Button>
                </motion.div>
              );
            })}

            {/* Master Dashboard Link */}
            {isMaster && (
              <motion.div
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-11 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-950/20"
                  onClick={() => {
                    navigate('/master');
                    setSidebarOpen(false);
                  }}
                >
                  <Crown className="h-5 w-5" />
                  Master Dashboard
                </Button>
              </motion.div>
            )}
          </nav>

          {/* User info */}
          <div className="border-t border-[hsl(var(--border))] p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-[hsl(var(--brand))] flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[hsl(var(--text))] truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {isMaster ? 'Master Account' : 'User Account'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Header */}
      <header 
        className="row-[1] h-[var(--hdr)] shrink-0 bg-[hsl(var(--surface))]/80 backdrop-blur-sm border-b border-[hsl(var(--border))]"
      >
        <div className="container-main h-full">
          <div className="flex h-full items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <Input
                  placeholder="Search devices, alerts..."
                  className="pl-10 w-64 bg-[hsl(var(--muted))] border-[hsl(var(--border))] focus:bg-[hsl(var(--surface))]"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* MQTT Status */}
              <div className="flex items-center gap-2">
                {connected ? (
                  <Wifi className="h-4 w-4 text-emerald-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
                <Badge className={cn("status-chip", getStatusColor())}>
                  MQTT: {getStatusText()}
                </Badge>
                {!connected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reconnectMqtt}
                    className="h-7 px-2 text-xs"
                  >
                    Reconnect
                  </Button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {onAlertRulesClick && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onAlertRulesClick}
                    className="h-9 w-9"
                    title="Alert Rules"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                )}

                {onSnippetStreamClick && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSnippetStreamClick}
                    className="h-9 w-9"
                    title="Snippet Stream"
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                )}

                {onDeviceDemoClick && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDeviceDemoClick}
                    className="h-9 w-9"
                    title="Device Demo"
                  >
                    <Cpu className="h-4 w-4" />
                  </Button>
                )}

                {/* Alerts Bell */}
                <AlertsBell />

                {/* Dark mode toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleDarkMode}
                  className="h-9 w-9"
                  title="Toggle dark mode"
                >
                  {darkMode ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>

                {/* Settings dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9" title="Settings">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onSettingsClick && (
                      <DropdownMenuItem onClick={onSettingsClick}>
                        MQTT Settings
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main scrollable region */}
      <main className="row-[2] min-h-0 overflow-y-auto">
        <div className="container-main py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

