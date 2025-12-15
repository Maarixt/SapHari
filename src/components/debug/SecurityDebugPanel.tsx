/**
 * Security Debug Panel
 * 
 * Master-only panel to verify tenant isolation and state management.
 * Shows current auth state, localStorage keys, MQTT subscriptions, etc.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { getStatus, getCredentials } from '@/services/mqttConnectionService';
import { DeviceStore } from '@/state/deviceStore';
import { deviceStateStore } from '@/stores/deviceStateStore';
import { verifyStateClean } from '@/services/stateResetService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Shield, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebugInfo {
  auth: {
    userId: string | null;
    email: string | null;
    sessionExpiry: string | null;
  };
  mqtt: {
    status: string;
    credentialUserId: string | null;
    deviceIds: string[];
    clientId: string | null;
  };
  stores: {
    deviceStoreCount: number;
    deviceStateStoreCount: number;
    deviceIds: string[];
  };
  localStorage: {
    keys: string[];
    userScopedKeys: string[];
    nonUserScopedKeys: string[];
  };
  stateVerification: {
    isClean: boolean;
    issues: string[];
  };
}

function collectDebugInfo(userId: string | null): DebugInfo {
  // Auth info
  const mqttCreds = getCredentials();
  
  // Device stores
  const deviceStoreData = DeviceStore.all();
  const deviceStateData = deviceStateStore.getAllDeviceStates();
  
  // LocalStorage
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) allKeys.push(key);
  }
  
  const userScopedKeys = allKeys.filter(k => 
    k.includes('saphari:') && userId && k.includes(userId.substring(0, 8))
  );
  const nonUserScopedKeys = allKeys.filter(k => 
    (k.startsWith('saphari') || k.startsWith('alert') || k.startsWith('sb-')) &&
    !userScopedKeys.includes(k)
  );
  
  // State verification
  const stateCheck = verifyStateClean();
  
  return {
    auth: {
      userId: userId?.substring(0, 12) || null,
      email: null, // Will be set by component
      sessionExpiry: null,
    },
    mqtt: {
      status: getStatus(),
      credentialUserId: mqttCreds?.user_id?.substring(0, 12) || null,
      deviceIds: mqttCreds?.device_ids || [],
      clientId: mqttCreds?.client_id || null,
    },
    stores: {
      deviceStoreCount: Object.keys(deviceStoreData).length,
      deviceStateStoreCount: Object.keys(deviceStateData).length,
      deviceIds: [
        ...new Set([
          ...Object.keys(deviceStoreData),
          ...Object.keys(deviceStateData)
        ])
      ],
    },
    localStorage: {
      keys: allKeys,
      userScopedKeys,
      nonUserScopedKeys,
    },
    stateVerification: stateCheck,
  };
}

export function SecurityDebugPanel() {
  const { user, session } = useAuth();
  const { isMaster, isLoading } = useMasterAccount();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const refresh = React.useCallback(() => {
    if (!user) return;
    const info = collectDebugInfo(user.id);
    info.auth.email = user.email || null;
    info.auth.sessionExpiry = session?.expires_at 
      ? new Date(session.expires_at * 1000).toISOString()
      : null;
    setDebugInfo(info);
  }, [user, session?.expires_at]);
  
  useEffect(() => {
    if (isLoading || !isMaster || !user) return;
    
    refresh();
    
    // Refresh every 5 seconds
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [user?.id, session?.expires_at, isLoading, isMaster, refresh]);
  
  // Only show for master users - AFTER all hooks
  if (isLoading || !isMaster) {
    return null;
  }
  
  if (!debugInfo) return null;
  
  const hasIssues = !debugInfo.stateVerification.isClean || 
    (debugInfo.mqtt.credentialUserId && debugInfo.auth.userId && 
     debugInfo.mqtt.credentialUserId !== debugInfo.auth.userId);
  
  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className={cn(
          "fixed bottom-4 right-4 z-50",
          hasIssues ? "text-destructive" : "text-muted-foreground"
        )}
      >
        <Shield className="h-4 w-4 mr-1" />
        {hasIssues && <AlertTriangle className="h-3 w-3 ml-1" />}
        Security Debug
      </Button>
    );
  }
  
  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] shadow-xl border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Debug (Master Only)
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={refresh}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="text-xs">
        <ScrollArea className="h-[60vh]">
          {/* State Verification */}
          <Section title="State Verification">
            {debugInfo.stateVerification.isClean ? (
              <div className="flex items-center gap-1 text-emerald-600">
                <CheckCircle className="h-3 w-3" />
                No leakage detected
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  Issues detected
                </div>
                {debugInfo.stateVerification.issues.map((issue, i) => (
                  <div key={i} className="text-destructive/80 pl-4">
                    • {issue}
                  </div>
                ))}
              </div>
            )}
          </Section>
          
          <Separator className="my-2" />
          
          {/* Auth State */}
          <Section title="Auth State">
            <Row label="User ID" value={debugInfo.auth.userId || '(none)'} />
            <Row label="Email" value={debugInfo.auth.email || '(none)'} />
            <Row label="Session Expiry" value={debugInfo.auth.sessionExpiry || '(none)'} />
          </Section>
          
          <Separator className="my-2" />
          
          {/* MQTT State */}
          <Section title="MQTT State">
            <Row 
              label="Status" 
              value={
                <Badge variant={debugInfo.mqtt.status === 'connected' ? 'default' : 'secondary'}>
                  {debugInfo.mqtt.status}
                </Badge>
              } 
            />
            <Row label="Credential User ID" value={debugInfo.mqtt.credentialUserId || '(none)'} />
            <Row label="Client ID" value={debugInfo.mqtt.clientId || '(none)'} />
            <Row label="Scoped Devices" value={debugInfo.mqtt.deviceIds.length.toString()} />
            
            {/* Check for user mismatch */}
            {debugInfo.mqtt.credentialUserId && debugInfo.auth.userId && 
             debugInfo.mqtt.credentialUserId !== debugInfo.auth.userId && (
              <div className="text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                USER MISMATCH - Credentials belong to different user!
              </div>
            )}
          </Section>
          
          <Separator className="my-2" />
          
          {/* In-Memory Stores */}
          <Section title="In-Memory Stores">
            <Row label="DeviceStore count" value={debugInfo.stores.deviceStoreCount.toString()} />
            <Row label="DeviceStateStore count" value={debugInfo.stores.deviceStateStoreCount.toString()} />
            {debugInfo.stores.deviceIds.length > 0 && (
              <div className="mt-1">
                <span className="text-muted-foreground">Device IDs in memory:</span>
                <div className="pl-2">
                  {debugInfo.stores.deviceIds.slice(0, 5).map(id => (
                    <div key={id} className="font-mono text-[10px]">{id.substring(0, 12)}...</div>
                  ))}
                  {debugInfo.stores.deviceIds.length > 5 && (
                    <div className="text-muted-foreground">+{debugInfo.stores.deviceIds.length - 5} more</div>
                  )}
                </div>
              </div>
            )}
          </Section>
          
          <Separator className="my-2" />
          
          {/* LocalStorage */}
          <Section title="LocalStorage">
            <Row label="Total keys" value={debugInfo.localStorage.keys.length.toString()} />
            <Row label="User-scoped keys" value={debugInfo.localStorage.userScopedKeys.length.toString()} />
            <Row 
              label="Non-scoped app keys" 
              value={debugInfo.localStorage.nonUserScopedKeys.length.toString()} 
            />
            
            {debugInfo.localStorage.nonUserScopedKeys.length > 0 && (
              <div className="mt-1">
                <span className="text-amber-600">Non-scoped keys (potential leak):</span>
                <div className="pl-2">
                  {debugInfo.localStorage.nonUserScopedKeys.slice(0, 5).map(key => (
                    <div key={key} className="font-mono text-[10px]">{key}</div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="font-semibold text-muted-foreground mb-1">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
