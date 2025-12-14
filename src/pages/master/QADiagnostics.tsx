/**
 * QA Diagnostics Page
 * 
 * Master-only page for testing cross-account isolation and MQTT security.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMasterAccount } from '@/hooks/useMasterAccount';
import { useMQTT } from '@/hooks/useMQTT';
import { useDevices } from '@/hooks/useDevices';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Database,
  User,
  HardDrive
} from 'lucide-react';
import { getAuthorizedDevices, getAuthorizedDeviceIds } from '@/services/mqttGate';
import { verifyStateClean } from '@/services/stateResetService';
import { DeviceStore } from '@/state/deviceStore';
import { deviceStateStore } from '@/stores/deviceStateStore';

interface TestCase {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'pending' | 'running';
  details?: string;
}

export default function QADiagnostics() {
  const { user, signOut } = useAuth();
  const { isMaster, isLoading: masterLoading } = useMasterAccount();
  const { status: mqttStatus, credentials } = useMQTT();
  const { devices } = useDevices();
  const { organizations } = useOrganizations();
  
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: 'auth-state',
      name: 'Auth State Check',
      description: 'Verify user is authenticated with correct UID',
      status: 'pending'
    },
    {
      id: 'mqtt-gate',
      name: 'MQTT Gate Check',
      description: 'MQTT should only connect if user has authorized devices',
      status: 'pending'
    },
    {
      id: 'device-isolation',
      name: 'Device Isolation Check',
      description: 'Only authorized devices appear in store',
      status: 'pending'
    },
    {
      id: 'storage-namespace',
      name: 'Storage Namespace Check',
      description: 'LocalStorage keys are user-scoped',
      status: 'pending'
    },
    {
      id: 'state-clean',
      name: 'State Cleanliness Check',
      description: 'No stale data from other accounts',
      status: 'pending'
    }
  ]);
  
  const [storageKeys, setStorageKeys] = useState<string[]>([]);
  
  // Run tests on mount
  useEffect(() => {
    runAllTests();
    refreshStorageKeys();
  }, [user, mqttStatus, devices]);
  
  const refreshStorageKeys = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    setStorageKeys(keys);
  };
  
  const runAllTests = () => {
    const newTests = [...testCases];
    
    // Test 1: Auth State
    const authTest = newTests.find(t => t.id === 'auth-state')!;
    if (user) {
      authTest.status = 'pass';
      authTest.details = `UID: ${user.id}`;
    } else {
      authTest.status = 'fail';
      authTest.details = 'No user authenticated';
    }
    
    // Test 2: MQTT Gate
    const mqttTest = newTests.find(t => t.id === 'mqtt-gate')!;
    const authorizedDevices = getAuthorizedDevices();
    const hasDevices = authorizedDevices.length > 0;
    
    if (!hasDevices && (mqttStatus === 'disconnected' || mqttStatus === 'blocked')) {
      mqttTest.status = 'pass';
      mqttTest.details = 'MQTT correctly blocked (no devices)';
    } else if (hasDevices && mqttStatus === 'connected') {
      mqttTest.status = 'pass';
      mqttTest.details = `Connected with ${authorizedDevices.length} device(s)`;
    } else if (!hasDevices && mqttStatus === 'connected') {
      mqttTest.status = 'fail';
      mqttTest.details = 'CRITICAL: Connected without authorized devices!';
    } else {
      mqttTest.status = 'pending';
      mqttTest.details = `Status: ${mqttStatus}, Devices: ${authorizedDevices.length}`;
    }
    
    // Test 3: Device Isolation
    const deviceTest = newTests.find(t => t.id === 'device-isolation')!;
    const storeDevices = Object.keys(DeviceStore.all());
    const authorizedIds = getAuthorizedDeviceIds();
    const unauthorizedInStore = storeDevices.filter(id => !authorizedIds.includes(id));
    
    if (unauthorizedInStore.length === 0) {
      deviceTest.status = 'pass';
      deviceTest.details = `${storeDevices.length} devices in store, all authorized`;
    } else {
      deviceTest.status = 'fail';
      deviceTest.details = `LEAK: ${unauthorizedInStore.join(', ')} not authorized`;
    }
    
    // Test 4: Storage Namespace
    const storageTest = newTests.find(t => t.id === 'storage-namespace')!;
    const userPrefix = user ? `saphari:${user.id}:` : null;
    const saphariKeys = storageKeys.filter(k => k.startsWith('saphari:') || k.startsWith('saphari-'));
    const wrongNamespace = userPrefix 
      ? saphariKeys.filter(k => k.startsWith('saphari:') && !k.startsWith(userPrefix) && !k.startsWith('saphari-'))
      : [];
    
    if (wrongNamespace.length === 0) {
      storageTest.status = 'pass';
      storageTest.details = `${saphariKeys.length} keys, all properly scoped`;
    } else {
      storageTest.status = 'fail';
      storageTest.details = `LEAK: ${wrongNamespace.join(', ')}`;
    }
    
    // Test 5: State Clean
    const cleanTest = newTests.find(t => t.id === 'state-clean')!;
    const verification = verifyStateClean();
    if (verification.isClean) {
      cleanTest.status = 'pass';
      cleanTest.details = 'No stale data detected';
    } else {
      cleanTest.status = 'fail';
      cleanTest.details = verification.issues.join('; ');
    }
    
    setTestCases(newTests);
  };
  
  // Block non-master users
  if (masterLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!isMaster) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This page is only accessible to master users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const passCount = testCases.filter(t => t.status === 'pass').length;
  const failCount = testCases.filter(t => t.status === 'fail').length;
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            QA Diagnostics
          </h1>
          <p className="text-muted-foreground">
            Cross-account isolation and security testing
          </p>
        </div>
        <Button onClick={runAllTests} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Re-run Tests
        </Button>
      </div>
      
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Auth State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{user?.id?.substring(0, 8) || 'None'}</div>
            <p className="text-xs text-muted-foreground truncate">{user?.email || 'Not authenticated'}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {mqttStatus === 'connected' ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
              MQTT Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{mqttStatus}</div>
            <p className="text-xs text-muted-foreground">
              {getAuthorizedDevices().length} authorized device(s)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Stores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(DeviceStore.all()).length} / {storageKeys.length}</div>
            <p className="text-xs text-muted-foreground">
              In-memory / LocalStorage
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Security Test Suite
            <Badge variant={failCount > 0 ? 'destructive' : 'default'}>
              {passCount}/{testCases.length} Passing
            </Badge>
          </CardTitle>
          <CardDescription>
            Automated checks for cross-account data isolation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testCases.map((test) => (
              <div
                key={test.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {test.status === 'pass' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {test.status === 'fail' && <XCircle className="h-5 w-5 text-red-500" />}
                  {test.status === 'pending' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                  {test.status === 'running' && <RefreshCw className="h-5 w-5 animate-spin" />}
                  <div>
                    <p className="font-medium">{test.name}</p>
                    <p className="text-sm text-muted-foreground">{test.description}</p>
                  </div>
                </div>
                {test.details && (
                  <Badge variant={test.status === 'fail' ? 'destructive' : 'secondary'} className="max-w-xs truncate">
                    {test.details}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Detailed State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authorized Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Authorized Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {getAuthorizedDevices().length === 0 ? (
                <p className="text-muted-foreground text-sm">No authorized devices</p>
              ) : (
                <div className="space-y-2">
                  {getAuthorizedDevices().map(d => (
                    <div key={d.device_id} className="flex items-center justify-between text-sm">
                      <span className="font-mono">{d.device_id}</span>
                      <Badge variant={d.online ? 'default' : 'secondary'}>
                        {d.online ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* LocalStorage Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              LocalStorage Keys ({storageKeys.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {storageKeys.map(key => {
                  const isUserScoped = user && key.startsWith(`saphari:${user.id}:`);
                  const isGlobal = key.startsWith('saphari-');
                  const isOtherUser = key.startsWith('saphari:') && !isUserScoped;
                  
                  return (
                    <div 
                      key={key} 
                      className={`text-xs font-mono p-1 rounded ${
                        isOtherUser ? 'bg-red-500/20 text-red-500' : 
                        isUserScoped ? 'bg-green-500/20' : 
                        isGlobal ? 'bg-blue-500/20' : ''
                      }`}
                    >
                      {key}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      {/* Manual Test Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Test Checklist</CardTitle>
          <CardDescription>
            Complete these tests to verify cross-account isolation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <div>
                <p className="font-medium">Login A → Logout → Login B (0 devices)</p>
                <p className="text-muted-foreground">User B must NOT connect to MQTT or see User A's device updates</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <div>
                <p className="font-medium">Incognito B → No MQTT</p>
                <p className="text-muted-foreground">Fresh browser with new user should not have any MQTT connection</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <div>
                <p className="font-medium">B adds org → Membership created → Dashboard loads</p>
                <p className="text-muted-foreground">Organization creation should work without RLS errors</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <div>
                <p className="font-medium">No console errors during route changes</p>
                <p className="text-muted-foreground">Navigation should be smooth without React errors</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
