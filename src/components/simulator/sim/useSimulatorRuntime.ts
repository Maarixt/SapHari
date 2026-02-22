/**
 * Simulation layer: start/stop the run loop when running toggles.
 * UI_LOOP: uses startLoop from runLoop.ts. WORKER: uses sim/worker with INIT/PLAY/PAUSE.
 */

import { useEffect, useRef } from 'react';
import { startLoop } from '../runLoop';
import type { SimState } from '../types';
import type { CircuitState } from '../store/circuitStore';
import { toSimState } from '../store/circuitStore';
import { getRuntimeMode, RuntimeMode } from './runtimeMode';
import { toCoreState, fromCoreState } from './adapters';
import { publish as publishSimEvent } from '../events/simEvents';

export interface UseSimulatorRuntimeOptions {
  running: boolean;
  getState: () => CircuitState;
  replaceSimState: (payload: { components: SimState['components']; wires: SimState['wires']; running?: boolean }) => void;
  batchUpdateComponentProps: (updates: { id: string; props: Record<string, unknown> }[]) => void;
  publishMessage: (topic: string, message: string, retain?: boolean) => void;
  simId: string;
}

function propsEqual(a: Record<string, unknown> | undefined, b: Record<string, unknown> | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export function useSimulatorRuntime({
  running,
  getState,
  replaceSimState,
  batchUpdateComponentProps,
  publishMessage,
  simId,
}: UseSimulatorRuntimeOptions) {
  const getStateRef = useRef(getState);
  getStateRef.current = getState;
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!running) {
      if (getRuntimeMode() === RuntimeMode.WORKER && workerRef.current) {
        workerRef.current.postMessage({ type: 'PAUSE' });
      }
      return;
    }

    if (getRuntimeMode() === RuntimeMode.WORKER) {
      try {
        const worker = new Worker(new URL('../../../sim/worker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        worker.postMessage({
          type: 'INIT',
          payload: { state: toCoreState(getStateRef.current()), seed: 0, enableProfiler: false },
        });
        worker.postMessage({ type: 'PLAY' });

        worker.onmessage = (event: MessageEvent<{ type: string; payload?: unknown }>) => {
          const { type, payload } = event.data;
          if (type === 'STATE' && payload && typeof payload === 'object' && 'state' in payload) {
            const coreState = (payload as { state: Parameters<typeof fromCoreState>[0] }).state;
            const next = fromCoreState(coreState);
            const prev = toSimState(getStateRef.current());
            const sameStructure =
              prev.components.length === next.components.length &&
              prev.wires.length === next.wires.length &&
              prev.components.every((c, i) => c.id === next.components[i]?.id) &&
              prev.wires.every((w, i) => w.id === next.wires[i]?.id);
            if (sameStructure) {
              const updates: { id: string; props: Record<string, unknown> }[] = [];
              for (let i = 0; i < next.components.length; i++) {
                const c = next.components[i];
                const p = prev.components.find((x) => x.id === c.id);
                if (p && !propsEqual(p.props, c.props)) {
                  updates.push({ id: c.id, props: c.props ?? {} });
                }
              }
              if (updates.length > 0) {
                batchUpdateComponentProps(updates);
              }
            } else {
              replaceSimState({ components: next.components, wires: next.wires });
            }
          }
          if (type === 'WARNING' && payload) {
            publishSimEvent('WARNING', payload as Parameters<typeof publishSimEvent>[1]);
          }
          if (type === 'ERROR' && payload) {
            console.error('Simulator worker error:', payload);
          }
        };

        return () => {
          worker.terminate();
          workerRef.current = null;
        };
      } catch (err) {
        console.warn('Worker mode failed, falling back to UI loop:', err);
        // fall through to UI loop
      }
    }

    const getSimState = (): SimState => toSimState(getStateRef.current());
    const setState = (updater: SimState | ((prev: SimState) => SimState)) => {
      const next = typeof updater === 'function' ? updater(getSimState()) : updater;
      const prev = getSimState();
      const sameStructure =
        prev.components.length === next.components.length &&
        prev.wires.length === next.wires.length &&
        prev.components.every((c, i) => c.id === next.components[i]?.id) &&
        prev.wires.every((w, i) => w.id === next.wires[i]?.id);
      if (sameStructure) {
        const updates: { id: string; props: Record<string, unknown> }[] = [];
        for (let i = 0; i < next.components.length; i++) {
          const c = next.components[i];
          const p = prev.components.find((x) => x.id === c.id);
          if (p && !propsEqual(p.props, c.props)) {
            updates.push({ id: c.id, props: c.props ?? {} });
          }
        }
        if (updates.length > 0) {
          batchUpdateComponentProps(updates);
        }
      } else {
        replaceSimState({
          components: next.components,
          wires: next.wires,
          running: next.running,
        });
      }
    };

    const stopLoop = startLoop(getSimState, setState, publishMessage, simId);
    return stopLoop;
  }, [running, replaceSimState, batchUpdateComponentProps, publishMessage, simId]);
}
