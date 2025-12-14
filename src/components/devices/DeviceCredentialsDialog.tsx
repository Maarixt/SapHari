import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMQTT } from '@/hooks/useMQTT';
import { supabase } from '@/integrations/supabase/client';
import { Clock, AlertTriangle, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Device {
  id: string;
  device_id: string;
  name: string;
  online: boolean;
}

interface DeviceCredentialsDialogProps {
  device: Device;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Production broker - TLS REQUIRED (port 8883)
const PRODUCTION_BROKER = {
  host: 'z110b082.ala.us-east-1.emqxsl.com',
  tls_port: 8883,
  wss_port: 8084
} as const;

export const DeviceCredentialsDialog = ({ device, open, onOpenChange }: DeviceCredentialsDialogProps) => {
  const { brokerConfig } = useMQTT();
  const { toast } = useToast();
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [rotating, setRotating] = useState(false);

  // Fetch device key using secure RPC (time-limited)
  const fetchDeviceKey = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_device_key_once', {
        p_device_id: device.id
      });

      if (rpcError) {
        if (rpcError.message.includes('expired')) {
          setError('Device key viewing window has expired (5 minutes after creation). Use "Rotate Key" to generate a new key.');
        } else if (rpcError.message.includes('access denied')) {
          setError('Access denied. You do not own this device.');
        } else {
          setError(rpcError.message);
        }
        setDeviceKey(null);
        setTimeRemaining(null);
        return;
      }

      if (data && data.length > 0) {
        setDeviceKey(data[0].device_key);
        setTimeRemaining(data[0].time_remaining_seconds);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch device key');
    } finally {
      setLoading(false);
    }
  };

  // Rotate device key
  const handleRotateKey = async () => {
    if (!confirm('This will invalidate the current device key. The device will need to be reconfigured with the new key. Continue?')) {
      return;
    }

    setRotating(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('rotate_device_key', {
        p_device_id: device.id
      });

      if (rpcError) throw rpcError;

      setDeviceKey(data);
      setTimeRemaining(300); // Reset to 5 minutes
      setError(null);
      toast({
        title: 'Key Rotated',
        description: 'Device key has been rotated. Update your device firmware with the new key.'
      });
    } catch (err: any) {
      toast({
        title: 'Failed to rotate key',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setRotating(false);
    }
  };

  // Fetch key when dialog opens
  useEffect(() => {
    if (open) {
      fetchDeviceKey();
    } else {
      // Clear sensitive data when dialog closes
      setDeviceKey(null);
      setTimeRemaining(null);
      setError(null);
      setShowKey(false);
    }
  }, [open, device.id]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setDeviceKey(null);
          setError('Device key viewing window has expired.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Device Credentials</DialogTitle>
          <DialogDescription>
            Use these credentials to configure your ESP32 device.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Device Name</Label>
            <Input value={device.name} readOnly className="bg-muted" />
          </div>
          
          <div className="space-y-2">
            <Label>Device ID <span className="text-xs text-muted-foreground">(MQTT Username)</span></Label>
            <Input value={device.device_id} readOnly className="bg-muted font-mono" />
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Device Key <span className="text-xs text-muted-foreground">(MQTT Password)</span>
              {timeRemaining !== null && timeRemaining > 0 && (
                <span className="flex items-center gap-1 text-xs text-warning">
                  <Clock className="h-3 w-3" />
                  {formatTime(timeRemaining)}
                </span>
              )}
            </Label>
            
            {loading ? (
              <div className="h-10 bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : error ? (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            ) : deviceKey ? (
              <div className="flex gap-2">
                <Input 
                  value={showKey ? deviceKey : '••••••••••••••••••••••••'} 
                  readOnly 
                  className="bg-muted font-mono flex-1" 
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="h-10 bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
                Key not available
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRotateKey}
              disabled={rotating}
              className="w-full mt-2"
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${rotating ? 'animate-spin' : ''}`} />
              {rotating ? 'Rotating...' : 'Rotate Key (Generate New)'}
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              MQTT Broker (ESP32 - TLS)
              <span className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded">TLS Required</span>
            </Label>
            <Input 
              value={`${brokerConfig?.tcp_host || PRODUCTION_BROKER.host}:${PRODUCTION_BROKER.tls_port}`} 
              readOnly 
              className="font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <Label>MQTT Broker (Dashboard - WSS)</Label>
            <Input value={brokerConfig?.wss_url || `wss://${PRODUCTION_BROKER.host}:${PRODUCTION_BROKER.wss_port}/mqtt`} readOnly />
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground border-t pt-4">
          <strong>MQTT Topics:</strong><br />
          • Publishes to: <code className="bg-muted px-1 rounded">saphari/{device.device_id}/sensor/&lt;address&gt;</code><br />
          • Subscribes to: <code className="bg-muted px-1 rounded">saphari/{device.device_id}/cmd/#</code>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};