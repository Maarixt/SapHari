import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMasterMetrics } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KPI = {
  total_users: number; 
  total_devices: number;
  devices_online: number; 
  devices_offline: number;
  critical_alerts_24h: number; 
  errors_24h: number; 
  generated_at: string;
};

type FeedItem = {
  kind: string;
  id: string;
  device_id?: string;
  title?: string;
  code?: string;
  action?: string;
  message?: string;
  ts: string;
  created_at?: string;
};

export default function MasterOverview() {
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [alerts24h, setAlerts24h] = useState<any[]>([]);
  const [mqttSeries, setMqttSeries] = useState<any[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { kpis, alerts24h, mqttSeries } = await fetchMasterMetrics(supabase);
        setKpis(kpis); 
        setAlerts24h(alerts24h || []); 
        setMqttSeries(mqttSeries || []);
      } catch (err) {
        console.error('Failed to load master metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load master metrics');
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // Live feed via Realtime
  useEffect(() => {
    const ch1 = supabase.channel("rt_alerts")
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "alerts" 
      }, payload => {
        setFeed(f => [{
          kind: "alert", 
          ...payload.new, 
          ts: payload.new.ts || payload.new.created_at
        }, ...f].slice(0, 200));
      }).subscribe();

    const ch2 = supabase.channel("rt_events")
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "device_events" 
      }, payload => {
        setFeed(f => [{
          kind: "event", 
          ...payload.new, 
          ts: payload.new.created_at
        }, ...f].slice(0, 200));
      }).subscribe();

    const ch3 = supabase.channel("rt_status")
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "device_status" 
      }, async () => {
        // Re-pull KPIs for online/offline updates
        try {
          const { kpis } = await fetchMasterMetrics(supabase);
          setKpis(kpis);
        } catch (err) {
          console.error('Failed to refresh KPIs:', err);
        }
      }).subscribe();

    const ch4 = supabase.channel("rt_audit")
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "audit_logs" 
      }, payload => {
        setFeed(f => [{
          kind: "audit", 
          ...payload.new, 
          ts: payload.new.created_at
        }, ...f].slice(0, 200));
      }).subscribe();

    return () => { 
      supabase.removeChannel(ch1); 
      supabase.removeChannel(ch2); 
      supabase.removeChannel(ch3);
      supabase.removeChannel(ch4);
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span>Loading master overview...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-sm">!</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error Loading Master Overview</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Users" value={kpis?.total_users} />
        <StatCard title="Total Devices" value={kpis?.total_devices} />
        <StatCard title="Online / Offline" value={`${kpis?.devices_online} / ${kpis?.devices_offline}`} />
        <StatCard title="Critical Alerts (24h)" value={kpis?.critical_alerts_24h} />
        <StatCard title="Errors (24h)" value={kpis?.errors_24h} />
        <StatCard 
          title="Generated At" 
          value={kpis?.generated_at ? new Date(kpis.generated_at).toLocaleTimeString() : '—'} 
        />
      </div>

      {/* Alerts severity summary */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts (Last 24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {alerts24h.length > 0 ? (
              alerts24h.map(row => (
                <SeverityPill key={row.severity} label={row.severity} count={row.count} />
              ))
            ) : (
              <p className="text-muted-foreground">No alerts in the last 24 hours</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* MQTT throughput mini chart */}
      <Card>
        <CardHeader>
          <CardTitle>MQTT Throughput (Last Hour)</CardTitle>
        </CardHeader>
        <CardContent>
          {mqttSeries.length > 0 ? (
            <MiniLineChart 
              data={mqttSeries} 
              xKey="minute" 
              yKey="msg_count" 
              groupKey="direction" 
            />
          ) : (
            <p className="text-muted-foreground">No MQTT data available</p>
          )}
        </CardContent>
      </Card>

      {/* Live feed */}
      <Card>
        <CardHeader>
          <CardTitle>Live Feed (Alerts • Events • Audits)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-auto">
            {feed.length > 0 ? (
              feed.map((f, idx) => (
                <div key={idx} className="text-sm border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded text-xs", badgeColor(f.kind))}>
                      {f.kind}
                    </span>
                    <span className="opacity-70">
                      {new Date(f.ts).toLocaleString()}
                    </span>
                  </div>
                  <div className="font-medium">
                    {f.title || f.code || f.action || f.message?.slice(0, 80)}
                  </div>
                  {f.device_id && (
                    <div className="text-xs opacity-70">Device: {f.device_id}</div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No live events yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm opacity-70">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{String(value ?? "—")}</div>
      </CardContent>
    </Card>
  );
}

function SeverityPill({ label, count }: { label: string; count: number }) {
  return (
    <div className={cn("px-3 py-1 rounded-full text-sm border", sevColor(label))}>
      {label}: {count}
    </div>
  );
}

function badgeColor(kind: string) {
  if (kind === "alert") return "bg-red-100 text-red-700 dark:bg-red-900/30";
  if (kind === "event") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30";
  if (kind === "audit") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30";
  return "bg-slate-100 text-slate-700 dark:bg-slate-900/30";
}

function sevColor(s: string) {
  if (s === "critical") return "border-red-500 text-red-600";
  if (s === "high") return "border-orange-500 text-orange-600";
  if (s === "medium") return "border-yellow-500 text-yellow-700";
  if (s === "warning") return "border-yellow-500 text-yellow-600";
  if (s === "info") return "border-blue-500 text-blue-600";
  return "border-slate-500 text-slate-600";
}

/** Simple line chart with SVG (no extra deps) */
function MiniLineChart({ 
  data, 
  xKey, 
  yKey, 
  groupKey 
}: { 
  data: any[]; 
  xKey: string; 
  yKey: string; 
  groupKey: string; 
}) {
  // Group series by direction
  const grouped = useMemo(() => {
    const by: Record<string, any[]> = {};
    for (const row of data) {
      const g = row[groupKey];
      by[g] = by[g] || [];
      by[g].push(row);
    }
    Object.values(by).forEach(arr => 
      arr.sort((a: any, b: any) => new Date(a[xKey]).getTime() - new Date(b[xKey]).getTime())
    );
    return by;
  }, [data, groupKey, xKey]);

  // Scale
  const w = 640, h = 160, pad = 24;
  const all = data.flat();
  const xs = data.map(d => new Date(d[xKey]).getTime());
  const ys = data.map(d => d[yKey]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = 0, maxY = Math.max(1, ...ys);

  function sx(t: number) { 
    return pad + (t - minX) / (maxX - minX || 1) * (w - 2 * pad); 
  }
  function sy(v: number) { 
    return h - pad - (v - minY) / (maxY - minY || 1) * (h - 2 * pad); 
  }

  const colors = { 
    pub: "#3b82f6", 
    sub: "#10b981",
    inbound: "#10b981",
    outbound: "#3b82f6"
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full text-foreground/80">
      <line 
        x1={pad} 
        y1={h - pad} 
        x2={w - pad} 
        y2={h - pad} 
        stroke="currentColor" 
        strokeOpacity="0.2" 
      />
      {Object.entries(grouped).map(([key, arr]) => {
        const d = arr.map((p: any, i: number) => {
          const X = sx(new Date(p[xKey]).getTime()), Y = sy(p[yKey]);
          return `${i === 0 ? 'M' : 'L'} ${X} ${Y}`;
        }).join(" ");
        return (
          <path 
            key={key} 
            d={d} 
            fill="none" 
            stroke={colors[key as keyof typeof colors] || "currentColor"} 
            strokeWidth="2" 
          />
        );
      })}
    </svg>
  );
}
