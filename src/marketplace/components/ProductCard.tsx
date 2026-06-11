import { useEffect, useState } from "react";
import { T, FONT } from "../../theme";
import { fmt, getStarRating, renderStars } from "../../utils";
import { PartImage } from "./PartImage";
import { isSaved, toggleSavedItem } from "../savedItems";

const DARK = {
  cardBg: T.card, cardBorder: T.border, imageBg: T.surface,
  brandColor: T.sky, titleColor: T.t1, textMid: T.t2, textLight: T.t3,
  priceColor: T.t1, ctaBg: T.amber, ctaColor: "#000",
  heartBg: "rgba(0,0,0,0.4)", heartBorder: "none",
  discountBg: `rgba(239,68,68,0.85)`, sellerBg: "rgba(0,0,0,0.7)",
  sellerColor: T.t2, etaColor: T.emerald, cardShadow: "0 2px 8px rgba(0,0,0,0.15)",
  compareActive: T.amber, compareActiveTxt: "#000", compareInactive: "rgba(0,0,0,0.5)", compareInactiveTxt: T.t3,
  sellerPillBg: "rgba(0,0,0,0.7)", sellerPillColor: T.t2,
};

const LIGHT = {
  cardBg: "#FFFFFF", cardBorder: "#E0D5C8", imageBg: "#FAF6F0",
  brandColor: "#BE2B1A", titleColor: "#1A1205", textMid: "#5C4F40", textLight: "#9C8C7C",
  priceColor: "#1A1205", ctaBg: "#BE2B1A", ctaColor: "#FFFFFF",
  heartBg: "#FFFFFF", heartBorder: "1.5px solid #E0D5C8",
  discountBg: "#BE2B1A", sellerBg: "rgba(255,255,255,0.92)", sellerColor: "#5C4F40",
  etaColor: "#16A34A", cardShadow: "0 2px 12px rgba(26,18,5,0.07)",
  compareActive: "#BE2B1A", compareActiveTxt: "#fff", compareInactive: "rgba(255,255,255,0.9)", compareInactiveTxt: "#5C4F40",
  sellerPillBg: "rgba(255,255,255,0.92)", sellerPillColor: "#5C4F40",
};

