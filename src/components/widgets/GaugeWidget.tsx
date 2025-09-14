import { useState, useRef, useEffect } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditWidgetDialog } from './EditWidgetDialog';

interface Widget {
  id: string;
  type: 'switch' | 'gauge' | 'servo';
  label: string;
  address: string;
  pin?: number;
  echo_pin?: number;
  gauge_type?: string;
  min_value?: number;
  max_value?: number;
  state: any;
}

interface Device {
  id: string;
  device_id: string;
  device_key: string;
  name: string;
}

interface GaugeWidgetProps {
  widget: Widget;
  device: Device;
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
}

export const GaugeWidget = ({ widget, device, onUpdate, onDelete }: GaugeWidgetProps) => {
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const value = widget.state?.value;
  const min = widget.min_value || 0;
  const max = widget.max_value || 100;
  const type = widget.gauge_type || 'analog';

  const drawGauge = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (typeof value !== 'number' || isNaN(value)) {
      // Empty state
      ctx.beginPath();
      ctx.arc(w/2, h, 64, Math.PI, 0);
      ctx.strokeStyle = 'hsl(var(--border))';
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.fillStyle = 'hsl(var(--muted-foreground))';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('—', w/2, h-10);
      return;
    }

    // Normalize value
    let pct = (value - min) / (max - min);
    pct = Math.max(0, Math.min(1, pct));

    // Background arc
    ctx.beginPath();
    ctx.arc(w/2, h, 64, Math.PI, 0);
    ctx.strokeStyle = 'hsl(var(--border))';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Value arc
    ctx.beginPath();
    ctx.arc(w/2, h, 64, Math.PI, Math.PI*(1-pct), true);
    ctx.strokeStyle = pct < 0.5 ? 'hsl(var(--iot-online))' : 
                      pct < 0.8 ? 'hsl(var(--iot-warning))' : 
                      'hsl(var(--iot-offline))';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Display text
    let displayText = '';
    switch (type) {
      case 'pir':
        displayText = value >= 1 ? 'ON' : 'OFF';
        break;
      case 'ds18b20':
        displayText = value.toFixed(1) + ' °C';
        break;
      case 'ultrasonic':
        displayText = value.toFixed(0) + ' cm';
        break;
      default:
        displayText = value.toFixed(0);
        break;
    }

    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(displayText, w/2, h-10);
  };

  useEffect(() => {
    drawGauge();
  }, [value, min, max, type]);

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

  const getPinDescription = () => {
    if (type === 'ultrasonic') {
      return `trig ${widget.pin} / echo ${widget.echo_pin}`;
    }
    return `@ ${widget.pin}`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{widget.label}</h3>
            <p className="text-sm text-muted-foreground">
              {widget.address} • {type} {getPinDescription()}
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

      <CardContent>
        <canvas
          ref={canvasRef}
          width={160}
          height={96}
          className="mx-auto"
        />
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