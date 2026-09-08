import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { T, FONT } from "../theme";
import { Btn, Input } from "../components/ui";
import { searchServices, type ServiceSearchResult } from "../api/services";

const CATEGORIES = ["All", "Detailing", "PPF", "Ceramic Coating", "Car Wash", "Modification", "Interior", "Repair"];

function formatPrice(r: ServiceSearchResult): string {
  if (r.pricingType === "QUOTE_REQUIRED") return "Quote on request";
  if (r.pricingType === "VEHICLE_DEPENDENT") return "Price varies by vehicle";
  if (r.basePrice == null) return "Price on request";
  return r.pricingType === "STARTING_FROM" ? `From ₹${r.basePrice.toLocaleString("en-IN")}` : `₹${r.basePrice.toLocaleString("en-IN")}`;
}

function ResultCard({ result }: { result: ServiceSearchResult }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {result.shop.logoUrl
          ? <img src={result.shop.logoUrl} alt={result.shop.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
          : <div style={{ width: 40, height: 40, borderRadius: 10, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: T.t3 }}>{result.shop.name[0]}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{result.shop.name}</div>
          <div style={{ fontSize: 12, color: T.t3 }}>
            {result.shop.city || ""}{result.distanceKm != null ? ` · ${result.distanceKm} km away` : ""}
          </div>
        </div>
        {result.shop.isVerified && (
          <span style={{ fontSize: 10, fontWeight: 700, background: T.emeraldBg, color: T.emerald, padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>✓ Verified</span>
        )}
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{result.name}</div>
        {result.category && <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{result.category}</div>}
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: T.amber }}>{formatPrice(result)}</div>

      {result.shop.slug ? (
        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/shop/${result.shop.slug}`} style={{ textDecoration: "none", flex: 1 }}>
            <Btn variant="ghost" full size="sm">View Shop</Btn>
          </Link>
          {result.pricingType !== "QUOTE_REQUIRED" && (
            <Link to={`/book/${result.id}`} style={{ textDecoration: "none", flex: 1 }}>
              <Btn variant="amber" full size="sm">Book Now</Btn>
            </Link>
          )}
        </div>
      ) : (
        <Btn variant="ghost" full size="sm" disabled>Shop page unavailable</Btn>
      )}
    </div>
  );
}

export function ServiceDiscoveryPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState("All");
  const [priceMax, setPriceMax] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Draft vs applied — same two-stage pattern as MarketplacePage's filters.
  const [applied, setApplied] = useState({ q: query, category: "All", priceMax: "", verifiedOnly: false });

  const [results, setResults] = useState<ServiceSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    searchServices({
      q: applied.q || undefined,
      category: applied.category !== "All" ? applied.category : undefined,
      priceMax: applied.priceMax ? Number(applied.priceMax) : undefined,
      verifiedOnly: applied.verifiedOnly || undefined,
    })
      .then(res => { setResults(res.results || []); setTotal(res.total || 0); })
      .catch((e: any) => setError(e?.message || "Could not load services"))
      .finally(() => setLoading(false));
  }, [applied]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = () => setApplied({ q: query, category, priceMax, verifiedOnly });
  const resetFilters = () => {
    setQuery(""); setCategory("All"); setPriceMax(""); setVerifiedOnly(false);
    setApplied({ q: "", category: "All", priceMax: "", verifiedOnly: false });
  };

  return (
    <div style={{ fontFamily: FONT.ui, minHeight: "100vh", background: T.bg }}>
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: "16px 20px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/marketplace" style={{ color: T.t3, fontSize: 13, textDecoration: "none" }}>← Marketplace</Link>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>Find automotive services</h1>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 20px 60px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Input value={query} onChange={setQuery} placeholder="Search services, shops (e.g. ceramic coating)" onKeyDown={e => e.key === "Enter" && applyFilters()} />
          </div>
          <Input type="number" value={priceMax} onChange={setPriceMax} placeholder="Max price ₹" style={{ maxWidth: 140 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.t2, whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} />
            Verified only
          </label>
          <Btn variant="amber" onClick={applyFilters}>Search</Btn>
          <Btn variant="ghost" onClick={resetFilters}>Reset</Btn>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${category === c ? T.amber : T.border}`,
                background: category === c ? T.amber : "transparent",
                color: category === c ? "#fff" : T.t2,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: T.t3, fontSize: 13, padding: "30px 0" }}>Loading…</div>
        ) : error ? (
          <div style={{ color: T.crimson, fontSize: 13, padding: "30px 0" }}>{error}</div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: T.t3 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.t2 }}>No services found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Try a different search term or filter.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>{total} service{total !== 1 ? "s" : ""} found</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {results.map(r => <ResultCard key={r.id} result={r} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
