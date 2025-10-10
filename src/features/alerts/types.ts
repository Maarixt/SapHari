export type AlertSource = 'GPIO' | 'SENSOR' | 'LOGIC';

export interface AlertRule {
  id: string;
  name: string;
  deviceId: string;
  source: AlertSource;
  pin?: number;
  whenPinEquals?: 0 | 1;
  key?: string;
  op?: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value?: number | string;
  debounceMs?: number;
  hysteresis?: number;
  once?: boolean;
  isActive?: boolean;
}

export interface AlertEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  deviceId: string;
  value: number | string | null;
  ts: number;
  seen: boolean;
  ack: boolean;
}
