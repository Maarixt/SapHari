// Command acknowledgment system types and schemas

export interface CommandPayload {
  cmd_id: string;
  action: string;
  pin?: number;
  state?: number | boolean;
  value?: number;
  duration?: number;
  ts: number;
  metadata?: Record<string, any>;
}

export interface CommandAck {
  cmd_id: string;
  ok: boolean;
  error?: string;
  result?: any;
  ts: number;
}

export interface CommandRecord {
  id: string;
  device_id: string;
  cmd_id: string;
  payload: CommandPayload;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed' | 'timeout';
  retries: number;
  max_retries: number;
  last_attempt: string;
  created_at: string;
  acknowledged_at?: string;
  expires_at: string;
}

export interface CommandStats {
  device_id: string;
  total_commands: number;
  successful_commands: number;
  failed_commands: number;
  timeout_commands: number;
  success_rate: number;
}

// Command action types
export type CommandAction = 
  | 'relay'
  | 'pwm'
  | 'digital_write'
  | 'analog_write'
  | 'digital_read'
  | 'analog_read'
  | 'restart'
  | 'ota_update'
  | 'config_update'
  | 'status_request';

// Command status types
export type CommandStatus = 
  | 'pending'
  | 'sent'
  | 'acknowledged'
  | 'failed'
  | 'timeout';

// Command retry configuration
export interface RetryConfig {
  maxRetries: number;
  timeoutMs: number;
  backoffMs: number;
  exponentialBackoff: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  timeoutMs: 5000,
  backoffMs: 1000,
  exponentialBackoff: true
};

// Command generation utilities
export function generateCommandId(): string {
  return `CMD_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function createCommand(
  action: CommandAction,
  deviceId: string,
  options: {
    pin?: number;
    state?: number | boolean;
    value?: number;
    duration?: number;
    metadata?: Record<string, any>;
  } = {}
): CommandPayload {
  return {
    cmd_id: generateCommandId(),
    action,
    pin: options.pin,
    state: options.state,
    value: options.value,
    duration: options.duration,
    ts: Math.floor(Date.now() / 1000),
    metadata: options.metadata
  };
}

// Command validation
export function validateCommand(payload: any): payload is CommandPayload {
  return (
    typeof payload === 'object' &&
    typeof payload.cmd_id === 'string' &&
    typeof payload.action === 'string' &&
    typeof payload.ts === 'number' &&
    payload.cmd_id.length > 0 &&
    payload.action.length > 0
  );
}

// Command acknowledgment validation
export function validateCommandAck(ack: any): ack is CommandAck {
  return (
    typeof ack === 'object' &&
    typeof ack.cmd_id === 'string' &&
    typeof ack.ok === 'boolean' &&
    typeof ack.ts === 'number' &&
    ack.cmd_id.length > 0
  );
}

// Command timeout calculation
export function calculateCommandTimeout(retries: number, config: RetryConfig): number {
  if (!config.exponentialBackoff) {
    return config.timeoutMs;
  }
  
  return config.timeoutMs * Math.pow(2, retries);
}

// Command retry delay calculation
export function calculateRetryDelay(retries: number, config: RetryConfig): number {
  if (!config.exponentialBackoff) {
    return config.backoffMs;
  }
  
  return config.backoffMs * Math.pow(2, retries);
}
