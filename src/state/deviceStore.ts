type GPIO = Record<number, 0|1>;
type Sensors = Record<string, any>;

export type DeviceSnapshot = {
  online: boolean;
  gpio: GPIO;
  sensors: Sensors;
  lastSeen: number;
};

type Listener = () => void;
let subs: Listener[] = [];
const devices: Record<string, DeviceSnapshot> = {};

function notify(){ subs.forEach(f=>f()); }

/**
 * Clear all device state - called on logout
 */
function clearAllState(): void {
  console.log('🧹 DeviceStore: Clearing all state');
  Object.keys(devices).forEach(key => delete devices[key]);
  notify();
}

export const DeviceStore = {
  subscribe(fn: Listener): () => void { 
    subs.push(fn); 
    return () => { subs = subs.filter(s => s !== fn); }; 
  },
  get(id: string){ return devices[id]; },
  all(){ return devices; },

  upsertState(id: string, partial: Partial<DeviceSnapshot>){
    const cur = devices[id] || { online:false, gpio:{}, sensors:{}, lastSeen:0 };
    const next: DeviceSnapshot = {
      online: partial.online ?? cur.online,
      gpio: { ...cur.gpio, ...(partial.gpio||{}) },
      sensors:{ ...cur.sensors, ...(partial.sensors||{}) },
      lastSeen: Date.now(),
    };
    devices[id] = next;
    notify();
  },

  setOnline(id: string, online: boolean){
    const cur = devices[id] || { online:false, gpio:{}, sensors:{}, lastSeen:0 };
    devices[id] = { ...cur, online, lastSeen: Date.now() };
    notify();
  },

  /**
   * Clear all device state - CRITICAL for logout
   */
  clear: clearAllState
};
