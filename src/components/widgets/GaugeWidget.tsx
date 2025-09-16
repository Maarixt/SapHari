import { useState, useRef, useEffect } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditWidgetDialog } from './EditWidgetDialog';
import { Widget, Device } from '@/lib/types';

interface GaugeWidgetProps {
  widget: Widget;
  device: Device;
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
}

export const GaugeWidget = ({ widget, device, onUpdate, onDelete }: GaugeWidgetProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const gaugeTypeLabel = (widget.gauge_type || 'analog').toUpperCase();

  const drawGauge = (value: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height - 20;
    const radius = 60;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Value arc
    const normalizedValue = Math.max(0, Math.min(1, 
      (value - (widget.min_value || 0)) / ((widget.max_value || 100) - (widget.min_value || 0))
    ));
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, Math.PI * (1 - normalizedValue), true);
    ctx.strokeStyle = normalizedValue < 0.5 ? '#22c55e' : normalizedValue < 0.8 ? '#eab308' : '#ef4444';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Display value
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    
    let displayText = '';
    if (widget.gauge_type === 'pir') {
      displayText = value >= 1 ? 'DETECTED' : 'CLEAR';
    } else if (widget.gauge_type === 'ds18b20') {
      displayText = `${value.toFixed(1)}°C`;
    } else if (widget.gauge_type === 'ultrasonic') {
      displayText = `${value.toFixed(0)} cm`;
    } else {
      displayText = value.toFixed(0);
    }
    
    ctx.fillText(displayText, centerX, centerY - 10);
  };

  useEffect(() => {
    const value = widget.state?.value || 0;
    drawGauge(value);
  }, [widget.state?.value, widget.min_value, widget.max_value, widget.gauge_type]);

  const handleEdit = () => {
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this gauge widget?')) return;

    try {
      const { error } = await supabase
        .from('widgets')
        .delete()
        .eq('id', widget.id);

      if (error) throw error;
      onDelete();
      toast({
        title: "Widget deleted",
        description: "Gauge widget has been removed"
      });
    } catch (error: unknown) {
      console.error('Error deleting gauge widget:', error);
      const description = error instanceof Error ? error.message : 'Failed to delete widget';
      toast({
        title: "Error",
        description,
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
          <div className="flex flex-col items-center space-y-2">
            <canvas
              ref={canvasRef}
              width={140}
              height={80}
              className="border border-iot-border rounded"
            />
            <div className="text-xs text-iot-muted flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span>{widget.address}</span>
              <span>•</span>
              <span>{gaugeTypeLabel}</span>
              {widget.pin !== null && widget.pin !== undefined && (
                <>
                  <span>•</span>
                  <span>GPIO {widget.pin}</span>
                </>
              )}
              {widget.echo_pin !== null && widget.echo_pin !== undefined && (
                <>
                  <span>•</span>
                  <span>Echo GPIO {widget.echo_pin}</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <EditWidgetDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        widget={widget}
        onUpdate={onUpdate}
      />
    </>
  );
};