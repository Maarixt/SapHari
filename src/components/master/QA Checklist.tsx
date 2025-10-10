import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Users, 
  Cpu, 
  Activity,
  RefreshCw,
  TestTube
} from 'lucide-react';

interface QAChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'setup' | 'data' | 'ui' | 'security';
  completed: boolean;
  critical: boolean;
}

export function QAChecklist() {
  const [items, setItems] = useState<QAChecklistItem[]>([
    // Setup Tests
    {
      id: 'test-users-devices',
      title: 'Create Test Users & Devices',
      description: 'Create a few test users and devices in the system',
      category: 'setup',
      completed: false,
      critical: true
    },
    {
      id: 'mqtt-bridge-running',
      title: 'MQTT Bridge Service Running',
      description: 'Ensure MQTT bridge service is running and connected',
      category: 'setup',
      completed: false,
      critical: true
    },
    {
      id: 'database-migrations',
      title: 'Database Migrations Applied',
      description: 'All master aggregations database migrations are applied',
      category: 'setup',
      completed: false,
      critical: true
    },

    // Data Tests
    {
      id: 'device-status-publish',
      title: 'Device Status Publishing',
      description: 'Devices publish /status with { online, ip, rssi, battery_pct }',
      category: 'data',
      completed: false,
      critical: true
    },
    {
      id: 'device-events-publish',
      title: 'Device Events Publishing',
      description: 'Devices publish /event with { level, code, message, meta }',
      category: 'data',
      completed: false,
      critical: true
    },
    {
      id: 'alerts-insertion',
      title: 'Alert Engine Database Insertion',
      description: 'Alert engine inserts alerts into database for master dashboard',
      category: 'data',
      completed: false,
      critical: true
    },
    {
      id: 'audit-logging',
      title: 'Audit Logging',
      description: 'Master/admin actions are logged to audit_logs table',
      category: 'data',
      completed: false,
      critical: true
    },

    // UI Tests
    {
      id: 'master-route-access',
      title: 'Master Route Access Control',
      description: 'Only master users can access /master route',
      category: 'ui',
      completed: false,
      critical: true
    },
    {
      id: 'kpis-display',
      title: 'KPIs Display',
      description: 'Master dashboard shows KPIs from mv_master_kpis',
      category: 'ui',
      completed: false,
      critical: true
    },
    {
      id: 'alerts-summary',
      title: 'Alerts 24h Summary',
      description: 'Alert summary shows data from v_alerts_24h_summary',
      category: 'ui',
      completed: false,
      critical: true
    },
    {
      id: 'mqtt-chart',
      title: 'MQTT Throughput Chart',
      description: 'MQTT chart displays data from v_mqtt_last_hour',
      category: 'ui',
      completed: false,
      critical: false
    },
    {
      id: 'live-feed',
      title: 'Live Feed Streaming',
      description: 'Live feed shows real-time alerts, events, and audit logs',
      category: 'ui',
      completed: false,
      critical: true
    },

    // Security Tests
    {
      id: 'master-role-check',
      title: 'Master Role Verification',
      description: 'Revoking master role removes access to global views',
      category: 'security',
      completed: false,
      critical: true
    },
    {
      id: 'user-data-isolation',
      title: 'User Data Isolation',
      description: 'Normal users only see their own data, not global data',
      category: 'security',
      completed: false,
      critical: true
    },
    {
      id: 'rls-policies',
      title: 'Row Level Security',
      description: 'RLS policies properly restrict data access by role',
      category: 'security',
      completed: false,
      critical: true
    }
  ]);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const runAllTests = async () => {
    console.log('🧪 Running all QA tests...');
    
    // Run the comprehensive test
    if (window.testAggregations) {
      await window.testAggregations();
    }
    
    // Run master dashboard test
    if (window.testMasterDashboard) {
      await window.testMasterDashboard();
    }
    
    console.log('✅ All tests completed!');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'setup': return <Database className="h-4 w-4" />;
      case 'data': return <Activity className="h-4 w-4" />;
      case 'ui': return <Users className="h-4 w-4" />;
      case 'security': return <AlertTriangle className="h-4 w-4" />;
      default: return <TestTube className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'setup': return 'bg-blue-100 text-blue-800';
      case 'data': return 'bg-green-100 text-green-800';
      case 'ui': return 'bg-purple-100 text-purple-800';
      case 'security': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const criticalCompleted = items.filter(item => item.critical && item.completed).length;
  const criticalTotal = items.filter(item => item.critical).length;

  const categories = ['setup', 'data', 'ui', 'security'] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Master Dashboard QA Checklist
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                {completedCount}/{items.length} Complete
              </Badge>
              <Badge variant={criticalCompleted === criticalTotal ? "default" : "destructive"}>
                {criticalCompleted}/{criticalTotal} Critical
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button onClick={runAllTests} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Run All Tests
            </Button>
            <p className="text-sm text-muted-foreground">
              Use this checklist to verify all master dashboard functionality is working correctly.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {categories.map(category => {
          const categoryItems = items.filter(item => item.category === category);
          const completed = categoryItems.filter(item => item.completed).length;
          const total = categoryItems.length;
          
          return (
            <Card key={category}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getCategoryIcon(category)}
                  <span className="font-medium capitalize">{category}</span>
                </div>
                <div className="text-2xl font-bold">{completed}/{total}</div>
                <div className="text-sm text-muted-foreground">
                  {Math.round((completed / total) * 100)}% Complete
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Checklist Items by Category */}
      {categories.map(category => {
        const categoryItems = items.filter(item => item.category === category);
        
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getCategoryIcon(category)}
                <span className="capitalize">{category} Tests</span>
                <Badge className={getCategoryColor(category)}>
                  {categoryItems.filter(item => item.completed).length}/{categoryItems.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryItems.map((item, index) => (
                  <div key={item.id}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={item.id}
                        checked={item.completed}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <label 
                            htmlFor={item.id}
                            className={`font-medium cursor-pointer ${
                              item.completed ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {item.title}
                          </label>
                          {item.critical && (
                            <Badge variant="destructive" className="text-xs">
                              Critical
                            </Badge>
                          )}
                          {item.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    {index < categoryItems.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Test Commands */}
      <Card>
        <CardHeader>
          <CardTitle>Test Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Run these commands in the browser console to test specific functionality:
            </p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm space-y-1">
              <div><code>testAggregations()</code> - Run comprehensive aggregation tests</div>
              <div><code>testMasterDashboard()</code> - Test master dashboard API</div>
              <div><code>testAlertEngine()</code> - Test alert engine functionality</div>
              <div><code>simulate()</code> - Simulate device data and events</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
