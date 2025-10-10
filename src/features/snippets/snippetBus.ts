export interface Snippet {
  deviceId: string;
  key: string;
  value: any;
}

type SnipListener = (snippet: Snippet) => void;
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
export const SnippetBus = {
  on(fn: SnipListener) { return snippetBus.subscribe(fn); },
  emitSnippet(code: string, meta?: Record<string, any>) { 
    // Convert to new format if needed
    if (meta?.deviceId && meta?.key) {
      snippetBus.emit({ deviceId: meta.deviceId, key: meta.key, value: code });
    }
  },
};
