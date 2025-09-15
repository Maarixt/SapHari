import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useMQTT } from '@/hooks/useMQTT';

interface CodeSnippetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: any;
  widgets: any[];
}

export const CodeSnippetDialog = ({ open, onOpenChange, device, widgets }: CodeSnippetDialogProps) => {
  const { brokerSettings } = useMQTT();
  
  const generateCode = () => {
    const switches = widgets.filter(w => w.type === 'switch').map(w => 
      `{ "${w.address}", ${w.pin || -1}, false, ${w.override_mode ? 'true' : 'false'} }`
    ).join(',\n  ') || '// none';
    
    const gauges = widgets.filter(w => w.type === 'gauge').map(w => 
      `{ "${w.address}", GT_${w.gauge_type?.toUpperCase() || 'ANALOG'}, ${w.pin}, ${w.echo_pin || -1} }`
    ).join(',\n  ') || '// none';
    
    const servos = widgets.filter(w => w.type === 'servo').map(w => 
      `{ "${w.address}", ${w.pin}, ${w.state?.angle || 90}, false }`
    ).join(',\n  ') || '// none';

    return `// SapHari Device Configuration
#define DEVICE_ID   "${device.device_id}"
#define DEVICE_KEY  "${device.device_key}"
#define MQTT_BROKER "${new URL(brokerSettings.url).hostname}"
#define MQTT_PORT   1883

SwitchMap SWITCHES[] = {
  ${switches}
};

GaugeMap GAUGES[] = {
  ${gauges}
};

ServoMap SERVOS[] = {
  ${servos}
};`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ESP32 Code Snippet</DialogTitle>
        </DialogHeader>
        <Textarea value={generateCode()} readOnly rows={20} className="font-mono text-sm" />
        <Button onClick={() => onOpenChange(false)}>Close</Button>
      </DialogContent>
    </Dialog>
  );
};