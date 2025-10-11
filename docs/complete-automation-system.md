# Complete Automation and Health Monitoring System

## Overview

This document describes the comprehensive automation and health monitoring system implemented for the SapHari IoT platform. The system includes:

1. **Device Heartbeat and Health Monitoring**
2. **Automation Rule Engine**
3. **Web Push Notifications**
4. **Notification Preferences System**
5. **Health Monitoring Dashboard**

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ESP32 Device  │    │   MQTT Broker   │    │   Web Dashboard │
│                 │    │                 │    │                 │
│ • Heartbeat     │◄──►│ • Secure Topics │◄──►│ • Rule Builder  │
│ • Health Check  │    │ • JWT Auth      │    │ • Health Monitor│
│ • OTA Updates   │    │ • Tenant Isol.  │    │ • Notifications │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase DB   │    │  Automation     │    │  Push Service   │
│                 │    │  Engine         │    │                 │
│ • Device Data   │    │ • Rule Eval     │    │ • Web Push      │
│ • Rule Storage  │    │ • Action Exec   │    │ • Preferences   │
│ • Notifications │    │ • Health Check  │    │ • Service Worker│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 1. Device Heartbeat and Health Monitoring

### ESP32 Implementation

The ESP32 firmware (`main_ota.cpp`) includes comprehensive health monitoring:

```cpp
// Health Monitoring State
struct HealthState {
  unsigned long lastHeartbeat = 0;
  unsigned long lastStatePublish = 0;
  unsigned long lastHealthCheck = 0;
  unsigned long deviceUptime = 0;
  unsigned long lastRestart = 0;
  int heartbeatInterval = 60000; // 1 minute
  int stateInterval = 30000; // 30 seconds
  int healthCheckInterval = 300000; // 5 minutes
  bool isHealthy = true;
  String lastError = "";
  int errorCount = 0;
  int maxErrors = 5;
};
```

### Health Checks

The system performs regular health checks:

- **WiFi Connection**: Monitors connection status
- **MQTT Connection**: Ensures MQTT connectivity
- **Memory Usage**: Checks free heap memory
- **Signal Strength**: Monitors WiFi RSSI
- **Error Tracking**: Counts and tracks errors

### Heartbeat Messages

Devices send heartbeat messages every minute:

```json
{
  "deviceId": "saph-abc123",
  "tenantId": "tenantA",
  "timestamp": 1703123456,
  "uptime": 3600000,
  "freeHeap": 150000,
  "wifiRSSI": -65,
  "isHealthy": true,
  "errorCount": 0
}
```

## 2. Automation Rule Engine

### Rule Structure

Automation rules use a JSON schema for conditions and actions:

```typescript
interface AutomationRule {
  id: string;
  user_id: string;
  device_id?: string;
  name: string;
  description?: string;
  condition: RuleCondition;
  action: RuleAction;
  active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  last_triggered?: string;
  trigger_count: number;
}
```

### Condition Types

The system supports multiple condition types:

1. **Sensor Conditions**: Temperature, humidity, pressure, etc.
2. **GPIO Conditions**: Digital pin states
3. **Time Conditions**: Time-based triggers
4. **Device Status**: Online/offline status
5. **Heartbeat Conditions**: Health monitoring
6. **Combined Conditions**: Multiple conditions with AND/OR logic

### Action Types

Supported action types:

1. **MQTT Commands**: Send commands to devices
2. **Notifications**: Send alerts via multiple channels
3. **OTA Updates**: Trigger firmware updates
4. **Webhooks**: Call external APIs
5. **Delays**: Add delays between actions
6. **Combined Actions**: Execute multiple actions

### Rule Evaluation

The automation engine evaluates rules in real-time:

```typescript
// Process device data and evaluate rules
async processDeviceData(deviceId: string, data: any): Promise<void> {
  const rules = await this.getActiveRulesForDevice(deviceId);
  
  for (const rule of rules) {
    const conditionMet = this.evaluateCondition(rule.condition, data);
    
    if (conditionMet) {
      await this.executeAction(rule.action, deviceId, rule.id);
    }
  }
}
```

## 3. Web Push Notifications

### Service Worker

The service worker (`public/sw.js`) handles:

- Push notification reception
- Notification display
- User interaction handling
- Background sync
- Cache management

### Notification Service

The notification service provides:

- Push subscription management
- Local notification display
- Notification preferences
- Channel management (email, push, SMS, Slack)

### VAPID Configuration

Web push notifications use VAPID keys for authentication:

```typescript
// Initialize notification service
await notificationService.initialize();

// Subscribe to push notifications
const subscription = await notificationService.subscribeToPush();
```

## 4. Notification Preferences System

### Preference Structure

```typescript
interface NotificationPreferences {
  id: string;
  user_id: string;
  device_id?: string;
  notification_type: 'critical' | 'warning' | 'info' | 'success';
  channels: string[];
  enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}
```

### Features

- **Multi-channel Support**: Email, push, SMS, Slack
- **Quiet Hours**: Configure when not to send notifications
- **Timezone Support**: Handle different timezones
- **Device-specific Rules**: Different preferences per device
- **Notification Types**: Critical, warning, info, success

## 5. Health Monitoring Dashboard

### Dashboard Components

The health dashboard provides:

1. **Overview Metrics**: Total devices, online devices, health rate
2. **Device Status Table**: Real-time device health status
3. **Detailed Device View**: Individual device health information
4. **Sensor Data**: Temperature, humidity, pressure, battery
5. **System Information**: Memory usage, signal strength, uptime

