import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch as Toggle } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Device, Widget } from '@/lib/types';

type GaugeType = 'analog' | 'pir' | 'ds18b20' | 'ultrasonic';
type TriggerEdge = 'rising' | 'falling';

const DIGITAL_PINS = [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33];
const ANALOG_PINS = [32, 33, 34, 35, 36, 39];

const GAUGE_DEFAULTS: Record<GaugeType, { min: number; max: number }> = {
  analog: { min: 0, max: 4095 },
  pir: { min: 0, max: 1 },
  ds18b20: { min: -40, max: 125 },
  ultrasonic: { min: 0, max: 400 },
};

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  type: 'switch' | 'gauge' | 'servo' | 'alert';
  existingWidgets: Widget[];
  onWidgetAdded: () => void;
}

const buildUsedPinSet = (widgets: Widget[]) => {
  const used = new Set<number>();
  widgets.forEach((widget) => {
    if (widget.pin !== null && widget.pin !== undefined) {
      used.add(widget.pin);
    }
    if (widget.echo_pin !== null && widget.echo_pin !== undefined) {
      used.add(widget.echo_pin);
    }
  });
  return used;
};

export const AddWidgetDialog = ({
  open,
  onOpenChange,
  device,
  type,
  existingWidgets,
  onWidgetAdded,
}: AddWidgetDialogProps) => {
  const { toast } = useToast();
  const [label, setLabel] = useState('');
  const [overrideMode, setOverrideMode] = useState(false);
  const [gaugeType, setGaugeType] = useState<GaugeType>('analog');
  const [pin, setPin] = useState<number | undefined>();
  const [echoPin, setEchoPin] = useState<number | undefined>();
  const [minValue, setMinValue] = useState<string>('0');
  const [maxValue, setMaxValue] = useState<string>('0');
  const [triggerEdge, setTriggerEdge] = useState<TriggerEdge>('rising');
  const [message, setMessage] = useState('');

  const usedPins = useMemo(() => buildUsedPinSet(existingWidgets), [existingWidgets]);

  useEffect(() => {
    if (!open) return;

    setLabel('');
    setOverrideMode(false);
    setGaugeType('analog');
    setPin(undefined);
    setEchoPin(undefined);
    const defaults = GAUGE_DEFAULTS['analog'];
    setMinValue(String(defaults.min));
    setMaxValue(String(defaults.max));
    setTriggerEdge('rising');
    setMessage('');
  }, [open, type]);

  useEffect(() => {
    if (!open || type !== 'gauge') return;

    const defaults = GAUGE_DEFAULTS[gaugeType];
    setMinValue(String(defaults.min));
    setMaxValue(String(defaults.max));
    setPin(undefined);
    setEchoPin(undefined);
  }, [gaugeType, open, type]);

  useEffect(() => {
    if (!open || type !== 'switch') return;
    if (overrideMode) {
      setPin(undefined);
    }
  }, [overrideMode, open, type]);

  const pinOptions = useMemo(() => {
    if (type === 'alert') return [];

    const sourcePins =
      type === 'gauge'
        ? gaugeType === 'analog'
          ? ANALOG_PINS
          : DIGITAL_PINS
        : DIGITAL_PINS;

    return sourcePins.map((gpio) => ({
      value: gpio,
      disabled: usedPins.has(gpio),
    }));
  }, [type, gaugeType, usedPins]);

  const echoPinOptions = useMemo(() => {
    if (type !== 'gauge' || gaugeType !== 'ultrasonic') return [];

    return DIGITAL_PINS.map((gpio) => ({
      value: gpio,
      disabled: usedPins.has(gpio) || gpio === pin,
    }));
  }, [gaugeType, pin, type, usedPins]);

  const getNextAddress = () => {
    const prefix =
      type === 'switch' ? 'S' : type === 'gauge' ? 'G' : type === 'servo' ? 'SS' : 'A';
    const existing = existingWidgets.filter((w) => w.type === type).map((w) => w.address);
    let n = 1;
    while (existing.includes(`${prefix}${n}`)) n += 1;
    return `${prefix}${n}`;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const widgetData: Record<string, unknown> = {
        device_id: device.id,
        type,
        label: label.trim() || `${type} widget`,
        address: getNextAddress(),
      };

      if (type === 'switch') {
        if (!overrideMode && pin === undefined) {
          toast({
            title: 'GPIO pin required',
            description: 'Select a GPIO pin for the switch',
            variant: 'destructive',
          });
          return;
        }

        widgetData.pin = overrideMode ? null : pin ?? null;
        widgetData.override_mode = overrideMode;
        widgetData.state = { value: 0 };
      }

      if (type === 'gauge') {
        if (pin === undefined) {
          toast({
            title: 'GPIO pin required',
            description: 'Select a GPIO pin for the gauge sensor',
            variant: 'destructive',
          });
          return;
        }

        if (gaugeType === 'ultrasonic' && echoPin === undefined) {
          toast({
            title: 'Echo pin required',
            description: 'Select an echo GPIO pin for the ultrasonic sensor',
            variant: 'destructive',
          });
          return;
        }

        const min = parseFloat(minValue);
        const max = parseFloat(maxValue);

        if (Number.isNaN(min) || Number.isNaN(max)) {
          toast({
            title: 'Invalid range',
            description: 'Enter valid numbers for min and max values',
            variant: 'destructive',
          });
          return;
        }

        if (min >= max) {
          toast({
            title: 'Invalid range',
            description: 'Min value must be less than max value',
            variant: 'destructive',
          });
          return;
        }

        widgetData.pin = pin;
        widgetData.echo_pin = gaugeType === 'ultrasonic' ? echoPin ?? null : null;
        widgetData.gauge_type = gaugeType;
        widgetData.min_value = min;
        widgetData.max_value = max;
        widgetData.state = { value: 0 };
      }

      if (type === 'servo') {
        if (pin === undefined) {
          toast({
            title: 'GPIO pin required',
            description: 'Select a GPIO pin for the servo',
            variant: 'destructive',
          });
          return;
        }

        widgetData.pin = pin;
        widgetData.state = { angle: 90 };
      }

      if (type === 'alert') {
        widgetData.trigger = triggerEdge === 'rising' ? 1 : 0;
        widgetData.message = message;
        widgetData.state = { triggered: false, lastTrigger: null };
      }

      const { error } = await supabase.from('widgets').insert(widgetData);
      if (error) throw error;

      onWidgetAdded();
      onOpenChange(false);
      toast({ title: 'Widget added successfully' });
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : 'Failed to add widget';
      toast({ title: 'Error', description, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {type} Widget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={`${type} widget`} />
          </div>

          {type === 'switch' && (
            <div className="space-y-2">
              <Label>Override Mode</Label>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Use dashboard override only</p>
                  <p className="text-xs text-muted-foreground">Disable GPIO control and only send software toggles.</p>
                </div>
                <Toggle checked={overrideMode} onCheckedChange={setOverrideMode} />
              </div>
            </div>
          )}

          {type === 'gauge' && (
            <div className="space-y-2">
              <Label>Sensor Type</Label>
              <Select value={gaugeType} onValueChange={(value) => setGaugeType(value as GaugeType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sensor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analog">Analog</SelectItem>
                  <SelectItem value="pir">PIR</SelectItem>
                  <SelectItem value="ds18b20">DS18B20</SelectItem>
                  <SelectItem value="ultrasonic">Ultrasonic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(type !== 'switch' || !overrideMode) && type !== 'alert' && (
            <div className="space-y-2">
              <Label>{type === 'gauge' && gaugeType === 'ultrasonic' ? 'Trig GPIO Pin' : 'GPIO Pin'}</Label>
              <Select
                value={pin !== undefined ? String(pin) : undefined}
                onValueChange={(value) => setPin(parseInt(value, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pin" />
                </SelectTrigger>
                <SelectContent>
                  {pinOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
                      GPIO {option.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'gauge' && gaugeType === 'ultrasonic' && (
            <div className="space-y-2">
              <Label>Echo GPIO Pin</Label>
              <Select
                value={echoPin !== undefined ? String(echoPin) : undefined}
                onValueChange={(value) => setEchoPin(parseInt(value, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select echo pin" />
                </SelectTrigger>
                <SelectContent>
                  {echoPinOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
                      GPIO {option.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'gauge' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Min Value</Label>
                <Input type="number" value={minValue} onChange={(event) => setMinValue(event.target.value)} step="any" />
              </div>
              <div className="space-y-2">
                <Label>Max Value</Label>
                <Input type="number" value={maxValue} onChange={(event) => setMaxValue(event.target.value)} step="any" />
              </div>
            </div>
          )}

          {type === 'alert' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Trigger Edge</Label>
                <Select value={triggerEdge} onValueChange={(value) => setTriggerEdge(value as TriggerEdge)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rising">Rising</SelectItem>
                    <SelectItem value="falling">Falling</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Alert message" />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full">
            Add Widget
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
