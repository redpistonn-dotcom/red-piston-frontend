import { useMemo, useState } from "react";
import { FONT } from "../../theme";
import { useStore } from "../../store";
import { fmt } from "../../utils";
import { PartImage } from "./PartImage";

// Light cream palette constants
const C = {
    bg:         "#FAF6F0",
    surface:    "#FFFFFF",
    card:       "#FAF6F0",
    cardHover:  "#F0E8DF",
    border:     "#E0D5C8",
    t1:         "#1A1205",
    t2:         "#5C4F40",
    t3:         "#9C8C7C",
    t4:         "#BFB0A0",
    red:        "#BE2B1A",
    redBg:      "rgba(190,43,26,0.08)",
    redDim:     "#DC2626",
    redDimBg:   "#FEF2F2",
    green:      "#16A34A",
};

const DELIVERY_OPTIONS = [
    { id: "express", label: "Express", desc: "~45 min", fee: 59, icon: "⚡" },
    { id: "standard", label: "Standard", desc: "2-4 hrs", fee: 29, icon: "🚚" },
];

function estDelivery(optionId) {
    const now = new Date();
    if (optionId === "express") {
        now.setHours(now.getHours() + 1);
        return now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    }
    now.setDate(now.getDate() + 1);
    return now.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function CartDrawer({ onCheckout }) {
    const { cart, saveCart, isCartOpen, setIsCartOpen } = useStore();

    const safeCart = cart || [];

    const cartByShop = useMemo(() => {
        return safeCart.reduce((acc, item) => {
            const shopId = item.listing?.shop_id;
            if (!shopId) return acc;
            if (!acc[shopId]) {
                acc[shopId] = { shopId, shop: item.listing.shop, items: [], subtotal: 0, deliveryOption: item.deliveryOption || "standard" };
            }
            acc[shopId].items.push(item);
            acc[shopId].subtotal += (item.listing?.selling_price || 0) * item.qty;
            return acc;
        }, {});
    }, [safeCart]);

    const shopGroups = Object.values(cartByShop);
    const totalItems = safeCart.reduce((s, i) => s + i.qty, 0);
    const totalSubtotal = shopGroups.reduce((s, g) => s + g.subtotal, 0);
    const totalDelivery = shopGroups.reduce((s, g) => {
        const opt = DELIVERY_OPTIONS.find(o => o.id === g.deliveryOption) || DELIVERY_OPTIONS[1];
        return s + opt.fee;
    }, 0);
    const totalValue = totalSubtotal + totalDelivery;

    const updateQty = (listing, newQty) => {
        if (newQty <= 0) {
            saveCart(safeCart.filter(i => !(i.listing?.shop_id === listing.shop_id && i.listing?.product_id === listing.product_id)));
        } else {
            saveCart(safeCart.map(i =>
                (i.listing?.shop_id === listing.shop_id && i.listing?.product_id === listing.product_id)
                    ? { ...i, qty: newQty } : i
            ));
        }
    };

    const removeItem = (listing) => {
        saveCart(safeCart.filter(i => !(i.listing?.shop_id === listing.shop_id && i.listing?.product_id === listing.product_id)));
    };

    const updateDeliveryOption = (shopId, optionId) => {
        saveCart(safeCart.map(i => i.listing?.shop_id === shopId ? { ...i, deliveryOption: optionId } : i));
    };

    if (!isCartOpen) return null;

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end" }}>
            <style>{`
                @media (max-width: 768px) {
                    .mp-cart-panel { width: 100vw !important; max-width: 100vw !important; border-left: none !important; }
                }
            `}</style>
            {/* Backdrop */}
            <div
                style={{ position: "absolute", inset: 0, background: "rgba(26,18,5,0.35)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease both" }}
                onClick={() => setIsCartOpen(false)}
            />

            {/* Drawer panel */}
            <div className="mp-cart-panel" style={{
                position: "relative", width: 440, maxWidth: "92vw", height: "100%",
                background: C.surface,
                borderLeft: `1px solid ${C.border}`,
                boxShadow: "-8px 0 40px rgba(26,18,5,0.12), -2px 0 8px rgba(26,18,5,0.06)",
                display: "flex", flexDirection: "column",
                animation: "slideLeft 0.32s cubic-bezier(0.16,1,0.3,1) both",
            }}>
                {/* Header */}
                <div style={{
                    padding: "18px 22px 16px",
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    flexShrink: 0,
                    background: C.card,
                }}>
                    <div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: C.t1, letterSpacing: "-0.02em", fontFamily: FONT.ui }}>
                            Cart
                            {totalItems > 0 && (
                                <span style={{ marginLeft: 8, background: C.redBg, border: `1px solid rgba(190,43,26,0.2)`, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700, color: C.red, fontFamily: FONT.mono }}>
                                    {totalItems}
                                </span>
                            )}
                        </div>
                        {shopGroups.length > 0 && (
                            <div style={{ fontSize: 12, color: C.t3, marginTop: 3, fontFamily: FONT.ui }}>
                                {shopGroups.length} shipment{shopGroups.length !== 1 ? "s" : ""}
                            </div>
                        )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {safeCart.length > 0 && (
                            <button
                                onClick={() => {
                                    if (window.confirm("Clear all items from cart?")) {
                                        saveCart([]);
                                    }
                                }}
                                style={{
                                    background: C.redDimBg, border: `1px solid rgba(220,38,38,0.2)`,
                                    borderRadius: 7, padding: "5px 10px",
                                    color: C.redDim, cursor: "pointer", fontSize: 11,
                                    fontWeight: 700, fontFamily: FONT.ui, transition: "all 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,0.12)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = C.redDimBg; }}
                            >Clear</button>
                        )}
                        <button
                            onClick={() => setIsCartOpen(false)}
                            style={{
                                width: 32, height: 32, background: C.surface,
                                border: `1px solid ${C.border}`, borderRadius: 8,
                                color: C.t3, cursor: "pointer", fontSize: 14,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.15s", flexShrink: 0,
                                fontFamily: FONT.ui,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = C.cardHover; e.currentTarget.style.color = C.t1; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.color = C.t3; }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Cart Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", minHeight: 0, background: C.bg }} className="custom-scroll">
                    {safeCart.length === 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 24px", textAlign: "center" }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: 18,
                                background: C.card, border: `1px solid ${C.border}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 28, marginBottom: 20,
                            }}>
                                🛒
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: C.t2, marginBottom: 6, fontFamily: FONT.ui }}>Cart is empty</div>
                            <div style={{ fontSize: 13, color: C.t3, lineHeight: 1.6, maxWidth: 200, fontFamily: FONT.ui, marginBottom: 16 }}>
                                Browse the marketplace and add auto parts
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                style={{
                                    background: C.redBg, border: `1px solid rgba(190,43,26,0.2)`,
                                    borderRadius: 8, padding: "8px 18px",
                                    color: C.red, fontSize: 13, fontWeight: 700,
                                    cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(190,43,26,0.14)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = C.redBg; }}
                            >← Continue Shopping</button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {shopGroups.map((group, gIdx) => (
                                <ShopGroup
                                    key={group.shopId}
                                    group={group}
                                    gIdx={gIdx}
                                    updateQty={updateQty}
                                    removeItem={removeItem}
                                    updateDeliveryOption={updateDeliveryOption}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with Checkout */}
                {safeCart.length > 0 && (
                    <div style={{
                        padding: "16px 18px 18px",
                        borderTop: `1px solid ${C.border}`,
                        background: C.card,
                        flexShrink: 0,
                    }}>
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.t3, marginBottom: 5, fontFamily: FONT.ui }}>
                                <span>Subtotal · {totalItems} item{totalItems !== 1 ? "s" : ""}</span>
                                <span style={{ fontFamily: FONT.mono, color: C.t2 }}>{fmt(totalSubtotal)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.t3, fontFamily: FONT.ui }}>
                                <span>Delivery · {shopGroups.length} shipment{shopGroups.length > 1 ? "s" : ""}</span>
                                <span style={{ fontFamily: FONT.mono, color: C.t2 }}>{totalDelivery === 0 ? "FREE" : fmt(totalDelivery)}</span>
                            </div>
                        </div>

                        <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            borderTop: `1px solid ${C.border}`, paddingTop: 12, marginBottom: 14,
                        }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.t2, fontFamily: FONT.ui }}>Total</span>
                            <span style={{ fontSize: 20, fontWeight: 900, color: C.red, fontFamily: FONT.mono }}>{fmt(totalValue)}</span>
                        </div>

                        <CheckoutButton totalValue={totalValue} onPress={() => { setIsCartOpen(false); onCheckout && onCheckout(); }} />

                        <div style={{ textAlign: "center", fontSize: 11, color: C.t4, marginTop: 10, fontFamily: FONT.ui, letterSpacing: "0.01em" }}>
                            Escrow-protected · 100% secure
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function CheckoutButton({ totalValue, onPress }) {
    const [active, setActive] = useState(false);
    return (
        <button
            onClick={onPress}
            onMouseDown={() => setActive(true)}
            onMouseUp={() => setActive(false)}
            onMouseLeave={() => setActive(false)}
            style={{
                width: "100%",
                background: `linear-gradient(135deg, #BE2B1A 0%, #991b12 100%)`,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                padding: "13px 16px",
                fontSize: 14,
                fontWeight: 900,
                cursor: "pointer",
                fontFamily: FONT.ui,
                letterSpacing: "-0.01em",
                boxShadow: `0 4px 20px rgba(190,43,26,0.3), 0 1px 4px rgba(190,43,26,0.15)`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "transform 0.12s cubic-bezier(0.16,1,0.3,1), box-shadow 0.12s",
                transform: active ? "scale(0.98)" : "scale(1)",
            }}
        >
            <span style={{ fontSize: 13 }}>🔒</span>
            Proceed to Checkout — {fmt(totalValue)}
        </button>
    );
}

function QtyButton({ children, onClick }) {
    const [active, setActive] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseDown={() => setActive(true)}
            onMouseUp={() => setActive(false)}
            onMouseLeave={() => setActive(false)}
            style={{
                width: 30, height: 30,
                background: active ? "#F0E8DF" : "#FFFFFF",
                border: "none", color: "#1A1205", cursor: "pointer", fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.1s, transform 0.1s",
                transform: active ? "scale(0.9)" : "scale(1)",
                fontFamily: FONT.ui,
            }}
        >
            {children}
        </button>
    );
}

function ShopGroup({ group, gIdx, updateQty, removeItem, updateDeliveryOption }) {
    return (
        <div style={{ background: "#FFFFFF", border: `1px solid #E0D5C8`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(26,18,5,0.06)" }}>
            {/* Shop Header */}
            <div style={{
                padding: "11px 16px",
                background: "#FAF6F0",
                borderBottom: `1px solid #E0D5C8`,
                display: "flex", alignItems: "center", gap: 10,
            }}>
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: "rgba(190,43,26,0.1)", border: `1px solid rgba(190,43,26,0.2)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, flexShrink: 0,
                }}>
                    🏪
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#1A1205", fontFamily: FONT.ui }}>
                        {group.shop?.name || "Local Shop"}
                    </div>
                    <div style={{ fontSize: 10, color: "#9C8C7C", marginTop: 1, fontFamily: FONT.ui }}>
                        Shipment {gIdx + 1} · {group.items.length} item{group.items.length !== 1 ? "s" : ""} · {fmt(group.subtotal)}
                    </div>
                    <div style={{ fontSize: 10, color: "#16A34A", marginTop: 1, fontFamily: FONT.ui }}>
                        Est. delivery: {estDelivery(group.deliveryOption)}
                    </div>
                </div>
            </div>

            {/* Items */}
            <div style={{ padding: "8px 16px" }}>
                {group.items.map((item, i) => (
                    <CartItem
                        key={i}
                        item={item}
                        isLast={i === group.items.length - 1}
                        updateQty={updateQty}
                        removeItem={removeItem}
                    />
                ))}
            </div>

            {/* Delivery selector */}
            <div style={{ padding: "10px 16px 14px", background: "#F5EFE6", borderTop: `1px solid #E0D5C8` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9C8C7C", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, fontFamily: FONT.ui }}>
                    Delivery Speed
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    {DELIVERY_OPTIONS.map(opt => {
                        const isSelected = group.deliveryOption === opt.id;
                        return (
                            <DeliveryOption
                                key={opt.id}
                                opt={opt}
                                isSelected={isSelected}
                                onSelect={() => updateDeliveryOption(group.shopId, opt.id)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function CartItem({ item, isLast, updateQty, removeItem }) {
    const [removing, setRemoving] = useState(false);
    const handleRemove = () => {
        setRemoving(true);
        setTimeout(() => removeItem(item.listing), 180);
    };
    return (
        <div style={{
            display: "flex", gap: 12,
            padding: "11px 0",
            borderBottom: isLast ? "none" : `1px solid rgba(224,213,200,0.6)`,
            opacity: removing ? 0 : 1,
            transform: removing ? "translateX(12px)" : "translateX(0)",
            transition: "opacity 0.18s, transform 0.18s",
        }}>
            {/* Thumbnail */}
            <div style={{
                width: 52, height: 52, borderRadius: 10,
                background: "#FAF6F0", border: `1px solid #E0D5C8`,
                flexShrink: 0, overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <PartImage src={item.product?.image} alt={item.product?.name} size="sm" />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1205", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT.ui }}>
                    {item.product?.name || "Auto Part"}
                </div>
                {item.product?.brand && (
                    <div style={{ fontSize: 11, color: "#9C8C7C", marginTop: 1, fontFamily: FONT.ui }}>{item.product.brand}</div>
                )}
                {item.product?.sku && (
                    <div style={{ fontSize: 10, color: "#BFB0A0", marginTop: 1, fontFamily: FONT.mono }}>Part: {item.product.sku}</div>
                )}

                {/* Qty controls */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <div style={{
                        display: "flex", alignItems: "center",
                        border: `1px solid #E0D5C8`, borderRadius: 8,
                        overflow: "hidden", background: "#FFFFFF",
                    }}>
                        <QtyButton onClick={() => updateQty(item.listing, item.qty - 1)}>−</QtyButton>
                        <span style={{
                            width: 30, height: 30,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 800, fontFamily: FONT.mono,
                            color: "#BE2B1A", borderLeft: `1px solid #E0D5C8`, borderRight: `1px solid #E0D5C8`,
                        }}>
                            {item.qty}
                        </span>
                        <QtyButton onClick={() => updateQty(item.listing, item.qty + 1)}>+</QtyButton>
                    </div>
                    <button
                        onClick={handleRemove}
                        style={{
                            background: "transparent", border: "none",
                            color: "#BFB0A0", fontSize: 11, fontWeight: 600,
                            cursor: "pointer", fontFamily: FONT.ui,
                            transition: "color 0.15s", padding: "2px 4px",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = "#DC2626"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "#BFB0A0"; }}
                    >
                        Remove
                    </button>
                </div>
            </div>

            {/* Price */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#1A1205", fontFamily: FONT.mono }}>
                    {fmt((item.listing?.selling_price || 0) * item.qty)}
                </div>
                {item.qty > 1 && (
                    <div style={{ fontSize: 10, color: "#9C8C7C", marginTop: 2, fontFamily: FONT.mono }}>
                        {fmt(item.listing?.selling_price)} each
                    </div>
                )}
            </div>
        </div>
    );
}

function DeliveryOption({ opt, isSelected, onSelect }) {
    const [active, setActive] = useState(false);
    return (
        <button
            onClick={onSelect}
            onMouseDown={() => setActive(true)}
            onMouseUp={() => setActive(false)}
            onMouseLeave={() => setActive(false)}
            style={{
                flex: 1, padding: "8px 6px",
                background: isSelected ? "rgba(190,43,26,0.08)" : "#FFFFFF",
                border: `1.5px solid ${isSelected ? "#BE2B1A" : "#E0D5C8"}`,
                borderRadius: 8, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                transition: "all 0.15s cubic-bezier(0.16,1,0.3,1)",
                transform: active ? "scale(0.96)" : "scale(1)",
                fontFamily: FONT.ui,
            }}
        >
            <span style={{ fontSize: 13 }}>{opt.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? "#BE2B1A" : "#1A1205" }}>{opt.label}</span>
            <span style={{ fontSize: 9, color: "#9C8C7C" }}>{opt.desc}</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: isSelected ? "#BE2B1A" : "#5C4F40", fontFamily: FONT.mono }}>
                {opt.fee === 0 ? "FREE" : `₹${opt.fee}`}
            </span>
        </button>
    );
}
