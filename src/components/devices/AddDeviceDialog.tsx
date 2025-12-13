import { useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

interface AddDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceAdded: () => void;
}

const generateDeviceId = () => `saph-${Math.random().toString(36).slice(2, 8)}`;

// Generate cryptographically strong device key (24+ chars)
const generateDeviceKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
};

export const AddDeviceDialog = ({ open, onOpenChange, onDeviceAdded }: AddDeviceDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('Device');
  const [deviceId, setDeviceId] = useState(generateDeviceId());
  const [deviceKey, setDeviceKey] = useState(generateDeviceKey());
  const [isLoading, setIsLoading] = useState(false);

  const regenerateCredentials = () => {
    setDeviceId(generateDeviceId());
    setDeviceKey(generateDeviceKey());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !deviceId.trim() || !deviceKey.trim() || !user) return;
    
    setIsLoading(true);
    try {
      // Debug: Log user info
      console.log('User ID:', user.id);
      console.log('User email:', user.email);
      const { error } = await supabase
        .from('devices')
        .insert({
          name: name.trim(),
          device_id: deviceId.trim(),
          device_key: deviceKey.trim(),
          user_id: user.id
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: "Device added",
        description: `${name} has been added successfully`
      });

      onDeviceAdded();
      onOpenChange(false);
      
      // Reset form
      setName('Device');
      setDeviceId(generateDeviceId());
      setDeviceKey(generateDeviceKey());
    } catch (error: any) {
      console.error('Device creation error:', error);
      toast({
        title: "Error",
        description: error.message?.includes('duplicate') 
          ? "A device with this ID already exists" 
          : error.message || "Failed to add device",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Device</DialogTitle>
          <DialogDescription>
            Add a new IoT device to your dashboard. Device ID and key are auto-generated and cannot be changed.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device-name">Device Name</Label>
            <Input
              id="device-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Device"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="device-id">Device ID <span className="text-xs text-muted-foreground">(Auto-generated)</span></Label>
            <Input
              id="device-id"
              value={deviceId}
              readOnly
              placeholder="saph-abc123"
              required
              className="font-mono bg-muted"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="device-key">Device Key <span className="text-xs text-muted-foreground">(Auto-generated)</span></Label>
            <Input
              id="device-key"
              value={deviceKey}
              readOnly
              placeholder="ABCD1234"
              required
              className="font-mono bg-muted"
            />
          </div>
          
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={regenerateCredentials}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate Credentials
            </Button>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Device'}
            </Button>
          </DialogFooter>
        </form>
        
        <div className="text-sm text-muted-foreground border-t pt-4">
          <strong>ESP32 Setup:</strong> Your ESP32 will subscribe to topics like{' '}
          <code className="bg-muted px-1 rounded">saphari/&lt;device-id&gt;/cmd/#</code> and publish sensor data to{' '}
          <code className="bg-muted px-1 rounded">saphari/&lt;device-id&gt;/sensor/&lt;address&gt;</code>
        </div>
      </DialogContent>
    </Dialog>
  );
};