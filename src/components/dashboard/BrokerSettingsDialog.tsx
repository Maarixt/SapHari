import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Server, Lock, Shield } from 'lucide-react';
import { useMQTT } from '@/hooks/useMQTT';

interface BrokerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Production broker - read-only display
const PRODUCTION_BROKER = {
  host: 'z110b082.ala.us-east-1.emqxsl.com',
  tls_port: 8883,
  wss_port: 8084,
};

export const BrokerSettingsDialog = ({ open, onOpenChange }: BrokerSettingsDialogProps) => {
  const { brokerConfig, status } = useMQTT();
  
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50" onClick={e => e.stopPropagation()}>
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              MQTT Broker (Production)
            </CardTitle>
            <CardDescription>
              Platform-managed configuration - read only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 font-mono text-sm">
              <div><span className="text-muted-foreground">Host:</span> {PRODUCTION_BROKER.host}</div>
              <div><span className="text-muted-foreground">TLS Port:</span> {PRODUCTION_BROKER.tls_port}</div>
              <div><span className="text-muted-foreground">WSS Port:</span> {PRODUCTION_BROKER.wss_port}</div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={status === 'connected' ? 'default' : 'secondary'}>{status}</Badge></div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />TLS</Badge>
              <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />ACL</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};