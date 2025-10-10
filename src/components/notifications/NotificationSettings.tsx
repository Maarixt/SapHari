import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Bell, Smartphone, Mail, MessageSquare, Webhook, TestTube } from 'lucide-react';
import { webPushService } from '@/services/webPushService';
import { PushToggle } from '@/components/PushToggle';
import { toast } from 'sonner';

interface NotificationSettings {
  inApp: boolean;
  browser: boolean;
  webPush: boolean;
  email: boolean;
  slack: boolean;
  discord: boolean;
  telegram: boolean;
  webhook: boolean;
  webhookUrl: string;
  emailAddress: string;
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    inApp: true,
    browser: true,
    webPush: false,
    email: false,
    slack: false,
    discord: false,
    telegram: false,
    webhook: false,
    webhookUrl: '',
    emailAddress: '',
  });

  const [webPushSubscribed, setWebPushSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check web push subscription status
    webPushService.isSubscribed().then(setWebPushSubscribed);
  }, []);

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleWebPushToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      if (enabled) {
        await webPushService.subscribe();
        setWebPushSubscribed(true);
      } else {
        await webPushService.unsubscribe();
        setWebPushSubscribed(false);
      }
      handleSettingChange('webPush', enabled);
    } catch (error) {
      console.error('Web push toggle failed:', error);
      toast.error('Failed to toggle web push notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleBrowserNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          handleSettingChange('browser', true);
          toast.success('Browser notifications enabled');
        } else {
          toast.error('Browser notifications blocked');
        }
      } else {
        toast.error('Browser does not support notifications');
      }
    } else {
      handleSettingChange('browser', false);
    }
  };

  const testNotification = async (type: string) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/alerts/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          message: `Test ${type} notification from SapHari`,
        }),
      });

      if (response.ok) {
        toast.success(`Test ${type} notification sent!`);
      } else {
        toast.error(`Failed to send test ${type} notification`);
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      toast.error(`Failed to send test ${type} notification`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* In-App Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="inApp">In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in the app interface
              </p>
            </div>
            <Switch
              id="inApp"
              checked={settings.inApp}
              onCheckedChange={(checked) => handleSettingChange('inApp', checked)}
            />
          </div>

          <Separator />

          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="browser">Browser Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show native browser notifications when tab is open
              </p>
            </div>
            <Switch
              id="browser"
              checked={settings.browser}
              onCheckedChange={handleBrowserNotificationToggle}
            />
          </div>

          <Separator />

          {/* Web Push Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="webPush">Web Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications even when the app is closed
                </p>
                {webPushSubscribed && (
                  <p className="text-xs text-green-600">✓ Subscribed</p>
                )}
              </div>
              <Switch
                id="webPush"
                checked={settings.webPush}
                onCheckedChange={handleWebPushToggle}
                disabled={loading}
              />
            </div>
            <div className="flex justify-center">
              <PushToggle />
            </div>
          </div>

          <Separator />

          {/* Email Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts via email
                </p>
              </div>
              <Switch
                id="email"
                checked={settings.email}
                onCheckedChange={(checked) => handleSettingChange('email', checked)}
              />
            </div>
            {settings.email && (
              <div className="space-y-2">
                <Label htmlFor="emailAddress">Email Address</Label>
                <Input
                  id="emailAddress"
                  type="email"
                  placeholder="your@email.com"
                  value={settings.emailAddress}
                  onChange={(e) => handleSettingChange('emailAddress', e.target.value)}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* External Integrations */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">External Integrations</h3>
            
            {/* Slack */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="slack">Slack</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts to Slack channel
                </p>
              </div>
              <Switch
                id="slack"
                checked={settings.slack}
                onCheckedChange={(checked) => handleSettingChange('slack', checked)}
              />
            </div>

            {/* Discord */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="discord">Discord</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts to Discord channel
                </p>
              </div>
              <Switch
                id="discord"
                checked={settings.discord}
                onCheckedChange={(checked) => handleSettingChange('discord', checked)}
              />
            </div>

            {/* Telegram */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="telegram">Telegram</Label>
                <p className="text-sm text-muted-foreground">
                  Send alerts to Telegram chat
                </p>
              </div>
              <Switch
                id="telegram"
                checked={settings.telegram}
                onCheckedChange={(checked) => handleSettingChange('telegram', checked)}
              />
            </div>

            {/* Webhook */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="webhook">Custom Webhook</Label>
                  <p className="text-sm text-muted-foreground">
                    Send alerts to custom webhook URL
                  </p>
                </div>
                <Switch
                  id="webhook"
                  checked={settings.webhook}
                  onCheckedChange={(checked) => handleSettingChange('webhook', checked)}
                />
              </div>
              {settings.webhook && (
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    type="url"
                    placeholder="https://your-webhook-url.com/alerts"
                    value={settings.webhookUrl}
                    onChange={(e) => handleSettingChange('webhookUrl', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Test Notifications */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Test Notifications</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testNotification('web-push')}
                disabled={loading}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Web Push
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testNotification('email')}
                disabled={loading}
              >
                <Mail className="h-4 w-4 mr-2" />
                Test Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testNotification('slack')}
                disabled={loading}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Test Slack
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testNotification('discord')}
                disabled={loading}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Test Discord
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testNotification('telegram')}
                disabled={loading}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Test Telegram
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
