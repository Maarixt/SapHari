# SapHari Alerts & Notifications Server

This server handles live alerts and notifications for the SapHari IoT dashboard, including web push notifications, email alerts, and external integrations.

## Features

- **Web Push Notifications**: Send notifications even when the app is closed
- **Email Alerts**: Send alerts via SMTP
- **External Integrations**: Slack, Discord, Telegram, and custom webhooks
- **MQTT Bridge**: Connects to MQTT broker to receive device state changes
- **Real-time Processing**: Processes alerts based on ESP32-reported state

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Generate VAPID Keys

```bash
node scripts/generate-vapid.js
```

Copy the generated keys to your `.env` file.

### 3. Configure Environment

Create a `.env` file in the server directory:

```env
# MQTT Configuration
MQTT_URL=mqtts://broker.emqx.io:8883

# Web Push (VAPID keys)
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:alerts@saphari.app

# Email Configuration (optional)
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

# Server Configuration
CLIENT_ORIGIN=http://localhost:5173
PORT=8080
```

### 4. Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Alert Rules
- `GET /api/alerts/rules` - Get all alert rules
- `POST /api/alerts/rules` - Add new alert rule
- `PUT /api/alerts/rules/:id` - Update alert rule
- `DELETE /api/alerts/rules/:id` - Delete alert rule

### Web Push
- `GET /api/alerts/web-push/public-key` - Get VAPID public key
- `POST /api/alerts/web-push/subscribe` - Subscribe to web push
- `POST /api/alerts/web-push/unsubscribe` - Unsubscribe from web push

### Testing
- `POST /api/alerts/test` - Send test notification

## MQTT Topics

The server subscribes to the following MQTT topics:
- `devices/+/status` - Device online/offline status
- `devices/+/state` - Device state updates
- `devices/+/event` - Device events

## External Integrations

### Slack
1. Create a Slack app and get webhook URL
2. Add webhook URL to `.env` file
3. Enable Slack notifications in the UI

### Discord
1. Create a Discord webhook in your server
2. Add webhook URL to `.env` file
3. Enable Discord notifications in the UI

### Telegram
1. Create a Telegram bot with @BotFather
2. Get bot token and chat ID
3. Add to `.env` file
4. Enable Telegram notifications in the UI

### Email
1. Configure SMTP settings in `.env` file
2. For Gmail, use an App Password
3. Enable email notifications in the UI

## Development

The server is built with:
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MQTT.js** - MQTT client
- **Web Push** - Push notifications
- **Nodemailer** - Email sending
- **Node-fetch** - HTTP requests

## Production Deployment

1. Set up environment variables
2. Build the application: `npm run build`
3. Start the server: `npm start`
4. Use a process manager like PM2 for production
5. Set up reverse proxy with Nginx
6. Configure SSL/TLS certificates
