# SapHari Production MQTT Setup Guide

## 📋 Fix Priority Order

1. **Broker Settings Bug** ✅ (Fixed in Lovable)
2. **Platform Broker Architecture** ✅ (Fixed in Lovable)
3. **DNS & Broker Deployment** ⚠️ (Outside Lovable - see below)
4. **Snippet Generator** ✅ (Fixed in Lovable)
5. **Device Presence & Reliability** ✅ (Fixed in Lovable)

---

## ✅ What Was Fixed Inside Lovable

### 1. Broker Settings UPSERT Fix
- Created `upsert_broker_settings()` function that uses proper `ON CONFLICT` handling
- No more "duplicate key violates unique constraint" errors
- Settings now update correctly instead of failing on insert

### 2. Platform Broker Architecture
New database structure:
- `platform_broker_config` - Admin-managed default broker settings
- `organization_broker_override` - Per-organization custom settings
- `get_effective_broker_config()` - Returns the correct broker for user/org

**Hierarchy:**
1. Organization override (if exists)
2. User custom settings (if exists)
3. Platform default (fallback)

### 3. Professional Snippet Generator
- Generates Arduino sketch, PlatformIO config, and config header
- Validates broker configuration before generating
- Warns about DNS issues, missing TLS, etc.
- Includes LWT (Last Will Testament) for offline detection
- Includes exponential backoff for reconnection
- Topic conventions match dashboard expectations

### 4. Broker Health Test
- DNS resolution test via Google DNS API
- WebSocket connection test with latency
- Clear pass/fail status for each component

---

## ⚠️ What Must Be Done Outside Lovable

### Required: DNS & Broker Setup

**Option A: Use Managed MQTT Service (Recommended)**

