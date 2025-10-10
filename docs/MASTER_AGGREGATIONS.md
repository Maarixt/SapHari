# Master Aggregations System

## Overview

The Master Aggregations system provides comprehensive fleet-wide monitoring, diagnostics, and analytics for the SapHari IoT platform. It collects, processes, and visualizes data from all devices, users, and system components in real-time.

## Architecture

### Database Schema

The system uses several PostgreSQL tables and materialized views:

#### Core Tables
- **`device_states`**: Historical device state snapshots
- **`device_events`**: All device activities and events
- **`mqtt_traffic`**: MQTT message traffic monitoring
- **`system_errors`**: System error tracking and resolution

#### Materialized Views
- **`fleet_kpis`**: Fleet-wide key performance indicators
- **`device_health_summary`**: Device health status and metrics

#### RPC Functions
- **`get_fleet_kpis()`**: Retrieve fleet KPIs with time range filtering
- **`get_device_health()`**: Get device health with filtering and pagination
- **`get_recent_events()`**: Retrieve recent events with type filtering
- **`get_mqtt_traffic_stats()`**: MQTT traffic statistics and analysis
- **`refresh_fleet_views()`**: Refresh materialized views

### Data Collection

#### Automatic Collection
- **Device States**: Captured on every MQTT state update
- **Device Events**: Status changes, alerts, commands, errors
- **MQTT Traffic**: All inbound/outbound message tracking
- **System Errors**: Application and infrastructure errors

#### Manual Collection
- **Alert Triggers**: Recorded when alerts fire
- **Command Execution**: Tracked when commands are sent
- **User Actions**: Admin and user activities

### Real-time Updates

#### Supabase Realtime
- Live updates via PostgreSQL change streams
- Automatic UI refresh on data changes
- Efficient subscription management

#### Edge Functions
- **`master-metrics`**: Derived metrics and complex calculations
- Real-time performance analysis
- Traffic pattern analysis
- Error trend analysis

## Features

### Fleet Overview Dashboard

#### KPI Cards
- **Total Devices**: Count with online/offline status
- **Total Users**: User count with new user metrics
- **Active Alerts**: Alert count with severity breakdown
- **MQTT Traffic**: Message count and data transfer

#### Device Health Monitoring
- **Health Status**: Healthy, Warning, Critical classification
- **Search & Filter**: Find devices by name, ID, or owner
- **Real-time Status**: Online/offline indicators
- **Performance Metrics**: Alerts, errors, traffic per device

#### Recent Events Feed
- **Event Types**: Alerts, errors, commands, status changes
- **Severity Levels**: Critical, Error, Warning, Info
- **Search & Filter**: Find events by content or type
- **Real-time Updates**: Live event stream

#### MQTT Traffic Analysis
- **Traffic Overview**: Total messages and data transfer
- **Direction Analysis**: Inbound vs outbound traffic
- **Top Devices**: Devices with highest traffic
- **Hourly Breakdown**: Traffic patterns over time

#### Performance Metrics
- **System Performance**: Response times, throughput, error rates
- **Database Performance**: Query times, connections, cache hit rates
- **Resource Usage**: CPU, memory, disk I/O

### Diagnostics Feed

#### Event Stream
- **Real-time Events**: Live system diagnostics
- **Event Classification**: System, Device, MQTT, Database, Alert, Error
- **Severity Indicators**: Visual severity indicators
- **Auto-refresh**: Configurable refresh intervals

#### System Health Indicators
- **Service Status**: Database, MQTT, API health
- **Performance Metrics**: Response times, throughput
- **Resource Monitoring**: CPU, memory, disk usage

#### Event Management
- **Filtering**: By type, severity, or status
- **Resolution**: Mark events as resolved
- **Export**: Export event data for analysis

## Security & Access Control

### Role-Based Access Control (RBAC)
- **Master Role**: Full access to all aggregations
- **Admin Role**: Limited access to user/device data
- **Row Level Security (RLS)**: Database-level access control

### Data Privacy
- **Sensitive Data Toggle**: Hide/show sensitive information
- **User Data Protection**: Encrypted storage and transmission
- **Audit Logging**: All access and modifications logged

## Usage

### Accessing the Dashboard

