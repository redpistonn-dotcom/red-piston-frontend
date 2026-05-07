import { useState, useMemo, useEffect } from "react";
import { T, FONT } from "../../theme";
import { useStore } from "../../store";
import { fmt, fmtDateTime, daysAgo } from "../../utils";

const STATUS_META = {
    NEW: { label: "Order Placed", icon: "📋", color: T.sky, desc: "Your order has been placed and is awaiting confirmation from the seller." },
    ACCEPTED: { label: "Confirmed by Seller", icon: "✅", color: T.emerald, desc: "The seller has confirmed your order and is preparing it." },
    PACKED: { label: "Packed & Ready", icon: "📦", color: T.amber, desc: "Your order has been packed and is ready for pickup by the delivery partner." },
    DISPATCHED: { label: "Out for Delivery", icon: "🚚", color: T.violet, desc: "Your order is on its way! Delivery partner is en route." },
    DELIVERED: { label: "Delivered", icon: "✓", color: T.emerald, desc: "Your order has been delivered successfully." },
    CANCELLED: { label: "Cancelled", icon: "✕", color: T.crimson, desc: "This order was cancelled." },
};

const FLOW = ["NEW", "ACCEPTED", "PACKED", "DISPATCHED", "DELIVERED"];

// Simulated GPS route waypoints (Hyderabad context)
const GPS_ROUTE = [
    { lat: 17.3916, lng: 78.4398, label: "Shop" },
    { lat: 17.3950, lng: 78.4420, label: "Main Road" },
    { lat: 17.3980, lng: 78.4450, label: "Highway Junction" },
    { lat: 17.4010, lng: 78.4470, label: "Service Road" },
    { lat: 17.4040, lng: 78.4490, label: "Near Destination" },
    { lat: 17.4060, lng: 78.4500, label: "Destination" },
];