1. **Sign up for EMQX Cloud** (https://www.emqx.com/en/cloud)
   - Free tier: 1M messages/month
   - Or HiveMQ Cloud (https://www.hivemq.com/mqtt-cloud-broker/)

2. **Get your broker details:**
   ```
   Host: xxxxx.emqx.cloud
   TCP Port: 1883 (or 8883 for TLS)
   WebSocket Port: 8083 (or 8084 for WSS)
   Username: (create in dashboard)
   Password: (create in dashboard)
   ```

3. **Update SapHari platform config:**
   - Go to Settings → Broker Configuration
   - Update the platform default with your EMQX Cloud details
   - Test connection to verify

**Option B: Self-Hosted Broker (VPS)**

1. **Get a VPS** (DigitalOcean, Linode, AWS, etc.)
   - Minimum: 1 vCPU, 1GB RAM
   - Ubuntu 22.04 recommended

2. **Install EMQX:**
   ```bash
   curl -s https://assets.emqx.com/scripts/install-emqx-deb.sh | sudo bash
   sudo apt-get install emqx
   sudo systemctl start emqx
   sudo systemctl enable emqx
   ```

3. **Configure firewall:**
   ```bash
   sudo ufw allow 1883/tcp    # MQTT
   sudo ufw allow 8883/tcp    # MQTT TLS
   sudo ufw allow 8083/tcp    # WebSocket
   sudo ufw allow 8084/tcp    # WebSocket TLS
   sudo ufw allow 18083/tcp   # Dashboard (optional)
   ```

4. **Set up TLS certificates:**
   ```bash
   sudo apt install certbot
   sudo certbot certonly --standalone -d mqtt.yourdomain.com
   ```

5. **Configure EMQX TLS** (`/etc/emqx/emqx.conf`):
   ```hocon
   listeners.ssl.default {
     bind = "0.0.0.0:8883"
     ssl_options {
       certfile = "/etc/letsencrypt/live/mqtt.yourdomain.com/fullchain.pem"
       keyfile = "/etc/letsencrypt/live/mqtt.yourdomain.com/privkey.pem"
     }
   }
   
   listeners.wss.default {
     bind = "0.0.0.0:8084"
     ssl_options {
       certfile = "/etc/letsencrypt/live/mqtt.yourdomain.com/fullchain.pem"
       keyfile = "/etc/letsencrypt/live/mqtt.yourdomain.com/privkey.pem"
     }
   }
   ```

6. **Create DNS A Record:**
   - Go to your domain registrar (GoDaddy, Cloudflare, etc.)
   - Add A record: `mqtt.yourdomain.com` → `YOUR_VPS_IP`
   - Wait for propagation (5-60 minutes)

7. **Verify DNS:**
   ```bash
   nslookup mqtt.yourdomain.com
   # Should return your VPS IP
   ```

**Option C: Use Public Broker (Development Only)**

For testing only, you can use:
```
Host: broker.emqx.io
TCP Port: 1883
WSS URL: wss://broker.emqx.io:8084/mqtt
```

⚠️ **WARNING**: Public brokers are NOT secure. Anyone can subscribe to your topics!

---

## 🔐 Authentication & ACLs

### Per-Device Authentication

1. **Create device credentials in EMQX Dashboard:**
   - Username: `device_<device_id>`
   - Password: auto-generated secure token

2. **ACL Rules (Topic Restrictions):**
   ```
   # Device can only access its own topics
   {allow, {username, "device_abc123"}, publish, ["saphari/abc123/#"]}.
   {allow, {username, "device_abc123"}, subscribe, ["saphari/abc123/#"]}.
   {deny, all}.
   ```

3. **Dashboard ACL (for web clients):**
   ```
   # Web dashboard can subscribe to all user devices
   {allow, {username, "dashboard_user_xyz"}, subscribe, ["saphari/+/status/#", "saphari/+/sensor/#"]}.
   {allow, {username, "dashboard_user_xyz"}, publish, ["saphari/+/cmd/#"]}.
   ```

---

## 📊 Topic Conventions

```
saphari/{device_id}/status/online    # Device presence (retained)
saphari/{device_id}/state            # Full device state JSON
saphari/{device_id}/gpio/{pin}       # GPIO pin state
saphari/{device_id}/sensor/{name}    # Sensor readings
saphari/{device_id}/gauge/{name}     # Gauge values
saphari/{device_id}/cmd/{type}/{addr}  # Commands from dashboard
saphari/{device_id}/ack              # Command acknowledgments
```

**Retained vs Non-Retained:**
- `status/online` → RETAINED (shows last known state)
- `state` → RETAINED
- `sensor/*` → NOT retained (real-time data)
- `cmd/*` → NOT retained (commands)
- `ack` → NOT retained

---

## 🔧 Troubleshooting Checklist

### ESP32 Can't Connect

1. **WiFi working?**
   ```cpp
   Serial.println(WiFi.localIP()); // Should show IP
   ```

2. **DNS resolving?**
   ```cpp
   IPAddress ip;
   if (WiFi.hostByName("mqtt.yourdomain.com", ip)) {
     Serial.println(ip); // Should show broker IP
   } else {
     Serial.println("DNS FAILED");
   }
   ```

3. **Port open?**
   ```bash
   nc -zv mqtt.yourdomain.com 1883
   # Should say "Connection succeeded"
   ```

4. **TLS working?**
   ```bash
   openssl s_client -connect mqtt.yourdomain.com:8883
   # Should show certificate info
   ```

### Dashboard Shows "Disconnected"

1. Check browser console for WebSocket errors
2. Verify WSS URL is correct (wss:// not ws://)
3. Test broker health using the built-in test button
4. Check if broker requires authentication

### Device Shows "Offline" Even When Connected

1. Verify device is publishing to correct topic: `saphari/{device_id}/status/online`
2. Check that message is "online" (lowercase)
3. Ensure LWT is set correctly for "offline" message
4. Verify heartbeat is running (every 30 seconds)

---

## 📁 Generated Files

When you generate code from SapHari, you'll get:

1. **saphari_config.h** - Device configuration header
2. **main.cpp** - Full Arduino sketch with all features
3. **platformio.ini** - PlatformIO project configuration

Copy these to your ESP32 project and update WiFi credentials.

---

## 🚀 Production Checklist

- [ ] Using managed MQTT service or properly configured self-hosted broker
- [ ] TLS enabled on all connections (8883 for TCP, 8084 for WSS)
- [ ] Per-device authentication configured
- [ ] ACL rules restrict device topics
- [ ] DNS A record created and resolving
- [ ] ESP32 firmware uses LWT for offline detection
- [ ] Heartbeat interval configured (30 seconds recommended)
- [ ] Reconnect backoff implemented
- [ ] SapHari platform config updated with production broker
