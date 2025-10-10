# Complete Master Aggregations System

## Overview

The Master Aggregations System provides comprehensive real-time monitoring, analytics, and management capabilities for the entire SapHari IoT platform. This system aggregates data from all devices, users, and system events to provide master-level insights and control.

## System Architecture

```
ESP32 Devices → MQTT Broker → MQTT Bridge → Supabase Database → Master Dashboard
     ↓              ↓              ↓              ↓              ↓
Device Data → Message Queue → Data Processing → Data Storage → Real-time UI
```

## Components

### 1. **MQTT Bridge Service** (`services/mqtt-bridge/`)
- **Purpose**: Bridges MQTT messages to Supabase database
- **Features**: 
  - Subscribes to all device topics
  - Writes to `mqtt_messages`, `device_events`, `device_status`, `audit_logs`
  - Automatic reconnection and error handling
  - Health monitoring and Docker support

### 2. **Database Schema** (`supabase/migrations/`)
- **Tables**: `devices`, `device_status`, `mqtt_messages`, `device_events`, `alerts`, `audit_logs`
- **Views**: `v_user_device_counts`, `v_device_online_counts`, `v_alerts_24h_summary`, `v_mqtt_last_hour`
- **Materialized Views**: `mv_master_kpis`
- **RPC Functions**: `refresh_mv_master_kpis()`, `get_master_kpis()`, `get_master_feed()`
- **Security**: `is_master()` function and RLS policies

### 3. **Edge Functions** (`supabase/functions/master-metrics/`)
- **Purpose**: Server-side data processing and API endpoints
- **Features**:
  - `GET /master/metrics` returns `{ kpis, alerts24h, mqttSeries }`
  - Master role verification
  - Optimized database queries
  - CORS support

### 4. **Frontend Components**
- **Master Overview**: Real-time dashboard with KPIs, charts, and live feed
- **API Client**: Centralized data fetching and error handling
- **Access Control**: Role-based access with `RequireRole` components
- **Master Layout**: Consistent UI wrapper for master pages

### 5. **Services**
- **AuditService**: Comprehensive audit logging for all master actions
- **DeviceStatusService**: MQTT message publishing and device event handling
- **AggregationService**: Data collection and real-time updates
- **AlertEngine**: Enhanced with database insertion for master dashboard

## Data Flow

### **Device Status Publishing**
```typescript
// ESP32 publishes on connect
{
  "online": true,
  "ip": "192.168.1.100",
  "rssi": -45,
  "battery_pct": 85
}

// ESP32 publishes LWT on disconnect
{
  "online": false
}
```

### **Device Events**
```typescript
// Device publishes events
{
  "level": "warning",
  "code": "overheat",
  "message": "Device overheating: 85.5°C",
  "meta": { "temperature": 85.5 }
}
```

### **Alert Generation**
```typescript
// Alert engine inserts into database
{
  "id": "alert-uuid",
  "rule_id": "rule-uuid",
  "device_id": "device-id",
  "severity": "critical",
  "title": "High Temperature Alert",
  "description": "device-id • 75°C",
  "channels": ["app", "toast", "browser"],
  "created_at": "2024-01-15T10:30:00Z"
}
```

### **Audit Logging**
```typescript
// Master actions logged
{
  "actor_id": "user-uuid",
  "action": "device_reassign",
  "target_type": "device",
  "target_id": "device-id",
  "details": { "fromUser": "user1", "toUser": "user2" }
}
```

## Master Dashboard Features

### **Real-time KPIs**
- Total users and devices
- Online/offline device counts
- 24-hour critical alerts and errors
- MQTT traffic statistics
- System uptime and performance

### **Live Feed**
- Real-time alerts, events, and audit logs
- Color-coded event types
- Device context and timestamps
- Auto-scrolling and filtering

### **Alert Summary**
- 24-hour alert breakdown by severity
- Critical, warning, and info alerts
- Visual severity indicators

### **MQTT Throughput Chart**
- Simple SVG-based line chart
- Inbound/outbound message patterns
- Hourly data points
- No external dependencies

## Security & Access Control

### **Authentication**
- Supabase JWT-based authentication
- Session management with auto-refresh
- Secure token validation

### **Authorization**
- Master role required for dashboard access
- `is_master()` RPC function verification
- Component-level access restrictions
- RLS policies for data isolation

### **Data Protection**
- No sensitive data exposure
- Encrypted data transmission
- Input validation and sanitization
- Audit trail for all actions

## API Endpoints

