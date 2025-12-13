import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, CheckCircle, AlertTriangle, Code, FileCode, Settings, Shield, Lock } from 'lucide-react';
import { Device, Widget } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Production broker configuration - AUTHORITATIVE SOURCE (TLS ONLY)
// DO NOT use port 1883 - TLS on port 8883 is REQUIRED for production
const PRODUCTION_BROKER = {
  tcp_host: 'z110b082.ala.us-east-1.emqxsl.com',
  tls_port: 8883,  // TLS REQUIRED - never use 1883
  wss_port: 8084,
  wss_path: '/mqtt',
  use_tls: true
} as const;

interface SnippetGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  widgets: Widget[];
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
}

export function SnippetGenerator({ open, onOpenChange, device, widgets }: SnippetGeneratorProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  // Validate configuration on open
  useEffect(() => {
    if (open) {
      const issues: ValidationIssue[] = [];
      
      // Check for missing device info
      if (!device.device_id) {
        issues.push({ type: 'error', message: 'Device ID is missing' });
      }

      // Info about TLS requirement
      issues.push({
        type: 'info',
        message: 'This firmware uses TLS encryption on port 8883 for secure communication.'
      });

      // Check for widgets
      if (widgets.length === 0) {
        issues.push({
          type: 'warning',
          message: 'No widgets configured for this device. Add widgets to generate complete code.'
        });
      }

      setValidationIssues(issues);
    }
  }, [open, device, widgets]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(null), 2000);
  };

  const generateConfigHeader = () => {
    // Use the actual device key from the device record
    const deviceKey = device.device_key || 'DEVICE_KEY_NOT_FOUND';

    return `// ============================================
// SapHari Device Configuration
// Generated: ${new Date().toISOString()}
// Device: ${device.name} (${device.device_id})
// ============================================
// 
// ⚠️ SECURITY NOTES:
// 1. This configuration contains your device credentials
// 2. Never commit this file to public repositories
// 3. Each device has unique credentials (DEVICE_ID + DEVICE_KEY)
// 4. DEVICE_KEY is your MQTT password - keep it secret!
//
// ============================================

#ifndef SAPHARI_CONFIG_H
#define SAPHARI_CONFIG_H

// ========================================
// Device Identity (UNIQUE PER DEVICE)
// ========================================
#define DEVICE_ID       "${device.device_id}"
#define DEVICE_NAME     "${device.name}"
#define DEVICE_KEY      "${deviceKey}"

// ========================================
// MQTT Broker Configuration (PRODUCTION - TLS REQUIRED)
// DO NOT MODIFY - These are platform-wide settings
// ========================================
#define MQTT_HOST       "${PRODUCTION_BROKER.tcp_host}"
#define MQTT_PORT       ${PRODUCTION_BROKER.tls_port}  // TLS REQUIRED - port 8883 only
#define MQTT_USE_TLS    true

// ⚠️ CRITICAL: Port 1883 is NOT available on EMQX Cloud Serverless
// You MUST use WiFiClientSecure with TLS on port 8883

// MQTT Authentication (per-device credentials)
#define MQTT_USERNAME   DEVICE_ID   // Username = Device ID
#define MQTT_PASSWORD   DEVICE_KEY  // Password = Device Key (unique secret)

// ========================================
// MQTT Topics (ACL enforced: saphari/\${username}/#)
// ========================================
#define TOPIC_PREFIX    "saphari/" DEVICE_ID
#define TOPIC_STATUS    TOPIC_PREFIX "/status/online"     // Retained: "online" / "offline" (LWT)
#define TOPIC_GPIO      TOPIC_PREFIX "/gpio/"             // + pin number
#define TOPIC_SENSOR    TOPIC_PREFIX "/sensor/"           // + sensor address
#define TOPIC_GAUGE     TOPIC_PREFIX "/gauge/"            // + gauge address
#define TOPIC_CMD       TOPIC_PREFIX "/cmd/#"             // Subscribe to commands
#define TOPIC_ACK       TOPIC_PREFIX "/ack"               // Command acknowledgments

// ========================================
// Widget Configurations
// ========================================
${generateWidgetDefines()}

// ========================================
// Reliability Settings
// ========================================
#define HEARTBEAT_INTERVAL_MS   30000    // Send heartbeat every 30 seconds
#define RECONNECT_DELAY_MS      5000     // Initial reconnect delay
#define MAX_RECONNECT_DELAY_MS  60000    // Max reconnect delay (exponential backoff)
#define MQTT_KEEPALIVE          60       // MQTT keepalive in seconds

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

    return lines.length > 0 ? lines.join('\n') : '// No widgets configured';
  };

  const generateArduinoSketch = () => {
    return `// ============================================
// SapHari ESP32 Production Firmware
// Device: ${device.name}
// Broker: ${PRODUCTION_BROKER.tcp_host}:${PRODUCTION_BROKER.tls_port} (TLS)
// ============================================
//
// REQUIREMENTS:
// - ESP32 board
// - PubSubClient library
// - WiFiClientSecure (built-in)
//
// SETUP:
// 1. Copy saphari_config.h to your project
// 2. Update DEVICE_TOKEN with your actual token from EMQX Cloud
// 3. Update WiFi credentials below
// 4. Upload to your ESP32
//
// ============================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include "saphari_config.h"

// ========================================
// WiFi Credentials (UPDATE THESE)
// ========================================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ========================================
// MQTT Client (TLS)
// ========================================
WiFiClientSecure espClient;
PubSubClient mqtt(espClient);

// ========================================
// State Variables
// ========================================
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
  
  Serial.println("\\n\\n========================================");
  Serial.println("  SapHari ESP32 Device Starting");
  Serial.println("========================================");
  Serial.printf("Device ID: %s\\n", DEVICE_ID);
  Serial.printf("Device Name: %s\\n", DEVICE_NAME);
  Serial.printf("MQTT Broker: %s:%d (TLS)\\n", MQTT_HOST, MQTT_PORT);
  Serial.println("========================================\\n");
  
  setupPins();
  setupWiFi();
  setupMQTT();
}

