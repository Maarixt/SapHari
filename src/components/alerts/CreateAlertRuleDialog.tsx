import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { useAlertRules, CreateAlertRuleInput } from '@/hooks/useAlertRules';
import { useDevices } from '@/hooks/useDevices';
import { toast } from 'sonner';

interface CreateAlertRuleDialogProps {
  trigger?: React.ReactNode;
}

export function CreateAlertRuleDialog({ trigger }: CreateAlertRuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { createRule } = useAlertRules();
  const { devices } = useDevices();

  const [form, setForm] = useState<CreateAlertRuleInput>({
    name: '',
    device_id: '',
    source: 'GPIO',
    condition: 'equals',
    expected_value: '1',
    message_template: '',
    severity: 'info',
    cooldown_seconds: 30,
    enabled: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.device_id || !form.message_template) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (form.source === 'GPIO' && form.pin === undefined) {
      toast.error('Please specify a GPIO pin');
      return;
    }

    if (form.source === 'SENSOR' && !form.sensor_key) {
      toast.error('Please specify a sensor key');
      return;
    }

    try {
      setLoading(true);
      await createRule(form);
      setOpen(false);
      setForm({
        name: '',
        device_id: '',
        source: 'GPIO',
        condition: 'equals',
        expected_value: '1',
        message_template: '',
        severity: 'info',
        cooldown_seconds: 30,
        enabled: true
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Alert Rule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Alert Rule</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Kitchen Light Alert"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="device">Device *</Label>
            <Select
              value={form.device_id}
              onValueChange={value => setForm({ ...form, device_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map(device => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name} ({device.device_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source Type</Label>
            <Select
              value={form.source}
              onValueChange={value => setForm({ ...form, source: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GPIO">GPIO Pin</SelectItem>
                <SelectItem value="SENSOR">Sensor Value</SelectItem>
                <SelectItem value="ONLINE">Online/Offline Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.source === 'GPIO' && (
            <div className="space-y-2">
              <Label htmlFor="pin">GPIO Pin *</Label>
              <Input
                id="pin"
                type="number"
                placeholder="e.g., 2"
                value={form.pin ?? ''}
                onChange={e => setForm({ ...form, pin: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          )}

          {form.source === 'SENSOR' && (
            <div className="space-y-2">
              <Label htmlFor="sensor_key">Sensor Key *</Label>
              <Input
                id="sensor_key"
                placeholder="e.g., temperature, humidity"
                value={form.sensor_key ?? ''}
                onChange={e => setForm({ ...form, sensor_key: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={form.condition}
                onValueChange={value => setForm({ ...form, condition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="not_equals">Not Equals</SelectItem>
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                  <SelectItem value="less_than">Less Than</SelectItem>
                  <SelectItem value="rising">Rising Edge (0→1)</SelectItem>
                  <SelectItem value="falling">Falling Edge (1→0)</SelectItem>
                  <SelectItem value="changes">Any Change</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_value">Expected Value</Label>
              <Input
                id="expected_value"
                placeholder={form.source === 'ONLINE' ? 'online or offline' : 'e.g., 1'}
                value={form.expected_value ?? ''}
                onChange={e => setForm({ ...form, expected_value: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message_template">Alert Message *</Label>
            <Textarea
              id="message_template"
              placeholder="e.g., Kitchen light turned ON"
              value={form.message_template}
              onChange={e => setForm({ ...form, message_template: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Variables: {'{{value}}'}, {'{{pin}}'}, {'{{device}}'}, {'{{timestamp}}'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={form.severity}
                onValueChange={value => setForm({ ...form, severity: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooldown">Cooldown (seconds)</Label>
              <Input
                id="cooldown"
                type="number"
                min={0}
                value={form.cooldown_seconds}
                onChange={e => setForm({ ...form, cooldown_seconds: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="enabled"
              checked={form.enabled}
              onCheckedChange={checked => setForm({ ...form, enabled: checked })}
            />
            <Label htmlFor="enabled">Enabled</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
