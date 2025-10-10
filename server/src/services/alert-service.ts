import { WebPushService } from './web-push-service';
import { EmailService } from './email-service';
import { IntegrationService } from './integration-service';

export interface AlertRule {
  id: string;
  name: string;
  deviceId: string;
  source: 'GPIO' | 'SENSOR' | 'LOGIC';
  pin?: number;
  whenPinEquals?: 0 | 1;
  key?: string;
  op?: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value?: number | string;
  debounceMs?: number;
  hysteresis?: number;
  once?: boolean;
  isActive?: boolean;
  notifications: {
    inApp: boolean;
    browser: boolean;
    webPush: boolean;
    email: boolean;
    slack: boolean;
    discord: boolean;
    telegram: boolean;
    webhook: boolean;
    webhookUrl?: string;
  };
}

export interface AlertEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  deviceId: string;
  value: number | string | null;
  ts: number;
  seen: boolean;
  ack: boolean;
}

export class AlertService {
  private static rules: AlertRule[] = [];
  private static lastFireAt: Record<string, number> = {};
  private static armedSide: Record<string, 'above' | 'below'> = {};

  static async processDeviceStatusChange(deviceId: string, isOnline: boolean) {
    // Handle device online/offline alerts
    if (!isOnline) {
      await this.sendAlert({
        id: `device_offline_${deviceId}_${Date.now()}`,
        ruleId: 'device_status',
        ruleName: 'Device Offline',
        deviceId,
        value: 'offline',
        ts: Date.now(),
        seen: false,
        ack: false,
      });
    }
  }

  static async processDeviceStateChange(deviceId: string, state: any) {
    const rules = this.rules.filter(r => r.isActive && r.deviceId === deviceId);
    
    for (const rule of rules) {
      const shouldFire = await this.evaluateRule(rule, state);
      
      if (shouldFire) {
        await this.fireAlert(rule, deviceId, state);
      }
    }
  }

  static async processDeviceEvent(deviceId: string, event: any) {
    // Handle incremental events
    const rules = this.rules.filter(r => r.isActive && r.deviceId === deviceId);
    
    for (const rule of rules) {
      if (rule.source === 'GPIO' && event.path?.startsWith('gpio.')) {
        const pin = parseInt(event.path.split('.')[1]);
        if (rule.pin === pin) {
          const shouldFire = event.value === rule.whenPinEquals;
          if (shouldFire) {
            await this.fireAlert(rule, deviceId, { gpio: { [pin]: event.value } });
          }
        }
      } else if (rule.source === 'SENSOR' && event.path?.startsWith('sensors.')) {
        const key = event.path.replace('sensors.', '');
        if (rule.key === key) {
          const shouldFire = this.compareValues(rule.op!, event.value, rule.value);
          if (shouldFire) {
            await this.fireAlert(rule, deviceId, { sensors: { [key]: event.value } });
          }
        }
      }
    }
  }

  private static async evaluateRule(rule: AlertRule, state: any): Promise<boolean> {
    const now = Date.now();
    
    // Check debounce
    if (rule.debounceMs && now - (this.lastFireAt[rule.id] || 0) < rule.debounceMs) {
      return false;
    }

    // Check "once until ack" - this would need to be tracked in a database
    if (rule.once) {
      // For now, we'll skip this check - in production, you'd check against a database
    }

    let fire = false;
    let currentValue: any = null;

    if (rule.source === 'GPIO') {
      const v = state.gpio?.[rule.pin!];
      if (v == null) return false;
      currentValue = v;
      fire = (v === rule.whenPinEquals);
    } else {
      const v = state[rule.key!] ?? state.sensors?.[rule.key!] ?? state.gauges?.[rule.key!];
      if (v == null) return false;
      currentValue = v;

      if (typeof v === 'number' && (rule.op === '>' || rule.op === '<') && (rule.hysteresis ?? 0) > 0) {
        const side: 'above'|'below' = (rule.op === '>' ? (v > Number(rule.value) ? 'above' : 'below')
                                                        : (v < Number(rule.value) ? 'below' : 'above'));
        const prev = this.armedSide[rule.id] ?? (rule.op === '>' ? 'below' : 'above');
        if (side !== prev) {
          if ((rule.op === '>' && v > (Number(rule.value) + Number(rule.hysteresis))) ||
              (rule.op === '<' && v < (Number(rule.value) - Number(rule.hysteresis)))) {
            fire = true;
            this.armedSide[rule.id] = side;
          }
        }
      } else {
        fire = this.compareValues(rule.op!, v, rule.value);
      }
    }

    if (fire) {
      this.lastFireAt[rule.id] = now;
    }

    return fire;
  }

