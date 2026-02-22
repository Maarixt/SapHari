/**
 * Internal event bus for simulator. Replaces window.dispatchEvent for sim events.
 * New code must not use window events for SET_OUTPUT, SET_SERVO, SHORT_CIRCUIT, WARNING.
 */

export type SetOutputPayload = { pin: number; state: boolean };
export type SetServoPayload = { addr: string | number; angle: number };
export type ShortCircuitPayload = {
  netId?: string;
  pins?: { compId: string; pinId: string }[];
};
export type WarningPayload = {
  id: string;
  code: string;
  message: string;
  severity: string;
  componentId?: string;
  netId?: string;
  timestamp?: number;
  [key: string]: unknown;
};
export type SensorUpdatePayload = Record<string, unknown>;

export type SimEventType =
  | 'SET_OUTPUT'
  | 'SET_SERVO'
  | 'SHORT_CIRCUIT'
  | 'WARNING'
  | 'SENSOR_UPDATE';

export type SimEventPayload =
  | SetOutputPayload
  | SetServoPayload
  | ShortCircuitPayload
  | WarningPayload
  | SensorUpdatePayload;

type Handler<T = SimEventPayload> = (payload: T) => void;

const listeners = new Map<SimEventType, Set<Handler>>();

function getHandlers(type: SimEventType): Set<Handler> {
  let set = listeners.get(type);
  if (!set) {
    set = new Set();
    listeners.set(type, set);
  }
  return set;
}

export function publish(type: SimEventType, payload?: SimEventPayload): void {
  const handlers = listeners.get(type);
  if (!handlers) return;
  const p = payload ?? {};
  handlers.forEach((h) => {
    try {
      h(p as SimEventPayload);
    } catch (err) {
      console.warn('[simEvents] handler error:', err);
    }
  });
}

export function subscribe<T extends SimEventPayload = SimEventPayload>(
  type: SimEventType,
  handler: Handler<T>
): () => void {
  const set = getHandlers(type);
  set.add(handler as Handler);
  return () => set.delete(handler as Handler);
}
