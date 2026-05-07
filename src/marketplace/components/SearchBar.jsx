import { useState, useMemo, useEffect } from "react";
import { T, FONT } from "../../theme";
import { searchEngine } from "../api/engine";
import { useStore } from "../../store";

const RECENT_KEY = "vl_recent_searches";
const MAX_RECENT = 5;

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}
function saveRecent(term) {
  const list = getRecent().filter(t => t !== term);
  list.unshift(term);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT))); } catch { }
}

export function SearchBar({ onSelectProduct, onOpenVehicleSelector }) {
  const { selectedVehicle, products, shops } = useStore();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => { setRecentSearches(getRecent()); }, [focused]);

  // Derive results using our engine
  const results = useMemo(() => {
    return searchEngine(query, products, shops, selectedVehicle);
  }, [query, products, shops, selectedVehicle]);

  const hasResults = results.products.length > 0 || results.categories.length > 0 || results.shops.length > 0;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (query.trim()) {
      saveRecent(query.trim());
      setRecentSearches(getRecent());
    }
  };

  const handleSelectRecent = (term) => {
    setQuery(term);
  };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 640 }}>

      {/* ── Vehicle Context Badge (above search) ── */}
      {selectedVehicle && (
        <div
          onClick={() => onOpenVehicleSelector && onOpenVehicleSelector()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: `${T.emerald}18`, border: `1px solid ${T.emerald}44`,
            borderRadius: 99, padding: "5px 14px 5px 10px", marginBottom: 10,
            cursor: "pointer", transition: "all 0.2s"
          }}
        >
          <span style={{ fontSize: 14 }}>🚗</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: T.emerald }}>
            {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}
            {selectedVehicle.variant ? ` ${selectedVehicle.variant}` : ""}
            {selectedVehicle.fuel ? ` ${selectedVehicle.fuel}` : ""}
          </span>
          <span style={{ fontSize: 10, color: T.t3, marginLeft: 4 }}>✕</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            background: focused ? T.bg : T.surface,
            border: `1.5px solid ${focused ? T.amber : T.border}`,
            borderRadius: 12,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            transition: "all 0.2s",
            boxShadow: focused ? `0 0 0 3px ${T.amber}22` : "none"
          }}
        >
          <span style={{ fontSize: 16, color: focused ? T.amber : T.t3 }}>🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder={selectedVehicle
              ? `Search parts for ${selectedVehicle.brand} ${selectedVehicle.model}${selectedVehicle.variant ? ` ${selectedVehicle.variant}` : ''}...`
              : "Search 'brake pads for Honda City 2019 petrol'..."}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: T.t1,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: FONT.ui,
              width: "100%"
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{ background: "transparent", border: "none", color: T.t4, cursor: "pointer", fontSize: 16 }}
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {/* ══ AUTOCOMPLETE DROPDOWN ══ */}
      {focused && (query.length >= 2 || recentSearches.length > 0) && (
        <div style={{
          position: "absolute",
          top: "100%", left: 0, right: 0,
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          marginTop: 8,
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          zIndex: 1000,
          overflow: "hidden",
          maxHeight: 500,
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>

            {/* ── Parsed Vehicle Detection Banner ── */}
            {query.length >= 2 && results.parsedVehicle && !selectedVehicle && (
              <div
                onClick={() => {
                  // Auto-select the parsed vehicle
                  // This would need a store action, but for now show the suggestion
                }}
                style={{
                  background: `${T.sky}14`, border: `1px solid ${T.sky}44`,
                  borderRadius: 10, padding: "10px 14px",
                  display: "flex", alignItems: "center", gap: 10
                }}
              >
                <span style={{ fontSize: 16 }}>💡</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.sky }}>
                    Detected: {results.parsedVehicle.brand} {results.parsedVehicle.model} {results.parsedVehicle.year}
                  </div>
                  <div style={{ fontSize: 11, color: T.t3 }}>
                    Showing compatible parts first
                  </div>
                </div>
              </div>
            )}

            {/* ── Recent Searches ── */}
            {query.length < 2 && recentSearches.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Recent Searches</span>
                  <button onClick={() => { localStorage.removeItem(RECENT_KEY); setRecentSearches([]); }} style={{ background: "transparent", border: "none", color: T.sky, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Clear</button>
                </div>
                {recentSearches.map(term => (
                  <div
                    key={term}
                    onClick={() => handleSelectRecent(term)}
                    className="mp-dropdown-hover"
                    style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", display: "flex", gap: 10, alignItems: "center", transition: "all 0.1s" }}
                  >
                    <span style={{ fontSize: 14, color: T.t3 }}>🕐</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{term}</span>
                  </div>
                ))}
              </div>
            )}

            {query.length >= 2 && !hasResults && (
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ color: T.t3, fontSize: 14, marginBottom: 8 }}>No results found for "{query}"</div>
                <div style={{ fontSize: 12, color: T.t4 }}>Try searching for "brake pad", "oil filter", or "spark plug"</div>
              </div>
            )}

            {query.length >= 2 && hasResults && (
              <>
                {/* ── Products ── */}
                {results.products.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px 8px" }}>
                      Products {selectedVehicle && " (Fitment Filtered)"}
                    </div>
                    {results.products.map(p => (
                      <div
                        key={p.product.id}
                        onClick={() => { saveRecent(query.trim()); onSelectProduct && onSelectProduct(p); }}
                        style={{ padding: "10px 10px", borderRadius: 8, cursor: "pointer", display: "flex", gap: 12, alignItems: "center", transition: "all 0.1s" }}
                        className="mp-dropdown-hover"
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, overflow: "hidden" }}>
                          {p.product.image ? <img src={p.product.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : "📦"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.product.name}</div>
                            {p.isCompatible && (
                              <span style={{
                                background: p.fitmentType === "universal" ? `${T.sky}22` : `${T.emerald}22`,
                                color: p.fitmentType === "universal" ? T.sky : T.emerald,
                                fontSize: 9, fontWeight: 900, padding: "2px 6px",
                                borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap"
                              }}>
                                {p.fitmentType === "universal" ? "UNIVERSAL" : "✓ EXACT FIT"}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>
                            {p.product.brand} · {p.shopCount} Seller{p.shopCount > 1 ? "s" : ""}
                            {p.fastestEta && <> · <span style={{ color: T.emerald }}>⚡ {p.fastestEta.label}</span></>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: T.amber, fontFamily: FONT.mono }}>₹{p.bestPrice}</div>
                          {p.shopCount > 1 && <div style={{ fontSize: 10, color: T.t3 }}>{p.shopCount} offers</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Categories & Shops ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {results.categories.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px 8px" }}>Categories</div>
                      {results.categories.map(c => (
                        <div key={c} className="mp-dropdown-hover" style={{ padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, color: T.t1, fontWeight: 600 }}>
                          📁 {c}
                        </div>
                      ))}
                    </div>
                  )}
                  {results.shops.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px 8px" }}>Local Shops</div>
                      {results.shops.map(s => (
                        <div key={s.id} className="mp-dropdown-hover" style={{ padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, color: T.t1, fontWeight: 600 }}>
                          🏪 {s.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
