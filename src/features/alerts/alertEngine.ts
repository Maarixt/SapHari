import { AlertsStore } from './alertsStore';
import { AlertEntry, AlertRule, TriggerEdge } from './types';
import { SnippetBus } from '@/features/snippets/snippetBus';
import { DeviceState } from '@/lib/mqttTopics';

// Track previous GPIO states for edge detection
const prevGpioStates: Record<string, Record<string, number>> = {};

function cmp(op: AlertRule['op'], left: any, right: any){
  switch(op){
    case '>':  return left >  right;
    case '>=': return left >= right;
    case '<':  return left <  right;
    case '<=': return left <= right;
    case '==': return left == right;     // loose for numeric strings
    case '!=': return left != right;
    default: return false;
  }
}

function checkEdgeTrigger(trigger: TriggerEdge, prevValue: number | undefined, currentValue: number): boolean {
  switch (trigger) {
    case 'rising':
      return prevValue === 0 && currentValue === 1;
    case 'falling':
      return prevValue === 1 && currentValue === 0;
    case 'high':
      return currentValue === 1;
    case 'low':
      return currentValue === 0;
    default:
      return false;
  }
}

export const AlertEngine = {
  // Process device state updates from reported state (device-authoritative)
  onDeviceStateUpdate(deviceId: string, state: DeviceState){
    const now = Date.now();
    const rules = AlertsStore.listRules().filter(r => r.isActive && r.deviceId === deviceId);

    // Initialize prev states for this device if needed
    if (!prevGpioStates[deviceId]) {
      prevGpioStates[deviceId] = {};
    }

    for (const r of rules){
      let fire = false;
      let currentValue: any = null;
      let detectedEdge: TriggerEdge | undefined;

      if (r.source === 'GPIO'){
        // Get GPIO value from reported state
        const pinKey = r.pin!.toString();
        const v = state.gpio?.[pinKey];
        if (v == null) continue;
        currentValue = v;

        const prevValue = prevGpioStates[deviceId][pinKey];
        const trigger = r.trigger || (r.whenPinEquals === 1 ? 'high' : 'low');
        
        fire = checkEdgeTrigger(trigger, prevValue, v);
        
        if (fire) {
          detectedEdge = trigger;
        }

        // Store current value for next comparison
        prevGpioStates[deviceId][pinKey] = v;
      } else {
        // Get sensor/gauge value from reported state
        const v = state.sensors?.[r.key!] ?? state.gauges?.[r.key!];
        if (v == null) continue;
        currentValue = v;

        if (typeof v === 'number' && (r.op === '>' || r.op === '<') && (r.hysteresis ?? 0) > 0){
          const side: 'above'|'below' = (r.op === '>' ? (v > Number(r.value) ? 'above' : 'below')
                                                      : (v < Number(r.value) ? 'below' : 'above'));
          const prev = AlertsStore._getArmed(r.id) ?? (r.op === '>' ? 'below' : 'above');
          if (side !== prev){
            if ((r.op === '>' && v > (Number(r.value) + Number(r.hysteresis))) ||
                (r.op === '<' && v < (Number(r.value) - Number(r.hysteresis)))){
              fire = true;
              AlertsStore._setArmed(r.id, side);
            }
          }
        } else {
          fire = cmp(r.op!, v, r.value);
        }
      }

      if (!fire) continue;

      // Check cooldown (use cooldownMs if set, fall back to debounceMs)
      const cooldown = r.cooldownMs || r.debounceMs || 0;
      const last = AlertsStore._getLastFire(r.id);
      if (cooldown && now - last < cooldown) continue;

      if (r.once && AlertsStore.listHistory().some(h => h.ruleId === r.id && !h.ack)) continue;

      AlertsStore._setLastFire(r.id, now);

      const alertMessage = r.message || r.name;

      const entry: AlertEntry = {
        id: crypto.randomUUID(),
        ruleId: r.id,
        ruleName: r.name,
        deviceId,
        value: currentValue,
        message: alertMessage,
        edge: detectedEdge,
        ts: now,
        seen: false,
        ack: false,
      };
      AlertsStore._push(entry);

      const code = `// SapHari Alert
// Rule: ${r.name}
// Device: ${deviceId}
// Message: ${alertMessage}
// Value: ${JSON.stringify(currentValue)}
// Edge: ${detectedEdge || 'n/a'}
// Time: ${new Date(now).toISOString()}`;
      SnippetBus.emitSnippet(code, { type: 'alert', ruleId: r.id, deviceId, value: currentValue, ts: now });

      // Send browser notification with custom message
      if ('Notification' in window && Notification.permission === 'granted'){
        new Notification(r.name, { 
          body: alertMessage,
          icon: '/favicon.png',
          tag: `alert-${r.id}`, // Prevent duplicate notifications
          requireInteraction: false
        });
      }

      // Log alert to console for debugging
      console.log(`🔔 ALERT FIRED: ${r.name}`, {
        deviceId,
        message: alertMessage,
        value: currentValue,
        edge: detectedEdge,
        rule: r
      });
    }
  },

  // Legacy method for backward compatibility (deprecated)
  onDeviceUpdate(deviceId: string, snapshot: any){
    console.warn('AlertEngine.onDeviceUpdate is deprecated. Use onDeviceStateUpdate instead.');
    // Convert legacy snapshot to DeviceState format
    const state: DeviceState = {
      deviceId,
      gpio: snapshot.gpio,
      sensors: snapshot.sensors,
      gauges: snapshot.gauges,
      timestamp: Date.now()
    };
    this.onDeviceStateUpdate(deviceId, state);
  }
};
