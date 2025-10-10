# SapHari Alerts Server Setup

## 1. Environment Configuration

Create a `.env` file in the server directory with the following variables:

```env
# Web Push (VAPID keys) — generate with: npm run generate-vapid
VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY=YOUR_VAPID_PRIVATE_KEY
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

## 2. Generate VAPID Keys

```bash
cd server
npm run generate-vapid
```

Copy the generated keys to your `.env` file.

## 3. Start the Server

```bash
cd server
npm run dev
```

## 4. Start the Frontend

```bash
npm run dev
```

The frontend will proxy `/api/*` requests to the backend server.

## 5. Test Web Push

1. Open the app in your browser
2. Go to Alert Rules > Notifications
3. Click "Enable Web Push" button
4. Allow notifications when prompted
5. Test with alert rules that include 'push' in their channels
