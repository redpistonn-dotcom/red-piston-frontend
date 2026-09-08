import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { T, FONT } from "../theme";
import { getPublicStorefront, type PublicStorefront } from "../api/storefront";
import type { Service } from "../api/services";
import { defaultCarPhoto, hideOnError } from "../utils/defaultImages";

function formatPrice(s: Service): string {
  if (s.pricingType === "QUOTE_REQUIRED") return "Quote on request";
  if (s.pricingType === "VEHICLE_DEPENDENT") {
    if (!s.vehiclePricing.length) return "Price on request";
    const min = Math.min(...s.vehiclePricing.map(v => v.price));
    return `From ₹${min.toLocaleString("en-IN")}`;
  }
  if (s.basePrice == null) return "Price on request";
  return s.pricingType === "STARTING_FROM"
    ? `₹${s.basePrice.toLocaleString("en-IN")} onwards`
    : `₹${s.basePrice.toLocaleString("en-IN")}`;
}

function RatingBadge({ summary }: { summary: PublicStorefront["reviewSummary"] }) {
  if (!summary || summary.count === 0) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: T.t2 }}>
      ★ {summary.average} <span style={{ color: T.t3, fontWeight: 500 }}>({summary.count} review{summary.count !== 1 ? "s" : ""})</span>
    </span>
  );
}

function VerifiedBadge({ badges }: { badges: PublicStorefront["badges"] }) {
  if (!badges || badges.status !== "APPROVED") return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700,
      background: T.emeraldBg, color: T.emerald, padding: "3px 10px", borderRadius: 999,
    }}>
      ✓ RedPiston Verified
    </span>
  );
}

export function PublicStorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicStorefront | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    getPublicStorefront(slug)
      .then(res => setData(res.storefront))
      .catch((e: any) => setError(e?.message || "This shop page could not be found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.t3, fontFamily: FONT.ui }}>Loading shop…</div>;
  }
  if (error || !data) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: FONT.ui }}>
        <div style={{ fontSize: 40 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.t1 }}>Shop not found</div>
        <div style={{ fontSize: 13, color: T.t3 }}>{error || "This link may be wrong or the shop hasn't set up its page yet."}</div>
        <Link to="/marketplace" style={{ color: T.amber, fontSize: 13, fontWeight: 600, textDecoration: "none", marginTop: 8 }}>Browse the marketplace →</Link>
      </div>
    );
  }

  const accent = data.accentColor || T.amber;

  return (
    <div style={{ fontFamily: FONT.ui, minHeight: "100vh", background: T.bg }}>
      <div style={{ height: 220, position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${accent}, ${T.t1})` }}>
        {/* Falls back to a generic detailing photo (not the shop's own) until they
            upload a cover — onError just lets the gradient behind it show through. */}
        <img
          src={data.coverImageUrl || defaultCarPhoto(data.shop.shopId)}
          alt=""
          onError={hideOnError}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px 60px" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginTop: -44 }}>
          {data.logoUrl
            ? <img src={data.logoUrl} alt={data.shop.name} style={{ width: 88, height: 88, borderRadius: 16, objectFit: "cover", border: `3px solid ${T.card}`, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }} />
            : <div style={{ width: 88, height: 88, borderRadius: 16, background: T.card, border: `3px solid ${T.card}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: accent }}>{data.shop.name[0]}</div>}
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>{data.shop.name}</h1>
            <VerifiedBadge badges={data.badges} />
            <RatingBadge summary={data.reviewSummary} />
          </div>
          <div style={{ fontSize: 13, color: T.t3 }}>
            {[data.shop.city, data.shop.state].filter(Boolean).join(", ") || data.shop.address || ""}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {data.shop.phone && (
              <a href={`tel:${data.shop.phone}`} style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: accent, padding: "9px 18px", borderRadius: 10, textDecoration: "none" }}>Call</a>
            )}
            {data.shop.whatsappNumber && (
              <a href={`https://wa.me/${data.shop.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 700, color: T.t1, background: T.surface, border: `1px solid ${T.border}`, padding: "9px 18px", borderRadius: 10, textDecoration: "none" }}>WhatsApp</a>
            )}
          </div>
        </div>

        {data.aboutText && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.t1, margin: "0 0 8px" }}>About</h2>
            <p style={{ fontSize: 14, color: T.t2, lineHeight: 1.6, margin: 0 }}>{data.aboutText}</p>
          </div>
        )}

        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: T.t1, margin: "0 0 12px" }}>Services</h2>
          {data.services.length === 0 ? (
            <div style={{ fontSize: 13, color: T.t3, padding: "20px 0" }}>This shop hasn't listed any services yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.services.map(s => (
                <div key={s.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14 }}>
                  <img
                    src={s.images?.[0] || defaultCarPhoto(s.id)}
                    alt=""
                    onError={hideOnError}
                    style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{s.name}</div>
                      {s.category && <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{s.category}</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: accent, whiteSpace: "nowrap" }}>{formatPrice(s)}</div>
                  </div>
                  {s.description && <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.5, margin: "10px 0 0" }}>{s.description}</p>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    {s.durationMinutes ? <div style={{ fontSize: 12, color: T.t3 }}>⏱ {Math.round(s.durationMinutes / 60)}h duration</div> : <span />}
                    {s.pricingType !== "QUOTE_REQUIRED" && (
                      <Link to={`/book/${s.id}`} style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: accent, padding: "7px 16px", borderRadius: 8, textDecoration: "none" }}>Book Now</Link>
                    )}
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {data.portfolio.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.t1, margin: "0 0 12px" }}>Previous Work</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {data.portfolio.map(item => (
                <div key={item.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    <div style={{ position: "relative" }}>
                      <img src={item.beforeImageUrl} alt="Before" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                      <span style={{ position: "absolute", top: 6, left: 6, fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "2px 7px", borderRadius: 5 }}>BEFORE</span>
                    </div>
                    <div style={{ position: "relative" }}>
                      <img src={item.afterImageUrl} alt="After" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                      <span style={{ position: "absolute", top: 6, left: 6, fontSize: 10, fontWeight: 700, color: "#fff", background: accent, padding: "2px 7px", borderRadius: 5 }}>AFTER</span>
                    </div>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{item.vehicleLabel || "—"}</div>
                    {item.service && <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{item.service.name}</div>}
                    {item.description && <p style={{ fontSize: 12, color: T.t2, lineHeight: 1.5, margin: "8px 0 0" }}>{item.description}</p>}
                    {item.priceRangeLabel && <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginTop: 8 }}>Starting {item.priceRangeLabel}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.recentReviews.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.t1, margin: "0 0 12px" }}>Reviews</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.recentReviews.map(r => (
                <div key={r.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{r.customer?.name || "Customer"}</div>
                    <div style={{ fontSize: 13, color: T.amber, fontWeight: 700 }}>{"★".repeat(r.overallRating)}{"☆".repeat(5 - r.overallRating)}</div>
                  </div>
                  {r.service && <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{r.service.name}</div>}
                  {r.comment && <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.5, margin: "8px 0 0" }}>{r.comment}</p>}
                  {r.shopResponse && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}`, background: T.surface, borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.t2, marginBottom: 3 }}>Shop response</div>
                      <div style={{ fontSize: 12, color: T.t2 }}>{r.shopResponse}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
