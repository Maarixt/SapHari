// Aggregation Service for Master Dashboard
// Handles data collection, aggregation, and realtime updates

import { supabase } from '@/integrations/supabase/client';
import { DeviceSnapshot } from '@/state/deviceStore';
import { AlertEntry } from '@/state/alertsTypes';

export interface FleetKPIs {
  total_devices: number;
  online_devices: number;
  total_users: number;
  new_users_24h: number;
  active_devices_1h: number;
  alerts_24h: number;
  critical_errors: number;
  mqtt_traffic_24h_bytes: number;
  mqtt_messages_24h: number;
  uptime_percentage: number;
}

export interface DeviceHealth {
  device_id: string;
  device_name: string;
  owner_email: string;
  online: boolean;
  last_seen: string;
  health_status: 'healthy' | 'warning' | 'critical';
  alerts_24h: number;
  unresolved_errors: number;
  traffic_1h_bytes: number;
}

export interface RecentEvent {
  id: string;
  device_id: string;
  device_name: string;
  owner_email: string;
  event_type: string;
  severity: string;
  message: string;
  event_data: any;
  created_at: string;
}

export interface MQTTTrafficStats {
  total_messages: number;
  total_bytes: number;
  inbound_messages: number;
  outbound_messages: number;
  inbound_bytes: number;
  outbound_bytes: number;
  top_devices: Array<{
    device_id: string;
    message_count: number;
    total_bytes: number;
  }>;
}

