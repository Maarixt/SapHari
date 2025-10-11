// Health Monitoring Dashboard Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Heart, 
  Wifi, 
  Cpu, 
  Battery, 
  Thermometer, 
  Droplets, 
  Gauge,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Activity,
  Clock
} from 'lucide-react';
import { Device } from '@/lib/types';
import { useMQTT } from '@/hooks/useMQTT';

interface DeviceHealth {
  deviceId: string;
  deviceName: string;
  isOnline: boolean;
  lastHeartbeat: number;
  uptime: number;
  freeHeap: number;
  wifiRSSI: number;
  isHealthy: boolean;
  errorCount: number;
  lastError?: string;
  sensors: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    waterLevel?: number;
    battery?: number;
  };
  lastUpdate: number;
}

interface HealthMetrics {
  totalDevices: number;
  onlineDevices: number;
  healthyDevices: number;
  averageUptime: number;
  averageSignalStrength: number;
  totalErrors: number;
}

export function HealthDashboard({ devices }: { devices: Device[] }) {
  const [deviceHealth, setDeviceHealth] = useState<Map<string, DeviceHealth>>(new Map());
  const [metrics, setMetrics] = useState<HealthMetrics>({
    totalDevices: 0,
    onlineDevices: 0,
    healthyDevices: 0,
    averageUptime: 0,
    averageSignalStrength: 0,
    totalErrors: 0
  });
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { client } = useMQTT();

  // Initialize device health tracking
  useEffect(() => {
    const initialHealth = new Map<string, DeviceHealth>();
    
    devices.forEach(device => {
      initialHealth.set(device.device_id, {
        deviceId: device.device_id,
        deviceName: device.name,
        isOnline: false,
        lastHeartbeat: 0,
        uptime: 0,
        freeHeap: 0,
        wifiRSSI: 0,
        isHealthy: false,
        errorCount: 0,
        sensors: {},
        lastUpdate: 0
      });
    });
    
    setDeviceHealth(initialHealth);
  }, [devices]);

  // Calculate metrics
  useEffect(() => {
    const healthArray = Array.from(deviceHealth.values());
    
    const newMetrics: HealthMetrics = {
      totalDevices: healthArray.length,
      onlineDevices: healthArray.filter(d => d.isOnline).length,
      healthyDevices: healthArray.filter(d => d.isHealthy).length,
      averageUptime: healthArray.length > 0 
        ? healthArray.reduce((sum, d) => sum + d.uptime, 0) / healthArray.length 
        : 0,
      averageSignalStrength: healthArray.length > 0 
        ? healthArray.reduce((sum, d) => sum + d.wifiRSSI, 0) / healthArray.length 
        : 0,
      totalErrors: healthArray.reduce((sum, d) => sum + d.errorCount, 0)
    };
    
    setMetrics(newMetrics);
  }, [deviceHealth]);

  // Simulate MQTT message handling (in real app, this would come from MQTT service)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate receiving health data
      devices.forEach(device => {
        const isOnline = Math.random() > 0.1; // 90% chance of being online
        const isHealthy = isOnline && Math.random() > 0.2; // 80% chance of being healthy if online
        
        setDeviceHealth(prev => {
          const current = prev.get(device.device_id);
          if (!current) return prev;
          
          const updated: DeviceHealth = {
            ...current,
            isOnline,
            isHealthy,
            lastHeartbeat: isOnline ? Date.now() : current.lastHeartbeat,
            uptime: isOnline ? current.uptime + 1000 : current.uptime,
            freeHeap: Math.floor(Math.random() * 100000) + 50000,
            wifiRSSI: Math.floor(Math.random() * 40) - 80, // -80 to -40 dBm
            errorCount: isHealthy ? Math.max(0, current.errorCount - 1) : current.errorCount + 1,
            lastError: !isHealthy ? 'Simulated error' : undefined,
            sensors: {
              temperature: 20 + Math.random() * 15,
              humidity: 40 + Math.random() * 40,
              pressure: 1000 + Math.random() * 50,
              waterLevel: Math.random() * 100,
              battery: 80 + Math.random() * 20
            },
            lastUpdate: Date.now()
          };
          
          const newMap = new Map(prev);
          newMap.set(device.device_id, updated);
          return newMap;
        });
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [devices]);

  const refreshHealth = () => {
    setRefreshing(true);
    // In real app, this would trigger a health check request
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getHealthStatusColor = (isHealthy: boolean, isOnline: boolean) => {
    if (!isOnline) return 'bg-gray-500';
    if (isHealthy) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getSignalStrengthColor = (rssi: number) => {
    if (rssi >= -50) return 'text-green-500';
    if (rssi >= -70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const formatLastSeen = (lastHeartbeat: number) => {
    if (lastHeartbeat === 0) return 'Never';
    const diff = Date.now() - lastHeartbeat;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const selectedDeviceHealth = selectedDevice ? deviceHealth.get(selectedDevice) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Device Health Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor the health and status of your IoT devices
          </p>
        </div>
        <Button onClick={refreshHealth} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Health Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDevices}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.onlineDevices} online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Devices</CardTitle>
            <Heart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.healthyDevices}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalDevices > 0 
                ? Math.round((metrics.healthyDevices / metrics.totalDevices) * 100) 
                : 0}% health rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(metrics.averageUptime)}</div>
            <p className="text-xs text-muted-foreground">
              Average device uptime
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              Across all devices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Device Health Table */}
      <Card>
        <CardHeader>
          <CardTitle>Device Health Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(deviceHealth.values()).map((health) => (
                <TableRow key={health.deviceId}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{health.deviceName}</div>
                      <div className="text-sm text-muted-foreground">{health.deviceId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={health.isOnline ? 'default' : 'secondary'}>
                      {health.isOnline ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Online
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Offline
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getHealthStatusColor(health.isHealthy, health.isOnline)}`} />
                      <span className="text-sm">
                        {health.isHealthy ? 'Healthy' : 'Unhealthy'}
                      </span>
                    </div>
                    {health.errorCount > 0 && (
                      <div className="text-xs text-red-500">
                        {health.errorCount} errors
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatUptime(health.uptime)}</div>
                  </TableCell>
                  <TableCell>
                    <div className={`text-sm ${getSignalStrengthColor(health.wifiRSSI)}`}>
                      {health.wifiRSSI} dBm
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {(health.freeHeap / 1024).toFixed(0)} KB
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatLastSeen(health.lastHeartbeat)}</div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDevice(health.deviceId)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Device Details Modal */}
      {selectedDeviceHealth && (
        <Card>
          <CardHeader>
            <CardTitle>Device Details: {selectedDeviceHealth.deviceName}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sensors">Sensors</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Wifi className="h-4 w-4" />
                      <span className="text-sm font-medium">WiFi Signal</span>
                    </div>
                    <div className={`text-lg ${getSignalStrengthColor(selectedDeviceHealth.wifiRSSI)}`}>
                      {selectedDeviceHealth.wifiRSSI} dBm
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Cpu className="h-4 w-4" />
                      <span className="text-sm font-medium">Free Memory</span>
                    </div>
                    <div className="text-lg">
                      {(selectedDeviceHealth.freeHeap / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Uptime</span>
                    </div>
                    <div className="text-lg">{formatUptime(selectedDeviceHealth.uptime)}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Error Count</span>
                    </div>
                    <div className="text-lg">{selectedDeviceHealth.errorCount}</div>
                  </div>
                </div>
                
                {selectedDeviceHealth.lastError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-sm font-medium text-red-800">Last Error</div>
                    <div className="text-sm text-red-600">{selectedDeviceHealth.lastError}</div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="sensors" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {selectedDeviceHealth.sensors.temperature && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Thermometer className="h-4 w-4" />
                        <span className="text-sm font-medium">Temperature</span>
                      </div>
                      <div className="text-lg">{selectedDeviceHealth.sensors.temperature.toFixed(1)}°C</div>
                    </div>
                  )}
                  
                  {selectedDeviceHealth.sensors.humidity && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Droplets className="h-4 w-4" />
                        <span className="text-sm font-medium">Humidity</span>
                      </div>
                      <div className="text-lg">{selectedDeviceHealth.sensors.humidity.toFixed(1)}%</div>
                    </div>
                  )}
                  
                  {selectedDeviceHealth.sensors.pressure && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Gauge className="h-4 w-4" />
                        <span className="text-sm font-medium">Pressure</span>
                      </div>
                      <div className="text-lg">{selectedDeviceHealth.sensors.pressure.toFixed(1)} hPa</div>
                    </div>
                  )}
                  
                  {selectedDeviceHealth.sensors.battery && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Battery className="h-4 w-4" />
                        <span className="text-sm font-medium">Battery</span>
                      </div>
                      <div className="text-lg">{selectedDeviceHealth.sensors.battery.toFixed(1)}%</div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="system" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Memory Usage</div>
                    <Progress 
                      value={(selectedDeviceHealth.freeHeap / 200000) * 100} 
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {(selectedDeviceHealth.freeHeap / 1024).toFixed(0)} KB free
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-2">WiFi Signal Strength</div>
                    <Progress 
                      value={Math.max(0, (selectedDeviceHealth.wifiRSSI + 100) / 60 * 100)} 
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedDeviceHealth.wifiRSSI} dBm
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
