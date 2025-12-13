# MQTT DNS & Connection Troubleshooting Guide

## Your Problem: "hostByName(): DNS Failed for mqtt.saphari.net"

### 🔍 What's Happening (Plain English)

---

## 1️⃣ Understanding DNS, Brokers, and Your Error

### What is DNS?

Think of DNS as the **internet's phone book**. 

When you type `google.com`, your computer doesn't know where that is. It asks a DNS server: *"What's the IP address for google.com?"* The DNS server replies: *"It's 142.250.80.46"*. Then your computer connects to that IP.

**Your ESP32 does the same thing:**
1. You tell it: "Connect to `mqtt.saphari.net`"
2. ESP32 asks DNS: "What's the IP for mqtt.saphari.net?"
3. DNS says: "I don't know that name" → **DNS FAILED**
4. ESP32 can't connect → **MQTT error rc = -2**

### What is mqtt.saphari.net?

This is a **hostname** (a name) that's supposed to point to an MQTT broker server. 

An **MQTT broker** is like a post office for IoT devices:
- Your ESP32 sends messages to the broker
- The SapHari web app subscribes to the broker
- The broker delivers messages between them

**The problem:** `mqtt.saphari.net` doesn't exist in DNS. It's like trying to call a phone number that was never assigned to anyone.

### Why Does DNS Fail When Internet Works?

Your phone's internet works because:
1. Apps use real domains (google.com, instagram.com) that exist in DNS
2. Those domains have proper DNS records

`mqtt.saphari.net` fails because:
1. No one created a DNS record for it
2. The DNS server returns "not found"
3. This isn't an internet problem - it's a **missing configuration** problem

---

## 2️⃣ Checklist: Does mqtt.saphari.net Actually Exist?

### Quick Test (From Any Computer)

Open a terminal/command prompt and run:

```bash
# On Windows (Command Prompt or PowerShell)
nslookup mqtt.saphari.net

# On Mac/Linux
dig mqtt.saphari.net
# or
host mqtt.saphari.net
```

**If you see this:** (Domain exists ✅)
```
mqtt.saphari.net has address 123.45.67.89
```

**If you see this:** (Domain DOESN'T exist ❌)
```
** server can't find mqtt.saphari.net: NXDOMAIN
```
or
```
Non-existent domain
```

### What the Results Mean

| Result | Meaning | Action |
|--------|---------|--------|
| `NXDOMAIN` | Domain doesn't exist | Create DNS record OR use different broker |
| `SERVFAIL` | DNS server error | Try different DNS (8.8.8.8) |
| IPv4 address (like 1.2.3.4) | Domain exists ✅ | Check if that IP is your broker |
| IPv6 only (like 2001:db8::1) | No IPv4 record | ESP32 needs IPv4 - add A record |

### Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| No A record created | NXDOMAIN | Add A record in DNS |
| Only AAAA (IPv6) record | ESP32 fails, desktop works | Add A record (IPv4) |
| Wrong subdomain | Works for mqtt, fails for broker | Check exact subdomain spelling |
| Domain not propagated | Works sometimes | Wait 24-48 hours |
| Typo in ESP32 code | nslookup works, ESP32 fails | Double-check MQTT_HOST value |

---

## 3️⃣ How to Fix It

### Situation A: You DON'T Own saphari.net

**This is likely your case!** 

If you don't own `saphari.net`, you can't create `mqtt.saphari.net`. You have two options:

#### Option 1: Use a Free Public MQTT Broker (Recommended for Testing)

These are real, working MQTT brokers you can use right now:

| Broker | Host | Port (Plain) | Port (TLS) | Notes |
|--------|------|--------------|------------|-------|
| EMQX Public | `broker.emqx.io` | 1883 | 8883 | Most reliable |
| HiveMQ Public | `broker.hivemq.com` | 1883 | 8883 | Good alternative |
| Mosquitto Test | `test.mosquitto.org` | 1883 | 8886 | Sometimes slow |

Change your ESP32 code:
```cpp
// ❌ This doesn't work - domain doesn't exist
const char* MQTT_HOST = "mqtt.saphari.net";

// ✅ This works - real public broker
const char* MQTT_HOST = "broker.emqx.io";
```

#### Option 2: Use a Direct IP Address

If you have your own MQTT broker running somewhere:
```cpp
// Use the server's IP directly (skips DNS entirely)
const char* MQTT_HOST = "123.45.67.89";  // Your VPS IP
```

---

### Situation B: You Own a Domain and Want mqtt.yourdomain.com

If you own a domain (from GoDaddy, Namecheap, Cloudflare, etc.), here's how to create the DNS record:

#### Step 1: Find Your MQTT Broker's IP Address

If your broker is on a VPS/cloud server, get its IP:
```bash
# SSH into your server and run:
curl ifconfig.me
# This shows your public IP
```

#### Step 2: Create the DNS Record

Go to your domain registrar's DNS settings and add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | mqtt | 123.45.67.89 | 300 |

This creates `mqtt.yourdomain.com` pointing to your server.

**Example in Cloudflare:**
1. Go to DNS settings
2. Click "Add Record"
3. Type: A
4. Name: mqtt
5. IPv4 address: (your server IP)
6. Proxy status: DNS only (gray cloud)
7. Save

#### Step 3: Wait for Propagation

DNS changes can take 5 minutes to 48 hours to spread worldwide. Check progress:
```bash
# Check if the record exists yet
nslookup mqtt.yourdomain.com
```

---

### Situation C: You're Self-Hosting the MQTT Broker

If you're running Mosquitto/EMQX on your own server:

1. **Get your server's public IP** (not 192.168.x.x - that's local only)
2. **Ensure MQTT port is open** (1883 or 8883 for TLS)
3. **Create DNS record** (see Situation B above)
4. **Configure your broker** to accept external connections

