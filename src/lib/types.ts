export type Role = 'owner' | 'viewer' | 'operator' | 'collaborator';

export interface Device {
  id: string;
  device_id: string;
  device_key: string;
  name: string;
  online: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
  user_id?: string; // For backward compatibility
}

export interface Widget {
  id: string;
  device_id: string;
  type: 'switch' | 'gauge' | 'servo' | 'alert';
  label: string;
  address: string;
  pin?: number | null;
  echo_pin?: number | null;
  gauge_type?: 'analog' | 'pir' | 'ds18b20' | 'ultrasonic' | null;
  min_value?: number | null;
  max_value?: number | null;
  override_mode?: boolean | null;
  trigger?: number | null;
  message?: string | null;
  state?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Collaborator {
  id: string;
  device_id: string;
  user_email: string;
  role: 'viewer' | 'operator' | 'collaborator';
  invited_at: string;
}

export interface DeviceWithRole extends Device {
  userRole: Role;
  collaborators?: Collaborator[];
}