1. **Login as Master**: Use master account credentials
2. **Navigate to Master Panel**: Click on master account in header
3. **Select Overview Tab**: View fleet aggregations
4. **Select Diagnostics Tab**: View real-time diagnostics

### Testing the System

```javascript
// In browser console (development mode)
testMasterAggregations();
```

This will:
- Simulate device states and events
- Generate MQTT traffic data
- Create system errors
- Trigger test alerts
- Populate the aggregation tables

### API Endpoints

#### Fleet Overview
```
GET /api/fleet-overview?timeRange=24h
```

#### Device Metrics
```
GET /api/device-metrics?deviceId=device-001&timeRange=24h
```

#### Traffic Analysis
```
GET /api/traffic-analysis?timeRange=24h
```

#### Error Analysis
```
GET /api/error-analysis?timeRange=24h
```

#### Performance Metrics
```
GET /api/performance-metrics?timeRange=24h
```

## Configuration

### Environment Variables

```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# MQTT
MQTT_URL=wss://broker.emqx.io:8084/mqtt

# Real-time
REALTIME_ENABLED=true
REALTIME_REFRESH_INTERVAL=5000
```

### Database Setup

1. **Run Migration**: Apply the master aggregations schema
2. **Enable Extensions**: Ensure required PostgreSQL extensions
3. **Set Permissions**: Configure RLS policies
4. **Create Views**: Initialize materialized views

### Performance Tuning

#### Materialized View Refresh
- **Automatic**: Every 5 minutes via cron job
- **Manual**: Via `refresh_fleet_views()` function
- **Concurrent**: Non-blocking refresh for production

#### Indexing
- **Device States**: Indexed on device_id, user_id, created_at
- **Events**: Indexed on device_id, event_type, severity, created_at
- **Traffic**: Indexed on device_id, direction, created_at
- **Errors**: Indexed on device_id, severity, resolved, created_at

## Monitoring & Maintenance

### Health Checks
- **Database Connectivity**: Regular connection tests
- **MQTT Broker**: Connection status monitoring
- **Edge Functions**: Function execution monitoring
- **Materialized Views**: Refresh status tracking

### Performance Monitoring
- **Query Performance**: Slow query identification
- **Index Usage**: Index efficiency monitoring
- **Storage Growth**: Data volume tracking
- **Memory Usage**: Cache and buffer monitoring

### Maintenance Tasks
- **Data Cleanup**: Archive old data (configurable retention)
- **Index Maintenance**: Rebuild indexes as needed
- **View Refresh**: Ensure views stay current
- **Error Resolution**: Track and resolve system errors

## Troubleshooting

### Common Issues

#### Data Not Appearing
1. Check database connection
2. Verify RLS policies
3. Confirm user has master role
4. Check materialized view refresh

#### Performance Issues
1. Check index usage
2. Monitor query performance
3. Verify view refresh frequency
4. Check resource usage

#### Real-time Updates Not Working
1. Verify Supabase Realtime is enabled
2. Check subscription status
3. Confirm network connectivity
4. Check browser console for errors

### Debug Commands

```javascript
// Check aggregation service status
console.log(aggregationService);

// Test data collection
testMasterAggregations();

// Check device store
console.log(DeviceStore.all());

// Check alerts store
console.log(AlertsStore.listHistory());
```

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Machine learning insights
- **Predictive Alerts**: Anomaly detection
- **Custom Dashboards**: User-configurable views
- **Data Export**: CSV/JSON export functionality
- **API Rate Limiting**: Request throttling
- **Caching Layer**: Redis integration
- **Multi-tenant Support**: Organization-level isolation

### Performance Improvements
- **Streaming Analytics**: Real-time data processing
- **Compression**: Data compression for storage
- **Partitioning**: Table partitioning for large datasets
- **Read Replicas**: Read-only replicas for queries
- **CDN Integration**: Static asset optimization

## Support

For issues or questions regarding the Master Aggregations system:

1. **Check Logs**: Review browser console and server logs
2. **Test Functions**: Use provided test functions
3. **Database Queries**: Run direct SQL queries for debugging
4. **Documentation**: Refer to this documentation
5. **Community**: Check project issues and discussions
