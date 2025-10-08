import { Bell, Settings, LogOut, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMQTT } from '@/hooks/useMQTT';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onSettingsClick: () => void;
  onNotificationsClick: () => void;
  unreadAlerts: number;
  onAlertRulesClick: () => void;
}

export const Header = ({ onSettingsClick, onNotificationsClick, unreadAlerts, onAlertRulesClick }: HeaderProps) => {
  const { status } = useMQTT();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks
    
    setIsSigningOut(true);
    try {
      await signOut();
      // Navigate to login page regardless of Supabase response
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign out failed:', error);
      // Even if there's an error, try to navigate to login
      // The AuthGuard will handle the authentication check
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleForceSignOut = () => {
    // Force clear everything and navigate
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login', { replace: true });
    window.location.reload();
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-iot-online';
      case 'connecting': return 'bg-iot-warning';
      case 'error': return 'bg-iot-offline';
      default: return 'bg-muted';
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
    <header className="border-b border-iot-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">🌐 SapHari Dashboard</h1>
        
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className={`${getStatusColor()} text-white`}>
            MQTT: {getStatusText()}
          </Badge>

          <Button
            variant="outline"
            size="icon"
            onClick={onAlertRulesClick}
            className="btn-icon-bright"
          >
            <AlertTriangle className="h-5 w-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onNotificationsClick}
            className="relative btn-icon-bright"
          >
            <Bell className="h-5 w-5" />
            {unreadAlerts > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
              >
                {unreadAlerts}
              </Badge>
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="btn-icon-bright">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSettingsClick}>
                MQTT Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleForceSignOut}
                className="text-destructive focus:text-destructive"
              >
                Force Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </div>
      </div>
    </header>
  );
};