---

## 4️⃣ ESP32 Code with DNS Fallback and Debugging

Here's improved firmware that handles DNS failures gracefully:

See: `firmware/esp32_device_authoritative/main_dns_safe.cpp`

Key features:
- Tries the hostname first
- Falls back to direct IP if DNS fails
- Uses custom DNS servers (Google/Cloudflare)
- Prints detailed debug information
- Shows exactly what's failing

---

## 5️⃣ Known-Good Reference Setup

### Working Example: Public EMQX Broker

This setup works immediately with no DNS configuration:

```cpp
// ESP32 Configuration
const char* WIFI_SSID = "YourWiFi";
const char* WIFI_PASS = "YourPassword";
const char* MQTT_HOST = "broker.emqx.io";  // Public broker
const uint16_t MQTT_PORT = 1883;           // Non-TLS port
const char* DEVICE_ID = "my-esp32-001";
```

### Working Example: Custom Domain Done Right

If you own `example.com` and have a VPS at `203.0.113.50`:

1. **DNS Record** (at your registrar):
   - Type: A, Name: mqtt, Value: 203.0.113.50

2. **ESP32 Configuration**:
   ```cpp
   const char* MQTT_HOST = "mqtt.example.com";
   const uint16_t MQTT_PORT = 1883;
   ```

3. **Server Setup** (on VPS):
   ```bash
   # Install Mosquitto
   sudo apt install mosquitto mosquitto-clients
   
   # Open firewall
   sudo ufw allow 1883
   
   # Start broker
   sudo systemctl start mosquitto
   ```

---

## 6️⃣ Final Verdict: Your Root Cause

### Most Likely Cause: **The domain mqtt.saphari.net doesn't exist**

This is a **SapHari infrastructure/configuration issue**, NOT an ESP32 code issue.

**Evidence:**
- Multiple ESP32 boards fail identically → Not a hardware problem
- Error is "DNS Failed" → The name can't be resolved
- WiFi and internet work → Network is fine
- rc = -2 means "no broker connection" → Can't reach MQTT server

**The domain `mqtt.saphari.net` was never created.** The SapHari codebase uses `broker.emqx.io` as the default broker, not `mqtt.saphari.net`.

### Immediate Fix (Do This Now)

Change your ESP32 code from:
```cpp
const char* MQTT_HOST = "mqtt.saphari.net";  // ❌ Doesn't exist
```

To:
```cpp
const char* MQTT_HOST = "broker.emqx.io";    // ✅ Works
const uint16_t MQTT_PORT = 1883;
```

Or use TLS:
```cpp
const char* MQTT_HOST = "broker.emqx.io";
const uint16_t MQTT_PORT = 8883;             // TLS port
```

### Long-Term Fix (If You Want mqtt.saphari.net)

1. **If you own saphari.net**: Create an A record for `mqtt` pointing to your MQTT broker's IP
2. **If you don't own it**: Use `broker.emqx.io` or set up your own domain

---

## Quick Reference: MQTT Error Codes

| rc Code | Meaning | Common Cause |
|---------|---------|--------------|
| -2 | Network/connection failed | DNS failure, broker unreachable |
| -1 | Disconnected | Network dropout, broker restart |
| 0 | Success | All good! |
| 1 | Bad protocol | Old PubSubClient library |
| 2 | Client ID rejected | Duplicate client ID |
| 4 | Bad username/password | Auth failed |
| 5 | Not authorized | ACL denied |

---

## Summary

| Question | Answer |
|----------|--------|
| Why is ESP32 failing? | `mqtt.saphari.net` doesn't exist in DNS |
| Is this my code's fault? | No - the hostname simply doesn't resolve |
| How do I fix it right now? | Change MQTT_HOST to `broker.emqx.io` |
| Can I use mqtt.saphari.net? | Only if you own saphari.net and create the DNS record |
| What's the SapHari default? | `broker.emqx.io` (see the firmware files) |
