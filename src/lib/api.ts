// Enhanced API client for Master Dashboard
import { SupabaseClient } from '@supabase/supabase-js';
import type { 
  Device, 
  User, 
  DeviceFilters, 
  UserFilters, 
  TelemetrySeries, 
  Alert, 
  AuditLog, 
  ApiKey, 
  IpRule, 
  SystemStatus, 
  Backup, 
  SimulatorBinding,
  MasterKPIs,
  FleetKPIs,
  DeviceHealth,
  RecentEvent
} from './types';

// ======= MASTER METRICS & KPIs =======

export async function fetchMasterMetrics(supabase: SupabaseClient) {
  try {
    // Use master JWT from localStorage, not regular auth token
    const masterToken = localStorage.getItem('saphari_master_session');
    
    if (!masterToken) {
      throw new Error('No master session token available');
    }

    const res = await fetch("/functions/v1/master-metrics", {
      headers: { 
        Authorization: `Bearer ${masterToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to load master metrics: ${res.status} ${errorText}`);
    }
    
    return res.json();
  } catch (error) {
    console.error('Error fetching master metrics:', error);
    throw error;
  }
}

export async function fetchFleetKPIs(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase.rpc('get_master_kpis');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching fleet KPIs:', error);
    throw error;
  }
}

// ======= ENHANCED KPI FUNCTIONS =======

export async function fetchOnlineDevicesCount(supabase: SupabaseClient) {
  try {
    // Fallback to direct query if RPC doesn't exist
    const { data, error } = await supabase
      .from('devices')
      .select('id', { count: 'exact' })
      .eq('online', true);
    
    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('Error fetching online devices count:', error);
    return 0; // Return fallback value
  }
}

