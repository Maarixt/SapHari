import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // MQTT Configuration
  mqtt: {
    url: process.env.MQTT_URL || 'mqtts://broker.emqx.io:8883',
  },

  // Web Push Configuration
  webPush: {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY',
    privateKey: process.env.VAPID_PRIVATE_KEY || 'YOUR_VAPID_PRIVATE_KEY',
    subject: process.env.VAPID_SUBJECT || 'mailto:alerts@saphari.app',
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || 'your@gmail.com',
    pass: process.env.SMTP_PASS || 'your_app_password',
    alertEmailTo: process.env.ALERT_EMAIL_TO || 'recipient@example.com',
  },

  // External Integrations
  integrations: {
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    },
    discord: {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
    },
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '8080'),
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  },
};
