import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SWITCH_PINS = [2,4,5,12,13,14,15,16,17,18,19,21,22,23,25,26,27,32,33];
const ANALOG_PINS = [32,33,34,35,36,39];

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
      const widgetData: any = {
        device_id: device.id,
        type,
        label: label || `${type} widget`,
        address: getNextAddress(),
      };

      if (type === 'switch') {
        widgetData.pin = overrideMode ? null : pin;
        widgetData.override_mode = overrideMode;
        widgetData.state = { value: 0 };
      }

      if (type === 'gauge') {
        widgetData.pin = pin;
        widgetData.state = { value: 0 };
        widgetData.gauge_type = gaugeType;
        widgetData.min_value = 0;
        widgetData.max_value = gaugeType === 'analog' ? 4095 : 100;
      }

      if (type === 'servo') {
        widgetData.pin = pin;
        widgetData.state = { angle: 90 };
      }

      if (type === 'alert') {
        widgetData.pin = pin;
        widgetData.trigger = parseInt(trigger);
        widgetData.message = message;
      }

      const { error } = await supabase.from('widgets').insert(widgetData);
      if (error) throw error;

      onWidgetAdded();
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
              <Select onValueChange={(v) => setOverrideMode(v === 'true')}>
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
              <Select onValueChange={setGaugeType} defaultValue="analog">
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
              <Select onValueChange={(v) => setPin(parseInt(v))}>
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
                <Select onValueChange={(v) => setPin(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pin" />
                  </SelectTrigger>
                  <SelectContent>
                    {SWITCH_PINS.map(p => (
                      <SelectItem key={p} value={p.toString()}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trigger</Label>
                <Select onValueChange={setTrigger} defaultValue="1">
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