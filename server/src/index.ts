import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import { startMqttBridge } from './mqttBridge';

const app = express();
app.use(express.json({ limit:'1mb' }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));

// ---- In-memory subscriptions (store in DB in prod)
const subs: any[] = [];

// ---- Web Push setup
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ---- Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, 
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE||'true')==='true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// ---- Routes
app.get('/api/vapid', (_, res) => res.json({ publicKey: VAPID_PUBLIC_KEY }));

app.post('/api/subscribe', (req, res) => {
  const sub = req.body; // PushSubscription
  subs.push(sub);
  console.log('📱 Web push subscription added');
  res.sendStatus(201);
});

app.post('/api/notify', async (req, res) => {
  const { deviceId, name, value, severity, channels } = req.body as {
    deviceId: string, name: string, value: any, severity?: string, channels: string[]
  };

  const title = `🚨 ${name}`;
  const body = `${deviceId} • ${String(value)} • ${new Date().toLocaleString()}`;

  const tasks: Promise<any>[] = [];

  if (channels.includes('push')) {
    for (const s of subs) {
      tasks.push(webpush.sendNotification(s, JSON.stringify({ title, body })).catch(()=>{}));
    }
  }

  if (channels.includes('email') && process.env.ALERT_EMAIL_TO) {
    tasks.push(transporter.sendMail({
      from: `"SapHari Alerts" <${process.env.SMTP_USER}>`,
      to: process.env.ALERT_EMAIL_TO,
      subject: `[${severity||'warning'}] ${title}`,
      text: body
    }).catch(()=>{}));
  }

  if (channels.includes('slack') && process.env.SLACK_WEBHOOK_URL) {
    tasks.push(fetch(process.env.SLACK_WEBHOOK_URL, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text: `*${title}*\n${body}` })
    }).catch(()=>{}));
  }

  if (channels.includes('discord') && process.env.DISCORD_WEBHOOK_URL) {
    tasks.push(fetch(process.env.DISCORD_WEBHOOK_URL, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ content: `**${title}**\n${body}` })
    }).catch(()=>{}));
  }

  if (channels.includes('telegram') && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage` +
      `?chat_id=${process.env.TELEGRAM_CHAT_ID}&text=${encodeURIComponent(`${title}\n${body}`)}`;
    tasks.push(fetch(url).catch(()=>{}));
  }

  if (channels.includes('webhook') && req.body.webhookUrl) {
    tasks.push(fetch(req.body.webhookUrl, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ deviceId, name, value, severity, ts: Date.now() })
    }).catch(()=>{}));
  }

  await Promise.all(tasks);
  res.json({ ok: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`🚀 SapHari Alerts Server running on port ${port}`);
  startMqttBridge();
});
