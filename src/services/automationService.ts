// Automation Rule Engine Service
import { supabase } from '../lib/supabase';
// import { commandService } from './commandService'; // Temporarily commented out
import { otaService } from './otaService';

export interface AutomationRule {
  id: string;
  user_id: string;
  device_id?: string;
  name: string;
  description?: string;
  condition: RuleCondition;
  action: RuleAction;
  active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  last_triggered?: string;
  trigger_count: number;
}

export interface RuleCondition {
  type: 'sensor' | 'gpio' | 'time' | 'device_status' | 'heartbeat' | 'combined';
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte' | 'contains' | 'between';
  field?: string; // sensor field name, gpio pin, etc.
  value: any; // threshold value
  unit?: string; // temperature unit, time unit, etc.
  conditions?: RuleCondition[]; // for combined conditions
  logic?: 'AND' | 'OR'; // for combined conditions
}

export interface RuleAction {
  type: 'mqtt_command' | 'notification' | 'ota_update' | 'webhook' | 'delay' | 'combined';
  target?: string; // device_id, webhook URL, etc.
  command?: any; // MQTT command payload
  notification?: {
    type: 'critical' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    channels?: string[];
  };
  webhook?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    payload?: any;
  };
  actions?: RuleAction[]; // for combined actions
  delay_ms?: number; // for delay action
}

export interface RuleExecution {
  id: string;
  rule_id: string;
  device_id: string;
  triggered_at: string;
  condition_data: any;
  action_result?: any;
  success: boolean;
  error_message?: string;
  execution_time_ms?: number;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  device_id?: string;
  notification_type: 'critical' | 'warning' | 'info' | 'success';
  channels: string[];
  enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

class AutomationService {
  private ruleCache = new Map<string, AutomationRule[]>();
  private lastCacheUpdate = 0;
  private cacheTimeout = 60000; // 1 minute

  // Create new automation rule
  async createRule(rule: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at' | 'trigger_count'>): Promise<AutomationRule> {
    const { data, error } = await supabase
      .from('automation_rules')
      .insert({
        user_id: rule.user_id,
        device_id: rule.device_id,
        name: rule.name,
        description: rule.description,
        condition: rule.condition,
        action: rule.action,
        active: rule.active,
        priority: rule.priority
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create automation rule: ${error.message}`);
    }

    // Clear cache
    this.clearCache();
    
    return data;
  }

  // Update automation rule
  async updateRule(ruleId: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
    const { data, error } = await supabase
      .from('automation_rules')
      .update({
        name: updates.name,
        description: updates.description,
        condition: updates.condition,
        action: updates.action,
        active: updates.active,
        priority: updates.priority
      })
      .eq('id', ruleId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update automation rule: ${error.message}`);
    }

    // Clear cache
    this.clearCache();
    
    return data;
  }

  // Delete automation rule
  async deleteRule(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('automation_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      throw new Error(`Failed to delete automation rule: ${error.message}`);
    }

    // Clear cache
    this.clearCache();
  }

