export type Severity = 'info' | 'warning' | 'critical';
export type Channel = 'app' | 'toast' | 'browser' | 'push' | 'email' | 'slack' | 'discord' | 'telegram' | 'webhook';

export interface AlertCondition {
  key?: string;
  op?: '>'|'>='|'<'|'<='|'=='|'!=';
  value?: number | string;
  address?: string; // For widget-based conditions
}

export type AlertRule = {
  id: string;
  name: string;
  deviceId: string;
  source: 'GPIO' | 'SENSOR' | 'LOGIC';
  // GPIO
  pin?: number;
  whenPinEquals?: 0|1;
  // SENSOR/LOGIC
  key?: string;
  op?: '>'|'>='|'<'|'<='|'=='|'!=';
  value?: number | string;

  severity?: Severity;
  channels?: Channel[];
  debounceMs?: number;
  hysteresis?: number;
  once?: boolean;
  isActive?: boolean;

  // Optional UX controls
  qhStart?: string; // '22:00'
  qhEnd?: string;   // '06:00'
  maintFrom?: string; // ISO
  maintTo?: string;   // ISO
  tags?: string[];
};

export type AlertEntry = {
  id: string;
  ruleId: string;
  ruleName: string;
  deviceId: string;
  value: number | string | null;
  severity: Severity;
  channels: Channel[];
  ts: number;
  seen: boolean;
  ack: boolean;
  tags?: string[];
};
