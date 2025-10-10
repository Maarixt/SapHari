import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMQTT } from '@/hooks/useMQTT';
import { useDeviceStore } from '@/hooks/useDeviceStore';
import { SwitchWidget } from '../widgets/SwitchWidget';
import { GaugeWidget } from '../widgets/GaugeWidget';
import { ServoWidget } from '../widgets/ServoWidget';
import { AddWidgetDialog } from '../widgets/AddWidgetDialog';
import { CodeSnippetDialog } from '../widgets/CodeSnippetDialog';

import { Device, Widget, DeviceWithRole } from '@/lib/types';

interface DeviceViewProps {
  device: DeviceWithRole;
  onBack: () => void;
}

export const DeviceView = ({ device, onBack }: DeviceViewProps) => {
  const { toast } = useToast();
  const { onMessage } = useMQTT();
  const { 
    device: deviceSnapshot,
    isOnline, 
    controlGpio, 
    controlServo, 
    controlGauge,
    getGpioState,
    getSensorValue
  } = useDeviceStore(device.id);
  
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [addWidgetType, setAddWidgetType] = useState<'switch' | 'gauge' | 'servo'>('switch');
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);

  // For now, assume owner role - this will be properly implemented when DeviceView gets role info
  const userRole = 'owner';

  // Device online status is now managed by useDevice hook

  const loadWidgets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('device_id', device.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setWidgets((data || []).map(item => ({
        ...item,
        type: item.type as 'switch' | 'gauge' | 'servo',
        gauge_type: item.gauge_type as 'analog' | 'pir' | 'ds18b20' | 'ultrasonic' | null,
        state: item.state as any
      })));
    } catch (error) {
      console.error('Error loading widgets:', error);
      toast({
        title: "Error",
        description: "Failed to load widgets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWidgets();
  }, [device]);

  // Update widget states based on device-reported state
  useEffect(() => {
    if (!deviceSnapshot) return;

        setWidgets((prev) => {
      return prev.map((widget) => {
        let newState = { ...(widget.state ?? {}) };
        let hasChanges = false;

        if (widget.type === 'switch' && widget.pin !== undefined) {
          const reportedValue = getGpioState(widget.pin);
          if (reportedValue !== undefined && widget.state?.value !== reportedValue) {
            newState.value = reportedValue;
            hasChanges = true;
          }
        } else if (widget.type === 'servo' && widget.pin !== undefined) {
          // For servo, we might need to get the value from sensors or a different source
          // This depends on how the ESP32 reports servo positions
          const reportedValue = getSensorValue(`servo_${widget.pin}`);
          if (reportedValue !== undefined && widget.state?.angle !== reportedValue) {
            newState.angle = reportedValue;
            hasChanges = true;
          }
        } else if (widget.type === 'gauge' && widget.address) {
          const reportedValue = getSensorValue(widget.address);
          if (reportedValue !== undefined && widget.state?.value !== reportedValue) {
            newState.value = reportedValue;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          // Persist state to database
          supabase
            .from('widgets')
            .update({ state: newState as any })
            .eq('id', widget.id)
            .then(({ error }) => {
              if (error) {
                console.error('Error persisting widget state:', error);
              }
            });

          return { ...widget, state: newState };
        }

        return widget;
      });
    });
  }, [deviceSnapshot, getGpioState, getSensorValue]);

  const handleAddWidget = (type: 'switch' | 'gauge' | 'servo') => {
    console.log('Adding widget of type:', type, 'for device:', device.id);
    setAddWidgetType(type);
    setShowAddWidget(true);
  };

  const handleWidgetAdded = () => {
    loadWidgets();
    setShowAddWidget(false);
  };

  const handleWidgetDeleted = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  const handleWidgetUpdated = (widgetId: string, updates: Partial<Widget>) => {
    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, ...updates } : w));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="btn-outline-enhanced">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">{device.name}</h2>
            <p className="text-sm text-muted-foreground font-mono">{device.device_id}</p>
          </div>
          <Badge 
            variant={isOnline ? "default" : "secondary"}
            className={isOnline ? "bg-iot-online text-white" : "bg-iot-offline text-white"}
          >
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="btn-outline-enhanced" 
            onClick={() => handleAddWidget('switch')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Switch
          </Button>
          <Button 
            variant="outline" 
            className="btn-outline-enhanced" 
            onClick={() => handleAddWidget('gauge')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Gauge
          </Button>
          <Button 
            variant="outline" 
            className="btn-outline-enhanced" 
            onClick={() => handleAddWidget('servo')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Servo
          </Button>
          <Button variant="outline" className="btn-outline-enhanced" onClick={() => setShowCodeSnippet(true)}>
            <Code className="mr-2 h-4 w-4" />
            Code Snippet
          </Button>
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No widgets yet. Add widgets to control and monitor your device.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => handleAddWidget('switch')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Switch
            </Button>
            <Button variant="outline" className="btn-outline-enhanced" onClick={() => handleAddWidget('gauge')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Gauge
            </Button>
            <Button variant="outline" className="btn-outline-enhanced" onClick={() => handleAddWidget('servo')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Servo
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgets.map((widget) => {
            if (widget.type === 'switch') {
              return (
                <SwitchWidget
                  key={widget.id}
                  widget={widget}
                  device={device}
                  allWidgets={widgets}
                  onUpdate={(updates) => handleWidgetUpdated(widget.id, updates)}
                  onDelete={() => handleWidgetDeleted(widget.id)}
                />
              );
            } else if (widget.type === 'gauge') {
              return (
                <GaugeWidget
                  key={widget.id}
                  widget={widget}
                  device={device}
                  allWidgets={widgets}
                  onUpdate={(updates) => handleWidgetUpdated(widget.id, updates)}
                  onDelete={() => handleWidgetDeleted(widget.id)}
                />
              );
            } else if (widget.type === 'servo') {
              return (
                <ServoWidget
                  key={widget.id}
                  widget={widget}
                  device={device}
                  allWidgets={widgets}
                  onUpdate={(updates) => handleWidgetUpdated(widget.id, updates)}
                  onDelete={() => handleWidgetDeleted(widget.id)}
                />
              );
            }
            return null;
          })}
        </div>
      )}

      <AddWidgetDialog
        open={showAddWidget}
        onOpenChange={setShowAddWidget}
        device={device}
        type={addWidgetType}
        existingWidgets={widgets}
        onWidgetAdded={handleWidgetAdded}
      />

      <CodeSnippetDialog
        open={showCodeSnippet}
        onOpenChange={setShowCodeSnippet}
        device={device}
        widgets={widgets}
      />
    </div>
  );
};