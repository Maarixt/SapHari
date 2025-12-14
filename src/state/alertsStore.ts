import { AlertRule } from '@/features/alerts/types';

// Use user-scoped keys - will be set dynamically
let currentUserId: string | null = null;
const getStorageKey = (base: string) => currentUserId ? `saphari:${currentUserId}:${base}` : base;

// State variables - loaded per user
let rules: AlertRule[] = [];
let history: any[] = [];

const subs: Array<() => void> = [];
const lastFire: Record<string, number> = {};
const armed: Record<string, 'above'|'below'> = {};

function loadFromStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    rules = JSON.parse(localStorage.getItem(getStorageKey('alert.rules')) || '[]');
    history = JSON.parse(localStorage.getItem(getStorageKey('alert.history')) || '[]');
  } catch (e) {
    console.warn('Failed to load alert state:', e);
    rules = [];
    history = [];
  }
}

function save(){ 
  if (currentUserId) {
    localStorage.setItem(getStorageKey('alert.rules'), JSON.stringify(rules)); 
  }
}

function saveH(){ 
  if (currentUserId) {
    localStorage.setItem(getStorageKey('alert.history'), JSON.stringify(history)); 
  }
}

function notify(){ subs.forEach(fn=>fn()); }

/**
 * Clear all state - called on logout
 */
function clearAllState(): void {
  console.log('🧹 AlertsStore (state): Clearing all state');
  
  rules = [];
  history = [];
  Object.keys(lastFire).forEach(key => delete lastFire[key]);
  Object.keys(armed).forEach(key => delete armed[key]);
  
  currentUserId = null;
  notify();
}

export const AlertsStore = {
  /**
   * Initialize store for a specific user - MUST be called after login
   */
  initForUser(userId: string): void {
    if (currentUserId === userId) return;
    
    console.log(`📋 AlertsStore (state): Initializing for user ${userId.substring(0, 8)}...`);
    currentUserId = userId;
    loadFromStorage();
    notify();
  },

  subscribe(fn: ()=>void){ subs.push(fn); return ()=>{ const i=subs.indexOf(fn); if(i>=0) subs.splice(i,1);} },
  listRules(){ return [...rules]; },
  updateRule(r: AlertRule){ const i = rules.findIndex(x=>x.id===r.id); if(i>=0) rules[i]=r; else rules.push(r); save(); notify(); },
  deleteRule(id: string){ rules = rules.filter(r=>r.id!==id); save(); notify(); },
  listHistory(){ return [...history]; },
  pushHistory(entry: any){ history.unshift(entry); if(history.length>300) history.pop(); saveH(); notify(); },
  countUnread(){ return history.filter(h => !h.seen).length; },
  markAllSeen(){ history.forEach(h => h.seen = true); saveH(); notify(); },
  ack(id: string){ const h = history.find(x => x.id === id); if(h) { h.ack = true; h.seen = true; saveH(); notify(); } },

  getLastFire(id: string){ return lastFire[id]||0; },
  setLastFire(id: string, ts: number){ lastFire[id]=ts; },
  getArmed(id: string){ return armed[id]; },
  setArmed(id: string, side: 'above'|'below'){ armed[id]=side; },

  /**
   * Clear all state - CRITICAL for logout
   */
  clear: clearAllState
};
