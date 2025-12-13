import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMQTT } from '@/hooks/useMQTT';

interface Device {
  id: string;
  device_id: string;
  device_key: string;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Device Credentials</DialogTitle>
          <DialogDescription>
            Use these credentials to configure your ESP32 device. <strong>These credentials cannot be changed after device creation.</strong>
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
            <Label>Device Key <span className="text-xs text-muted-foreground">(MQTT Password)</span></Label>
            <Input value={device.device_key} readOnly className="bg-muted font-mono" />
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              MQTT Broker (ESP32 - TLS)
              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-1.5 py-0.5 rounded">TLS Required</span>
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