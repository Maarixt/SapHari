export type AlertSource = 'GPIO' | 'SENSOR' | 'LOGIC';
export type TriggerEdge = 'rising' | 'falling' | 'high' | 'low';

export interface AlertRule {
  id: string;
  name: string;
  deviceId: string;
  source: AlertSource;
  // GPIO fields
  pin?: number;
  trigger?: TriggerEdge; // 'rising' = LOW→HIGH, 'falling' = HIGH→LOW
  whenPinEquals?: 0 | 1; // legacy - kept for backwards compat
  // Sensor/Logic fields
  key?: string;
  op?: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value?: number | string;
  // Alert behavior
  message?: string; // Custom alert message
  cooldownMs?: number; // Anti-spam cooldown (default 10000ms)
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
  message?: string; // The custom message when fired
  edge?: TriggerEdge; // What edge triggered it
  ts: number;
  seen: boolean;
  ack: boolean;
}
