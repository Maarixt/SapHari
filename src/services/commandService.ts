/**
 * Command Service - handles sending commands and waiting for GPIO confirmations
 */

import { useMQTTDebugStore } from '@/stores/mqttDebugStore';

interface PendingCommand {
  deviceId: string;
  pin: number;
  expectedState: 0 | 1;
  resolve: (confirmed: boolean) => void;
  timeoutId: NodeJS.Timeout;
}

const pendingCommands = new Map<string, PendingCommand>();
const COMMAND_TIMEOUT_MS = 5000;

function getCommandKey(deviceId: string, pin: number): string {
  return `${deviceId}:${pin}`;
}

/**
 * Publish a toggle command and wait for GPIO confirmation
 */
export async function sendToggleCommand(
  publishFn: (topic: string, payload: string, retain?: boolean) => void,
  deviceId: string,
  addr: string,
  pin: number,
  state: 0 | 1,
  override: boolean = false
): Promise<boolean> {
  const key = getCommandKey(deviceId, pin);
  
  // Cancel any existing pending command for this pin
  const existing = pendingCommands.get(key);
  if (existing) {
    clearTimeout(existing.timeoutId);
    existing.resolve(false);
    pendingCommands.delete(key);
  }

  // Build command payload (NO key field for security)
  const payload = JSON.stringify({
    addr,
    pin,
    state,
    override,
  });

  const topic = `saphari/${deviceId}/cmd/toggle`;

  // Log outgoing command
  const debugStore = useMQTTDebugStore.getState();
  if (debugStore.enabled) {
    debugStore.addLog({
      direction: 'outgoing',
      topic,
      payload,
    });
  }

  // Publish command (not retained - commands are ephemeral)
  publishFn(topic, payload, false);

  console.log(`📤 Command sent: ${topic}`, JSON.parse(payload));

  // Wait for GPIO confirmation
  return new Promise<boolean>((resolve) => {
    const timeoutId = setTimeout(() => {
      console.warn(`⏱️ Command timeout: ${deviceId} pin ${pin}`);
      pendingCommands.delete(key);
      resolve(false);
    }, COMMAND_TIMEOUT_MS);

    pendingCommands.set(key, {
      deviceId,
      pin,
      expectedState: state,
      resolve,
      timeoutId,
    });
  });
}

/**
 * Handle GPIO confirmation from device
 * Call this when receiving messages on saphari/<deviceId>/gpio/<pin>
 */
export function handleGpioConfirmation(
  deviceId: string,
  pin: number,
  value: 0 | 1
): void {
  const key = getCommandKey(deviceId, pin);
  const pending = pendingCommands.get(key);

  // Log incoming GPIO confirmation
  const debugStore = useMQTTDebugStore.getState();
  if (debugStore.enabled) {
    debugStore.addLog({
      direction: 'incoming',
      topic: `saphari/${deviceId}/gpio/${pin}`,
      payload: String(value),
    });
  }

  if (pending) {
    clearTimeout(pending.timeoutId);
    pendingCommands.delete(key);
    
    const confirmed = value === pending.expectedState;
    console.log(`📥 GPIO confirmation: ${deviceId} pin ${pin} = ${value} (expected: ${pending.expectedState}, confirmed: ${confirmed})`);
    pending.resolve(confirmed);
  } else {
    console.log(`📥 GPIO update (no pending command): ${deviceId} pin ${pin} = ${value}`);
  }
}

/**
 * Check if there's a pending command for a device/pin
 */
export function hasPendingCommand(deviceId: string, pin: number): boolean {
  return pendingCommands.has(getCommandKey(deviceId, pin));
}
