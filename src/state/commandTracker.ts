import { sendCommand } from '@/services/mqtt';
import { DeviceStore } from './deviceStore';

type PendingCmd = { reqId: string; deviceId: string; pin: number; desired: 0|1; ts: number; timer?: any; };

const pendings = new Map<string, PendingCmd>(); // key=reqId
const TIMEOUT_MS = 5000;

function makeReqId(){ return Math.random().toString(36).slice(2); }

export const CommandTracker = {
  addCommand(cmd: PendingCmd) {
    pendings.set(cmd.reqId, cmd);
  },

  async toggleGpio(deviceId: string, pin: number, desired: 0|1){
    // Block if offline
    const snap = DeviceStore.get(deviceId);
    if (!snap || !snap.online) throw new Error('Device offline');

    const reqId = makeReqId();
    const cmd = { type:'gpio', pin, value:desired, reqId };
    
    // Use the sendCommand function which handles connection status
    const success = await sendCommand(deviceId, cmd);
    if (!success) {
      throw new Error('Failed to send command - MQTT not connected');
    }

    return new Promise<void>((resolve, reject) => {
      const pend: PendingCmd = { reqId, deviceId, pin, desired, ts: Date.now() };
      pend.timer = setTimeout(() => {
        pendings.delete(reqId);
        reject(new Error('Command timeout'));
      }, TIMEOUT_MS);
      pendings.set(reqId, pend);
    });
  },

  resolveAck(reqId: string, ok: boolean, detail: string){
    const pend = pendings.get(reqId);
    if (!pend) return;
    clearTimeout(pend.timer);
    pendings.delete(reqId);

    if (!ok) {
      // Explicit failure: reject behavior -> throw toast upstream
      console.warn('Command failed:', detail);
      // Let UI show a toast; state will remain as last reported (no flip)
      return;
    }
    // Success ACK — final confirmation still comes from reported state
    // We rely on the subsequent state publish from device to update UI
  }
};
