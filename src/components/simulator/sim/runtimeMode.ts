/**
 * Simulation engine mode: UI loop (main thread) or Worker (background thread).
 * Persisted in localStorage so dev can keep Worker mode on.
 */

export const RuntimeMode = {
  UI_LOOP: 'UI_LOOP',
  WORKER: 'WORKER',
} as const;

export type RuntimeModeType = (typeof RuntimeMode)[keyof typeof RuntimeMode];

const STORAGE_KEY = 'saphari:simRuntimeMode';

function readStored(): RuntimeModeType {
  if (typeof window === 'undefined') return RuntimeMode.UI_LOOP;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === RuntimeMode.WORKER) return RuntimeMode.WORKER;
  return RuntimeMode.UI_LOOP;
}

let currentMode: RuntimeModeType = readStored();

export function getRuntimeMode(): RuntimeModeType {
  return currentMode;
}

export function setRuntimeMode(mode: RuntimeModeType): void {
  currentMode = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}
