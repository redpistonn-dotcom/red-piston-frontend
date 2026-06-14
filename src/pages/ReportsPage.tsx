import { useMemo, useState, useContext } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts";
import { T, FONT, SHADOWS } from "../theme";
import {
    fmt, fmtDate, pct, getDebtAging,
    downloadCSV, generateCSV, stockStatus, inDateRange,
} from "../utils";
import { Btn, ChartTip, Skeleton } from "../components/ui";
import { GRID_PROPS, AXIS_PROPS, YAXIS_PROPS, AREA_ANIMATION } from "../components/charts/ChartTheme";
import { useStore } from "../store";
import { AppCtx } from "../AppCtx";
import { useShopMarketplaceSales } from "../hooks/useShopMarketplaceSales";

// ─── Tiny helpers ────────────────────────────────────────────────────────────
function KpiCard({
    label, value, sub, trend, icon, trendUp,
}: {
    label: string; value: string; sub?: string;
    trend?: string; icon: string; trendUp?: boolean;
}) {
    return (
        <div className="card-hover" style={{
            background: "#FFFFFF", border: `1px solid ${T.border}`,
            borderRadius: 16, padding: "20px 20px 18px",
            display: "flex", flexDirection: "column", gap: 10,
            boxShadow: SHADOWS.xs, minWidth: 0,
        }}>
            {/* top row: icon + trend badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: T.amberGlow, border: `1px solid rgba(139,30,30,0.12)`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>{icon}</div>
                {trend && (
                    <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: trendUp ? T.emerald : T.crimson,
                        background: trendUp ? T.emeraldBg : T.crimsonBg,
                        padding: "2px 8px", borderRadius: 20,
                        fontFamily: FONT.mono,
                    }}>{trend}</span>
                )}
                {sub && !trend && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, color: T.amber,
                        background: T.amberGlow, padding: "2px 8px", borderRadius: 6,
                        fontFamily: FONT.ui, textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>{sub}</span>
                )}
            </div>
            {/* label */}
            <div style={{ fontSize: 11, fontWeight: 600, color: T.t3, fontFamily: FONT.ui, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
            {/* value */}
            <div style={{ fontSize: "clamp(18px,2vw,26px)", fontWeight: 800, color: T.t1, fontFamily: FONT.mono, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{value}</div>
        </div>
    );
}

// Custom tooltip for Recharts
// Removed local ChartTooltip — using shared glassmorphism ChartTip from ui/

// ─── Main Component ───────────────────────────────────────────────────────────
export function ReportsPage() {
    const { movements, products, activeShopId, auditLog, apiSynced } = useStore();
    const { toast } = useContext(AppCtx);

    const [chartMode, setChartMode] = useState<"Weekly" | "Monthly">("Weekly");
    const [reportType, setReportType] = useState("Sales Summary");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [includeSubAccts, setIncludeSubAccts] = useState(true);
    const [applyGst, setApplyGst] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Marketplace sales (non-cancelled) count as revenue from order placement;
    // cancelled orders are surfaced separately in the cancellation analysis.
    const { saleMovements: mpSales, cancelled, refresh: refreshMpSales } = useShopMarketplaceSales(activeShopId);
    const shopMovements = useMemo(
        () => [...movements.filter(m => m.shopId === activeShopId), ...mpSales],
        [movements, activeShopId, mpSales],
    );
    const shopProducts = useMemo(
        () => (products || []).filter(p => p.shopId === activeShopId),
        [products, activeShopId],
    );

    // ── KPI stats ──────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const now = Date.now();
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

        let totalSales = 0, monthSales = 0, totalPurchases = 0;
        let pnl = 0;
        const catSales: Record<string, number> = {};
        const customerSet = new Set<string>();

        shopMovements.forEach(m => {
            if (m.type === "SALE") {
                totalSales += m.total;
                pnl += m.profit || 0;
                if (m.date >= monthStart) {
                    monthSales += m.total;
                    if (m.customerName) customerSet.add(m.customerName);
                }
                const prod = shopProducts.find(p => p.id === m.productId);
                const cat = prod?.category || "General";
                catSales[cat] = (catSales[cat] || 0) + m.total;
            } else if (m.type === "PURCHASE") {
                totalPurchases += m.total;
            }
        });

        const topCat = Object.entries(catSales).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
        const topCatSales = catSales[topCat] || 0;
        const invValue = shopProducts.reduce((s, p) => s + p.buyPrice * p.stock, 0);

        return {
            monthSales, totalSales, totalPurchases, pnl,
            topCat, topCatSales,
            activeCustomers: customerSet.size,
            invValue,
        };
    }, [shopMovements, shopProducts]);

    // ── Chart data ────────────────────────────────────────────────────────
    const chartData = useMemo(() => {
        if (chartMode === "Weekly") {
            const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const todayDow = (today.getDay() + 6) % 7; // 0=Mon
            return DAYS.map((day, i) => {
                const offset = todayDow - i;
                const d = new Date(today); d.setDate(d.getDate() - offset);
                const ds = d.getTime(); const de = ds + 86399999;
                const Sales = shopMovements.filter(m => m.type === "SALE" && m.date >= ds && m.date <= de).reduce((s, m) => s + m.total, 0);
                const Expense = shopMovements.filter(m => m.type === "PURCHASE" && m.date >= ds && m.date <= de).reduce((s, m) => s + m.total, 0);
                return { day, Sales, Expense };
            });
        } else {
            return [1, 2, 3, 4].map(week => {
                const ws = new Date(); ws.setDate(ws.getDate() - (4 - week) * 7); ws.setHours(0, 0, 0, 0);
                const we = new Date(ws); we.setDate(we.getDate() + 6); we.setHours(23, 59, 59, 999);
                const Sales = shopMovements.filter(m => m.type === "SALE" && m.date >= ws.getTime() && m.date <= we.getTime()).reduce((s, m) => s + m.total, 0);
                const Expense = shopMovements.filter(m => m.type === "PURCHASE" && m.date >= ws.getTime() && m.date <= we.getTime()).reduce((s, m) => s + m.total, 0);
                return { day: `Week ${week}`, Sales, Expense };
            });
        }
    }, [shopMovements, chartMode]);

    // ── Recent logs ───────────────────────────────────────────────────────
    const recentLogs = useMemo(() =>
        [...shopMovements].sort((a, b) => b.date - a.date).slice(0, 12).map(m => {
            const isIn = m.type === "SALE";
            return {
                time: fmtDate(m.date),
                type: m.type,
                detail: m.type === "SALE"
                    ? `${m.productName || "Sale"} · ${m.customerName || "Walk-in"}`
                    : m.type === "PURCHASE"
                        ? `${m.productName || "Purchase"} · ${m.supplierName || "Supplier"}`
                        : `${m.type}`,
                amount: m.total,
                color: isIn ? T.emerald : T.amber,
                sign: isIn ? "+" : "-",
            };
        })
    , [shopMovements]);

    // ── Report generation ─────────────────────────────────────────────────
    const handleGeneratePDF = () => {
        setGenerating(true);
        setTimeout(() => {
            window.print();
            setGenerating(false);
            toast?.(`${reportType} report generated!`, "success", "📄 Report");
        }, 400);
    };

    const handleExportCSV = () => {
        // Shared timezone-correct range filter (parses YYYY-MM-DD as local midnight).
        const filtered = shopMovements.filter(m => inDateRange(m.date, dateFrom, dateTo));

        if (reportType === "Sales Summary" || reportType === "P&L Statement") {
            const headers = ["Date", "Type", "Product", "Customer/Supplier", "Qty", "Total", "Profit"];
            const rows = filtered.map(m => [fmtDate(m.date), m.type, m.productName || "", m.customerName || m.supplierName || "", m.qty || 1, m.total, m.profit || 0]);
            downloadCSV(`${reportType.replace(/\s/g, "_")}_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
        } else if (reportType === "Inventory Valuation") {
            const headers = ["SKU", "Product", "Category", "Stock", "Buy Price", "Cost Value", "Sell Price"];
            const rows = shopProducts.map(p => [p.sku, p.name, p.category, p.stock, p.buyPrice, p.buyPrice * p.stock, p.sellPrice]);
            downloadCSV(`Inventory_Valuation_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
        } else {
            const headers = ["Date", "Type", "Product", "Total", "GST Amount"];
            const rows = filtered.map(m => [fmtDate(m.date), m.type, m.productName || "", m.total, m.gstAmount || 0]);
            downloadCSV(`${reportType.replace(/\s/g, "_")}_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
        }
        toast?.("CSV exported!", "success");
    };

    // ─────────────────────────────────────────────────────────────────────
    // First-load skeleton: show until the initial API sync brings data in.
    if (!apiSynced && shopMovements.length === 0 && shopProducts.length === 0) {
        return <Skeleton.Page kpis={4} chart cols={6} />;
    }

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── HEADER ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0, letterSpacing: "-0.03em" }}>Reports Dashboard</h1>
                    <p style={{ fontSize: 13, color: T.t3, margin: "5px 0 0", fontFamily: FONT.ui }}>
                        Comprehensive analytics and <span style={{ color: T.amber }}>industrial performance</span> tracking.
                    </p>
                </div>
                <div className="rpt-header-actions" style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                    <button
                        onClick={handleExportCSV}
                        style={{ height: 40, padding: "0 18px", background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t1, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 7 }}
                    >
                        <span style={{ fontSize: 15 }}>↓</span> Export All
                    </button>
                    <button
                        onClick={() => { refreshMpSales(); toast?.("Data refreshed!", "success", "🔄 Sync"); }}
                        style={{ height: 40, padding: "0 18px", background: T.amber, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 7 }}
                    >
                        <span style={{ fontSize: 15 }}>↺</span> Update Data
                    </button>
                </div>
            </div>

            {/* ── KPI CARDS (4 cards) ── */}
            <div className="kpi-grid-4" style={{ display: "grid" }}>
                <KpiCard
                    label="Monthly Revenue"
                    value={fmt(stats.monthSales)}
                    trend="+12.4% ↑"
                    trendUp={true}
                    icon="📈"
                />
                <KpiCard
                    label="Top Category"
                    value={stats.topCat}
                    sub="Hydraulics"
                    icon="🏆"
                />
                <KpiCard
                    label="Active Customers"
                    value={String(stats.activeCustomers || 0)}
                    trend="+4.6 ↑"
                    trendUp={true}
                    icon="👥"
                />
                <KpiCard
                    label="Inventory Value"
                    value={stats.invValue >= 1_000_000
                        ? `$${(stats.invValue / 1_000_000).toFixed(2)}M`
                        : fmt(stats.invValue)}
                    trend="-2.1% ↓"
                    trendUp={false}
                    icon="📦"
                />
            </div>

            {/* ── CANCELLED ORDERS ANALYSIS ── */}
            <div style={{
                background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14,
                padding: "16px 20px", display: "flex", alignItems: "center", gap: 20,
                flexWrap: "wrap", boxShadow: SHADOWS.xs,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 10, background: T.crimsonBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚫</span>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.ui }}>Cancelled Orders</div>
                        <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.ui }}>Marketplace cancellations &amp; returns</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: T.crimson, fontFamily: FONT.mono, letterSpacing: "-0.03em" }}>{cancelled.count}</div>
                        <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>orders</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: T.crimson, fontFamily: FONT.mono, letterSpacing: "-0.03em" }}>{fmt(cancelled.total)}</div>
                        <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>lost revenue</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: T.t2, fontFamily: FONT.mono, letterSpacing: "-0.03em" }}>
                            {(() => {
                                const denom = stats.totalSales + cancelled.total;
                                return denom > 0 ? `${((cancelled.total / denom) * 100).toFixed(1)}%` : "0%";
                            })()}
                        </div>
                        <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>cancellation rate</div>
                    </div>
                </div>
                {cancelled.count === 0 && (
                    <span style={{ fontSize: 12, color: T.emerald, fontWeight: 600, fontFamily: FONT.ui, marginLeft: "auto" }}>
                        ✓ No cancellations in this period
                    </span>
                )}
            </div>

            {/* ── MAIN TWO-COLUMN ── */}
            <div className="rp-grid-2" style={{ alignItems: "start" }}>

                {/* LEFT: Analytics Overview chart card */}
                <div className="rpt-card" style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    {/* Card header */}
                    <div className="rpt-chart-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: T.t1, fontFamily: FONT.display }}>Analytics Overview</div>
                            <div style={{ fontSize: 11, color: T.t3, marginTop: 3, fontFamily: FONT.ui }}>
                                Sales performance vs. operational overhead
                            </div>
                        </div>
                        {/* Weekly / Monthly toggle */}
                        <div style={{ display: "flex", background: T.surfaceContainerHigh, borderRadius: 8, padding: 3, gap: 2 }}>
                            {(["Weekly", "Monthly"] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setChartMode(m)}
                                    style={{
                                        padding: "5px 14px", borderRadius: 6, border: "none",
                                        background: chartMode === m ? "#FFFFFF" : "transparent",
                                        color: chartMode === m ? T.amber : T.t2,
                                        fontSize: 12, fontWeight: chartMode === m ? 700 : 500,
                                        cursor: "pointer", fontFamily: FONT.ui,
                                        boxShadow: chartMode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                                        transition: "all 0.15s",
                                    }}
                                >{m}</button>
                            ))}
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="rpt-chart" style={{ marginTop: 24, height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={T.amber} stopOpacity={0.18} />
                                        <stop offset="95%" stopColor={T.amber} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#64748B" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#64748B" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid {...GRID_PROPS} />
                                <XAxis dataKey="day" {...AXIS_PROPS} />
                                <YAxis {...YAXIS_PROPS} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                                <Tooltip content={<ChartTip />} />
                                <Area
                                    type="monotone" dataKey="Sales"
                                    stroke={T.amber} strokeWidth={2.5}
                                    fill="url(#salesGrad)"
                                    dot={false} activeDot={{ r: 5, fill: T.amber, stroke: "#fff", strokeWidth: 2 }}
                                    {...AREA_ANIMATION}
                                />
                                <Area
                                    type="monotone" dataKey="Expense"
                                    stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 3"
                                    fill="url(#expGrad)"
                                    dot={false} activeDot={{ r: 4, fill: "#94A3B8", stroke: "#fff", strokeWidth: 2 }}
                                    {...AREA_ANIMATION}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div style={{ display: "flex", gap: 20, marginTop: 8, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                        {[["Sales Revenue", T.amber, "solid"], ["Operating Expense", "#94A3B8", "dashed"]].map(([l, c, style]) => (
                            <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 20, height: 2, background: c as string, borderRadius: 2, borderTop: style === "dashed" ? `2px dashed ${c}` : undefined, backgroundColor: style === "dashed" ? "transparent" : c as string }} />
                                <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>{l}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Generate Report panel */}
                <div className="rpt-card" style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.t1, fontFamily: FONT.display, marginBottom: 4 }}>Generate Report</div>
                    <div style={{ fontSize: 11, color: T.t3, marginBottom: 20, fontFamily: FONT.ui }}>Configure and export custom industrial datasets.</div>

                    {/* Report Type */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: T.t2, fontFamily: FONT.ui, display: "block", marginBottom: 6 }}>Report Type</label>
                        <select
                            value={reportType}
                            onChange={e => setReportType(e.target.value)}
                            style={{
                                width: "100%", height: 40,
                                background: "#FFFFFF", border: `1px solid ${T.border}`,
                                borderRadius: 10, padding: "0 12px",
                                fontSize: 13, color: T.t1, fontFamily: FONT.ui,
                                cursor: "pointer", outline: "none",
                                appearance: "none",
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%238B716E' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
                            }}
                        >
                            {["Sales Summary", "P&L Statement", "GST Report", "Inventory Valuation", "Party Ledger", "Audit Log"].map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: T.t2, fontFamily: FONT.ui, display: "block", marginBottom: 6 }}>Date Range</label>
                        <div className="rpt-date-row" style={{ display: "flex", gap: 8 }}>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="dd-mm-yyyy"
                                style={{ flex: 1, height: 38, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 10px", fontSize: 12, color: T.t1, fontFamily: FONT.ui, outline: "none" }}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }}
                            />
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="dd-mm-yyyy"
                                style={{ flex: 1, height: 38, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 10px", fontSize: 12, color: T.t1, fontFamily: FONT.ui, outline: "none" }}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }}
                            />
                        </div>
                    </div>

                    {/* Checkboxes */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
                        {[
                            ["Include Sub-Accounts", includeSubAccts, setIncludeSubAccts],
                            ["Apply GST calculations", applyGst, setApplyGst],
                        ].map(([label, val, setter]) => (
                            <label key={label as string} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                                <div
                                    onClick={() => (setter as (v: boolean) => void)(!(val as boolean))}
                                    style={{
                                        width: 18, height: 18, borderRadius: 5,
                                        border: `2px solid ${val ? T.amber : T.border}`,
                                        background: val ? T.amber : "#FFFFFF",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        flexShrink: 0, cursor: "pointer", transition: "all 0.15s",
                                    }}
                                >
                                    {val && <span style={{ color: "#fff", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                                </div>
                                <span style={{ fontSize: 13, color: T.t1, fontFamily: FONT.ui }}>{label as string}</span>
                            </label>
                        ))}
                    </div>

                    {/* Generate PDF */}
                    <button
                        onClick={handleGeneratePDF}
                        disabled={generating}
                        style={{
                            width: "100%", height: 42, background: T.amber, border: "none",
                            borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#FFFFFF",
                            cursor: "pointer", fontFamily: FONT.ui, marginBottom: 10,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            opacity: generating ? 0.7 : 1, transition: "opacity 0.15s",
                        }}
                    >
                        <span style={{ fontSize: 16 }}>📄</span> Generate PDF Report
                    </button>

                    {/* Export CSV */}
                    <button
                        onClick={handleExportCSV}
                        style={{
                            width: "100%", height: 42, background: "#FFFFFF",
                            border: `1px solid ${T.border}`, borderRadius: 10,
                            fontSize: 13, fontWeight: 600, color: T.t1,
                            cursor: "pointer", fontFamily: FONT.ui,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t1; }}
                    >
                        <span style={{ fontSize: 15 }}>⊞</span> Export as CSV
                    </button>
                </div>
            </div>

            {/* ── RECENT PERFORMANCE LOGS ── */}
            <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {/* Section header */}
                <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.t1, fontFamily: FONT.display }}>Recent Performance Logs</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.emerald }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.emerald, fontFamily: FONT.ui }}>Live Processing</span>
                    </div>
                </div>

                {recentLogs.length === 0 ? (
                    <div style={{ padding: "40px 24px", textAlign: "center", color: T.t3, fontSize: 13 }}>No activity recorded yet. Start by adding sales or purchases.</div>
                ) : (
                    <div className="table-scroll">
                        <table className="rpt-logs-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr>
                                    {["Time", "Type", "Details", "Amount"].map(h => (
                                        <th key={h} className="th-cell" style={{ textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {recentLogs.map((log, i) => (
                                    <tr key={i} className="trow" style={{ borderBottom: i < recentLogs.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                        <td style={{ padding: "12px 20px", fontFamily: FONT.mono, fontSize: 11, color: T.t3, whiteSpace: "nowrap" }}>{log.time}</td>
                                        <td style={{ padding: "12px 20px" }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: log.color, background: `${log.color}12`, padding: "3px 8px", borderRadius: 5, fontFamily: FONT.mono }}>{log.type}</span>
                                        </td>
                                        <td style={{ padding: "12px 20px", color: T.t2, fontSize: 12, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.detail}</td>
                                        <td style={{ padding: "12px 20px", textAlign: "right", fontFamily: FONT.mono, fontWeight: 700, fontSize: 13, color: log.color, whiteSpace: "nowrap" }}>
                                            {log.sign}{fmt(log.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── QUICK STATS STRIP ── */}
            <div className="kpi-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                    { label: "Total Sales Revenue", value: fmt(stats.totalSales), color: T.emerald, icon: "💰" },
                    { label: "Total Purchases (COGS)", value: fmt(stats.totalPurchases), color: T.sky, icon: "📥" },
                    { label: "Gross Profit", value: fmt(stats.pnl), color: T.amber, sub: stats.totalSales ? `${pct(stats.pnl, stats.totalSales)} margin` : "—", icon: "📊" },
                ].map(card => (
                    <div key={card.label} className="card-hover" style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 18 }}>{card.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.ui }}>{card.label}</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: card.color, fontFamily: FONT.mono, letterSpacing: "-0.03em" }}>{card.value}</div>
                        {card.sub && <div style={{ fontSize: 11, color: T.t3, marginTop: 4, fontFamily: FONT.ui }}>{card.sub}</div>}
                    </div>
                ))}
            </div>

        </div>
    );
}
