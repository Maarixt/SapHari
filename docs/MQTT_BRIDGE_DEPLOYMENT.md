# MQTT Bridge Deployment Guide

## Overview

The MQTT Bridge service is a critical component of the SapHari Master Aggregations system. It acts as a bridge between MQTT devices and the Supabase database, ensuring all device data is captured and stored for real-time monitoring and analytics.

## Architecture

```
ESP32 Devices → MQTT Broker → MQTT Bridge → Supabase Database → Master Dashboard
     ↓              ↓              ↓              ↓              ↓
Device Data → Message Queue → Data Processing → Data Storage → Real-time UI
```

## Prerequisites

### Required Services
- **MQTT Broker**: EMQX or similar MQTT broker
- **Supabase Project**: Database and Edge Functions
- **Node.js Environment**: For local development
- **Docker**: For containerized deployment

### Environment Variables
```env
MQTT_URL=wss://broker.emqx.io:8084/mqtt
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your_service_role_key
PORT=3001
ENABLE_HTTP_SERVER=true
LOG_LEVEL=info
```

## Deployment Options

### 1. Local Development

```bash
# Clone and setup
cd services/mqtt-bridge
npm install

# Configure environment
cp env.example .env
# Edit .env with your values

# Start development server
npm run dev
```

### 2. Docker Deployment

```bash
# Build and run with Docker Compose
cd services/mqtt-bridge
docker-compose up -d

# Or build and run manually
docker build -t saphari-mqtt-bridge .
docker run --env-file .env -p 3001:3001 saphari-mqtt-bridge
```

### 3. Production Deployment

#### Option A: Docker Swarm
```bash
# Deploy to Docker Swarm
docker stack deploy -c docker-compose.yml saphari-mqtt-bridge
```

#### Option B: Kubernetes
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mqtt-bridge
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mqtt-bridge
  template:
    metadata:
      labels:
        app: mqtt-bridge
    spec:
      containers:
      - name: mqtt-bridge
        image: saphari-mqtt-bridge:latest
        ports:
        - containerPort: 3001
        env:
        - name: MQTT_URL
          value: "wss://broker.emqx.io:8084/mqtt"
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: supabase-secrets
              key: url
        - name: SUPABASE_SERVICE_ROLE
          valueFrom:
            secretKeyRef:
              name: supabase-secrets
              key: service-role
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Option C: Cloud Functions
```bash
# Deploy to Vercel
vercel --prod

# Deploy to AWS Lambda
serverless deploy

# Deploy to Google Cloud Functions
gcloud functions deploy mqtt-bridge --runtime nodejs18 --trigger-http
```

## Configuration

### MQTT Broker Setup

1. **EMQX Configuration**
```bash
# Enable WebSocket support
emqx_ctl listeners add wss 8084 wss

# Configure authentication (optional)
emqx_ctl users add bridge_user bridge_password
```

2. **Topic Structure**
```
devices/{device_id}/status    # Device online/offline status
devices/{device_id}/state     # Device state updates
devices/{device_id}/event     # Device events and logs
devices/{device_id}/cmd       # Commands to device
devices/{device_id}/ack       # Command acknowledgments
```

### Supabase Configuration

1. **Service Role Key**
   - Generate service role key in Supabase dashboard
   - Ensure it has full database access
   - Store securely in environment variables

2. **Database Permissions**
   - Service role should have INSERT/UPDATE permissions
   - RLS policies should allow service role access
   - Ensure tables exist (run migration)

3. **Edge Functions**
   - Deploy master-metrics Edge Function
   - Configure CORS for frontend access
   - Test function endpoints

## Monitoring & Health Checks

### Health Check Endpoint
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "connected": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Monitoring Setup

1. **Prometheus Metrics** (if needed)
```javascript
// Add to index.ts
const prometheus = require('prom-client');
const register = new prometheus.Registry();

const mqttMessagesTotal = new prometheus.Counter({
  name: 'mqtt_messages_total',
  help: 'Total MQTT messages processed',
  registers: [register]
});
```

2. **Logging Configuration**
```javascript
// Structured logging
const winston = require('winston');
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'mqtt-bridge.log' })
  ]
});
```

3. **Alerting Rules**
```yaml
# Prometheus alerting rules
groups:
- name: mqtt-bridge
  rules:
  - alert: MQTTBridgeDown
    expr: up{job="mqtt-bridge"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "MQTT Bridge is down"
      
  - alert: MQTTConnectionLost
    expr: mqtt_connected == 0
    for: 30s
    labels:
      severity: warning
    annotations:
      summary: "MQTT connection lost"
```

## Performance Tuning

### Connection Pooling
```javascript
// Supabase connection pooling
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  db: {
    schema: 'public',
    pool: {
      max: 20,
      min: 5,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    }
  }
});
```

### Message Batching
```javascript
// Batch database writes for better performance
class MessageBatcher {
  constructor(batchSize = 100, flushInterval = 5000) {
    this.batch = [];
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.startFlushTimer();
  }

  async add(message) {
    this.batch.push(message);
    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.batch.length === 0) return;
    
    const batch = this.batch.splice(0);
    await supabase.from('mqtt_messages').insert(batch);
  }
}
```

### Memory Management
```javascript
// Memory usage monitoring
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB'
  });
}, 60000);
```

## Security Considerations

### Network Security
- Use TLS/SSL for MQTT connections
- Implement VPN or private networks
- Use firewall rules to restrict access
- Enable MQTT authentication

### Data Security
- Encrypt sensitive data in transit
- Use service role keys securely
- Implement data validation
- Monitor for suspicious activity

### Access Control
- Limit service role permissions
- Use least privilege principle
- Implement audit logging
- Regular security reviews

## Troubleshooting

### Common Issues

1. **MQTT Connection Failed**
```bash
# Check MQTT broker connectivity
telnet broker.emqx.io 8084

# Test WebSocket connection
wscat -c wss://broker.emqx.io:8084/mqtt
```

2. **Database Connection Issues**
```bash
# Test Supabase connection
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE" \
     "$SUPABASE_URL/rest/v1/"
```

3. **High Memory Usage**
```bash
# Monitor memory usage
docker stats mqtt-bridge

# Check for memory leaks
node --inspect index.js
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Enable MQTT debug
DEBUG=mqtt* npm start
```

### Log Analysis
```bash
# View logs
docker logs -f mqtt-bridge

# Filter error logs
docker logs mqtt-bridge 2>&1 | grep ERROR

# Monitor real-time logs
tail -f /var/log/mqtt-bridge.log
```

## Scaling

### Horizontal Scaling
- Deploy multiple instances
- Use load balancer for health checks
- Implement message partitioning
- Monitor instance health

### Vertical Scaling
- Increase CPU/memory resources
- Optimize database queries
- Implement connection pooling
- Use faster storage

### Auto-scaling
```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mqtt-bridge-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mqtt-bridge
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Backup & Recovery

### Database Backups
- Regular Supabase backups
- Point-in-time recovery
- Cross-region replication
- Disaster recovery plan

### Service Recovery
- Health check monitoring
- Automatic restart policies
- Circuit breaker patterns
- Graceful degradation

## Maintenance

### Regular Tasks
- Monitor service health
- Review error logs
- Update dependencies
- Performance optimization
- Security patches

### Updates
```bash
# Update service
docker pull saphari-mqtt-bridge:latest
docker-compose up -d

# Rollback if needed
docker-compose down
docker-compose up -d --scale mqtt-bridge=0
```

This deployment guide ensures the MQTT Bridge service is properly configured, monitored, and maintained for production use in the SapHari IoT platform.
