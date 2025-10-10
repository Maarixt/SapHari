import React, { useMemo, useState } from 'react';
import { AlertsStore } from '@/features/alerts/alertsStore';
import { AlertRule } from '@/features/alerts/types';
import { loadSampleRules, clearAllRules } from '@/features/alerts/sampleRules';

const emptyRule = (): AlertRule => ({
  id: crypto.randomUUID(),
  name: '',
  deviceId: '',
  source: 'GPIO',
  isActive: true,
  debounceMs: 0,
  hysteresis: 0,
  once: false,
});

export default function AlertRulesModal(){
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const rules = AlertsStore.listRules();
  useMemo(() => { AlertsStore._bindManageModal(() => setOpen(true)); return undefined; }, []);

  if (!open) return null;

  const onSave = () => {
    const r = editing!;
    if (!r.name || !r.deviceId) return;
    AlertsStore.updateRule(r);
    setEditing(null);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <div className="w-full max-w-3xl rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Manage Alert Rules</h2>
          <button className="text-sm opacity-70" onClick={()=>setOpen(false)}>Close</button>
        </div>

        <div className="mb-4 flex gap-2 flex-wrap">
          <button className="text-xs bg-neutral-800 px-3 py-1.5 rounded-lg"
            onClick={()=>setEditing(emptyRule())}>
            + Add Alert Rule
          </button>
          <button className="text-xs bg-sky-600 px-3 py-1.5 rounded-lg"
            onClick={() => {
              AlertsStore._push({
                id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ruleId: "test_rule",
                ruleName: "Test Alert Rule",
                deviceId: "ESP32_001",
                value: "GPIO 2 > 0",
                ts: Date.now(),
                seen: false,
                ack: false
              });
            }}>
            🔔 Test Alert Bell
          </button>
          <button className="text-xs bg-green-600 px-3 py-1.5 rounded-lg"
            onClick={loadSampleRules}>
            📋 Load Sample Rules
          </button>
          <button className="text-xs bg-red-600 px-3 py-1.5 rounded-lg"
            onClick={clearAllRules}>
            🗑️ Clear All Rules
          </button>
        </div>

        <div className="space-y-2">
          {rules.map(r => (
            <div key={r.id} className="border border-neutral-800 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name} {r.isActive ? '' : '(disabled)'}</div>
                  <div className="text-xs opacity-70">
                    {r.source === 'GPIO'
                      ? `Device ${r.deviceId} • PIN ${r.pin} == ${r.whenPinEquals}`
                      : `Device ${r.deviceId} • ${r.key} ${r.op} ${String(r.value)}`
                    }
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="text-xs text-sky-400" onClick={()=>setEditing({...r})}>Edit</button>
                  <button className="text-xs text-rose-400" onClick={()=>AlertsStore.deleteRule(r.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <div className="mt-4 border-t border-neutral-800 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Name
                <input className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                  value={editing.name}
                  onChange={e=>setEditing({...editing, name: e.target.value})}/>
              </label>
              <label className="text-sm">Device ID
                <input className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                  value={editing.deviceId}
                  onChange={e=>setEditing({...editing, deviceId: e.target.value})}/>
              </label>

              <label className="text-sm">Source
                <select className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                  value={editing.source}
                  onChange={e=>setEditing({...editing, source: e.target.value as any})}>
                  <option value="GPIO">GPIO</option>
                  <option value="SENSOR">SENSOR</option>
                  <option value="LOGIC">LOGIC</option>
                </select>
              </label>

              <label className="text-sm">Active?
                <select className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                  value={editing.isActive ? '1' : '0'}
                  onChange={e=>setEditing({...editing, isActive: e.target.value==='1'})}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>

              {editing.source === 'GPIO' ? (
                <>
                  <label className="text-sm">Pin
                    <input type="number" className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                      value={editing.pin ?? ''}
                      onChange={e=>setEditing({...editing, pin: Number(e.target.value)})}/>
                  </label>
                  <label className="text-sm">When Pin Equals
                    <select className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                      value={String(editing.whenPinEquals ?? 1)}
                      onChange={e=>setEditing({...editing, whenPinEquals: Number(e.target.value) as 0|1})}>
                      <option value="0">LOW (0)</option>
                      <option value="1">HIGH (1)</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="text-sm">Key (metric)
                    <input className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                      placeholder="tempC, waterLevelPct, ds18b20.0.temp"
                      value={editing.key ?? ''}
                      onChange={e=>setEditing({...editing, key: e.target.value})}/>
                  </label>
                  <label className="text-sm">Operator
                    <select className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                      value={editing.op ?? '>'}
                      onChange={e=>setEditing({...editing, op: e.target.value as any})}>
                      <option value=">">&gt;</option>
                      <option value=">=">&ge;</option>
                      <option value="<">&lt;</option>
                      <option value="<=">&le;</option>
                      <option value="==">==</option>
                      <option value="!=">!=</option>
                    </select>
                  </label>
                  <label className="text-sm">Value
                    <input className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                      value={editing.value ?? ''}
                      onChange={e=>{
                        const raw = e.target.value;
                        const asNum = Number(raw);
                        setEditing({...editing, value: Number.isNaN(asNum) ? raw : asNum});
                      }}/>
                  </label>
                  <label className="text-sm">Hysteresis (optional)
                    <input type="number" className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                      value={editing.hysteresis ?? 0}
                      onChange={e=>setEditing({...editing, hysteresis: Number(e.target.value)})}/>
                  </label>
                </>
              )}

              <label className="text-sm">Debounce ms
                <input type="number" className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                  value={editing.debounceMs ?? 0}
                  onChange={e=>setEditing({...editing, debounceMs: Number(e.target.value)})}/>
              </label>
              <label className="text-sm">Fire once until ack?
                <select className="w-full mt-1 bg-neutral-800 rounded-lg px-2 py-1.5"
                  value={editing.once ? '1':'0'}
                  onChange={e=>setEditing({...editing, once: e.target.value==='1'})}>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <button className="text-sm px-3 py-1.5 bg-neutral-800 rounded-lg" onClick={()=>setEditing(null)}>
                Cancel
              </button>
              <button className="text-sm px-3 py-1.5 bg-sky-600 rounded-lg" onClick={onSave}>
                Save Rule
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
