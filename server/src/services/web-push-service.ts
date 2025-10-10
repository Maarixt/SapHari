import webpush from 'web-push';
import { config } from '../config';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

class WebPushService {
  private subscriptions: PushSubscription[] = [];

  constructor() {
    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      config.webPush.subject,
      config.webPush.publicKey,
      config.webPush.privateKey
    );
  }

  async sendNotification(payload: NotificationPayload) {
    console.log('📱 Sending web push notification:', payload.title);
    
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      data: payload.data,
      timestamp: Date.now(),
    });

    const promises = this.subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, notificationPayload);
        console.log('✅ Web push sent successfully');
      } catch (error) {
        console.error('❌ Web push failed:', error);
        
        // Remove invalid subscriptions
        if (error instanceof Error && error.message.includes('410')) {
          this.removeSubscription(subscription);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  addSubscription(subscription: PushSubscription) {
    // Check if subscription already exists
    const exists = this.subscriptions.some(sub => 
      sub.endpoint === subscription.endpoint
    );
    
    if (!exists) {
      this.subscriptions.push(subscription);
      console.log('➕ Added web push subscription');
    }
  }

  removeSubscription(subscription: PushSubscription) {
    this.subscriptions = this.subscriptions.filter(sub => 
      sub.endpoint !== subscription.endpoint
    );
    console.log('➖ Removed web push subscription');
  }

  getSubscriptionCount(): number {
    return this.subscriptions.length;
  }

  getPublicKey(): string {
    return config.webPush.publicKey;
  }
}

export const WebPushService = new WebPushService();
