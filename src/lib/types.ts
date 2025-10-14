// Enhanced type definitions for SapHari IoT Platform

export interface Device {
  id: string;
  device_id: string;
  name: string;
  device_key: string;
  model?: string;
  firmware?: string;
  firmware_version?: string;
  owner_id?: string;
  online?: boolean;
  last_seen?: string;
  location?: { lat: number; lng: number } | null;
  tags?: string[];
  created_at: string;
  updated_at: string;
  user_id?: string; // For backward compatibility
  lastSeen?: number; // For real-time status
  profiles?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface DeviceWithRole extends Device {
  role?: string;
}

export interface User {
  id: string;
  email: string;
  display_name?: string;
  full_name?: string;
  role?: 'master' | 'admin' | 'tech' | 'user';
  tenant_id?: string;
  last_login?: string;
  status?: 'active' | 'suspended' | 'pending' | 'locked';
  created_at: string;
  tenants?: {
    name: string;
  };
}

export interface DeviceFilters {
  online?: boolean;
  firmware?: string;
  owner_id?: string;
  tenant_id?: string;
  model?: string;
  tags?: string[];
}

export interface UserFilters {
  role?: string;
  status?: string;
  tenant_id?: string;
}

export interface TelemetryData {
  id: number;
  device_id: string;
  topic: string;
  ts: string;
  v_num?: number;
  v_str?: string;
  v_json?: Record<string, unknown>;
}

export interface TelemetrySeries {
  t: string;
  y: number;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warn' | 'crit';
  state: 'open' | 'ack' | 'closed';
  device_id?: string;
  tenant_id?: string;
  ack_by?: string;
  closed_at?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor: string;
  tenant_id?: string;
  action: string;
  subject?: string;
  meta?: Record<string, unknown>;
  created_at: string;
  profiles?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  revoked: boolean;
  profiles?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface IpRule {
  id: number;
  rule: 'allow' | 'deny';
  cidr: string;
  created_at: string;
}

export interface SystemStatus {
  component: string;
  version: string;
  ok: boolean;
  updated_at: string;
  meta?: Record<string, unknown>;
}

export interface Backup {
  id: number;
  label: string;
  created_at: string;
  size_bytes: number;
  location: string;
}

export interface SimulatorBinding {
  id: string;
  device_id: string;
  script: string;
  enabled: boolean;
  created_at: string;
  device_name?: string;
}

export interface TestMetrics {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  execution_time: number;
  last_run: string;
}

export interface MasterKPIs {
  total_users: number;
  online_devices: number;
  storage_usage: number;
  uptime_percentage: number;
}

export interface FleetKPIs {
  total_devices: number;
  active_devices: number;
  alerts_count: number;
  avg_response_time: number;
}

export interface DeviceHealth {
  device_id: string;
  status: 'healthy' | 'warning' | 'critical';
  last_seen: string;
  metrics: Record<string, number>;
}

export interface RecentEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
  device_id?: string;
}

// Simulator types
export interface SimComponent {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  properties: Record<string, unknown>;
}

export interface SimNet {
  id: string;
  name: string;
  voltage: number;
  components: string[];
}

export interface SimState {
  components: SimComponent[];
  nets: SimNet[];
  time: number;
  running: boolean;
}

export interface Warning {
  id: string;
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  componentId?: string;
  netId?: string;
  timestamp: number;
}

// Command types
export interface Command {
  id: string;
  device_id: string;
  command: string;
  payload?: Record<string, unknown>;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed';
  created_at: string;
  acknowledged_at?: string;
}

export interface CommandFilters {
  device_id?: string;
  status?: string;
  command?: string;
}

// Widget types - matching database schema
export interface Widget {
  id: string;
  device_id: string;
  type: 'gauge' | 'servo' | 'switch' | 'alert';
  label: string;
  address: string;
  pin: number;
  echo_pin?: number;
  gauge_type?: 'analog' | 'pwm' | 'digital' | 'ultrasonic' | 'ds18b20' | 'pir';
  min_value?: number;
  max_value?: number;
  override_mode?: boolean;
  state?: any;
  trigger?: string;
  message?: string;
  created_at: string;
  updated_at: string;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

// Role and permission types
export interface Role {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Form types
export interface CreateUserForm {
  email: string;
  full_name: string;
  role: string;
  password?: string;
}

export interface UpdateUserForm {
  full_name?: string;
  role?: string;
  status?: string;
}

export interface CreateDeviceForm {
  device_id: string;
  name: string;
  model?: string;
  firmware?: string;
  owner_id?: string;
  tags?: string[];
}

export interface UpdateDeviceForm {
  name?: string;
  model?: string;
  firmware?: string;
  owner_id?: string;
  tags?: string[];
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Configuration types
export interface AppConfig {
  version: string;
  name: string;
  debug: boolean;
  api_timeout: number;
  mqtt_reconnect_interval: number;
  max_retries: number;
}

// Event types
export interface MqttMessage {
  topic: string;
  payload: string | Buffer;
  qos: 0 | 1 | 2;
  retain: boolean;
}

export interface DeviceEvent {
  device_id: string;
  event_type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;