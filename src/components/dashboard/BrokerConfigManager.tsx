import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, Wifi, Server, Shield } from 'lucide-react';
import { usePlatformBroker, BrokerHealthResult } from '@/hooks/usePlatformBroker';
import { cn } from '@/lib/utils';

export function BrokerConfigManager() {
  const { 
    config, 
    platformConfigs, 
    loading, 
    healthResult, 
    testing,
    updatePlatformConfig,
    saveUserBrokerSettings,
    testBrokerHealth 
  } = usePlatformBroker();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    wss_url: '',
    tcp_host: '',
    tcp_port: 1883,
    tls_port: 8883,
    wss_port: 8084,
    use_tls: true,
    username: '',
    password: ''
  });
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    if (config) {
      setFormData({
        wss_url: config.wss_url,
        tcp_host: config.tcp_host,
        tcp_port: config.tcp_port,
        tls_port: config.tls_port,
        wss_port: config.wss_port,
        use_tls: config.use_tls,
        username: config.username || '',
        password: config.password || ''
      });
    }
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveUserBrokerSettings({
        url: formData.wss_url,
        username: formData.username || undefined,
        password: formData.password || undefined,
        port: formData.wss_port,
        use_tls: formData.use_tls
      });
      setEditMode(false);
    } catch (error) {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleTest = () => {
    testBrokerHealth(editMode ? formData.wss_url : undefined);
  };

  const renderHealthStatus = (result: BrokerHealthResult) => (
    <div className="space-y-2 mt-4 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        {result.dns.success ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm">DNS Resolution</span>
        {result.dns.ip && (
          <Badge variant="outline" className="text-xs">{result.dns.ip}</Badge>
        )}
        {result.dns.error && (
          <span className="text-xs text-destructive">{result.dns.error}</span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {result.websocket.success ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm">WebSocket Connection</span>
        {result.websocket.latency && (
          <Badge variant="outline" className="text-xs">{result.websocket.latency}ms</Badge>
        )}
        {result.websocket.error && (
          <span className="text-xs text-destructive">{result.websocket.error}</span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {result.mqtt.success ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm">MQTT Protocol</span>
        {result.mqtt.error && (
          <span className="text-xs text-destructive">{result.mqtt.error}</span>
        )}
      </div>
      
      <div className={cn(
        "flex items-center gap-2 pt-2 border-t mt-2",
        result.overall ? "text-green-600" : "text-destructive"
      )}>
        {result.overall ? (
          <>
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Broker is healthy and reachable</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Broker connection issues detected</span>
          </>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              MQTT Broker Configuration
            </CardTitle>
            <CardDescription>
              Configure how your devices and dashboard connect to the MQTT broker
            </CardDescription>
          </div>
          {config && (
            <Badge variant={config.source === 'platform' ? 'default' : 'secondary'}>
              {config.source === 'platform' ? 'Platform Default' : 
               config.source === 'organization' ? 'Organization' : 'Custom'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editMode ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">WebSocket URL</Label>
                <p className="font-mono text-sm">{config?.wss_url || 'Not configured'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">TCP Host</Label>
                <p className="font-mono text-sm">{config?.tcp_host || 'Not configured'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">TCP Port</Label>
                <p className="font-mono text-sm">{config?.tcp_port || 1883}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">TLS Enabled</Label>
                <p className="text-sm">{config?.use_tls ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleEdit}>
                Customize Settings
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="wss_url">WebSocket URL</Label>
                <Input
                  id="wss_url"
                  value={formData.wss_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, wss_url: e.target.value }))}
                  placeholder="wss://broker.example.com:8084/mqtt"
                />
                <p className="text-xs text-muted-foreground">
                  Full WebSocket URL for browser connections
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tcp_host">TCP Host (for ESP32)</Label>
                  <Input
                    id="tcp_host"
                    value={formData.tcp_host}
                    onChange={(e) => setFormData(prev => ({ ...prev, tcp_host: e.target.value }))}
                    placeholder="broker.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tcp_port">TCP Port</Label>
                  <Input
                    id="tcp_port"
                    type="number"
                    value={formData.tcp_port}
                    onChange={(e) => setFormData(prev => ({ ...prev, tcp_port: parseInt(e.target.value) || 1883 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username (optional)</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password (optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.use_tls}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_tls: checked }))}
                />
                <Label className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Use TLS/SSL
                </Label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save & Reconnect'
                )}
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test URL'
                )}
              </Button>
            </div>
          </>
        )}

        {healthResult && renderHealthStatus(healthResult)}
      </CardContent>
    </Card>
  );
}
