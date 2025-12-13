import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, CheckCircle, AlertTriangle, Code, FileCode, Settings } from 'lucide-react';
import { usePlatformBroker } from '@/hooks/usePlatformBroker';
import { Device, Widget } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface SnippetGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  widgets: Widget[];
}

interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
}

export function SnippetGenerator({ open, onOpenChange, device, widgets }: SnippetGeneratorProps) {
  const { config, loading, testBrokerHealth, healthResult, testing } = usePlatformBroker();
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  // Validate configuration on open
  useEffect(() => {
    if (open && config) {
      const issues: ValidationIssue[] = [];
      
      // Check DNS resolution
      if (config.tcp_host.includes('saphari.net') && !config.tcp_host.includes('broker.emqx')) {
        issues.push({
          type: 'warning',
          message: `Custom domain "${config.tcp_host}" may not resolve. Consider using a public broker or setting up DNS.`
        });
      }

      // Check for missing device info
      if (!device.device_id) {
        issues.push({ type: 'error', message: 'Device ID is missing' });
      }

      // Check TLS configuration
      if (!config.use_tls) {
        issues.push({
          type: 'warning',
          message: 'TLS is disabled. Production deployments should use encrypted connections.'
        });
      }

      // Check for widgets
      if (widgets.length === 0) {
        issues.push({
          type: 'warning',
          message: 'No widgets configured for this device. Add widgets to generate complete code.'
        });
      }

      setValidationIssues(issues);
    }
  }, [open, config, device, widgets]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(null), 2000);
  };

  const generateConfigHeader = () => {
    if (!config) return '// Configuration not loaded';

    return `// ============================================
// SapHari Device Configuration
// Generated: ${new Date().toISOString()}
// Device: ${device.name} (${device.device_id})
// ============================================

#ifndef SAPHARI_CONFIG_H
#define SAPHARI_CONFIG_H

// Device Identity
#define DEVICE_ID       "${device.device_id}"
#define DEVICE_NAME     "${device.name}"

// MQTT Broker Configuration
#define MQTT_HOST       "${config.tcp_host}"
#define MQTT_PORT       ${config.use_tls ? config.tls_port : config.tcp_port}
#define MQTT_USE_TLS    ${config.use_tls ? 'true' : 'false'}
${config.username ? `#define MQTT_USERNAME   "${config.username}"` : '// #define MQTT_USERNAME   "your_username"'}
${config.password ? `#define MQTT_PASSWORD   "${config.password}"` : '// #define MQTT_PASSWORD   "your_password"'}

// MQTT Topics
#define TOPIC_PREFIX    "saphari/" DEVICE_ID
#define TOPIC_STATUS    TOPIC_PREFIX "/status/online"
#define TOPIC_STATE     TOPIC_PREFIX "/state"
#define TOPIC_CMD       TOPIC_PREFIX "/cmd/#"
#define TOPIC_ACK       TOPIC_PREFIX "/ack"

// Widget Configurations
${generateWidgetDefines()}

// Heartbeat & Presence
#define HEARTBEAT_INTERVAL_MS   30000
#define RECONNECT_DELAY_MS      5000
#define MAX_RECONNECT_DELAY_MS  60000

#endif // SAPHARI_CONFIG_H`;
  };

  const generateWidgetDefines = () => {
    const lines: string[] = [];
    
    const switches = widgets.filter(w => w.type === 'switch');
    const gauges = widgets.filter(w => w.type === 'gauge');
    const servos = widgets.filter(w => w.type === 'servo');

    if (switches.length > 0) {
      lines.push(`#define SWITCH_COUNT    ${switches.length}`);
      switches.forEach((w, i) => {
        lines.push(`#define SWITCH_${i}_PIN  ${w.pin ?? 'GPIO_NUM_NC'}`);
        lines.push(`#define SWITCH_${i}_ADDR "${w.address}"`);
      });
    }

    if (gauges.length > 0) {
      lines.push(`#define GAUGE_COUNT     ${gauges.length}`);
      gauges.forEach((w, i) => {
        lines.push(`#define GAUGE_${i}_PIN   ${w.pin ?? 'GPIO_NUM_NC'}`);
        lines.push(`#define GAUGE_${i}_ADDR  "${w.address}"`);
        lines.push(`#define GAUGE_${i}_TYPE  "${w.gauge_type || 'analog'}"`);
      });
    }

    if (servos.length > 0) {
      lines.push(`#define SERVO_COUNT     ${servos.length}`);
      servos.forEach((w, i) => {
        lines.push(`#define SERVO_${i}_PIN   ${w.pin ?? 'GPIO_NUM_NC'}`);
        lines.push(`#define SERVO_${i}_ADDR  "${w.address}"`);
      });
    }

    return lines.join('\n');
  };

  const generateArduinoSketch = () => {
    if (!config) return '// Configuration not loaded';

    return `// ============================================
// SapHari ESP32 Arduino Sketch
// Device: ${device.name}
// ============================================

#include <WiFi.h>
#include <PubSubClient.h>
${config.use_tls ? '#include <WiFiClientSecure.h>' : ''}
#include "saphari_config.h"  // Include the config header

// WiFi credentials (set these for your network)
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Client
${config.use_tls ? 'WiFiClientSecure espClient;' : 'WiFiClient espClient;'}
PubSubClient mqtt(espClient);

// State tracking
unsigned long lastHeartbeat = 0;
unsigned long lastReconnectAttempt = 0;
unsigned long reconnectDelay = RECONNECT_DELAY_MS;
bool wasConnected = false;

// ========================================
// Setup
// ========================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n\\n=== SapHari Device Starting ===");
  Serial.printf("Device ID: %s\\n", DEVICE_ID);
  Serial.printf("MQTT Host: %s:%d\\n", MQTT_HOST, MQTT_PORT);
  
  setupWiFi();
  setupMQTT();
  setupPins();
}

void setupWiFi() {
  Serial.printf("Connecting to WiFi: %s\\n", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\\nWiFi connected! IP: %s\\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\\nWiFi connection failed!");
  }
}

void setupMQTT() {
  ${config.use_tls ? 'espClient.setInsecure(); // For testing. Use proper certs in production!' : ''}
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);
}

void setupPins() {
  // Configure GPIO pins based on widgets
${widgets.filter(w => w.type === 'switch' && w.pin).map(w => 
  `  pinMode(${w.pin}, OUTPUT);`
).join('\n') || '  // No switch pins configured'}
}

// ========================================
// Main Loop
// ========================================
void loop() {
  // Ensure WiFi is connected
  if (WiFi.status() != WL_CONNECTED) {
    setupWiFi();
    return;
  }
  
  // Maintain MQTT connection
  if (!mqtt.connected()) {
    if (wasConnected) {
      Serial.println("MQTT disconnected!");
      wasConnected = false;
    }
    reconnectMQTT();
  } else {
    if (!wasConnected) {
      Serial.println("MQTT connected!");
      wasConnected = true;
      reconnectDelay = RECONNECT_DELAY_MS; // Reset backoff
    }
    mqtt.loop();
    
    // Send heartbeat
    if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
      sendHeartbeat();
      lastHeartbeat = millis();
    }
  }
}

// ========================================
// MQTT Functions
// ========================================
void reconnectMQTT() {
  if (millis() - lastReconnectAttempt < reconnectDelay) return;
  lastReconnectAttempt = millis();
  
  Serial.printf("Connecting to MQTT broker %s:%d...\\n", MQTT_HOST, MQTT_PORT);
  
  // Set Last Will and Testament (LWT) for offline detection
  String willTopic = String(TOPIC_STATUS);
  
  bool connected = mqtt.connect(
    DEVICE_ID,
${config.username ? `    MQTT_USERNAME,` : '    NULL,'}
${config.password ? `    MQTT_PASSWORD,` : '    NULL,'}
    willTopic.c_str(),  // Will topic
    1,                   // Will QoS
    true,                // Will retain
    "offline"            // Will message
  );
  
  if (connected) {
    Serial.println("MQTT connected!");
    
    // Publish online status (retained)
    mqtt.publish(TOPIC_STATUS, "online", true);
    
    // Subscribe to command topics
    mqtt.subscribe(TOPIC_CMD);
    Serial.printf("Subscribed to: %s\\n", TOPIC_CMD);
    
    // Publish initial state
    publishState();
  } else {
    Serial.printf("MQTT connect failed, rc=%d\\n", mqtt.state());
    // Exponential backoff
    reconnectDelay = min(reconnectDelay * 2, (unsigned long)MAX_RECONNECT_DELAY_MS);
    Serial.printf("Next attempt in %lu ms\\n", reconnectDelay);
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.printf("MQTT received: %s = %s\\n", topic, message.c_str());
  
  // Parse command from topic: saphari/DEVICE_ID/cmd/TYPE/ADDRESS
  if (topicStr.startsWith(String(TOPIC_PREFIX) + "/cmd/")) {
    handleCommand(topicStr, message);
  }
}

void handleCommand(String topic, String payload) {
  // Extract command type and address from topic
  int cmdStart = topic.indexOf("/cmd/") + 5;
  String remaining = topic.substring(cmdStart);
  int slashPos = remaining.indexOf('/');
  
  String cmdType = slashPos > 0 ? remaining.substring(0, slashPos) : remaining;
  String address = slashPos > 0 ? remaining.substring(slashPos + 1) : "";
  
  Serial.printf("Command: type=%s, address=%s, payload=%s\\n", 
    cmdType.c_str(), address.c_str(), payload.c_str());
  
  // Handle GPIO commands
  if (cmdType == "gpio") {
    handleGpioCommand(address, payload);
  }
  // Handle servo commands
  else if (cmdType == "servo") {
    handleServoCommand(address, payload);
  }
  
  // Send acknowledgment
  sendAck(cmdType, address, "ok");
}

void handleGpioCommand(String address, String payload) {
  // Find widget by address and set pin
${widgets.filter(w => w.type === 'switch' && w.pin).map(w => 
  `  if (address == "${w.address}") {
    digitalWrite(${w.pin}, payload == "1" ? HIGH : LOW);
    Serial.printf("GPIO ${w.pin} set to %s\\n", payload.c_str());
  }`
).join(' else\n') || '  // No switch widgets configured'}
}

void handleServoCommand(String address, String payload) {
  int angle = payload.toInt();
  // TODO: Implement servo control based on your servo library
  Serial.printf("Servo %s set to %d degrees\\n", address.c_str(), angle);
}

void sendAck(String cmdType, String address, String status) {
  String ackTopic = String(TOPIC_ACK);
  String ackPayload = "{\\"cmd\\":\\"" + cmdType + "\\",\\"addr\\":\\"" + address + "\\",\\"status\\":\\"" + status + "\\"}";
  mqtt.publish(ackTopic.c_str(), ackPayload.c_str());
}

void sendHeartbeat() {
  // Publish online status
  mqtt.publish(TOPIC_STATUS, "online", true);
  
  // Publish current state
  publishState();
}

void publishState() {
  // Publish GPIO states
${widgets.filter(w => w.type === 'switch' && w.pin).map(w => 
  `  {
    String topic = String(TOPIC_PREFIX) + "/gpio/${w.pin}";
    mqtt.publish(topic.c_str(), digitalRead(${w.pin}) ? "1" : "0");
  }`
).join('\n') || '  // No GPIO widgets to publish'}
  
  // Publish sensor readings
${widgets.filter(w => w.type === 'gauge' && w.pin).map(w => 
  `  {
    String topic = String(TOPIC_PREFIX) + "/sensor/${w.address}";
    int value = analogRead(${w.pin});
    mqtt.publish(topic.c_str(), String(value).c_str());
  }`
).join('\n') || '  // No gauge widgets to publish'}
}`;
  };

  const generatePlatformIO = () => {
    return `; ============================================
; SapHari PlatformIO Configuration
; Device: ${device.name}
; ============================================

[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

lib_deps = 
    knolleary/PubSubClient@^2.8
    ${config?.use_tls ? 'ArduinoJson@^7.0.0' : ''}

build_flags = 
    -D DEVICE_ID="\\"${device.device_id}\\""
    -D MQTT_HOST="\\"${config?.tcp_host || 'broker.emqx.io'}\\""
    -D MQTT_PORT=${config?.use_tls ? config.tls_port : config?.tcp_port || 1883}
    -D MQTT_USE_TLS=${config?.use_tls ? '1' : '0'}
    ${config?.username ? `-D MQTT_USERNAME="\\"${config.username}\\""` : ''}

; Upload settings
upload_speed = 921600

; Partition scheme for OTA updates
board_build.partitions = min_spiffs.csv`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            ESP32 Snippet Generator
          </DialogTitle>
          <DialogDescription>
            Generate production-ready firmware code for {device.name}
          </DialogDescription>
        </DialogHeader>

        {validationIssues.length > 0 && (
          <div className="space-y-2">
            {validationIssues.map((issue, i) => (
              <Alert key={i} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{issue.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="arduino" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="config" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                Config Header
              </TabsTrigger>
              <TabsTrigger value="arduino" className="flex items-center gap-1">
                <FileCode className="h-4 w-4" />
                Arduino Sketch
              </TabsTrigger>
              <TabsTrigger value="platformio" className="flex items-center gap-1">
                <Code className="h-4 w-4" />
                PlatformIO
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-4">
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(generateConfigHeader(), 'config')}
                >
                  {copied === 'config' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Textarea 
                  value={generateConfigHeader()} 
                  readOnly 
                  rows={20} 
                  className="font-mono text-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Save this as <code>saphari_config.h</code> in your project
              </p>
            </TabsContent>

            <TabsContent value="arduino" className="mt-4">
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(generateArduinoSketch(), 'arduino')}
                >
                  {copied === 'arduino' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Textarea 
                  value={generateArduinoSketch()} 
                  readOnly 
                  rows={20} 
                  className="font-mono text-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Complete Arduino sketch with WiFi, MQTT, LWT, and reconnect logic
              </p>
            </TabsContent>

            <TabsContent value="platformio" className="mt-4">
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(generatePlatformIO(), 'platformio')}
                >
                  {copied === 'platformio' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Textarea 
                  value={generatePlatformIO()} 
                  readOnly 
                  rows={15} 
                  className="font-mono text-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Save this as <code>platformio.ini</code> in your project root
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant={config?.use_tls ? 'default' : 'secondary'}>
              {config?.use_tls ? 'TLS Enabled' : 'No TLS'}
            </Badge>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