void setupPins() {
  // Configure GPIO pins based on widgets
${widgets.filter(w => w.type === 'switch' && w.pin).map(w => 
  `  pinMode(${w.pin}, OUTPUT);`
).join('\n') || '  // No switch pins configured'}
}

void setupWiFi() {
  Serial.printf("📶 Connecting to WiFi: %s\\n", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\\n✅ WiFi connected!\\n");
    Serial.printf("   IP Address: %s\\n", WiFi.localIP().toString().c_str());
    Serial.printf("   RSSI: %d dBm\\n", WiFi.RSSI());
  } else {
    Serial.println("\\n❌ WiFi connection failed!");
    Serial.println("   Check credentials and try again.");
  }
}

void setupMQTT() {
  // ========================================
  // TLS Configuration (REQUIRED for EMQX Cloud)
  // ========================================
  // setInsecure() skips certificate verification
  // For production security, embed the EMQX Cloud CA certificate:
  //   espClient.setCACert(emqx_ca_cert);
  // CA certificate available at: https://assets.emqx.com/data/emqxsl-ca.crt
  espClient.setInsecure();
  
  mqtt.setServer(MQTT_HOST, MQTT_PORT);  // Port 8883 (TLS) - NOT 1883
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(MQTT_KEEPALIVE);
}

