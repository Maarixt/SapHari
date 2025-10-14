const fs = require('fs');
const path = require('path');

const envContent = `# Master Account Credentials
MASTER_EMAIL=omarifrancis846@gmail.com
MASTER_PASS=your-dev-password

# Web Push (VAPID keys) — generate with: npm run generate-vapid
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
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
PORT=3001
`;

const envPath = path.join(__dirname, '.env');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('📝 Please update MASTER_PASS with your actual password');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
}



