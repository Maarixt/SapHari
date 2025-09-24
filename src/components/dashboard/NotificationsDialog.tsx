import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Alert {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  device_id?: string;
}

interface NotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAlertsRead: () => void;
}

export const NotificationsDialog = ({ open, onOpenChange, onAlertsRead }: NotificationsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAlerts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      
      await loadAlerts();
      onAlertsRead();
      toast({
        title: "Notifications marked as read",
        description: "All notifications have been marked as read"
      });
    } catch (error) {
      console.error('Error marking alerts as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive"
      });
    }
  };

  const clearAllAlerts = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      setAlerts([]);
      onAlertsRead();
      toast({
        title: "Notifications cleared",
        description: "All notifications have been cleared"
      });
    } catch (error) {
      console.error('Error clearing alerts:', error);
      toast({
        title: "Error",
        description: "Failed to clear notifications",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (open) {
      loadAlerts();
    }
  }, [open, user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'device_offline': return 'destructive';
      case 'sensor_warning': return 'default';
      case 'motion_detected': return 'secondary';
      case 'alert_triggered': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>
            Recent alerts and notifications from your devices.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${alert.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getAlertVariant(alert.type)}>
                          {alert.type.replace(/_/g, ' ')}
                        </Badge>
                        {!alert.read && (
                          <Badge variant="outline" className="bg-primary text-primary-foreground">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(alert.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={clearAllAlerts} disabled={alerts.length === 0}>
            Clear All
          </Button>
          <Button variant="outline" onClick={markAllAsRead} disabled={alerts.filter(a => !a.read).length === 0}>
            Mark All Read
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};