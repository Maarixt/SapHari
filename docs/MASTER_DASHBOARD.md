# Master Dashboard Documentation

## Overview

The Master Dashboard is a comprehensive admin interface for the SapHari IoT platform that provides real-time monitoring, analytics, and management capabilities for the entire fleet of devices and users.

## Features

### 🎯 **Real-time Monitoring**
- **Live KPIs**: Total users, devices, online/offline status, alerts, and errors
- **Live Feed**: Real-time stream of alerts, events, and audit logs
- **MQTT Throughput**: Visual charts showing message traffic over time
- **Device Status**: Real-time device health and connectivity monitoring

### 📊 **Analytics & Insights**
- **Fleet Overview**: Comprehensive statistics across all devices and users
- **Alert Analysis**: 24-hour alert summaries with severity breakdowns
- **Traffic Analysis**: MQTT message patterns and throughput metrics
- **Performance Metrics**: System performance and uptime statistics

### 🔐 **Security & Access Control**
- **Role-based Access**: Master role required for all dashboard features
- **Authentication**: Secure access with Supabase authentication
- **Audit Trail**: Complete logging of all master actions
- **Session Management**: Secure session handling and timeout

## Architecture

### **Frontend Components**
```
Master Dashboard
├── MasterLayout (Wrapper with auth)
├── MasterOverview (Main dashboard)
├── RequireRole (Access control)
├── API Client (Data fetching)
└── Real-time Subscriptions
```

### **Data Flow**
```
MQTT Bridge → Supabase Database → Edge Functions → Master Dashboard
     ↓              ↓                    ↓              ↓
Device Data → Data Storage → API Layer → Real-time UI
```

## Components

### **1. Master Overview (`src/pages/master/Overview.tsx`)**

The main dashboard component that displays:
- **KPI Cards**: Key performance indicators in a grid layout
- **Alert Summary**: 24-hour alert breakdown by severity
- **MQTT Chart**: Simple SVG-based line chart for traffic visualization
- **Live Feed**: Real-time event stream with filtering

**Key Features:**
- Real-time data updates via Supabase Realtime
- Error handling and loading states
- Responsive design for different screen sizes
- Live feed with automatic scrolling and filtering

### **2. API Client (`src/lib/api.ts`)**

Centralized API client for all master dashboard data:
- **fetchMasterMetrics()**: Gets KPIs, alerts, and MQTT data
- **checkMasterRole()**: Verifies master role access
- **getUserRole()**: Gets current user's role
- **fetchFleetKPIs()**: Alternative KPI fetching method
- **fetchDeviceHealth()**: Device health monitoring
- **fetchRecentEvents()**: Recent system events

### **3. Access Control (`src/components/auth/RequireRole.tsx`)**

Role-based access control system:
- **RequireRole**: Generic role requirement component
- **RequireMaster**: Specialized master role component
- **RoleBasedContent**: Conditional content rendering
- **useRole**: Hook for role checking
- **useMasterRole**: Hook for master role checking

### **4. Master Layout (`src/components/master/MasterLayout.tsx`)**

Layout wrapper for master dashboard:
- **Master Header**: Crown icon, title, and status indicators
- **Master Navigation**: Quick access to different sections
- **Master Status**: Live monitoring status indicator
- **Responsive Design**: Mobile-friendly layout

## API Endpoints

### **Edge Function: `/functions/v1/master-metrics`**

Returns comprehensive master dashboard data:
```json
{
  "kpis": {
    "total_users": 150,
    "total_devices": 45,
    "devices_online": 42,
    "devices_offline": 3,
    "critical_alerts_24h": 5,
    "errors_24h": 12,
    "generated_at": "2024-01-15T10:30:00Z"
  },
  "alerts24h": [
    { "severity": "critical", "count": 5 },
    { "severity": "warning", "count": 12 },
    { "severity": "info", "count": 8 }
  ],
  "mqttSeries": [
    { "minute": "2024-01-15T10:00:00Z", "msg_count": 150, "direction": "inbound" },
    { "minute": "2024-01-15T10:01:00Z", "msg_count": 145, "direction": "outbound" }
  ]
}
```

### **RPC Functions**

- **`get_master_kpis()`**: Fleet-wide key performance indicators
- **`get_device_health()`**: Device health status and metrics
- **`get_mqtt_traffic_stats()`**: MQTT traffic statistics
- **`get_master_feed()`**: Recent events and activities

### **Database Views**

