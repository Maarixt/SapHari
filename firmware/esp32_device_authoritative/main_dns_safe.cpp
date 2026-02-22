/*
 * ESP32 Device Firmware - DNS-Safe Version
 * 
 * Features:
 * - Custom DNS servers (Google/Cloudflare) for better reliability
 * - DNS lookup debugging with detailed error messages
 * - Fallback to direct IP if hostname fails
 * - Automatic retry with exponential backoff
 * 
 * This version helps debug "hostByName(): DNS Failed" errors
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============= USER CONFIGURATION =============
// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// MQTT Broker Configuration
// Option 1: Use a hostname (requires working DNS)
const char* MQTT_HOST = "broker.emqx.io";  // ✅ This works! It's a real public broker

// Option 2: If you have your own broker with a custom domain
// const char* MQTT_HOST = "mqtt.yourdomain.com";

// Option 3: Use direct IP (bypasses DNS entirely)
// const char* MQTT_HOST = "18.185.216.21";  // EMQX's IP (may change)

// Fallback IP if DNS fails (optional - set to your broker's IP or EMQX's IP)
const char* MQTT_FALLBACK_IP = "18.185.216.21";  // broker.emqx.io approximate IP
const bool USE_FALLBACK_IP = true;  // Set to false to disable fallback

const uint16_t MQTT_PORT = 1883;     // Non-TLS port (use 8883 for TLS)
const char* DEVICE_ID = "esp32-001"; // Change this for each device!

// Hardware Configuration
const int CONTROL_PIN = 4;   // GPIO pin to control
const int LED_PIN = 2;       // Built-in LED (GPIO2 on most ESP32)
// ============= END CONFIGURATION =============

// Custom DNS Servers (more reliable than ISP DNS)
IPAddress dns1(8, 8, 8, 8);      // Google DNS
IPAddress dns2(1, 1, 1, 1);      // Cloudflare DNS

WiFiClient espClient;
PubSubClient mqtt(espClient);

// State tracking
bool usingFallbackIP = false;
unsigned long lastStatePublish = 0;
unsigned long lastReconnectAttempt = 0;
int reconnectAttempts = 0;
const int MAX_RECONNECT_DELAY = 30000; // Max 30 seconds between attempts

// ============= DNS DEBUGGING FUNCTIONS =============

/**
 * Test if DNS resolution works for a hostname
 * Returns true if the hostname can be resolved
 */
bool testDNS(const char* hostname) {
  Serial.print("🔍 Testing DNS for: ");
  Serial.println(hostname);
  
  IPAddress resolvedIP;
  
  // Try to resolve the hostname
  int result = WiFi.hostByName(hostname, resolvedIP);
  
  if (result == 1 && resolvedIP != IPAddress(0, 0, 0, 0)) {
    Serial.print("   ✅ DNS Success! ");
    Serial.print(hostname);
    Serial.print(" → ");
    Serial.println(resolvedIP);
    return true;
  } else {
    Serial.print("   ❌ DNS Failed for: ");
    Serial.println(hostname);
    Serial.println("   Possible causes:");
    Serial.println("   - Domain doesn't exist (no A record)");
    Serial.println("   - DNS server unreachable");
    Serial.println("   - Firewall blocking port 53");
    Serial.println("   - Typo in hostname");
    return false;
  }
}

/**
 * Print detailed network debugging information
 */
