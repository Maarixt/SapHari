import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useMQTT } from '@/hooks/useMQTT';
import { Device, Widget } from '@/lib/types';

interface CodeSnippetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  widgets: Widget[];
}

const sanitizeMessage = (message: string) => message.replace(/"/g, '\\"');

const getSwitchState = (widget: Widget) => {
  const raw = widget.state?.['value'];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw >= 0.5;
  if (typeof raw === 'string') {
    return raw === '1' || raw.toLowerCase() === 'true';
  }
  return false;
};

const getServoAngle = (widget: Widget) => {
  const raw = widget.state?.['angle'];
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 90;
};

const formatGaugeType = (type?: string | null) => `GT_${(type || 'analog').toUpperCase()}`;

export const CodeSnippetDialog = ({ open, onOpenChange, device, widgets }: CodeSnippetDialogProps) => {
  const { brokerSettings } = useMQTT();

  const brokerHost = (() => {
    try {
      return new URL(brokerSettings.url).hostname;
    } catch {
      return brokerSettings.url;
    }
  })();

  const generateCode = () => {
    const switches = widgets
      .filter((w) => w.type === 'switch')
      .map((w) =>
        `{ "${w.address}", ${w.pin ?? -1}, ${getSwitchState(w) ? 'true' : 'false'}, ${w.override_mode ? 'true' : 'false'} }`
      )
      .join(',\n  ');

    const gauges = widgets
      .filter((w) => w.type === 'gauge')
      .map((w) =>
        `{ "${w.address}", ${formatGaugeType(w.gauge_type)}, ${w.pin ?? -1}, ${w.echo_pin ?? -1} }`
      )
      .join(',\n  ');

    const servos = widgets
      .filter((w) => w.type === 'servo')
      .map((w) => `{ "${w.address}", ${w.pin ?? -1}, ${getServoAngle(w)}, false }`)
      .join(',\n  ');

    const alerts = widgets
      .filter((w) => w.type === 'alert')
      .map((w) =>
        `{ "${w.address}", ${w.trigger ?? 1}, "${sanitizeMessage(w.message || '')}" }`
      )
      .join(',\n  ');

    return `// SapHari Device Configuration
#define DEVICE_ID   "${device.device_id}"
#define DEVICE_KEY  "${device.device_key}"
#define MQTT_BROKER "${brokerHost}"
#define MQTT_PORT   1883

SwitchMap SWITCHES[] = {
  ${switches || '// none'}
};

GaugeMap GAUGES[] = {
  ${gauges || '// none'}
};

ServoMap SERVOS[] = {
  ${servos || '// none'}
};

AlertMap ALERTS[] = {
  ${alerts || '// none'}
};
int NUM_ALERTS = sizeof(ALERTS)/sizeof(ALERTS[0]);`;
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
