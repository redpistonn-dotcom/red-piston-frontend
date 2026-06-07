import { useMemo } from "react";
import { T, FONT } from "../../theme";
import { useStore } from "../../store";
import { fmt, fmtDateTime } from "../../utils";

const S = {
    NEW: { label: "Order Placed", color: T.sky, icon: "📝" },
    ACCEPTED: { label: "Confirmed by Seller", color: "#2DD4BF", icon: "✓" },
    PACKED: { label: "Packed & Ready", color: T.amber, icon: "📦" },
    DISPATCHED: { label: "Out for Delivery", color: T.violet, icon: "🚚" },
    DELIVERED: { label: "Delivered", color: T.emerald, icon: "🎉" },
    CANCELLED: { label: "Cancelled", color: T.crimson, icon: "✕" },
};

const FLOW = ["NEW", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED"];

export function CustomerProfile() {
    const { orders, shops } = useStore();

    // Detect marketplace orders: they have an address field OR payment mentions Escrow/COD/Prepaid
    // (shop-owner-entered offline sales never have an address field)
    const myOrders = useMemo(() =>
        (orders || [])
            .filter(o => o.address || o.payment?.includes("Escrow") || o.payment?.includes("COD") || o.payment?.includes("Prepaid"))
            .sort((a, b) => b.time - a.time),
        [orders]
    );

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.amber, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🧔</div>
                <div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: T.t1 }}>My Profile</div>
                    <div style={{ fontSize: 14, color: T.t3, marginTop: 4 }}>+91 9876543210 • Hyderabad</div>
                </div>
            </div>

            <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, marginBottom: 16 }}>Order History & Tracking</div>

            {myOrders.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📦</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.t2 }}>No orders yet</div>
                    <div style={{ fontSize: 14, color: T.t3, marginTop: 8 }}>When you check out from the marketplace, your orders will appear here.</div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {myOrders.map(o => {
                        const shop = shops?.find(s => s.id === o.shopId);
                        const m = S[o.status] || S.NEW;

                        const curIdx = FLOW.indexOf(o.status);
                        const isCancelled = o.status === "CANCELLED";

                        return (
                            <div key={o.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 14, color: T.amber, fontWeight: 800, fontFamily: FONT.mono }}>{o.id}</span>
                                            <span style={{ fontSize: 12, color: T.t3 }}>•</span>
                                            <span style={{ fontSize: 12, color: T.t3 }}>{fmtDateTime(o.time)}</span>
                                        </div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: T.t1, marginTop: 8 }}>{shop?.name || "Auto Parts Shop"}</div>
                                        <div style={{ fontSize: 13, color: T.t2, marginTop: 4 }}>{o.items}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(o.total)}</div>
                                        <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>{o.payment}</div>
                                    </div>
                                </div>

                                {/* Order Tracking Progress Bar */}
                                <div style={{ background: T.bg, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.border}` }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${m.color}22`, color: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                                            {m.icon}
                                        </div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: m.color }}>{m.label}</div>
                                        {isCancelled && <div style={{ marginLeft: "auto", fontSize: 12, color: T.crimson }}>Refund processing...</div>}
                                    </div>

                                    {!isCancelled && (
                                        <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                                            <div style={{ position: "absolute", top: 8, left: 16, right: 16, height: 2, background: T.border, zIndex: 0 }} />
                                            {FLOW.map((step, i) => {
                                                const active = i <= curIdx;
                                                const stepState = S[step];
                                                return (
                                                    <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 1 }}>
                                                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: active ? stepState.color : T.surface, border: `2px solid ${active ? stepState.color : T.border}`, transition: "all 0.3s" }} />
                                                        <div style={{ fontSize: 10, color: active ? T.t1 : T.t3, fontWeight: active ? 700 : 500 }}>{stepState.label}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
