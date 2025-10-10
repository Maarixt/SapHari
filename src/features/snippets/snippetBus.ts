type SnipListener = (code: string, meta?: Record<string, any>) => void;
let listeners: SnipListener[] = [];

export const SnippetBus = {
  on(fn: SnipListener){ listeners.push(fn); return () => { listeners = listeners.filter(f=>f!==fn); }; },
  emitSnippet(code: string, meta?: Record<string, any>){ listeners.forEach(fn => fn(code, meta)); },
};
