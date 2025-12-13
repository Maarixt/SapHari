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

const brokerForESP32 = (url: string) => {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const port = u.port ? parseInt(u.port) : 0;
    if (u.protocol === 'wss:' || u.protocol === 'ws:') {
      if (port === 8083 || port === 8084) return { host, port: 1883 };
      return { host, port: 1883 };
    }
    return { host, port: port || 1883 };
  } catch(e) {
    return { host: url, port: 1883 };
  }
};

export const DeviceCredentialsDialog = ({ device, open, onOpenChange }: DeviceCredentialsDialogProps) => {
  const { brokerConfig } = useMQTT();
  const brokerInfo = brokerForESP32(brokerConfig?.wss_url || 'wss://z110b082.ala.us-east-1.emqxsl.com:8084/mqtt');

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
            <Label>Device ID <span className="text-xs text-muted-foreground">(Permanent)</span></Label>
            <Input value={device.device_id} readOnly className="bg-muted font-mono" />
          </div>
          
          <div className="space-y-2">
            <Label>Device Key <span className="text-xs text-muted-foreground">(Permanent)</span></Label>
            <Input value={device.device_key} readOnly className="bg-muted font-mono" />
          </div>
          
          <div className="space-y-2">
            <Label>MQTT Broker (WebSocket)</Label>
            <Input value={brokerSettings.url} readOnly />
          </div>
          
          <div className="space-y-2">
            <Label>MQTT Broker (ESP32)</Label>
            <Input value={`${brokerInfo.host}:${brokerInfo.port}`} readOnly />
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