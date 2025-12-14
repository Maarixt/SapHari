import { AlertEntry, AlertRule } from './types';

let openManageUI: null | (() => void) = null;

// Use user-scoped keys - will be set dynamically
let currentUserId: string | null = null;
const getStorageKey = (base: string) => currentUserId ? `saphari:${currentUserId}:${base}` : base;

const LS_RULES_BASE = 'alerts.rules';
const LS_HISTORY_BASE = 'alerts.history';

type Fn = () => void;
let subs: Fn[] = [];
function notify(){ subs.forEach(f => f()); }

// State variables
let rules: AlertRule[] = [];
let history: AlertEntry[] = [];

const lastFireAt: Record<string, number> = {};
const armedSide: Record<string, 'above' | 'below'> = {};

function loadFromStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    rules = JSON.parse(localStorage.getItem(getStorageKey(LS_RULES_BASE)) || '[]');
    history = JSON.parse(localStorage.getItem(getStorageKey(LS_HISTORY_BASE)) || '[]');
  } catch (e) {
    console.warn('Failed to load alerts from storage:', e);
    rules = [];
    history = [];
  }
}

function saveRules(): void { 
  if (currentUserId) {
    localStorage.setItem(getStorageKey(LS_RULES_BASE), JSON.stringify(rules)); 
  }
}

function saveHistory(): void { 
  if (currentUserId) {
    localStorage.setItem(getStorageKey(LS_HISTORY_BASE), JSON.stringify(history)); 
  }
}

/**
 * Clear all alert state - called on logout
 */
function clearAllState(): void {
  console.log('🧹 AlertsStore: Clearing all state');
  
  // Clear in-memory state
  rules = [];
  history = [];
  Object.keys(lastFireAt).forEach(key => delete lastFireAt[key]);
  Object.keys(armedSide).forEach(key => delete armedSide[key]);
  
  currentUserId = null;
  notify();
}

export const AlertsStore = {
  /**
   * Initialize store for a specific user - MUST be called after login
   */
  initForUser(userId: string): void {
    if (currentUserId === userId) return; // Already initialized for this user
    
    console.log(`📋 AlertsStore: Initializing for user ${userId.substring(0, 8)}...`);
    currentUserId = userId;
    loadFromStorage();
    notify();
  },

  subscribe(fn: Fn){ subs.push(fn); return () => { subs = subs.filter(s => s !== fn); }; },

  listRules(){ return [...rules]; },
  addRule(r: AlertRule){ 
    rules.push(r); 
    saveRules(); 
    notify(); 
  },
  updateRule(r: AlertRule){
    const i = rules.findIndex(x => x.id === r.id);
    if (i >= 0) rules[i] = r; else rules.push(r);
    saveRules(); notify();
  },
  deleteRule(id: string){ rules = rules.filter(r => r.id !== id); saveRules(); notify(); },

  listHistory(){ return [...history]; },
  countUnread(){ return history.filter(h => !h.seen).length; },
  markAllSeen(){ history.forEach(h => h.seen = true); saveHistory(); notify(); },
  ack(id: string){
    const h = history.find(x => x.id === id);
    if (!h) return;
    h.ack = true; h.seen = true;
    saveHistory(); notify();
  },

  _push(entry: AlertEntry){
    history.unshift(entry);
    if (history.length > 300) history.pop();
    saveHistory(); notify();
  },

  _getLastFire(ruleId: string){ return lastFireAt[ruleId] || 0; },
  _setLastFire(ruleId: string, ts: number){ lastFireAt[ruleId] = ts; },
  _getArmed(ruleId: string){ return armedSide[ruleId]; },
  _setArmed(ruleId: string, side: 'above' | 'below'){ armedSide[ruleId] = side; },

  openManageModal(){ openManageUI?.(); },
  _bindManageModal(opener: () => void){ openManageUI = opener; },

  /**
   * Clear all state - CRITICAL for logout
   */
  clear: clearAllState,

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null { return currentUserId; }
};
