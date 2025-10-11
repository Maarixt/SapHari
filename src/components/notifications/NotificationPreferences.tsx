// Notification Preferences Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Clock,
  Save,
  TestTube,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationService, NotificationPreferences } from '@/services/notificationService';
import { Device } from '@/lib/types';

interface NotificationPreferencesProps {
  devices: Device[];
}

export function NotificationPreferencesComponent({ devices }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const prefs = await notificationService.getNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      for (const pref of preferences) {
        await notificationService.updateNotificationPreferences(pref);
      }
      toast.success('Notification preferences saved successfully');
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async () => {
    setTesting(true);
    try {
      await notificationService.testNotification({
        title: 'Test Notification',
        body: 'This is a test notification from SapHari',
        icon: '/logo.png'
      });
      toast.success('Test notification sent');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  const updatePreference = (index: number, updates: Partial<NotificationPreferences>) => {
    const updatedPreferences = [...preferences];
    updatedPreferences[index] = { ...updatedPreferences[index], ...updates };
    setPreferences(updatedPreferences);
  };

  const addPreference = (deviceId?: string, notificationType: string = 'info') => {
    const newPreference: NotificationPreferences = {
      id: '', // Will be set by the server
      user_id: '', // Will be set by the server
      device_id: deviceId,
      notification_type: notificationType as any,
      channels: ['email'],
      enabled: true,
      quiet_hours_start: '22:00:00',
      quiet_hours_end: '08:00:00',
      timezone: 'UTC'
    };
    setPreferences([...preferences, newPreference]);
  };

  const removePreference = (index: number) => {
    setPreferences(preferences.filter((_, i) => i !== index));
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '🟡';
      case 'info':
        return '🔵';
      case 'success':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'push':
        return <Smartphone className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'slack':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getDeviceName = (deviceId?: string) => {
    if (!deviceId) return 'All Devices';
    const device = devices.find(d => d.device_id === deviceId);
    return device ? `${device.name} (${device.device_id})` : deviceId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-muted-foreground">
            Configure how and when you receive notifications
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={testNotification} disabled={testing}>
            <TestTube className="h-4 w-4 mr-2" />
            {testing ? 'Testing...' : 'Test Notification'}
          </Button>
          <Button onClick={savePreferences} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>

      {/* Push Notification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Push Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Web Push Notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive real-time notifications in your browser
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {notificationService.isSupported() ? (
                <Badge variant="default">Supported</Badge>
              ) : (
                <Badge variant="secondary">Not Supported</Badge>
              )}
              <Button variant="outline" size="sm">
                {notificationService.getPermissionStatus() === 'granted' ? 'Enabled' : 'Enable'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Notification Rules</CardTitle>
            <Button variant="outline" size="sm" onClick={() => addPreference()}>
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <Settings className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading preferences...
            </div>
          ) : preferences.length === 0 ? (
            <div className="text-center py-8">
              <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No notification rules</h3>
              <p className="text-muted-foreground mb-4">
                Create notification rules to receive alerts for your devices
              </p>
              <Button onClick={() => addPreference()}>
                Create First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {preferences.map((pref, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getNotificationTypeIcon(pref.notification_type)}</span>
                      <div>
                        <div className="font-medium">{getDeviceName(pref.device_id)}</div>
                        <Badge className={getNotificationTypeColor(pref.notification_type)}>
                          {pref.notification_type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={pref.enabled}
                        onCheckedChange={(checked) => updatePreference(index, { enabled: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePreference(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Channels */}
                    <div>
                      <Label className="text-sm font-medium">Notification Channels</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['email', 'push', 'sms', 'slack'].map((channel) => (
                          <div
                            key={channel}
                            className={`flex items-center space-x-2 px-3 py-1 rounded-full border cursor-pointer ${
                              pref.channels.includes(channel)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border hover:bg-muted'
                            }`}
                            onClick={() => {
                              const channels = pref.channels.includes(channel)
                                ? pref.channels.filter(c => c !== channel)
                                : [...pref.channels, channel];
                              updatePreference(index, { channels });
                            }}
                          >
                            {getChannelIcon(channel)}
                            <span className="text-sm capitalize">{channel}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quiet Hours */}
                    <div>
                      <Label className="text-sm font-medium">Quiet Hours</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          type="time"
                          value={pref.quiet_hours_start}
                          onChange={(e) => updatePreference(index, { quiet_hours_start: e.target.value })}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={pref.quiet_hours_end}
                          onChange={(e) => updatePreference(index, { quiet_hours_end: e.target.value })}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timezone */}
                  <div className="mt-4">
                    <Label className="text-sm font-medium">Timezone</Label>
                    <Select
                      value={pref.timezone}
                      onValueChange={(value) => updatePreference(index, { timezone: value })}
                    >
                      <SelectTrigger className="w-48 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                        <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => addPreference(undefined, 'critical')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <span className="text-2xl">🔴</span>
              <span className="text-sm">Add Critical Alert</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => addPreference(undefined, 'warning')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <span className="text-2xl">🟡</span>
              <span className="text-sm">Add Warning Alert</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => addPreference(undefined, 'info')}
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <span className="text-2xl">🔵</span>
              <span className="text-sm">Add Info Alert</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
