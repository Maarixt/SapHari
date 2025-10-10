import { AlertRule } from './alertsTypes';

let rules: AlertRule[] = JSON.parse(localStorage.getItem('alert.rules')||'[]');
let history: any[] = JSON.parse(localStorage.getItem('alert.history')||'[]');

const subs: Array<() => void> = [];
const lastFire: Record<string, number> = {};
const armed: Record<string, 'above'|'below'> = {};

function save(){ localStorage.setItem('alert.rules', JSON.stringify(rules)); }
function saveH(){ localStorage.setItem('alert.history', JSON.stringify(history)); }
function notify(){ subs.forEach(fn=>fn()); }

export const AlertsStore = {
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
};
