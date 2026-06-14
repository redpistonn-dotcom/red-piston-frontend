import React, { useState, useMemo } from "react";
import { MobileCard, MobileCardList, CardField, CardActions, useIsMobile } from "../components/ui";
import { T, FONT, SHADOWS } from "../theme";
import { fmt, pct, fmtDate, fmtTime, getMovementConfig, exportMovementsCSV, inDateRange } from "../utils";
import { useStore } from "../store";
import { useShopMarketplaceSales } from "../hooks/useShopMarketplaceSales";

// ─── Group movements that share the same invoiceNo or batchId ─────────────────
function groupMovements(filtered: any[]) {
    const result: any[] = [];
    const seen = new Map<string, number>();
    for (const m of filtered) {
        const key = m.invoiceNo || m.batchId || null;
        if (key && seen.has(key)) {
            result[seen.get(key)!].items.push(m);
        } else {
            const idx = result.length;
            result.push({ key, items: [m] });
            if (key) seen.set(key, idx);
        }
    }
    return result;
}

// ─── Group row (multi-item invoice) ──────────────────────────────────────────
function GroupRow({ group, isExpanded, onToggle, isLast }: any) {
    const first = group.items[0];
    const cfg = getMovementConfig(first.type);
    const totalAmt = group.items.reduce((s: number, m: any) => s + (m.total || 0), 0);
    const totalProfit = group.items.reduce((s: number, m: any) => s + (m.profit || 0), 0);
    const totalQty = group.items.reduce((s: number, m: any) => s + Math.abs(m.qty || 0), 0);
    const rest = group.items.length - 1;
    const productLabel = rest > 0 ? `${first.productName} +${rest} more` : first.productName;
    const isSupply = first.type === "PURCHASE" || first.type === "OPENING";
    const partyName = isSupply ? (first.supplierName || first.supplier || "—") : (first.customerName || "Walk-in");
    const invoiceDisplay = first.invoiceNo || first.batchId || "—";

    return (
        <React.Fragment>
            <tr className="trow" onClick={onToggle} style={{
                borderBottom: isExpanded ? "none" : (isLast ? "none" : `1px solid ${T.border}`),
                cursor: "pointer",
            }}>
                <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 12, color: T.t1, fontFamily: FONT.mono }}>{fmtDate(first.date)}</div>
                    <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{fmtTime(first.date)}</div>
                </td>
                <td style={{ padding: "12px 14px", maxWidth: 180 }}>
                    <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{productLabel}</div>
                    <div style={{ fontSize: 10, color: T.amber, marginTop: 2, fontFamily: FONT.mono }}>{group.items.length} items · {totalQty} units</div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: "3px 9px", borderRadius: 99, fontWeight: 700, fontFamily: FONT.ui, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 12 }}>{cfg.icon}</span> {cfg.label}
                    </span>
                </td>
                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 900, fontSize: 15, color: cfg.color }}>{cfg.sym}{totalQty}</td>
                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 600, color: T.t1 }}>{totalAmt ? fmt(totalAmt) : <span style={{ color: T.t4 }}>—</span>}</td>
                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 700, color: totalProfit > 0 ? T.emerald : totalProfit < 0 ? T.crimson : T.t4 }}>
                    {totalProfit ? (totalProfit > 0 ? "+" : "") + fmt(totalProfit) : <span style={{ color: T.t4 }}>—</span>}
                </td>
                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 11, color: T.t3 }}>{invoiceDisplay}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: T.t2, maxWidth: 130 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{partyName}</div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                    {(first.payment || first.paymentMode) && (
                        <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>
                            {(first.payment || first.paymentMode) === "Credit" ? <span style={{ color: T.crimson }}>💳 Credit</span> : (first.payment || first.paymentMode)}
                        </span>
                    )}
                </td>
                <td style={{ padding: "12px 14px", fontSize: 11, color: T.amber, textAlign: "center" }}>{isExpanded ? "▲" : "▼"}</td>
            </tr>
            {isExpanded && (
                <tr style={{ background: T.bg }}>
                    <td colSpan={10} style={{ padding: 0, borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ padding: "14px 20px 18px", animation: "fadeIn 0.15s ease" }}>
                            <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                                <span style={{ color: T.amber }}>{group.items.length} Line Items</span>
                                {first.invoiceNo && <span style={{ color: T.sky, fontFamily: FONT.mono }}> · {first.invoiceNo}</span>}
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                        {["Product", "Qty", "Unit Price", "Amount", "Profit", "Note"].map(h => (
                                            <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: T.t4, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.items.map((m: any, i: number) => {
                                        const mc = getMovementConfig(m.type);
                                        return (
                                            <tr key={m.id} style={{ borderBottom: i < group.items.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                                <td style={{ padding: "8px 10px", color: T.t1, fontWeight: 600 }}>{m.productName || "—"}</td>
                                                <td style={{ padding: "8px 10px", fontFamily: FONT.mono, color: mc.color, fontWeight: 700 }}>{mc.sym}{Math.abs(m.qty)}</td>
                                                <td style={{ padding: "8px 10px", fontFamily: FONT.mono, color: T.t2 }}>{m.unitPrice ? fmt(m.unitPrice) : "—"}</td>
                                                <td style={{ padding: "8px 10px", fontFamily: FONT.mono, color: T.amber, fontWeight: 700 }}>{m.total ? fmt(m.total) : "—"}</td>
                                                <td style={{ padding: "8px 10px", fontFamily: FONT.mono, fontWeight: 700, color: (m.profit || 0) > 0 ? T.emerald : (m.profit || 0) < 0 ? T.crimson : T.t4 }}>
                                                    {m.profit ? (m.profit > 0 ? "+" : "") + fmt(m.profit) : "—"}
                                                </td>
                                                <td style={{ padding: "8px 10px", color: T.t3, fontSize: 11 }}>{m.note || "—"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: `1px solid ${T.border}`, background: "#FFFFFF" }}>
                                        <td style={{ padding: "8px 10px", color: T.t3, fontWeight: 700, fontSize: 11 }}>TOTAL</td>
                                        <td style={{ padding: "8px 10px", fontFamily: FONT.mono, fontWeight: 700, color: cfg.color }}>{totalQty} units</td>
                                        <td />
                                        <td style={{ padding: "8px 10px", fontFamily: FONT.mono, fontWeight: 700, color: T.amber }}>{fmt(totalAmt)}</td>
                                        <td style={{ padding: "8px 10px", fontFamily: FONT.mono, fontWeight: 700, color: totalProfit > 0 ? T.emerald : totalProfit < 0 ? T.crimson : T.t4 }}>
                                            {totalProfit ? (totalProfit > 0 ? "+" : "") + fmt(totalProfit) : "—"}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );
}

// ─── Single row ───────────────────────────────────────────────────────────────
function SingleRow({ m, isExpanded, onToggle, isLast }: any) {
    const cfg = getMovementConfig(m.type);
    return (
        <React.Fragment>
            <tr className="trow" onClick={onToggle} style={{
                borderBottom: isExpanded ? "none" : (isLast ? "none" : `1px solid ${T.border}`),
                cursor: "pointer",
            }}>
                <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: 12, color: T.t1, fontFamily: FONT.mono }}>{fmtDate(m.date)}</div>
                    <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{fmtTime(m.date)}</div>
                </td>
                <td style={{ padding: "12px 14px", maxWidth: 160 }}>
                    <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.productName}</div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: "3px 9px", borderRadius: 99, fontWeight: 700, fontFamily: FONT.ui, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 12 }}>{cfg.icon}</span> {cfg.label}
                    </span>
                </td>
                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 900, fontSize: 15, color: cfg.color }}>{cfg.sym}{Math.abs(m.qty)}</td>
                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 600, color: T.t1 }}>{m.total ? fmt(m.total) : <span style={{ color: T.t4 }}>—</span>}</td>
                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 700, color: m.profit > 0 ? T.emerald : m.profit < 0 ? T.crimson : T.t4 }}>
                    {m.profit ? (m.profit > 0 ? "+" : "") + fmt(m.profit) : <span style={{ color: T.t4 }}>—</span>}
                </td>
                <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 11, color: T.t3 }}>{m.invoiceNo || <span style={{ color: T.t4 }}>—</span>}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: T.t2, maxWidth: 130 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {(m.type === "PURCHASE" || m.type === "OPENING") ? (m.supplierName || m.supplier || "—") : (m.customerName || "Walk-in")}
                    </div>
                    {m.vehicleReg && <div style={{ fontSize: 10, color: T.amber, fontFamily: FONT.mono, marginTop: 2 }}>{m.vehicleReg}</div>}
                </td>
                <td style={{ padding: "12px 14px" }}>
                    {(m.payment || m.paymentMode) && (
                        <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>
                            {(m.payment || m.paymentMode) === "Credit" ? <span style={{ color: T.crimson }}>💳 Credit</span> : (m.payment || m.paymentMode)}
                        </span>
                    )}
                </td>
                <td style={{ padding: "12px 14px", fontSize: 11, color: T.t3, maxWidth: 140 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.note || "—"}</span>
                </td>
            </tr>
            {isExpanded && (
                <tr style={{ background: T.bg }}>
                    <td colSpan={10} style={{ padding: 0, borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ padding: "16px 20px 18px", display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.15s ease" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                                {[
                                    { label: "Product", value: m.productName, color: T.t1 },
                                    { label: "Type", value: cfg.label, color: cfg.color },
                                    { label: "Qty", value: `${cfg.sym}${Math.abs(m.qty)} units`, color: cfg.color },
                                    { label: "Amount", value: m.total ? fmt(m.total) : "—", color: T.amber },
                                    { label: "Unit Price", value: m.unitPrice ? fmt(m.unitPrice) : "—", color: T.t2 },
                                    { label: "Profit", value: m.profit ? (m.profit > 0 ? "+" : "") + fmt(m.profit) : "—", color: m.profit > 0 ? T.emerald : m.profit < 0 ? T.crimson : T.t4 },
                                    { label: "Party", value: (m.type === "PURCHASE" || m.type === "OPENING" ? (m.supplierName || m.supplier) : m.customerName) || "—", color: T.t2 },
                                    { label: "Payment", value: m.payment || m.paymentMode || "—", color: T.t2 },
                                    { label: "Invoice #", value: m.invoiceNo || "—", color: T.sky },
                                ].map(({ label, value, color }) => value && value !== "—" ? (
                                    <div key={label} style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px" }}>
                                        <div style={{ fontSize: 9, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
                                    </div>
                                ) : null)}
                            </div>
                            {m.note && (
                                <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px" }}>
                                    <div style={{ fontSize: 9, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Notes</div>
                                    <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.6 }}>{m.note}</div>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </React.Fragment>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, iconBg }: { label: string; value: string; sub: string; icon: string; iconBg: string }) {
    return (
        <div className="card-hover" style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 4, boxShadow: SHADOWS.xs }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui }}>{label}</span>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.t1, fontFamily: FONT.mono, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui, marginTop: 3 }}>{sub}</div>
        </div>
    );
}