export function ProductCard({ item, onClick, inCompare, onCompareToggle, variant = "dark" }) {
  const C = variant === "light" ? LIGHT : DARK;
  const { product, bestPrice, availability, shopCount, fastestEta, listings, isCompatible, fitmentType, bestShop } = item;
  const [wishlisted, setWishlisted] = useState(() => isSaved(product.id));

  // Stay in sync when the item is removed from the Saved Items page
  useEffect(() => {
    const sync = () => setWishlisted(isSaved(product.id));
    window.addEventListener("mp-saved-changed", sync);
    return () => window.removeEventListener("mp-saved-changed", sync);
  }, [product.id]);

  const handleWishlist = () => {
    const best = listings?.[0];
    toggleSavedItem({
      id: product.id,
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      image: product.image,
      price: bestPrice,
      inStock: availability !== 0,
      listing: best ? { shop_id: best.shop_id, product_id: best.product_id ?? product.id, selling_price: best.selling_price ?? best.price ?? bestPrice, shop: best.shop } : null,
    });
  };

  let stockColor = "#16A34A", stockLabel = "IN STOCK";
  if (availability === 0) { stockColor = "#DC2626"; stockLabel = "OUT OF STOCK"; }
  else if (availability < 5) { stockColor = "#D97706"; stockLabel = `ONLY ${availability} LEFT`; }

  const mrp = product.mrp || Math.round(bestPrice * 1.25);
  const discountPct = mrp > bestPrice ? Math.round(((mrp - bestPrice) / mrp) * 100) : 0;

  const { rating, count } = getStarRating(product.id);
  const bestListingShop = bestShop || listings?.[0]?.shop;
  const bestDistance = listings?.[0]?.distance || 5;
  const etaLabel = fastestEta?.label || "2 hours";

  return (
    <div
      onClick={onClick}
      className="mp-prod-card"
      style={{
        background: C.cardBg, border: `1px solid ${C.cardBorder}`,
        borderRadius: 14, padding: 0, cursor: "pointer",
        transition: "all 0.18s", display: "flex", flexDirection: "column",
        position: "relative", boxShadow: C.cardShadow,
        width: 260, flexShrink: 0, overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = variant === "light" ? "0 8px 28px rgba(190,43,26,0.15)" : "0 8px 28px rgba(0,0,0,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = C.cardShadow; }}
    >
      {/* WISHLIST */}
      <button
        onClick={e => { e.stopPropagation(); handleWishlist(); }}
        style={{
          position: "absolute", top: 10, right: 10, zIndex: 10,
          width: 30, height: 30, borderRadius: "50%",
          background: wishlisted ? "rgba(239,68,68,0.1)" : C.heartBg,
          border: wishlisted ? "1.5px solid #DC2626" : C.heartBorder || "none",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, transition: "all 0.15s",
          backdropFilter: variant === "light" ? "none" : "blur(4px)",
        }}
      >
        {wishlisted ? "❤️" : variant === "light" ? "🤍" : "🤍"}
      </button>

      {/* COMPARE */}
      {onCompareToggle && (
        <button
          onClick={e => { e.stopPropagation(); onCompareToggle(item); }}
          style={{
            position: "absolute", bottom: 52, right: 10, zIndex: 10,
            background: inCompare ? C.compareActive : C.compareInactive,
            border: `1px solid ${inCompare ? C.compareActive : C.cardBorder}`,
            borderRadius: 6, padding: "3px 8px",
            color: inCompare ? C.compareActiveTxt : C.compareInactiveTxt,
            fontSize: 10, fontWeight: 700, cursor: "pointer",
            transition: "all 0.15s", backdropFilter: "blur(4px)",
          }}
        >
          {inCompare ? "✓ Comparing" : "+ Compare"}
        </button>
      )}

      {/* FITMENT / STOCK BADGE */}
      {isCompatible ? (
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 10,
          background: fitmentType === "universal" ? "rgba(56,189,248,0.9)" : "rgba(22,163,74,0.9)",
          color: "#fff", padding: "4px 10px", borderRadius: 20,
          fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          {fitmentType === "universal" ? "🔧 UNIVERSAL" : "✓ EXACT FIT"}
        </div>
      ) : (
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 10,
          background: variant === "light" ? `${stockColor}18` : `${stockColor}22`,
          color: stockColor, padding: "4px 10px", borderRadius: 20,
          fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em",
          border: variant === "light" ? `1px solid ${stockColor}44` : "none",
        }}>
          {stockLabel}
        </div>
      )}

      {/* IMAGE */}
      <div style={{ width: "100%", height: 158, background: C.imageBg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderBottom: `1px solid ${C.cardBorder}` }}>
        <PartImage src={product.image} alt={product.name} size="md" />
        {/* Seller count */}
        <div style={{ position: "absolute", bottom: 8, right: 8, background: C.sellerPillBg, backdropFilter: "blur(4px)", padding: "3px 8px", borderRadius: 6, fontSize: 10, color: C.sellerPillColor, fontWeight: 700, border: variant === "light" ? "1px solid rgba(0,0,0,0.08)" : "none" }}>
          {shopCount} {shopCount === 1 ? "Seller" : "Sellers"}
        </div>
        {/* Discount */}
        {discountPct > 0 && (
          <div style={{ position: "absolute", bottom: 8, left: 8, background: C.discountBg, color: "#fff", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 900 }}>
            Save {discountPct}%
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ padding: "12px 14px 10px", display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {/* Brand */}
        <div style={{ fontSize: 10, color: C.brandColor, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, display: "flex", alignItems: "center", gap: 5 }}>
          {product.brand}
          {product.brandVerified && (
            <span style={{ background: "rgba(22,163,74,0.1)", color: "#16A34A", fontSize: 8, fontWeight: 900, padding: "2px 5px", borderRadius: 4, textTransform: "uppercase" }}>✓ Verified</span>
          )}
        </div>

        {/* Title */}
        <div style={{ fontSize: 13, fontWeight: 700, color: C.titleColor, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.6em" }}>
          {product.name}
        </div>

        {/* Stars */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ color: "#FBBF24", fontSize: 12, letterSpacing: 1 }}>{renderStars(+rating)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textMid }}>{rating}</span>
          <span style={{ fontSize: 10, color: C.textLight }}>({count})</span>
        </div>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 3 }}>
          <span style={{ fontSize: 19, fontWeight: 900, color: C.priceColor, fontFamily: variant === "light" ? "'Plus Jakarta Sans',sans-serif" : FONT.mono }}>{fmt(bestPrice)}</span>
          {discountPct > 0 && <span style={{ fontSize: 12, color: C.textLight, textDecoration: "line-through" }}>{fmt(mrp)}</span>}
          {shopCount > 1 && <span style={{ fontSize: 11, color: C.textLight }}>({shopCount} offers)</span>}
        </div>

        {/* ETA */}
        <div style={{ fontSize: 11, color: C.etaColor, fontWeight: 600, display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
          ⚡ Get it in {etaLabel}
        </div>

        {/* Shop */}
        <div style={{ fontSize: 11, color: C.textLight, display: "flex", alignItems: "center", gap: 3 }}>
          📍 {bestListingShop?.name || "Local Shop"} ({bestDistance} km)
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "0 14px 14px" }}>
        <div style={{
          background: C.ctaBg, color: C.ctaColor,
          padding: "10px 14px", borderRadius: 8,
          fontSize: 13, fontWeight: 700,
          textAlign: "center",
          boxShadow: variant === "light" ? "0 4px 12px rgba(190,43,26,0.25)" : `0 4px 12px rgba(245,158,11,0.3)`,
          letterSpacing: "0.02em",
        }}>
          View Details →
        </div>
      </div>
    </div>
  );
}
