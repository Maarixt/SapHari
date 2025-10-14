// Master Dashboard Data Logs Tab with Time-series Browser
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  BarChart3, 
  Search, 
  Filter, 
  Download,
  Calendar,
  Clock,
  TrendingUp,
  Database,
  Cpu,
  Settings,
  FileText,
  BarChart
} from 'lucide-react';
import { useTelemetrySeries, useTopTalkers, useMasterDevices } from '@/hooks/useMasterDashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts';

interface TelemetryDataPoint {
  t: string;
  y: number;
}

interface TopTalker {
  topic: string;
  count: number;
}

// Mock data for demonstration
const mockTelemetryData: TelemetryDataPoint[] = [
  { t: '2024-01-16T10:00:00Z', y: 25.3 },
  { t: '2024-01-16T10:01:00Z', y: 26.1 },
  { t: '2024-01-16T10:02:00Z', y: 24.8 },
  { t: '2024-01-16T10:03:00Z', y: 27.2 },
  { t: '2024-01-16T10:04:00Z', y: 25.9 },
  { t: '2024-01-16T10:05:00Z', y: 26.5 },
  { t: '2024-01-16T10:06:00Z', y: 24.1 },
  { t: '2024-01-16T10:07:00Z', y: 25.7 },
  { t: '2024-01-16T10:08:00Z', y: 26.8 },
  { t: '2024-01-16T10:09:00Z', y: 25.4 },
];

const mockTopTalkers: TopTalker[] = [
  { topic: 'sensors/temperature', count: 1250 },
  { topic: 'sensors/humidity', count: 980 },
  { topic: 'sensors/pressure', count: 750 },
  { topic: 'device/status', count: 420 },
  { topic: 'device/heartbeat', count: 380 },
  { topic: 'alerts/system', count: 150 },
  { topic: 'logs/error', count: 85 },
  { topic: 'metrics/performance', count: 65 },
];

function TimeRangeSelector({ 
  from, 
  to, 
  onFromChange, 
  onToChange 
}: { 
  from: string; 
  to: string; 
  onFromChange: (value: string) => void; 
  onToChange: (value: string) => void; 
}) {
  const presetRanges = [
    { label: 'Last Hour', hours: 1 },
    { label: 'Last 6 Hours', hours: 6 },
    { label: 'Last 24 Hours', hours: 24 },
    { label: 'Last 7 Days', hours: 168 },
    { label: 'Last 30 Days', hours: 720 },
  ];

  const applyPreset = (hours: number) => {
    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    onFromChange(from.toISOString());
    onToChange(now.toISOString());
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        <Input
          type="datetime-local"
          value={from ? new Date(from).toISOString().slice(0, 16) : ''}
          onChange={(e) => onFromChange(new Date(e.target.value).toISOString())}
        />
      </div>
      <span>to</span>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        <Input
          type="datetime-local"
          value={to ? new Date(to).toISOString().slice(0, 16) : ''}
          onChange={(e) => onToChange(new Date(e.target.value).toISOString())}
        />
      </div>
      <div className="flex gap-1">
        {presetRanges.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => applyPreset(preset.hours)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function TelemetryChart({ 
  data, 
  title, 
  isLoading 
}: { 
  data: TelemetryDataPoint[]; 
  title: string; 
  isLoading: boolean; 
}) {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span>Loading chart data...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available for the selected time range
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="t" 
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
          />
          <YAxis />
          <Tooltip 
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value: number) => [value.toFixed(2), 'Value']}
          />
          <Line 
            type="monotone" 
            dataKey="y" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopTalkersChart({ data }: { data: TopTalker[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data.slice(0, 8)} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="topic" type="category" width={120} />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState('csv');
  const [timeRange, setTimeRange] = useState('24h');

  const handleExport = () => {
    // Implement export functionality
    console.log(`Exporting ${format} data for ${timeRange}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Telemetry Data</DialogTitle>
          <DialogDescription>
            Export telemetry data in various formats for analysis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Format</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="parquet">Parquet</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Time Range</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            Export Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DataLogsTab() {
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [interval, setInterval] = useState<'minute' | 'hour'>('minute');
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize time range to last 24 hours
  useEffect(() => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setTimeFrom(yesterday.toISOString());
    setTimeTo(now.toISOString());
  }, []);

  // Use real data from hooks
  const { data: devices } = useMasterDevices();
  const { data: topTalkers } = useTopTalkers(24);
  const { data: telemetryData, isLoading: telemetryLoading } = useTelemetrySeries(
    selectedDevice,
    selectedTopic,
    timeFrom,
    timeTo,
    interval
  );

  // Mock topics for demonstration
  const availableTopics = [
    'sensors/temperature',
    'sensors/humidity',
    'sensors/pressure',
    'device/status',
    'device/heartbeat',
    'alerts/system',
    'logs/error',
    'metrics/performance'
  ];

  const filteredTopTalkers = (topTalkers || mockTopTalkers).filter(talker =>
    talker.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Data Logs</h2>
          <p className="text-muted-foreground">Time-series browser and telemetry analysis</p>
        </div>
        <ExportDialog />
      </div>

      {/* Time Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Range Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimeRangeSelector
            from={timeFrom}
            to={timeTo}
            onFromChange={setTimeFrom}
            onToChange={setTimeTo}
          />
        </CardContent>
      </Card>

      {/* Chart Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Telemetry Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">Device</label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  {devices?.map((device: any) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name} ({device.device_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Topic</label>
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger>
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {availableTopics.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Interval</label>
              <Select value={interval} onValueChange={(value: 'minute' | 'hour') => setInterval(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minute">Minute</SelectItem>
                  <SelectItem value="hour">Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  // Refresh data
                }}
                className="w-full"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Telemetry Chart */}
          <TelemetryChart
            data={telemetryData || mockTelemetryData}
            title={`${selectedTopic || 'Select a topic'} - ${interval} intervals`}
            isLoading={telemetryLoading}
          />
        </CardContent>
      </Card>

      {/* Top Talkers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Top Talkers (Last 24 Hours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Message Count by Topic</h4>
              <TopTalkersChart data={filteredTopTalkers} />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Topic Details</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredTopTalkers.map((talker, index) => (
                  <div key={talker.topic} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="text-sm font-mono">{talker.topic}</span>
                    </div>
                    <Badge variant="secondary">{talker.count.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retention Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Data Retention Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Default Retention</h4>
                <p className="text-sm text-muted-foreground">Keep all telemetry data for 30 days</p>
              </div>
              <Badge variant="outline">30 days</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">High-frequency Data</h4>
                <p className="text-sm text-muted-foreground">sensors/* topics - 7 days</p>
              </div>
              <Badge variant="outline">7 days</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">System Logs</h4>
                <p className="text-sm text-muted-foreground">logs/* topics - 90 days</p>
              </div>
              <Badge variant="outline">90 days</Badge>
            </div>
            
            <Button variant="outline" className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Manage Retention Rules
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
