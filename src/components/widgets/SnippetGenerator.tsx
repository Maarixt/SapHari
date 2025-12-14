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
    const switches = widgets.filter(w => w.type === 'switch' && w.pin != null);
    const gauges = widgets.filter(w => w.type === 'gauge' && w.pin != null);
    const switchCount = switches.length;
    const allowedPins = switches.map(w => w.pin).join(', ');
    const deviceKey = device.device_key || 'DEVICE_KEY_NOT_FOUND';
    
    // Generate switch mapping comments
    const switchMappingComments = switches.length > 0 
      ? switches.map((w, i) => `// ${w.address} -> GPIO ${w.pin}`).join('\n')
      : '// No switches configured';

    return `// ============================================
// SapHari ESP32 Configuration
// Device: ${device.name}
// Generated: ${new Date().toISOString()}
// ============================================
//
// ⚠️ TLS REQUIRED: Port 1883 is NOT available
// This configuration uses TLS on port 8883
//
// Dashboard command format supported:
// Topic: saphari/<deviceId>/cmd/toggle
// Payload: {"addr":"S1","pin":2,"state":1,"override":false}
//
// ============================================

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// ========================================
// WiFi Credentials (CHANGE THESE)
// ========================================
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ========================================
// Device Credentials (UNIQUE PER DEVICE)
// ========================================
#define DEVICE_ID   "${device.device_id}"
#define DEVICE_KEY  "${deviceKey}"

// ========================================
// MQTT Broker (PRODUCTION - TLS ONLY)
// ========================================
#define MQTT_BROKER "${PRODUCTION_BROKER.tcp_host}"
#define MQTT_PORT   ${PRODUCTION_BROKER.tls_port}  // TLS port - NOT 1883

// MQTT Authentication
#define MQTT_USER   DEVICE_ID   // Username = Device ID
#define MQTT_PASS   DEVICE_KEY  // Password = Device Key

// ========================================
// Output Logic (Relay Boards)
// ========================================
// If your relay turns ON when GPIO is LOW, set ACTIVE_LOW to 1
#define ACTIVE_LOW 0

// ========================================
// TLS Client Setup
// ========================================
WiFiClientSecure espClient;
PubSubClient mqtt(espClient);

unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000; // 5 seconds

// ========================================
// Widget Configurations (Generated)
// ========================================
// Switches:
${switchMappingComments}
#define SWITCH_COUNT ${switchCount}

// Allowed switch pins (generated from switches)
${switchCount > 0 
  ? `const int ALLOWED_PINS[] = { ${allowedPins} };
const int ALLOWED_COUNT = ${switchCount};`
  : `// Empty because no switches exist in this device
