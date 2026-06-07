import { useRef } from "react";
import { T, FONT } from "../../theme";

export function ShopCard({ shop, variant = "dark" }) {
  const isLight = variant === "light";
  return (
    <div style={{
      background: isLight ? "#FFFFFF" : T.surface,
      border: `1px solid ${isLight ? "#E0D5C8" : T.border}`,
      borderRadius: 12, padding: 16, minWidth: 210, flexShrink: 0,
      display: "flex", flexDirection: "column", gap: 10, cursor: "pointer",
      transition: "all 0.18s",
      boxShadow: isLight ? "0 2px 10px rgba(26,18,5,0.06)" : "none",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = isLight ? "#BE2B1A" : T.amber; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = isLight ? "#E0D5C8" : T.border; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: isLight ? "rgba(190,43,26,0.1)" : `linear-gradient(135deg, ${T.amber}, ${T.amberDim})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, color: isLight ? "#BE2B1A" : "#000", fontSize: 16,
          border: isLight ? "1.5px solid rgba(190,43,26,0.2)" : "none",
        }}>
          {shop.name.charAt(0)}
        </div>
        {shop.is_featured && (
          <div style={{
            background: isLight ? "rgba(190,43,26,0.08)" : `${T.amber}22`,
            color: isLight ? "#BE2B1A" : T.amber,
            padding: "3px 7px", borderRadius: 5, fontSize: 9, fontWeight: 800, textTransform: "uppercase",
          }}>Featured</div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: isLight ? "#1A1205" : T.t1, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shop.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: isLight ? "#9C8C7C" : T.t3 }}>
          <span style={{ color: "#FBBF24" }}>⭐</span>
          <span style={{ fontWeight: 700, color: isLight ? "#1A1205" : T.t2 }}>{(shop.rating || 4.2).toFixed(1)}</span>
          {(shop.reviews || shop.review_count) ? <span>({shop.reviews || shop.review_count} reviews)</span> : null}
        </div>
      </div>

      <div style={{ fontSize: 12, color: isLight ? "#BE2B1A" : T.sky, fontWeight: 700, marginTop: "auto", display: "flex", alignItems: "center", gap: 4 }}>
        📍 {shop.city || shop.address || "Local Shop"}
        {shop.delivery_radius ? ` · ~${shop.delivery_radius}km` : ""}
      </div>
    </div>
  );
}

export function SectionCarousel({ title, children, variant = "dark" }) {
  const scrollRef = useRef(null);
  const isLight = variant === "light";
  const scroll = dir => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", overflow: "hidden" }}>
      {title ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? "#1A1205" : T.t1 }}>{title}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[[-1, "←"], [1, "→"]].map(([dir, label]) => (
              <button key={label} onClick={() => scroll(dir)} style={{
                width: 32, height: 32, borderRadius: 8,
                background: isLight ? "#FFFFFF" : T.surface,
                border: `1px solid ${isLight ? "#E0D5C8" : T.border}`,
                color: isLight ? "#5C4F40" : T.t2, cursor: "pointer", fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = isLight ? "#BE2B1A" : T.amber; e.currentTarget.style.color = isLight ? "#BE2B1A" : T.amber; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isLight ? "#E0D5C8" : T.border; e.currentTarget.style.color = isLight ? "#5C4F40" : T.t2; }}
              >{label}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
          {[[-1, "←"], [1, "→"]].map(([dir, label]) => (
            <button key={label} onClick={() => scroll(dir)} style={{
              width: 32, height: 32, borderRadius: 8,
              background: isLight ? "#FFFFFF" : T.surface,
              border: `1px solid ${isLight ? "#E0D5C8" : T.border}`,
              color: isLight ? "#5C4F40" : T.t2, cursor: "pointer", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = isLight ? "#BE2B1A" : T.amber; e.currentTarget.style.color = isLight ? "#BE2B1A" : T.amber; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isLight ? "#E0D5C8" : T.border; e.currentTarget.style.color = isLight ? "#5C4F40" : T.t2; }}
            >{label}</button>
          ))}
        </div>
      )}
      <div ref={scrollRef} className="no-scrollbar" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory", msOverflowStyle: "none", scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  );
}

export const SkeletonLoader = ({ type = "product", count = 4, variant = "dark" }) => {
  const isLight = variant === "light";
  const bg = isLight ? "#F0E8DF" : T.surface;
  const shimmer = isLight ? "#E8DDD3" : T.border;
  return (
    <div style={{ display: "flex", gap: 16, overflowX: "auto" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ width: type === "product" ? 260 : 210, height: type === "product" ? 340 : 130, background: bg, borderRadius: type === "product" ? 14 : 12, border: `1px solid ${shimmer}`, padding: 16, display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }} className="pulse">
          {type === "product" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: 60, height: 16, background: shimmer, borderRadius: 5 }} />
                <div style={{ width: 50, height: 16, background: shimmer, borderRadius: 5 }} />
              </div>
              <div style={{ width: "100%", height: 140, background: shimmer, borderRadius: 10 }} />
              <div style={{ width: 80, height: 11, background: shimmer, borderRadius: 5, marginTop: 6 }} />
              <div style={{ width: "90%", height: 16, background: shimmer, borderRadius: 5 }} />
              <div style={{ width: "60%", height: 16, background: shimmer, borderRadius: 5 }} />
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: 38, height: 38, background: shimmer, borderRadius: 10 }} />
                <div style={{ width: 45, height: 14, background: shimmer, borderRadius: 4 }} />
              </div>
              <div style={{ width: "70%", height: 16, background: shimmer, borderRadius: 5, marginTop: 8 }} />
              <div style={{ width: "40%", height: 12, background: shimmer, borderRadius: 5 }} />
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export const EmptyState = ({ title, desc, variant = "dark" }) => {
  const isLight = variant === "light";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: isLight ? "#FAF6F0" : T.surface, border: `1.5px dashed ${isLight ? "#E0D5C8" : T.border}`, borderRadius: 14, padding: 48, textAlign: "center" }}>
      <span style={{ fontSize: 40, marginBottom: 14, opacity: 0.5 }}>🔍</span>
      <div style={{ fontSize: 17, fontWeight: 800, color: isLight ? "#1A1205" : T.t1, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: isLight ? "#9C8C7C" : T.t3, maxWidth: 320, lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
};
