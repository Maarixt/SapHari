import { DeviceStore } from '@/state/deviceStore';
import { AlertsStore } from './alertsStore';
import { AlertRule } from './alertsTypes';
import { notifyBrowser } from '@/utils/browserNotify';
import { toast } from 'sonner';
import { aggregationService } from '@/services/aggregationService';
import { supabase } from '@/integrations/supabase/client';

function cmp(op: AlertRule['op'], left: any, right: any){
  switch(op){
    case '>':  return left > right;
    case '>=': return left >= right;
    case '<':  return left < right;
    case '<=': return left <= right;
    case '==': return left == right;
    case '!=': return left != right;
    default: return false;
  }
}

function inQuietHours(now: Date, start?: string, end?: string){
  if(!start || !end) return false;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = new Date(now), e = new Date(now);
  s.setHours(sh, sm, 0, 0); e.setHours(eh, em, 0, 0);
  return (e < s) ? (now >= s || now <= e) : (now >= s && now <= e);
}

function valForRule(rule: AlertRule, snap: any){
  if(rule.source==='GPIO'){
    return snap.gpio?.[rule.pin!];
  }
  return snap[rule.key!] ?? snap.sensors?.[rule.key!] ?? snap.gauges?.[rule.key!];
}

function shouldFire(rule: AlertRule, value: any){
  if(rule.source==='GPIO'){
    return value === rule.whenPinEquals;
  }
  if(typeof value==='number' && (rule.op==='>' || rule.op==='<') && (rule.hysteresis??0)>0){
    const side: 'above'|'below' = (rule.op==='>' ? (value > Number(rule.value) ? 'above':'below')
                                                 : (value < Number(rule.value) ? 'below':'above'));
    const prev = AlertsStore.getArmed(rule.id) ?? (rule.op==='>' ? 'below':'above');
    if(side !== prev){
      if( (rule.op==='>' && value > Number(rule.value) + Number(rule.hysteresis)) ||
          (rule.op==='<' && value < Number(rule.value) - Number(rule.hysteresis)) ) {
        AlertsStore.setArmed(rule.id, side);
        return true;
      }
    }
    return false;
  }
  return cmp(rule.op!, value, rule.value);
}

export const Alerts = {
  async evaluate(deviceId: string){
    const snap = DeviceStore.get(deviceId); if(!snap) return;
    const now = new Date();
    const rules = AlertsStore.listRules().filter(r=>r.isActive!==false && r.deviceId===deviceId);

    for(const r of rules){
      const v = valForRule(r, snap);
      if(v==null) continue;

      if(inQuietHours(now, r.qhStart, r.qhEnd)) continue;

      if(!shouldFire(r, v)) continue;

      const last = AlertsStore.getLastFire(r.id);
      if(r.debounceMs && Date.now() - last < r.debounceMs) continue;
      if(r.once && AlertsStore.listHistory().some(h => h.ruleId===r.id && !h.ack)) continue;

      AlertsStore.setLastFire(r.id, Date.now());

      const entry = {
        id: crypto.randomUUID(),
        ruleId: r.id,
        ruleName: r.name,
        deviceId,
        value: v,
        ts: Date.now(),
        severity: r.severity || 'warning',
        channels: r.channels || ['app','toast','browser'],
        seen: false, ack: false,
      };
              AlertsStore.pushHistory(entry);

              // Record alert in aggregation service
              aggregationService.recordAlertTriggered(entry, deviceId, ''); // userId will be resolved

              // Insert alert into database for master dashboard
              try {
                await supabase.from('alerts').insert({
                  id: entry.id,
                  rule_id: entry.ruleId,
                  device_id: deviceId,
                  severity: entry.severity,
                  title: entry.ruleName,
                  description: `${deviceId} • ${String(entry.value)}`,
                  channels: entry.channels,
                  created_at: new Date(entry.ts).toISOString(),
                  acknowledged: entry.ack,
                  seen: entry.seen
                });
              } catch (error) {
                console.error('Failed to insert alert into database:', error);
              }

      // Route: UI
      if(entry.channels.includes('toast')){
        toast(`${entry.ruleName}`, { description: `${deviceId} • ${String(v)}` });
      }
      if(entry.channels.includes('browser')){
        notifyBrowser(`${entry.ruleName}`, `${deviceId} • ${String(v)}`);
      }

      // Route: server integrations (push/email/slack/discord/telegram/webhook)
      const wantsServer = entry.channels.some(c => ['push','email','slack','discord','telegram','webhook'].includes(c));
      if(wantsServer){
        fetch('/api/notify', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            deviceId, ruleId: r.id, name: r.name, value: v,
            severity: entry.severity, channels: entry.channels, ts: entry.ts
          })
        }).catch(()=>{ /* ignore */ });
      }
    }
  }
};
