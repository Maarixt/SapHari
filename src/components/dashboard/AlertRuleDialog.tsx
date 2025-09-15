import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Device {
  id: string;
  name: string;
}

interface AlertRule {
  id: string;
  device_id: string;
  pin: string;
  trigger_state: string;
  message: string;
  channel: string;
}

interface AlertRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AlertRuleDialog = ({ open, onOpenChange }: AlertRuleDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [pin, setPin] = useState('');
  const [triggerState, setTriggerState] = useState('HIGH');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('email');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      loadDevices();
      loadRules();
    }
  }, [open, user]);

  const loadDevices = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('devices')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');
    if (!error) setDevices(data || []);
  };

  const loadRules = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error) setRules(data || []);
  };

  const resetForm = () => {
    setDeviceId('');
    setPin('');
    setTriggerState('HIGH');
    setMessage('');
    setChannel('email');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const ruleData = {
      user_id: user.id,
      device_id: deviceId,
      pin,
      trigger_state: triggerState,
      message,
      channel,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('alert_rules')
          .update(ruleData)
          .eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Rule updated' });
      } else {
        const { error } = await supabase
          .from('alert_rules')
          .insert(ruleData);
        if (error) throw error;
        toast({ title: 'Rule added' });
      }
      resetForm();
      loadRules();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (rule: AlertRule) => {
    setDeviceId(rule.device_id);
    setPin(rule.pin);
    setTriggerState(rule.trigger_state);
    setMessage(rule.message);
    setChannel(rule.channel);
    setEditingId(rule.id);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alert_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Rule deleted' });
      loadRules();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getDeviceName = (id: string) => devices.find(d => d.id === id)?.name || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Alert Rules</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Device</Label>
            <Select value={deviceId} onValueChange={setDeviceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pin or Address</Label>
            <Input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="e.g. D1 or S1" />
          </div>
          <div>
            <Label>Trigger State</Label>
            <Select value={triggerState} onValueChange={setTriggerState}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Message</Label>
            <Input value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div>
            <Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="in-app">In App</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">{editingId ? 'Update' : 'Add'} Rule</Button>
          </DialogFooter>
        </form>

        <div className="mt-6">
          <h3 className="font-semibold mb-2">Existing Rules</h3>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules yet</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="border rounded p-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{getDeviceName(rule.device_id)} - {rule.pin} {rule.trigger_state}</p>
                    <p className="text-sm text-muted-foreground">{rule.message} ({rule.channel})</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(rule)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(rule.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

