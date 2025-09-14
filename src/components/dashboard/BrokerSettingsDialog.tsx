import { useState, useEffect } from 'react';
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

interface BrokerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BrokerSettingsDialog = ({ open, onOpenChange }: BrokerSettingsDialogProps) => {
  const { brokerSettings, updateBrokerSettings } = useMQTT();
  const [url, setUrl] = useState(brokerSettings.url);
  const [username, setUsername] = useState(brokerSettings.username);
  const [password, setPassword] = useState(brokerSettings.password);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUrl(brokerSettings.url);
    setUsername(brokerSettings.username);
    setPassword(brokerSettings.password);
  }, [brokerSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await updateBrokerSettings({
        url: url.trim(),
        username: username.trim(),
        password: password
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>MQTT Broker Settings</DialogTitle>
          <DialogDescription>
            Configure your MQTT broker connection. Changes will reconnect the client.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="broker-url">WebSocket URL</Label>
            <Input
              id="broker-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="wss://broker.emqx.io:8084/mqtt"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="broker-username">Username (optional)</Label>
            <Input
              id="broker-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="broker-password">Password (optional)</Label>
            <Input
              id="broker-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save & Reconnect'}
            </Button>
          </DialogFooter>
        </form>
        
        <div className="text-sm text-muted-foreground border-t pt-4">
          <strong>Example:</strong> <code className="bg-muted px-1 rounded">wss://broker.emqx.io:8084/mqtt</code>
        </div>
      </DialogContent>
    </Dialog>
  );
};