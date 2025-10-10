import { toast } from 'sonner';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class WebPushService {
  private serverUrl = 'http://localhost:8080'; // Server URL
  private publicKey: string | null = null;

  async initialize() {
    try {
      // Get public key from server
      const response = await fetch(`${this.serverUrl}/api/alerts/web-push/public-key`);
      const data = await response.json();
      
      if (data.success) {
        this.publicKey = data.publicKey;
        console.log('✅ Web Push public key loaded');
      }
    } catch (error) {
      console.error('❌ Failed to load web push public key:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      toast.error('Notifications are blocked. Please enable them in your browser settings.');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribe(): Promise<PushSubscription | null> {
    if (!this.publicKey) {
      await this.initialize();
    }

    if (!this.publicKey) {
      toast.error('Web Push not available');
      return null;
    }

    const permission = await this.requestPermission();
    if (!permission) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.publicKey),
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      toast.success('Web Push notifications enabled!');
      return subscription;
    } catch (error) {
      console.error('❌ Failed to subscribe to web push:', error);
      toast.error('Failed to enable web push notifications');
      return null;
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await this.removeSubscriptionFromServer(subscription);
        toast.success('Web Push notifications disabled');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to unsubscribe from web push:', error);
      toast.error('Failed to disable web push notifications');
      return false;
    }
  }

  async isSubscribed(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('❌ Failed to check subscription status:', error);
      return false;
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription) {
    try {
      const response = await fetch(`${this.serverUrl}/api/alerts/web-push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }
    } catch (error) {
      console.error('❌ Failed to send subscription to server:', error);
      throw error;
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription) {
    try {
      const response = await fetch(`${this.serverUrl}/api/alerts/web-push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }
    } catch (error) {
      console.error('❌ Failed to remove subscription from server:', error);
      throw error;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const webPushService = new WebPushService();
