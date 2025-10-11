# SapHari Command Acknowledgment System

## 🎯 Overview

The SapHari Command Acknowledgment System provides reliable, auditable command delivery to IoT devices with automatic retry logic, timeout handling, and comprehensive tracking.

## 🔧 Key Features

### ✅ **Reliable Command Delivery**
- **Unique Command IDs**: Each command gets a unique identifier for tracking
- **Automatic Retries**: Failed commands are automatically retried with exponential backoff
- **Timeout Handling**: Commands timeout after configurable periods
- **Delivery Confirmation**: Device acknowledgment required for command completion

### ✅ **Comprehensive Tracking**
- **Command History**: Complete audit trail of all commands sent
- **Status Tracking**: Real-time status updates (pending, sent, acknowledged, failed, timeout)
- **Statistics**: Success rates, failure analysis, and performance metrics
- **Retry Management**: Configurable retry policies and limits

### ✅ **Database Storage**
- **Commands Table**: Stores all command metadata and status
- **Automatic Cleanup**: Expired commands are automatically cleaned up
- **Audit Trail**: Complete history for compliance and debugging

## 📊 Command Schema

### **Command Payload**
```json
{
  "cmd_id": "CMD_1730110200_ABC123",
  "action": "relay",
  "pin": 4,
  "state": 1,
  "value": 255,
  "duration": 5000,
  "ts": 1730110200,
  "metadata": {
    "user_id": "user123",
    "source": "dashboard"
  }
}
```

### **Command Acknowledgment**
```json
{
  "cmd_id": "CMD_1730110200_ABC123",
  "ok": true,
  "error": "Invalid pin number",
  "result": 42,
  "ts": 1730110201
}
```

## 🗄️ Database Schema

### **Commands Table**
```sql
CREATE TABLE commands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    cmd_id TEXT NOT NULL UNIQUE,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'failed', 'timeout')),
    retries INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);
```

## 🔄 Command Flow

### **1. Command Creation**
```typescript
// Frontend sends command
const ack = await commandService.sendCommand('device-1', 'relay', {
  pin: 4,
  state: 1
});
```

### **2. Database Storage**
- Command stored in `commands` table with status `pending`
- Unique `cmd_id` generated
- Expiration time set (default: 5 minutes)

### **3. MQTT Publishing**
- Command published to `saphari/{tenant}/devices/{device}/cmd`
- Status updated to `sent`
- Retry timer started

### **4. Device Processing**
- ESP32 receives command
- Executes action (relay, PWM, etc.)
- Sends acknowledgment to `saphari/{tenant}/devices/{device}/ack`

### **5. Acknowledgment Processing**
- Frontend receives ACK via MQTT
- Database updated with result
- Promise resolved/rejected

### **6. Retry Logic**
- If no ACK received within timeout
- Command retried with exponential backoff
- Max retries configurable (default: 3)

## 🛠️ Implementation

### **ESP32 Firmware**
```cpp
// Handle incoming commands
void onCommand(char* topic, byte* payload, unsigned int len) {
  // Parse command
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, len);
  
  const char* cmd_id = doc["cmd_id"];
  const char* action = doc["action"];
  int pin = doc["pin"];
  int state = doc["state"];
  
  // Execute command
  bool success = executeCommand(action, pin, state);
  
  // Send acknowledgment
  sendCommandAck(cmd_id, success, error_msg);
}

// Send acknowledgment
void sendCommandAck(const String& cmd_id, bool ok, const String& error_msg = "") {
  StaticJsonDocument<128> ack;
  ack["cmd_id"] = cmd_id;
  ack["ok"] = ok;
  ack["error"] = error_msg;
  ack["ts"] = millis() / 1000;
  
  char payload[128];
  serializeJson(ack, payload);
  
  String ackTopic = secureTopic("ack");
  mqttClient.publish(ackTopic.c_str(), payload, true);
}
```

### **Frontend Service**
```typescript
// Command service with retry logic
class CommandService {
  private pendingCommands = new Map<string, PendingCommand>();
  
  async sendCommand(deviceId: string, action: string, options: any): Promise<CommandAck> {
    // Create command
    const command = createCommand(action, deviceId, options);
    
    // Store in database
    await this.storeCommand(command);
    
    // Send via MQTT with retry logic
    return this.sendCommandViaMqtt(command);
  }
  
  private async sendCommandViaMqtt(command: CommandPayload): Promise<CommandAck> {
    return new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.handleCommandTimeout(command.cmd_id);
      }, this.config.timeoutMs);
      
      // Store pending command
      this.pendingCommands.set(command.cmd_id, {
        command,
        resolve,
        reject,
        timeout,
        retries: 0
      });
      
      // Publish command
      this.mqttClient.publish(topic, JSON.stringify(command));
    });
  }
}
```

### **Server MQTT Bridge**
```typescript
// Handle command acknowledgments
client.on('message', async (topic, payload) => {
  if (topic.endsWith('/ack')) {
    const ack = JSON.parse(payload.toString());
    
    // Log acknowledgment
    await fetch('/api/commands/ack', {
      method: 'POST',
      body: JSON.stringify({
        deviceId,
        tenantId,
        cmd_id: ack.cmd_id,
        ok: ack.ok,
        error: ack.error
      })
    });
    
    // Send notification for failures
    if (!ack.ok) {
      await this.sendFailureNotification(deviceId, ack);
    }
  }
});
```