### Health Indicators

- **Online Status**: Green (online), Gray (offline)
- **Health Status**: Green (healthy), Red (unhealthy)
- **Signal Strength**: Color-coded based on RSSI values
- **Memory Usage**: Progress bars for memory consumption
- **Error Tracking**: Error count and last error messages

## Database Schema

### Automation Rules Table

```sql
CREATE TABLE automation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    condition JSONB NOT NULL,
    action JSONB NOT NULL,
    active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_triggered TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0
);
```

### Notification Preferences Table

```sql
CREATE TABLE notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('critical', 'warning', 'info', 'success')),
    channels JSONB NOT NULL DEFAULT '["email"]',
    enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Push Subscriptions Table

```sql
CREATE TABLE push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);
```

## Security Features

### Row Level Security (RLS)

All tables implement RLS policies:

- **User Ownership**: Users can only access their own data
- **Master Role**: Master users can access all data
- **Admin Role**: Admin users can access tenant data
- **Service Role**: Service role for system operations

### MQTT Security

- **JWT Authentication**: Secure MQTT connections
- **Tenant Isolation**: Topic-based data separation
- **TLS Encryption**: Encrypted MQTT communication
- **Access Control**: Broker-level ACL policies

## Usage Examples

### Creating an Automation Rule

```typescript
// Create a temperature alert rule
const rule = await automationService.createRule({
  user_id: userId,
  device_id: 'saph-abc123',
  name: 'High Temperature Alert',
  description: 'Alert when temperature exceeds 30°C',
  condition: {
    type: 'sensor',
    operator: 'gt',
    field: 'tempC',
    value: 30,
    unit: '°C'
  },
  action: {
    type: 'notification',
    notification: {
      type: 'warning',
      title: 'High Temperature Alert',
      message: 'Temperature has exceeded 30°C',
      channels: ['email', 'push']
    }
  },
  active: true,
  priority: 10
});
```

### Setting Notification Preferences

```typescript
// Set notification preferences
await notificationService.updateNotificationPreferences({
  user_id: userId,
  device_id: 'saph-abc123',
  notification_type: 'critical',
  channels: ['email', 'push', 'sms'],
  enabled: true,
  quiet_hours_start: '22:00:00',
  quiet_hours_end: '08:00:00',
  timezone: 'America/New_York'
});
```

### Monitoring Device Health

```typescript
// Get device health status
const healthData = await healthService.getDeviceHealth('saph-abc123');

// Check if device is healthy
if (healthData.isHealthy) {
  console.log('Device is healthy');
} else {
  console.log('Device has issues:', healthData.lastError);
}
```

## Performance Considerations

### Caching

- **Rule Cache**: Active rules are cached for 1 minute
- **Device State Cache**: Device states are cached in memory
- **Notification Cache**: User preferences are cached

### Database Optimization

- **Indexes**: Optimized indexes on frequently queried columns
- **Partitioning**: Large tables can be partitioned by date
- **Cleanup**: Automated cleanup of old data

### MQTT Optimization

- **QoS Levels**: Appropriate QoS levels for different message types
- **Retained Messages**: State messages are retained
- **Topic Structure**: Efficient topic hierarchy

## Monitoring and Alerting

### System Metrics

- **Rule Execution**: Track rule execution success/failure rates
- **Notification Delivery**: Monitor notification delivery rates
- **Device Health**: Track device health trends
- **Performance**: Monitor system performance metrics

### Alerting

- **System Alerts**: Alert on system failures
- **Performance Alerts**: Alert on performance degradation
- **Security Alerts**: Alert on security incidents
- **Device Alerts**: Alert on device issues

## Troubleshooting

### Common Issues

1. **Rules Not Triggering**: Check condition logic and data format
2. **Notifications Not Sent**: Verify notification preferences and channels
3. **Device Offline**: Check MQTT connection and network
4. **Performance Issues**: Check database queries and caching

### Debug Tools

- **Rule Execution Logs**: Detailed logs of rule execution
- **Notification Logs**: Track notification delivery
- **Health Monitoring**: Real-time device health status
- **MQTT Debug**: MQTT message logging and debugging

## Future Enhancements

### Planned Features

1. **Machine Learning**: Predictive health monitoring
2. **Advanced Analytics**: Device usage analytics
3. **Integration APIs**: Third-party service integrations
4. **Mobile App**: Native mobile application
5. **Voice Control**: Voice-activated automation

### Scalability Improvements

1. **Microservices**: Break down into microservices
2. **Event Streaming**: Use event streaming for real-time processing
3. **Load Balancing**: Implement load balancing
4. **Caching**: Advanced caching strategies
5. **CDN**: Content delivery network for static assets

## Conclusion

The complete automation and health monitoring system provides a robust foundation for IoT device management. It includes comprehensive health monitoring, flexible automation rules, multi-channel notifications, and a user-friendly dashboard. The system is designed for scalability, security, and ease of use.

Key benefits:

- **Real-time Monitoring**: Continuous device health monitoring
- **Flexible Automation**: Powerful rule engine with multiple condition and action types
- **Multi-channel Notifications**: Email, push, SMS, and Slack notifications
- **User-friendly Interface**: Intuitive dashboard and rule builder
- **Security**: Comprehensive security with RLS and MQTT security
- **Scalability**: Designed to handle large numbers of devices and users

The system is production-ready and can be extended with additional features as needed.
