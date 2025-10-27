import { Bell, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { requestNotificationPermission, canRequestNotificationPermission } from '@/utils/notificationPermission';
import { Button } from '@/components/ui/button';

export function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Show banner if notification permission can be requested
    setShow(canRequestNotificationPermission());
  }, []);

  const handleEnable = async () => {
    setRequesting(true);
    const granted = await requestNotificationPermission();
    setRequesting(false);
    
    if (granted) {
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md bg-card border border-border rounded-lg shadow-lg p-4">
      <button 
        onClick={() => setShow(false)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Enable Notifications</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Get real-time alerts when your device conditions are met
          </p>
          
          <Button 
            size="sm" 
            onClick={handleEnable}
            disabled={requesting}
          >
            {requesting ? 'Requesting...' : 'Enable Notifications'}
          </Button>
        </div>
      </div>
    </div>
  );
}
