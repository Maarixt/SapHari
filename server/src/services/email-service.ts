import nodemailer from 'nodemailer';
import { config } from '../config';
import { AlertEntry } from './alert-service';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    if (config.email.user && config.email.pass) {
      this.transporter = nodemailer.createTransporter({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email service setup failed:', error);
        } else {
          console.log('✅ Email service ready');
        }
      });
    } else {
      console.log('⚠️ Email service not configured (missing SMTP credentials)');
    }
  }

  async sendAlertEmail(alert: AlertEntry) {
    if (!this.transporter) {
      console.log('⚠️ Email service not available');
      return;
    }

    const subject = `🚨 SapHari Alert: ${alert.ruleName}`;
    const html = this.generateAlertEmailHTML(alert);
    const text = this.generateAlertEmailText(alert);

    try {
      await this.transporter.sendMail({
        from: config.email.user,
        to: config.email.alertEmailTo,
        subject,
        text,
        html,
      });

      console.log('✅ Alert email sent successfully');
    } catch (error) {
      console.error('❌ Failed to send alert email:', error);
    }
  }

  private generateAlertEmailHTML(alert: AlertEntry): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>SapHari Alert</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .alert-details { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #6b7280; }
            .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 SapHari Alert</h1>
            </div>
            <div class="content">
              <h2>${alert.ruleName}</h2>
              <div class="alert-details">
                <div class="detail-row">
                  <span class="label">Device ID:</span>
                  <span class="value">${alert.deviceId}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Value:</span>
                  <span class="value">${alert.value}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Timestamp:</span>
                  <span class="value">${new Date(alert.ts).toLocaleString()}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Alert ID:</span>
                  <span class="value">${alert.id}</span>
                </div>
              </div>
              <p>This alert was triggered by your SapHari device monitoring system.</p>
            </div>
            <div class="footer">
              <p>SapHari IoT Dashboard - Automated Alert System</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateAlertEmailText(alert: AlertEntry): string {
    return `
SapHari Alert: ${alert.ruleName}

Device ID: ${alert.deviceId}
Value: ${alert.value}
Timestamp: ${new Date(alert.ts).toLocaleString()}
Alert ID: ${alert.id}

This alert was triggered by your SapHari device monitoring system.

---
SapHari IoT Dashboard - Automated Alert System
    `.trim();
  }
}

export const EmailService = new EmailService();
