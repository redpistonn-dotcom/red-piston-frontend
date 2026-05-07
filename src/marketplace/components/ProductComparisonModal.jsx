import { useState } from "react";
import { T, FONT } from "../../theme";
import { fmt } from "../../utils";
import { useStore } from "../../store";

export function ProductComparisonModal({ open, onClose, productData }) {
  const { cart, saveCart, setIsCartOpen } = useStore();
  const [showOtherSellers, setShowOtherSellers] = useState(false);

  if (!open || !productData) return null;
  const { product, listings, isCompatible } = productData;

  // listings[0] is the algorithmic Buy Box winner based on the engine.js ranking
  const buyBoxWinner = listings[0];
  const otherSellers = listings.slice(1);

  const addToCart = (listing) => {
    // Basic Add to Cart Implementation
    const existing = cart.find(i => i.listing.product_id === listing.product_id && i.listing.shop_id === listing.shop_id);
    if (existing) {
      saveCart(cart.map(i => i === existing ? { ...i, qty: i.qty + 1 } : i));
    } else {
      saveCart([...cart, { product, listing, qty: 1 }]);
    }
    setIsCartOpen(true);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,29,0.8)", backdropFilter: "blur(6px)" }} onClick={onClose} />

      <div style={{ position: "relative", background: T.surface, width: 800, borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.6)", border: `1px solid ${T.borderHi}`, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh", animation: "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Header Ribbon */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.card }}>
          <div style={{ fontSize: 13, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", gap: 8 }}>
            <span>{product.category}</span>
            <span>›</span>
            <span style={{ color: T.t1 }}>{product.brand}</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 24, cursor: "pointer" }}>✕</button>
        </div>

        {/* Master Product Body */}
        <div style={{ padding: 32, overflowY: "auto", flex: 1, display: "flex", gap: 32, alignItems: "flex-start", background: T.bg }}>

          {/* Left: Images & Specs */}
          <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ width: "100%", height: 320, background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden", display: "flex", padding: 24, position: "relative" }}>
              {isCompatible && (
                <div style={{ position: "absolute", top: 12, left: 12, background: T.emerald, color: "#000", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, fontFamily: FONT.ui, display: "flex", gap: 4, alignItems: "center", boxShadow: `0 4px 12px ${T.emerald}44` }}>
                  <span>✓</span> EXACT FIT
                </div>
              )}
              {product.image ? (
                <img src={product.image} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.5))" }} />
              ) : (
                <span style={{ margin: "auto", fontSize: 64, opacity: 0.2 }}>⚙️</span>
              )}
            </div>

            {/* Tech Specs */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, color: T.t1, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Technical Specifications</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(product.specifications).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: `1px dashed ${T.border}`, paddingBottom: 6 }}>
                    <span style={{ color: T.t3, textTransform: "capitalize" }}>{k}</span>
                    <span style={{ color: T.t1, fontWeight: 600, fontFamily: FONT.mono }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Master Data & Buy Box */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

            {/* Product Info */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: T.t1, margin: "0 0 8px 0", lineHeight: 1.2 }}>{product.name}</h1>
              <div style={{ fontSize: 13, color: T.t3, fontFamily: FONT.mono, display: "flex", gap: 16 }}>
                <span>SKU: <span style={{ color: T.t2 }}>{product.sku}</span></span>
              </div>
              <p style={{ fontSize: 15, color: T.t2, lineHeight: 1.6, marginTop: 16 }}>
                {product.description}
              </p>
            </div>

            {/* BUY BOX */}
            <div style={{ background: T.surface, border: `1.5px solid ${T.borderHi}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  {buyBoxWinner.discount > 0 && <span style={{ fontSize: 14, color: T.t4, textDecoration: "line-through", marginRight: 8 }}>{fmt(buyBoxWinner.selling_price / (1 - buyBoxWinner.discount / 100))}</span>}
                  <span style={{ fontSize: 36, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{fmt(buyBoxWinner.selling_price)}</span>
                </div>
                {buyBoxWinner.stock_quantity > buyBoxWinner.min_stock ? (
                  <div style={{ color: T.emerald, fontSize: 14, fontWeight: 800 }}>In Stock</div>
                ) : (
                  <div style={{ color: T.amber, fontSize: 14, fontWeight: 800 }}>Only {buyBoxWinner.stock_quantity} Left</div>
                )}
              </div>

              <button onClick={() => addToCart(buyBoxWinner)} style={{ width: "100%", background: T.amber, color: "#000", border: "none", borderRadius: 12, padding: "16px", fontSize: 16, fontWeight: 900, cursor: "pointer", boxShadow: `0 8px 24px ${T.amber}44`, display: "flex", justifyContent: "center", gap: 8, transition: "all 0.2s" }} className="btn-hover-solid">
                🛒 Add to Cart
              </button>

              <div style={{ fontSize: 13, color: T.t3, display: "flex", flexDirection: "column", gap: 4, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Ships from</span>
                  <span style={{ color: T.t1, fontWeight: 700 }}>{buyBoxWinner.shop.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Delivery</span>
                  <span style={{ color: T.t1, fontWeight: 700 }}>{buyBoxWinner.delivery_time}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Fulfillment</span>
                  <span style={{ color: T.t1, fontWeight: 700 }}>Platform Logistics</span>
                </div>
              </div>
            </div>

            {/* OTHER SELLERS ACCORDION */}
            {otherSellers.length > 0 && (
              <div style={{ marginTop: 24, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                <button
                  onClick={() => setShowOtherSellers(!showOtherSellers)}
                  style={{ width: "100%", background: T.card, border: "none", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", color: T.t1, fontSize: 14, fontWeight: 700 }}
                >
                  <span>Compare Other Sellers ({otherSellers.length})</span>
                  <span style={{ color: T.t3 }}>{showOtherSellers ? "▲" : "▼"}</span>
                </button>

                {showOtherSellers && (
                  <div style={{ background: T.bg, padding: 16, display: "flex", flexDirection: "column", animation: "fadeUp 0.2s" }}>
                    {/* Table Header */}
                    <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr", gap: 16, padding: "0 8px 8px 8px", borderBottom: `1px solid ${T.border}`, fontSize: 11, color: T.t3, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <div>Seller</div>
                      <div>Logistics</div>
                      <div style={{ textAlign: "right" }}>Price</div>
                    </div>

                    {/* Seller Rows */}
                    {otherSellers.map((s, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr", gap: 16, padding: "16px 8px", borderBottom: i !== otherSellers.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "center" }}>

                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, display: "flex", alignItems: "center", gap: 6 }}>
                            {s.shop.name}
                            {s.shop.is_featured && <span style={{ color: T.amber, fontSize: 10 }}>★</span>}
                          </div>
                          <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>⭐ {s.shop.rating.toFixed(1)} · {s.shop.reviews} reviews</div>
                        </div>

                        <div style={{ fontSize: 12 }}>
                          <div style={{ color: T.t1, fontWeight: 600 }}>{s.delivery_time}</div>
                          <div style={{ color: T.t4, marginTop: 4 }}>{s.distance}km away</div>
                        </div>

                        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: T.sky, fontFamily: FONT.mono }}>{fmt(s.selling_price)}</div>
                          <button onClick={() => addToCart(s)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 12px", color: T.t1, fontSize: 12, fontWeight: 700, cursor: "pointer" }} className="btn-hover">
                            Add
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
