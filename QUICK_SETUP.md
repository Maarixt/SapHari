# Quick Setup Guide - Master Login Fix

## Issues Fixed ✅
1. **TypeScript syntax error** - Fixed generic function syntax in `useMasterAccount.tsx`
2. **Frontend fetch functions** - Already properly implemented with robust JSON parsing
3. **Backend routes** - Already properly implemented in `server/src/index.ts`
4. **Vite proxy** - Already correctly configured to point to port 3001

## What You Need To Do

### 1. Create Backend .env File
Create a file called `.env` in the `server` directory with this content:

```env
# Master Account Credentials
MASTER_EMAIL=omarifrancis846@gmail.com
MASTER_PASS=your-actual-password

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
```

**Important**: Replace `your-actual-password` with your real master password.

### 2. Start the Backend Server
Open a new terminal and run:
```bash
cd server
npm run dev
```

### 3. Start the Frontend
In another terminal, run:
```bash
npm run dev
```

## Test the Login
1. Go to `http://localhost:5173/master-login`
2. Use email: `omarifrancis846@gmail.com`
3. Use the password you set in the .env file
4. Click "Access Master Panel"

## What Was Fixed
- **500 errors**: Backend server wasn't running
- **JSON parse errors**: Frontend now handles empty responses gracefully
- **TypeScript errors**: Fixed generic function syntax
- **Cookie flow**: Backend properly sets httpOnly cookies, frontend includes credentials

The master login should now work properly!



