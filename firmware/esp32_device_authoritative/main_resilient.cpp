/**
 * SapHari ESP32 Device Firmware - Resilient 24/7 Edition
 * 
 * Features:
 * - MQTT over TLS (port 8883) with LWT for presence
 * - Heartbeat every 25 seconds to prevent idle timeout
 * - MQTT stale watchdog (90s timeout)
 * - Silent dead TLS socket detection
 * - Wi-Fi resilience with sleep disabled
 * - Command handling for GPIO toggle
 * - Retained status publishing
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ===== CONFIGURATION - UPDATE THESE =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

const char* MQTT_HOST = "z110b082.ala.us-east-1.emqxsl.com";
const int MQTT_PORT = 8883;

const char* DEVICE_ID = "YOUR_DEVICE_ID";      // From SapHari dashboard
const char* DEVICE_KEY = "YOUR_DEVICE_KEY";    // From SapHari dashboard

// ===== PIN CONFIGURATION =====
const int LED_PIN = 2;  // Built-in LED
const int GPIO_PINS[] = {4, 5, 18, 19, 21, 22, 23};  // Available GPIO pins
const int NUM_GPIO_PINS = sizeof(GPIO_PINS) / sizeof(GPIO_PINS[0]);

// ===== TIMING CONSTANTS =====
const unsigned long HEARTBEAT_INTERVAL_MS = 25000;       // 25 seconds
const unsigned long STATE_PUBLISH_INTERVAL_MS = 60000;   // 60 seconds
const unsigned long MQTT_STALE_TIMEOUT_MS = 90000;       // 90 seconds
const unsigned long WIFI_CHECK_INTERVAL_MS = 10000;      // 10 seconds
const unsigned long MQTT_RECONNECT_DELAY_MS = 5000;      // 5 seconds between reconnect attempts

// ===== EMQX CA Certificate =====
const char* ROOT_CA = R"(
-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUxMjAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IEcyMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuzfNNNx7a8myaJCtSnX/RrohCgiN9RlUyfuI
2/Ou8jqJkTx65qsGGmvPrC3oXgkkRLpimn7Wo6h+4FR1IAWsULecYxpsMNzaHxmx
1x7e/dfgy5SDN67sH0NO3Xss0r0upS/kqbitOtSZpLYl6ZtrAGCSYP9PIUkY92eQ
q2EGnI/yuum06ZIya7XzV+hdG82MHauVBJVJ8zUtluNJbd134/tJS7SsVQepj5Wz
tCO7TG1F8PapspUwtP1MVYwnSlcUfIKdzXOS0xZKBgyMUNGPHgm+F6HmIcr9g+UQ
vIOlCsRnKPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQABo0IwQDAP
BgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUTiJUIBiV
5uNu5g/6+rkS7QYXjzkwDQYJKoZIhvcNAQELBQADggEBAGBnKJRvDkhj6zHd6mcY
1Yl9PMCcit4HLJSIhjn7TG1GxMXQJVdIDJ9BKsOIf3LKJXO9e4B/iG2gCg0KX3rD
q2gCioXUvMnVMrzEr7Pe2C8bYDLLQVGk9nQ4aX9T+xjUwzaB9lBEzQ7Xn0FfLw1D
H166yTqe9PQLnkDVzv5fN6D8dJZeJBogXC4ny/TCUe/Fl1VGuFwP/w9mYLJpcnDE
S4JewxEtHXqTcy4q8MpoM7t1Gv9Xvd+c3xtLT6k8qr3fKSfhQk1jLyB1Gsk8DEJL
p/a5AIudBcZae5jTfH+X8f/rI9Nl6xZHjMkxRhSSFmipv4y3Mx6h1rXG7CSIBQCD
JwM=
-----END CERTIFICATE-----
)";

// ===== GLOBAL OBJECTS =====
WiFiClientSecure tlsClient;
PubSubClient mqtt(tlsClient);

// ===== STATE TRACKING =====
int gpioStates[NUM_GPIO_PINS] = {0};
unsigned long lastHeartbeat = 0;
unsigned long lastStatePublish = 0;
unsigned long lastMqttOk = 0;
unsigned long lastWiFiCheck = 0;
unsigned long lastMqttReconnectAttempt = 0;
unsigned long bootTime = 0;
bool mqttWasConnected = false;

// ===== TOPIC BUILDERS =====
String buildTopic(const char* channel) {
  return String("saphari/") + DEVICE_ID + "/" + channel;
}

String buildGpioTopic(int pin) {
  return String("saphari/") + DEVICE_ID + "/gpio/" + String(pin);
}

// ===== WIFI MANAGEMENT =====
void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // Disable WiFi sleep for reliability
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.println(WiFi.RSSI());
  } else {
    Serial.println("\nWiFi connection failed!");
  }
}

bool checkWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }
  
  Serial.println("WiFi disconnected! Reconnecting...");
  WiFi.disconnect();
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi reconnected!");
    return true;
  }
  
  Serial.println("\nWiFi reconnection failed!");
  return false;
}

// ===== MQTT PUBLISHING HELPERS =====
bool publishWithRetry(const char* topic, const char* payload, bool retain = false) {
  if (!mqtt.connected()) {
    return false;
  }
  
  bool success = mqtt.publish(topic, payload, retain);
  if (success) {
    lastMqttOk = millis();
    Serial.printf("📤 Published [%s]: %s\n", topic, payload);
  } else {
    Serial.printf("❌ Publish failed [%s]: %s\n", topic, payload);
  }
  return success;
}

// ===== STATUS PUBLISHING =====
void publishOnlineStatus() {
  String topic = buildTopic("status");
  publishWithRetry(topic.c_str(), "online", true);
}

void publishHeartbeat() {
  unsigned long uptime = (millis() - bootTime) / 1000;
  int rssi = WiFi.RSSI();
  
  StaticJsonDocument<128> doc;
  doc["uptime"] = uptime;
  doc["rssi"] = rssi;
  doc["heap"] = ESP.getFreeHeap();
  
  char payload[128];
  serializeJson(doc, payload);
  
  String topic = buildTopic("heartbeat");
  publishWithRetry(topic.c_str(), payload, false);
}

void publishGpioState(int pin, int value) {
  String topic = buildGpioTopic(pin);
  publishWithRetry(topic.c_str(), String(value).c_str(), true);
}

void publishAllGpioStates() {
  for (int i = 0; i < NUM_GPIO_PINS; i++) {
    publishGpioState(GPIO_PINS[i], gpioStates[i]);
  }
}

void publishDeviceState() {
  StaticJsonDocument<512> doc;
  doc["online"] = true;
  doc["uptime"] = (millis() - bootTime) / 1000;
  doc["rssi"] = WiFi.RSSI();
  doc["heap"] = ESP.getFreeHeap();
  
  JsonObject gpio = doc.createNestedObject("gpio");
  for (int i = 0; i < NUM_GPIO_PINS; i++) {
    gpio[String(GPIO_PINS[i])] = gpioStates[i];
  }
  
  char payload[512];
  serializeJson(doc, payload);
  
  String topic = buildTopic("state");
  publishWithRetry(topic.c_str(), payload, true);
}

// ===== COMMAND HANDLING =====
void handleToggleCommand(const char* payload) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    Serial.printf("❌ JSON parse error: %s\n", error.c_str());
    return;
  }
  
  int pin = doc["pin"] | -1;
  int state = doc["state"] | -1;
  
  if (pin < 0 || state < 0) {
    Serial.println("❌ Invalid toggle command: missing pin or state");
    return;
  }
  
  // Find pin index
  int pinIndex = -1;
  for (int i = 0; i < NUM_GPIO_PINS; i++) {
    if (GPIO_PINS[i] == pin) {
      pinIndex = i;
      break;
    }
  }
  
  if (pinIndex < 0) {
    Serial.printf("❌ Unknown pin: %d\n", pin);
    return;
  }
  
  // Apply state
  digitalWrite(pin, state);
  gpioStates[pinIndex] = state;
  
  Serial.printf("✅ GPIO %d set to %d\n", pin, state);
  
  // Publish confirmation
  publishGpioState(pin, state);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  lastMqttOk = millis();
  
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  
  Serial.printf("📥 Received [%s]: %s\n", topic, message);
  
  // Handle toggle commands
  String cmdTopic = buildTopic("cmd/toggle");
  if (String(topic) == cmdTopic) {
    handleToggleCommand(message);
  }
}

// ===== MQTT CONNECTION =====
void hardDisconnectMqtt() {
  Serial.println("🔌 Hard disconnecting MQTT + TLS...");
  mqtt.disconnect();
  tlsClient.stop();
  delay(100);
}

bool connectMqtt() {
  if (mqtt.connected()) {
    return true;
  }
  
  // Rate limit reconnection attempts
  if (millis() - lastMqttReconnectAttempt < MQTT_RECONNECT_DELAY_MS) {
    return false;
  }
  lastMqttReconnectAttempt = millis();
  
  Serial.println("Connecting to MQTT broker...");
  Serial.printf("Host: %s:%d\n", MQTT_HOST, MQTT_PORT);
  
  // Setup TLS
  tlsClient.setCACert(ROOT_CA);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setKeepAlive(60);
  mqtt.setBufferSize(1024);
  
  // Build LWT topic
  String statusTopic = buildTopic("status");
  
  // Connect with LWT
  String clientId = String("esp32_") + DEVICE_ID;
  bool connected = mqtt.connect(
    clientId.c_str(),
    DEVICE_ID,             // username
    DEVICE_KEY,            // password
    statusTopic.c_str(),   // LWT topic
    1,                     // LWT QoS
    true,                  // LWT retain
    "offline"              // LWT payload
  );
  
  if (connected) {
    Serial.println("✅ MQTT connected!");
    lastMqttOk = millis();
    mqttWasConnected = true;
    
    // Publish online status immediately
    publishOnlineStatus();
    
    // Subscribe to command topics
    String cmdTopic = buildTopic("cmd/#");
    mqtt.subscribe(cmdTopic.c_str(), 1);
    Serial.printf("📡 Subscribed to: %s\n", cmdTopic.c_str());
    
    // Publish initial state
    publishAllGpioStates();
    publishDeviceState();
    
    return true;
  } else {
    int state = mqtt.state();
    Serial.printf("❌ MQTT connection failed, state: %d\n", state);
    return false;
  }
}

// ===== WATCHDOG CHECKS =====
void checkMqttStale() {
  if (!mqtt.connected()) {
    return;
  }
  
  unsigned long elapsed = millis() - lastMqttOk;
  
  if (elapsed > MQTT_STALE_TIMEOUT_MS) {
    Serial.printf("⚠️ MQTT stale! No activity for %lu ms. Forcing reconnect...\n", elapsed);
    hardDisconnectMqtt();
  }
}

void checkHeartbeatHealth() {
  if (!mqtt.connected()) {
    return;
  }
  
  // Try to publish heartbeat
  unsigned long uptime = (millis() - bootTime) / 1000;
  String topic = buildTopic("heartbeat");
  String payload = String(uptime);
  
  bool success = mqtt.publish(topic.c_str(), payload.c_str(), false);
  
  if (!success) {
    Serial.println("⚠️ Heartbeat publish failed! TLS socket may be dead. Forcing reconnect...");
    hardDisconnectMqtt();
  } else {
    lastMqttOk = millis();
    lastHeartbeat = millis();
  }
}

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n========================================");
  Serial.println("  SapHari ESP32 - Resilient 24/7 Mode");
  Serial.println("========================================");
  Serial.printf("Device ID: %s\n", DEVICE_ID);
  
  bootTime = millis();
  
  // Initialize GPIO pins
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  for (int i = 0; i < NUM_GPIO_PINS; i++) {
    pinMode(GPIO_PINS[i], OUTPUT);
    digitalWrite(GPIO_PINS[i], LOW);
    gpioStates[i] = 0;
  }
  
  // Connect to WiFi
  setupWiFi();
  
  // Initial MQTT connection
  if (WiFi.status() == WL_CONNECTED) {
    connectMqtt();
  }
  
  Serial.println("Setup complete! Entering main loop...\n");
}

// ===== MAIN LOOP =====
void loop() {
  unsigned long now = millis();
  
  // === WiFi Watchdog (every 10s) ===
  if (now - lastWiFiCheck >= WIFI_CHECK_INTERVAL_MS) {
    lastWiFiCheck = now;
    
    if (!checkWiFi()) {
      // WiFi down, skip other checks
      digitalWrite(LED_PIN, LOW);
      return;
    }
  }
  
  // === MQTT Connection ===
  if (!mqtt.connected()) {
    digitalWrite(LED_PIN, LOW);
    connectMqtt();
  } else {
    digitalWrite(LED_PIN, HIGH);  // LED on = connected
    mqtt.loop();
  }
  
  // === MQTT Stale Watchdog ===
  checkMqttStale();
  
  // === Heartbeat (every 25s) ===
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    if (mqtt.connected()) {
      checkHeartbeatHealth();
    }
  }
  
  // === Full State Publish (every 60s) ===
  if (now - lastStatePublish >= STATE_PUBLISH_INTERVAL_MS) {
    lastStatePublish = now;
    if (mqtt.connected()) {
      publishDeviceState();
    }
  }
  
  // Small delay to prevent CPU hogging
  delay(10);
}
