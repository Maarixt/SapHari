/**
 * Simulation API Hook
 * Provides components with access to simulation context and methods
 */

import { createContext, useContext, useCallback } from 'react';
import { SimCtx } from '../core/types';

interface SimApiContextType {
  getComponent: (partId: string) => any;
  nowMs: () => number;
  ctx: SimCtx;
  invalidate: () => void;
}

const SimApiContext = createContext<SimApiContextType | null>(null);

export function SimApiProvider({ children, value }: { children: React.ReactNode; value: SimApiContextType }) {
  return (
    <SimApiContext.Provider value={value}>
      {children}
    </SimApiContext.Provider>
  );
}

export function useSimApi(): SimApiContextType {
  const context = useContext(SimApiContext);
  if (!context) {
    throw new Error('useSimApi must be used within a SimApiProvider');
  }
  return context;
}

// Mock implementation for now
export function createMockSimApi(): SimApiContextType {
  return {
    getComponent: (partId: string) => {
      // Mock component - in real implementation, this would get the actual component
      return {
        setPressed: (pressed: boolean, ctx: SimCtx, nowMs: number) => {
          console.log(`Button ${partId} pressed: ${pressed} at ${nowMs}ms`);
        }
      };
    },
    nowMs: () => Date.now(),
    ctx: {
      getNetV: (netId: string) => 0,
      setNetV: (netId: string, v: number) => {},
      readDigital: (netId: string) => 0,
      writeDigital: (netId: string, lvl: 0 | 1) => {},
      readAnalog: (netId: string) => 0,
      writeAnalog: (netId: string, v: number) => {},
      schedule: (fn: () => void, delayMs: number) => {
        setTimeout(fn, delayMs);
      },
      raiseInterrupt: (pin: number, edge: 'RISING' | 'FALLING' | 'CHANGE') => {},
      rng: () => Math.random(),
      warn: (code: string, msg: string) => {
        console.warn(`[${code}] ${msg}`);
      },
      getTime: () => Date.now(),
      getTimeScale: () => 1.0
    },
    invalidate: () => {
      // Request UI redraw
      console.log('UI invalidation requested');
    }
  };
}
