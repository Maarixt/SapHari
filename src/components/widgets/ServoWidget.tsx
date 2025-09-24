import { useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useMQTT } from '@/hooks/useMQTT';
import { useToast } from '@/hooks/use-toast';
import { EditWidgetDialog } from './EditWidgetDialog';
import { Widget, Device } from '@/lib/types';

interface ServoWidgetProps {
  widget: Widget;
  device: Device;
  allWidgets: Widget[];
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
}

export const ServoWidget = ({ widget, device, allWidgets, onUpdate, onDelete }: ServoWidgetProps) => {
  const { publishMessage } = useMQTT();
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const currentAngle = widget.state?.angle || 90;

  const handleAngleChange = (value: number[]) => {
    const newAngle = value[0];
    const updatedState = { ...(widget.state ?? {}), angle: newAngle };

    // Update local state immediately
    onUpdate({
      state: updatedState
    });

    // Publish MQTT command
    const topic = `saphari/${device.device_id}/cmd/servo`;
    const payload = JSON.stringify({
      addr: widget.address,
      pin: widget.pin,
      angle: newAngle,
      key: device.device_key
    });

    publishMessage(topic, payload);

    supabase
      .from('widgets')
      .update({ state: updatedState })
      .eq('id', widget.id)
      .then(({ error }) => {
        if (error) {
          console.error('Error saving servo angle:', error);
          toast({
            title: "Error",
            description: "Failed to persist servo angle",
            variant: "destructive"
          });
        }
      });
  };

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this servo widget?')) return;

    try {
      const { error } = await supabase
        .from('widgets')
        .delete()
        .eq('id', widget.id);

      if (error) throw error;
      onDelete();
      toast({
        title: "Widget deleted",
        description: "Servo widget has been removed"
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete widget',
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card className="bg-card border border-iot-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-medium text-iot-text">{widget.label}</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-8 w-8 p-0 text-iot-muted hover:text-iot-text"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-iot-muted hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-iot-text">{currentAngle}°</div>
              <div className="text-sm text-iot-muted">Servo Position</div>
            </div>
            
            <div className="px-2">
              <Slider
                value={[currentAngle]}
                onValueChange={handleAngleChange}
                max={180}
                min={0}
                step={1}
                className="w-full"
              />
            </div>
            
            <div className="text-xs text-iot-muted text-center space-x-2">
              <span>{widget.address}</span>
              <span>•</span>
              <span>GPIO {widget.pin}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditWidgetDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        widget={widget}
        allWidgets={allWidgets}
        onUpdate={onUpdate}
      />
    </>
  );
};