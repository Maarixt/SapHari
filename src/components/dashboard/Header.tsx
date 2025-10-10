import { Bell, Settings, LogOut, AlertTriangle, Loader2, Code, Cpu, RefreshCw, Crown } from 'lucide-react';
import AlertsBell from '@/components/alerts/AlertsBell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMqttStatus } from '@/hooks/useMqttStatus';
import { reconnectMqtt } from '@/services/mqtt';
import { useAuth } from '@/hooks/useAuth';
import { useMasterRole } from '@/components/auth/RequireRole';
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
  const { hasRole: isMaster } = useMasterRole();
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
      default: return 'bg-iot-offline';
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
    <header className="border-b border-iot-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground truncate">🌐 SapHari Dashboard</h1>
        
        <div className="flex items-center gap-2 min-w-0">
          {/* Status Badge - Hide on very small screens */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`${getStatusColor()} text-white hidden sm:inline-flex`}>
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
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={onAlertRulesClick}
              className="btn-icon-bright h-8 w-8"
              title="Alert Rules"
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>

            {onSnippetStreamClick && (
              <Button
                variant="outline"
                size="icon"
                onClick={onSnippetStreamClick}
                className="btn-icon-bright h-8 w-8"
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
                className="btn-icon-bright h-8 w-8"
                title="Device Control Demo"
              >
                <Cpu className="h-4 w-4" />
              </Button>
            )}

            {/* Alerts Bell Component */}
            <AlertsBell />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="btn-icon-bright h-8 w-8" title="Settings">
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
              className="h-8 px-2 sm:px-3"
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