import { Bell, Settings, LogOut, AlertTriangle, Loader2, Code, Cpu, RefreshCw, Crown } from 'lucide-react';
import AlertsBell from '@/components/alerts/AlertsBell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMqttStatus } from '@/hooks/useMqttStatus';
import { reconnectMqtt } from '@/services/mqtt';
import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';
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
  onAlertRulesClick: () => void;
  onSnippetStreamClick?: () => void;
  onDeviceDemoClick?: () => void;
}

export const Header = ({ onSettingsClick, onAlertRulesClick, onSnippetStreamClick, onDeviceDemoClick }: HeaderProps) => {
  const { status, connected } = useMqttStatus();
  const { signOut } = useAuth();
  const { isMaster, logout: masterLogout } = useMasterAccount();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks
    
    console.log('Header logout clicked, isMaster:', isMaster);
    setIsSigningOut(true);
    try {
      // Check if user is master and handle accordingly
      if (isMaster) {
        console.log('Calling master logout');
        masterLogout();
        return; // masterLogout handles navigation
      } else {
        console.log('Calling regular signOut');
        await signOut();
        // Navigate to login page regardless of Supabase response
        navigate('/login', { replace: true });
      }
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
      case 'connected': return 'bg-success/10 text-success border-success/20';
      case 'connecting': return 'bg-warning/10 text-warning border-warning/20';
      case 'error': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
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
    <header className="border-b border-border/50 bg-gradient-to-r from-background to-muted/30 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <span className="text-2xl">🌐</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">SapHari Dashboard</h1>
            <p className="text-sm text-muted-foreground">IoT Device Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 min-w-0">
          {/* Status Badge - Hide on very small screens */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${getStatusColor()} hidden sm:inline-flex`}>
              <div className="h-2 w-2 rounded-full bg-current mr-2 animate-pulse"></div>
              MQTT: {getStatusText()}
            </Badge>
            {!connected && (
              <Button
                variant="outline"
                size="sm"
                onClick={reconnectMqtt}
                className="h-6 px-2 text-xs"
                title="Reconnect to MQTT"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onAlertRulesClick}
              className="h-9 w-9 shadow-sm hover:shadow-md transition-all duration-200"
              title="Alert Rules"
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>

            {onSnippetStreamClick && (
              <Button
                variant="outline"
                size="icon"
                onClick={onSnippetStreamClick}
                className="h-9 w-9 shadow-sm hover:shadow-md transition-all duration-200"
                title="Snippet Stream"
              >
                <Code className="h-4 w-4" />
              </Button>
            )}

            {onDeviceDemoClick && (
              <Button
                variant="outline"
                size="icon"
                onClick={onDeviceDemoClick}
                className="h-9 w-9 shadow-sm hover:shadow-md transition-all duration-200"
                title="Device Control Demo"
              >
                <Cpu className="h-4 w-4" />
              </Button>
            )}

            {/* Alerts Bell Component */}
            <AlertsBell />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 shadow-sm hover:shadow-md transition-all duration-200" title="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSettingsClick}>
                  MQTT Settings
                </DropdownMenuItem>
                {isMaster && (
                  <DropdownMenuItem onClick={() => navigate('/master')}>
                    <Crown className="h-4 w-4 mr-2" />
                    Master Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={handleForceSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  Force Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sign Out Button - Hide text on small screens */}
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="h-9 px-3 shadow-sm hover:shadow-md transition-all duration-200"
              title="Sign Out"
            >
              {isSigningOut ? (
                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              ) : (
                <LogOut className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};