- **`v_alerts_24h_summary`**: Alert summaries for the last 24 hours
- **`v_mqtt_last_hour`**: MQTT traffic data for the last hour
- **`v_device_online_counts`**: Real-time device online/offline counts
- **`v_user_device_counts`**: User and device relationship counts

## Real-time Features

### **Supabase Realtime Subscriptions**

The dashboard subscribes to real-time updates for:
- **Alerts**: New alert insertions
- **Device Events**: Device event insertions
- **Device Status**: Device online/offline updates
- **Audit Logs**: System audit trail updates

### **Live Feed**

The live feed displays:
- **Alert Events**: Critical alerts and notifications
- **Device Events**: Device status changes and errors
- **Audit Events**: System actions and user activities
- **Real-time Timestamps**: Precise timing for all events

## Security

### **Authentication**
- Supabase authentication required
- JWT token validation
- Session management with automatic refresh

### **Authorization**
- Master role required for access
- Role checking via `is_master()` RPC function
- Access denied for non-master users

### **Data Protection**
- No sensitive data exposure
- Encrypted data transmission
- Secure API endpoints

## Usage

### **Accessing the Dashboard**

1. **Login**: Use master account credentials
2. **Navigate**: Click "Master Dashboard" in the settings menu
3. **View**: Dashboard loads with real-time data
4. **Monitor**: Watch live feed for system events

### **Navigation**

- **Main Dashboard**: `/master` - Overview and KPIs
- **Settings Menu**: Access via header dropdown (master users only)
- **Direct URL**: Navigate directly to `/master` (requires authentication)

### **Testing**

Use the development test function:
```javascript
// In browser console
testMasterDashboard()
```

This will test:
- Master role verification
- API endpoint connectivity
- Data fetching functionality
- Error handling

## Performance

### **Optimizations**
- **Edge Functions**: Fast server-side data processing
- **Real-time Subscriptions**: Efficient live updates
- **Caching**: Client-side data caching
- **Lazy Loading**: Components load on demand

### **Scalability**
- **Horizontal Scaling**: Multiple dashboard instances
- **Database Optimization**: Indexed queries and views
- **CDN Support**: Static asset delivery
- **Load Balancing**: Distributed traffic handling

## Monitoring

### **Health Checks**
- **API Endpoints**: Regular connectivity tests
- **Database**: Connection and query performance
- **Real-time**: Subscription health monitoring
- **Error Tracking**: Comprehensive error logging

### **Metrics**
- **Response Times**: API endpoint performance
- **Data Freshness**: Real-time update latency
- **Error Rates**: System error tracking
- **User Activity**: Dashboard usage statistics

## Troubleshooting

### **Common Issues**

1. **Access Denied**
   - Verify master role assignment
   - Check authentication status
   - Confirm user permissions

2. **No Data Loading**
   - Check API endpoint connectivity
   - Verify database permissions
   - Review error logs

3. **Real-time Updates Not Working**
   - Check Supabase Realtime connection
   - Verify subscription setup
   - Review network connectivity

### **Debug Mode**

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('debug', 'master-dashboard');
```

### **Error Recovery**

- **Automatic Retry**: Failed requests retry automatically
- **Fallback Data**: Cached data used when live data unavailable
- **Error Boundaries**: Graceful error handling
- **User Feedback**: Clear error messages and recovery options

## Development

### **Local Development**

1. **Setup**: Ensure Supabase project configured
2. **Environment**: Set up environment variables
3. **Database**: Run migrations and seed data
4. **Start**: Run development server

### **Testing**

```bash
# Run tests
npm test

# Test master dashboard
npm run test:master

# Test API endpoints
npm run test:api
```

### **Deployment**

1. **Build**: Create production build
2. **Deploy**: Deploy to hosting platform
3. **Configure**: Set up environment variables
4. **Monitor**: Set up monitoring and alerts

## Future Enhancements

### **Planned Features**
- **Advanced Analytics**: More detailed metrics and insights
- **Custom Dashboards**: User-configurable dashboard layouts
- **Export Functionality**: Data export and reporting
- **Mobile App**: Native mobile application
- **API Documentation**: Comprehensive API documentation
- **Webhook Integration**: External system integrations

### **Performance Improvements**
- **Caching Layer**: Redis-based caching
- **CDN Integration**: Global content delivery
- **Database Optimization**: Query optimization and indexing
- **Real-time Scaling**: Enhanced real-time capabilities

This Master Dashboard provides a comprehensive solution for monitoring and managing the SapHari IoT platform at scale, with real-time capabilities, robust security, and excellent user experience.
