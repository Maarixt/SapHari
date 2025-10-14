import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Cpu, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useMasterDashboard } from '@/hooks/useMasterDashboard';

interface SimulatorBinding {
  id: string;
  device_id: string;
  script: string;
  enabled: boolean;
  created_at: string;
  device_name?: string;
}

interface TestMetrics {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  execution_time: number;
  last_run: string;
}

export function SimulatorTab() {
  const dashboardData = useMasterDashboard();
  const devices = dashboardData.devices?.data;
  const [bindings, setBindings] = useState<SimulatorBinding[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [script, setScript] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [testMetrics, setTestMetrics] = useState<TestMetrics>({
    total_tests: 0,
    passed_tests: 0,
    failed_tests: 0,
    execution_time: 0,
    last_run: ''
  });

  // Mock data for demonstration
  useEffect(() => {
    setBindings([
      {
        id: '1',
        device_id: 'device-1',
        script: 'basic_led_test.ino',
        enabled: true,
        created_at: new Date().toISOString(),
        device_name: 'ESP32-001'
      },
      {
        id: '2',
        device_id: 'device-2',
        script: 'sensor_test.ino',
        enabled: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        device_name: 'ESP32-002'
      }
    ]);

    setTestMetrics({
      total_tests: 15,
      passed_tests: 12,
      failed_tests: 3,
      execution_time: 2.5,
      last_run: new Date().toISOString()
    });
  }, []);

  const handleCreateBinding = () => {
    if (!selectedDevice || !script) return;

    const newBinding: SimulatorBinding = {
      id: Date.now().toString(),
      device_id: selectedDevice,
      script,
      enabled: false,
      created_at: new Date().toISOString(),
      device_name: devices?.find(d => d.id === selectedDevice)?.name || 'Unknown Device'
    };

    setBindings(prev => [...prev, newBinding]);
    setSelectedDevice('');
    setScript('');
  };

  const handleToggleBinding = (id: string) => {
    setBindings(prev => prev.map(binding => 
      binding.id === id ? { ...binding, enabled: !binding.enabled } : binding
    ));
  };

  const handleDeleteBinding = (id: string) => {
    setBindings(prev => prev.filter(binding => binding.id !== id));
  };

  const handleRunTests = () => {
    setIsRunning(true);
    // Simulate test execution
    setTimeout(() => {
      setTestMetrics(prev => ({
        ...prev,
        total_tests: prev.total_tests + 5,
        passed_tests: prev.passed_tests + 4,
        failed_tests: prev.failed_tests + 1,
        execution_time: Math.random() * 5 + 1,
        last_run: new Date().toISOString()
      }));
      setIsRunning(false);
    }, 3000);
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-gray-400" />
    );
  };

  const getStatusBadge = (enabled: boolean) => {
    return enabled ? (
      <Badge variant="default" className="bg-green-500">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Simulator Management</h2>
          <p className="text-muted-foreground">
            Manage device bindings and run simulation tests
          </p>
        </div>
        <Button onClick={handleRunTests} disabled={isRunning} className="shadow-sm hover:shadow-md">
          {isRunning ? (
            <>
              <Activity className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Tests
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="bindings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bindings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Device Bindings
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Test Metrics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bindings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Create New Binding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device">Device</Label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices?.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name} ({device.device_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="script">Script Name</Label>
                  <Input
                    id="script"
                    placeholder="e.g., basic_led_test.ino"
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleCreateBinding} disabled={!selectedDevice || !script} className="shadow-sm hover:shadow-md">
                Create Binding
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Bindings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bindings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No device bindings created yet
                  </div>
                ) : (
                  bindings.map((binding) => (
                    <div key={binding.id} className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(binding.enabled)}
                        <div>
                          <div className="font-medium">{binding.device_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Script: {binding.script}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created: {new Date(binding.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(binding.enabled)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleBinding(binding.id)}
                        >
                          {binding.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBinding(binding.id)}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{testMetrics.total_tests}</div>
                    <div className="text-sm text-muted-foreground">Total Tests</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{testMetrics.passed_tests}</div>
                    <div className="text-sm text-muted-foreground">Passed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold">{testMetrics.failed_tests}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{testMetrics.execution_time.toFixed(1)}s</div>
                    <div className="text-sm text-muted-foreground">Execution Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Success Rate</span>
                  <span className="font-medium">
                    {testMetrics.total_tests > 0 
                      ? ((testMetrics.passed_tests / testMetrics.total_tests) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Run</span>
                  <span className="font-medium">
                    {testMetrics.last_run 
                      ? new Date(testMetrics.last_run).toLocaleString()
                      : 'Never'
                    }
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ 
                      width: `${testMetrics.total_tests > 0 
                        ? (testMetrics.passed_tests / testMetrics.total_tests) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulator Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Simulator settings are currently managed through the main simulator interface. 
                  Device bindings and test configurations are handled in the respective tabs.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto-run Tests</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically run tests when bindings are enabled
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Test Timeout</div>
                    <div className="text-sm text-muted-foreground">
                      Maximum time to wait for test completion
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Log Level</div>
                    <div className="text-sm text-muted-foreground">
                      Verbosity of simulation logs
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