void printNetworkDebug() {
  Serial.println("\n========== NETWORK DEBUG ==========");
  
  // WiFi Status
  Serial.print("📶 WiFi Status: ");
  switch (WiFi.status()) {
    case WL_CONNECTED:     Serial.println("Connected ✅"); break;
    case WL_NO_SHIELD:     Serial.println("No WiFi hardware"); break;
    case WL_IDLE_STATUS:   Serial.println("Idle"); break;
    case WL_NO_SSID_AVAIL: Serial.println("SSID not found ❌"); break;
    case WL_SCAN_COMPLETED: Serial.println("Scan completed"); break;
    case WL_CONNECT_FAILED: Serial.println("Connection failed ❌"); break;
    case WL_CONNECTION_LOST: Serial.println("Connection lost ❌"); break;
    case WL_DISCONNECTED:  Serial.println("Disconnected"); break;
    default:               Serial.println("Unknown"); break;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("📍 Local IP: ");
    Serial.println(WiFi.localIP());
    
    Serial.print("🌐 Gateway: ");
    Serial.println(WiFi.gatewayIP());
    
    Serial.print("🔢 Subnet: ");
    Serial.println(WiFi.subnetMask());
    
    Serial.print("📡 DNS 1: ");
    Serial.println(WiFi.dnsIP(0));
    
    Serial.print("📡 DNS 2: ");
    Serial.println(WiFi.dnsIP(1));
    
    Serial.print("📶 Signal (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    // Test DNS resolution
    Serial.println("\n--- DNS Resolution Tests ---");
    
    // Test a known-good domain first
    Serial.println("Testing google.com (should always work):");
    bool googleOk = testDNS("google.com");
    
    // Test the MQTT broker
    Serial.println("\nTesting MQTT broker hostname:");
    bool mqttOk = testDNS(MQTT_HOST);
    
    if (googleOk && !mqttOk) {
      Serial.println("\n⚠️  DIAGNOSIS: DNS works, but MQTT host doesn't exist!");
      Serial.println("   The hostname '" + String(MQTT_HOST) + "' is not registered in DNS.");
      Serial.println("   SOLUTION: Either:");
      Serial.println("   1. Use a working broker like 'broker.emqx.io'");
      Serial.println("   2. Create a DNS A record for your hostname");
      Serial.println("   3. Use a direct IP address instead");
    } else if (!googleOk && !mqttOk) {
      Serial.println("\n⚠️  DIAGNOSIS: DNS is completely broken!");
      Serial.println("   Cannot resolve any hostnames.");
      Serial.println("   SOLUTION: Check internet connection or DNS server");
    }
  }
  
  Serial.println("====================================\n");
}

/**
 * Set custom DNS servers for better reliability
 */
void setCustomDNS() {
  Serial.println("🔧 Setting custom DNS servers...");
  Serial.print("   Primary: ");
  Serial.println(dns1);
  Serial.print("   Secondary: ");
  Serial.println(dns2);
  
  // Configure DNS servers
  WiFi.config(WiFi.localIP(), WiFi.gatewayIP(), WiFi.subnetMask(), dns1, dns2);
  
  // Verify DNS was set
  delay(100);
  Serial.print("   Configured DNS 1: ");
  Serial.println(WiFi.dnsIP(0));
  Serial.print("   Configured DNS 2: ");
  Serial.println(WiFi.dnsIP(1));
}

// ============= MQTT TOPIC HELPERS =============

String topic(const char* channel) {
  return "saphari/" + String(DEVICE_ID) + "/" + channel;
}

String statusOnlineTopic() {
  return topic("status/online");  // saphari/ID/status/online (dashboard expects this)
}

// ============= MQTT CALLBACKS =============

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  // Convert payload to string
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("📨 Message on ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(message);
  
  // Parse JSON command
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.println("   ❌ Failed to parse JSON");
    return;
  }
  
  // Handle commands
  const char* action = doc["action"] | doc["type"] | "";
  int pin = doc["pin"] | -1;
  int value = doc["value"] | doc["state"] | 0;
  
  if (pin == CONTROL_PIN || pin == LED_PIN) {
    digitalWrite(pin, value ? HIGH : LOW);
    Serial.print("   ✅ Set GPIO ");
    Serial.print(pin);
    Serial.print(" to ");
    Serial.println(value);
    
    // Publish updated state
    publishState();
  }
}

// ============= MQTT PUBLISHING =============

void publishState() {
  if (!mqtt.connected()) return;
  
  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = millis();
  doc["using_fallback_ip"] = usingFallbackIP;
  
  // GPIO states
  JsonObject gpio = doc.createNestedObject("gpio");
  gpio[String(CONTROL_PIN)] = digitalRead(CONTROL_PIN);
  gpio[String(LED_PIN)] = digitalRead(LED_PIN);
  
  // Network info
  JsonObject network = doc.createNestedObject("network");
  network["rssi"] = WiFi.RSSI();
  network["ip"] = WiFi.localIP().toString();
  
  char buffer[512];
  serializeJson(doc, buffer);
  
  mqtt.publish(topic("state").c_str(), buffer, true);  // retained
  Serial.println("📤 Published state");
}

void publishOnline() {
  mqtt.publish(statusOnlineTopic().c_str(), "online", true);  // retained
  Serial.println("📤 Published: online");
}

// ============= MQTT CONNECTION =============

