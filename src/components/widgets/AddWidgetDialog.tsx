import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Device, Widget } from '@/lib/types';

const DIGITAL_PINS = [2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33];
const ANALOG_PINS = [32, 33, 34, 35, 36, 39];

type GaugeSensorType = 'analog' | 'pir' | 'ds18b20' | 'ultrasonic';

const GAUGE_DEFAULTS: Record<GaugeSensorType, { min: number; max: number }> = {
  analog: { min: 0, max: 4095 },
  pir: { min: 0, max: 1 },
  ds18b20: { min: -40, max: 125 },
  ultrasonic: { min: 0, max: 400 }
};

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  type: Widget['type'];
  existingWidgets: Widget[];
  onWidgetAdded: () => void;
}

export const AddWidgetDialog = ({ open, onOpenChange, device, type, existingWidgets, onWidgetAdded }: AddWidgetDialogProps) => {
  const { toast } = useToast();
  const [label, setLabel] = useState('');
  const [pin, setPin] = useState<number | undefined>();
  const [echoPin, setEchoPin] = useState<number | undefined>();
  const [gaugeType, setGaugeType] = useState<GaugeSensorType>('analog');
  const [overrideMode, setOverrideMode] = useState(false);
  const [trigger, setTrigger] = useState<'rising' | 'falling'>('rising');
  const [message, setMessage] = useState('');
  const [minValue, setMinValue] = useState<string>(String(GAUGE_DEFAULTS.analog.min));
  const [maxValue, setMaxValue] = useState<string>(String(GAUGE_DEFAULTS.analog.max));

  const usedPins = useMemo(() => {
    const pins = new Set<number>();
    for (const widget of existingWidgets) {
      if (typeof widget.pin === 'number') {
        pins.add(widget.pin);
      }
      if (typeof widget.echo_pin === 'number') {
        pins.add(widget.echo_pin);
      }
    }
    return pins;
  }, [existingWidgets]);

  useEffect(() => {
    if (!open) return;

    setLabel('');
    setPin(undefined);
    setEchoPin(undefined);
    setGaugeType('analog');
    setOverrideMode(false);
    setTrigger('rising');
    setMessage('');
    setMinValue(String(GAUGE_DEFAULTS.analog.min));
    setMaxValue(String(GAUGE_DEFAULTS.analog.max));
  }, [open, type]);

  useEffect(() => {
    if (!open || type !== 'gauge') return;
    setPin(undefined);
    setEchoPin(undefined);
    const defaults = GAUGE_DEFAULTS[gaugeType];
    setMinValue(String(defaults.min));
    setMaxValue(String(defaults.max));
  }, [gaugeType, open, type]);

  useEffect(() => {
    if (!open || type !== 'switch') return;
    if (overrideMode) {
      setPin(undefined);
    }
  }, [overrideMode, open, type]);

  const isPinUnavailable = (candidate: number, extraDisabled?: (candidate: number) => boolean) =>
    usedPins.has(candidate) || (extraDisabled ? extraDisabled(candidate) : false);

  const areAllPinsUnavailable = (pins: number[], extraDisabled?: (candidate: number) => boolean) =>
    pins.length === 0 || pins.every((candidate) => isPinUnavailable(candidate, extraDisabled));

  const renderPinItems = (pins: number[], extraDisabled?: (candidate: number) => boolean) =>
    pins.length === 0
      ? [
          <SelectItem key="no-pins" value="unavailable" disabled>
            No available pins
          </SelectItem>
        ]
      : pins.map((p) => {
          const disabled = isPinUnavailable(p, extraDisabled);
          return (
            <SelectItem key={p} value={p.toString()} disabled={disabled}>
              GPIO {p}
              {disabled && ' (in use)'}
            </SelectItem>
          );
        });

  const gaugePinPool = gaugeType === 'analog' ? ANALOG_PINS : DIGITAL_PINS;
  const gaugePinConflictCheck = gaugeType === 'ultrasonic' ? (candidate: number) => echoPin === candidate : undefined;
  const gaugePinsUnavailable =
    type === 'gauge' ? areAllPinsUnavailable(gaugePinPool, gaugePinConflictCheck) : false;
  const switchPinsUnavailable = type === 'switch' ? areAllPinsUnavailable(DIGITAL_PINS) : false;
  const servoPinsUnavailable = type === 'servo' ? areAllPinsUnavailable(DIGITAL_PINS) : false;
  const alertPinsUnavailable = type === 'alert' ? areAllPinsUnavailable(DIGITAL_PINS) : false;
  const echoPinsUnavailable =
    type === 'gauge' && gaugeType === 'ultrasonic'
      ? areAllPinsUnavailable(DIGITAL_PINS, (candidate) => pin === candidate)
      : false;
  const showPrimaryPinSelect =
    (type !== 'switch' || !overrideMode) && (type === 'switch' || type === 'gauge' || type === 'servo');
  const primaryPinPool = type === 'gauge' ? gaugePinPool : DIGITAL_PINS;
  const primaryConflictCheck = type === 'gauge' ? gaugePinConflictCheck : undefined;
  const primaryPinsUnavailable =
    type === 'gauge'
      ? gaugePinsUnavailable
      : type === 'switch'
      ? switchPinsUnavailable
      : type === 'servo'
      ? servoPinsUnavailable
      : false;

  const getNextAddress = () => {
    const prefix =
      type === 'switch'
        ? 'S'
        : type === 'gauge'
        ? 'G'
        : type === 'servo'
        ? 'SS'
        : 'A';
    const existing = existingWidgets.filter(w => w.type === type).map(w => w.address);
    let n = 1;
    while (existing.includes(prefix + n)) n++;
    return prefix + n;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const pinRequired =
        (type === 'switch' && !overrideMode) ||
        type === 'gauge' ||
        type === 'servo' ||
        type === 'alert';

      if (pinRequired && pin === undefined && !(type === 'switch' && overrideMode)) {
        const noPinsAvailable =
          (type === 'alert' && alertPinsUnavailable) ||
          (type === 'gauge' && primaryPinsUnavailable) ||
          (type === 'servo' && primaryPinsUnavailable) ||
          (type === 'switch' && primaryPinsUnavailable);

        toast({
          title: noPinsAvailable ? "No GPIO pins available" : "GPIO pin required",
          description: noPinsAvailable
            ? "All supported pins for this widget type are already assigned to other widgets"
            : "Select a GPIO pin before creating the widget",
          variant: "destructive"
        });
        return;
      }

      if (type === 'gauge' && gaugeType === 'ultrasonic') {
        if (echoPin === undefined) {
          toast({
            title: echoPinsUnavailable ? "No echo pins available" : "Echo pin required",
            description: echoPinsUnavailable
              ? "All supported pins for ultrasonic echo are already assigned"
              : "Ultrasonic sensors need both trigger and echo pins",
            variant: "destructive"
          });
          return;
        }

        if (pin === echoPin) {
          toast({ title: "Pins must differ", description: "Select different GPIOs for trigger and echo", variant: "destructive" });
          return;
        }
      }

      const widgetData: Record<string, unknown> = {
        device_id: device.id,
        type,
        label: label || `${type} widget`,
        address: getNextAddress(),
      };

      if (type === 'switch') {
        if (!overrideMode && pin === undefined) {
          toast({
            title: primaryPinsUnavailable ? "No GPIO pins available" : "GPIO pin required",
            description: primaryPinsUnavailable
              ? "All supported pins for switches are already assigned"
              : "Select a GPIO pin for the switch",
            variant: "destructive"
          });
          return;
        }
        widgetData.pin = overrideMode ? null : pin;
        widgetData.override_mode = overrideMode;
        widgetData.state = { value: 0 };
      }

      if (type === 'gauge') {
        const minVal = parseFloat(minValue);
        const maxVal = parseFloat(maxValue);

        if (Number.isNaN(minVal) || Number.isNaN(maxVal)) {
          toast({ title: "Invalid range", description: "Enter numeric min/max values", variant: "destructive" });
          return;
        }

        if (minVal >= maxVal) {
          toast({ title: "Invalid range", description: "Min value must be less than max value", variant: "destructive" });
          return;
        }

        widgetData.pin = pin;
        widgetData.echo_pin = gaugeType === 'ultrasonic' ? echoPin : null;
        widgetData.state = { value: 0 };
        widgetData.gauge_type = gaugeType;
        widgetData.min_value = minVal;
        widgetData.max_value = maxVal;
      }

      if (type === 'servo') {
        widgetData.pin = pin;
        widgetData.state = { angle: 90 };
      }

      if (type === 'alert') {
        widgetData.pin = pin;
        widgetData.trigger = trigger === 'rising' ? 1 : 0;
        widgetData.message = message.trim();
        widgetData.state = { triggered: false, lastTrigger: null };
      }

      const { error } = await supabase.from('widgets').insert(widgetData);
      if (error) throw error;

      onWidgetAdded();
      onOpenChange(false);
      toast({ title: "Widget added successfully" });
    } catch (error: unknown) {
      console.error('Error adding widget:', error);
      const description = error instanceof Error ? error.message : 'Failed to add widget';
      toast({ title: "Error", description, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {type} Widget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`${type} widget`} />
          </div>
          
          {type === 'switch' && (
            <div>
              <Label>Override Mode</Label>
              <Select value={overrideMode ? 'true' : 'false'} onValueChange={(v) => setOverrideMode(v === 'true')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Physical (requires GPIO)</SelectItem>
                  <SelectItem value="true">Override only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'gauge' && (
            <div>
              <Label>Sensor Type</Label>
              <Select value={gaugeType} onValueChange={(value) => setGaugeType(value as GaugeSensorType)}>
                <SelectTrigger>
                  <SelectValue />
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

          {showPrimaryPinSelect && (
            <div>
              <Label>{type === 'gauge' && gaugeType === 'ultrasonic' ? 'Trigger GPIO Pin' : 'GPIO Pin'}</Label>
              <Select
                value={pin !== undefined ? String(pin) : undefined}
                onValueChange={(value) => {
                  const numeric = parseInt(value, 10);
                  if (!Number.isNaN(numeric)) {
                    setPin(numeric);
                  }
                }}
                disabled={primaryPinsUnavailable}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pin" />
                </SelectTrigger>
                <SelectContent>{renderPinItems(primaryPinPool, primaryConflictCheck)}</SelectContent>
              </Select>
              {primaryPinsUnavailable && (
                <p className="mt-1 text-xs text-destructive">All supported GPIO pins are already in use.</p>
              )}
            </div>
          )}

          {type === 'gauge' && gaugeType === 'ultrasonic' && (
            <div>
              <Label>Echo GPIO Pin</Label>
              <Select
                value={echoPin !== undefined ? String(echoPin) : undefined}
                onValueChange={(value) => {
                  const numeric = parseInt(value, 10);
                  if (!Number.isNaN(numeric)) {
                    setEchoPin(numeric);
                  }
                }}
                disabled={echoPinsUnavailable}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select echo pin" />
                </SelectTrigger>
                <SelectContent>
                  {renderPinItems(DIGITAL_PINS, (candidate) => pin === candidate)}
                </SelectContent>
              </Select>
              {echoPinsUnavailable && (
                <p className="mt-1 text-xs text-destructive">All supported GPIO pins are already in use.</p>
              )}
            </div>
          )}

          {type === 'gauge' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Value</Label>
                <Input
                  type="number"
                  value={minValue}
                  onChange={(event) => setMinValue(event.target.value)}
                />
              </div>
              <div>
                <Label>Max Value</Label>
                <Input
                  type="number"
                  value={maxValue}
                  onChange={(event) => setMaxValue(event.target.value)}
                />
              </div>
            </div>
          )}

          {type === 'alert' && (
            <>
              <div>
                <Label>GPIO Pin</Label>
                <Select
                  value={pin !== undefined ? String(pin) : undefined}
                  onValueChange={(value) => {
                    const numeric = parseInt(value, 10);
                    if (!Number.isNaN(numeric)) {
                      setPin(numeric);
                    }
                  }}
                  disabled={alertPinsUnavailable}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pin" />
                  </SelectTrigger>
                  <SelectContent>
                    {renderPinItems(DIGITAL_PINS)}
                  </SelectContent>
                </Select>
                {alertPinsUnavailable && (
                  <p className="mt-1 text-xs text-destructive">All supported GPIO pins are already in use.</p>
                )}
              </div>
              <div>
                <Label>Trigger</Label>
                <Select value={trigger} onValueChange={(value) => setTrigger(value as 'rising' | 'falling')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rising">Rising Edge</SelectItem>
                    <SelectItem value="falling">Falling Edge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Message</Label>
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Alert message" />
              </div>
            </>
          )}

          <Button type="submit">Add Widget</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};