// API client for master dashboard and aggregations

import { SupabaseClient } from '@supabase/supabase-js';

export async function fetchMasterMetrics(supabase: SupabaseClient) {
  try {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const res = await fetch("/functions/v1/master-metrics", {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
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
    
    if (error) {
      throw new Error(`Failed to fetch fleet KPIs: ${error.message}`);
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error('Error fetching fleet KPIs:', error);
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
