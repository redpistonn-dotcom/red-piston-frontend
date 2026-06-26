/**
 * AuditLogPage — Shop audit trail
 *
 * Shows a filterable, paginated table of audit events for the shop:
 *   timestamp | action | entity type | entity ID | user name | IP address
 *
 * API: GET /api/audit/shop?from=YYYY-MM-DD&to=YYYY-MM-DD&entityType=&limit=50&offset=0
 *
 * Auth: standard Bearer token (api.get helper).
 */
import { useState, useEffect, useCallback } from "react";
import { T, FONT, SHADOWS } from "../theme";
import { api } from "../api/client.js";

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

function fmtTs(ts: string | number): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return String(ts); }
}

// ── constants ─────────────────────────────────────────────────────────────────

const ENTITY_TYPES = ["", "ORDER", "INVOICE", "INVENTORY", "PARTY", "PURCHASE", "ADJUSTMENT", "AUTH", "SETTINGS"] as const;

const ENTITY_COLORS: Record<string, string> = {
  ORDER:      "#7C3AED",
  INVOICE:    "#F59E0B",
  INVENTORY:  "#0EA5E9",
  PARTY:      "#10B981",
  PURCHASE:   "#3B82F6",
  ADJUSTMENT: "#F97316",
  AUTH:       "#EF4444",
  SETTINGS:   "#6B7280",
};

const PAGE_SIZE = 50;

// ── types ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string | number;
  timestamp: string | number;
  action: string;
  entityType: string;
  entityId: string | number;
  userName?: string;
  ipAddress?: string;
  detail?: string;
}

// ── component ─────────────────────────────────────────────────────────────────

export function AuditLogPage() {
  const [from, setFrom] = useState(() => daysAgo(7));
  const [to,   setTo]   = useState(() => toDateStr(new Date()));
  const [entityType, setEntityType] = useState("");
  const [offset, setOffset] = useState(0);

  const [rows, setRows]       = useState<AuditEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [hasMore, setHasMore] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async (newOffset = 0) => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {
        from, to,
        limit: String(PAGE_SIZE),
        offset: String(newOffset),
      };
      if (entityType) params.entityType = entityType;

      const res: any = await api.get("/api/audit/shop", params);
      const data: AuditEntry[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      if (newOffset === 0) {
        setRows(data);
      } else {
        setRows(prev => [...(prev ?? []), ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
      setOffset(newOffset);
    } catch (e: any) {
      setError(e?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [from, to, entityType]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchLogs(0);
  }, [from, to, entityType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── render ─────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "6px 10px",
    fontSize: 12, fontFamily: FONT.ui, color: T.t1, background: "#fff",
    outline: "none",
  };

  const entityBadge = (type: string) => (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
      background: `${ENTITY_COLORS[type] ?? T.t3}18`,
      color: ENTITY_COLORS[type] ?? T.t3,
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>{type || "—"}</span>
  );

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>

      {/* Page header */}
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.t1, fontFamily: FONT.display, letterSpacing: "-0.03em" }}>
          Audit Log
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.t3 }}>
          A complete trail of shop activity — orders, invoices, inventory changes, auth events.
        </p>
      </div>

      {/* Filter bar */}
      <div style={{
        background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 18px",
        boxShadow: SHADOWS.xs, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em" }}>From</label>
        <input type="date" value={from} max={to}
          onChange={e => setFrom(e.target.value)} style={inputStyle} />

        <label style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em" }}>To</label>
        <input type="date" value={to} min={from} max={toDateStr(new Date())}
          onChange={e => setTo(e.target.value)} style={inputStyle} />

        <label style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Type</label>
        <select
          value={entityType}
          onChange={e => setEntityType(e.target.value)}
          style={{ ...inputStyle, paddingRight: 24 }}
        >
          <option value="">All Types</option>
          {ENTITY_TYPES.filter(Boolean).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Quick range shortcuts */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          {[["7D", 7], ["30D", 30], ["90D", 90]] .map(([label, days]) => (
            <button
              key={label}
              onClick={() => setFrom(daysAgo(days as number))}
              style={{
                padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.border}`,
                background: "transparent", fontSize: 11, fontWeight: 600,
                color: T.t3, cursor: "pointer", fontFamily: FONT.ui,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#8B1E1E"; e.currentTarget.style.color = "#8B1E1E"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.t3; }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Results card */}
      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: SHADOWS.xs, overflow: "hidden" }}>

        {/* Error state */}
        {error && (
          <div style={{ padding: "20px 20px", background: "rgba(186,26,26,0.05)", borderBottom: `1px solid rgba(186,26,26,0.15)` }}>
            <span style={{ fontSize: 13, color: T.crimson }}>{error}</span>
            <button
              onClick={() => fetchLogs(0)}
              style={{ marginLeft: 12, fontSize: 12, color: "#8B1E1E", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
            >Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && rows === null && (
          <div style={{ padding: 20 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton-shimmer" style={{ height: 44, borderRadius: 8, marginBottom: 8 }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && rows !== null && rows.length === 0 && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.t2 }}>No audit events found</div>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Try expanding the date range or changing the entity type filter.</div>
          </div>
        )}

        {/* Table */}
        {rows !== null && rows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.surfaceContainerLow, borderBottom: `1px solid ${T.border}` }}>
                  {["Timestamp", "Action", "Entity Type", "Entity ID", "User", "IP Address"].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: "left", fontWeight: 700,
                      color: T.t3, whiteSpace: "nowrap", fontFamily: FONT.ui,
                      fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.id ?? i}
                    style={{ borderBottom: `1px solid ${T.border}` }}
                    className="row-hover"
                  >
                    <td style={{ padding: "10px 14px", color: T.t3, whiteSpace: "nowrap", fontFamily: FONT.mono, fontSize: 11 }}>
                      {fmtTs(r.timestamp)}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: T.t1, whiteSpace: "nowrap" }}>
                      {r.action}
                      {r.detail && (
                        <div style={{ fontSize: 11, color: T.t3, fontWeight: 400, marginTop: 1, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.detail}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>{entityBadge(r.entityType)}</td>
                    <td style={{ padding: "10px 14px", fontFamily: FONT.mono, color: T.t2, fontSize: 11 }}>{r.entityId ?? "—"}</td>
                    <td style={{ padding: "10px 14px", color: T.t2, whiteSpace: "nowrap" }}>{r.userName ?? "—"}</td>
                    <td style={{ padding: "10px 14px", fontFamily: FONT.mono, color: T.t3, fontSize: 11 }}>{r.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}`, textAlign: "center" }}>
            <button
              onClick={() => fetchLogs(offset + PAGE_SIZE)}
              disabled={loading}
              style={{
                background: loading ? T.surfaceContainerLow : "#8B1E1E",
                color: loading ? T.t3 : "#fff",
                border: "none", borderRadius: 10, padding: "9px 24px",
                fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: FONT.ui,
              }}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        )}

        {/* Row count footer */}
        {rows !== null && rows.length > 0 && (
          <div style={{ padding: "10px 18px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: T.t3 }}>Showing {rows.length} event{rows.length !== 1 ? "s" : ""}</span>
            {loading && <span style={{ fontSize: 11, color: T.t3, fontStyle: "italic" }}>Loading…</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLogPage;
