import { useState, useEffect } from 'react';
import { Settings, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useMQTT } from '@/hooks/useMQTT';
import { useToast } from '@/hooks/use-toast';
import { EditWidgetDialog } from './EditWidgetDialog';
import { sendToggleCommand, hasPendingCommand } from '@/services/commandService';
import { DeviceStore } from '@/state/deviceStore';

import { Widget, Device } from '@/lib/types';

interface SwitchWidgetProps {
  widget: Widget;
  device: Device;
  allWidgets: Widget[];
  onUpdate: (updates: Partial<Widget>) => void;
  onDeleteRequest?: (widgetId: string) => void;
  isDeleting?: boolean;
}

export const SwitchWidget = ({ widget, device, allWidgets, onUpdate, onDeleteRequest, isDeleting: isDeletingProp }: SwitchWidgetProps) => {
  const { publishMessage, connected } = useMQTT();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [, setTick] = useState(0);

  // Subscribe to DeviceStore for real-time GPIO updates
  useEffect(() => {
    return DeviceStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  // Get current state from DeviceStore (source of truth from device)
  const deviceState = DeviceStore.get(device.device_id);
  const gpioValue = widget.pin !== null && widget.pin !== undefined 
    ? deviceState?.gpio?.[widget.pin] 
    : undefined;
  
  // Use GPIO state from device if available, otherwise fall back to widget state
  const currentState = gpioValue !== undefined 
    ? gpioValue 
    : (Number(widget.state?.value) >= 0.5 ? 1 : 0);

  const handleToggle = async () => {
    if (!connected) {
      toast({
        title: "Not connected",
        description: "MQTT broker not connected",
        variant: "destructive"
      });
      return;
    }

    if (widget.pin === null || widget.pin === undefined) {
      // Override-only switch - no physical pin
      const newState = currentState ? 0 : 1;
      try {
        onUpdate({ state: { ...(widget.state ?? {}), value: newState } });
        await supabase
          .from('widgets')
          .update({ state: { ...(widget.state ?? {}), value: newState } })
          .eq('id', widget.id);
        
        // Publish override state
        const payload = JSON.stringify({ 
          addr: widget.address, 
          state: newState
        });
        publishMessage(`saphari/${device.device_id}/status/override`, payload, true);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to toggle override switch",
          variant: "destructive"
        });
      }
      return;
    }

    // Physical switch - use command service
    setIsToggling(true);
    const desiredState = currentState ? 0 : 1;

    try {
      // Send command and wait for confirmation from device
      const confirmed = await sendToggleCommand(
        publishMessage,
        device.device_id,
        widget.address,
        widget.pin,
        desiredState as 0 | 1,
        widget.override_mode || false
      );

      if (confirmed) {
        // Update widget state in DB after confirmation
        await supabase
          .from('widgets')
          .update({ state: { ...(widget.state ?? {}), value: desiredState } })
          .eq('id', widget.id);
        
        toast({
          title: "Switch toggled",
          description: `${widget.label} is now ${desiredState ? 'ON' : 'OFF'}`,
        });
      } else {
        toast({
          title: "Command timeout",
          description: "Device did not confirm the switch change",
          variant: "destructive"
        });
      }
    } catch (error: unknown) {
      console.error('Error toggling switch:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle switch",
        variant: "destructive"
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleDeleteClick = () => {
    onDeleteRequest?.(widget.id);
  };

  const isPending = widget.pin !== null && widget.pin !== undefined && hasPendingCommand(device.device_id, widget.pin);
  const isOnline = deviceState?.online ?? false;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{widget.label}</h3>
            <p className="text-sm text-muted-foreground">
              {widget.address} {widget.pin !== null && widget.pin !== undefined ? `• GPIO ${widget.pin}` : '• override'}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="ghost-enhanced" onClick={() => setShowEdit(true)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="ghost-enhanced" onClick={handleDeleteClick} disabled={isDeletingProp}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">
              {currentState ? 'ON' : 'OFF'}
            </span>
            {(isToggling || isPending) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Switch
            checked={currentState === 1}
            onCheckedChange={handleToggle}
            disabled={isToggling || !connected || (!isOnline && widget.pin !== null)}
            className="toggle-enhanced"
          />
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Override: {widget.override_mode ? 'ON' : 'OFF'}</span>
          {!isOnline && widget.pin !== null && (
            <span className="text-destructive">Device offline</span>
          )}
        </div>
      </CardContent>

      <EditWidgetDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        widget={widget}
        allWidgets={allWidgets}
        onUpdate={onUpdate}
      />
    </Card>
  );
};
