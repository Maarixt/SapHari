import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SWITCH_PINS = [2,4,5,12,13,14,15,16,17,18,19,21,22,23,25,26,27,32,33];
const ANALOG_PINS = [32,33,34,35,36,39];
const ALL_PINS = Array.from({ length: 40 }, (_, i) => i);

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: any;
  type: 'switch' | 'gauge' | 'servo' | 'alert';
  existingWidgets: any[];
  onWidgetAdded: () => void;
}

export const AddWidgetDialog = ({ open, onOpenChange, device, type, existingWidgets, onWidgetAdded }: AddWidgetDialogProps) => {
  const { toast } = useToast();
  const [label, setLabel] = useState('');
  const [pin, setPin] = useState<number | undefined>();
  const [gaugeType, setGaugeType] = useState('analog');
  const [overrideMode, setOverrideMode] = useState(false);
  const [trigger, setTrigger] = useState('1');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;

    setLabel('');
    setPin(undefined);
    setGaugeType('analog');
    setOverrideMode(false);
    setTrigger('1');
    setMessage('');
  }, [open, type]);

  useEffect(() => {
    if (!open || type !== 'gauge') return;
    setPin(undefined);
  }, [gaugeType, open, type]);

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

      if (pinRequired && pin === undefined && type !== 'switch') {
        toast({ title: "GPIO pin required", description: "Select a GPIO pin before creating the widget", variant: "destructive" });
        return;
      }

      const widgetData: any = {
        device_id: device.id,
        type,
        label: label || `${type} widget`,
        address: getNextAddress(),
      };

      if (type === 'switch') {
        if (!overrideMode && pin === undefined) {
          toast({ title: "GPIO pin required", description: "Select a GPIO pin for the switch", variant: "destructive" });
          return;
        }
        widgetData.pin = overrideMode ? null : pin;
        widgetData.override_mode = overrideMode;
        widgetData.state = { value: 0 };
      }

      if (type === 'gauge') {
        widgetData.pin = pin;
        widgetData.state = { value: 0 };
        widgetData.gauge_type = gaugeType;

        if (gaugeType === 'pir') {
          widgetData.min_value = 0;
          widgetData.max_value = 1;
        } else if (gaugeType === 'ds18b20') {
          widgetData.min_value = -40;
          widgetData.max_value = 125;
        } else if (gaugeType === 'ultrasonic') {
          widgetData.min_value = 0;
          widgetData.max_value = 400;
        } else {
          widgetData.min_value = 0;
          widgetData.max_value = 4095;
        }
      }

      if (type === 'servo') {
        widgetData.pin = pin;
        widgetData.state = { angle: 90 };
      }

      if (type === 'alert') {
        widgetData.pin = pin;
        widgetData.trigger = parseInt(trigger);
        widgetData.message = message;
        widgetData.state = { triggered: false, lastTrigger: null };
      }

      const { error } = await supabase.from('widgets').insert(widgetData);
      if (error) throw error;

      onWidgetAdded();
      onOpenChange(false);
      toast({ title: "Widget added successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
              <Select value={gaugeType} onValueChange={setGaugeType}>
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

          {(type !== 'switch' || !overrideMode) && type !== 'alert' ? (
            <div>
              <Label>GPIO Pin</Label>
              <Select value={pin !== undefined ? String(pin) : undefined} onValueChange={(v) => setPin(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pin" />
                </SelectTrigger>
                <SelectContent>
                  {(type === 'gauge' && gaugeType === 'analog' ? ANALOG_PINS : SWITCH_PINS).map(p => (
                    <SelectItem key={p} value={p.toString()}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {type === 'alert' && (
            <>
              <div>
                <Label>GPIO Pin</Label>
                <Select value={pin !== undefined ? String(pin) : undefined} onValueChange={(v) => setPin(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pin" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_PINS.map(p => (
                      <SelectItem key={p} value={p.toString()}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trigger</Label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">HIGH</SelectItem>
                    <SelectItem value="0">LOW</SelectItem>
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