const int ALLOWED_PINS[] = { };
const int ALLOWED_COUNT = 0;`}

bool isAllowedPin(int pin) {
  for (int i = 0; i < ALLOWED_COUNT; i++) {
    if (ALLOWED_PINS[i] == pin) return true;
  }
  return false;
}

// ========================================
// Tiny JSON Parsing Helpers (no ArduinoJson)
// ========================================
int jsonGetInt(const String& json, const char* key, int defVal) {
  String k = String("\\"") + key + "\\":";
  int i = json.indexOf(k);
  if (i < 0) return defVal;
  i += k.length();
  while (i < (int)json.length() && (json[i] == ' ' || json[i] == '"')) i++;
  int j = i;
  while (j < (int)json.length() && (isDigit(json[j]) || json[j] == '-')) j++;
  return json.substring(i, j).toInt();
}

// ========================================
// Helper: Topics
// ========================================
String tStatus()   { return "saphari/" + String(DEVICE_ID) + "/status/online"; }
String tCmdAll()   { return "saphari/" + String(DEVICE_ID) + "/cmd/#"; }
String tCmdToggle(){ return "saphari/" + String(DEVICE_ID) + "/cmd/toggle"; }
String tGPIO(int pin) { return "saphari/" + String(DEVICE_ID) + "/gpio/" + String(pin); }

// ========================================
// Helper: Publish GPIO State (retained)
// ========================================
void publishGPIO(int pin, int logicalState) {
  mqtt.publish(tGPIO(pin).c_str(), logicalState ? "1" : "0", true);
}

// ========================================
// Apply GPIO (supports ACTIVE_LOW)
// ========================================
void applyGPIO(int pin, int logicalState) {
  pinMode(pin, OUTPUT);

  int level;
#if ACTIVE_LOW
  level = logicalState ? LOW : HIGH;
#else
  level = logicalState ? HIGH : LOW;
#endif

  digitalWrite(pin, level);

  Serial.print("GPIO APPLIED pin=");
  Serial.print(pin);
  Serial.print(" logical=");
  Serial.print(logicalState);
  Serial.print(" level=");
  Serial.println(level == HIGH ? "HIGH" : "LOW");

  publishGPIO(pin, logicalState);
}

// ========================================
// Handle cmd/toggle JSON payload
// Payload: {"addr":"S1","pin":2,"state":1,"override":false}
// ========================================
void handleTogglePayload(const String& payload) {
  if (SWITCH_COUNT == 0) {
    Serial.println("No switches configured — ignoring toggle.");
    return;
  }

  int pin = jsonGetInt(payload, "pin", -1);
  int state = jsonGetInt(payload, "state", -1);

  if (pin < 0 || (state != 0 && state != 1)) {
    Serial.println("Bad toggle payload: missing pin/state");
    return;
  }

  if (!isAllowedPin(pin)) {
    Serial.println("Blocked toggle: pin not allowed for this device");
    return;
  }

  applyGPIO(pin, state);
}

// ========================================
// MQTT Message Handler
// ========================================
void onMessage(char* topic, byte* payload, unsigned int length) {
  String msg;
  msg.reserve(length);
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  Serial.print("MQTT IN [");
  Serial.print(topic);
  Serial.print("] ");
  Serial.println(msg);

  String t(topic);
  if (t == tCmdToggle()) {
    handleTogglePayload(msg);
  }
}

// ========================================
// WiFi Setup
// ========================================
void setupWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Connected! IP: ");
  Serial.println(WiFi.localIP());
}

// ========================================
// MQTT Setup
// ========================================
void setupMQTT() {
  // TLS: Skip certificate verification (for development)
  // For production, use: espClient.setCACert(emqx_ca_cert);
  espClient.setInsecure();
  espClient.setHandshakeTimeout(30);
  espClient.setTimeout(30);

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setSocketTimeout(30);
}

// ========================================
// Connect with Last Will Testament (LWT)
// ========================================
bool connectMQTT() {
  String statusTopic = tStatus();

  Serial.print("Connecting to MQTT...");

  if (mqtt.connect(DEVICE_ID, MQTT_USER, MQTT_PASS,
                   statusTopic.c_str(), 1, true, "offline")) {
    Serial.println("connected!");

    // Publish online status (retained)
    mqtt.publish(statusTopic.c_str(), "online", true);

    // Subscribe to commands
    mqtt.subscribe(tCmdAll().c_str());

    // Publish initial GPIO states
${switches.map(w => `    publishGPIO(${w.pin}, digitalRead(${w.pin}));`).join('\n') || '    // No GPIO to publish'}

    return true;
  } else {
    Serial.print("failed, rc=");
    Serial.println(mqtt.state());
    return false;
  }
}

// ========================================
// Setup Pins
// ========================================
void setupPins() {
${switches.map(w => `  pinMode(${w.pin}, OUTPUT);`).join('\n') || '  // No switch pins to configure'}
${gauges.map(w => `  pinMode(${w.pin}, INPUT);`).join('\n') || ''}
}

// ========================================
// Main Setup
// ========================================
void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println();
  Serial.println("=== SapHari ESP32 Starting ===");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);

  setupPins();
  setupWiFi();
  setupMQTT();
  connectMQTT();
}

// ========================================
// Main Loop (with reconnect)
// ========================================
void loop() {
  if (!mqtt.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > reconnectInterval) {
      lastReconnectAttempt = now;
      if (connectMQTT()) lastReconnectAttempt = 0;
    }
  } else {
    mqtt.loop();
  }
}

// ========================================
// MQTT Topics Reference
// ========================================
//
// Status Topic (REQUIRED - with LWT)
// Topic: saphari/<deviceId>/status/online
// Payload: "online" (retained) | "offline" (LWT)
//
// GPIO Confirmation (device -> dashboard)
// Topic: saphari/<deviceId>/gpio/<pin>
// Payload: "1" or "0" (retained)
//
// Commands (dashboard -> device)
// Topic: saphari/<deviceId>/cmd/toggle
// Payload JSON: {"addr":"Sx","pin":<PIN>,"state":0|1,"override":false}
//
// Notes:
// - If SWITCH_COUNT == 0, toggle commands will be ignored.
// - For relays that are active-low, set ACTIVE_LOW to 1.
//
`;
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