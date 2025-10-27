import { AlertsStore } from './alertsStore';
import { AlertEntry, AlertRule } from './types';
import { SnippetBus } from '@/features/snippets/snippetBus';
import { DeviceState } from '@/lib/mqttTopics';

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

export const AlertEngine = {
  // Process device state updates from reported state (device-authoritative)
  onDeviceStateUpdate(deviceId: string, state: DeviceState){
    const now = Date.now();
    const rules = AlertsStore.listRules().filter(r => r.isActive && r.deviceId === deviceId);

    for (const r of rules){
      let fire = false;
      let currentValue: any = null;

      if (r.source === 'GPIO'){
        // Get GPIO value from reported state
        const v = state.gpio?.[r.pin!.toString()];
        if (v == null) continue;
        currentValue = v;
        fire = (v === r.whenPinEquals);
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

      const last = AlertsStore._getLastFire(r.id);
      if (r.debounceMs && now - last < r.debounceMs) continue;

      if (r.once && AlertsStore.listHistory().some(h => h.ruleId === r.id && !h.ack)) continue;

      AlertsStore._setLastFire(r.id, now);

      const entry: AlertEntry = {
        id: crypto.randomUUID(),
        ruleId: r.id,
        ruleName: r.name,
        deviceId,
        value: currentValue,
        ts: now,
        seen: false,
        ack: false,
      };
      AlertsStore._push(entry);

      const code = `// SapHari Alert (Device-Reported)
// Rule: ${r.name}
// Device: ${deviceId}
// Value: ${JSON.stringify(currentValue)}
// Source: Device Reported State
// Time: ${new Date(now).toISOString()}`;
      SnippetBus.emitSnippet(code, { type: 'alert', ruleId: r.id, deviceId, value: currentValue, ts: now });

      // Send browser notification
      if ('Notification' in window && Notification.permission === 'granted'){
        new Notification(r.name, { 
          body: `${deviceId} • ${String(currentValue)}`,
          icon: '/favicon.png',
          tag: `alert-${r.id}`, // Prevent duplicate notifications
          requireInteraction: false
        });
      }

      // Log alert to console for debugging
      console.log(`🔔 ALERT FIRED: ${r.name}`, {
        deviceId,
        value: currentValue,
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