// ========================================
// Main Loop
// ========================================
void loop() {
  // Ensure WiFi is connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected, reconnecting...");
    setupWiFi();
    return;
  }
  
  // Maintain MQTT connection
  if (!mqtt.connected()) {
    if (wasConnected) {
      Serial.println("⚠️ MQTT disconnected!");
      wasConnected = false;
    }
    reconnectMQTT();
  } else {
    if (!wasConnected) {
      Serial.println("✅ MQTT connected!");
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
// MQTT Connection with LWT
// ========================================
void reconnectMQTT() {
  if (millis() - lastReconnectAttempt < reconnectDelay) return;
  lastReconnectAttempt = millis();
  
  Serial.printf("🔌 Connecting to MQTT broker...\\n");
  Serial.printf("   Host: %s:%d\\n", MQTT_HOST, MQTT_PORT);
  Serial.printf("   Username: %s\\n", MQTT_USERNAME);
  
  // Connect with Last Will and Testament (LWT)
  // When connection drops, broker publishes "offline" to status topic
  bool connected = mqtt.connect(
    DEVICE_ID,          // Client ID
    MQTT_USERNAME,      // Username = Device ID
    MQTT_PASSWORD,      // Password = Device Token
    TOPIC_STATUS,       // Will topic
    1,                  // Will QoS
    true,               // Will retain
    "offline"           // Will message
  );
  
  if (connected) {
    Serial.println("✅ MQTT connected!");
    
    // Publish online status (retained)
    mqtt.publish(TOPIC_STATUS, "online", true);
    Serial.printf("   Published: %s = online\\n", TOPIC_STATUS);
    
    // Subscribe to command topics
    mqtt.subscribe(TOPIC_CMD);
    Serial.printf("   Subscribed: %s\\n", TOPIC_CMD);
    
    // Publish initial state
    publishState();
  } else {
    int state = mqtt.state();
    Serial.printf("❌ MQTT connect failed, rc=%d\\n", state);
    printMQTTError(state);
    
    // Exponential backoff
    reconnectDelay = min(reconnectDelay * 2, (unsigned long)MAX_RECONNECT_DELAY_MS);
    Serial.printf("   Next attempt in %lu ms\\n", reconnectDelay);
  }
}

void printMQTTError(int state) {
  switch (state) {
    case -4: Serial.println("   Error: Connection timeout"); break;
    case -3: Serial.println("   Error: Connection lost"); break;
    case -2: Serial.println("   Error: Connect failed"); break;
    case -1: Serial.println("   Error: Disconnected"); break;
    case 1: Serial.println("   Error: Bad protocol"); break;
    case 2: Serial.println("   Error: Bad client ID"); break;
    case 3: Serial.println("   Error: Unavailable"); break;
    case 4: Serial.println("   Error: Bad credentials"); break;
    case 5: Serial.println("   Error: Unauthorized"); break;
    default: Serial.printf("   Error: Unknown (%d)\\n", state); break;
  }
}

// ========================================
// Message Handler
// ========================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.printf("📨 Received: %s = %s\\n", topic, message.c_str());
  
  // Parse command from topic: saphari/DEVICE_ID/cmd/TYPE/ADDRESS
  if (topicStr.startsWith(String(TOPIC_PREFIX) + "/cmd/")) {
    handleCommand(topicStr, message);
  }
}

void handleCommand(String topic, String payload) {
  int cmdStart = topic.indexOf("/cmd/") + 5;
  String remaining = topic.substring(cmdStart);
  int slashPos = remaining.indexOf('/');
  
  String cmdType = slashPos > 0 ? remaining.substring(0, slashPos) : remaining;
  String address = slashPos > 0 ? remaining.substring(slashPos + 1) : "";
  
  Serial.printf("⚡ Command: type=%s, address=%s, payload=%s\\n", 
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
  
  // Publish updated state
  publishState();
}

void handleGpioCommand(String address, String payload) {
${widgets.filter(w => w.type === 'switch' && w.pin).map(w => 
  `  if (address == "${w.address}") {
    digitalWrite(${w.pin}, payload == "1" ? HIGH : LOW);
    Serial.printf("   GPIO ${w.pin} -> %s\\n", payload.c_str());
  }`
).join(' else\n') || '  // No switch widgets configured'}
}

void handleServoCommand(String address, String payload) {
  int angle = payload.toInt();
  Serial.printf("   Servo %s -> %d°\\n", address.c_str(), angle);
  // TODO: Implement servo control
}

void sendAck(String cmdType, String address, String status) {
  String ackPayload = "{\\"cmd\\":\\"" + cmdType + "\\",\\"addr\\":\\"" + address + "\\",\\"status\\":\\"" + status + "\\"}";
  mqtt.publish(TOPIC_ACK, ackPayload.c_str());
  Serial.printf("   ACK sent: %s\\n", ackPayload.c_str());
}

// ========================================
// Heartbeat & State Publishing
// ========================================
void sendHeartbeat() {
  // Refresh online status
  mqtt.publish(TOPIC_STATUS, "online", true);
  
  // Publish current state
  publishState();
  
  Serial.printf("💓 Heartbeat (RSSI: %d dBm)\\n", WiFi.RSSI());
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
; Broker: ${PRODUCTION_BROKER.tcp_host}:${PRODUCTION_BROKER.tls_port}
; ============================================

[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

; Required libraries
lib_deps = 
    knolleary/PubSubClient@^2.8
    bblanchon/ArduinoJson@^7.0.0

; Build flags
build_flags = 
    -D DEVICE_ID="\\"${device.device_id}\\""
    -D MQTT_HOST="\\"${PRODUCTION_BROKER.tcp_host}\\""
    -D MQTT_PORT=${PRODUCTION_BROKER.tls_port}
    -D MQTT_USE_TLS=1
    -DCORE_DEBUG_LEVEL=3

; Upload settings
upload_speed = 921600

; Partition scheme for OTA updates
board_build.partitions = min_spiffs.csv

; Monitor filters for better debugging
monitor_filters = 
    esp32_exception_decoder
    time`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            ESP32 Firmware Generator
            <Badge variant="outline" className="ml-2">
              <Lock className="h-3 w-3 mr-1" />
              TLS
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Generate production-ready firmware for {device.name} with secure MQTT connection
          </DialogDescription>
        </DialogHeader>

        {/* Security Notice */}
        <Alert className="border-primary/50 bg-primary/5">
          <Shield className="h-4 w-4" />
          <AlertTitle>Production Configuration</AlertTitle>
          <AlertDescription>
            This firmware connects to <code className="text-xs">{PRODUCTION_BROKER.tcp_host}:{PRODUCTION_BROKER.tls_port}</code> using TLS encryption.
            Each device requires unique credentials from EMQX Cloud.
          </AlertDescription>
        </Alert>

        {validationIssues.filter(i => i.type !== 'info').length > 0 && (
          <div className="space-y-2">
            {validationIssues.filter(i => i.type !== 'info').map((issue, i) => (
              <Alert key={i} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{issue.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="config" className="w-full">
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
                Save as <code className="bg-muted px-1 rounded">saphari_config.h</code> — Your device credentials are pre-filled. Keep this file secure!
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
                Save as <code className="bg-muted px-1 rounded">main.cpp</code> or <code className="bg-muted px-1 rounded">main.ino</code>
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
                Save as <code className="bg-muted px-1 rounded">platformio.ini</code>
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-2">Quick Setup Guide</h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Copy the config header (credentials are pre-filled from SapHari)</li>
            <li>Save as <code className="bg-muted px-1 rounded">saphari_config.h</code> in your project</li>
            <li>Update WiFi credentials (SSID/password) in the Arduino sketch</li>
            <li>Upload to your ESP32</li>
            <li>Monitor serial output — device should connect via TLS on port 8883</li>
          </ol>
          <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
            <strong>MQTT Auth:</strong> Username = <code>{device.device_id}</code>, Password = Device Key (in config header)
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}