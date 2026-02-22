import { sendToggleCommand } from '@/services/commandService';
import { DeviceStore } from './deviceStore';

type PendingCmd = { reqId: string; deviceId: string; pin: number; desired: 0|1; ts: number; timer?: any; };

const pendings = new Map<string, PendingCmd>(); // key=reqId
const TIMEOUT_MS = 5000;

function makeReqId(){ return Math.random().toString(36).slice(2); }

export type PublishFn = (topic: string, payload: string, retain?: boolean) => void;

export const CommandTracker = {
  addCommand(cmd: PendingCmd) {
    pendings.set(cmd.reqId, cmd);
  },

  async toggleGpio(publishFn: PublishFn, deviceId: string, pin: number, desired: 0|1){
    // Block if offline
    const snap = DeviceStore.get(deviceId);
    if (!snap || !snap.online) throw new Error('Device offline');

    const confirmed = await sendToggleCommand(publishFn, deviceId, '', pin, desired, false);
    if (!confirmed) {
      throw new Error('Command timeout');
    }
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
