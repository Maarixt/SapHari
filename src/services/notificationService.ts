// Web Push Notification Service
import { supabase } from '../lib/supabase';

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
  created_at: string;
  last_used: string;
  is_active: boolean;
}

export interface NotificationMessage {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  device_id?: string;
  notification_type: 'critical' | 'warning' | 'info' | 'success';
  channels: string[];
  enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

class NotificationService {
  private vapidPublicKey: string | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  // Initialize the notification service
  async initialize(): Promise<void> {
    try {
      // Get VAPID public key
      const { data: config } = await supabase
        .from('app_config')
        .select('vapid_public_key')
        .single();

      this.vapidPublicKey = config?.vapid_public_key || null;

      // Register service worker
      if ('serviceWorker' in navigator) {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', this.serviceWorkerRegistration);
      }

      // Request notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      }
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  // Subscribe to push notifications
  async subscribeToPush(): Promise<PushSubscription | null> {
    try {
      if (!this.serviceWorkerRegistration) {
        throw new Error('Service Worker not registered');
      }

      // Get push subscription
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey || '')
      });

      // Convert subscription to our format
      const pushData = {
        endpoint: subscription.endpoint,
        p256dh_key: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth_key: this.arrayBufferToBase64(subscription.getKey('auth')!),
        user_agent: navigator.userAgent
      };

      // Save subscription to database
      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert({
          endpoint: pushData.endpoint,
          p256dh_key: pushData.p256dh_key,
          auth_key: pushData.auth_key,
          user_agent: pushData.user_agent,
          is_active: true,
          last_used: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save push subscription: ${error.message}`);
      }

      console.log('Push subscription saved:', data);
      return data;

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        return false;
      }

      // Get current subscription
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (!subscription) {
        return true; // Already unsubscribed
      }

      // Unsubscribe from push service
      const success = await subscription.unsubscribe();
      if (!success) {
        throw new Error('Failed to unsubscribe from push service');
      }

      // Mark subscription as inactive in database
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('endpoint', subscription.endpoint);

      if (error) {
        console.error('Failed to update subscription status:', error);
      }

      console.log('Push subscription removed');
      return true;

    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Send local notification
  async sendLocalNotification(message: NotificationMessage): Promise<void> {
    try {
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported');
      }

      if (Notification.permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      const notification = new Notification(message.title, {
        body: message.body,
        icon: message.icon || '/logo.png',
        badge: message.badge || '/badge.png',
        image: message.image,
        data: message.data,
        requireInteraction: message.requireInteraction,
        silent: message.silent,
        tag: message.tag
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        if (message.url) {
          window.open(message.url, '_blank');
        }
        notification.close();
      };

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!message.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  // Send push notification to user
  async sendPushNotification(
    userId: string,
    message: NotificationMessage,
    deviceId?: string
  ): Promise<boolean> {
    try {
      // Check if user should receive notification
      const shouldSend = await this.shouldSendNotification(userId, 'info', deviceId);
      if (!shouldSend) {
        console.log('Notification skipped due to preferences or quiet hours');
        return false;
      }

      // Get user's push subscriptions
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to get push subscriptions: ${error.message}`);
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No active push subscriptions found for user');
        return false;
      }

      // Send to all active subscriptions
      const results = await Promise.allSettled(
        subscriptions.map(subscription => 
          this.sendToSubscription(subscription, message)
        )
      );

      const successCount = results.filter(result => result.status === 'fulfilled').length;
      console.log(`Push notification sent to ${successCount}/${subscriptions.length} subscriptions`);

      // Log notification
      await this.logNotification({
        userId,
        deviceId,
        type: 'info',
        channel: 'push',
        title: message.title,
        message: message.body,
        success: successCount > 0
      });

      return successCount > 0;

    } catch (error) {
      console.error('Failed to send push notification:', error);
      
      // Log failed notification
      await this.logNotification({
        userId,
        deviceId,
        type: 'info',
        channel: 'push',
        title: message.title,
        message: message.body,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return false;
    }
  }

  // Send notification to specific subscription
  private async sendToSubscription(subscription: PushSubscription, message: NotificationMessage): Promise<void> {
    try {
      // This would typically call your backend API to send the push notification
      // For now, we'll simulate it
      console.log('Sending push notification to subscription:', subscription.id);
      
      // Update last used timestamp
      await supabase
        .from('push_subscriptions')
        .update({ last_used: new Date().toISOString() })
        .eq('id', subscription.id);

    } catch (error) {
      console.error('Failed to send to subscription:', error);
      throw error;
    }
  }

  // Check if notification should be sent
  private async shouldSendNotification(
    userId: string,
    notificationType: string,
    deviceId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('should_send_notification', {
          user_id_param: userId,
          notification_type_param: notificationType,
          device_id_param: deviceId || null
        });

      if (error) {
        console.error('Failed to check notification preferences:', error);
        return true; // Default to sending if check fails
      }

      return data || false;

    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // Default to sending if check fails
    }
  }

  // Log notification
  private async logNotification(params: {
    userId: string;
    deviceId?: string;
    type: string;
    channel: string;
    title: string;
    message: string;
    success: boolean;
    error?: string;
  }): Promise<void> {
    try {
      await supabase.rpc('log_notification', {
        user_id_param: params.userId,
        device_id_param: params.deviceId || null,
        rule_id_param: null,
        notification_type_param: params.type,
        channel_param: params.channel,
        title_param: params.title,
        message_param: params.message,
        success_param: params.success,
        error_message_param: params.error || null
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  // Get notification preferences
  async getNotificationPreferences(userId?: string, deviceId?: string): Promise<NotificationPreferences[]> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .eq(deviceId ? 'device_id' : 'device_id', deviceId || null)
      .order('notification_type');

    if (error) {
      throw new Error(`Failed to get notification preferences: ${error.message}`);
    }

    return data || [];
  }

  // Update notification preferences
  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(preferences)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update notification preferences: ${error.message}`);
    }

    return data;
  }

  // Get push subscriptions for user
  async getUserPushSubscriptions(userId?: string): Promise<PushSubscription[]> {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId || (await supabase.auth.getUser()).data.user?.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get push subscriptions: ${error.message}`);
    }

    return data || [];
  }

  // Test notification
  async testNotification(message?: NotificationMessage): Promise<void> {
    const testMessage: NotificationMessage = {
      title: 'SapHari Test',
      body: 'This is a test notification from SapHari',
      icon: '/logo.png',
      url: '/dashboard',
      ...message
    };

    await this.sendLocalNotification(testMessage);
  }

  // Utility methods
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

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Get notification permission status
  getPermissionStatus(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'denied';
  }

  // Check if user is subscribed to push notifications
  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        return false;
      }

      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
