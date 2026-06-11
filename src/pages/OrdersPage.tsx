import { useState, useMemo, useContext } from "react";
import { T, FONT, SHADOWS } from "../theme";
import { useStore } from "../store";
import { AppCtx } from "../AppCtx";
import { fmt, fmtDate, downloadCSV, generateCSV, uid } from "../utils";
import { MobileCard, MobileCardList, useIsMobile } from "../components/ui";

// ─── Status config ────────────────────────────────────────────────────────────
type OrderStatus = "Shipped" | "Pending" | "Delivered" | "Cancelled" | "Processing";

const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; dot?: string; solid?: boolean }> = {
    Shipped:    { color: "#6B7280", bg: "transparent", dot: "#6B7280" },
    Pending:    { color: "#FFFFFF", bg: T.amber,       solid: true },
    Delivered:  { color: T.emerald, bg: "transparent", dot: T.emerald },
    Cancelled:  { color: "#9CA3AF", bg: "transparent", dot: "#9CA3AF" },
    Processing: { color: T.sky,     bg: "transparent", dot: T.sky },
};

function StatusBadge({ status }: { status: OrderStatus }) {
    const cfg = STATUS_CFG[status] || STATUS_CFG.Pending;
    if (cfg.solid) {
        return (
            <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: cfg.bg, color: cfg.color,
                fontSize: 11, fontWeight: 700, fontFamily: FONT.ui,
                padding: "4px 12px", borderRadius: 20,
            }}>{status}</span>
        );
    }
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            border: `1px solid ${cfg.dot}44`, color: cfg.color,
            fontSize: 11, fontWeight: 600, fontFamily: FONT.ui,
            padding: "4px 10px", borderRadius: 20, background: "transparent",
        }}>
            {cfg.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />}
            {status}
        </span>
    );
}

function TypeBadge({ type }: { type: "Sale" | "Purchase" }) {
    const isSale = type === "Sale";
    return (
        <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: FONT.ui,
            padding: "4px 12px", borderRadius: 20,
            color: isSale ? T.amber : T.sky,
            background: isSale ? T.amberGlow : T.skyBg,
            border: `1px solid ${isSale ? "rgba(139,30,30,0.2)" : "rgba(2,132,199,0.2)"}`,
        }}>{type}</span>
    );
}

// ─── Derive orders from movements ────────────────────────────────────────────
function movementToOrder(m: any) {
    const isSale = m.type === "SALE";
    const isPurchase = m.type === "PURCHASE";
    if (!isSale && !isPurchase) return null;

    // Derive status from paymentStatus / movement type
    let status: OrderStatus = "Pending";
    if (m.paymentStatus === "paid" || m.paymentMode === "Cash" || m.paymentMode === "UPI" || m.paymentMode === "Card") {
        status = isSale ? "Delivered" : "Shipped";
    } else if (m.paymentStatus === "cancelled") {
        status = "Cancelled";
    } else if (m.paymentStatus === "pending" || m.paymentMode === "Credit") {
        status = "Pending";
    } else {
        status = isSale ? "Shipped" : "Processing";
    }

    // Generate order ID: SO-XXXXX for sales, PO-XXXXX for purchases
    const numId = String(m.id || "").slice(-5).padStart(5, "0");
    const orderId = isSale ? `#SO-${numId}` : `#PO-${numId}`;
    const partyId = isSale
        ? `PT-${String(m.id || "").slice(-5).padStart(5, "0")}`
        : `SP-${String(m.id || "").slice(-5).padStart(5, "0")}`;

    return {
        id: m.id,
        orderId,
        date: m.date,
        partyName: isSale ? (m.customerName || "Walk-in Customer") : (m.supplierName || m.supplier || "Supplier"),
        partyId,
        type: isSale ? "Sale" : "Purchase" as "Sale" | "Purchase",
        status,
        amount: m.total,
        product: m.productName || "",
        cancelled: status === "Cancelled",
    };
}