// ─── Period helpers ───────────────────────────────────────────────────────────
type Period = "7D" | "30D" | "3M" | "6M" | "1Y";
const PERIODS: { key: Period; label: string }[] = [
    { key: "7D",  label: "7D"  },
    { key: "30D", label: "30D" },
    { key: "3M",  label: "3M"  },
    { key: "6M",  label: "6M"  },
    { key: "1Y",  label: "1Y"  },
];
function periodToMs(p: Period): number {
    const DAY = 86400000;
    return { "7D": 7, "30D": 30, "3M": 90, "6M": 180, "1Y": 365 }[p] * DAY;
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
    { key: "ALL",         label: "All Transactions" },
    { key: "SALE",        label: "Sales"            },
    { key: "PURCHASE",    label: "Purchases"        },
    { key: "ADJUSTMENTS", label: "Returns"          },
    { key: "ESTIMATE",    label: "Adjustments"      },
] as const;

// ─── Main Page ────────────────────────────────────────────────────────────────
export function HistoryPage() {
    const { movements, activeShopId } = useStore();
    const isMobile = useIsMobile();
    const [tab, setTab]             = useState<string>("ALL");
    const [period, setPeriod]       = useState<Period>("7D");
    const [search, setSearch]       = useState("");
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [dateFrom, setDateFrom]   = useState("");
    const [dateTo, setDateTo]       = useState("");
    const [visibleCount, setVisibleCount] = useState(50);

    // Marketplace sales (non-cancelled orders) fold into the movement ledger so
    // they show in History alongside POS movements. Cancelled orders are excluded.
    const { saleMovements: mpSales } = useShopMarketplaceSales(activeShopId);
    const shopMovements = useMemo(
        () => [
            ...(movements || []).filter(m => m.shopId === activeShopId),
            ...mpSales,
        ],
        [movements, activeShopId, mpSales],
    );

    // Apply period quick-filter (overrides manual dates when set)
    const cutoff = useMemo(() => Date.now() - periodToMs(period), [period]);

    const filtered = useMemo(() => {
        return [...shopMovements]
            .sort((a, b) => b.date - a.date)
            .filter(m => {
                // Tab filter
                if (tab === "ADJUSTMENTS") return ["RETURN_IN","RETURN_OUT","CREDIT_NOTE","DEBIT_NOTE","DAMAGE","THEFT","AUDIT","OPENING","TRANSFER_IN","TRANSFER_OUT","ADJUST"].includes(m.type);
                if (tab !== "ALL") return m.type === tab;
                return true;
            })
            .filter(m => {
                // Manual date range takes precedence over the period pills.
                // inDateRange parses YYYY-MM-DD as LOCAL midnight (not UTC) so the
                // "from" boundary doesn't drop the first hours of the day in IST.
                if (!dateFrom && !dateTo) return m.date >= cutoff;
                return inDateRange(m.date, dateFrom, dateTo);
            })
            .filter(m => !search || [m.productName, m.invoiceNo, m.batchId, m.supplier, m.supplierName, m.customerName, m.note].some(s => (s || "").toLowerCase().includes(search.toLowerCase())));
    }, [shopMovements, tab, search, cutoff, dateFrom, dateTo]);

    const groups = useMemo(() => groupMovements(filtered), [filtered]);

    // KPI totals — always from full shopMovements in selected period
    const kpi = useMemo(() => {
        const inPeriod = shopMovements.filter(m => m.date >= cutoff);
        const purchases = inPeriod.filter(m => m.type === "PURCHASE");
        const sales     = inPeriod.filter(m => m.type === "SALE");
        const adj       = inPeriod.filter(m => !["PURCHASE","SALE","ESTIMATE","RECEIPT","PAYMENT"].includes(m.type));
        return {
            purchaseTotal: purchases.reduce((s, m) => s + (m.total || 0), 0),
            purchaseCount: purchases.length,
            salesTotal:    sales.reduce((s, m) => s + (m.total || 0), 0),
            salesCount:    sales.length,
            profit:        sales.reduce((s, m) => s + (m.profit || 0), 0),
            salesTot:      sales.reduce((s, m) => s + (m.total || 0), 0),
            adjCount:      adj.length,
        };
    }, [shopMovements, cutoff]);

    const VERSION = "V4.6.1-STABLE";

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: "calc(100vh - 80px)" }}>

            {/* ── 4 KPI CARDS ── */}
            <div className="kpi-grid-4" style={{ display: "grid", gap: 14 }}>
                <KpiCard label="Total Purchases" value={fmt(kpi.purchaseTotal)} sub={`${kpi.purchaseCount} entries found`}  icon="📥" iconBg={T.skyBg} />
                <KpiCard label="Total Sales"     value={fmt(kpi.salesTotal)}    sub={`${kpi.salesCount} transactions`}     icon="📤" iconBg={T.amberGlow} />
                <KpiCard label="Total Profit"    value={fmt(kpi.profit)}        sub={pct(kpi.profit, kpi.salesTot) + " margin"} icon="📈" iconBg={T.emeraldBg} />
                <KpiCard label="Adjustments"     value={String(kpi.adjCount)}   sub="Returns, damages, audits"              icon="⚖️" iconBg={T.violetBg} />
            </div>

            {/* ── AUDIT TRAIL BANNER ── */}
            <div style={{
                background: T.surfaceContainerLow,
                border: `1px solid ${T.border}`,
                borderRadius: 10, padding: "10px 16px",
                display: "flex", alignItems: "center", gap: 10,
            }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>🔒</span>
                <span style={{ fontSize: 13, color: T.t2, fontFamily: FONT.ui }}>
                    Permanent audit trail — all entries are non-editable and auto-logged for accountability.
                </span>
            </div>

            {/* ── PERIOD PILLS + SEARCH + DATE RANGE + EXPORT ── */}
            <div className="hist-filters" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {/* Period pills */}
                <div className="hist-periods" style={{ display: "flex", background: T.surfaceContainerLow, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2, flexShrink: 0 }}>
                    {PERIODS.map(p => {
                        const active = period === p.key && !dateFrom && !dateTo;
                        return (
                            <button key={p.key} onClick={() => { setPeriod(p.key); setDateFrom(""); setDateTo(""); }} style={{
                                height: 28, padding: "0 12px", borderRadius: 7, border: "none",
                                background: active ? "#1C1B1B" : "transparent",
                                color: active ? "#FFFFFF" : T.t3,
                                fontSize: 12, fontWeight: active ? 700 : 500,
                                cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.12s",
                            }}>{p.label}</button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="hist-search" style={{ flex: 1, minWidth: 200, position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.t3, pointerEvents: "none" }}>🔍</span>
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search product, invoice, customer..."
                        style={{ width: "100%", height: 36, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 12px 0 32px", fontSize: 13, color: T.t1, fontFamily: FONT.ui, outline: "none", background: "#FFFFFF", boxSizing: "border-box" }}
                        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }}
                    />
                </div>

                {/* Date range */}
                <div className="hist-dates" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        style={{ height: 36, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 10px", color: T.t1, fontFamily: FONT.ui, fontSize: 12, outline: "none", background: "#FFFFFF", boxSizing: "border-box" }} />
                    <span className="hist-dates-sep" style={{ fontSize: 11, color: T.t3 }}>to</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        style={{ height: 36, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 10px", color: T.t1, fontFamily: FONT.ui, fontSize: 12, outline: "none", background: "#FFFFFF", boxSizing: "border-box" }} />
                </div>

                {/* Export CSV */}
                <button className="hist-export" onClick={() => exportMovementsCSV(filtered)}
                    style={{ height: 36, padding: "0 16px", background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.t2, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 6, flexShrink: 0, transition: "all 0.12s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t2; }}>
                    ⬇ Export CSV
                </button>
            </div>

            {/* ── TAB BAR + TABLE ── */}
            <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOWS.xs, flex: 1 }}>

                {/* Tab row */}
                <div className="hist-tabs" style={{ display: "flex", borderBottom: `1px solid ${T.border}`, paddingLeft: 4 }}>
                    {TABS.map(t => {
                        const active = tab === t.key;
                        return (
                            <button key={t.key} onClick={() => setTab(t.key)} style={{
                                height: 46, padding: "0 18px",
                                background: "none", border: "none",
                                borderBottom: active ? `2px solid ${T.amber}` : "2px solid transparent",
                                marginBottom: -1,
                                color: active ? T.amber : T.t3,
                                fontSize: 13, fontWeight: active ? 700 : 500,
                                cursor: "pointer", fontFamily: FONT.ui,
                                transition: "all 0.15s", whiteSpace: "nowrap",
                            }}>{t.label}</button>
                        );
                    })}
                </div>

                {/* ── MOBILE CARD VIEW ── */}
                {isMobile && groups.length === 0 && (
                    <div style={{ padding: "48px 24px 56px", textAlign: "center" }}>
                        <div style={{ width: 88, height: 88, borderRadius: "50%", background: T.surfaceContainerLow, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 16px", opacity: 0.7 }}>⊞</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 6 }}>No records found</div>
                        <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.6, maxWidth: 260, margin: "0 auto 18px" }}>
                            Try adjusting your filters or date range to find specific transaction logs.
                        </div>
                        <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setTab("ALL"); }}
                            style={{ background: T.surfaceContainerLow, border: `1px solid ${T.border}`, borderRadius: 99, padding: "9px 22px", fontSize: 12, fontWeight: 700, color: T.t2, cursor: "pointer", fontFamily: FONT.ui }}>
                            Clear all filters
                        </button>
                    </div>
                )}
                {isMobile && groups.length > 0 && (
                    <MobileCardList>
                        {groups.slice(0, visibleCount).map((group) => {
                            const first = group.items[0];
                            const cfg = getMovementConfig(first.type);
                            const totalAmt = group.items.reduce((s: number, m: any) => s + (m.total || 0), 0);
                            const totalProfit = group.items.reduce((s: number, m: any) => s + (m.profit || 0), 0);
                            const totalQty = group.items.reduce((s: number, m: any) => s + Math.abs(m.qty || 0), 0);
                            const isSupply = first.type === "PURCHASE" || first.type === "OPENING";
                            const partyName = isSupply ? (first.supplierName || first.supplier || "—") : (first.customerName || "Walk-in");
                            const invoiceDisplay = first.invoiceNo || first.batchId || "—";
                            const productLabel = group.items.length > 1 ? `${first.productName} +${group.items.length - 1} more` : first.productName;
                            return (
                                <MobileCard key={group.key || first.id} accent={cfg.color}>
                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.t3 }}>{fmtDate(first.date)}</span>
                                        <span style={{ background: cfg.bg, color: cfg.color, fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
                                            {cfg.icon} {cfg.label}
                                        </span>
                                    </div>
                                    <CardField label="Product" value={productLabel} bold width="full" />
                                    <CardField label="Qty" value={`${cfg.sym}${totalQty}`} color={cfg.color} mono />
                                    <CardField label="Amount" value={totalAmt ? fmt(totalAmt) : "—"} mono />
                                    <CardField label="Profit" value={totalProfit ? (totalProfit > 0 ? "+" : "") + fmt(totalProfit) : "—"} color={totalProfit > 0 ? T.emerald : totalProfit < 0 ? T.crimson : T.t4} mono />
                                    <CardField label="Party" value={partyName} />
                                    {invoiceDisplay !== "—" && <CardField label="Invoice" value={invoiceDisplay} mono />}
                                </MobileCard>
                            );
                        })}
                    </MobileCardList>
                )}

                {/* ── DESKTOP TABLE ── */}
                {!isMobile && <div className="table-scroll">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr>
                                {["Date & Time", "Product / Items", "Type", "Qty", "Amount", "Profit", "Invoice", "Party", "Payment", "Details"].map(h => (
                                    <th key={h} className="th-cell">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {groups.length === 0 ? (
                                <tr>
                                    <td colSpan={10} style={{ padding: "64px 24px", textAlign: "center" }}>
                                        <div style={{ width: 72, height: 72, borderRadius: "50%", background: T.surfaceContainerLow, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 18px", opacity: 0.6 }}>⊞</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: T.t2, marginBottom: 6 }}>No records found</div>
                                        <div style={{ fontSize: 12, color: T.t3, maxWidth: 280, margin: "0 auto", lineHeight: 1.6 }}>
                                            Try adjusting your filters, selecting a different date range, or verifying the active shop.
                                        </div>
                                    </td>
                                </tr>
                            ) : (() => {
                                const now = new Date();
                                const todayStr = now.toDateString();
                                const yesterdayStr = new Date(now.getTime() - 86400000).toDateString();
                                let lastDateGroup = "";
                                return groups.slice(0, visibleCount).map((group, i) => {
                                    const firstDate = new Date(group.items[0].date);
                                    const dateStr = firstDate.toDateString();
                                    let dateGroupLabel = "";
                                    if (dateStr !== lastDateGroup) {
                                        lastDateGroup = dateStr;
                                        if (dateStr === todayStr) dateGroupLabel = "Today";
                                        else if (dateStr === yesterdayStr) dateGroupLabel = "Yesterday";
                                        else dateGroupLabel = firstDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
                                    }
                                    const rowKey = group.key || group.items[0].id;
                                    const isExpanded = expandedKey === rowKey;
                                    const toggle = () => setExpandedKey(isExpanded ? null : rowKey);
                                    const isLast = i === Math.min(visibleCount, groups.length) - 1;
                                    return (
                                        <React.Fragment key={rowKey}>
                                            {dateGroupLabel && (
                                                <tr>
                                                    <td colSpan={10} style={{ padding: "10px 14px 6px", background: T.surfaceContainerLow, borderBottom: `1px solid ${T.border}` }}>
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: "0.09em" }}>{dateGroupLabel}</span>
                                                    </td>
                                                </tr>
                                            )}
                                            {group.items.length > 1
                                                ? <GroupRow group={group} isExpanded={isExpanded} onToggle={toggle} isLast={isLast} />
                                                : <SingleRow m={group.items[0]} isExpanded={isExpanded} onToggle={toggle} isLast={isLast} />
                                            }
                                        </React.Fragment>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>}

                {/* Load more */}
                {visibleCount < groups.length && (
                    <div style={{ textAlign: "center", padding: "14px 0", borderTop: `1px solid ${T.border}` }}>
                        <button onClick={() => setVisibleCount(v => v + 50)}
                            style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 22px", color: T.t3, fontSize: 13, cursor: "pointer", fontFamily: FONT.ui }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t3; }}>
                            Load 50 more ({groups.length - visibleCount} remaining)
                        </button>
                    </div>
                )}
            </div>

            {/* ── FOOTER STATUS BAR ── */}
            <div className="hist-footer" style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 4px", flexShrink: 0,
            }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.ui }}>
                    Showing {Math.min(visibleCount, groups.length)} of {groups.length} total entries
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.emerald, fontFamily: FONT.mono, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.emerald, display: "inline-block", flexShrink: 0 }} />
                    SYSTEM ONLINE · {VERSION}
                </span>
            </div>

        </div>
    );
}