  private static compareValues(op: string, left: any, right: any): boolean {
    switch (op) {
      case '>': return left > right;
      case '>=': return left >= right;
      case '<': return left < right;
      case '<=': return left <= right;
      case '==': return left == right;
      case '!=': return left != right;
      default: return false;
    }
  }

  private static async fireAlert(rule: AlertRule, deviceId: string, state: any) {
    const alert: AlertEntry = {
      id: `alert_${rule.id}_${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      deviceId,
      value: this.extractValue(rule, state),
      ts: Date.now(),
      seen: false,
      ack: false,
    };

    console.log(`🚨 Alert fired: ${rule.name} for device ${deviceId}`);

    // Send notifications based on rule configuration
    await this.sendAlert(alert, rule);
  }

  private static extractValue(rule: AlertRule, state: any): any {
    if (rule.source === 'GPIO') {
      return state.gpio?.[rule.pin!];
    } else {
      return state[rule.key!] ?? state.sensors?.[rule.key!] ?? state.gauges?.[rule.key!];
    }
  }

  private static async sendAlert(alert: AlertEntry, rule?: AlertRule) {
    const notifications = rule?.notifications || {
      inApp: true,
      browser: true,
      webPush: true,
      email: false,
      slack: false,
      discord: false,
      telegram: false,
      webhook: false,
    };

    // Send in-app notification (this would be sent to connected clients)
    if (notifications.inApp) {
      console.log(`📱 In-app alert: ${alert.ruleName}`);
    }

    // Send browser notification
    if (notifications.browser) {
      console.log(`🔔 Browser notification: ${alert.ruleName}`);
    }

    // Send web push notification
    if (notifications.webPush) {
      await WebPushService.sendNotification({
        title: alert.ruleName,
        body: `Device ${alert.deviceId}: ${alert.value}`,
        data: { alertId: alert.id, deviceId: alert.deviceId },
      });
    }

    // Send email
    if (notifications.email) {
      await EmailService.sendAlertEmail(alert);
    }

    // Send to external integrations
    if (notifications.slack) {
      await IntegrationService.sendToSlack(alert);
    }

    if (notifications.discord) {
      await IntegrationService.sendToDiscord(alert);
    }

    if (notifications.telegram) {
      await IntegrationService.sendToTelegram(alert);
    }

    if (notifications.webhook && rule?.notifications.webhookUrl) {
      await IntegrationService.sendToWebhook(alert, rule.notifications.webhookUrl);
    }
  }

  // Rule management methods
  static addRule(rule: AlertRule) {
    this.rules.push(rule);
    console.log(`➕ Added alert rule: ${rule.name}`);
  }

  static removeRule(ruleId: string) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    console.log(`➖ Removed alert rule: ${ruleId}`);
  }

  static getRules(): AlertRule[] {
    return [...this.rules];
  }

  static updateRule(rule: AlertRule) {
    const index = this.rules.findIndex(r => r.id === rule.id);
    if (index >= 0) {
      this.rules[index] = rule;
      console.log(`🔄 Updated alert rule: ${rule.name}`);
    }
  }
}
