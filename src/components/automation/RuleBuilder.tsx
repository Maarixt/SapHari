// Automation Rule Builder Component
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Save, Play, Pause, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { automationService, AutomationRule, RuleCondition, RuleAction } from '@/services/automationService';
import { useAuth } from '@/hooks/useAuth';
import { Device } from '@/lib/types';

interface RuleBuilderProps {
  trigger?: React.ReactNode;
  devices: Device[];
  onRuleSaved?: (rule: AutomationRule) => void;
  editingRule?: AutomationRule;
}

export function RuleBuilder({ trigger, devices, onRuleSaved, editingRule }: RuleBuilderProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Rule form state
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState(0);
  
  // Condition state
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [conditionLogic, setConditionLogic] = useState<'AND' | 'OR'>('AND');
  
  // Action state
  const [actions, setActions] = useState<RuleAction[]>([]);

  // Initialize form with editing rule
  useEffect(() => {
    if (editingRule) {
      setRuleName(editingRule.name);
      setRuleDescription(editingRule.description || '');
      setSelectedDevice(editingRule.device_id || '');
      setIsActive(editingRule.active);
      setPriority(editingRule.priority);
      
      if (editingRule.condition.type === 'combined') {
        setConditions(editingRule.condition.conditions || []);
        setConditionLogic(editingRule.condition.logic || 'AND');
      } else {
        setConditions([editingRule.condition]);
        setConditionLogic('AND');
      }
      
      if (editingRule.action.type === 'combined') {
        setActions(editingRule.action.actions || []);
      } else {
        setActions([editingRule.action]);
      }
    } else {
      // Reset form for new rule
      setRuleName('');
      setRuleDescription('');
      setSelectedDevice('');
      setIsActive(true);
      setPriority(0);
      setConditions([]);
      setConditionLogic('AND');
      setActions([]);
    }
  }, [editingRule, open]);

  const addCondition = () => {
    const newCondition: RuleCondition = {
      type: 'sensor',
      operator: 'gt',
      field: 'tempC',
      value: 25,
      unit: '°C'
    };
    setConditions([...conditions, newCondition]);
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const updatedConditions = [...conditions];
    updatedConditions[index] = { ...updatedConditions[index], ...updates };
    setConditions(updatedConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = () => {
    const newAction: RuleAction = {
      type: 'notification',
      notification: {
        type: 'info',
        title: 'Rule Triggered',
        message: 'An automation rule has been triggered',
        channels: ['email']
      }
    };
    setActions([...actions, newAction]);
  };

  const updateAction = (index: number, updates: Partial<RuleAction>) => {
    const updatedActions = [...actions];
    updatedActions[index] = { ...updatedActions[index], ...updates };
    setActions(updatedActions);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const buildRuleCondition = (): RuleCondition => {
    if (conditions.length === 0) {
      throw new Error('At least one condition is required');
    }
    
    if (conditions.length === 1) {
      return conditions[0];
    }
    
    return {
      type: 'combined',
      operator: 'eq',
      value: true,
      conditions,
      logic: conditionLogic
    };
  };

  const buildRuleAction = (): RuleAction => {
    if (actions.length === 0) {
      throw new Error('At least one action is required');
    }
    
    if (actions.length === 1) {
      return actions[0];
    }
    
    return {
      type: 'combined',
      actions
    };
  };

  const handleSave = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      if (!ruleName.trim()) {
        throw new Error('Rule name is required');
      }
      
      if (conditions.length === 0) {
        throw new Error('At least one condition is required');
      }
      
      if (actions.length === 0) {
        throw new Error('At least one action is required');
      }

      setLoading(true);

      const ruleData = {
        user_id: user.id,
        device_id: selectedDevice || undefined,
        name: ruleName.trim(),
        description: ruleDescription.trim() || undefined,
        condition: buildRuleCondition(),
        action: buildRuleAction(),
        active: isActive,
        priority
      };

      let savedRule: AutomationRule;
      
      if (editingRule) {
        savedRule = await automationService.updateRule(editingRule.id, ruleData);
        toast.success('Automation rule updated successfully');
      } else {
        savedRule = await automationService.createRule(ruleData);
        toast.success('Automation rule created successfully');
      }

      onRuleSaved?.(savedRule);
      setOpen(false);
      
    } catch (error) {
      console.error('Failed to save rule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  const renderConditionBuilder = (condition: RuleCondition, index: number) => (
    <Card key={index} className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">Condition {index + 1}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeCondition(index)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select
            value={condition.type}
            onValueChange={(value) => updateCondition(index, { type: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sensor">Sensor Reading</SelectItem>
              <SelectItem value="gpio">GPIO State</SelectItem>
              <SelectItem value="time">Time-based</SelectItem>
              <SelectItem value="device_status">Device Status</SelectItem>
              <SelectItem value="heartbeat">Heartbeat</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Operator</Label>
          <Select
            value={condition.operator}
            onValueChange={(value) => updateCondition(index, { operator: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gt">Greater than</SelectItem>
              <SelectItem value="lt">Less than</SelectItem>
              <SelectItem value="eq">Equals</SelectItem>
              <SelectItem value="ne">Not equals</SelectItem>
              <SelectItem value="gte">Greater than or equal</SelectItem>
              <SelectItem value="lte">Less than or equal</SelectItem>
              <SelectItem value="contains">Contains</SelectItem>
              <SelectItem value="between">Between</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {condition.type === 'sensor' && (
          <div>
            <Label>Sensor Field</Label>
            <Select
              value={condition.field || ''}
              onValueChange={(value) => updateCondition(index, { field: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sensor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tempC">Temperature (°C)</SelectItem>
                <SelectItem value="humidity">Humidity (%)</SelectItem>
                <SelectItem value="pressure">Pressure (hPa)</SelectItem>
                <SelectItem value="waterLevel">Water Level (%)</SelectItem>
                <SelectItem value="battery">Battery (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {condition.type === 'gpio' && (
          <div>
            <Label>GPIO Pin</Label>
            <Input
              type="number"
              value={condition.field || ''}
              onChange={(e) => updateCondition(index, { field: e.target.value })}
              placeholder="Pin number"
            />
          </div>
        )}
        
        <div>
          <Label>Value</Label>
          <Input
            type={condition.type === 'time' ? 'time' : 'text'}
            value={condition.value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            placeholder="Threshold value"
          />
        </div>
      </div>
    </Card>
  );

  const renderActionBuilder = (action: RuleAction, index: number) => (
    <Card key={index} className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">Action {index + 1}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeAction(index)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Action Type</Label>
          <Select
            value={action.type}
            onValueChange={(value) => updateAction(index, { type: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="notification">Send Notification</SelectItem>
              <SelectItem value="mqtt_command">Send MQTT Command</SelectItem>
              <SelectItem value="ota_update">Trigger OTA Update</SelectItem>
              <SelectItem value="webhook">Call Webhook</SelectItem>
              <SelectItem value="delay">Delay</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {action.type === 'notification' && (
          <>
            <div>
              <Label>Notification Type</Label>
              <Select
                value={action.notification?.type || 'info'}
                onValueChange={(value) => updateAction(index, {
                  notification: { ...action.notification, type: value as any }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2">
              <Label>Title</Label>
              <Input
                value={action.notification?.title || ''}
                onChange={(e) => updateAction(index, {
                  notification: { ...action.notification, title: e.target.value }
                })}
                placeholder="Notification title"
              />
            </div>
            
            <div className="col-span-2">
              <Label>Message</Label>
              <Textarea
                value={action.notification?.message || ''}
                onChange={(e) => updateAction(index, {
                  notification: { ...action.notification, message: e.target.value }
                })}
                placeholder="Notification message"
              />
            </div>
          </>
        )}
        
        {action.type === 'mqtt_command' && (
          <>
            <div>
              <Label>Command Type</Label>
              <Select
                value={action.command?.action || 'relay'}
                onValueChange={(value) => updateAction(index, {
                  command: { ...action.command, action: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relay">Relay Control</SelectItem>
                  <SelectItem value="pwm">PWM Control</SelectItem>
                  <SelectItem value="digital_write">Digital Write</SelectItem>
                  <SelectItem value="analog_write">Analog Write</SelectItem>
                  <SelectItem value="restart">Restart Device</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Pin</Label>
              <Input
                type="number"
                value={action.command?.pin || ''}
                onChange={(e) => updateAction(index, {
                  command: { ...action.command, pin: parseInt(e.target.value) }
                })}
                placeholder="GPIO pin"
              />
            </div>
            
            <div>
              <Label>State/Value</Label>
              <Input
                type="number"
                value={action.command?.state || action.command?.value || ''}
                onChange={(e) => updateAction(index, {
                  command: { ...action.command, state: parseInt(e.target.value) }
                })}
                placeholder="State or value"
              />
            </div>
          </>
        )}
        
        {action.type === 'delay' && (
          <div>
            <Label>Delay (milliseconds)</Label>
            <Input
              type="number"
              value={action.delay_ms || ''}
              onChange={(e) => updateAction(index, { delay_ms: parseInt(e.target.value) })}
              placeholder="Delay in ms"
            />
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
          </DialogTitle>
          <DialogDescription>
            Define conditions and actions to automate your IoT devices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Rule Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rule Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g., High Temperature Alert"
                  />
                </div>
                
                <div>
                  <Label htmlFor="device">Target Device (Optional)</Label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger>
                      <SelectValue placeholder="All devices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All devices</SelectItem>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.device_id}>
                          {device.name} ({device.device_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="Describe what this rule does..."
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conditions (WHEN)</CardTitle>
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Condition
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {conditions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No conditions defined. Add a condition to specify when this rule should trigger.
                </p>
              ) : (
                <>
                  {conditions.map((condition, index) => renderConditionBuilder(condition, index))}
                  
                  {conditions.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <Label>Logic:</Label>
                      <Select value={conditionLogic} onValueChange={setConditionLogic}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Actions (THEN)</CardTitle>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {actions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No actions defined. Add an action to specify what should happen when conditions are met.
                </p>
              ) : (
                actions.map((action, index) => renderActionBuilder(action, index))
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Settings className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
