import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from "../../api/client";
import { Activity, Database, Server, AlertTriangle, RefreshCw, Cpu, HardDrive, Shield, Cloud, CheckCircle, XCircle, List } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const C = {
  bg:       "#FAF6F0",
  surface:  "#FFFFFF",
  border:   "#E0D5C8",
  borderLight: "#F0E8DF",
  t1:       "#1A1205",
  t2:       "#5C4F40",
  t3:       "#9C8C7C",
  red:      "#BE2B1A",
  redBg:    "rgba(190,43,26,0.08)",
  green:    "#16A34A",
  greenBg:  "rgba(22,163,74,0.08)",
  sky:      "#0284C7",
  skyBg:    "rgba(2,132,199,0.08)",
  violet:   "#7C3AED",
  violetBg: "rgba(124,58,237,0.08)",
  amber:    "#D97706",
  amberBg:  "rgba(217,119,6,0.08)",
};

const FONT = { ui: "'Inter', sans-serif" };

export default function SystemMonitor() {
  const [sentryToken, setSentryToken] = useState(import.meta.env.VITE_SENTRY_AUTH_TOKEN || '');
  const [vercelToken, setVercelToken] = useState(import.meta.env.VITE_VERCEL_TOKEN || '');
  const [vercelProject, setVercelProject] = useState('red-piston'); // default project name
  
  const [sentryOrg] = useState('redpiston');
  const [sentryProject] = useState('redpiston-backend');

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
  const { data: sentryIssues, isLoading: isLoadingIssues } = useQuery({
    queryKey: ['sentry-issues', sentryToken],
    queryFn: async () => {
      if (!sentryToken) return [];
      const res = await fetch(`https://de.sentry.io/api/0/projects/${sentryOrg}/${sentryProject}/issues/`, {
        headers: { Authorization: `Bearer ${sentryToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch Sentry logs');
      return res.json();
    },
    enabled: !!sentryToken,
    retry: false
  });

  // Vercel Deployments
  const { data: vercelDeployments, isLoading: isLoadingDeployments } = useQuery({
    queryKey: ['vercel-deployments', vercelToken, vercelProject],
    queryFn: async () => {
      if (!vercelToken || !vercelProject) return [];
      const res = await api.get(`/api/admin/deployments/vercel?token=${vercelToken}&projectId=${vercelProject}`);
      return res.data?.data?.deployments || [];
    },
    enabled: !!vercelToken && !!vercelProject,
    retry: false
  });

  // Network Logs
  const { data: networkStats } = useQuery({
    queryKey: ['network-logs'],
    queryFn: async () => {
      const res = await api.get('/api/admin/network-logs');
      return res.data?.data;
    },
    refetchInterval: 3000,
  });

  const chartData = [
    { time: '10:00', requests: 120, latency: 45 },
    { time: '11:00', requests: 200, latency: 55 },
    { time: '12:00', requests: 150, latency: 40 },
    { time: '13:00', requests: 300, latency: 80 },
    { time: '14:00', requests: 250, latency: 60 },
    { time: '15:00', requests: 400, latency: 90 },
    { time: '16:00', requests: 180, latency: 50 },
  ];

  const dbSizeMB = metrics?.database?.sizeMb || 0;
  const dbPercent = Math.min(100, (dbSizeMB / 500) * 100);

  return (
    <div style={{ padding: 32, fontFamily: FONT.ui, display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.t1, margin: '0 0 4px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>System Monitor</h1>
          <div style={{ fontSize: 13, color: C.t3 }}>Comprehensive infrastructure, security, and application health</div>
        </div>
        <button 
          onClick={() => refetch()} 
          disabled={isRefetching}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.t2
          }}
        >
          <RefreshCw size={14} style={{ animation: isRefetching ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* --- SECTION: INFRASTRUCTURE --- */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: C.t2, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Infrastructure</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          
          {/* DB Card */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(26,18,5,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 8, background: C.greenBg, color: C.green, borderRadius: 10 }}><Database size={20} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>PostgreSQL Database</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.t1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {isLoading ? '...' : dbSizeMB} <span style={{ fontSize: 14, color: C.t3, fontWeight: 600 }}>MB</span>
              </div>
              <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Supabase Free Tier (Limit: 500 MB)</div>
              {metrics?.database?.activeConnections !== undefined && (
                <div style={{ fontSize: 13, color: C.t2, marginTop: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: C.green }} />
                  {metrics.database.activeConnections} Active Connections
                </div>
              )}
            </div>
            <div style={{ marginTop: 24, background: C.borderLight, height: 6, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${dbPercent}%`, background: C.green, height: '100%', borderRadius: 3, transition: 'width 1s ease' }} />
            </div>
          </div>

          {/* Redis Card */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(26,18,5,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 8, background: C.redBg, color: C.red, borderRadius: 10 }}><HardDrive size={20} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>Redis Cache & Queue</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.t1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {isLoading ? '...' : metrics?.cache?.usedMemoryHuman || '0B'}
              </div>
              <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Upstash Free Tier (Limit: 256 MB)</div>
            </div>
          </div>

          {/* Server Card */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(26,18,5,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 8, background: C.violetBg, color: C.violet, borderRadius: 10 }}><Cpu size={20} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>Backend Server (Railway)</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.t1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {isLoading ? '...' : metrics?.server?.loadavg?.[0]?.toFixed(2) || '0.00'}
              </div>
              <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>1-Minute Load Average</div>
              {metrics?.server && (
                <div style={{ fontSize: 13, color: C.t2, marginTop: 12, fontWeight: 600 }}>
                  RAM: {Math.round((metrics.server.totalmem - metrics.server.freemem) / 1024 / 1024)}MB / {Math.round(metrics.server.totalmem / 1024 / 1024)}MB
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- SECTION: SECURITY & TRAFFIC --- */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: C.t2, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Security & Traffic</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          
          {/* Rate Limits */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(26,18,5,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 8, background: C.amberBg, color: C.amber, borderRadius: 10 }}><Shield size={20} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>API Gateway</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 12, background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                <div style={{ fontSize: 12, color: C.t3, fontWeight: 600, marginBottom: 4 }}>Active Global IPs (Last 60s)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.t1 }}>{isLoading ? '...' : metrics?.rateLimits?.api?.active || 0}</div>
                {metrics?.rateLimits?.api?.warnings > 0 && (
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 600, marginTop: 4 }}>{metrics.rateLimits.api.warnings} IPs approaching limits!</div>
                )}
              </div>
              
              <div style={{ padding: 12, background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                <div style={{ fontSize: 12, color: C.t3, fontWeight: 600, marginBottom: 4 }}>Active Mutators (POST/PUT/DEL)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.t1 }}>{isLoading ? '...' : metrics?.rateLimits?.mutations?.active || 0}</div>
              </div>
            </div>
          </div>

          {/* Traffic Chart */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(26,18,5,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <Activity size={18} color={C.t3} />
              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>Traffic & Latency (Mock 24h)</div>
            </div>
            <div style={{ height: 220, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.borderLight} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: C.t3 }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: C.t3 }} dx={-10} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: C.t3 }} dx={10} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, boxShadow: '0 4px 12px rgba(26,18,5,0.1)' }} />
                  <Line yAxisId="left" type="monotone" dataKey="requests" name="Requests" stroke={C.violet} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="latency" name="Latency (ms)" stroke={C.green} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* --- SECTION: APPLICATION HEALTH --- */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: C.t2, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Application Health</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          
          {/* Sentry Logs */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(26,18,5,0.03)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={18} color={C.red} />
                <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>Live Sentry Error Feed</div>
              </div>
              <input
                type="password"
                placeholder="Sentry API Token..."
                value={sentryToken}
                onChange={(e) => setSentryToken(e.target.value)}
                style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, width: 160, background: C.bg, color: C.t1, outline: 'none' }}
              />
            </div>
            
            <div style={{ background: '#111827', padding: 24, height: 350, overflow: 'auto', fontFamily: "monospace", fontSize: 13, color: '#D1D5DB' }}>
              {!sentryToken ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, marginTop: 60 }}>
                  <AlertTriangle size={32} style={{ marginBottom: 12 }} />
                  <div>Token required for Sentry Logs.</div>
                </div>
              ) : isLoadingIssues ? (
                <div style={{ opacity: 0.5 }}>Loading logs...</div>
              ) : sentryIssues?.length === 0 ? (
                <div style={{ color: '#34D399', textAlign: 'center', marginTop: 80 }}>All systems operational. No unhandled errors.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {sentryIssues?.map((issue: any) => (
                    <div key={issue.id} style={{ borderLeft: `3px solid ${C.red}`, paddingLeft: 16, paddingBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>
                        <span>{new Date(issue.lastSeen).toLocaleString()}</span>
                        <span style={{ background: '#1F2937', padding: '2px 8px', borderRadius: 4 }}>{issue.project?.name || 'unknown'}</span>
                      </div>
                      <div style={{ color: '#F87171', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{issue.title}</div>
                      <div style={{ color: '#9CA3AF', fontSize: 12 }}>{issue.culprit}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Vercel Deployments */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(26,18,5,0.03)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <Cloud size={18} color={C.sky} />
                <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>Vercel Deployments</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Project Name..."
                  value={vercelProject}
                  onChange={(e) => setVercelProject(e.target.value)}
                  style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, width: 120, background: C.bg, color: C.t1, outline: 'none' }}
                />
                <input
                  type="password"
                  placeholder="Vercel Access Token..."
                  value={vercelToken}
                  onChange={(e) => setVercelToken(e.target.value)}
                  style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, width: 160, background: C.bg, color: C.t1, outline: 'none' }}
                />
              </div>
            </div>
            
            <div style={{ background: C.bg, padding: 24, height: 350, overflow: 'auto' }}>
              {!vercelToken ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, marginTop: 60 }}>
                  <Cloud size={32} style={{ marginBottom: 12 }} />
                  <div>Token required for Vercel Builds.</div>
                </div>
              ) : isLoadingDeployments ? (
                <div style={{ opacity: 0.5 }}>Loading deployments...</div>
              ) : vercelDeployments?.length === 0 ? (
                <div style={{ color: C.t3, textAlign: 'center', marginTop: 80 }}>No deployments found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {vercelDeployments?.map((dep: any) => (
                    <div key={dep.uid} style={{ background: C.surface, border: `1px solid ${C.borderLight}`, padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          {dep.state === 'READY' ? <CheckCircle size={14} color={C.green} /> : dep.state === 'ERROR' ? <XCircle size={14} color={C.red} /> : <RefreshCw size={14} color={C.amber} style={{ animation: 'spin 2s linear infinite' }} />}
                          <span style={{ fontWeight: 700, fontSize: 14, color: C.t1 }}>{dep.name}</span>
                          <span style={{ fontSize: 10, background: C.borderLight, padding: '2px 6px', borderRadius: 12, color: C.t2 }}>{dep.target || 'preview'}</span>
                        </div>
                        <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{new Date(dep.created).toLocaleString()}</div>
                      </div>
                      <a href={`https://${dep.url}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.sky, fontWeight: 600, textDecoration: 'none' }}>
                        Visit Deployment
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* --- SECTION: NETWORK LOGS --- */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: C.t2, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Live Network Logs</h2>
        <div style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(26,18,5,0.03)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <List size={18} color={C.t2} />
              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>HTTP Request Feed</div>
            </div>
            {networkStats?.health && (
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.t2, fontWeight: 600 }}>
                <span style={{ color: C.green }}>{networkStats.health.success} Success</span>
                <span style={{ color: C.amber }}>{networkStats.health.errors4xx} 4xx Errors</span>
                <span style={{ color: C.red }}>{networkStats.health.errors5xx} 5xx Errors</span>
                <span>Avg Latency: {networkStats.health.avgLatency}ms</span>
              </div>
            )}
          </div>
          <div style={{ background: '#111827', height: 400, overflow: 'auto', padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ color: '#9CA3AF', borderBottom: '1px solid #374151' }}>
                  <th style={{ padding: '8px 12px' }}>Time</th>
                  <th style={{ padding: '8px 12px' }}>Method</th>
                  <th style={{ padding: '8px 12px' }}>Path</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px' }}>Latency</th>
                  <th style={{ padding: '8px 12px' }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {networkStats?.logs?.map((log: any) => {
                  const isError = log.status >= 500;
                  const isWarning = log.status >= 400 && log.status < 500;
                  const color = isError ? '#F87171' : isWarning ? '#FBBF24' : '#34D399';
                  
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1F2937', color: '#D1D5DB' }}>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{log.method}</td>
                      <td style={{ padding: '8px 12px' }}>{log.path}</td>
                      <td style={{ padding: '8px 12px', color, fontWeight: 'bold' }}>{log.status}</td>
                      <td style={{ padding: '8px 12px' }}>{log.latency}ms</td>
                      <td style={{ padding: '8px 12px', color: '#9CA3AF' }}>{log.ip}</td>
                    </tr>
                  );
                })}
                {!networkStats?.logs?.length && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                      Listening for incoming requests...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