class AggregationService {
  private static instance: AggregationService;
  private realtimeChannel: any = null;
  private refreshInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): AggregationService {
    if (!AggregationService.instance) {
      AggregationService.instance = new AggregationService();
    }
    return AggregationService.instance;
  }

  // Data Collection Methods
  async recordDeviceState(deviceId: string, userId: string, state: DeviceSnapshot) {
    try {
      // Update device status
      const { error: statusError } = await supabase
        .from('device_status')
        .upsert({
          device_id: deviceId,
          online: state.online,
          last_seen: new Date(state.lastSeen).toISOString()
        }, {
          onConflict: 'device_id'
        });

      if (statusError) {
        console.error('Error recording device status:', statusError);
      }

      // Record MQTT message for state update
      const { error: mqttError } = await supabase
        .from('mqtt_messages')
        .insert({
          device_id: deviceId,
          topic: `devices/${deviceId}/state`,
          direction: 'sub',
          payload: {
            gpio: state.gpio,
            sensors: state.sensors,
            online: state.online
          }
        });

      if (mqttError) {
        console.error('Error recording MQTT state message:', mqttError);
      }
    } catch (error) {
      console.error('Error recording device state:', error);
    }
  }

  async recordDeviceEvent(
    deviceId: string, 
    userId: string, 
    eventType: string, 
    eventData: any, 
    severity: string = 'info',
    message?: string
  ) {
    try {
      const { error } = await supabase
        .from('device_events')
        .insert({
          device_id: deviceId,
          level: severity,
          code: eventType,
          message: message || `${eventType} occurred`,
          meta: eventData
        });

      if (error) {
        console.error('Error recording device event:', error);
      }
    } catch (error) {
      console.error('Error recording device event:', error);
    }
  }

  async recordMQTTTraffic(
    deviceId: string | null,
    topic: string,
    messageSize: number,
    direction: 'inbound' | 'outbound'
  ) {
    try {
      const { error } = await supabase
        .from('mqtt_messages')
        .insert({
          device_id: deviceId,
          topic,
          direction: direction === 'inbound' ? 'sub' : 'pub',
          payload: { size: messageSize }
        });

      if (error) {
        console.error('Error recording MQTT traffic:', error);
      }
    } catch (error) {
      console.error('Error recording MQTT traffic:', error);
    }
  }

  async recordSystemError(
    deviceId: string | null,
    userId: string | null,
    errorType: string,
    errorMessage: string,
    stackTrace?: string,
    context?: any,
    severity: string = 'error'
  ) {
    try {
      // Record as device event if device_id is provided
      if (deviceId) {
        await this.recordDeviceEvent(
          deviceId,
          userId || '',
          errorType,
          { stackTrace, context },
          severity,
          errorMessage
        );
      }

      // Record in audit logs for system errors
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          actor_id: userId,
          action: 'system_error',
          target_type: 'system',
          target_id: deviceId || 'system',
          details: {
            error_type: errorType,
            error_message: errorMessage,
            stack_trace: stackTrace,
            context: context || {},
            severity
          }
        });

      if (error) {
        console.error('Error recording system error:', error);
      }
    } catch (error) {
      console.error('Error recording system error:', error);
    }
  }

  // Data Retrieval Methods
  async getFleetKPIs(timeRange: string = '24 hours'): Promise<FleetKPIs | null> {
    try {
      // Try Edge Function first for better performance
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('master-metrics');
      
      if (!edgeError && edgeData?.kpis) {
        const kpis = edgeData.kpis;
        return {
          total_devices: Number(kpis.total_devices),
          online_devices: Number(kpis.devices_online),
          total_users: Number(kpis.total_users),
          new_users_24h: 0, // Would need separate query
          active_devices_1h: Number(kpis.devices_online), // Approximation
          alerts_24h: Number(kpis.critical_alerts_24h),
          critical_errors: Number(kpis.errors_24h),
          mqtt_traffic_24h_bytes: Number(kpis.mqtt_bytes_24h),
          mqtt_messages_24h: Number(kpis.mqtt_messages_24h),
          uptime_percentage: kpis.total_devices > 0 ? 
            (Number(kpis.devices_online) / Number(kpis.total_devices)) * 100 : 0
        };
      }

      // Fallback to RPC function
      const { data, error } = await supabase
        .rpc('get_master_kpis');

      if (error) {
        console.error('Error fetching fleet KPIs:', error);
        return null;
      }

      const kpis = data?.[0];
      if (!kpis) return null;

      return {
        total_devices: Number(kpis.total_devices),
        online_devices: Number(kpis.devices_online),
        total_users: Number(kpis.total_users),
        new_users_24h: 0, // Would need separate query
        active_devices_1h: Number(kpis.devices_online), // Approximation
        alerts_24h: Number(kpis.critical_alerts_24h),
        critical_errors: Number(kpis.errors_24h),
        mqtt_traffic_24h_bytes: Number(kpis.mqtt_bytes_24h),
        mqtt_messages_24h: Number(kpis.mqtt_messages_24h),
        uptime_percentage: kpis.total_devices > 0 ? 
          (Number(kpis.devices_online) / Number(kpis.total_devices)) * 100 : 0
      };
    } catch (error) {
      console.error('Error fetching fleet KPIs:', error);
      return null;
    }
  }

  async getDeviceHealth(
    healthFilter: string = 'all',
    limit: number = 100,
    offset: number = 0
  ): Promise<DeviceHealth[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_device_health', {
          health_filter: healthFilter,
          limit_count: limit,
          offset_count: offset
        });

      if (error) {
        console.error('Error fetching device health:', error);
        return [];
      }

      return (data || []).map((device: any) => ({
        device_id: device.device_id,
        device_name: device.name,
        owner_email: device.owner_email,
        online: device.online,
        last_seen: device.last_seen,
        health_status: device.health_status,
        alerts_24h: Number(device.alerts_24h),
        unresolved_errors: Number(device.errors_24h),
        traffic_1h_bytes: 0 // Would need separate calculation
      }));
    } catch (error) {
      console.error('Error fetching device health:', error);
      return [];
    }
  }

  async getRecentEvents(
    eventTypes: string[] = ['alert', 'event'],
    limit: number = 50,
    offset: number = 0
  ): Promise<RecentEvent[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_master_feed', { limit_count: limit });

      if (error) {
        console.error('Error fetching recent events:', error);
        return [];
      }

      return (data || []).map((event: any) => ({
        id: `${event.kind}-${event.ts}`,
        device_id: event.device_id || '',
        device_name: event.device_id || 'System',
        owner_email: event.actor_email || '',
        event_type: event.kind,
        severity: event.level,
        message: event.message,
        event_data: { title: event.title },
        created_at: event.ts
      }));
    } catch (error) {
      console.error('Error fetching recent events:', error);
      return [];
    }
  }

  async getMQTTTrafficStats(timeRange: string = '24 hours'): Promise<MQTTTrafficStats | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_mqtt_traffic_stats', { time_range: timeRange });

      if (error) {
        console.error('Error fetching MQTT traffic stats:', error);
        return null;
      }

      const stats = data?.[0];
      if (!stats) return null;

      return {
        total_messages: Number(stats.total_messages),
        total_bytes: Number(stats.total_bytes),
        inbound_messages: Number(stats.inbound_messages),
        outbound_messages: Number(stats.outbound_messages),
        inbound_bytes: Number(stats.inbound_bytes),
        outbound_bytes: Number(stats.outbound_bytes),
        top_devices: stats.top_devices || []
      };
    } catch (error) {
      console.error('Error fetching MQTT traffic stats:', error);
      return null;
    }
  }

  // Realtime Setup
  setupRealtimeUpdates(onUpdate: (type: string, data: any) => void) {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.realtimeChannel = supabase
      .channel('master-aggregations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'device_events'
      }, (payload) => {
        onUpdate('device_event', payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'device_status'
      }, (payload) => {
        onUpdate('device_state', payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts'
      }, (payload) => {
        onUpdate('alert', payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mqtt_messages'
      }, (payload) => {
        onUpdate('mqtt_traffic', payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'audit_logs'
      }, (payload) => {
        onUpdate('audit_log', payload);
      })
      .subscribe();

    // Setup periodic refresh of materialized views
    this.refreshInterval = setInterval(async () => {
      try {
        await supabase.rpc('refresh_mv_master_kpis');
      } catch (error) {
        console.error('Error refreshing fleet views:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  cleanup() {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Utility Methods
  async refreshViews() {
    try {
      const { error } = await supabase.rpc('refresh_mv_master_kpis');
      if (error) {
        console.error('Error refreshing views:', error);
      }
    } catch (error) {
      console.error('Error refreshing views:', error);
    }
  }

  // Integration with existing systems
  async recordAlertTriggered(alert: AlertEntry, deviceId: string, userId: string) {
    // Record as alert
    const { error: alertError } = await supabase
      .from('alerts')
      .insert({
        device_id: deviceId,
        rule_id: alert.ruleId,
        severity: alert.severity === 'critical' ? 'critical' : 
                 alert.severity === 'warning' ? 'high' : 'medium',
        title: alert.ruleName,
        description: `Alert triggered: ${alert.ruleName} - Value: ${alert.value}`
      });

    if (alertError) {
      console.error('Error recording alert:', alertError);
    }

    // Also record as device event
    await this.recordDeviceEvent(
      deviceId,
      userId,
      'alert_triggered',
      {
        ruleId: alert.ruleId,
        ruleName: alert.ruleName,
        value: alert.value,
        severity: alert.severity,
        channels: alert.channels
      },
      alert.severity,
      `Alert triggered: ${alert.ruleName}`
    );
  }

  async recordDeviceCommand(deviceId: string, userId: string, command: any) {
    await this.recordDeviceEvent(
      deviceId,
      userId,
      'command_sent',
      command,
      'info',
      `Command sent to device ${deviceId}`
    );

    // Record in audit logs
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: userId,
        action: 'device_command',
        target_type: 'device',
        target_id: deviceId,
        details: command
      });

    if (error) {
      console.error('Error recording device command audit:', error);
    }
  }

  async recordDeviceOnlineStatus(deviceId: string, userId: string, online: boolean) {
    await this.recordDeviceEvent(
      deviceId,
      userId,
      'status_change',
      { online },
      online ? 'info' : 'warning',
      `Device ${deviceId} ${online ? 'came online' : 'went offline'}`
    );
  }
}

export const aggregationService = AggregationService.getInstance();
