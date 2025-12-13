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

const getSwitchState = (widget: Widget) => {
  const raw = widget.state?.['value'];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw >= 0.5;
  if (typeof raw === 'string') {
    return raw === '1' || raw.toLowerCase() === 'true';
  }
  return false;
};

const getServoAngle = (widget: Widget) => {
  const raw = widget.state?.['angle'];
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 90;
};

const formatGaugeType = (type?: string | null) => `GT_${(type || 'analog').toUpperCase()}`;

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

  const generateCode = () => {
    const deviceKey = device.device_key || 'DEVICE_KEY_NOT_SET';

    // Build widget arrays only for configured widgets
    const switchesCode = switches.length > 0
      ? switches.map((w) =>
          `  { "${w.address}", ${w.pin ?? -1}, ${getSwitchState(w) ? 'true' : 'false'}, ${w.override_mode ? 'true' : 'false'} }`
        ).join(',\n')
      : '  // No switches configured';

    const gaugesCode = gauges.length > 0
      ? gauges.map((w) =>
          `  { "${w.address}", ${formatGaugeType(w.gauge_type)}, ${w.pin ?? -1}, ${w.echo_pin ?? -1} }`
        ).join(',\n')
      : '  // No gauges configured';

    const servosCode = servos.length > 0
      ? servos.map((w) => `  { "${w.address}", ${w.pin ?? -1}, ${getServoAngle(w)}, false }`)
        .join(',\n')
      : '  // No servos configured';

    // Build topic examples only for configured widget types
    let topicExamples = `
// Status Topic (REQUIRED - with LWT)
// Topic: saphari/${device.device_id}/status/online
// Payload: "online" (retained) | "offline" (LWT)`;

    if (switches.length > 0) {
      topicExamples += `

// GPIO Topics (publish when pin changes)
// Topic: saphari/${device.device_id}/gpio/{PIN}
// Payload: 1 or 0`;
      switches.filter(w => w.pin).forEach(w => {
        topicExamples += `
// Example: saphari/${device.device_id}/gpio/${w.pin}`;
      });
    }

    if (gauges.length > 0) {
      topicExamples += `

// Gauge Topics (publish sensor readings)
// Topic: saphari/${device.device_id}/gauge/{ADDRESS}
// Payload: numeric value`;
      gauges.forEach(w => {
        topicExamples += `
// Example: saphari/${device.device_id}/gauge/${w.address}`;
      });
    }

    if (servos.length > 0) {
      topicExamples += `

// Servo Topics (subscribe for commands)
// Topic: saphari/${device.device_id}/cmd/servo/{ADDRESS}
// Payload: angle (0-180)`;
    }

    topicExamples += `

// Command Subscription (subscribe to receive commands)
// Topic: saphari/${device.device_id}/cmd/#`;

    return `// ============================================
// SapHari ESP32 Configuration
// Device: ${device.name}
// Generated: ${new Date().toISOString()}
// ============================================
// 
// ⚠️ TLS REQUIRED: Port 1883 is NOT available
// This configuration uses TLS on port ${PRODUCTION_BROKER.tls_port}
//
// ============================================

#include <WiFi.h>
#include <WiFiClientSecure.h>  // TLS REQUIRED
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
// TLS Client Setup
// ========================================
WiFiClientSecure espClient;
PubSubClient mqtt(espClient);

unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 5000; // 5 seconds

// ========================================
// MQTT Message Handler
// ========================================
void onMessage(char* topic, byte* payload, unsigned int length) {
  String msg;
  msg.reserve(length);
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  Serial.print("MQTT IN [");
  Serial.print(topic);
  Serial.print("] ");
  Serial.println(msg);

  // Parse command topics: saphari/<deviceId>/cmd/<action>
  String topicStr = String(topic);
  String cmdPrefix = "saphari/" + String(DEVICE_ID) + "/cmd/";
  
  if (topicStr.startsWith(cmdPrefix)) {
    String action = topicStr.substring(cmdPrefix.length());
    handleCommand(action, msg);
  }
}

void handleCommand(String action, String payload) {
  // TODO: Implement your command handlers
  // Example: if (action == "gpio/4") digitalWrite(4, payload == "1" ? HIGH : LOW);
  Serial.print("Command: ");
  Serial.print(action);
  Serial.print(" = ");
  Serial.println(payload);
}

// ========================================
// WiFi Setup
// ========================================
void setupWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);
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
  
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessage);
}

// ========================================
// Connect with Last Will Testament (LWT)
// ========================================
bool connectMQTT() {
  String statusTopic = "saphari/" + String(DEVICE_ID) + "/status/online";
  
  Serial.print("Connecting to MQTT...");
  
  if (mqtt.connect(DEVICE_ID, MQTT_USER, MQTT_PASS, 
                   statusTopic.c_str(), 1, true, "offline")) {
    Serial.println("connected!");
    
    // Publish online status (retained)
    mqtt.publish(statusTopic.c_str(), "online", true);
    
    // Subscribe to commands
    String cmdTopic = "saphari/" + String(DEVICE_ID) + "/cmd/#";
    mqtt.subscribe(cmdTopic.c_str());
    
    return true;
  } else {
    Serial.print("failed, rc=");
    Serial.println(mqtt.state());
    return false;
  }
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
      if (connectMQTT()) {
        lastReconnectAttempt = 0;
      }
    }
  } else {
    mqtt.loop();
  }
  
  // TODO: Add your sensor reading and publishing logic here
  // Example: publishGauge("temperature", readTemp());
}

// ========================================
// Helper: Publish GPIO State
// ========================================
void publishGPIO(int pin, bool state) {
  String topic = "saphari/" + String(DEVICE_ID) + "/gpio/" + String(pin);
  mqtt.publish(topic.c_str(), state ? "1" : "0");
}

// ========================================
// Helper: Publish Gauge Value
// ========================================
void publishGauge(const char* name, float value) {
  String topic = "saphari/" + String(DEVICE_ID) + "/gauge/" + String(name);
  mqtt.publish(topic.c_str(), String(value).c_str());
}

// ========================================
// Widget Configurations
// ========================================
${switches.length > 0 ? `#define SWITCH_COUNT ${switches.length}` : '// No switches configured'}
${gauges.length > 0 ? `#define GAUGE_COUNT  ${gauges.length}` : '// No gauges configured'}
${servos.length > 0 ? `#define SERVO_COUNT  ${servos.length}` : '// No servos configured'}

/*
SwitchMap SWITCHES[] = {
${switchesCode}
};

GaugeMap GAUGES[] = {
${gaugesCode}
};

ServoMap SERVOS[] = {
${servosCode}
};
*/

// ========================================
// MQTT Topics Reference
// ========================================
${topicExamples}`;
  };

  const code = generateCode();

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
            Production-ready configuration for {device.name}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-primary/50 bg-primary/5">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Uses <strong>WiFiClientSecure</strong> with TLS on port {PRODUCTION_BROKER.tls_port}. 
            Credentials: Username = DEVICE_ID, Password = DEVICE_KEY
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
