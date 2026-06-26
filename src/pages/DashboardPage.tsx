import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { T, FONT, SHADOWS } from "../theme";
import { GRID_PROPS, AXIS_PROPS, YAXIS_PROPS, AREA_ANIMATION, PIE_ANIMATION, LEGEND_PROPS, TOOLTIP_STYLE, CHART_COLORS } from "../components/charts/ChartTheme";
import { CATEGORIES, fmt, fmtN, pct, margin } from "../utils";
import { StatCard, ChartTip, Skeleton } from "../components/ui";
import { useStore } from "../store";
import { useShopMarketplaceSales } from "../hooks/useShopMarketplaceSales";
import { getDashboardTrend } from "../api/dashboard";

const PIE_C = CHART_COLORS;

// Format Date object to YYYY-MM-DD string
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Default "from" for custom range = 30 days ago
function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toDateStr(d);
}

export function DashboardPage() {
  const { products, movements, orders, activeShopId, jobCards, parties, vehicles, apiSynced } = useStore();
  const navigate = useNavigate();
  // Legacy onNavigate calls replaced with navigate("/" + p) inline below
  const [period, setPeriod] = useState("30");
  const [profitView, setProfitView] = useState("unit_profit");

  // Custom date range state
  const [customFrom, setCustomFrom] = useState(defaultFrom);
  const [customTo, setCustomTo] = useState(() => toDateStr(new Date()));
  const [showCustom, setShowCustom] = useState(false);

  // Revenue trend data (API-fetched for week/month/custom)
  const [trendData, setTrendData] = useState<Array<{ date: string; revenue: number; profit: number }> | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState(false);

  // Derived date range for the currently active selection
  const activeDateRange = useMemo(() => {
    if (showCustom) return { from: customFrom, to: customTo };
    const to = toDateStr(new Date());
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return { from: toDateStr(d), to };
  }, [showCustom, customFrom, customTo, period]);

  // Fetch revenue trend when period >= 7 days or custom range
  useEffect(() => {
    if (!showCustom && period === "7") return; // skip for 7D — already in chart
    const { from, to } = activeDateRange;
    if (!from || !to || from > to) return;
    let cancelled = false;
    setTrendLoading(true);
    setTrendError(false);
    getDashboardTrend(from, to)
      .then((res: any) => {
        if (!cancelled) {
          const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
          setTrendData(rows.map((r: any) => ({
            date: r.date ?? r.day ?? "",
            revenue: Number(r.revenue ?? r.totalRevenue ?? 0),
            profit: Number(r.profit ?? r.totalProfit ?? 0),
          })));
        }
      })
      .catch(() => { if (!cancelled) setTrendError(true); })
      .finally(() => { if (!cancelled) setTrendLoading(false); });
    return () => { cancelled = true; };
  }, [activeDateRange.from, activeDateRange.to, showCustom, period]);

  const days = +period;
  // Memoized on period change — prevents chartData from re-computing on every render
  const now = useMemo(() => Date.now(), [period]);
  const cutoff = now - days * 86400000;
  const prevCut = now - days * 2 * 86400000;

  // 1. FILTER BY ACTIVE SHOP
  const shopProducts = useMemo(() => (products || []).filter(p => p.shopId === activeShopId), [products, activeShopId]);
  // Fold marketplace sales (non-cancelled orders) into the movement ledger so
  // revenue/units reflect online orders as soon as they're placed.
  const { saleMovements: mpSales } = useShopMarketplaceSales(activeShopId);
  const shopMovements = useMemo(
    () => [...(movements || []).filter(m => m.shopId === activeShopId), ...mpSales],
    [movements, activeShopId, mpSales],
  );

  // 2. TIME FILTERING
  const curMov = useMemo(() => shopMovements.filter(m => m.date >= cutoff), [shopMovements, cutoff]);
  const prevMov = useMemo(() => shopMovements.filter(m => m.date >= prevCut && m.date < cutoff), [shopMovements, prevCut, cutoff]);

  const curSales = useMemo(() => curMov.filter(m => m.type === "SALE"), [curMov]);
  const curPurch = useMemo(() => curMov.filter(m => m.type === "PURCHASE"), [curMov]);

  const revenue = useMemo(() => curSales.reduce((s, m) => s + m.total, 0), [curSales]);
  const expenses = useMemo(() => curPurch.reduce((s, m) => s + m.total, 0), [curPurch]);
  const profit = useMemo(() => curSales.reduce((s, m) => s + (m.profit || 0), 0), [curSales]);
  const units = useMemo(() => curSales.reduce((s, m) => s + m.qty, 0), [curSales]);
  const discounts = useMemo(() => curSales.reduce((s, m) => s + (m.discount || 0), 0), [curSales]);

  const prevRev = useMemo(() => prevMov.filter(m => m.type === "SALE").reduce((s, m) => s + m.total, 0), [prevMov]);
  const prevProf = useMemo(() => prevMov.filter(m => m.type === "SALE").reduce((s, m) => s + (m.profit || 0), 0), [prevMov]);

  const revTrend = prevRev > 0 ? (((revenue - prevRev) / prevRev) * 100).toFixed(0) : null;
  const profTrend = prevProf > 0 ? (((profit - prevProf) / prevProf) * 100).toFixed(0) : null;

  // inventory metrics
  const invValue = useMemo(() => shopProducts.reduce((s, p) => s + ((p.buyPrice || 0) * (p.stock || 0)), 0), [shopProducts]);
  const potProfit = useMemo(() => shopProducts.reduce((s, p) => s + (((p.sellPrice || 0) - (p.buyPrice || 0)) * (p.stock || 0)), 0), [shopProducts]);

  // Accounts Receivable (Udhaar)
  const pendingReceivables = useMemo(() => shopMovements.filter(m => m.type === "SALE" && m.paymentStatus === "pending").reduce((s, m) => s + m.total, 0), [shopMovements]);
  const creditCustomers = useMemo(() => new Set(shopMovements.filter(m => m.type === "SALE" && m.paymentStatus === "pending").map(m => m.customerName)).size, [shopMovements]);

  // Pending Online Orders
  const pendingOrderCount = useMemo(() => (orders || []).filter(o => o.shopId === activeShopId && (o.status === "NEW" || o.status === "placed")).length, [orders, activeShopId]);

  // Sparkline helper
  const sparklineData = (movs, type, numDays = 7) => {
    const points = Array.from({ length: numDays }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (numDays - 1 - i));
      const dayStr = d.toDateString();
      return movs.filter(m => m.type === type && new Date(m.date || m.ts || m.createdAt).toDateString() === dayStr)
        .reduce((s, m) => s + (m.total || m.totalAmount || 0), 0);
    });
    const max = Math.max(...points, 1);
    const w = 60, h = 24;
    const pts = points.map((v, i) => `${(i / (numDays - 1)) * w},${h - (v / max) * h}`).join(" ");
    return pts;
  };

  // Pending Actions
  const pendingActions = useMemo(() => [
    shopProducts.filter(p => (p.stock || 0) <= (p.minStock || 0)).length > 0 && {
      label: `${shopProducts.filter(p => (p.stock || 0) <= (p.minStock || 0)).length} products below reorder level`,
      icon: "⚠", color: T.amber, page: "inventory"
    },
    (orders || []).filter(o => o.status === "NEW" || o.status === "new").length > 0 && {
      label: `${(orders || []).filter(o => o.status === "NEW" || o.status === "new").length} new marketplace orders`,
      icon: "📦", color: T.sky, page: "orders"
    },
    (parties || []).filter(p => (p.outstanding || 0) > 0).length > 0 && {
      label: `${(parties || []).filter(p => (p.outstanding || 0) > 0).length} parties with outstanding dues`,
      icon: "💰", color: T.crimson, page: "parties"
    }
  ].filter(Boolean).slice(0, 3), [shopProducts, orders, parties]);

  // per-product stats
  const prodStats = useMemo(() =>
    shopProducts.map(p => {
      const s = curSales.filter(m => m.productId === p.id);
      const pu = curPurch.filter(m => m.productId === p.id);
      const sold = s.reduce((t, m) => t + m.qty, 0);
      const revP = s.reduce((t, m) => t + m.total, 0);
      const profP = s.reduce((t, m) => t + (m.profit || 0), 0);
      const bought = pu.reduce((t, m) => t + m.qty, 0);
      const spentP = pu.reduce((t, m) => t + m.total, 0);
      const profitPU = p.sellPrice - p.buyPrice;
      const mg = +margin(p.buyPrice, p.sellPrice);
      return { ...p, sold, revP, profP, bought, spentP, profitPU, mg };
    }), [shopProducts, curSales, curPurch]);

  // chart data: daily (≤30D), weekly (90D), monthly (365D)
  const chartData = useMemo(() => {
    const bucket = (start: number, end: number, lbl: string) => {
      const ds = shopMovements.filter(m => m.type === "SALE" && m.date >= start && m.date < end);
      const dp = shopMovements.filter(m => m.type === "PURCHASE" && m.date >= start && m.date < end);
      return { date: lbl, Revenue: ds.reduce((t, m) => t + m.total, 0), Profit: ds.reduce((t, m) => t + (m.profit || 0), 0), Expenses: dp.reduce((t, m) => t + m.total, 0) };
    };
    if (days <= 30) {
      return Array.from({ length: days }, (_, i) => {
        const end = now - i * 86400000;
        const lbl = new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        return bucket(end - 86400000, end, lbl);
      }).reverse();
    }
    if (days <= 90) {
      const weeks = Math.ceil(days / 7);
      return Array.from({ length: weeks }, (_, i) => {
        const end = now - i * 7 * 86400000;
        const lbl = new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        return bucket(end - 7 * 86400000, end, lbl);
      }).reverse();
    }
    // 365D → 12 calendar months
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const lbl = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      return bucket(start, end, lbl);
    }).reverse();
  }, [shopMovements, days, now]);

  // category pie
  const catPie = useMemo(() =>
    CATEGORIES.map(c => ({
      name: c,
      value: curSales.filter(m => shopProducts.find(p => p.id === m.productId)?.category === c).reduce((t, m) => t + m.total, 0)
    })).filter(c => c.value > 0).sort((a, b) => b.value - a.value), [curSales, shopProducts]);

  // sorted profit list
  const sortedProds = [...prodStats].sort((a, b) => {
    if (profitView === "unit_profit") return b.profitPU - a.profitPU;
    if (profitView === "total_profit") return b.profP - a.profP;
    if (profitView === "margin") return b.mg - a.mg;
    if (profitView === "revenue") return b.revP - a.revP;
    return 0;
  });

  // signal
  const signal = p => {
    if (p.profitPU < 0) return { icon: "🔴", label: "Loss Product", color: T.crimson };
    if (p.mg < 10) return { icon: "🟡", label: "Very Low Margin", color: T.amber };
    if (p.sold === 0) return { icon: "💤", label: "No Sales", color: T.t3 };
    if (p.mg > 35 && p.sold > 3) return { icon: "🏆", label: "Star Performer", color: T.emerald };
    if (p.mg > 20) return { icon: "✅", label: "Healthy", color: T.emerald };
    return { icon: "⚡", label: "Average", color: T.sky };
  };

  // First-load skeleton: products === null means the API fetch hasn't completed yet.
  // An empty array [] means a new shop with no products yet — show the empty-state dashboard.
  if (products === null || movements === null) {
    return <Skeleton.Page kpis={6} chart cols={6} />;
  }

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Date Range Picker ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Standard period pills */}
        <div style={{ display: "flex", background: T.surfaceContainerHigh, borderRadius: 8, padding: 3, gap: 2 }}>
          {[["7","7D"],["30","30D"],["90","3M"],["365","1Y"]].map(([v,l]) => (
            <button key={v} onClick={() => { setPeriod(v); setShowCustom(false); }} style={{
              padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: !showCustom && period === v ? 700 : 400,
              background: !showCustom && period === v ? "#FFFFFF" : "transparent",
              color: !showCustom && period === v ? T.amber : T.t3,
              boxShadow: !showCustom && period === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s", fontFamily: FONT.ui,
            }}>{l}</button>
          ))}
          {/* Custom range toggle */}
          <button onClick={() => setShowCustom(s => !s)} style={{
            padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: showCustom ? 700 : 400,
            background: showCustom ? "#FFFFFF" : "transparent",
            color: showCustom ? "#8B1E1E" : T.t3,
            boxShadow: showCustom ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s", fontFamily: FONT.ui,
          }}>Custom</button>
        </div>

        {/* Custom date inputs — shown when Custom is active */}
        {showCustom && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={e => setCustomFrom(e.target.value)}
              style={{
                border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "5px 10px",
                fontSize: 12, fontFamily: FONT.ui, color: T.t1, background: "#fff",
                outline: "none", cursor: "pointer",
              }}
            />
            <span style={{ fontSize: 12, color: T.t3 }}>to</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={toDateStr(new Date())}
              onChange={e => setCustomTo(e.target.value)}
              style={{
                border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "5px 10px",
                fontSize: 12, fontFamily: FONT.ui, color: T.t1, background: "#fff",
                outline: "none", cursor: "pointer",
              }}
            />
            <span style={{ fontSize: 11, color: T.t3, fontStyle: "italic" }}>
              {customFrom && customTo ? `${activeDateRange.from} → ${activeDateRange.to}` : ""}
            </span>
          </div>
        )}
      </div>

      {/* KPIs — responsive grid: 2col mobile → 3col tablet → 6col desktop */}
      <div className="kpi-grid-6" style={{ display: "grid", gap: 12 }}>
        {[
          { label: "Revenue",       value: fmt(revenue),            color: T.amber,   trend: revTrend,  sub: "Total sales"          },
          { label: "Buy Profit",    value: fmt(profit),             color: T.emerald, trend: profTrend, sub: `${pct(profit, revenue)} margin` },
          { label: "Stock Value",   value: fmt(invValue),           color: T.sky,     sub: `${shopProducts.length} SKUs`            },
          { label: "Units Sold",    value: fmtN(units),             color: T.violet,  sub: `${curSales.length} transactions`        },
          { label: "Udhaar",        value: fmt(pendingReceivables), color: T.crimson, sub: `${creditCustomers} customers`           },
          { label: "Active Jobs",   value: String((jobCards||[]).filter(j=>j.shopId===activeShopId&&j.status!=="closed").length), color: "#F59E0B", sub: "Open job cards" },
        ].map(kpi => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} color={kpi.color} trend={kpi.trend} sub={kpi.sub} />
        ))}
      </div>

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px", borderLeft: `3px solid ${T.amber}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: T.t3, marginBottom: 10 }}>Pending Actions</div>
          {pendingActions.map((a, i) => (
            <div key={i} onClick={() => navigate("/" + a.page)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4, transition: "background 0.15s" }}
              className="row-hover">
              <span style={{ fontSize: 16 }}>{a.icon}</span>
              <span style={{ fontSize: 13, color: T.t2, flex: 1 }}>{a.label}</span>
              <span style={{ fontSize: 11, color: a.color, fontWeight: 700 }}>View →</span>
            </div>
          ))}
        </div>
      )}

      {/* TREND CHART */}
      <div className="dash-card" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 20px 12px", boxShadow: SHADOWS.sm }}>
        <div className="dash-card-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.display, letterSpacing: "-0.01em" }}>Performance Intelligence</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{days}-Day Outlook · Revenue, Profit & Expenses</div>
          </div>
          {/* In-page period pills for chart control */}
          <div style={{ display: "flex", background: T.surfaceContainerHigh, borderRadius: 8, padding: 3, gap: 2 }}>
            {[["7","7D"],["30","30D"],["90","3M"],["365","1Y"]].map(([v,l])=>(
              <button key={v} onClick={()=>setPeriod(v)} style={{
                padding:"3px 10px", borderRadius:6, border:"none", cursor:"pointer",
                fontSize:11, fontWeight:period===v?700:400,
                background:period===v?"#FFFFFF":"transparent",
                color:period===v?T.amber:T.t3,
                boxShadow:period===v?"0 1px 3px rgba(0,0,0,0.08)":"none",
                transition:"all 0.15s", fontFamily:FONT.ui,
              }}>{l}</button>
            ))}
          </div>
        </div>
        <div className="chart-container rp-chart-md" style={{ height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              {[[T.amber, "a"], [T.emerald, "e"], [T.crimson, "c"]].map(([c, id]) => (
                <linearGradient key={id} id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.22} /><stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" {...AXIS_PROPS} interval="preserveStartEnd" />
            <YAxis {...YAXIS_PROPS} tickFormatter={v => "₹" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
            <Tooltip content={<ChartTip />} />
            <Legend {...LEGEND_PROPS} />
            <Area type="monotone" dataKey="Revenue" stroke={T.amber} fill="url(#ga)" strokeWidth={2} dot={false} {...AREA_ANIMATION} />
            <Area type="monotone" dataKey="Profit" stroke={T.emerald} fill="url(#ge)" strokeWidth={2} dot={false} {...AREA_ANIMATION} />
            <Area type="monotone" dataKey="Expenses" stroke={T.crimson} fill="url(#gc)" strokeWidth={2} dot={false} strokeDasharray="5 3" {...AREA_ANIMATION} />
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* ── Section divider ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 3, height: 16, background: T.amber, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: T.t2, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.display }}>Product Profit Intelligence</span>
        <div style={{ flex: 1, height: 1, background: T.border }} />
      </div>

      {/* PROFIT INTELLIGENCE TABLE */}
      <div className="dash-card" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: SHADOWS.sm }}>
        <div className="dash-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: T.t3 }}>Product Profit Intelligence</div>
          <div className="dash-filter-pills" style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {[["unit_profit", "Profit/U"], ["margin", "Margin%"], ["total_profit", "Total"], ["revenue", "Revenue"]].map(([v, l]) => (
              <button key={v} onClick={() => setProfitView(v)} style={{ background: profitView === v ? T.amber : "transparent", color: profitView === v ? "#fff" : T.t2, border: `1px solid ${profitView === v ? T.amber : T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="dash-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Product", "Category", "Buy", "Sell", "Profit/Unit", "Margin", "Sold", "Total Profit", "Signal"].map(h => (
                  <th key={h} className="th-cell">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const maxRevenue = Math.max(...sortedProds.map(p => p.revP), 1);
                return sortedProds.map((p, i) => {
                const sig = signal(p);
                return (
                  <tr key={p.id} className="trow" style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 12px", color: T.t4, fontFamily: FONT.mono, fontSize: 12, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</td>
                    <td style={{ padding: "10px 12px", maxWidth: 160 }}>
                      <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                        {p.image?.startsWith("http") ? <img src={p.image} alt="" style={{width: 24, height: 24, borderRadius: 4, objectFit: "cover"}} /> : <span>{p.image}</span>}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                      </div>
                      <div style={{ height: 3, background: `${T.amber}33`, borderRadius: 2, marginTop: 4 }}>
                        <div style={{ height: "100%", background: T.amber, borderRadius: 2, width: `${Math.min(100, (p.revP / Math.max(...sortedProds.map(x => x.revP), 1)) * 100)}%`, opacity: 0.6 }} />
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}><span style={{ background: `${T.amber}14`, color: T.amber, fontSize: 10, padding: "2px 7px", borderRadius: 5, fontWeight: 700 }}>{p.category}</span></td>
                    <td style={{ padding: "10px 12px", color: T.t3, fontFamily: FONT.mono, fontSize: 12 }}>{fmt(p.buyPrice)}</td>
                    <td style={{ padding: "10px 12px", color: T.t1, fontFamily: FONT.mono, fontSize: 12, fontWeight: 700 }}>{fmt(p.sellPrice)}</td>
                    <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontSize: 13, fontWeight: 800, color: p.profitPU > 0 ? T.emerald : T.crimson }}>{fmt(p.profitPU)}</td>
                    <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontSize: 12 }}><span style={{ color: p.mg > 30 ? T.emerald : p.mg > 15 ? T.amber : T.crimson, fontWeight: 700 }}>{p.mg}%</span></td>
                    <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontWeight: 700, color: p.sold > 0 ? T.t1 : T.t4 }}>{p.sold}</td>
                    <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontWeight: 800, color: p.profP > 0 ? T.emerald : T.t4 }}>{p.profP > 0 ? fmt(p.profP) : "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sig.color, fontFamily: FONT.ui, display: "flex", gap: 5, alignItems: "center" }}>
                        {sig.icon} {sig.label}
                      </span>
                    </td>
                  </tr>
                );
              });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Revenue Trend (API-fetched, shown for week/month/custom) ─────────── */}
      {(showCustom || Number(period) >= 14) && (
        <div className="dash-card" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 20px 12px", boxShadow: SHADOWS.sm }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.display, letterSpacing: "-0.01em" }}>Revenue Trend</div>
              <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>
                {showCustom ? `${customFrom} → ${customTo}` : `Last ${period} days`} · Daily Revenue & Profit
              </div>
            </div>
            {trendLoading && (
              <span style={{ fontSize: 11, color: T.t3, fontStyle: "italic" }}>Loading…</span>
            )}
          </div>

          {trendError && (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: T.t3 }}>
              Could not load trend data — the server may still be waking up.
            </div>
          )}

          {!trendError && trendData && trendData.length === 0 && !trendLoading && (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: T.t3 }}>
              No data for this period.
            </div>
          )}

          {!trendError && trendData && trendData.length > 0 && (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} barGap={2}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="date" {...AXIS_PROPS} interval="preserveStartEnd" />
                  <YAxis {...YAXIS_PROPS} tickFormatter={v => "₹" + (v >= 1000 ? (v/1000).toFixed(0)+"k" : v)} />
                  <Tooltip content={<ChartTip />} />
                  <Legend {...LEGEND_PROPS} />
                  <Bar dataKey="revenue" name="Revenue" fill={T.amber} radius={[3,3,0,0]} maxBarSize={32} />
                  <Bar dataKey="profit"  name="Profit"  fill={T.emerald} radius={[3,3,0,0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Fallback table when BarChart has too many rows or no data yet */}
          {!trendError && trendLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="skeleton-shimmer" style={{ height: 80, borderRadius: 6 }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ STITCH BOTTOM 3-PANEL ROW (exact match) ═══
           [Inventory Valuation (white)] [Dead Stock (dark #313030)] [Financial Snapshot (white)]
      */}
      <div className="rp-grid-3" style={{ display: "grid" }}>

        {/* Panel 1: Inventory Valuation — white card */}
        <div className="dash-card" style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: SHADOWS.xs }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontFamily: FONT.ui }}>Inventory Valuation</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: T.t3, marginBottom: 2 }}>Current Stock Cost</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: T.t1, fontFamily: FONT.mono, letterSpacing: "-0.03em" }}>{fmt(invValue)}</div>
          </div>
          <div style={{ height: 1, background: T.border, margin: "12px 0" }} />
          <div>
            <div style={{ fontSize: 11, color: T.t3, marginBottom: 2 }}>Projected Gross (at sell price)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.emerald, fontFamily: FONT.mono, letterSpacing: "-0.03em" }}>{fmt(invValue + potProfit)}</div>
          </div>
          <div style={{ height: 1, background: T.border, margin: "12px 0" }} />
          <div style={{ display: "flex", gap: 8 }}>
            {catPie.slice(0, 3).map((c, i) => (
              <div key={c.name} style={{ flex: 1, background: T.surfaceContainerLow, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 9, color: T.t3, fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{c.name.slice(0, 8)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{fmt(c.value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Dead Stock — dark card (inverseSurface #313030) */}
        <div className="dash-card" style={{ background: "#313030", border: "1px solid #444", borderRadius: 16, padding: 20, boxShadow: SHADOWS.md, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontFamily: FONT.ui }}>Dead Stock</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#FFFFFF", fontFamily: FONT.mono, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {prodStats.filter(p => p.sold === 0 && p.stock > 0).length}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4, fontFamily: FONT.ui }}>Dead Stock Items</div>
          </div>
          <div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "16px 0" }} />
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Capital Stuck</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.crimson, fontFamily: FONT.mono }}>
              {fmt(prodStats.filter(p => p.sold === 0 && p.stock > 0).reduce((s, p) => s + p.buyPrice * p.stock, 0))}
            </div>
            <button
              onClick={() => navigate("/inventory")}
              style={{
                marginTop: 14, width: "100%",
                background: T.crimson, border: "none", borderRadius: 10,
                padding: "10px 0", color: "#fff",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: FONT.ui, letterSpacing: "0.02em",
              }}
            >Put in Stock Clearance</button>
          </div>
        </div>

        {/* Panel 3: Financial Snapshot — white card, 2×2 grid */}
        <div className="dash-card" style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: SHADOWS.xs }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, fontFamily: FONT.ui }}>Financial Snapshot</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Receivable */}
            <div style={{ background: T.emeraldBg, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: T.emerald, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Receivable</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.emerald, fontFamily: FONT.mono }}>{fmt(pendingReceivables)}</div>
              <div style={{ fontSize: 11, color: T.emeraldDim, marginTop: 2 }}>{creditCustomers} customers</div>
            </div>
            {/* Payable */}
            <div style={{ background: T.crimsonBg, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: T.crimson, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Payable</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.crimson, fontFamily: FONT.mono }}>
                {fmt(shopMovements.filter(m=>m.type==="PURCHASE"&&m.paymentStatus==="pending").reduce((s,m)=>s+m.total,0))}
              </div>
              <div style={{ fontSize: 11, color: T.crimsonDim, marginTop: 2 }}>outstanding</div>
            </div>
            {/* Revenue this period */}
            <div style={{ background: T.amberGlow, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: T.amber, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Revenue</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.amber, fontFamily: FONT.mono }}>{fmt(revenue)}</div>
              <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{days}-day period</div>
            </div>
            {/* Gross Profit */}
            <div style={{ background: T.skyBg, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: T.sky, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Gross Profit</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.sky, fontFamily: FONT.mono }}>{fmt(profit)}</div>
              <div style={{ fontSize: 11, color: T.skyDim, marginTop: 2 }}>{pct(profit, revenue)} margin</div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
