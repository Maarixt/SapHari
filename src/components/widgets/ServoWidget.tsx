import { useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useMQTT } from '@/hooks/useMQTT';
import { useToast } from '@/hooks/use-toast';
import { EditWidgetDialog } from './EditWidgetDialog';

interface Widget {
  id: string;
  type: 'switch' | 'gauge' | 'servo';
  label: string;
  address: string;
  pin?: number;
  state: any;
}

interface Device {
  id: string;
  device_id: string;
  device_key: string;
  name: string;
}

interface ServoWidgetProps {
  widget: Widget;
  device: Device;
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
}

export const ServoWidget = ({ widget, device, onUpdate, onDelete }: ServoWidgetProps) => {
  const { publishMessage } = useMQTT();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  
  const currentAngle = widget.state?.angle || 90;

  const handleAngleChange = async (values: number[]) => {
    const newAngle = values[0];
    
    try {
      // Update local state immediately
      onUpdate({
        state: { ...widget.state, angle: newAngle }
      });

      // Update database
      const { error } = await supabase
        .from('widgets')
        .update({ 
          state: { ...widget.state, angle: newAngle }
        })
        .eq('id', widget.id);

      if (error) throw error;

      // Publish MQTT command
      const payload = JSON.stringify({ 
        addr: widget.address, 
        pin: widget.pin, 
        angle: newAngle, 
        key: device.device_key 
      });
      publishMessage(`saphari/${device.device_id}/cmd/servo`, payload, true);
    } catch (error) {
      console.error('Error updating servo:', error);
      toast({
        title: "Error",
        description: "Failed to update servo",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('widgets')
        .delete()
        .eq('id', widget.id);

      if (error) throw error;
      onDelete();
    } catch (error) {
      console.error('Error deleting widget:', error);
      toast({
        title: "Error",
        description: "Failed to delete widget",
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
              {widget.address} • GPIO {widget.pin}
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Angle</span>
            <span className="text-sm text-muted-foreground">{currentAngle}°</span>
          </div>
          <Slider
            value={[currentAngle]}
            onValueChange={handleAngleChange}
            max={180}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0°</span>
            <span>90°</span>
            <span>180°</span>
          </div>
        </div>
      </CardContent>

      <EditWidgetDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        widget={widget}
        onUpdate={onUpdate}
      />
    </Card>
  );
};