export interface Snippet {
  deviceId: string;
  key: string;
  value: any;
}

export type SnipListener = (snippet: Snippet) => void;
let listeners: SnipListener[] = [];

export const snippetBus = {
  subscribe(fn: SnipListener) { 
    listeners.push(fn); 
    return () => { listeners = listeners.filter(f => f !== fn); }; 
  },
  emit(snippet: Snippet) { 
    listeners.forEach(fn => fn(snippet)); 
  },
};

// Legacy exports for backward compatibility
type LegacyListener = (code: string, meta?: Record<string, any>) => void;
export const SnippetBus = {
  on(fn: LegacyListener) { 
    const wrappedFn: SnipListener = (snippet) => {
      fn(snippet.value, { deviceId: snippet.deviceId, key: snippet.key });
    };
    listeners.push(wrappedFn);
    return () => { listeners = listeners.filter(f => f !== wrappedFn); };
  },
  emitSnippet(code: string, meta?: Record<string, any>) { 
    if (meta?.deviceId && meta?.key) {
      snippetBus.emit({ deviceId: meta.deviceId, key: meta.key, value: code });
    }
  },
};
