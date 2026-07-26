import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from "../../api/client";
import { Activity, Database, AlertTriangle, RefreshCw, Cpu, HardDrive, Shield, List, TrendingUp, TrendingDown, Minus, BarChart2, Clock, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const C = {
  bg:          "#FAF6F0",
  surface:     "#FFFFFF",
  border:      "#E0D5C8",
  borderLight: "#F0E8DF",
  t1:          "#1A1205",
  t2:          "#5C4F40",
  t3:          "#9C8C7C",
  red:         "#BE2B1A",
  redBg:       "rgba(190,43,26,0.08)",
  green:       "#16A34A",
  greenBg:     "rgba(22,163,74,0.08)",
  sky:         "#0284C7",
  skyBg:       "rgba(2,132,199,0.08)",
  violet:      "#7C3AED",
  violetBg:    "rgba(124,58,237,0.08)",
  amber:       "#D97706",
  amberBg:     "rgba(217,119,6,0.08)",
};

const FONT = { ui: "'Inter', sans-serif" };

// Helper: Stat card
function StatCard({ icon, label, value, sub, color, bg }: any) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(26,18,5,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: 8, background: bg, color, borderRadius: 10 }}>{icon}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.t2 }}>{label}</div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: C.t1, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.t3, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function SystemMonitor() {
  const [sentryToken, setSentryToken] = useState(import.meta.env.VITE_SENTRY_AUTH_TOKEN || '');
  const [sentryOrg]     = useState('redpiston');
  const [sentryProject] = useState('redpiston-backend');
  const logEndRef = useRef<HTMLDivElement>(null);

  // Backend system metrics
  const { data: metrics, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: async () => {
      const res = await api.get('/api/admin/system-metrics');
      return res.data?.data ?? res.data;
    },
    refetchInterval: 30000,
  });

  // Sentry Live Issues
  const activeSentryToken = sentryToken || import.meta.env.VITE_SENTRY_AUTH_TOKEN || '';
  const { data: sentryIssues, isLoading: isLoadingIssues, error: sentryError } = useQuery({
    queryKey: ['sentry-issues', activeSentryToken],
    queryFn: async () => {
      if (!activeSentryToken) return [];
      const res = await fetch(
        `https://de.sentry.io/api/0/projects/${sentryOrg}/${sentryProject}/issues/?limit=25&query=is:unresolved`,
        { headers: { Authorization: `Bearer ${activeSentryToken}` } }
      );
      if (!res.ok) throw new Error(`Sentry API error: ${res.status}`);
      return res.json();
    },
    enabled: !!activeSentryToken,
    retry: false,
    refetchInterval: 60000,
  });

  // Network Logs — poll every 2s for freshness
  const { data: networkStats } = useQuery({
    queryKey: ['network-logs'],
    queryFn: async () => {
      const res = await api.get('/api/admin/network-logs');
      return res.data?.data;
    },
    refetchInterval: 2000,
  });

  // Build live traffic sparkline from network logs
  const trafficSparkline = (() => {
    const logs: any[] = networkStats?.logs || [];
    if (!logs.length) return [];
    // Group into ~10 time buckets
    const now = Date.now();
    const bucketMs = 30000; // 30s buckets
    const buckets: Record<number, { requests: number; errors: number; latency: number[]; }> = {};
    logs.forEach((log) => {
      const t = new Date(log.timestamp).getTime();
      const key = Math.floor(t / bucketMs) * bucketMs;
      if (!buckets[key]) buckets[key] = { requests: 0, errors: 0, latency: [] };
      buckets[key].requests++;
      if (log.status >= 400) buckets[key].errors++;
      buckets[key].latency.push(log.latency);
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-12)
      .map(([ts, b]) => ({
        time: new Date(Number(ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        requests: b.requests,
        errors: b.errors,
        avgLatency: b.latency.length ? Math.round(b.latency.reduce((a, v) => a + v, 0) / b.latency.length) : 0,
      }));
  })();

  const health = networkStats?.health;
  const dbSizeMB = metrics?.database?.sizeMb || 0;
  const dbPercent = Math.min(100, (dbSizeMB / 500) * 100);
  const errorRate = health?.total ? Math.round(((health.errors4xx + health.errors5xx) / health.total) * 100) : 0;

  return (
    <div style={{ padding: 32, fontFamily: FONT.ui, display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1280, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.t1, margin: '0 0 4px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>System Monitor</h1>
          <div style={{ fontSize: 13, color: C.t3 }}>Live infrastructure · security · application health</div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.t2 }}
        >
          <RefreshCw size={14} style={{ animation: isRefetching ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── SECTION: INFRASTRUCTURE ── */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: C.t3, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.2 }}>Infrastructure</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <StatCard icon={<Database size={18} />} label="PostgreSQL Database" color={C.green} bg={C.greenBg}
            value={isLoading ? '…' : `${dbSizeMB} MB`}
            sub={`${dbPercent.toFixed(1)}% of 500MB · ${metrics?.database?.activeConnections ?? 0} connections active`}
          />
          <StatCard icon={<HardDrive size={18} />} label="Redis Cache" color={C.red} bg={C.redBg}
            value={isLoading ? '…' : metrics?.cache?.usedMemoryHuman || 'N/A'}
            sub="Upstash free tier — 256 MB limit"
          />
          <StatCard icon={<Cpu size={18} />} label="Backend Server" color={C.violet} bg={C.violetBg}
            value={isLoading ? '…' : `${metrics?.server?.loadavg?.[0]?.toFixed(2) ?? '0.00'}`}
            sub={metrics?.server ? `RAM: ${Math.round((metrics.server.totalmem - metrics.server.freemem) / 1024 / 1024)}MB / ${Math.round(metrics.server.totalmem / 1024 / 1024)}MB` : '1-min load avg'}
          />
        </div>
      </div>

      {/* ── SECTION: LIVE ANALYTICS SUMMARY ── */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: C.t3, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.2 }}>Live API Analytics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          <StatCard icon={<Zap size={18} />} label="Total Requests" color={C.sky} bg={C.skyBg}
            value={health?.total ?? 0}
            sub="Since last server start"
          />
          <StatCard icon={<TrendingUp size={18} />} label="Success (2xx)" color={C.green} bg={C.greenBg}
            value={health?.success ?? 0}
            sub={health?.total ? `${Math.round((health.success / health.total) * 100)}% success rate` : 'No data yet'}
          />
          <StatCard icon={<AlertTriangle size={18} />} label="Client Errors (4xx)" color={C.amber} bg={C.amberBg}
            value={health?.errors4xx ?? 0}
            sub="Auth / Not Found / Validation"
          />
          <StatCard icon={<TrendingDown size={18} />} label="Server Errors (5xx)" color={C.red} bg={C.redBg}
            value={health?.errors5xx ?? 0}
            sub={health?.errors5xx > 0 ? '⚠️ Needs immediate attention' : 'All clear'}
          />
          <StatCard icon={<Clock size={18} />} label="Avg Latency" color={C.violet} bg={C.violetBg}
            value={health?.avgLatency ? `${health.avgLatency}ms` : '—'}
            sub={health?.avgLatency > 300 ? 'Slow — investigate DB queries' : health?.avgLatency > 0 ? 'Healthy response time' : 'No data yet'}
          />
        </div>
      </div>

      {/* ── SECTION: SECURITY & TRAFFIC ── */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: C.t3, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.2 }}>Security & Traffic</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>

          {/* Rate Limits */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(26,18,5,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 8, background: C.amberBg, color: C.amber, borderRadius: 10 }}><Shield size={18} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>API Gateway</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 14, background: C.bg, borderRadius: 10, border: `1px solid ${C.borderLight}` }}>
                <div style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Active Global IPs (60s)</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.t1 }}>{isLoading ? '…' : metrics?.rateLimits?.api?.active ?? 0}</div>
                {(metrics?.rateLimits?.api?.warnings ?? 0) > 0 && (
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 600, marginTop: 4 }}>⚠️ {metrics.rateLimits.api.warnings} IPs approaching limit</div>
                )}
              </div>
              <div style={{ padding: 14, background: C.bg, borderRadius: 10, border: `1px solid ${C.borderLight}` }}>
                <div style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Active Mutators (POST/PUT/DEL)</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.t1 }}>{isLoading ? '…' : metrics?.rateLimits?.mutations?.active ?? 0}</div>
              </div>
              <div style={{ padding: 14, background: errorRate > 10 ? C.redBg : C.greenBg, borderRadius: 10, border: `1px solid ${C.borderLight}` }}>
                <div style={{ fontSize: 11, color: C.t3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Current Error Rate</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: errorRate > 10 ? C.red : C.green }}>{errorRate}%</div>
              </div>
            </div>
          </div>

          {/* Live Traffic Sparkline (real data from network logs) */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(26,18,5,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <BarChart2 size={18} color={C.t3} />
              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>Live Traffic (30s buckets)</div>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: C.t3, background: C.greenBg, padding: '2px 8px', borderRadius: 10, color: C.green, fontWeight: 600 }}>● LIVE</span>
            </div>
            <div style={{ height: 230 }}>
              {trafficSparkline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficSparkline} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.violet} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C.violet} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.red} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.borderLight} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.t3 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: C.t3 }} dx={-8} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, boxShadow: '0 4px 12px rgba(26,18,5,0.1)', fontSize: 12 }} />
                    <Area type="monotone" dataKey="requests" name="Requests" stroke={C.violet} strokeWidth={2} fill="url(#reqGrad)" dot={false} />
                    <Area type="monotone" dataKey="errors" name="Errors" stroke={C.red} strokeWidth={2} fill="url(#errGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.t3, fontSize: 13 }}>
                  <div style={{ textAlign: 'center' }}>
                    <Activity size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div>Chart will populate once API requests are made</div>
                    <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>Navigate around the app to generate data</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION: APPLICATION HEALTH (Sentry full-width) ── */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: C.t3, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.2 }}>Application Health</h2>
        <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(26,18,5,0.03)' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={18} color={C.red} />
              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>Live Sentry Error Feed</div>
              {sentryIssues && sentryIssues.length > 0 && (
                <span style={{ background: C.redBg, color: C.red, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  {sentryIssues.length} unresolved
                </span>
              )}
              {sentryIssues?.length === 0 && (
                <span style={{ background: C.greenBg, color: C.green, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  ✓ All clear
                </span>
              )}
            </div>
            <input
              type="password"
              placeholder="Sentry Auth Token…"
              value={sentryToken}
              onChange={(e) => setSentryToken(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, width: 200, background: C.bg, color: C.t1, outline: 'none' }}
            />
          </div>

          <div style={{ background: '#0D1117', padding: 20, minHeight: 300, maxHeight: 450, overflow: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
            {!activeSentryToken ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, color: '#4B5563' }}>
                <AlertTriangle size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontSize: 13 }}>Paste your Sentry Auth Token above to see live errors</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>Settings → Auth Tokens → Create Token in Sentry</div>
              </div>
            ) : isLoadingIssues ? (
              <div style={{ color: '#4B5563', padding: 20 }}>Connecting to Sentry…</div>
            ) : sentryError ? (
              <div style={{ color: '#F87171', padding: 20 }}>❌ Could not connect to Sentry. Check your token and org/project slug.</div>
            ) : sentryIssues?.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, color: '#34D399' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 13 }}>All systems operational — no unresolved errors</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sentryIssues.map((issue: any) => {
                  const level = issue.level || 'error';
                  const levelColor = level === 'error' ? '#F87171' : level === 'warning' ? '#FBBF24' : '#60A5FA';
                  return (
                    <div key={issue.id} style={{ borderLeft: `3px solid ${levelColor}`, paddingLeft: 14, paddingBottom: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: levelColor, fontWeight: 700, fontSize: 13 }}>{issue.title}</span>
                        <span style={{ background: '#1C2433', color: '#9CA3AF', padding: '2px 8px', borderRadius: 4, fontSize: 10 }}>
                          {issue.count}× seen · last {new Date(issue.lastSeen).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ color: '#6B7280', fontSize: 11 }}>{issue.culprit}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION: LIVE NETWORK LOGS ── */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: C.t3, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.2 }}>Live Network Logs</h2>
        <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(26,18,5,0.03)' }}>
          <div style={{ padding: '14px 24px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <List size={16} color={C.t2} />
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>HTTP Request Feed</div>
              <span style={{ fontSize: 11, color: C.green, background: C.greenBg, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>● Auto-refresh 2s</span>
            </div>
            {health && (
              <div style={{ display: 'flex', gap: 20, fontSize: 12, fontWeight: 600 }}>
                <span style={{ color: C.green }}>✓ {health.success} 2xx</span>
                <span style={{ color: C.amber }}>⚠ {health.errors4xx} 4xx</span>
                <span style={{ color: C.red }}>✕ {health.errors5xx} 5xx</span>
                <span style={{ color: C.t2 }}>⏱ {health.avgLatency}ms avg</span>
              </div>
            )}
          </div>

          <div style={{ background: '#0D1117', height: 450, overflowY: 'auto', fontSize: 12, fontFamily: 'monospace' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#161B22', zIndex: 1 }}>
                <tr style={{ color: '#6B7280' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Time</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Method</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, minWidth: 280 }}>Path</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Latency</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {networkStats?.logs?.map((log: any) => {
                  const is5xx = log.status >= 500;
                  const is4xx = log.status >= 400;
                  const statusColor = is5xx ? '#F87171' : is4xx ? '#FBBF24' : '#34D399';
                  const methodColor: Record<string, string> = { GET: '#60A5FA', POST: '#34D399', PUT: '#FBBF24', PATCH: '#C084FC', DELETE: '#F87171' };
                  const rowBg = is5xx ? 'rgba(248,113,113,0.05)' : is4xx ? 'rgba(251,191,36,0.04)' : 'transparent';
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1C2433', background: rowBg }}>
                      <td style={{ padding: '8px 16px', color: '#6B7280', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td style={{ padding: '8px 16px', fontWeight: 700, color: methodColor[log.method] || '#D1D5DB' }}>{log.method}</td>
                      <td style={{ padding: '8px 16px', color: '#D1D5DB', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.path}</td>
                      <td style={{ padding: '8px 16px', color: statusColor, fontWeight: 700 }}>
                        {is5xx && '🔴 '}{is4xx && '🟡 '}{!is5xx && !is4xx && '🟢 '}{log.status}
                      </td>
                      <td style={{ padding: '8px 16px', color: log.latency > 1000 ? '#F87171' : log.latency > 300 ? '#FBBF24' : '#9CA3AF' }}>
                        {log.latency}ms
                      </td>
                      <td style={{ padding: '8px 16px', color: '#4B5563' }}>{log.ip}</td>
                    </tr>
                  );
                })}
                {!networkStats?.logs?.length && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '60px 0', color: '#374151' }}>
                      <div style={{ marginBottom: 8 }}>
                        <Activity size={28} style={{ opacity: 0.3 }} />
                      </div>
                      <div>Listening for incoming requests…</div>
                      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>Click around the app — requests will appear here instantly</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div ref={logEndRef} />
          </div>
        </div>
      </div>

    </div>
  );
}
