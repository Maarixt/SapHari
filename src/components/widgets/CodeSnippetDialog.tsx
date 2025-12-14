import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, CheckCircle, Lock, Shield } from 'lucide-react';
import { Device, Widget } from '@/lib/types';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

// Production broker configuration - SINGLE SOURCE OF TRUTH
// TLS is REQUIRED - port 1883 is NOT available on EMQX Cloud Serverless
const PRODUCTION_BROKER = {
  tcp_host: 'z110b082.ala.us-east-1.emqxsl.com',
  tls_port: 8883,  // TLS REQUIRED - never use 1883
  wss_port: 8084,
  wss_path: '/mqtt'
} as const;

interface CodeSnippetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  widgets: Widget[];
}

// ============================================
// Toggle-Ready ESP32 Snippet Generator v2
// ============================================

function buildSnippetHeader(device: Device): string {
  return `// ============================================
// Generator Version: SaphariSnippet v2-toggle-ready
// ============================================
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
// ============================================`;
}

function buildSnippetIncludes(): string {
  return `
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>`;
}

function buildSnippetCredentials(device: Device): string {
  // Device key is intentionally NOT included in generated code for security
  // User must copy device key from Device Credentials dialog within 5 minutes of creation
  return `
// ========================================
// WiFi Credentials (CHANGE THESE)
// ========================================
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ========================================
// Device Credentials (UNIQUE PER DEVICE)
// ========================================
#define DEVICE_ID   "${device.device_id}"
// ⚠️ SECURITY: Device key must be copied from Device Credentials dialog
// The key is only viewable for 5 minutes after device creation
#define DEVICE_KEY  "PASTE_YOUR_DEVICE_KEY_HERE"

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
#define ACTIVE_LOW 0`;
}

function buildSnippetSwitchConfig(switches: Widget[]): string {
  const switchCount = switches.length;
  const allowedPins = switches.map(w => w.pin).join(', ');
  
  const switchMappingComments = switches.length > 0 
    ? switches.map(w => `// ${w.address} -> GPIO ${w.pin}`).join('\n')
    : '// No switches configured';

  return `
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
}`;
}

function buildSnippetJsonHelpers(): string {
  return `
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
}`;
}

function buildSnippetTopicHelpers(): string {
  return `
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
}`;
}

function buildSnippetToggleHandler(): string {
  return `
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
}`;
}

function buildSnippetSetup(switches: Widget[], gauges: Widget[]): string {
  const switchPinSetup = switches.length > 0
    ? switches.map(w => `  pinMode(${w.pin}, OUTPUT);`).join('\n')
    : '  // No switch pins to configure';
  
  const gaugePinSetup = gauges.length > 0
    ? gauges.map(w => `  pinMode(${w.pin}, INPUT);`).join('\n')
    : '';

  const initialGpioPublish = switches.length > 0
    ? switches.map(w => `    publishGPIO(${w.pin}, digitalRead(${w.pin}));`).join('\n')
    : '    // No GPIO to publish';

  return `
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
${initialGpioPublish}

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
${switchPinSetup}
${gaugePinSetup}
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
}`;
}

function buildSnippetTopicReference(): string {
  return `
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
}

// Main generator function - assembles all parts once
function generateArduinoSketch(device: Device, widgets: Widget[]): string {
  const switches = widgets.filter(w => w.type === 'switch' && w.pin != null);
  const gauges = widgets.filter(w => w.type === 'gauge' && w.pin != null);

  return [
    buildSnippetHeader(device),
    buildSnippetIncludes(),
    buildSnippetCredentials(device),
    buildSnippetSwitchConfig(switches),
    buildSnippetJsonHelpers(),
    buildSnippetTopicHelpers(),
    buildSnippetToggleHandler(),
    buildSnippetSetup(switches, gauges),
    buildSnippetTopicReference()
  ].join('\n');
}

export const CodeSnippetDialog = ({ open, onOpenChange, device, widgets }: CodeSnippetDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const switches = widgets.filter((w) => w.type === 'switch');
  const gauges = widgets.filter((w) => w.type === 'gauge');
  const servos = widgets.filter((w) => w.type === 'servo');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate the toggle-ready snippet
  const code = generateArduinoSketch(device, widgets);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ESP32 Code Snippet
            <Badge variant="outline" className="ml-2">
              <Lock className="h-3 w-3 mr-1" />
              TLS Port {PRODUCTION_BROKER.tls_port}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Toggle-ready firmware for {device.name}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-primary/50 bg-primary/5">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Uses <strong>WiFiClientSecure</strong> with TLS on port {PRODUCTION_BROKER.tls_port}. 
            Supports <code>cmd/toggle</code> JSON commands from dashboard.
          </AlertDescription>
        </Alert>

        <div className="flex-1 overflow-auto relative">
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2 z-10"
            onClick={() => copyToClipboard(code)}
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Textarea 
            value={code} 
            readOnly 
            rows={20} 
            className="font-mono text-xs"
          />
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {switches.length} switches, {gauges.length} gauges, {servos.length} servos
          </p>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