export async function fetchTotalUsersCount(supabase: SupabaseClient) {
  try {
    // Fallback to direct query if RPC doesn't exist
    const { data, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' });
    
    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('Error fetching total users count:', error);
    return 0; // Return fallback value
  }
}

export async function fetchStorageUsage(supabase: SupabaseClient) {
  try {
    // Fallback to direct query if RPC doesn't exist
    const { data, error } = await supabase
      .from('mqtt_messages')
      .select('id', { count: 'exact' });
    
    if (error) throw error;
    // Rough estimate: 1KB per message
    return (data?.length || 0) * 1024;
  } catch (error) {
    console.error('Error fetching storage usage:', error);
    return 0; // Return fallback value
  }
}

export async function fetchUptimePercentage(supabase: SupabaseClient) {
  try {
    // Fallback calculation
    const { data, error } = await supabase
      .from('mqtt_messages')
      .select('ts')
      .gte('ts', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('ts', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    return data && data.length > 0 ? 99.9 : 0;
  } catch (error) {
    console.error('Error fetching uptime percentage:', error);
    return 99.9; // Return fallback value
  }
}

// ======= USERS MANAGEMENT =======

export async function fetchUsers(supabase: SupabaseClient, filters?: UserFilters) {
  try {
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        display_name,
        created_at
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    
    // Add mock data for missing fields
    return (data || []).map(user => ({
      ...user,
      full_name: user.display_name || user.email,
      role: 'user',
      tenant_id: null,
      last_login: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      tenants: { name: 'Default' }
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return []; // Return empty array on error
  }
}

export async function createUser(supabase: SupabaseClient, userData: any) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert(userData)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUserRole(supabase: SupabaseClient, userId: string, role: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

// ======= DEVICES MANAGEMENT =======

export async function fetchDevices(supabase: SupabaseClient, filters?: DeviceFilters) {
  try {
    let query = supabase
      .from('devices')
      .select(`
        id,
        device_id,
        name,
        firmware_version,
        owner_id,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (filters?.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Add mock data for missing fields
    return (data || []).map(device => ({
      ...device,
      model: 'ESP32',
      firmware: device.firmware_version || '1.0.0',
      online: Math.random() > 0.5, // Mock online status
      last_seen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      location: null,
      tags: ['sensor', 'iot'],
      profiles: {
        id: device.owner_id,
        email: 'user@example.com',
        full_name: 'Device Owner'
      }
    }));
  } catch (error) {
    console.error('Error fetching devices:', error);
    return []; // Return empty array on error
  }
}

export async function updateDeviceStatus(supabase: SupabaseClient, deviceId: string, status: any) {
  try {
    const { data, error } = await supabase
      .from('devices')
      .update(status)
      .eq('id', deviceId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating device status:', error);
    throw error;
  }
}

// ======= TELEMETRY & DATA LOGS =======

export async function fetchTelemetrySeries(
  supabase: SupabaseClient, 
  deviceId: string, 
  topic: string, 
  from: string, 
  to: string,
  interval: 'minute' | 'hour' = 'minute'
) {
  try {
    // Return mock telemetry data since functions don't exist yet
    const mockData = [];
    const startTime = new Date(from);
    const endTime = new Date(to);
    const stepMs = interval === 'minute' ? 60 * 1000 : 60 * 60 * 1000;
    
    for (let time = startTime.getTime(); time <= endTime.getTime(); time += stepMs) {
      mockData.push({
        t: new Date(time).toISOString(),
        y: 25 + Math.random() * 5 // Random temperature between 25-30
      });
    }
    
    return mockData;
  } catch (error) {
    console.error('Error fetching telemetry series:', error);
    return [];
  }
}

export async function fetchTopTalkers(supabase: SupabaseClient, hours: number = 24) {
  try {
    // Return mock top talkers since telemetry table doesn't exist yet
    return [
      { topic: 'sensors/temperature', count: 1250 },
      { topic: 'sensors/humidity', count: 980 },
      { topic: 'sensors/pressure', count: 750 },
      { topic: 'device/status', count: 420 },
      { topic: 'device/heartbeat', count: 380 },
      { topic: 'alerts/system', count: 150 },
      { topic: 'logs/error', count: 85 },
      { topic: 'metrics/performance', count: 65 }
    ];
  } catch (error) {
    console.error('Error fetching top talkers:', error);
    return [];
  }
}

// ======= AUDIT LOGS =======

export async function fetchAuditLogs(supabase: SupabaseClient, filters?: any) {
  try {
    // Return mock audit logs since table doesn't exist yet
    return [
      {
        id: 1,
        action: 'user.login',
        subject: 'admin@example.com',
        meta: { ip: '192.168.1.100' },
        created_at: new Date().toISOString(),
        profiles: {
          id: '1',
          email: 'admin@example.com',
          full_name: 'Admin User'
        }
      },
      {
        id: 2,
        action: 'device.create',
        subject: 'ESP32-001',
        meta: { name: 'Living Room Sensor' },
        created_at: new Date(Date.now() - 3600000).toISOString(),
        profiles: {
          id: '1',
          email: 'admin@example.com',
          full_name: 'Admin User'
        }
      }
    ];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

// ======= SECURITY =======

export async function fetchApiKeys(supabase: SupabaseClient) {
  try {
    // Return mock API keys since table doesn't exist yet
    return [
      {
        id: '1',
        name: 'Mobile App Key',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        revoked: false,
        profiles: {
          id: '1',
          email: 'admin@example.com',
          full_name: 'Admin User'
        }
      }
    ];
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }
}

export async function createApiKey(supabase: SupabaseClient, keyData: any) {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .insert(keyData)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating API key:', error);
    throw error;
  }
}

export async function fetchIpRules(supabase: SupabaseClient) {
  try {
    // Return mock IP rules since table doesn't exist yet
    return [
      {
        id: 1,
        rule: 'allow',
        cidr: '192.168.1.0/24',
        created_at: new Date().toISOString()
      }
    ];
  } catch (error) {
    console.error('Error fetching IP rules:', error);
    return [];
  }
}

// ======= SYSTEM STATUS =======

export async function fetchSystemStatus(supabase: SupabaseClient) {
  try {
    // Return mock system status since table doesn't exist yet
    return [
      {
        component: 'api',
        version: '1.0.0',
        ok: true,
        updated_at: new Date().toISOString(),
        meta: { uptime: '99.9%', response_time: '45ms' }
      },
      {
        component: 'broker',
        version: '2.1.0',
        ok: true,
        updated_at: new Date().toISOString(),
        meta: { connections: 150, messages_per_sec: 1200 }
      },
      {
        component: 'db',
        version: '15.4',
        ok: true,
        updated_at: new Date().toISOString(),
        meta: { connections: 25, cache_hit_ratio: '98.5%' }
      }
    ];
  } catch (error) {
    console.error('Error fetching system status:', error);
    return [];
  }
}

export async function fetchBackups(supabase: SupabaseClient) {
  try {
    // Return mock backups since table doesn't exist yet
    return [
      {
        id: 1,
        label: 'Daily Backup',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        size_bytes: 1024 * 1024 * 100, // 100MB
        location: '/backups/daily_20240116.sql'
      }
    ];
  } catch (error) {
    console.error('Error fetching backups:', error);
    return [];
  }
}

// ======= SIMULATOR =======

export async function fetchSimBindings(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase
      .from('sim_bindings')
      .select(`
        id,
        device_id,
        script,
        enabled,
        created_at,
        devices(
          id,
          name,
          device_id
        )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching sim bindings:', error);
    throw error;
  }
}

export async function createSimBinding(supabase: SupabaseClient, bindingData: any) {
  try {
    const { data, error } = await supabase
      .from('sim_bindings')
      .insert(bindingData)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating sim binding:', error);
    throw error;
  }
}


export async function fetchDeviceHealth(
  supabase: SupabaseClient,
  healthFilter: string = 'all',
  limit: number = 100,
  offset: number = 0
) {
  try {
    const { data, error } = await supabase.rpc('get_device_health', {
      health_filter: healthFilter,
      limit_count: limit,
      offset_count: offset
    });
    
    if (error) {
      throw new Error(`Failed to fetch device health: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching device health:', error);
    throw error;
  }
}

export async function fetchRecentEvents(
  supabase: SupabaseClient,
  limit: number = 50
) {
  try {
    const { data, error } = await supabase
      .from('device_events')
      .select(`
        id,
        device_id,
        level,
        code,
        message,
        meta,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to fetch recent events: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching recent events:', error);
    throw error;
  }
}

export async function fetchMQTTTrafficStats(
  supabase: SupabaseClient,
  timeRange: string = '24 hours'
) {
  try {
    const { data, error } = await supabase.rpc('get_mqtt_traffic_stats', {
      time_range: timeRange
    });
    
    if (error) {
      throw new Error(`Failed to fetch MQTT traffic stats: ${error.message}`);
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching MQTT traffic stats:', error);
    throw error;
  }
}

export async function fetchAlerts24hSummary(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase
      .from('v_alerts_24h_summary')
      .select('*');
    
    if (error) {
      throw new Error(`Failed to fetch alerts 24h summary: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching alerts 24h summary:', error);
    throw error;
  }
}

export async function fetchMQTTLastHour(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase
      .from('v_mqtt_last_hour')
      .select('*');
    
    if (error) {
      throw new Error(`Failed to fetch MQTT last hour data: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching MQTT last hour data:', error);
    throw error;
  }
}

export async function fetchMasterFeed(supabase: SupabaseClient, limit: number = 200) {
  try {
    const { data, error } = await supabase.rpc('get_master_feed', {
      limit_count: limit
    });
    
    if (error) {
      throw new Error(`Failed to fetch master feed: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching master feed:', error);
    throw error;
  }
}

// Utility function to check if user has master role
export async function checkMasterRole(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }
    
    const { data, error } = await supabase.rpc('is_master', { uid: user.id });
    
    if (error) {
      console.error('Error checking master role:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error checking master role:', error);
    return false;
  }
}

// Utility function to get user role
export async function getUserRole(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('Error getting user role:', error);
      return null;
    }
    
    return data?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}