### **Edge Function**
```
GET /functions/v1/master-metrics
Authorization: Bearer <jwt-token>

Response:
{
  "kpis": { ... },
  "alerts24h": [ ... ],
  "mqttSeries": [ ... ]
}
```

### **RPC Functions**
- `get_master_kpis()`: Fleet-wide KPIs
- `get_device_health()`: Device health status
- `get_mqtt_traffic_stats()`: MQTT statistics
- `get_master_feed()`: Recent events

### **Database Views**
- `v_alerts_24h_summary`: Alert summaries
- `v_mqtt_last_hour`: MQTT traffic data
- `v_device_online_counts`: Device status
- `v_user_device_counts`: User relationships

## Real-time Features

### **Supabase Realtime Subscriptions**
- **Alerts**: New alert insertions
- **Device Events**: Device event insertions
- **Device Status**: Online/offline updates
- **Audit Logs**: System action logging

### **Live Updates**
- Automatic KPI refresh
- Real-time feed updates
- Device status changes
- Alert notifications

## Testing & QA

### **Test Scripts**
- `testAggregations()`: Comprehensive system testing
- `testMasterDashboard()`: Dashboard API testing
- `testAlertEngine()`: Alert functionality testing
- `simulate()`: Device data simulation

### **QA Checklist**
- Setup tests (users, devices, MQTT bridge)
- Data tests (status, events, alerts, audit)
- UI tests (access control, KPIs, charts, feed)
- Security tests (role verification, data isolation)

### **Test Commands**
```javascript
// Browser console commands
testAggregations()      // Run all tests
testMasterDashboard()   // Test dashboard API
testAlertEngine()       // Test alert engine
simulate()              // Simulate device data
```

## Deployment

### **MQTT Bridge**
```bash
# Local development
cd services/mqtt-bridge
npm install
npm run dev

# Docker deployment
docker-compose up -d

# Production
docker stack deploy -c docker-compose.yml saphari-mqtt-bridge
```

### **Environment Variables**
```env
MQTT_URL=wss://broker.emqx.io:8084/mqtt
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your_service_role_key
PORT=3001
ENABLE_HTTP_SERVER=true
```

### **Database Setup**
```sql
-- Run migrations
npx supabase db push

-- Refresh materialized views
SELECT refresh_mv_master_kpis();

-- Test RPC functions
SELECT get_master_kpis();
```

## Monitoring & Maintenance

### **Health Checks**
- MQTT Bridge: `GET /health`
- Database: Connection and query performance
- Real-time: Subscription health
- Error tracking: Comprehensive logging

### **Performance**
- Edge Functions: Fast server-side processing
- Real-time: Efficient live updates
- Caching: Client-side data caching
- Optimization: Indexed queries and views

### **Scaling**
- Horizontal: Multiple dashboard instances
- Vertical: Increased resources
- Auto-scaling: Kubernetes HPA
- Load balancing: Distributed traffic

## Troubleshooting

### **Common Issues**
1. **Access Denied**: Verify master role assignment
2. **No Data**: Check API connectivity and permissions
3. **Real-time Not Working**: Verify Supabase Realtime connection
4. **MQTT Bridge Down**: Check service status and connectivity

### **Debug Mode**
```javascript
// Enable debug logging
localStorage.setItem('debug', 'master-dashboard');

// Check connections
console.log('MQTT:', getConnectionStatus());
console.log('Supabase:', supabase.auth.getSession());
```

### **Error Recovery**
- Automatic retry for failed requests
- Fallback data when live data unavailable
- Error boundaries for graceful handling
- User feedback and recovery options

## Future Enhancements

### **Planned Features**
- Advanced analytics and insights
- Custom dashboard layouts
- Data export and reporting
- Mobile application
- Webhook integrations
- Incident correlation

### **Performance Improvements**
- Redis caching layer
- CDN integration
- Database optimization
- Enhanced real-time capabilities

## Conclusion

The Complete Master Aggregations System provides a robust, scalable solution for monitoring and managing the entire SapHari IoT platform. With real-time capabilities, comprehensive security, and excellent user experience, it enables effective fleet management and system oversight.

**Key Benefits:**
- **Real-time Monitoring**: Live data updates and notifications
- **Comprehensive Analytics**: Fleet-wide insights and metrics
- **Secure Access**: Role-based access control and audit logging
- **Scalable Architecture**: Horizontal and vertical scaling support
- **Easy Testing**: Comprehensive test suite and QA checklist
- **Production Ready**: Docker support and deployment guides

The system is now **fully functional** and ready for production use! 🎉
