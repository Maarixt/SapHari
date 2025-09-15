import { Bell, Settings, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMQTT } from '@/hooks/useMQTT';
import { useAuth } from '@/hooks/useAuth';
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
            variant="ghost"
            size="icon"
            onClick={onAlertRulesClick}
          >
            <AlertTriangle className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationsClick}
            className="relative"
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
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSettingsClick}>
                MQTT Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};