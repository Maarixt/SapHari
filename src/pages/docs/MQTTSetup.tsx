import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Server, Lock, Wifi, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// Production broker configuration - AUTHORITATIVE SOURCE
const PRODUCTION_BROKER = {
  host: 'z110b082.ala.us-east-1.emqxsl.com',
  tls_port: 8883,
  wss_port: 8084,
  wss_path: '/mqtt',
} as const;

export default function MQTTSetup() {
  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MQTT Connection Guide</h1>
        <p className="text-muted-foreground mt-2">
          How SapHari devices connect to the platform and why the configuration is locked
        </p>
      </div>

      {/* Security Warning */}
      <Alert variant="destructive" className="border-destructive/50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Platform Configuration - Do Not Modify</AlertTitle>
        <AlertDescription>
          The broker configuration is managed at the platform level. Changing these values will break device connectivity.
          Contact your administrator if you need custom broker settings.
        </AlertDescription>
      </Alert>

      {/* Production Broker Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Production Broker Configuration
          </CardTitle>
          <CardDescription>
            All SapHari devices connect to this EMQX Cloud broker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 font-mono text-sm">
            <div>
              <span className="text-muted-foreground">Host:</span>
              <p className="font-medium">{PRODUCTION_BROKER.host}</p>
            </div>
            <div>
              <span className="text-muted-foreground">TLS Port (ESP32):</span>
              <p className="font-medium">{PRODUCTION_BROKER.tls_port}</p>
            </div>
            <div>
              <span className="text-muted-foreground">WSS Port (Dashboard):</span>
              <p className="font-medium">{PRODUCTION_BROKER.wss_port}</p>
            </div>
            <div>
              <span className="text-muted-foreground">WebSocket Path:</span>
              <p className="font-medium">{PRODUCTION_BROKER.wss_path}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              <Lock className="h-3 w-3 mr-1" />
              TLS Encrypted
            </Badge>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
              <Shield className="h-3 w-3 mr-1" />
              ACL Protected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Why TLS is Required */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Why TLS is Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All connections use TLS encryption to protect your IoT data:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>Data encryption:</strong> All messages between devices and the broker are encrypted</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>Server verification:</strong> Devices verify they're connecting to the real broker</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>Credential protection:</strong> Device tokens are never sent in plain text</span>
            </li>
          </ul>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Non-TLS Connections</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span><strong>Port 1883 (plain MQTT):</strong> Not allowed in production</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <span><strong>ws:// connections:</strong> Not allowed in production</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Device Authentication Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Device Authentication Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each device has unique credentials for secure authentication:
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm space-y-2">
            <div>
              <span className="text-muted-foreground">Username:</span>
              <span className="ml-2">DEVICE_ID</span>
              <span className="text-xs text-muted-foreground ml-2">(e.g., "esp32-living-room")</span>
            </div>
            <div>
              <span className="text-muted-foreground">Password:</span>
              <span className="ml-2">DEVICE_TOKEN</span>
              <span className="text-xs text-muted-foreground ml-2">(long random secret)</span>
            </div>
          </div>

          <Separator />
          
          <h4 className="font-medium text-sm">Topic Access Control (ACL)</h4>
          <p className="text-sm text-muted-foreground">
            Devices can only access their own topics. This prevents cross-device interference:
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs space-y-1">
            <p className="text-green-600">✓ saphari/DEVICE_ID/status/online</p>
            <p className="text-green-600">✓ saphari/DEVICE_ID/state</p>
            <p className="text-green-600">✓ saphari/DEVICE_ID/gpio/#</p>
            <p className="text-green-600">✓ saphari/DEVICE_ID/sensor/#</p>
            <p className="text-green-600">✓ saphari/DEVICE_ID/cmd/#</p>
            <p className="text-destructive">✗ saphari/OTHER_DEVICE/#</p>
            <p className="text-destructive">✗ Any other topic</p>
          </div>
        </CardContent>
      </Card>

      {/* Connection Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            How Devices Connect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">1</span>
              <div>
                <strong>WiFi Connection</strong>
                <p className="text-muted-foreground">Device connects to local WiFi network</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">2</span>
              <div>
                <strong>TLS Handshake</strong>
                <p className="text-muted-foreground">Secure connection to {PRODUCTION_BROKER.host}:{PRODUCTION_BROKER.tls_port}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">3</span>
              <div>
                <strong>MQTT Connect with LWT</strong>
                <p className="text-muted-foreground">Device authenticates and sets Last Will Testament for offline detection</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">4</span>
              <div>
                <strong>Publish Online Status</strong>
                <p className="text-muted-foreground">Device publishes "online" to status topic (retained)</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">5</span>
              <div>
                <strong>Subscribe to Commands</strong>
                <p className="text-muted-foreground">Device subscribes to its command topic</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">6</span>
              <div>
                <strong>Heartbeat Loop</strong>
                <p className="text-muted-foreground">Every 30 seconds, device refreshes online status</p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div>
              <strong>Device shows "offline" but is powered on</strong>
              <ul className="list-disc list-inside text-muted-foreground ml-2 mt-1">
                <li>Check WiFi connection (Serial monitor shows IP address)</li>
                <li>Verify device credentials are correct in EMQX Cloud</li>
                <li>Check if device token matches what's in firmware</li>
              </ul>
            </div>
            
            <div>
              <strong>MQTT connect failed, rc=-2</strong>
              <ul className="list-disc list-inside text-muted-foreground ml-2 mt-1">
                <li>DNS resolution failed - check internet connectivity</li>
                <li>Try setting custom DNS servers (8.8.8.8, 1.1.1.1)</li>
              </ul>
            </div>
            
            <div>
              <strong>MQTT connect failed, rc=4 or rc=5</strong>
              <ul className="list-disc list-inside text-muted-foreground ml-2 mt-1">
                <li>Bad credentials - verify username (DEVICE_ID) and password (DEVICE_TOKEN)</li>
                <li>Create credentials in EMQX Cloud dashboard</li>
              </ul>
            </div>
            
            <div>
              <strong>Device connects but commands don't work</strong>
              <ul className="list-disc list-inside text-muted-foreground ml-2 mt-1">
                <li>Check ACL rules in EMQX Cloud - device needs publish/subscribe permissions</li>
                <li>Verify topic format matches: saphari/DEVICE_ID/cmd/#</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}