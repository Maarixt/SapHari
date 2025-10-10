# 🚨 SapHari Alert System - Complete Setup Guide

## 🎯 Overview

The SapHari alert system provides comprehensive notifications for IoT device monitoring with:
- **Device-Authoritative State**: ESP32 is the single source of truth
- **Multi-Channel Notifications**: In-app, browser, web push, email, Slack, Discord, Telegram, webhooks
- **Advanced Alert Rules**: GPIO, sensor, and logic-based conditions with debounce, hysteresis, and quiet hours
- **Real-time Processing**: MQTT-driven alerts that fire only on ESP32-reported state changes

## 🚀 Quick Start

### 1. Start Backend Server
```bash
cd server
npm install
npm run generate-vapid  # Generate VAPID keys
# Copy generated keys to .env file
npm run dev
```

### 2. Start Frontend
```bash
npm run dev
```

### 3. Test the System
Open browser console and run:
```javascript
// Seed example alert rules
window.seedAlertRules()

// Run simulation to test alerts
window.simulate()
```

## 📋 Acceptance Criteria Checklist

### ✅ Device-Authoritative UI
- [x] Switches/widgets reflect reported ESP32 state
- [x] Controls disabled when device offline
- [x] Toggling sends cmd; UI finalizes only after state confirms

### ✅ Alert Rules (GPIO + Sensor/Logic)
- [x] Pin-4 HIGH and tempC>50° rules work with hysteresis/debounce
- [x] Rules support severity + channels[]
- [x] Quiet hours and maintenance windows respected

### ✅ In-App Notifications
- [x] Bell dropdown shows alert history with unread and Ack
- [x] Toasts show on fire (using Sonner)
- [x] Severity-based color coding

### ✅ Browser Notifications
- [x] When permission granted, desktop notification appears for alerts
- [x] Permission request handled gracefully

### ✅ Web Push
- [x] Service worker installed
- [x] "Enable Web Push" subscribes client
- [x] `/api/notify` with channels:['push'] shows push notification even when tab isn't focused

### ✅ Email & External
- [x] `/api/notify` dispatches email via SMTP when channels includes email
- [x] Slack/Discord/Telegram/webhook dispatches work when env vars provided

### ✅ Resilience
- [x] MQTT reconnects
- [x] Alerts debounce
- [x] Quiet hours respected
- [x] No secrets in client bundle; server handles keys & tokens

## 🔧 Configuration

### Environment Variables (server/.env)
```env
# Web Push (VAPID keys)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:alerts@saphari.app

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
ALERT_EMAIL_TO=recipient@example.com

# External Integrations (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=123456:ABCDEF
TELEGRAM_CHAT_ID=123456789

# Server
CLIENT_ORIGIN=http://localhost:5173
PORT=8080
```

### MQTT Topics
- `devices/{deviceId}/status` - Device online/offline
- `devices/{deviceId}/state` - Full device state
- `devices/{deviceId}/event` - Incremental state changes
- `devices/{deviceId}/cmd` - Commands to device
- `devices/{deviceId}/ack` - Command acknowledgments

## 🎮 Testing

### Development Functions
```javascript
// Seed example rules
window.seedAlertRules()

// Test alert engine
window.testAlertEngine()

// Run full simulation
window.simulate()

// Test MQTT flow
window.simulateDeviceFlow()
```

### Example Alert Rules
The system includes two example rules:
1. **Pin4 HIGH**: Triggers when GPIO pin 4 goes HIGH (critical severity)
2. **Temp > 50°C**: Triggers when temperature exceeds 50°C (warning severity, 1°C hysteresis, 10s debounce)

## 🏗️ Architecture

### Frontend
- **DeviceStore**: Single source of truth for device state
- **AlertsStore**: Persistent storage for rules and alert history
- **Alerts Engine**: Evaluates rules and routes notifications
- **MQTT Client**: Connects to broker and updates device state
- **Service Worker**: Handles web push notifications

### Backend
- **Express API**: Handles notifications and subscriptions
- **MQTT Bridge**: Server-side MQTT client for offline notifications
- **Multi-Channel Routing**: Fan-out to web push, email, Slack, Discord, Telegram, webhooks

### Data Flow
```
ESP32 → MQTT Broker → Frontend MQTT Client → DeviceStore → Alerts Engine → Notifications
                    ↓
              Server MQTT Bridge → /api/notify → External Channels
```

## 🔒 Security

- **VAPID Keys**: Secure web push implementation
- **Server-Side Secrets**: All API keys and tokens stored on server
- **CORS Protection**: Limited to configured client origin
- **Input Validation**: Proper validation of MQTT messages and API requests

## 📱 Production Considerations

- **HTTPS Required**: Browser notifications and web push require HTTPS
- **Database Storage**: Move push subscriptions and alert history to database
- **Rate Limiting**: Add server-side cooldowns for spammy alerts
- **User Preferences**: Add per-user alert channel preferences
- **Monitoring**: Add alert delivery monitoring and retry logic

## 🎉 Success!

The SapHari alert system is now fully functional with:
- ✅ Device-authoritative state management
- ✅ Multi-channel notification routing
- ✅ Advanced alert rule evaluation
- ✅ Web push notifications
- ✅ External integrations
- ✅ Comprehensive testing tools

Ready for production deployment! 🚀