// ─── Create New Order Modal ───────────────────────────────────────────────────
function CreateOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
    const [form, setForm] = useState({
        type: "Sale", party: "", amount: "", product: "", status: "Pending",
    });
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = () => {
        if (!form.party || !form.amount) return;
        const newId = `#${form.type === "Sale" ? "SO" : "PO"}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
        onCreated(newId);
        onClose();
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,27,27,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 20, padding: "28px 28px 24px", width: "min(440px, calc(100vw - 32px))", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, fontFamily: FONT.display, marginBottom: 4 }}>Create New Order</div>
                <div style={{ fontSize: 12, color: T.t3, marginBottom: 22, fontFamily: FONT.ui }}>Add a new sale or procurement order to the pipeline</div>

                {[
                    { label: "Order Type", key: "type", options: ["Sale", "Purchase"] },
                    { label: "Status", key: "status", options: ["Pending", "Processing", "Shipped", "Delivered"] },
                ].map(field => (
                    <div key={field.key} style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: T.t2, display: "block", marginBottom: 5, fontFamily: FONT.ui }}>{field.label}</label>
                        <select value={(form as any)[field.key]} onChange={e => set(field.key, e.target.value)} style={{ width: "100%", height: 38, border: `1px solid ${T.border}`, borderRadius: 9, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, outline: "none", background: "#FFFFFF", color: T.t1 }}>
                            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                ))}

                {[
                    { label: form.type === "Sale" ? "Customer Name" : "Supplier Name", key: "party", placeholder: form.type === "Sale" ? "Titan Logistics Corp." : "Industrial Gear Ltd." },
                    { label: "Product / Description", key: "product", placeholder: "Hydraulic pistons, 50 units" },
                    { label: "Amount (₹)", key: "amount", placeholder: "45,200" },
                ].map(field => (
                    <div key={field.key} style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: T.t2, display: "block", marginBottom: 5, fontFamily: FONT.ui }}>{field.label}</label>
                        <input value={(form as any)[field.key]} onChange={e => set(field.key, e.target.value)} placeholder={field.placeholder}
                            style={{ width: "100%", height: 38, border: `1px solid ${T.border}`, borderRadius: 9, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, outline: "none", background: "#FFFFFF", color: T.t1, boxSizing: "border-box" }}
                            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }}
                        />
                    </div>
                ))}

                <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                    <button onClick={onClose} style={{ flex: 1, height: 40, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t2, cursor: "pointer", fontFamily: FONT.ui }}>Cancel</button>
                    <button onClick={handleSubmit} style={{ flex: 2, height: 40, background: T.amber, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", fontFamily: FONT.ui }}>⊕ Create Order</button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function OrdersPage() {
    const { movements, products, orders: mktOrders, activeShopId } = useStore();
    const { toast } = useContext(AppCtx);
    const isMobile = useIsMobile();

    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [typeFilter, setTypeFilter] = useState<string>("All");
    const [search, setSearch] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [visibleCount, setVisibleCount] = useState(25);

    const shopMovements = useMemo(
        () => (movements || []).filter(m => m.shopId === activeShopId),
        [movements, activeShopId],
    );

    // Convert movements → orders table data
    const allOrders = useMemo(() => {
        const fromMovements = shopMovements
            .map(movementToOrder)
            .filter((o): o is NonNullable<ReturnType<typeof movementToOrder>> => o !== null)
            .sort((a, b) => b.date - a.date);

        // Also include marketplace orders if any
        const fromMarket = (mktOrders || [])
            .filter(o => !activeShopId || o.shopId === activeShopId)
            .map(o => ({
                id: o.id,
                orderId: `#SO-${String(o.id).slice(-5).padStart(5, "0")}`,
                date: o.time || o.date || Date.now(),
                partyName: o.customer || "Customer",
                partyId: `PT-${String(o.id).slice(-5).padStart(5, "0")}`,
                type: "Sale" as const,
                status: (o.status === "DELIVERED" ? "Delivered" : o.status === "CANCELLED" ? "Cancelled" : o.status === "DISPATCHED" ? "Shipped" : "Pending") as OrderStatus,
                amount: o.total || 0,
                product: o.items || "",
                cancelled: o.status === "CANCELLED",
            }));

        // Merge (deduplicate by orderId)
        const seen = new Set<string>();
        return [...fromMovements, ...fromMarket].filter(o => {
            if (seen.has(o.orderId)) return false;
            seen.add(o.orderId);
            return true;
        });
    }, [shopMovements, mktOrders, activeShopId]);

    // KPI stats
    const kpi = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayTs = today.getTime();
        const sales = allOrders.filter(o => o.type === "Sale" && !o.cancelled);
        const purchases = allOrders.filter(o => o.type === "Purchase" && !o.cancelled);
        const pending = allOrders.filter(o => o.status === "Pending" || o.status === "Processing");
        const completedToday = allOrders.filter(o => o.status === "Delivered" && o.date >= todayTs);
        return {
            activeSales: sales.reduce((s, o) => s + o.amount, 0),
            procurement: purchases.reduce((s, o) => s + o.amount, 0),
            pendingCount: pending.length,
            completedToday: completedToday.length,
        };
    }, [allOrders]);

    // Filtered orders
    const filtered = useMemo(() => {
        let list = allOrders;
        if (statusFilter !== "All") list = list.filter(o => o.status === statusFilter);
        if (typeFilter !== "All") list = list.filter(o => o.type === typeFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                o.orderId.toLowerCase().includes(q) ||
                o.partyName.toLowerCase().includes(q) ||
                o.product.toLowerCase().includes(q)
            );
        }
        return list;
    }, [allOrders, statusFilter, typeFilter, search]);

    const handleExportCSV = () => {
        const headers = ["Order ID", "Date", "Party", "Type", "Status", "Amount"];
        const rows = filtered.map(o => [o.orderId, fmtDate(o.date), o.partyName, o.type, o.status, o.amount]);
        downloadCSV(`Orders_Pipeline_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
        toast?.("Orders exported as CSV!", "success");
    };

    const handleCreated = (newId: string) => {
        toast?.(`New order ${newId} has been successfully created.`, "success", "✓ Order Created");
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    // Toolbar buttons + search are shared between desktop header layout and the
    // mobile stacked layout (search → KPIs → CTA → Filter/Export → Recent Orders).
    const filterBtn = (
        <button
            onClick={() => setStatusFilter(statusFilter === "All" ? "Pending" : "All")}
            style={{ height: isMobile ? 46 : 40, padding: "0 16px", background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t2, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        >≡ Filter</button>
    );
    const exportBtn = (
        <button
            onClick={handleExportCSV}
            style={{ height: isMobile ? 46 : 40, padding: "0 16px", background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t2, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        ><span style={{ fontSize: 14 }}>↑</span> Export CSV</button>
    );
    const createBtn = (
        <button
            onClick={() => setShowCreate(true)}
            style={{ height: isMobile ? 48 : 40, width: isMobile ? "100%" : undefined, padding: "0 18px", background: T.amber, border: "none", borderRadius: 10, fontSize: isMobile ? 14 : 13, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        ><span style={{ fontSize: 16, lineHeight: 1 }}>⊕</span> Create New Order</button>
    );
    const searchBox = (
        <div style={{ flex: 1, minWidth: isMobile ? 0 : 220, width: isMobile ? "100%" : undefined, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.t3, fontSize: 14, pointerEvents: "none" }}>🔍</span>
            <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by Order ID or Party Name..."
                style={{ width: "100%", height: isMobile ? 46 : 38, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: isMobile ? 12 : 9, padding: "0 32px 0 36px", fontSize: isMobile ? 16 : 13, color: T.t1, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }}
            />
        </div>
    );

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 14 : 18 }}>

            {/* ── HEADER ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                    <h1 className="rp-h1" style={{ fontSize: 26, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0, letterSpacing: "-0.03em" }}>Orders Pipeline</h1>
                    <p style={{ fontSize: 13, color: T.t3, margin: "5px 0 0", fontFamily: FONT.ui }}>
                        Managing <span style={{ color: T.t1, fontWeight: 700 }}>{allOrders.length.toLocaleString()}</span> total active transactions across regions.
                    </p>
                </div>
                {!isMobile && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                        {filterBtn}
                        {exportBtn}
                        {createBtn}
                    </div>
                )}
            </div>

            {/* Mobile: search sits at the top, per design */}
            {isMobile && searchBox}

            {/* ── 4 KPI CARDS ── */}
            <div className="kpi-grid-4 orders-kpi" style={{ display: "grid", gap: 14 }}>
                {[
                    { label: "ACTIVE SALES", value: fmt(kpi.activeSales), badge: "~12%", badgeColor: T.emerald, badgeBg: T.emeraldBg },
                    { label: "PROCUREMENT", value: fmt(kpi.procurement), badge: "~4.2%", badgeColor: T.emerald, badgeBg: T.emeraldBg },
                    { label: "PENDING SHIPMENT", value: `${kpi.pendingCount} Units`, badge: kpi.pendingCount > 0 ? "Urgent" : "Clear", badgeColor: kpi.pendingCount > 0 ? "#D97706" : T.emerald, badgeBg: kpi.pendingCount > 0 ? "rgba(245,158,11,0.1)" : T.emeraldBg },
                    { label: "COMPLETED TODAY", value: String(kpi.completedToday), sub: `Target ${Math.max(kpi.completedToday + 7, 25)}` },
                ].map((c, i) => (
                    <div key={i} className="card-hover" style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 20px 18px", boxShadow: SHADOWS.xs }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui, marginBottom: 10 }}>{c.label}</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: "clamp(18px,2vw,26px)", fontWeight: 800, color: T.t1, fontFamily: FONT.mono, letterSpacing: "-0.03em" }}>{c.value}</span>
                            {c.badge && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: c.badgeColor, background: c.badgeBg, padding: "2px 8px", borderRadius: 20, fontFamily: FONT.mono }}>{c.badge}</span>
                            )}
                            {c.sub && (
                                <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>Target {Math.max(kpi.completedToday + 7, 25)}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Mobile: full-width CTA + 2-up Filter/Export, per design */}
            {isMobile && (
                <>
                    {createBtn}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {filterBtn}
                        {exportBtn}
                    </div>
                </>
            )}

            {/* ── SEARCH + TYPE FILTER ROW ── */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {!isMobile && searchBox}
                {/* Type filter pills */}
                {(["All", "Sale", "Purchase"] as const).map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)} style={{
                        height: 38, padding: "0 16px", borderRadius: 9, border: `1px solid ${typeFilter === t ? T.amber : T.border}`,
                        background: typeFilter === t ? T.amberGlow : "#FFFFFF", color: typeFilter === t ? T.amber : T.t2,
                        fontSize: 12, fontWeight: typeFilter === t ? 700 : 500, cursor: "pointer", fontFamily: FONT.ui,
                    }}>{t}</button>
                ))}
                {/* Status filter pills */}
                {(["All", "Pending", "Shipped", "Delivered", "Cancelled"] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} style={{
                        height: 38, padding: "0 14px", borderRadius: 9, border: `1px solid ${statusFilter === s ? T.border : T.border}`,
                        background: statusFilter === s ? T.surfaceContainerHigh : "transparent", color: statusFilter === s ? T.t1 : T.t3,
                        fontSize: 12, fontWeight: statusFilter === s ? 700 : 400, cursor: "pointer", fontFamily: FONT.ui,
                    }}>{s}</button>
                ))}
                <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui, marginLeft: 4 }}>{filtered.length} orders</span>
            </div>

            {/* Mobile: section heading, per design */}
            {isMobile && (
                <h2 style={{ fontSize: 17, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: "2px 0 -8px", letterSpacing: "-0.02em" }}>Recent Orders</h2>
            )}

            {/* ── TABLE ── */}
            <div style={isMobile && filtered.length > 0
                ? undefined
                : { background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOWS.xs }}>
                {filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 24px", color: T.t3 }}>
                        <div style={{ fontSize: 48, opacity: 0.25, marginBottom: 16 }}>🛒</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.t2, marginBottom: 6 }}>No orders found</div>
                        <div style={{ fontSize: 13 }}>
                            {search || statusFilter !== "All" || typeFilter !== "All"
                                ? "Try clearing filters"
                                : "Create your first order using the button above"}
                        </div>
                        {(search || statusFilter !== "All" || typeFilter !== "All") && (
                            <button onClick={() => { setSearch(""); setStatusFilter("All"); setTypeFilter("All"); }} style={{ marginTop: 14, background: T.amber, border: "none", borderRadius: 9, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>Clear Filters</button>
                        )}
                    </div>
                ) : isMobile ? (
                    <MobileCardList>
                        {filtered.slice(0, visibleCount).map((order) => {
                            const isSale = order.type === "Sale";
                            const isCancelled = order.status === "Cancelled";
                            const iconBtnStyle = { width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: T.t2 } as const;
                            return (
                                <MobileCard key={order.orderId} accent={isSale ? T.amber : T.sky}>
                                    {/* Top: id / party / date on the left, amount + status on the right */}
                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 12 }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 13, color: T.amber }}>{order.orderId}</div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, fontFamily: FONT.ui, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.partyName}</div>
                                            <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui, marginTop: 3 }}>
                                                {new Date(order.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </div>
                                        </div>
                                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                                            <div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 15, color: isCancelled ? T.t3 : T.t1, textDecoration: isCancelled ? "line-through" : "none" }}>{fmt(order.amount)}</div>
                                            <div style={{ marginTop: 6 }}><StatusBadge status={order.status as OrderStatus} /></div>
                                        </div>
                                    </div>
                                    {order.product && (
                                        <div style={{ width: "100%", fontSize: 11, color: T.t3, fontFamily: FONT.ui, marginTop: -6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.product}</div>
                                    )}
                                    {/* Bottom: type chip + icon actions */}
                                    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                                        <TypeBadge type={order.type} />
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button title="View" style={iconBtnStyle}>👁</button>
                                            <button title={isCancelled ? "Restore" : "Print"} onClick={() => { if (!isCancelled) window.print(); }} style={iconBtnStyle}>{isCancelled ? "↺" : "🖨"}</button>
                                            <button title="More options" style={iconBtnStyle}>⋯</button>
                                        </div>
                                    </div>
                                </MobileCard>
                            );
                        })}
                    </MobileCardList>
                ) : (
                    <div className="table-scroll">
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                                    {[
                                        ["ORDER ID", "left", 120],
                                        ["DATE", "left", 110],
                                        ["CUSTOMER / SUPPLIER", "left", 220],
                                        ["TYPE", "left", 100],
                                        ["STATUS", "left", 130],
                                        ["AMOUNT", "right", 110],
                                        ["ACTIONS", "center", 100],
                                    ].map(([h, align, w]) => (
                                        <th key={h as string} className="th-cell" style={{ textAlign: align as "left" | "right" | "center", width: w as number }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.slice(0, visibleCount).map((order, i) => {
                                    const isSale = order.type === "Sale";
                                    const isCancelled = order.status === "Cancelled";
                                    return (
                                        <tr key={order.orderId} className="trow" style={{
                                            borderBottom: i < Math.min(visibleCount, filtered.length) - 1 ? `1px solid ${T.border}` : "none",
                                            borderLeft: `3px solid ${isSale ? T.amber : T.sky}`,
                                        }}>
                                            {/* ORDER ID */}
                                            <td style={{ padding: "14px 16px" }}>
                                                <span style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 13, color: T.amber }}>{order.orderId}</span>
                                            </td>
                                            {/* DATE */}
                                            <td style={{ padding: "14px 16px", fontFamily: FONT.ui, fontSize: 12, color: T.t2, whiteSpace: "nowrap" }}>
                                                {new Date(order.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </td>
                                            {/* CUSTOMER / SUPPLIER */}
                                            <td style={{ padding: "14px 16px" }}>
                                                <div style={{ fontWeight: 700, color: T.t1, fontSize: 13 }}>{order.partyName}</div>
                                                <div style={{ fontSize: 11, color: T.t3, marginTop: 2, fontFamily: FONT.mono }}>ID: {order.partyId}</div>
                                                {order.product && <div style={{ fontSize: 11, color: T.t3, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{order.product}</div>}
                                            </td>
                                            {/* TYPE */}
                                            <td style={{ padding: "14px 16px" }}>
                                                <TypeBadge type={order.type} />
                                            </td>
                                            {/* STATUS */}
                                            <td style={{ padding: "14px 16px" }}>
                                                <StatusBadge status={order.status} />
                                            </td>
                                            {/* AMOUNT */}
                                            <td style={{ padding: "14px 16px", textAlign: "right" }}>
                                                <span style={{
                                                    fontFamily: FONT.mono, fontWeight: 700, fontSize: 14,
                                                    color: isCancelled ? T.t3 : T.t1,
                                                    textDecoration: isCancelled ? "line-through" : "none",
                                                }}>{fmt(order.amount)}</span>
                                            </td>
                                            {/* ACTIONS */}
                                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                                                <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                                                    <button title="View" style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.t2, transition: "all 0.12s" }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t2; }}>
                                                        👁
                                                    </button>
                                                    <button title={isCancelled ? "Restore" : "Print"} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.t2, transition: "all 0.12s" }}
                                                        onClick={() => { if (!isCancelled) window.print(); }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t2; }}>
                                                        {isCancelled ? "↺" : "🖨"}
                                                    </button>
                                                    <button title="More options" style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: T.t2, letterSpacing: "0.05em" }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t2; }}>
                                                        ⋯
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Load more */}
            {visibleCount < filtered.length && (
                <div style={{ textAlign: "center" }}>
                    <button onClick={() => setVisibleCount(v => v + 25)} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 24px", color: T.t3, fontSize: 13, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t3; }}>
                        Load more ({filtered.length - visibleCount} remaining)
                    </button>
                </div>
            )}

            {/* Create Order Modal */}
            {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
        </div>
    );
}
