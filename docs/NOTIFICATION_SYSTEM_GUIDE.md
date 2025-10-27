# 🔔 SapHari Notification System Guide

## Overview
The SapHari notification system monitors your ESP32 devices in real-time and sends browser notifications when specific conditions are met (like GPIO pin states, sensor thresholds, etc.).

## Setup Instructions

### 1. Enable Browser Notifications
When you first open the dashboard, you'll see a notification permission banner in the bottom-right corner:
- Click **"Enable Notifications"** 
- Your browser will ask for permission
- Click **"Allow"** to enable notifications

> **Note**: If you accidentally click "Block", you'll need to manually enable notifications in your browser settings.

### 2. Create an Alert Rule

#### Step-by-Step:
1. Click the **bell icon** (🔔) in the top navigation bar
2. Click **"+ Add Alert Rule"** in the alert rules dialog
3. Fill in the alert rule details:

#### For GPIO Alerts (e.g., Pin 2 goes HIGH):
- **Name**: "Pin 2 High Alert" (or any descriptive name)
- **Device ID**: Your ESP32 device ID (e.g., "ESP32_001")
- **Source**: Select **"GPIO"**
- **Pin**: Enter **2**
- **When Pin Equals**: Select **"HIGH (1)"**
- **Active**: Select **"Yes"**
- **Debounce ms**: Enter **1000** (prevents rapid repeated alerts)
- **Fire once until ack**: Select **"No"** (or "Yes" if you only want one alert until acknowledged)

4. Click **"Save Rule"**

#### For Sensor Alerts (e.g., Temperature above 30°C):
- **Name**: "High Temperature Alert"
- **Device ID**: Your ESP32 device ID
- **Source**: Select **"SENSOR"**
- **Key**: Enter the sensor key (e.g., "tempC" or "ds18b20.0.temp")
- **Operator**: Select **">"**
- **Value**: Enter **30**
- **Hysteresis** (optional): Enter **2** (prevents alert flapping near threshold)
- **Debounce ms**: Enter **5000**

5. Click **"Save Rule"**

### 3. Test Your Alert

#### Option A: Test Button
- In the Alert Rules dialog, click **"🔔 Test Alert Bell"**
- This sends a test notification to verify your setup

#### Option B: Real Device Test
For GPIO alerts:
1. Make sure your ESP32 is online and publishing to MQTT
2. Change the pin state on your device
3. The alert should trigger when the condition is met

## MQTT Topic Format

Your ESP32 device must publish messages in this format:

### GPIO State:
```
Topic: saphari/ESP32_001/gpio/2
Payload: 1  (or 0 for LOW)
```

### Sensor Data:
```
Topic: saphari/ESP32_001/sensor/tempC
Payload: 32.5
```

### Gauge Data:
```
Topic: saphari/ESP32_001/gauge/waterLevel
Payload: 75
```

## Troubleshooting

### Not Receiving Notifications?

1. **Check Browser Permission**:
   - Look for a bell icon with a slash through it in your browser's address bar
   - Click it and enable notifications

2. **Verify Alert Rule**:
   - Open the Alert Rules dialog (bell icon)
   - Make sure your rule is **Active** (shows "Yes")
   - Verify the Device ID matches exactly

3. **Check MQTT Connection**:
   - Look for "MQTT: Connected" status in your dashboard
   - Verify your device is publishing to the correct topics

4. **Check Browser Console**:
   - Press F12 to open developer tools
   - Look for messages like "🔔 ALERT FIRED" when the condition is met
   - This confirms the alert logic is working

5. **Verify Device Topics**:
   - Make sure your ESP32 publishes to topics in this format:
     - `saphari/{DEVICE_ID}/gpio/{PIN_NUMBER}`
     - `saphari/{DEVICE_ID}/sensor/{SENSOR_KEY}`

### Common Issues:

**Issue**: Notifications not showing even though permission is granted
- **Solution**: Refresh the page and try again

**Issue**: Too many notifications firing
- **Solution**: Increase the "Debounce ms" value (try 3000-5000)

**Issue**: Alert fires once but not again
- **Solution**: Set "Fire once until ack" to "No"

**Issue**: Alert doesn't fire near threshold values
- **Solution**: Add hysteresis (2-5) to prevent flapping

## Advanced Features

### Debounce
Prevents rapid repeated alerts when values oscillate:
- **1000ms**: Good for GPIO switches
- **5000ms**: Good for slowly changing sensors

### Hysteresis
Prevents alert flapping near threshold:
- Example: Alert at >30°C with hysteresis 2
  - Triggers at 32°C (30 + 2)
  - Must fall below 28°C (30 - 2) to re-arm

### Fire Once
When enabled, alert fires only once until acknowledged:
- Good for critical alerts that need attention
- Click "Acknowledge" in the alert bell to reset

## Example Use Cases

### 1. Door Sensor Alert
```
Name: Front Door Opened
Device ID: ESP32_001
Source: GPIO
Pin: 4
When Pin Equals: HIGH (1)
Debounce: 2000
```

### 2. Temperature Monitor
```
Name: Freezer Too Warm
Device ID: ESP32_FRIDGE
Source: SENSOR
Key: ds18b20.0.temp
Operator: >
Value: -10
Hysteresis: 2
Debounce: 10000
```

### 3. Water Level Alert
```
Name: Tank Almost Empty
Device ID: ESP32_TANK
Source: GAUGE
Key: waterLevelPct
Operator: <
Value: 20
Hysteresis: 5
Debounce: 5000
Fire once: Yes
```

## Need Help?

If you're still having issues:
1. Check the browser console (F12) for error messages
2. Verify MQTT messages are arriving (check MQTT logs)
3. Try the "Test Alert Bell" button to verify notification permissions
4. Make sure your device ID matches exactly (case-sensitive)
