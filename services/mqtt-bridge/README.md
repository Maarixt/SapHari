# MQTT Bridge Service

A lightweight Node.js service that bridges MQTT messages to Supabase database for the SapHari IoT platform.

## Overview

The MQTT Bridge service subscribes to device MQTT topics and automatically writes data to the Supabase database, enabling real-time data collection and aggregation for the master dashboard.

## Features

- **MQTT Subscription**: Subscribes to all device topics (`devices/+/state`, `devices/+/event`, `devices/+/status`, etc.)
- **Database Integration**: Writes to `mqtt_messages`, `device_events`, `device_status`, and `audit_logs` tables
- **Automatic Reconnection**: Handles MQTT broker disconnections gracefully
- **Health Monitoring**: Optional HTTP health check endpoint
- **Docker Support**: Ready for containerized deployment
- **TypeScript**: Full TypeScript support with type safety

## Topics Handled

- `devices/{device_id}/status` → Updates `device_status` table
- `devices/{device_id}/event` → Inserts into `device_events` table
- `devices/{device_id}/state` → Updates device status and records state change
- `devices/{device_id}/cmd` → Records command in audit logs
- `devices/{device_id}/ack` → Records acknowledgment events

## Environment Variables

```env
# MQTT Configuration
MQTT_URL=wss://broker.emqx.io:8084/mqtt

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key

# Server Configuration
PORT=3001
ENABLE_HTTP_SERVER=true

# Logging
LOG_LEVEL=info
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit environment variables
nano .env
```

## Usage

### Development

```bash
# Start with hot reload
npm run dev

# Start normally
npm start
```

### Production

```bash
# Build TypeScript
npm run build

# Start production server
node dist/index.js
```

### Docker

```bash
# Build Docker image
npm run docker:build

# Run with environment file
npm run docker:run
```

## API Endpoints

### Health Check (if HTTP server enabled)

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

## Data Flow

```
MQTT Broker → MQTT Bridge → Supabase Database → Master Dashboard
     ↓              ↓              ↓              ↓
Device Topics → Message Processing → Data Storage → Real-time UI
```

## Message Processing

### Status Messages
```json
{
  "online": true,
  "ip": "192.168.1.100",
  "rssi": -45,
  "battery_pct": 85
}
```

### Event Messages
```json
{
  "level": "info",
  "code": "sensor_reading",
  "message": "Temperature reading: 25.5°C",
  "data": { "temp": 25.5, "humidity": 60 }
}
```

### State Messages
```json
{
  "gpio": { "2": 1, "4": 0 },
  "sensors": { "tempC": 25.5, "humidity": 60 }
}
```

## Database Schema

The service writes to the following tables:

- **`mqtt_messages`**: Raw MQTT message traffic
- **`device_status`**: Current device online/offline status
- **`device_events`**: Device-originated events and logs
- **`audit_logs`**: System actions and commands

## Monitoring

### Logs
The service provides comprehensive logging:
- Connection status
- Message processing
- Error handling
- Performance metrics

### Health Checks
- MQTT connection status
- Database connectivity
- Service uptime

## Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Environment Setup

1. **MQTT Broker**: Ensure MQTT broker is accessible
2. **Supabase**: Configure service role key with proper permissions
3. **Network**: Ensure network connectivity between services
4. **Monitoring**: Set up health check monitoring

## Security

- **Service Role**: Uses Supabase service role key (server-side only)
- **Network**: Runs in secure network environment
- **Authentication**: No client authentication required (server-to-server)
- **Data Validation**: Validates and sanitizes incoming MQTT data

## Troubleshooting

### Common Issues

1. **MQTT Connection Failed**
   - Check MQTT broker URL and connectivity
   - Verify network firewall settings
   - Check MQTT broker authentication

2. **Database Connection Failed**
   - Verify Supabase URL and service role key
   - Check database permissions
   - Ensure RLS policies allow service role access

3. **Message Processing Errors**
   - Check message format and JSON parsing
   - Verify database schema matches expected format
   - Review error logs for specific issues

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start
```

## Performance

- **Throughput**: Handles high-volume MQTT message streams
- **Latency**: Low-latency message processing
- **Memory**: Efficient memory usage with streaming
- **Scalability**: Horizontal scaling with multiple instances

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