  // Get automation rules for user
  async getUserRules(userId?: string): Promise<AutomationRule[]> {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get automation rules: ${error.message}`);
    }

    return data || [];
  }

  // Get automation rules for device
  async getDeviceRules(deviceId: string): Promise<AutomationRule[]> {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('device_id', deviceId)
      .eq('active', true)
      .order('priority', { ascending: false });

    if (error) {
      throw new Error(`Failed to get device automation rules: ${error.message}`);
    }

    return data || [];
  }

  // Get active rules for device (cached)
  async getActiveRulesForDevice(deviceId: string): Promise<AutomationRule[]> {
    const now = Date.now();
    
    // Check cache first
    if (this.ruleCache.has(deviceId) && (now - this.lastCacheUpdate) < this.cacheTimeout) {
      return this.ruleCache.get(deviceId) || [];
    }

    // Fetch from database
    const { data, error } = await supabase
      .rpc('get_active_rules_for_device', { device_id_param: deviceId });

    if (error) {
      throw new Error(`Failed to get active rules for device: ${error.message}`);
    }

    const rules = data || [];
    
    // Update cache
    this.ruleCache.set(deviceId, rules);
    this.lastCacheUpdate = now;
    
    return rules;
  }

  // Evaluate rule condition
  evaluateCondition(condition: RuleCondition, data: any): boolean {
    switch (condition.type) {
      case 'sensor':
        return this.evaluateSensorCondition(condition, data);
      case 'gpio':
        return this.evaluateGpioCondition(condition, data);
      case 'time':
        return this.evaluateTimeCondition(condition, data);
      case 'device_status':
        return this.evaluateDeviceStatusCondition(condition, data);
      case 'heartbeat':
        return this.evaluateHeartbeatCondition(condition, data);
      case 'combined':
        return this.evaluateCombinedCondition(condition, data);
      default:
        console.warn('Unknown condition type:', condition.type);
        return false;
    }
  }

  // Evaluate sensor condition
  private evaluateSensorCondition(condition: RuleCondition, data: any): boolean {
    const sensorValue = this.getNestedValue(data, `sensors.${condition.field}`);
    if (sensorValue === undefined) return false;

    return this.compareValues(sensorValue, condition.operator, condition.value);
  }

  // Evaluate GPIO condition
  private evaluateGpioCondition(condition: RuleCondition, data: any): boolean {
    const gpioValue = this.getNestedValue(data, `gpio.${condition.field}`);
    if (gpioValue === undefined) return false;

    return this.compareValues(gpioValue, condition.operator, condition.value);
  }

  // Evaluate time condition
  private evaluateTimeCondition(condition: RuleCondition, data: any): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight
    
    switch (condition.operator) {
      case 'between':
        const [start, end] = condition.value;
        const startMinutes = this.timeToMinutes(start);
        const endMinutes = this.timeToMinutes(end);
        
        if (startMinutes <= endMinutes) {
          return currentTime >= startMinutes && currentTime <= endMinutes;
        } else {
          // Time range spans midnight
          return currentTime >= startMinutes || currentTime <= endMinutes;
        }
      default:
        return this.compareValues(currentTime, condition.operator, this.timeToMinutes(condition.value));
    }
  }

  // Evaluate device status condition
  private evaluateDeviceStatusCondition(condition: RuleCondition, data: any): boolean {
    const status = data.status || data.online;
    return this.compareValues(status, condition.operator, condition.value);
  }

  // Evaluate heartbeat condition
  private evaluateHeartbeatCondition(condition: RuleCondition, data: any): boolean {
    const lastHeartbeat = data.lastHeartbeat || data.heartbeat_timestamp;
    if (!lastHeartbeat) return false;

    const timeSinceHeartbeat = Date.now() - new Date(lastHeartbeat).getTime();
    const thresholdMs = condition.value * 1000; // Convert seconds to milliseconds

    return this.compareValues(timeSinceHeartbeat, condition.operator, thresholdMs);
  }

  // Evaluate combined condition
  private evaluateCombinedCondition(condition: RuleCondition, data: any): boolean {
    if (!condition.conditions || !condition.logic) return false;

    const results = condition.conditions.map(subCondition => 
      this.evaluateCondition(subCondition, data)
    );

    if (condition.logic === 'AND') {
      return results.every(result => result);
    } else if (condition.logic === 'OR') {
      return results.some(result => result);
    }

    return false;
  }

  // Execute rule action
  async executeAction(action: RuleAction, deviceId: string, ruleId: string): Promise<any> {
    const startTime = Date.now();
    let result: any = null;
    let success = true;
    let errorMessage: string | undefined;

    try {
      switch (action.type) {
        case 'mqtt_command':
          result = await this.executeMqttCommand(action, deviceId);
          break;
        case 'notification':
          result = await this.executeNotification(action, deviceId);
          break;
        case 'ota_update':
          result = await this.executeOtaUpdate(action, deviceId);
          break;
        case 'webhook':
          result = await this.executeWebhook(action);
          break;
        case 'delay':
          result = await this.executeDelay(action);
          break;
        case 'combined':
          result = await this.executeCombinedActions(action, deviceId, ruleId);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Action execution failed:', error);
    }

    const executionTime = Date.now() - startTime;

    // Log execution
    await this.logRuleExecution({
      rule_id: ruleId,
      device_id: deviceId,
      triggered_at: new Date().toISOString(),
      condition_data: {}, // Will be filled by caller
      action_result: result,
      success,
      error_message: errorMessage,
      execution_time_ms: executionTime
    });

    // Update rule trigger count
    await supabase.rpc('update_rule_triggered', { rule_id_param: ruleId });

    return { result, success, errorMessage, executionTime };
  }

  // Execute MQTT command action
  private async executeMqttCommand(action: RuleAction, deviceId: string): Promise<any> {
    if (!action.command) {
      throw new Error('MQTT command action requires command payload');
    }

    // Temporarily using basic MQTT publish instead of command service
    console.log('MQTT command execution temporarily disabled');
    return { command: action.command, status: 'pending' };
    
    // const ack = await commandService.sendCommand(deviceId, action.command.action, {
    //   pin: action.command.pin,
    //   state: action.command.state,
    //   value: action.command.value,
    //   duration: action.command.duration
    // });
    // return { command: action.command, ack };
  }

  // Execute notification action
  private async executeNotification(action: RuleAction, deviceId: string): Promise<any> {
    if (!action.notification) {
      throw new Error('Notification action requires notification payload');
    }

    // Get device owner
    const { data: device } = await supabase
      .from('devices')
      .select('user_id')
      .eq('device_id', deviceId)
      .single();

    if (!device) {
      throw new Error('Device not found');
    }

    // Check notification preferences
    const shouldSend = await supabase.rpc('should_send_notification', {
      user_id_param: device.user_id,
      notification_type_param: action.notification.type,
      device_id_param: deviceId
    });

    if (!shouldSend.data) {
      return { skipped: true, reason: 'Notification disabled or in quiet hours' };
    }

    // Send notification (implementation depends on notification service)
    const notificationResult = await this.sendNotification({
      userId: device.user_id,
      deviceId,
      type: action.notification.type,
      title: action.notification.title,
      message: action.notification.message,
      channels: action.notification.channels || ['email']
    });

    return notificationResult;
  }

  // Execute OTA update action
  private async executeOtaUpdate(action: RuleAction, deviceId: string): Promise<any> {
    if (!action.target) {
      throw new Error('OTA update action requires target firmware ID');
    }

    await otaService.deployFirmware(deviceId, action.target);
    return { firmwareId: action.target };
  }

  // Execute webhook action
  private async executeWebhook(action: RuleAction): Promise<any> {
    if (!action.webhook) {
      throw new Error('Webhook action requires webhook configuration');
    }

    const response = await fetch(action.webhook.url, {
      method: action.webhook.method,
      headers: {
        'Content-Type': 'application/json',
        ...action.webhook.headers
      },
      body: action.webhook.payload ? JSON.stringify(action.webhook.payload) : undefined
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return { status: response.status, data: await response.text() };
  }

  // Execute delay action
  private async executeDelay(action: RuleAction): Promise<any> {
    if (!action.delay_ms) {
      throw new Error('Delay action requires delay_ms');
    }

    await new Promise(resolve => setTimeout(resolve, action.delay_ms));
    return { delay_ms: action.delay_ms };
  }

  // Execute combined actions
  private async executeCombinedActions(action: RuleAction, deviceId: string, ruleId: string): Promise<any> {
    if (!action.actions) {
      throw new Error('Combined action requires actions array');
    }

    const results = [];
    for (const subAction of action.actions) {
      const result = await this.executeAction(subAction, deviceId, ruleId);
      results.push(result);
    }

    return { combined_results: results };
  }

  // Process device data and evaluate rules
  async processDeviceData(deviceId: string, data: any): Promise<void> {
    try {
      const rules = await this.getActiveRulesForDevice(deviceId);
      
      for (const rule of rules) {
        try {
          const conditionMet = this.evaluateCondition(rule.condition, data);
          
          if (conditionMet) {
            console.log(`Rule "${rule.name}" triggered for device ${deviceId}`);
            await this.executeAction(rule.action, deviceId, rule.id);
          }
        } catch (error) {
          console.error(`Error evaluating rule ${rule.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error processing device data for ${deviceId}:`, error);
    }
  }

  // Helper methods
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'lt': return actual < expected;
      case 'eq': return actual === expected;
      case 'ne': return actual !== expected;
      case 'gte': return actual >= expected;
      case 'lte': return actual <= expected;
      case 'contains': return String(actual).includes(String(expected));
      default: return false;
    }
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async sendNotification(notification: {
    userId: string;
    deviceId: string;
    type: string;
    title: string;
    message: string;
    channels: string[];
  }): Promise<any> {
    // This would integrate with your notification service
    // For now, just log the notification
    console.log('Sending notification:', notification);
    
    // Log notification
    await supabase.rpc('log_notification', {
      user_id_param: notification.userId,
      device_id_param: notification.deviceId,
      rule_id_param: null,
      notification_type_param: notification.type,
      channel_param: notification.channels.join(','),
      title_param: notification.title,
      message_param: notification.message,
      success_param: true
    });

    return { sent: true, channels: notification.channels };
  }

  private async logRuleExecution(execution: Omit<RuleExecution, 'id'>): Promise<void> {
    const { error } = await supabase
      .from('rule_executions')
      .insert(execution);

    if (error) {
      console.error('Failed to log rule execution:', error);
    }
  }

  private clearCache(): void {
    this.ruleCache.clear();
    this.lastCacheUpdate = 0;
  }

  // Get rule execution history
  async getRuleExecutions(ruleId: string, limit: number = 50): Promise<RuleExecution[]> {
    const { data, error } = await supabase
      .from('rule_executions')
      .select('*')
      .eq('rule_id', ruleId)
      .order('triggered_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get rule executions: ${error.message}`);
    }

    return data || [];
  }

  // Get notification preferences
  async getNotificationPreferences(userId?: string, deviceId?: string): Promise<NotificationPreferences[]> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .eq(deviceId ? 'device_id' : 'device_id', deviceId || null)
      .order('notification_type');

    if (error) {
      throw new Error(`Failed to get notification preferences: ${error.message}`);
    }

    return data || [];
  }

  // Update notification preferences
  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(preferences)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update notification preferences: ${error.message}`);
    }

    return data;
  }
}

// Export singleton instance
export const automationService = new AutomationService();
