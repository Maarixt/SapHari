import { AlertEntry, AlertRule } from './types';

let openManageUI: null | (() => void) = null;

const LS_RULES = 'alerts.rules.v1';
const LS_HISTORY = 'alerts.history.v1';

type Fn = () => void;
let subs: Fn[] = [];
function notify(){ subs.forEach(f => f()); }

let rules: AlertRule[] = JSON.parse(localStorage.getItem(LS_RULES) || '[]');
let history: AlertEntry[] = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');

const lastFireAt: Record<string, number> = {};
const armedSide: Record<string, 'above' | 'below'> = {};

function saveRules(){ localStorage.setItem(LS_RULES, JSON.stringify(rules)); }
function saveHistory(){ localStorage.setItem(LS_HISTORY, JSON.stringify(history)); }

export const AlertsStore = {
  subscribe(fn: Fn){ subs.push(fn); return () => { subs = subs.filter(s => s !== fn); }; },

  listRules(){ return [...rules]; },
  addRule(r: AlertRule){ rules.push(r); saveRules(); notify(); },
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
};
