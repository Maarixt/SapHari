import fetch from 'node-fetch';
import { config } from '../config';
import { AlertEntry } from './alert-service';

class IntegrationService {
  async sendToSlack(alert: AlertEntry) {
    if (!config.integrations.slack.webhookUrl) {
      console.log('⚠️ Slack webhook not configured');
      return;
    }

    const payload = {
      text: `🚨 SapHari Alert: ${alert.ruleName}`,
      attachments: [
        {
          color: 'danger',
          fields: [
            {
              title: 'Device ID',
              value: alert.deviceId,
              short: true,
            },
            {
              title: 'Value',
              value: String(alert.value),
              short: true,
            },
            {
              title: 'Timestamp',
              value: new Date(alert.ts).toLocaleString(),
              short: true,
            },
            {
              title: 'Alert ID',
              value: alert.id,
              short: true,
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(config.integrations.slack.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('✅ Slack notification sent');
      } else {
        console.error('❌ Slack notification failed:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Slack notification error:', error);
    }
  }

  async sendToDiscord(alert: AlertEntry) {
    if (!config.integrations.discord.webhookUrl) {
      console.log('⚠️ Discord webhook not configured');
      return;
    }

    const payload = {
      embeds: [
        {
          title: `🚨 SapHari Alert: ${alert.ruleName}`,
          color: 0xff0000, // Red color
          fields: [
            {
              name: 'Device ID',
              value: alert.deviceId,
              inline: true,
            },
            {
              name: 'Value',
              value: String(alert.value),
              inline: true,
            },
            {
              name: 'Timestamp',
              value: new Date(alert.ts).toLocaleString(),
              inline: true,
            },
            {
              name: 'Alert ID',
              value: alert.id,
              inline: false,
            },
          ],
          timestamp: new Date(alert.ts).toISOString(),
          footer: {
            text: 'SapHari IoT Dashboard',
          },
        },
      ],
    };

    try {
      const response = await fetch(config.integrations.discord.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('✅ Discord notification sent');
      } else {
        console.error('❌ Discord notification failed:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Discord notification error:', error);
    }
  }

  async sendToTelegram(alert: AlertEntry) {
    if (!config.integrations.telegram.botToken || !config.integrations.telegram.chatId) {
      console.log('⚠️ Telegram bot not configured');
      return;
    }

    const message = `🚨 *SapHari Alert: ${alert.ruleName}*

*Device ID:* ${alert.deviceId}
*Value:* ${alert.value}
*Timestamp:* ${new Date(alert.ts).toLocaleString()}
*Alert ID:* ${alert.id}`;

    const url = `https://api.telegram.org/bot${config.integrations.telegram.botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: config.integrations.telegram.chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      const result = await response.json() as any;

      if (result.ok) {
        console.log('✅ Telegram notification sent');
      } else {
        console.error('❌ Telegram notification failed:', result.description);
      }
    } catch (error) {
      console.error('❌ Telegram notification error:', error);
    }
  }

  async sendToWebhook(alert: AlertEntry, webhookUrl: string) {
    const payload = {
      alert: {
        id: alert.id,
        ruleId: alert.ruleId,
        ruleName: alert.ruleName,
        deviceId: alert.deviceId,
        value: alert.value,
        timestamp: alert.ts,
        seen: alert.seen,
        ack: alert.ack,
      },
      metadata: {
        source: 'saphari',
        version: '1.0.0',
        timestamp: Date.now(),
      },
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SapHari-Alerts/1.0.0',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('✅ Webhook notification sent');
      } else {
        console.error('❌ Webhook notification failed:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Webhook notification error:', error);
    }
  }
}

export const IntegrationService = new IntegrationService();
