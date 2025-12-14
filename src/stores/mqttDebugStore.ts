import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { registerCleanup } from '@/services/stateResetService';

interface MQTTDebugEntry {
  id: string;
  timestamp: number;
  direction: 'outgoing' | 'incoming';
  topic: string;
  payload: string;
}

interface MQTTDebugStore {
  enabled: boolean;
  logs: MQTTDebugEntry[];
  setEnabled: (enabled: boolean) => void;
  addLog: (entry: Omit<MQTTDebugEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

const MAX_LOGS = 100;

export const useMQTTDebugStore = create<MQTTDebugStore>()(
  persist(
    (set) => ({
      enabled: false,
      logs: [],
      setEnabled: (enabled) => set({ enabled }),
      addLog: (entry) => set((state) => {
        if (!state.enabled) return state;
        const newEntry: MQTTDebugEntry = {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
        };
        const newLogs = [newEntry, ...state.logs].slice(0, MAX_LOGS);
        return { logs: newLogs };
      }),
      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: 'saphari-mqtt-debug',
      // Only persist enabled state, NOT logs (which may contain user data)
      partialize: (state) => ({ enabled: state.enabled }),
    }
  )
);

/**
 * Clear debug logs on logout
 */
function clearDebugLogs(): void {
  console.log('🧹 MQTTDebugStore: Clearing logs');
  useMQTTDebugStore.getState().clearLogs();
}

// Register cleanup
registerCleanup(clearDebugLogs);
