// Master Aggregations Dashboard
// Comprehensive fleet monitoring and diagnostics

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Cpu, 
  Database, 
  Download, 
  Filter, 
  Globe, 
  HardDrive, 
  RefreshCw, 
  Search, 
  Server, 
  TrendingUp, 
  Users, 
  Wifi, 
  WifiOff,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useMasterAggregations } from '@/hooks/useMasterAggregations';
import { useAuth } from '@/hooks/useAuth';

export const MasterAggregationsDashboard = () => {
  const { user } = useAuth();
  const {
    kpis,
    deviceHealth,
    recentEvents,
    mqttStats,
    loading,
    error,
    lastUpdated,
    healthFilter,
    setHealthFilter,
    eventTypes,
    setEventTypes,
    refreshData
  } = useMasterAggregations();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('24 hours');

  // Filter devices based on search term
  const filteredDevices = deviceHealth.filter(device =>
    device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter events based on search term
  const filteredEvents = recentEvents.filter(event =>
    event.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
      default: return 'outline';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <span className="ml-2">Loading fleet data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error Loading Data</h3>
                <p className="text-red-600">{error}</p>
                <Button onClick={refreshData} className="mt-2">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fleet Overview</h1>
          <p className="text-muted-foreground">
            Master aggregations and diagnostics dashboard
            {lastUpdated && (
              <span className="ml-2 text-sm">
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1 hour">1 Hour</SelectItem>
              <SelectItem value="24 hours">24 Hours</SelectItem>
              <SelectItem value="7 days">7 Days</SelectItem>
              <SelectItem value="30 days">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.total_devices}</div>
              <p className="text-xs text-muted-foreground">
                {kpis.online_devices} online ({kpis.uptime_percentage}% uptime)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.total_users}</div>
              <p className="text-xs text-muted-foreground">
                +{kpis.new_users_24h} new in 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.alerts_24h}</div>
              <p className="text-xs text-muted-foreground">
                {kpis.critical_errors} critical errors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MQTT Traffic</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(kpis.mqtt_messages_24h)}</div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(kpis.mqtt_traffic_24h_bytes)} transferred
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">Device Health</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="traffic">MQTT Traffic</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Device Health Tab */}
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Device Health Status</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search devices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Select value={healthFilter} onValueChange={setHealthFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="healthy">Healthy</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredDevices.map((device) => (
                    <div key={device.device_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {device.online ? (
                            <Wifi className="h-4 w-4 text-green-600" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium">{device.device_name}</p>
                            <p className="text-sm text-muted-foreground">{device.device_id}</p>
                          </div>
                        </div>
                        <Badge className={getHealthStatusColor(device.health_status)}>
                          {device.health_status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="text-right">
                          <p>Owner: {device.owner_email}</p>
                          <p>Last seen: {new Date(device.last_seen).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {device.alerts_24h} alerts
                          </Badge>
                          <Badge variant="outline">
                            {device.unresolved_errors} errors
                          </Badge>
                          <Badge variant="outline">
                            {formatBytes(device.traffic_1h_bytes)}/h
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Events</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Select value={eventTypes.join(',')} onValueChange={(value) => setEventTypes(value.split(','))}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alert_triggered,error_occurred">All Events</SelectItem>
                      <SelectItem value="alert_triggered">Alerts Only</SelectItem>
                      <SelectItem value="error_occurred">Errors Only</SelectItem>
                      <SelectItem value="command_sent">Commands Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {event.severity === 'critical' && <XCircle className="h-4 w-4 text-red-600" />}
                          {event.severity === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                          {event.severity === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                          {event.severity === 'info' && <CheckCircle className="h-4 w-4 text-green-600" />}
                          <div>
                            <p className="font-medium">{event.device_name}</p>
                            <p className="text-sm text-muted-foreground">{event.device_id}</p>
                          </div>
                        </div>
                        <Badge variant={getSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                        <Badge variant="outline">
                          {event.event_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="text-right max-w-md">
                          <p className="font-medium">{event.message}</p>
                          <p>{new Date(event.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MQTT Traffic Tab */}
        <TabsContent value="traffic" className="space-y-4">
          {mqttStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Messages</span>
                    <span className="font-bold">{formatNumber(mqttStats.total_messages)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Data</span>
                    <span className="font-bold">{formatBytes(mqttStats.total_bytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inbound</span>
                    <span className="font-bold">{formatNumber(mqttStats.inbound_messages)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outbound</span>
                    <span className="font-bold">{formatNumber(mqttStats.outbound_messages)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Devices by Traffic</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {mqttStats.top_devices.map((device, index) => (
                        <div key={device.device_id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">#{index + 1}</span>
                            <span className="font-medium">{device.device_id}</span>
                          </div>
                          <div className="text-right text-sm">
                            <p>{formatNumber(device.message_count)} messages</p>
                            <p className="text-muted-foreground">{formatBytes(device.total_bytes)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Avg Response Time</span>
                  <span className="font-bold">45ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate</span>
                  <span className="font-bold">0.2%</span>
                </div>
                <div className="flex justify-between">
                  <span>Throughput</span>
                  <span className="font-bold">1.2K msg/s</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Query Time</span>
                  <span className="font-bold">12ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Connections</span>
                  <span className="font-bold">24/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Hit Rate</span>
                  <span className="font-bold">94%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>CPU Usage</span>
                  <span className="font-bold">23%</span>
                </div>
                <div className="flex justify-between">
                  <span>Memory</span>
                  <span className="font-bold">1.2GB</span>
                </div>
                <div className="flex justify-between">
                  <span>Disk I/O</span>
                  <span className="font-bold">45MB/s</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