bool connectMQTT() {
  const char* hostToUse = MQTT_HOST;
  
  // Test if hostname resolves
  IPAddress resolvedIP;
  bool dnsWorks = (WiFi.hostByName(MQTT_HOST, resolvedIP) == 1);
  
  if (!dnsWorks && USE_FALLBACK_IP && strlen(MQTT_FALLBACK_IP) > 0) {
    Serial.println("⚠️  DNS failed, using fallback IP: " + String(MQTT_FALLBACK_IP));
    hostToUse = MQTT_FALLBACK_IP;
    usingFallbackIP = true;
  } else if (!dnsWorks) {
    Serial.println("❌ DNS failed and no fallback IP configured");
    return false;
  } else {
    usingFallbackIP = false;
    Serial.print("✅ DNS resolved to: ");
    Serial.println(resolvedIP);
  }
  
  // Configure MQTT server
  mqtt.setServer(hostToUse, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  
  // Generate client ID
  String clientId = "esp32-" + String(DEVICE_ID) + "-" + String(random(0xFFFF), HEX);
  
  Serial.print("🔌 Connecting to MQTT (");
  Serial.print(hostToUse);
  Serial.print(":");
  Serial.print(MQTT_PORT);
  Serial.print(") as ");
  Serial.println(clientId);
  
  // Connect with LWT (Last Will and Testament) - dashboard expects status/online
  bool connected = mqtt.connect(
    clientId.c_str(),
    NULL,  // username (null for public broker)
    NULL,  // password
    statusOnlineTopic().c_str(),  // LWT topic: saphari/ID/status/online
    1,     // LWT QoS
    true,  // LWT retain
    "offline"  // LWT message
  );
  
  if (connected) {
    Serial.println("✅ MQTT Connected!");
    reconnectAttempts = 0;
    
    // Subscribe to command topic
    String cmdTopic = topic("cmd");
    mqtt.subscribe(cmdTopic.c_str());
    Serial.println("📥 Subscribed to: " + cmdTopic);
    
    // Publish online status
    publishOnline();
    
    // Publish initial state
    publishState();
    
    return true;
  } else {
    int state = mqtt.state();
    Serial.print("❌ MQTT connection failed, rc=");
    Serial.print(state);
    Serial.print(" → ");
    
    // Explain the error code
    switch (state) {
      case -4: Serial.println("Connection timeout"); break;
      case -3: Serial.println("Connection lost"); break;
      case -2: Serial.println("Connect failed (network/DNS issue)"); break;
      case -1: Serial.println("Disconnected"); break;
      case 0:  Serial.println("Connected (but something else failed?)"); break;
      case 1:  Serial.println("Bad protocol version"); break;
      case 2:  Serial.println("Client ID rejected"); break;
      case 3:  Serial.println("Server unavailable"); break;
      case 4:  Serial.println("Bad username/password"); break;
      case 5:  Serial.println("Not authorized"); break;
      default: Serial.println("Unknown error"); break;
    }
    
    return false;
  }
}

void ensureMQTTConnection() {
  if (mqtt.connected()) return;
  
  unsigned long now = millis();
  
  // Exponential backoff
  int delay_ms = min(1000 * (1 << reconnectAttempts), MAX_RECONNECT_DELAY);
  
  if (now - lastReconnectAttempt < delay_ms) return;
  
  lastReconnectAttempt = now;
  reconnectAttempts++;
  
  Serial.print("\n🔄 MQTT reconnect attempt #");
  Serial.print(reconnectAttempts);
  Serial.print(" (next in ");
  Serial.print(delay_ms / 1000);
  Serial.println("s if this fails)");
  
  if (!connectMQTT()) {
    if (reconnectAttempts >= 5) {
      Serial.println("\n⚠️  Multiple MQTT failures. Running diagnostics...");
      printNetworkDebug();
    }
  }
}

// ============= WiFi CONNECTION =============

void connectWiFi() {
  Serial.print("\n📶 Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("   IP: ");
    Serial.println(WiFi.localIP());
    
    // Set custom DNS for better reliability
    setCustomDNS();
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    Serial.println("   Check SSID and password");
    Serial.println("   Restarting in 10 seconds...");
    delay(10000);
    ESP.restart();
  }
}

// ============= MAIN SETUP & LOOP =============

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n");
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║  ESP32 SapHari Device - DNS Safe      ║");
  Serial.println("║  Version 1.0.0                        ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
  
  // Show configuration
  Serial.println("📋 Configuration:");
  Serial.print("   MQTT Host: ");
  Serial.println(MQTT_HOST);
  Serial.print("   MQTT Port: ");
  Serial.println(MQTT_PORT);
  Serial.print("   Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("   Fallback IP: ");
  Serial.println(USE_FALLBACK_IP ? MQTT_FALLBACK_IP : "(disabled)");
  Serial.println();
  
  // Initialize pins
  pinMode(CONTROL_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(CONTROL_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  // Connect to WiFi
  connectWiFi();
  
  // Run initial diagnostics
  printNetworkDebug();
  
  // Connect to MQTT
  connectMQTT();
}

void loop() {
  // Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi disconnected! Reconnecting...");
    connectWiFi();
    return;
  }
  
  // Maintain MQTT connection
  ensureMQTTConnection();
  
  // Process MQTT messages
  mqtt.loop();
  
  // Publish state every 10 seconds
  unsigned long now = millis();
  if (mqtt.connected() && (now - lastStatePublish > 10000)) {
    lastStatePublish = now;
    publishState();
  }
  
  delay(10);
}

/*
 * ============= TROUBLESHOOTING GUIDE =============
 * 
 * ERROR: "DNS Failed for mqtt.saphari.net"
 * CAUSE: The hostname doesn't exist in DNS
 * FIX:   Change MQTT_HOST to "broker.emqx.io" or use an IP address
 * 
 * ERROR: "Connect failed rc=-2"
 * CAUSE: Can't reach the broker (DNS or network issue)
 * FIX:   1. Check the hostname exists (use nslookup)
 *        2. Try using a direct IP address
 *        3. Check firewall allows port 1883/8883
 * 
 * ERROR: "Client ID rejected rc=2"
 * CAUSE: Another device using the same client ID
 * FIX:   Make DEVICE_ID unique for each ESP32
 * 
 * ERROR: "Not authorized rc=5"
 * CAUSE: Broker requires authentication
 * FIX:   Add username/password to mqtt.connect()
 * 
 * ============= WORKING MQTT BROKERS =============
 * 
 * For testing (no auth required):
 *   broker.emqx.io:1883 (or 8883 for TLS)
 *   broker.hivemq.com:1883
 *   test.mosquitto.org:1883
 * 
 * ================================================
 */
