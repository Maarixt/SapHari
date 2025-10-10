// Hook for Master Aggregations Dashboard
// Provides real-time fleet data and KPIs

import { useState, useEffect, useCallback } from 'react';
import { aggregationService, FleetKPIs, DeviceHealth, RecentEvent, MQTTTrafficStats } from '@/services/aggregationService';
import { useAuth } from './useAuth';

export interface MasterAggregationsData {
  kpis: FleetKPIs | null;
  deviceHealth: DeviceHealth[];
  recentEvents: RecentEvent[];
  mqttStats: MQTTTrafficStats | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useMasterAggregations = () => {
  const { user } = useAuth();
  const [data, setData] = useState<MasterAggregationsData>({
    kpis: null,
    deviceHealth: [],
    recentEvents: [],
    mqttStats: null,
    loading: true,
    error: null,
    lastUpdated: null
  });

  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [eventTypes, setEventTypes] = useState<string[]>(['alert_triggered', 'error_occurred']);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const [kpis, deviceHealth, recentEvents, mqttStats] = await Promise.all([
        aggregationService.getFleetKPIs(),
        aggregationService.getDeviceHealth(healthFilter, 100, 0),
        aggregationService.getRecentEvents(eventTypes, 50, 0),
        aggregationService.getMQTTTrafficStats()
      ]);

      setData({
        kpis,
        deviceHealth,
        recentEvents,
        mqttStats,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
    } catch (error: any) {
      console.error('Error loading master aggregations:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load data'
      }));
    }
  }, [user, healthFilter, eventTypes]);

  const refreshData = useCallback(async () => {
    await aggregationService.refreshViews();
    await loadData();
  }, [loadData]);

  const handleRealtimeUpdate = useCallback((type: string, payload: any) => {
    // Handle realtime updates
    switch (type) {
      case 'device_event':
        // Refresh recent events
        loadData();
        break;
      case 'device_state':
        // Refresh device health
        loadData();
        break;
      case 'system_error':
        // Refresh KPIs
        loadData();
        break;
      case 'mqtt_traffic':
        // Refresh MQTT stats
        loadData();
        break;
    }
  }, [loadData]);

  useEffect(() => {
    if (!user) return;

    // Load initial data
    loadData();

    // Setup realtime updates
    aggregationService.setupRealtimeUpdates(handleRealtimeUpdate);

    // Cleanup on unmount
    return () => {
      aggregationService.cleanup();
    };
  }, [user, loadData, handleRealtimeUpdate]);

  // Update data when filters change
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [healthFilter, eventTypes, loadData, user]);

  return {
    ...data,
    healthFilter,
    setHealthFilter,
    eventTypes,
    setEventTypes,
    refreshData,
    loadData
  };
};
