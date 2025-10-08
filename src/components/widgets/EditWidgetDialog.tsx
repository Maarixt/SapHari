import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Widget } from '@/lib/types';

type GaugeType = 'analog' | 'pir' | 'ds18b20' | 'ultrasonic';
type TriggerLevel = 'high' | 'low';

const DIGITAL_PINS = [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33];
const ANALOG_PINS = [32, 33, 34, 35, 36, 39];

const GAUGE_DEFAULTS: Record<GaugeType, { min: number; max: number }> = {
  analog: { min: 0, max: 4095 },
  pir: { min: 0, max: 1 },
  ds18b20: { min: -40, max: 125 },
  ultrasonic: { min: 0, max: 400 },
};

interface EditWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: Widget;
  allWidgets: Widget[];
  onUpdate: (updates: Partial<Widget>) => void;
}

const buildUsedPinSet = (widgets: Widget[], currentWidgetId: string) => {
  const used = new Set<number>();
  widgets.forEach((item) => {
    if (item.id === currentWidgetId) return;
    if (item.pin !== null && item.pin !== undefined) {
      used.add(item.pin);
    }
    if (item.echo_pin !== null && item.echo_pin !== undefined) {
      used.add(item.echo_pin);
    }
  });
  return used;
};

export const EditWidgetDialog = ({ open, onOpenChange, widget, allWidgets, onUpdate }: EditWidgetDialogProps) => {
  const { toast } = useToast();
  const [label, setLabel] = useState(widget.label);
  const [overrideMode, setOverrideMode] = useState(Boolean(widget.override_mode));
  const [gaugeType, setGaugeType] = useState<GaugeType>((widget.gauge_type as GaugeType) || 'analog');
  const [pin, setPin] = useState<number | undefined>(widget.pin ?? undefined);
  const [echoPin, setEchoPin] = useState<number | undefined>(widget.echo_pin ?? undefined);
  const [minValue, setMinValue] = useState<string>(
    widget.min_value !== null && widget.min_value !== undefined
      ? String(widget.min_value)
      : String(GAUGE_DEFAULTS[gaugeType].min)
  );
  const [maxValue, setMaxValue] = useState<string>(
    widget.max_value !== null && widget.max_value !== undefined
      ? String(widget.max_value)
      : String(GAUGE_DEFAULTS[gaugeType].max)
  );
  const [triggerLevel, setTriggerLevel] = useState<TriggerLevel>(widget.trigger === 0 ? 'low' : 'high');
  const [message, setMessage] = useState(widget.message || '');

  const usedPins = useMemo(() => buildUsedPinSet(allWidgets, widget.id), [allWidgets, widget.id]);
  const previousGaugeType = useRef<GaugeType | null>(null);

  useEffect(() => {
    if (!open) return;

    const initialGaugeType = (widget.gauge_type as GaugeType) || 'analog';
    setLabel(widget.label);
    setOverrideMode(Boolean(widget.override_mode));
    setGaugeType(initialGaugeType);
    setPin(widget.pin ?? undefined);
    setEchoPin(widget.echo_pin ?? undefined);
    setMinValue(
      widget.min_value !== null && widget.min_value !== undefined
        ? String(widget.min_value)
        : String(GAUGE_DEFAULTS[initialGaugeType].min)
    );
    setMaxValue(
      widget.max_value !== null && widget.max_value !== undefined
        ? String(widget.max_value)
        : String(GAUGE_DEFAULTS[initialGaugeType].max)
    );
    setTriggerLevel(widget.trigger === 0 ? 'low' : 'high');
    setMessage(widget.message || '');
    previousGaugeType.current = initialGaugeType;
  }, [open, widget]);

  useEffect(() => {
    if (!open) return;

    if (widget.type === 'switch' && overrideMode) {
      setPin(undefined);
    }

    if (widget.type === 'gauge') {
      if (gaugeType === 'analog' && pin !== undefined && !ANALOG_PINS.includes(pin)) {
        setPin(undefined);
      }

      if (gaugeType !== 'ultrasonic') {
        setEchoPin(undefined);
      }
    }
  }, [gaugeType, overrideMode, open, pin, widget.type]);

  useEffect(() => {
    if (!open || widget.type !== 'gauge') return;
    if (previousGaugeType.current === null) {
      previousGaugeType.current = gaugeType;
      return;
    }

    if (previousGaugeType.current !== gaugeType) {
      previousGaugeType.current = gaugeType;
      const defaults = GAUGE_DEFAULTS[gaugeType];
      setMinValue(String(defaults.min));
      setMaxValue(String(defaults.max));
    }
  }, [gaugeType, open, widget.type]);

  const pinOptions = useMemo(() => {
    const allowedPins =
      widget.type === 'gauge'
        ? gaugeType === 'analog'
          ? ANALOG_PINS
          : DIGITAL_PINS
        : DIGITAL_PINS;

    const shouldDisable = (gpio: number) => {
      if (widget.type === 'alert') {
        return false;
      }

      return usedPins.has(gpio) && gpio !== pin;
    };

    return allowedPins.map((gpio) => ({
      value: gpio,
      disabled: shouldDisable(gpio),
    }));
  }, [gaugeType, pin, usedPins, widget.type]);

  const echoPinOptions = useMemo(() => {
    if (widget.type !== 'gauge' || gaugeType !== 'ultrasonic') return [];

    return DIGITAL_PINS.map((gpio) => ({
      value: gpio,
      disabled: (usedPins.has(gpio) && gpio !== echoPin) || gpio === pin,
    }));
  }, [echoPin, gaugeType, pin, usedPins, widget.type]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const trimmedLabel = label.trim() || widget.label;
      const updates: Record<string, unknown> = { label: trimmedLabel };
      const localUpdates: Partial<Widget> = { label: trimmedLabel };

      if (widget.type === 'switch') {
        if (!overrideMode && pin === undefined) {
          toast({
            title: 'GPIO pin required',
            description: 'Select a GPIO pin for the switch',
            variant: 'destructive',
          });
          return;
        }

        updates.override_mode = overrideMode;
        updates.pin = overrideMode ? null : pin ?? null;
        localUpdates.override_mode = overrideMode;
        localUpdates.pin = overrideMode ? null : pin ?? null;
      }

      if (widget.type === 'gauge') {
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

        updates.pin = pin;
        updates.echo_pin = gaugeType === 'ultrasonic' ? echoPin ?? null : null;
        updates.gauge_type = gaugeType;
        updates.min_value = min;
        updates.max_value = max;

        localUpdates.pin = pin;
        localUpdates.echo_pin = gaugeType === 'ultrasonic' ? echoPin ?? null : null;
        localUpdates.gauge_type = gaugeType;
        localUpdates.min_value = min;
        localUpdates.max_value = max;
      }

      if (widget.type === 'servo') {
        if (pin === undefined) {
          toast({
            title: 'GPIO pin required',
            description: 'Select a GPIO pin for the servo',
            variant: 'destructive',
          });
          return;
        }

        updates.pin = pin;
        localUpdates.pin = pin;
      }

      if (widget.type === 'alert') {
        if (pin === undefined) {
          toast({
            title: 'GPIO pin required',
            description: 'Select a GPIO pin for the alert trigger',
            variant: 'destructive',
          });
          return;
        }

        updates.pin = pin;
        // Store alert-specific data in the state since trigger and message columns don't exist in DB
        updates.state = {
          ...widget.state,
          trigger: triggerLevel === 'high' ? 1 : 0,
          message: message
        };

        localUpdates.pin = pin;
        localUpdates.state = updates.state;
      }

      const { error } = await supabase.from('widgets').update(updates).eq('id', widget.id);
      if (error) throw error;

      onUpdate(localUpdates);
      onOpenChange(false);
      toast({ title: 'Widget updated' });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update widget',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Widget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={label} onChange={(event) => setLabel(event.target.value)} />
          </div>

          {widget.type === 'switch' && (
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

          {widget.type !== 'alert' && widget.type !== 'switch' && widget.type !== 'gauge' && (
            <div className="space-y-2">
              <Label>GPIO Pin</Label>
              <Select value={pin !== undefined ? String(pin) : undefined} onValueChange={(value) => setPin(parseInt(value, 10))}>
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

          {widget.type === 'switch' && !overrideMode && (
            <div className="space-y-2">
              <Label>GPIO Pin</Label>
              <Select value={pin !== undefined ? String(pin) : undefined} onValueChange={(value) => setPin(parseInt(value, 10))}>
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

          {widget.type === 'gauge' && (
            <>
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

              <div className="space-y-2">
                <Label>{gaugeType === 'ultrasonic' ? 'Trig GPIO Pin' : 'GPIO Pin'}</Label>
                <Select value={pin !== undefined ? String(pin) : undefined} onValueChange={(value) => setPin(parseInt(value, 10))}>
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

              {gaugeType === 'ultrasonic' && (
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
            </>
          )}

          {widget.type === 'alert' && (
            <>
              <div className="space-y-2">
                <Label>GPIO Pin</Label>
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

              <div className="space-y-2">
                <Label>Trigger Level</Label>
                <Select value={triggerLevel} onValueChange={(value) => setTriggerLevel(value as TriggerLevel)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Input value={message} onChange={(event) => setMessage(event.target.value)} />
              </div>
            </>
          )}

          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
