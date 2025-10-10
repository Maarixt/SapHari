import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDevices } from '@/hooks/useDevices';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Settings, 
  Bell, 
  Code,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { AlertsStore } from '@/state/alertsStore';
import { SnippetBus } from '@/features/snippets/snippetBus';
import { AlertRule } from '@/state/alertsTypes';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';

interface AlertRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AlertRuleDialog = ({ open, onOpenChange }: AlertRuleDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { devices } = useDevices();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');

  // Form state for creating/editing rules
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleEnabled, setRuleEnabled] = useState(true);
  const [deviceId, setDeviceId] = useState('');
  const [source, setSource] = useState<'GPIO' | 'SENSOR' | 'LOGIC'>('GPIO');
  const [pin, setPin] = useState<number | undefined>(undefined);
  const [whenPinEquals, setWhenPinEquals] = useState<0 | 1>(1);
  const [key, setKey] = useState('');
  const [op, setOp] = useState<'>' | '>=' | '<' | '<=' | '==' | '!='>('>');
  const [value, setValue] = useState<number | string>('');
  const [debounceMs, setDebounceMs] = useState(0);
  const [hysteresis, setHysteresis] = useState(0);
  const [once, setOnce] = useState(false);

  // Load alert rules from local store
  const loadRules = async () => {
    setLoading(true);
    try {
      // Load rules from AlertsStore
      const localRules = AlertsStore.listRules();
      setRules(localRules);
    } catch (error) {
      console.error('Error loading alert rules:', error);
      toast({
        title: "Error",
        description: "Failed to load alert rules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Save alert rule to local store
  const saveRule = async () => {
    if (!ruleName.trim()) {
      toast({
        title: "Error",
        description: "Rule name is required",
        variant: "destructive"
      });
      return;
    }

    if (!deviceId.trim()) {
      toast({
        title: "Error",
        description: "Device ID is required",
        variant: "destructive"
      });
      return;
    }

    if (source === 'GPIO' && pin === undefined) {
      toast({
        title: "Error",
        description: "Pin number is required for GPIO rules",
        variant: "destructive"
      });
      return;
    }

    if (source !== 'GPIO' && !key.trim()) {
      toast({
        title: "Error",
        description: "Key is required for sensor/logic rules",
        variant: "destructive"
      });
      return;
    }

    try {
      const ruleData: AlertRule = {
        id: editingRule?.id || crypto.randomUUID(),
        name: ruleName.trim(),
        deviceId: deviceId.trim(),
        source: source,
        pin: source === 'GPIO' ? pin : undefined,
        whenPinEquals: source === 'GPIO' ? whenPinEquals : undefined,
        key: source !== 'GPIO' ? key.trim() : undefined,
        op: source !== 'GPIO' ? op : undefined,
        value: source !== 'GPIO' ? value : undefined,
        debounceMs: debounceMs,
        hysteresis: hysteresis,
        once: once,
        isActive: ruleEnabled
      };

      if (editingRule) {
        // Update existing rule
        AlertsStore.updateRule(ruleData);
        toast({
          title: "Success",
          description: "Alert rule updated successfully"
        });
      } else {
        // Create new rule
        AlertsStore.updateRule(ruleData);
        toast({
          title: "Success",
          description: "Alert rule created successfully"
        });
      }

      await loadRules();
      resetForm();
      setActiveTab('rules');
    } catch (error) {
      console.error('Error saving alert rule:', error);
      toast({
        title: "Error",
        description: "Failed to save alert rule",
        variant: "destructive"
      });
    }
  };

  // Delete alert rule from local store
  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;

    try {
      AlertsStore.deleteRule(ruleId);
      await loadRules();
      toast({
        title: "Success",
        description: "Alert rule deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete alert rule",
        variant: "destructive"
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleDescription('');
    setRuleEnabled(true);
    setDeviceId('');
    setSource('GPIO');
    setPin(undefined);
    setWhenPinEquals(1);
    setKey('');
    setOp('>');
    setValue('');
    setDebounceMs(0);
    setHysteresis(0);
    setOnce(false);
  };

  // Edit rule
  const editRule = (rule: AlertRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleDescription(''); // No description field in the simple type
    setRuleEnabled(rule.isActive ?? true);
    setDeviceId(rule.deviceId);
    setSource(rule.source);
    setPin(rule.pin);
    setWhenPinEquals(rule.whenPinEquals ?? 1);
    setKey(rule.key || '');
    setOp(rule.op || '>');
    setValue(rule.value || '');
    setDebounceMs(rule.debounceMs || 0);
    setHysteresis(rule.hysteresis || 0);
    setOnce(rule.once || false);
    setActiveTab('create-edit');
  };


  // Test rule (emit snippet)
  const testRule = (rule: any) => {
    const snippet = `// SapHari Alert Rule Test
// Rule: ${rule.name}
// Device: ${rule.deviceId}
// Source: ${rule.source}
// Generated: ${new Date().toISOString()}`;
    
    SnippetBus.emitSnippet(snippet, { 
      type: 'alert', 
      ruleId: rule.id, 
      ruleName: rule.name,
      test: true
    });
    
    toast({
      title: "Test snippet emitted",
      description: "Check the snippet stream for the generated code"
    });
  };

  // Test alert bell (add sample alert)
  const testAlertBell = () => {
    // Create a test alert entry and push to history
    const testAlert = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: "test_rule",
      ruleName: "Test Alert Rule",
      deviceId: "ESP32_001",
      value: "GPIO 2 > 0",
      severity: 'warning',
      channels: ['app', 'toast', 'browser'],
      ts: Date.now(),
      seen: false,
      ack: false
    };
    
    AlertsStore.pushHistory(testAlert);
    toast({
      title: "Test alert added",
      description: "Check the bell icon in the header for the new alert"
    });
  };

  useEffect(() => {
    if (open) {
      loadRules();
    }
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Alert Rules</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="edit">Create/Edit</TabsTrigger>
            <TabsTrigger value="test">Test</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Alert Rules</h3>
              <Button onClick={() => setActiveTab('edit')}>
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </div>

            <ScrollArea className="h-96">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              ) : rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No alert rules configured</p>
                  <p className="text-sm mt-1">Create your first alert rule to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <Card key={rule.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{rule.name}</CardTitle>
                            <Badge variant={rule.isActive ? "default" : "secondary"}>
                              {rule.isActive ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => testRule(rule)}
                            >
                              <Code className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editRule(rule)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="text-sm">
                            <strong>Device:</strong> {rule.deviceId}
                          </div>
                          <div className="text-sm">
                            <strong>Source:</strong> {rule.source}
                          </div>
                          {rule.source === 'GPIO' && (
                            <div className="text-sm">
                              <strong>Pin:</strong> {rule.pin} = {rule.whenPinEquals}
                            </div>
                          )}
                          {rule.source !== 'GPIO' && (
                            <div className="text-sm">
                              <strong>Condition:</strong> {rule.key} {rule.op} {rule.value}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="edit" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="Enter rule name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={ruleEnabled}
                      onCheckedChange={setRuleEnabled}
                    />
                    <span className="text-sm">{ruleEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Device ID</Label>
                  <Input
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    placeholder="Enter device ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={source} onValueChange={(value: any) => setSource(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GPIO">GPIO</SelectItem>
                      <SelectItem value="SENSOR">Sensor</SelectItem>
                      <SelectItem value="LOGIC">Logic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {source === 'GPIO' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pin Number</Label>
                    <Input
                      type="number"
                      value={pin || ''}
                      onChange={(e) => setPin(parseInt(e.target.value))}
                      placeholder="Enter pin number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>When Pin Equals</Label>
                    <Select value={String(whenPinEquals)} onValueChange={(value) => setWhenPinEquals(Number(value) as 0 | 1)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">LOW (0)</SelectItem>
                        <SelectItem value="1">HIGH (1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {source !== 'GPIO' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Key/Metric</Label>
                    <Input
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      placeholder="e.g., tempC, waterLevelPct"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Operator</Label>
                    <Select value={op} onValueChange={(value: any) => setOp(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">&gt;</SelectItem>
                        <SelectItem value="<">&lt;</SelectItem>
                        <SelectItem value="=">=</SelectItem>
                        <SelectItem value="!=">!=</SelectItem>
                        <SelectItem value=">=">&gt;=</SelectItem>
                        <SelectItem value="<=">&lt;=</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="Threshold value"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Debounce (ms)</Label>
                  <Input
                    type="number"
                    value={debounceMs}
                    onChange={(e) => setDebounceMs(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hysteresis</Label>
                  <Input
                    type="number"
                    value={hysteresis}
                    onChange={(e) => setHysteresis(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fire Once Until Ack</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={once}
                      onCheckedChange={setOnce}
                    />
                    <span className="text-sm">{once ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <Code className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">Test Alert Rules</p>
            <p className="text-xs mt-1">
                Test your alert rules by emitting code snippets to the snippet stream.
            </p>
          </div>

            <div className="space-y-3">
          <Button
                onClick={testAlertBell}
                variant="outline"
            className="w-full"
          >
                <Bell className="h-4 w-4 mr-2" />
                Test Alert Bell
          </Button>
              <p className="text-xs text-muted-foreground text-center">
                This will add a sample alert to test the bell icon functionality
              </p>
        </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationSettings />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {activeTab === 'edit' && (
            <>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={saveRule}>
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </>
          )}
          {activeTab !== 'edit' && (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};