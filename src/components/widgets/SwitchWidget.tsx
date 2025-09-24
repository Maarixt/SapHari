import { useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useMQTT } from '@/hooks/useMQTT';
import { useToast } from '@/hooks/use-toast';
import { EditWidgetDialog } from './EditWidgetDialog';

import { Widget, Device } from '@/lib/types';

interface SwitchWidgetProps {
  widget: Widget;
  device: Device;
  allWidgets: Widget[];
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
}

export const SwitchWidget = ({ widget, device, allWidgets, onUpdate, onDelete }: SwitchWidgetProps) => {
  const { publishMessage } = useMQTT();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const currentState = widget.state?.value >= 0.5 ? 1 : 0;

  const handleToggle = async () => {
    setIsToggling(true);
    const newState = currentState ? 0 : 1;
    
    try {
      // Update local state immediately for responsiveness
      onUpdate({
        state: { ...(widget.state ?? {}), value: newState }
      });

      // Update database
      const { error } = await supabase
        .from('widgets')
        .update({
          state: { ...(widget.state ?? {}), value: newState }
        })
        .eq('id', widget.id);

      if (error) throw error;

      // Publish MQTT command
      if (widget.pin === null || widget.pin === undefined) {
        // Override-only switch
        const overridePayload = JSON.stringify({ 
          addr: widget.address, 
          state: newState, 
          key: device.device_key 
        });
        publishMessage(`saphari/${device.device_id}/status/override`, overridePayload, true);
        publishMessage(`saphari/${device.device_id}/sensor/${widget.address}`, String(newState), true);
      } else {
        // Physical switch
        const payload = JSON.stringify({ 
          addr: widget.address, 
          pin: widget.pin, 
          state: newState, 
          override: widget.override_mode || false,
          key: device.device_key 
        });
        publishMessage(`saphari/${device.device_id}/cmd/toggle`, payload, true);
      }
    } catch (error: unknown) {
      console.error('Error toggling switch:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle switch",
        variant: "destructive"
      });
      // Revert local state on error
      onUpdate({
        state: { ...(widget.state ?? {}), value: currentState }
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this switch widget?')) return;

    try {
      const { error } = await supabase
        .from('widgets')
        .delete()
        .eq('id', widget.id);

      if (error) throw error;
      onDelete();
      toast({
        title: "Widget deleted",
        description: "Switch widget has been removed"
      });
    } catch (error: unknown) {
      console.error('Error deleting widget:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete widget",
        variant: "destructive"
      });
    }
  };

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
            <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">
            {currentState ? 'ON' : 'OFF'}
          </span>
          <Switch
            checked={currentState === 1}
            onCheckedChange={handleToggle}
            disabled={isToggling}
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          Override: {widget.override_mode ? 'ON' : 'OFF'}
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