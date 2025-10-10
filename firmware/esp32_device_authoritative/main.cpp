/*
 * ESP32 Device-Authoritative Firmware
 * 
 * This firmware implements the device-authoritative state management system
 * where the ESP32 is the source of truth for all device state.
 * 
 * MQTT Topics:
 * - devices/{deviceId}/status: "online"/"offline" (LWT)
 * - devices/{deviceId}/state: JSON state snapshot
 * - devices/{deviceId}/cmd: JSON commands from UI
 * - devices/{deviceId}/ack: JSON ACK responses
 * - devices/{deviceId}/event: JSON incremental updates
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASS";

// MQTT Configuration
const char* MQTT_HOST = "broker.emqx.io";
const uint16_t MQTT_PORT = 1883;
const char* DEVICE_ID = "pump-1";

// Hardware Configuration
const int PIN4 = 4;  // Example controlled pin
const int LED_PIN = 2; // Built-in LED

WiFiClient espClient;
PubSubClient client(espClient);

// State management
unsigned long lastStateMs = 0;
const unsigned long STATE_PERIOD = 3000; // Publish state every 3 seconds
bool deviceOnline = false;

// Helper function to build MQTT topics
String shadowTopic(const char* path) {
  String t = "devices/";
  t += DEVICE_ID;
  t += "/";
  t += path;
  return t;
}

// Publish device status (online/offline)
void publishStatus(const char* status) {
  client.publish(shadowTopic("status").c_str(), status, true);
  Serial.println("Published status: " + String(status));
}

// Publish complete device state
void publishState() {
  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();
  
  // GPIO state
  JsonObject gpio = doc.createNestedObject("gpio");
  gpio["4"] = (digitalRead(PIN4) == HIGH) ? 1 : 0;
  gpio["2"] = (digitalRead(LED_PIN) == HIGH) ? 1 : 0; // Built-in LED
  
  // Sensor readings (example)
  JsonObject sensors = doc.createNestedObject("sensors");
  sensors["tempC"] = 25.3 + (random(0, 100) / 10.0); // Simulated temperature
  sensors["humidity"] = 60 + random(0, 20); // Simulated humidity
  sensors["pressure"] = 1013.25 + random(-10, 10); // Simulated pressure
  
  // Gauge readings (example)
  JsonObject gauges = doc.createNestedObject("gauges");
  gauges["waterLevel"] = random(0, 100); // Simulated water level
  gauges["battery"] = random(80, 100); // Simulated battery level
  
  // Servo positions (example)
  JsonObject servos = doc.createNestedObject("servos");
  servos["valve"] = random(0, 180); // Simulated valve position

  char buffer[512];
  size_t n = serializeJson(doc, buffer);
  client.publish(shadowTopic("state").c_str(), buffer, true);
  
  Serial.println("Published state: " + String(buffer));
}

// Send ACK response for commands
void sendAck(const String& reqId, bool ok, const char* detail) {
  StaticJsonDocument<128> doc;
  doc["reqId"] = reqId;
  doc["ok"] = ok;
  doc["detail"] = detail;
  doc["timestamp"] = millis();
  
  char buffer[128];
  size_t n = serializeJson(doc, buffer);
  client.publish(shadowTopic("ack").c_str(), buffer, false);
  
  Serial.println("Sent ACK: " + String(buffer));
}

// Handle incoming commands
void onCommand(char* topic, byte* payload, unsigned int len) {
  // Parse JSON command
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, len);
  
  if (error) {
    Serial.println("Failed to parse command JSON");
    return;
  }
  
  const char* type = doc["type"] | "";
  const char* reqId = doc["reqId"] | "";
  const int pin = doc["pin"] | -1;
  const int value = doc["value"] | 0;
  
  Serial.println("Received command: " + String(type) + " pin=" + String(pin) + " value=" + String(value));
  
  bool success = false;
  String detail = "";
  
  if (strcmp(type, "gpio") == 0) {
    if (pin == PIN4) {
      pinMode(pin, OUTPUT);
      digitalWrite(pin, value ? HIGH : LOW);
      delay(2); // Small delay to ensure pin state is set
      success = true;
      detail = "GPIO " + String(pin) + " set to " + String(value);
      
      // Publish state immediately after GPIO change
      publishState();
    } else if (pin == LED_PIN) {
      pinMode(pin, OUTPUT);
      digitalWrite(pin, value ? HIGH : LOW);
      delay(2);
      success = true;
      detail = "LED set to " + String(value);
      publishState();
    } else {
      detail = "Unsupported pin: " + String(pin);
    }
  } else if (strcmp(type, "servo") == 0) {
    // Simulate servo control (replace with actual servo code)
    if (pin >= 0 && pin <= 180) {
      success = true;
      detail = "Servo " + String(pin) + " set to " + String(value) + " degrees";
      publishState();
    } else {
      detail = "Invalid servo angle: " + String(value);
    }
  } else if (strcmp(type, "gauge") == 0) {
    // Simulate gauge control
    success = true;
    detail = "Gauge set to " + String(value);
    publishState();
  } else {
    detail = "Unsupported command type: " + String(type);
  }
  
  // Send ACK response
  sendAck(reqId, success, detail.c_str());
}

// MQTT message callback
void mqttCallback(char* topic, byte* payload, unsigned int len) {
  String topicStr(topic);
  
  if (topicStr.endsWith("/cmd")) {
    onCommand(topic, payload, len);
  }
}

// Ensure MQTT connection
void ensureMqttConnection() {
  while (!client.connected()) {
    String clientId = String("esp32-") + DEVICE_ID + "-" + String(random(0xffff), HEX);
    
    Serial.println("Attempting MQTT connection...");
    
    // LWT: will publish "offline" if this client disconnects unexpectedly
    if (client.connect(clientId.c_str(), NULL, NULL,
                       shadowTopic("status").c_str(), 1, true, "offline")) {
      Serial.println("MQTT connected");
      
      // Subscribe to command topic
      client.subscribe(shadowTopic("cmd").c_str());
      
      // Publish online status
      publishStatus("online");
      deviceOnline = true;
      
      // Send initial state
      publishState();
    } else {
      Serial.print("MQTT connection failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Device-Authoritative Firmware Starting...");
  
  // Initialize pins
  pinMode(PIN4, OUTPUT);
  digitalWrite(PIN4, LOW);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected");
  Serial.println("IP address: " + WiFi.localIP().toString());
  
  // Setup MQTT
  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(mqttCallback);
  
  // Connect to MQTT
  ensureMqttConnection();
  
  Serial.println("Device initialized successfully");
}

void loop() {
  // Maintain MQTT connection
  if (!client.connected()) {
    deviceOnline = false;
    ensureMqttConnection();
  }
  client.loop();
  
  // Publish state periodically
  unsigned long now = millis();
  if (now - lastStateMs > STATE_PERIOD) {
    lastStateMs = now;
    publishState();
  }
  
  // Simulate sensor readings changing over time
  static unsigned long lastSensorUpdate = 0;
  if (now - lastSensorUpdate > 10000) { // Update sensors every 10 seconds
    lastSensorUpdate = now;
    publishState();
  }
  
  // Small delay to prevent watchdog issues
  delay(10);
}

/*
 * Usage Instructions:
 * 
 * 1. Update WiFi credentials (WIFI_SSID, WIFI_PASS)
 * 2. Update MQTT broker settings if needed (MQTT_HOST, MQTT_PORT)
 * 3. Update device ID (DEVICE_ID) to match your device
 * 4. Upload to ESP32
 * 
 * The device will:
 * - Connect to WiFi and MQTT
 * - Publish "online" status with LWT "offline"
 * - Publish state snapshots every 3 seconds
 * - Accept GPIO, servo, and gauge commands
 * - Send ACK responses for all commands
 * - Update state immediately after commands
 * 
 * MQTT Topics Used:
 * - devices/pump-1/status: "online" or "offline"
 * - devices/pump-1/state: JSON with gpio, sensors, gauges, servos
 * - devices/pump-1/cmd: JSON commands from dashboard
 * - devices/pump-1/ack: JSON ACK responses
 */