## 📈 Command Statistics

### **Success Rate Calculation**
```sql
SELECT 
  device_id,
  COUNT(*) as total_commands,
  COUNT(*) FILTER (WHERE status = 'acknowledged') as successful_commands,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'acknowledged')::NUMERIC / COUNT(*)) * 100, 
    2
  ) as success_rate
FROM commands
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY device_id;
```

### **Retry Analysis**
```sql
SELECT 
  device_id,
  AVG(retries) as avg_retries,
  MAX(retries) as max_retries,
  COUNT(*) FILTER (WHERE retries > 0) as commands_with_retries
FROM commands
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY device_id;
```

## 🔧 Configuration

### **Retry Configuration**
```typescript
interface RetryConfig {
  maxRetries: number;        // Default: 3
  timeoutMs: number;         // Default: 5000ms
  backoffMs: number;         // Default: 1000ms
  exponentialBackoff: boolean; // Default: true
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  timeoutMs: 5000,
  backoffMs: 1000,
  exponentialBackoff: true
};
```

### **Command Timeout Calculation**
```typescript
function calculateCommandTimeout(retries: number, config: RetryConfig): number {
  if (!config.exponentialBackoff) {
    return config.timeoutMs;
  }
  return config.timeoutMs * Math.pow(2, retries);
}
```

## 🧪 Testing

### **Test Command Flow**
```typescript
// Test reliable command sending
async function testCommandFlow() {
  try {
    const ack = await commandService.sendCommand('test-device', 'relay', {
      pin: 4,
      state: 1
    });
    
    console.log('Command succeeded:', ack);
  } catch (error) {
    console.error('Command failed:', error);
  }
}
```

### **Test Retry Logic**
```typescript
// Test retry with short timeout
const retryConfig = {
  maxRetries: 2,
  timeoutMs: 1000, // 1 second timeout
  backoffMs: 500,
  exponentialBackoff: true
};

const ack = await commandService.sendCommand('device-1', 'relay', {
  pin: 4,
  state: 1
}, retryConfig);
```

## 📊 Monitoring & Debugging

### **Command Status Dashboard**
- **Pending Commands**: Real-time count of commands waiting for ACK
- **Success Rate**: Percentage of successful commands per device
- **Average Response Time**: Time from send to acknowledgment
- **Retry Statistics**: Number of retries per command

### **Debug Logging**
```typescript
// Enable debug logging
console.log('Command sent:', command.cmd_id);
console.log('ACK received:', ack.cmd_id, ack.ok);
console.log('Command timeout:', command.cmd_id);
console.log('Retry attempt:', command.cmd_id, retryCount);
```

## 🚨 Error Handling

### **Common Error Scenarios**
1. **Device Offline**: Command times out, retries until max retries
2. **Invalid Command**: Device sends error ACK immediately
3. **Network Issues**: MQTT disconnection triggers retry logic
4. **Device Busy**: Device may delay ACK, timeout handles this

### **Error Recovery**
- **Automatic Retries**: Failed commands automatically retried
- **Exponential Backoff**: Prevents overwhelming busy devices
- **Timeout Handling**: Commands don't hang indefinitely
- **Cleanup**: Expired commands automatically removed

## 🔒 Security Considerations

### **Command Validation**
- **Schema Validation**: All commands validated against schema
- **Device Authorization**: Commands only sent to authorized devices
- **Tenant Isolation**: Commands isolated by tenant
- **Audit Trail**: Complete history for security analysis

### **Rate Limiting**
- **Command Throttling**: Prevent command flooding
- **Device Limits**: Max concurrent commands per device
- **User Limits**: Max commands per user per minute

## 📋 Best Practices

### **Command Design**
1. **Idempotent Commands**: Commands should be safe to retry
2. **Clear Actions**: Use descriptive action names
3. **Parameter Validation**: Validate all command parameters
4. **Error Messages**: Provide clear error descriptions

### **Retry Strategy**
1. **Exponential Backoff**: Prevent overwhelming devices
2. **Max Retries**: Set reasonable retry limits
3. **Timeout Configuration**: Balance responsiveness vs reliability
4. **Circuit Breaker**: Stop sending to consistently failing devices

### **Monitoring**
1. **Success Rate Tracking**: Monitor command success rates
2. **Response Time Monitoring**: Track command response times
3. **Error Analysis**: Analyze common failure patterns
4. **Device Health**: Monitor device command processing health

## 🎯 Success Metrics

- **Command Success Rate**: > 95% for healthy devices
- **Average Response Time**: < 2 seconds for simple commands
- **Retry Rate**: < 10% of commands require retries
- **Timeout Rate**: < 5% of commands timeout
- **Database Performance**: < 100ms for command storage/retrieval

## 🔄 Future Enhancements

1. **Command Queuing**: Queue commands for offline devices
2. **Priority Commands**: High-priority commands get faster processing
3. **Batch Commands**: Send multiple commands in single message
4. **Command Scheduling**: Schedule commands for future execution
5. **Device Templates**: Predefined command templates for device types