export function OrderTrackingPage({ onBack }) {
    const { orders, saveOrders, shops } = useStore();
    const safeOrders = orders || [];

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [gpsPosition, setGpsPosition] = useState(0);

    // Get customer-facing orders (marketplace orders)
    const myOrders = useMemo(
        () => safeOrders.filter(o => o.address || o.payment?.includes("Escrow") || o.payment?.includes("COD") || o.payment?.includes("Prepaid")).sort((a, b) => b.time - a.time),
        [safeOrders]
    );

    // Simulate GPS movement for dispatched orders
    useEffect(() => {
        const dispatched = selectedOrder && myOrders.find(o => o.id === selectedOrder)?.status === "DISPATCHED";
        if (!dispatched) return;

        const interval = setInterval(() => {
            setGpsPosition(prev => {
                if (prev >= GPS_ROUTE.length - 1) return GPS_ROUTE.length - 1;
                return prev + 1;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedOrder, myOrders]);

    const handleConfirmDelivery = (orderId) => {
        const updated = safeOrders.map(o => o.id === orderId ? {
            ...o,
            status: "DELIVERED",
            deliveredAt: Date.now(),
            customerConfirmed: true,
            paymentSettled: true,
        } : o);
        saveOrders(updated);
    };

    if (myOrders.length === 0) {
        return (
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
                <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 30 }}>← Back to Marketplace</button>
                <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>📦</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.t1 }}>No orders yet</div>
                <p style={{ color: T.t3, marginTop: 8 }}>Your order history will appear here after your first purchase.</p>
                <button onClick={onBack} style={{ marginTop: 24, background: T.amber, color: "#000", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Start Shopping →</button>
            </div>
        );
    }

    const activeOrder = selectedOrder ? myOrders.find(o => o.id === selectedOrder) : null;

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
            <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 24 }}>← Back to Marketplace</button>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: T.t1, margin: "0 0 8px" }}>My Orders</h1>
            <p style={{ fontSize: 14, color: T.t3, margin: "0 0 32px" }}>{myOrders.length} order{myOrders.length > 1 ? "s" : ""} found</p>

            <div style={{ display: "flex", gap: 24 }}>
                {/* ═══════ LEFT: Order List ═══════ */}
                <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {myOrders.map(order => {
                        const statusMeta = STATUS_META[order.status] || STATUS_META.NEW;
                        const isActive = selectedOrder === order.id;
                        return (
                            <div
                                key={order.id}
                                onClick={() => { setSelectedOrder(order.id); setGpsPosition(0); }}
                                style={{
                                    background: isActive ? `${T.amber}0a` : T.card,
                                    border: `${isActive ? "2px" : "1px"} solid ${isActive ? T.amber : T.border}`,
                                    borderRadius: 14, padding: "16px 18px",
                                    cursor: "pointer", transition: "all 0.2s"
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 900, color: T.amber, fontFamily: FONT.mono }}>{order.id}</div>
                                        <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{daysAgo(order.time)}</div>
                                    </div>
                                    <div style={{
                                        background: `${statusMeta.color}22`, color: statusMeta.color,
                                        padding: "3px 10px", borderRadius: 99,
                                        fontSize: 10, fontWeight: 800
                                    }}>
                                        {statusMeta.icon} {statusMeta.label}
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: T.t2, marginTop: 8, lineClamp: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.items}</div>
                                <div style={{ fontSize: 15, fontWeight: 900, color: T.t1, fontFamily: FONT.mono, marginTop: 8 }}>{fmt(order.total)}</div>
                            </div>
                        );
                    })}
                </div>

                {/* ═══════ RIGHT: Order Details ═══════ */}
                <div style={{ flex: 1 }}>
                    {!activeOrder ? (
                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 60, textAlign: "center" }}>
                            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>👈</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: T.t2 }}>Select an order to view details</div>
                        </div>
                    ) : (() => {
                        const statusMeta = STATUS_META[activeOrder.status] || STATUS_META.NEW;
                        const currentFlowIdx = FLOW.indexOf(activeOrder.status);
                        const isCancelled = activeOrder.status === "CANCELLED";
                        const isDispatched = activeOrder.status === "DISPATCHED";
                        const isDelivered = activeOrder.status === "DELIVERED";
                        const shop = (shops || []).find(s => s.id === activeOrder.shopId);

                        return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                {/* Status Header */}
                                <div style={{
                                    background: `${statusMeta.color}11`, border: `2px solid ${statusMeta.color}44`,
                                    borderRadius: 16, padding: "20px 24px",
                                    display: "flex", alignItems: "center", gap: 16
                                }}>
                                    <div style={{
                                        width: 50, height: 50, borderRadius: "50%",
                                        background: `${statusMeta.color}22`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 24, flexShrink: 0
                                    }}>
                                        {statusMeta.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 18, fontWeight: 900, color: statusMeta.color }}>{statusMeta.label}</div>
                                        <div style={{ fontSize: 13, color: T.t2, marginTop: 2 }}>{statusMeta.desc}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 20, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(activeOrder.total)}</div>
                                        <div style={{ fontSize: 11, color: T.t3 }}>{activeOrder.payment}</div>
                                    </div>
                                </div>

                                {/* GPS Tracking Map (for dispatched orders) */}
                                {isDispatched && (
                                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
                                        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div style={{ fontSize: 14, fontWeight: 800, color: T.t1 }}>📍 Live Tracking</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: T.emerald, animation: "pulse 2s infinite" }}>
                                                ● Live
                                            </div>
                                        </div>
                                        {/* Simulated Map */}
                                        <div style={{ height: 200, background: `linear-gradient(135deg, ${T.bg}, ${T.surface})`, position: "relative", overflow: "hidden" }}>
                                            {/* Road Line */}
                                            <svg width="100%" height="100%" viewBox="0 0 500 200" style={{ position: "absolute", inset: 0 }}>
                                                <path d="M 50 160 C 150 160, 100 80, 200 80 S 350 40, 450 40" fill="none" stroke={T.border} strokeWidth="3" strokeDasharray="8,4" />
                                                {/* Animated delivery dot */}
                                                <circle
                                                    cx={50 + (gpsPosition / (GPS_ROUTE.length - 1)) * 400}
                                                    cy={160 - (gpsPosition / (GPS_ROUTE.length - 1)) * 120}
                                                    r="8"
                                                    fill={T.amber}
                                                    style={{ transition: "all 2.5s ease-in-out", filter: `drop-shadow(0 0 8px ${T.amber})` }}
                                                />
                                                {/* Shop marker */}
                                                <circle cx="50" cy="160" r="6" fill={T.sky} stroke="#fff" strokeWidth="2" />
                                                <text x="50" y="185" textAnchor="middle" fill={T.t3} fontSize="10" fontWeight="700">Shop</text>
                                                {/* Destination marker */}
                                                <circle cx="450" cy="40" r="6" fill={T.emerald} stroke="#fff" strokeWidth="2" />
                                                <text x="450" y="25" textAnchor="middle" fill={T.t3} fontSize="10" fontWeight="700">You</text>
                                            </svg>
                                        </div>
                                        {/* ETA Bar */}
                                        <div style={{ padding: "14px 20px", background: T.surface, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <span style={{ fontSize: 20 }}>🏍️</span>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>
                                                        {activeOrder.deliveryPartner?.name || "Delivery Partner"}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: T.t3 }}>
                                                        {activeOrder.deliveryPartner?.vehicle || "Bike"} · 📱 {activeOrder.deliveryPartner?.phone || "N/A"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontSize: 18, fontWeight: 900, color: T.amber }}>
                                                    ~{Math.max(5, 45 - gpsPosition * 8)} min
                                                </div>
                                                <div style={{ fontSize: 11, color: T.t3 }}>Estimated arrival</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Delivery Partner Info (for dispatched) */}
                                {isDispatched && activeOrder.deliveryPartner && (
                                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${T.amber}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                                                {activeOrder.deliveryPartner.icon}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: T.t1 }}>{activeOrder.deliveryPartner.name}</div>
                                                <div style={{ fontSize: 12, color: T.t3 }}>⭐ {activeOrder.deliveryPartner.rating} · {activeOrder.deliveryPartner.vehicle}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button style={{ background: T.sky, color: "#000", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>📱 Call</button>
                                        </div>
                                    </div>
                                )}

                                {/* Customer Confirm Delivery Button */}
                                {isDispatched && (
                                    <button
                                        onClick={() => handleConfirmDelivery(activeOrder.id)}
                                        style={{
                                            width: "100%", padding: "16px",
                                            background: `linear-gradient(135deg, ${T.emerald}, #059669)`,
                                            border: "none", borderRadius: 14,
                                            color: "#fff", fontSize: 16, fontWeight: 900,
                                            cursor: "pointer",
                                            boxShadow: `0 8px 28px ${T.emerald}44`,
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 10
                                        }}
                                    >
                                        ✓ Confirm Delivery — I've received my order
                                    </button>
                                )}

                                {/* Payment Settlement (after delivery) */}
                                {isDelivered && (
                                    <div style={{
                                        background: `${T.emerald}0a`, border: `2px solid ${T.emerald}44`,
                                        borderRadius: 16, padding: "20px 24px",
                                        display: "flex", alignItems: "center", gap: 16
                                    }}>
                                        <div style={{
                                            width: 50, height: 50, borderRadius: "50%",
                                            background: `${T.emerald}22`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 24
                                        }}>💰</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 16, fontWeight: 900, color: T.emerald }}>Payment Settled ✓</div>
                                            <div style={{ fontSize: 13, color: T.t2, marginTop: 4 }}>
                                                {fmt(activeOrder.total)} released to {shop?.name || "Shop"}
                                            </div>
                                        </div>
                                        {/* Return Button */}
                                        <button style={{
                                            background: T.surface, border: `1px solid ${T.border}`,
                                            color: T.t2, borderRadius: 10, padding: "10px 16px",
                                            fontSize: 12, fontWeight: 700, cursor: "pointer"
                                        }}>
                                            🔄 Request Return
                                        </button>
                                    </div>
                                )}

                                {/* Tracking Timeline */}
                                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, marginBottom: 20 }}>📋 Order Timeline</div>

                                    {isCancelled ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 20, background: `${T.crimson}11`, border: `1px solid ${T.crimson}33`, borderRadius: 12 }}>
                                            <span style={{ fontSize: 28 }}>✕</span>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: T.crimson }}>Order Cancelled</div>
                                                <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Refund will be processed within 5-7 business days.</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ position: "relative", paddingLeft: 24 }}>
                                            <div style={{ position: "absolute", left: 11, top: 12, bottom: 12, width: 2, background: T.border }} />

                                            {FLOW.map((status, i) => {
                                                const meta = STATUS_META[status];
                                                const isDone = i <= currentFlowIdx;
                                                const isCurrent = i === currentFlowIdx;

                                                const stepTime = isDone ? activeOrder.time + i * 1200000 : null;

                                                return (
                                                    <div key={status} style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: i < FLOW.length - 1 ? 24 : 0, position: "relative" }}>
                                                        <div style={{
                                                            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                                                            background: isDone ? meta.color : T.surface,
                                                            border: `2px solid ${isDone ? meta.color : T.border}`,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                            zIndex: 2, position: "relative", left: -12,
                                                            boxShadow: isCurrent ? `0 0 12px ${meta.color}66` : "none",
                                                            animation: isCurrent ? "pulse 2s infinite" : "none"
                                                        }}>
                                                            {isDone && <span style={{ fontSize: 10, color: "#000", fontWeight: 900 }}>✓</span>}
                                                        </div>

                                                        <div style={{ flex: 1, marginTop: -2 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: isDone ? T.t1 : T.t3 }}>{meta.label}</div>
                                                            {isDone && stepTime && (
                                                                <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{fmtDateTime(stepTime)}</div>
                                                            )}
                                                            {isCurrent && (
                                                                <div style={{ fontSize: 11, color: meta.color, fontWeight: 600, marginTop: 4 }}>{meta.desc}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Order Details */}
                                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, marginBottom: 16 }}>📋 Order Details</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
                                        <div>
                                            <div style={{ color: T.t3, marginBottom: 4 }}>Order ID</div>
                                            <div style={{ fontWeight: 700, color: T.amber, fontFamily: FONT.mono }}>{activeOrder.id}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: T.t3, marginBottom: 4 }}>Shop</div>
                                            <div style={{ fontWeight: 700, color: T.t1 }}>{shop?.name || "Local Shop"}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: T.t3, marginBottom: 4 }}>Items</div>
                                            <div style={{ fontWeight: 600, color: T.t1 }}>{activeOrder.items}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: T.t3, marginBottom: 4 }}>Payment</div>
                                            <div style={{ fontWeight: 600, color: T.t1 }}>{activeOrder.payment}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: T.t3, marginBottom: 4 }}>Address</div>
                                            <div style={{ fontWeight: 600, color: T.t1 }}>{activeOrder.address}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: T.t3, marginBottom: 4 }}>Placed At</div>
                                            <div style={{ fontWeight: 600, color: T.t1 }}>{fmtDateTime(activeOrder.time)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
