import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMQTT } from '@/hooks/useMQTT';
import { SwitchWidget } from '../widgets/SwitchWidget';
import { GaugeWidget } from '../widgets/GaugeWidget';
import { ServoWidget } from '../widgets/ServoWidget';
import { AddWidgetDialog } from '../widgets/AddWidgetDialog';
import { CodeSnippetDialog } from '../widgets/CodeSnippetDialog';

interface Device {
  id: string;
  device_id: string;
  device_key: string;
  name: string;
  online: boolean;
}

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
  override_mode?: boolean;
  state: any;
}

interface DeviceViewProps {
  device: Device;
  onBack: () => void;
}

export const DeviceView = ({ device, onBack }: DeviceViewProps) => {
  const { toast } = useToast();
  const { publishMessage, onMessage } = useMQTT();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [addWidgetType, setAddWidgetType] = useState<'switch' | 'gauge' | 'servo'>('switch');
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [deviceOnline, setDeviceOnline] = useState(device.online);

  const loadWidgets = async () => {
    try {
      const { data, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('device_id', device.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setWidgets(data || []);
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

    // Set up MQTT message handler
    const cleanup = onMessage((topic, message) => {
      const parts = topic.split('/');
      if (parts.length < 4 || parts[1] !== device.device_id) return;

      const category = parts[2]; // sensor or status
      const address = parts[3];

      if (category === 'sensor') {
        const value = parseFloat(message);
        if (!isNaN(value)) {
          setWidgets(prev => prev.map(widget => {
            if (widget.address === address) {
              return {
                ...widget,
                state: { ...widget.state, value }
              };
            }
            return widget;
          }));
        }
      } else if (category === 'status' && address === 'online') {
        const online = message === '1';
        setDeviceOnline(online);
        
        // Update device online status in database
        supabase
          .from('devices')
          .update({ online })
          .eq('id', device.id)
          .then(({ error }) => {
            if (error) console.error('Error updating device status:', error);
          });
      }
    });

    return cleanup;
  }, [device, onMessage]);

  const handleAddWidget = (type: 'switch' | 'gauge' | 'servo') => {
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
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">{device.name}</h2>
            <p className="text-sm text-muted-foreground font-mono">{device.device_id}</p>
          </div>
          <Badge 
            variant={deviceOnline ? "default" : "secondary"}
            className={deviceOnline ? "bg-iot-online text-white" : "bg-iot-offline text-white"}
          >
            {deviceOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleAddWidget('switch')}>
            <Plus className="mr-2 h-4 w-4" />
            Switch
          </Button>
          <Button variant="outline" onClick={() => handleAddWidget('gauge')}>
            <Plus className="mr-2 h-4 w-4" />
            Gauge
          </Button>
          <Button variant="outline" onClick={() => handleAddWidget('servo')}>
            <Plus className="mr-2 h-4 w-4" />
            Servo
          </Button>
          <Button variant="outline" onClick={() => setShowCodeSnippet(true)}>
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
            <Button variant="outline" onClick={() => handleAddWidget('gauge')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Gauge
            </Button>
            <Button variant="outline" onClick={() => handleAddWidget('servo')}>
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