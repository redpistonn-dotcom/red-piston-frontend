import { useState, useMemo, useEffect, Fragment, useContext } from "react";
import { T, FONT, SHADOWS } from "../theme";
import { CATEGORIES, stockStatus, margin, fmt, useDebounce } from "../utils";
import { Badge, Btn, Input, Select, useIsMobile, ResponsiveTable, Skeleton } from "../components/ui";
import { PurchaseModal } from "../components/PurchaseModal";
import { PurchaseOrderModal } from "../components/PurchaseOrderModal";
import { SaleModal } from "../components/SaleModal";
import { StockAdjustmentModal } from "../components/StockAdjustmentModal";
import { printBarcodeLabels } from "../barcode";
import { useStore } from "../store";
import { AppCtx } from "../AppCtx";
import { useVehicleManufacturers, useVehicleModels } from "../hooks/queries";
import { fetchInventory } from "../api/sync.js";
import { deleteInventory } from "../api/inventory.js";
import { BatchesSlideOver } from "../components/BatchesSlideOver";
import { searchBatches } from "../api/stockBatches.js";

// Pure helper — no fitment data = show universally (don't hide DB-backed parts)
function isProductCompatible(product, matchStr) {
  if (!matchStr) return "universal";
  if (product.isUniversal) return "universal";
  const compat = product.compatibleVehicles || [];
  if (compat.length === 0) return "universal"; // unknown fitment → always visible
  if (compat.some(v => v.toLowerCase() === "universal")) return "universal";
  if (compat.some(v => v.toLowerCase().includes(matchStr.toLowerCase()))) return "compatible";
  return false;
}

export function InventoryPage() {
  const { products: storeProducts, movements, activeShopId, saveProducts, shops } = useStore();
  const { handleSale: onSale, handlePurchase: onPurchase, handleAdjustment: onAdjust, toast, setAddProdOpen, setPModal } = useContext(AppCtx);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const onAdd = () => setAddProdOpen(true);
  const onEdit = (p) => setPModal({ open: true, product: p });
  const onDelete = async (p) => {
    const invId = p.inventoryId ?? p.id;
    // Warn if this product has sales/purchase history that would be orphaned
    const histCount = (movements || []).filter(m =>
      ['SALE', 'PURCHASE', 'RETURN_IN', 'RETURN_OUT', 'DAMAGE', 'THEFT', 'AUDIT'].includes(m.type) &&
      (String(m.productId) === String(invId) || String(m.productId) === String(p.id))
    ).length;
    const histLine = histCount > 0
      ? `\n\n⚠ This product has ${histCount} history record${histCount !== 1 ? 's' : ''} (sales, purchases, adjustments). Those records stay in History but will no longer show a product name.`
      : '';
    if (!window.confirm(`Delete "${p.name}"?${histLine}\n\nThis cannot be undone.`)) return;
    // Local-only items (never synced to DB) have a "p" string id — just remove from local state.
    if (!p.inventoryId || !Number.isFinite(Number(invId))) {
      saveProducts((storeProducts || []).filter(x => (x.inventoryId ?? x.id) !== invId), true);
      toast?.("Product removed", "success");
      return;
    }
    try {
      setDeletingId(invId);
      await deleteInventory(invId);
      saveProducts((storeProducts || []).filter(x => Number(x.inventoryId ?? x.id) !== Number(invId)), true);
      toast?.("Product deleted", "success");
    } catch (e) {
      toast?.(e?.data?.error || e?.message || "Could not delete product", "warning");
    } finally {
      setDeletingId(null);
    }
  };
    const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
    const [cat, setCat] = useState("All");
    const [statusF, setStatusF] = useState("All");
    const [sortBy, setSortBy] = useState("newest");
    const [deletingId, setDeletingId] = useState<string | number | null>(null);
    const [saleP, setSaleP] = useState(null);
    const [purchP, setPurchP] = useState(null);
    const [adjP, setAdjP] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [showVehicleFilter, setShowVehicleFilter] = useState(false);
    const [visibleCount, setVisibleCount] = useState(50);
    // Vehicle selection state: Brand → Model → Year
    const [selBrand, setSelBrand] = useState(null);   // full VehicleManufacturer object
    const [selModel, setSelModel] = useState(null);   // full VehicleModel object
    const [selYear, setSelYear] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [poModalOpen, setPoModalOpen] = useState(false);
    const [batchP, setBatchP] = useState(null);

    // Batch search state
    const [batchSearch, setBatchSearch] = useState("");
    const [batchResults, setBatchResults] = useState<any[]>([]);
    const [batchSearching, setBatchSearching] = useState(false);
    const [showBatchSearch, setShowBatchSearch] = useState(false);
    const debouncedBatchSearch = useDebounce(batchSearch, 400);

    const debouncedSearch = useDebounce(search, 300);

    // Reset pagination whenever a filter changes — otherwise a previous
    // "Load more" depth carries over to a freshly-filtered (shorter) list
    useEffect(() => {
        setVisibleCount(50);
    }, [debouncedSearch, cat, statusF, selBrand, selModel, selYear]);

    // Batch search — fires when user types in the batch search bar
    useEffect(() => {
      if (!debouncedBatchSearch.trim()) {
        setBatchResults([]);
        return;
      }
      let cancelled = false;
      setBatchSearching(true);
      searchBatches(debouncedBatchSearch.trim())
        .then(data => { if (!cancelled) setBatchResults(Array.isArray(data) ? data : []); })
        .catch(() => { if (!cancelled) setBatchResults([]); })
        .finally(() => { if (!cancelled) setBatchSearching(false); });
      return () => { cancelled = true; };
    }, [debouncedBatchSearch]);

    // Vehicle data via TanStack Query — auto-cached, no manual useEffect needed
    const { data: mfgData } = useVehicleManufacturers();
    const manufacturers = Array.isArray(mfgData) ? mfgData : [];

    const { data: modelData } = useVehicleModels(selBrand?.manufacturerId ?? 0);
    const vehicleModels = Array.isArray(modelData) ? modelData : [];

    // Year list derived from selected model's year range
    const modelYears = useMemo(() => {
        if (!selModel) return [];
        const from = selModel.yearFrom || 1990;
        const to   = selModel.yearTo   || new Date().getFullYear();
        const years = [];
        for (let y = to; y >= from; y--) years.push(y);
        return years;
    }, [selModel]);

    // "Maruti Suzuki Swift" string used for compatibility matching
    const vehicleMatchStr = useMemo(() => {
        if (!selBrand || !selModel) return null;
        return `${selBrand.name} ${selModel.name}`;
    }, [selBrand, selModel]);

    const shopProducts = useMemo(() => (storeProducts ?? []).filter(p => p.shopId === activeShopId), [storeProducts, activeShopId]);

    // Category pills derived from the products actually present, so a pill's value
    // always matches a real `p.category` and filtering can never silently return
    // nothing (the hardcoded CATEGORIES list could mismatch normalized DB values).
    // Known categories keep their canonical order; any extra DB categories follow.
    const availableCats = useMemo(() => {
        const present = new Set(shopProducts.map(p => p.category).filter(Boolean));
        const ordered = CATEGORIES.filter(c => present.has(c));
        const extras = [...present].filter(c => !CATEGORIES.includes(c)).sort();
        return [...ordered, ...extras];
    }, [shopProducts]);

    const filtered = useMemo(() => {
        let list = shopProducts
            .filter(p => cat === "All" || p.category === cat)
            .filter(p => statusF === "All" || stockStatus(p) === statusF)
            .filter(p => !debouncedSearch || [p.name, p.sku, p.brand, p.oemNumber].some(s => (s || "").toLowerCase().includes(debouncedSearch.toLowerCase())));

        // Vehicle compatibility filter
        if (vehicleMatchStr) {
            list = list.filter(p => {
                const compat = isProductCompatible(p, vehicleMatchStr);
                return compat === "compatible" || compat === "universal";
            });
        }

        return list.sort((a, b) => {
            // If vehicle selected, sort compatible first, then universal
            if (vehicleMatchStr) {
                const ca = isProductCompatible(a, vehicleMatchStr);
                const cb = isProductCompatible(b, vehicleMatchStr);
                if (ca === "compatible" && cb !== "compatible") return -1;
                if (cb === "compatible" && ca !== "compatible") return 1;
            }
            if (sortBy === "newest") return (b.createdAt ?? 0) - (a.createdAt ?? 0);
            if (sortBy === "oldest") return (a.createdAt ?? 0) - (b.createdAt ?? 0);
            if (sortBy === "profit") return (b.sellPrice - b.buyPrice) - (a.sellPrice - a.buyPrice);
            if (sortBy === "margin") return +margin(b.buyPrice, b.sellPrice) - +margin(a.buyPrice, a.sellPrice);
            if (sortBy === "stock") return a.stock - b.stock;
            if (sortBy === "value") return b.buyPrice * b.stock - a.buyPrice * a.stock;
            if (sortBy === "sell") return b.sellPrice - a.sellPrice;
            return a.name.localeCompare(b.name);
        });
    }, [shopProducts, cat, statusF, debouncedSearch, sortBy, vehicleMatchStr]);

    // Last 7-day sales count per product
    const sevenDayCutoff = Date.now() - 7 * 86400000;
    const salesLast7d = useMemo(() => {
        const map = {};
        (movements || []).forEach(m => {
            if (m.type === "SALE" && m.shopId === activeShopId && m.date >= sevenDayCutoff) {
                map[m.productId] = (map[m.productId] || 0) + m.qty;
            }
        });
        return map;
    }, [movements, activeShopId, sevenDayCutoff]);

    const counts = {
        out: shopProducts.filter(p => p.stock <= 0).length,
        low: shopProducts.filter(p => p.stock > 0 && p.stock < p.minStock).length,
    };

    const handleGeneratePO = () => {
        const itemsToPO = selectedIds.length > 0
            ? shopProducts.filter(p => selectedIds.includes(p.id))
            : shopProducts.filter(p => p.stock < p.minStock);
        if (itemsToPO.length === 0) {
            toast?.("No items selected or below minimum stock!", "info");
            return;
        }
        setPoModalOpen(true);
    };

    const toggleSelect = (id, e) => {
        e?.stopPropagation();
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(p => p.id));
        }
    };

    const isMobile = useIsMobile();

    // Low-stock banner: dismissed per browser session so it resets on next login
    const [bannerDismissed, setBannerDismissed] = useState(() => sessionStorage.getItem('vl_low_stock_dismissed') === '1');
    const dismissBanner = () => { sessionStorage.setItem('vl_low_stock_dismissed', '1'); setBannerDismissed(true); };

    // Block render until API responds — prevents stale localStorage flash.
    // Shimmer skeleton so the load is clearly visible.
    if (storeProducts === null) {
      return <Skeleton.Page kpis={4} cols={6} rows={8} />;
    }

    return (
        <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>

            {/* ── LOAD ERROR BANNER ── */}
            {loadError && (
              <div style={{ background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.2)", borderLeft: "4px solid #DC2626", borderRadius: "0 10px 10px 0", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#991B1B" }}>{loadError}</span>
                <button onClick={() => setRetryKey(k => k + 1)} style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>Retry</button>
              </div>
            )}

            {/* ── LOW STOCK ALERT BANNER — dismissed per session ── */}
            {(counts.low + counts.out) > 0 && !bannerDismissed && (
              <div style={{
                background: "#FFFBF0",
                border: "1px solid rgba(245,158,11,0.25)",
                borderLeft: "4px solid #F59E0B",
                borderRadius: "0 10px 10px 0",
                padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>Low Stock Alert </span>
                  <span style={{ fontSize: 12, color: "#78350F" }}>
                    {counts.low + counts.out} SKUs are below the safety threshold
                    {counts.out > 0 ? ` · ${counts.out} out of stock` : ""}
                  </span>
                </div>
                <button
                  onClick={() => setStatusF("low")}
                  style={{ background: "none", border: "none", color: T.amber, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, letterSpacing: "0.05em", flexShrink: 0 }}
                >VIEW ALL</button>
                <button
                  onClick={dismissBanner}
                  title="Dismiss for this session"
                  style={{ background: "none", border: "none", color: "#B45309", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
                >×</button>
              </div>
            )}

            {/* ── SEARCH + ACTIONS ROW ── */}
            <div className="inv-toolbar" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {/* Search box — on mobile it shares row 1 with the ≡ filter button */}
              <div className="inv-search" style={{ flex: 1, minWidth: isMobile ? 0 : 220, position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.t3, fontSize: 15, pointerEvents: "none" }}>🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={isMobile ? "Search parts…" : "Search by SKU, Product Name or OEM..."}
                  style={{
                    width: "100%", height: isMobile ? 46 : 40,
                    background: "#FFFFFF",
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "0 36px 0 38px",
                    fontSize: isMobile ? 16 : 13, color: T.t1,
                    fontFamily: FONT.ui, outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.t3, fontSize: 14, padding: 2 }}>×</button>
                )}
              </div>

              {/* Sort cycle button — newest → oldest → name → stock → margin → newest */}
              <button
                className="inv-filter-btn"
                title={{
                  newest: "Newest first (click for Oldest)",
                  oldest: "Oldest first (click for Name A–Z)",
                  name:   "Name A–Z (click for Stock)",
                  stock:  "Stock ↑ (click for Margin)",
                  margin: "Margin ↑ (click for Newest)",
                }[sortBy] ?? "Sort"}
                onClick={() => setSortBy(
                  sortBy === "newest" ? "oldest"
                  : sortBy === "oldest" ? "name"
                  : sortBy === "name"   ? "stock"
                  : sortBy === "stock"  ? "margin"
                  : "newest"
                )}
                style={{ height: 40, padding: "0 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: "#FFFFFF", color: T.t2, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0, fontSize: 12, fontWeight: 600, fontFamily: FONT.ui, whiteSpace: "nowrap" }}
              >
                {{
                  newest: "🕐 Newest",
                  oldest: "🕐 Oldest",
                  name:   "A–Z",
                  stock:  "Stock",
                  margin: "Margin",
                }[sortBy] ?? "Sort"}
              </button>

              {/* Generate Draft PO */}
              <button
                className="inv-po-btn"
                onClick={handleGeneratePO}
                style={{ height: 40, padding: "0 16px", background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t1, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap", flexShrink: 0 }}
              >Generate Draft PO{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}</button>

              {/* + Add Product — solid maroon */}
              <button
                className="inv-add-btn"
                onClick={onAdd}
                style={{ height: 40, padding: "0 18px", background: T.amber, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap", flexShrink: 0 }}
              >+ Add Product</button>
            </div>

            {/* ── BATCH / SERIAL SEARCH BAR ── */}
            <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => { setShowBatchSearch(v => !v); if (showBatchSearch) { setBatchSearch(""); setBatchResults([]); } }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 20,
                    border: `1px solid ${showBatchSearch ? T.amber : T.border}`,
                    background: showBatchSearch ? T.amberGlow : "transparent",
                    color: showBatchSearch ? T.amber : T.t2,
                    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui,
                    flexShrink: 0,
                  }}
                >
                  🔢 Search by Batch / Serial {showBatchSearch ? "▲" : "▼"}
                </button>
                {showBatchSearch && (
                  <div style={{ flex: 1, position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.t3, pointerEvents: "none" }}>🔍</span>
                    <input
                      autoFocus
                      value={batchSearch}
                      onChange={e => setBatchSearch(e.target.value)}
                      placeholder="Enter batch #, LOT-…, S/N:…"
                      style={{
                        width: "100%", height: 36,
                        background: "#FFFFFF",
                        border: `1px solid ${T.border}`,
                        borderRadius: 8, padding: "0 32px 0 32px",
                        fontSize: 13, color: T.t1,
                        fontFamily: FONT.ui, outline: "none", boxSizing: "border-box",
                      }}
                      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }}
                    />
                    {batchSearch && (
                      <button onClick={() => { setBatchSearch(""); setBatchResults([]); }} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.t3, fontSize: 14, padding: 2 }}>×</button>
                    )}
                  </div>
                )}
                {!showBatchSearch && <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>Find a product by its batch number, lot code, or serial number</span>}
              </div>

              {/* Batch search results */}
              {showBatchSearch && batchSearch.trim() && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                  {batchSearching && (
                    <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.ui, padding: "4px 2px" }}>Searching…</div>
                  )}
                  {!batchSearching && batchResults.length === 0 && (
                    <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.ui, padding: "4px 2px" }}>No batches found for "{batchSearch}"</div>
                  )}
                  {!batchSearching && batchResults.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 11, color: T.t3, fontWeight: 600, fontFamily: FONT.ui }}>{batchResults.length} batch{batchResults.length !== 1 ? "es" : ""} found</div>
                      {batchResults.map((b, i) => (
                        <div key={b.id ?? i} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          background: T.surfaceContainerLow,
                          border: `1px solid ${T.border}`,
                          borderRadius: 8, padding: "9px 14px",
                          flexWrap: "wrap",
                        }}>
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: T.t1, fontFamily: FONT.ui }}>{b.productName || "—"}</div>
                            {b.sku && <div style={{ fontSize: 10, color: T.t3, fontFamily: FONT.mono, marginTop: 1 }}>{b.sku}</div>}
                          </div>
                          {b.batchNumber && (
                            <span style={{ fontSize: 11, fontFamily: FONT.mono, color: T.amber, background: T.amberGlow, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>📦 {b.batchNumber}</span>
                          )}
                          {b.serialNumber && (
                            <span style={{ fontSize: 11, fontFamily: FONT.mono, color: T.sky, background: T.skyBg, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>S/N {b.serialNumber}</span>
                          )}
                          <div style={{ fontSize: 11, color: T.t2, fontFamily: FONT.ui }}>
                            Rcvd: <span style={{ fontWeight: 700, fontFamily: FONT.mono }}>{b.qtyReceived}</span>
                            {" · "}Rem: <span style={{ fontWeight: 700, fontFamily: FONT.mono, color: b.qtyRemaining === 0 ? T.t4 : T.emerald }}>{b.qtyRemaining}</span>
                          </div>
                          {b.supplierName && <div style={{ fontSize: 11, color: T.t3 }}>{b.supplierName}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── CATEGORY TABS (design: pill tabs; mobile = one scrollable row) ── */}
            <div className="inv-chips" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {["All", ...availableCats].map(c => {
                const isAct = c === cat;
                return (
                  <button key={c} onClick={() => setCat(c)} style={{
                    padding: "7px 18px", borderRadius: 20,
                    border: `1px solid ${isAct ? T.amber : T.border}`,
                    background: isAct ? T.amber : "#FFFFFF",
                    color: isAct ? "#FFFFFF" : T.t2,
                    fontSize: 13, fontWeight: isAct ? 700 : 500,
                    cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.15s",
                  }}>{c === "All" ? "All Inventory" : c}</button>
                );
              })}
              {/* Stock quick-filters — right side */}
              <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
                {([["All", "All"], ["low", `Low (${counts.low})`], ["out", `Out (${counts.out})`]] as const).map(([v, l]) => {
                  const isActive = statusF === v;
                  const col = v === "out" ? T.crimson : v === "low" ? "#D97706" : T.t2;
                  return (
                    <button key={v} onClick={() => setStatusF(v)} style={{
                      padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: isActive ? 700 : 400,
                      border: `1px solid ${isActive ? col : T.border}`,
                      background: isActive ? `${col}10` : "transparent",
                      color: isActive ? col : T.t3,
                      cursor: "pointer", fontFamily: FONT.ui,
                    }}>{l}</button>
                  );
                })}
              </div>
            </div>

            {/* ── VEHICLE FILTER BAR (collapsible, hidden by default) ── */}
            <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px" }}>
                {/* Vehicle filter: trigger pill + collapsible dropdowns */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {vehicleMatchStr ? (
                        <button onClick={() => { setSelBrand(null); setSelModel(null); setSelYear(""); setShowVehicleFilter(false); }}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, border: `1px solid ${T.amber}`, background: T.amberGlow, color: T.amber, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>
                            🚗 {vehicleMatchStr}{selYear ? ` ${selYear}` : ""} <span style={{ fontSize: 13, lineHeight: 1 }}>×</span>
                        </button>
                    ) : (
                        <button onClick={() => setShowVehicleFilter(v => !v)}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, border: `1px solid ${showVehicleFilter ? T.amber : T.border}`, background: showVehicleFilter ? T.amberSoft : "transparent", color: showVehicleFilter ? T.amber : T.t2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui }}>
                            🚗 Filter by Vehicle {showVehicleFilter ? "▲" : "▼"}
                        </button>
                    )}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>{manufacturers.length} brands · {filtered.length} parts</span>
                </div>
                {showVehicleFilter && !vehicleMatchStr && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                        <select value={selBrand?.manufacturerId || ""} onChange={e => { const mfg = manufacturers.find(m => m.manufacturerId === parseInt(e.target.value, 10)); setSelBrand(mfg || null); setSelModel(null); setSelYear(""); }} style={{ background: T.surface, border: `1px solid ${selBrand ? T.amber + "66" : T.border}`, borderRadius: 8, padding: "6px 10px", color: selBrand ? T.t1 : T.t3, fontSize: 12, fontFamily: FONT.ui, cursor: "pointer", minWidth: 140, outline: "none" }}>
                            <option value="">Brand</option>
                            {manufacturers.map(m => <option key={m.manufacturerId} value={m.manufacturerId}>{m.name}</option>)}
                        </select>
                        {selBrand && <select value={selModel?.modelId || ""} onChange={e => { const mdl = vehicleModels.find(m => m.modelId === parseInt(e.target.value, 10)); setSelModel(mdl || null); setSelYear(""); }} style={{ background: T.surface, border: `1px solid ${selModel ? T.amber + "66" : T.border}`, borderRadius: 8, padding: "6px 10px", color: selModel ? T.t1 : T.t3, fontSize: 12, fontFamily: FONT.ui, cursor: "pointer", minWidth: 140, outline: "none" }}><option value="">Model</option>{vehicleModels.map(m => <option key={m.modelId} value={m.modelId}>{m.name}</option>)}</select>}
                        {selBrand && selModel && <select value={selYear} onChange={e => setSelYear(e.target.value)} style={{ background: T.surface, border: `1px solid ${selYear ? T.amber + "66" : T.border}`, borderRadius: 8, padding: "6px 10px", color: selYear ? T.t1 : T.t3, fontSize: 12, fontFamily: FONT.ui, cursor: "pointer", minWidth: 80, outline: "none" }}><option value="">Year</option>{modelYears.map(y => <option key={y} value={y}>{y}</option>)}</select>}
                        {selBrand && <button onClick={() => { setSelBrand(null); setSelModel(null); setSelYear(""); }} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", color: T.t3, fontSize: 12, cursor: "pointer", fontFamily: FONT.ui }}>✕ Clear</button>}
                    </div>
                )}
            </div>

            {/* Results count */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.ui }}>
                    Showing <span style={{ color: T.t1, fontWeight: 700 }}>{Math.min(visibleCount, filtered.length)}</span> of <span style={{ color: T.t1, fontWeight: 700 }}>{filtered.length}</span> products
                    {(search || cat !== "All" || statusF !== "All") && (
                        <button onClick={() => { setSearch(""); setCat("All"); setStatusF("All"); setSelBrand(null); setSelModel(null); setSelYear(""); }} style={{ marginLeft: 10, background: "none", border: "none", color: T.amber, fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: FONT.ui }}>Clear filters</button>
                    )}
                </div>
                <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>{shopProducts.length} total SKUs</div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: T.t3 }}>
                    <div style={{ fontSize: 56, opacity: 0.3, marginBottom: 16 }}>📦</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.t2, marginBottom: 8, fontFamily: FONT.display }}>No products found</div>
                    <div style={{ fontSize: 13, color: T.t3, marginBottom: 20 }}>Try adjusting your search or filters</div>
                    <button onClick={() => { setSearch(""); setCat("All"); setStatusF("All"); setSelBrand(null); setSelModel(null); setSelYear(""); }} style={{ background: T.amber, border: "none", borderRadius: 10, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>Clear Filters</button>
                </div>
            )}

            {/* ── PRODUCT TABLE (design: ICON | PRODUCT | CAT. | BUY | SELL | MARGIN | STOCK | RACK | ACTIONS)
                 Rendered at ALL widths — on mobile the design keeps the table, horizontally scrollable inside .table-scroll ── */}
            {filtered.length > 0 && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOWS.sm }}>
              <div className="table-scroll">
                <table className="inv-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th className="th-cell" style={{ width: 48, padding: "11px 14px" }} />
                            {[
                              ["PRODUCT", "left", 220],
                              ["CAT.", "left", 90],
                              ["BUY", "right", 90],
                              ["SELL", "right", 90],
                              ["MARGIN", "right", 90],
                              ["STOCK", "center", 100],
                              ["RACK", "left", 80],
                              ["ACTIONS", "center", 140],
                            ].map(([h, align, w]) => (
                                <th key={h as string} className="th-cell" style={{ textAlign: align as "left"|"right"|"center", width: w as number }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.slice(0, visibleCount).map(p => {
                            const mg = margin(p.buyPrice, p.sellPrice);
                            const st = stockStatus(p);
                            return (
                                <Fragment key={p.id}>
                                    <tr className="trow" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} style={{
                                        borderBottom: expandedId === p.id ? "none" : `1px solid ${T.border}`,
                                        background: expandedId === p.id ? T.surfaceContainerLow : T.card,
                                        cursor: "pointer", transition: "background 0.12s",
                                        borderLeft: `3px solid ${st === "out" ? T.crimson : st === "low" ? "#F59E0B" : "transparent"}`,
                                    }}>
                                        {/* ICON */}
                                        <td style={{ padding: "10px 10px 10px 14px" }}>
                                            {p.image && p.image.startsWith("http") ? (
                                                <img src={p.image} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", display: "block", border: `1px solid ${T.border}` }}
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                            ) : (
                                                <div style={{ width: 36, height: 36, borderRadius: 8, background: T.amberGlow, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                                                    {/* The edit modal stores the chosen emoji in `image`; show it (non-URL) before falling back. */}
                                                    {(p.image && !String(p.image).startsWith("http") ? p.image : null) || p.imageEmoji || "📦"}
                                                </div>
                                            )}
                                        </td>
                                        {/* PRODUCT (name + OEM sub-text) */}
                                        <td style={{ padding: "10px 12px" }}>
                                            <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{p.name}</div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2, flexWrap: "wrap" }}>
                                                {p.oemNumber && <span style={{ fontSize: 10, color: T.t3, fontFamily: FONT.mono }}>{p.oemNumber}</span>}
                                                {!p.oemNumber && <span style={{ fontSize: 10, color: T.t4, fontFamily: FONT.mono }}>{p.sku}</span>}
                                                {p.globalSku && <span style={{ fontSize: 9, fontWeight: 700, color: "#8B5CF6", background: "rgba(139,92,246,0.1)", padding: "1px 5px", borderRadius: 4 }}>Catalog</span>}
                                                {vehicleMatchStr && (() => {
                                                    const compat = isProductCompatible(p, vehicleMatchStr);
                                                    if (compat === "compatible") return <span style={{ fontSize: 9, fontWeight: 700, color: T.emerald, background: T.emeraldBg, padding: "1px 5px", borderRadius: 4 }}>✓ Fit</span>;
                                                    if (compat === "universal") return <span style={{ fontSize: 9, fontWeight: 700, color: T.sky, background: T.skyBg, padding: "1px 5px", borderRadius: 4 }}>Universal</span>;
                                                    return null;
                                                })()}
                                            </div>
                                        </td>
                                        {/* CAT. */}
                                        <td style={{ padding: "10px 12px" }}>
                                            <span style={{ background: `${T.amber}12`, color: T.amber, fontSize: 10, padding: "3px 8px", borderRadius: 6, fontWeight: 700, fontFamily: FONT.ui }}>{p.category}</span>
                                        </td>
                                        {/* BUY */}
                                        <td style={{ padding: "10px 12px", textAlign: "right", color: T.t3, fontFamily: FONT.mono, fontSize: 12 }}>{fmt(p.buyPrice)}</td>
                                        {/* SELL */}
                                        <td style={{ padding: "10px 12px", textAlign: "right", color: T.t1, fontFamily: FONT.mono, fontSize: 13, fontWeight: 700 }}>{fmt(p.sellPrice)}</td>
                                        {/* MARGIN */}
                                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                            <span style={{ fontSize: 12, fontFamily: FONT.mono, fontWeight: 700, color: +mg > 30 ? T.emerald : +mg > 15 ? "#D97706" : T.crimson }}>{mg}%</span>
                                        </td>
                                        {/* STOCK (current / min) */}
                                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
                                                <span style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 15, color: p.stock === 0 ? T.crimson : p.stock < p.minStock ? "#D97706" : T.t1 }}>{p.stock}</span>
                                                <span style={{ fontSize: 10, color: T.t4, fontFamily: FONT.mono }}>/{p.minStock}</span>
                                            </div>
                                            {/* Stock status dot */}
                                            <div style={{ fontSize: 9, fontWeight: 700, color: st === "out" ? T.crimson : st === "low" ? "#D97706" : T.emerald, marginTop: 1, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                                {st === "out" ? "Out" : st === "low" ? "Low" : "OK"}
                                            </div>
                                        </td>
                                        {/* RACK */}
                                        <td style={{ padding: "10px 12px", fontFamily: FONT.mono, fontSize: 11, color: p.location ? T.t2 : T.t4 }}>{p.location || "—"}</td>
                                        {/* ACTIONS */}
                                        <td style={{ padding: "10px 14px 10px 10px", textAlign: "center" }}>
                                            <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }} onClick={e => e.stopPropagation()}>
                                                {/* Edit icon button */}
                                                <button title="Edit" onClick={() => onEdit(p)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.t2, transition: "all 0.12s" }}>✎</button>
                                                {/* Adjust stock icon button */}
                                                <button title="Adjust Stock" onClick={() => setAdjP(p)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.t2, transition: "all 0.12s" }}>⚖</button>
                                                {/* Batches icon button */}
                                                <button title="Batch / Lot Tracking" onClick={() => setBatchP(p)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.sky, transition: "all 0.12s" }}>📦</button>
                                                {/* Delete icon button */}
                                                <button title="Delete" onClick={() => onDelete(p)} disabled={deletingId === (p.inventoryId ?? p.id)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: deletingId === (p.inventoryId ?? p.id) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.crimson, transition: "all 0.12s", opacity: deletingId === (p.inventoryId ?? p.id) ? 0.5 : 1 }}>{deletingId === (p.inventoryId ?? p.id) ? "⏳" : "🗑"}</button>
                                                {/* REORDER — only for low/out stock */}
                                                {(st === "low" || st === "out") && (
                                                    <button onClick={(e) => { e.stopPropagation(); setPurchP(p); }} style={{ height: 30, padding: "0 10px", borderRadius: 8, border: "none", background: T.amber, color: "#FFFFFF", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>REORDER</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {/* Expandable Detail Panel */}
                                    {expandedId === p.id && (
                                        <tr style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
                                            <td colSpan={9} style={{ padding: 0 }}>
                                                <div style={{ padding: "16px 24px 20px", animation: "fadeIn 0.2s ease" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                                        <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, display: "flex", gap: 8, alignItems: "center" }}>
                                                            {p.image && p.image.startsWith("http")
                                                                ? <img src={p.image} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: "cover", verticalAlign: "middle" }} />
                                                                : <span style={{ fontSize: 18 }}>{p.image || p.imageEmoji || "📦"}</span>
                                                            } {p.name}
                                                            <span style={{ fontSize: 10, color: T.t4, fontWeight: 500 }}>— Automobile Details</span>
                                                        </div>
                                                        <button onClick={(e) => { e.stopPropagation(); setExpandedId(null); }} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 10px", color: T.t3, fontSize: 11, cursor: "pointer", fontFamily: FONT.ui }}>✕ Close</button>
                                                    </div>
                                                    <div className="detail-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                                                        {/* OEM Number */}
                                                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                                                            <div style={{ fontSize: 9, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>OEM Number</div>
                                                            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: FONT.mono, color: p.oemNumber ? T.amber : T.t4 }}>{p.oemNumber || "Not Available"}</div>
                                                        </div>
                                                        {/* SKU */}
                                                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                                                            <div style={{ fontSize: 9, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>SKU Number</div>
                                                            <div style={{ fontSize: 14, fontWeight: 800, fontFamily: FONT.mono, color: T.sky }}>{p.sku || "Not Available"}</div>
                                                        </div>
                                                        {/* Position */}
                                                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                                                            <div style={{ fontSize: 9, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Position</div>
                                                            <div style={{ fontSize: 14, fontWeight: 800, color: p.position ? T.emerald : T.t4 }}>{p.position || "Not Available"}</div>
                                                        </div>
                                                        {/* Engine Type */}
                                                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                                                            <div style={{ fontSize: 9, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Engine Type</div>
                                                            <div style={{ fontSize: 14, fontWeight: 800, color: p.engineType ? "#818CF8" : T.t4 }}>{p.engineType || "Not Available"}</div>
                                                        </div>
                                                        {/* Transmission */}
                                                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                                                            <div style={{ fontSize: 9, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Transmission</div>
                                                            <div style={{ fontSize: 14, fontWeight: 800, color: p.transmission ? T.amber : T.t4 }}>{p.transmission || "Not Available"}</div>
                                                        </div>
                                                        {/* Cross Reference / Condition */}
                                                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                                                            <div style={{ fontSize: 9, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Condition / Ref</div>
                                                            <div style={{ fontSize: 14, fontWeight: 800, color: p.condition === "New" ? T.emerald : T.amber }}>{p.condition || "New"}</div>
                                                            <div style={{ fontSize: 11, color: T.t3, marginTop: 2, fontFamily: FONT.mono }}>{p.crossRef || "No Ref."}</div>
                                                        </div>
                                                        {/* Brand + Supplier */}
                                                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                                                            <div style={{ fontSize: 9, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Brand / Warranty</div>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{p.brand || "—"}</div>
                                                            <div style={{ fontSize: 11, color: p.warranty ? T.sky : T.t3, marginTop: 2, display: "flex", gap: 4, alignItems: "center" }}>
                                                                {p.warranty ? `🛡️ ${p.warranty}` : "No Warranty Info"}
                                                            </div>
                                                        </div>
                                                        {/* Compatibility Summary */}
                                                        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                                                            <div style={{ fontSize: 9, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Compatibility</div>
                                                            {(() => {
                                                                const parts = [p.position, p.engineType, p.transmission].filter(Boolean);
                                                                if (parts.length === 0) return <div style={{ fontSize: 12, color: T.t4 }}>Not Available</div>;
                                                                return <div style={{ fontSize: 11, fontWeight: 600, color: T.emerald, lineHeight: 1.5 }}>{parts.join(" · ")}</div>;
                                                            })()}
                                                        </div>
                                                    </div>
                                                    {/* Location + Stock Details strip */}
                                                    <div style={{ display: "flex", gap: 16, marginTop: 12, padding: "10px 14px", background: T.card, borderRadius: 8, border: `1px solid ${T.border}`, alignItems: "center", fontSize: 12, flexWrap: "wrap" }}>
                                                        <div><span style={{ color: T.t3, fontWeight: 600 }}>📍 Location: </span><span style={{ fontFamily: FONT.mono, color: T.t1, fontWeight: 700 }}>{p.location || "—"}</span></div>
                                                        <div style={{ width: 1, height: 16, background: T.border }} />
                                                        <div>
                                                            <span style={{ color: T.t3, fontWeight: 600 }}>📦 Stock: </span>
                                                            <span style={{ fontFamily: FONT.mono, fontWeight: 800, color: p.stock === 0 ? T.crimson : p.stock < p.minStock ? T.amber : T.emerald }}>{p.stock}</span>
                                                            <span style={{ color: T.t4 }}> / {p.minStock} min</span>
                                                            {p.maxStock != null && (
                                                                <>
                                                                    <span style={{ color: T.t4 }}> / {p.maxStock} max</span>
                                                                    {p.stock > p.maxStock && (
                                                                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: T.sky, background: T.skyBg, padding: "1px 6px", borderRadius: 4 }}>OVERSTOCK</span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        <div style={{ width: 1, height: 16, background: T.border }} />
                                                        <div><span style={{ color: T.t3, fontWeight: 600 }}>💰 Inventory Value: </span><span style={{ fontFamily: FONT.mono, fontWeight: 800, color: T.amber }}>{fmt(p.buyPrice * p.stock)}</span></div>
                                                        <div style={{ width: 1, height: 16, background: T.border }} />
                                                        <div><span style={{ color: T.t3, fontWeight: 600 }}>📈 Potential Revenue: </span><span style={{ fontFamily: FONT.mono, fontWeight: 800, color: T.emerald }}>{fmt(p.sellPrice * p.stock)}</span></div>
                                                        {p.lastSoldAt && (
                                                            <>
                                                                <div style={{ width: 1, height: 16, background: T.border }} />
                                                                <div>
                                                                    <span style={{ color: T.t3, fontWeight: 600 }}>🛒 Last Sold: </span>
                                                                    <span style={{ fontFamily: FONT.mono, color: T.t2 }}>
                                                                        {Math.floor((Date.now() - p.lastSoldAt) / 86400000) === 0
                                                                            ? "Today"
                                                                            : `${Math.floor((Date.now() - p.lastSoldAt) / 86400000)}d ago`}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                        {p.lastPurchasedAt && (
                                                            <>
                                                                <div style={{ width: 1, height: 16, background: T.border }} />
                                                                <div>
                                                                    <span style={{ color: T.t3, fontWeight: 600 }}>🛍 Last Purchased: </span>
                                                                    <span style={{ fontFamily: FONT.mono, color: T.t2 }}>
                                                                        {Math.floor((Date.now() - p.lastPurchasedAt) / 86400000) === 0
                                                                            ? "Today"
                                                                            : `${Math.floor((Date.now() - p.lastPurchasedAt) / 86400000)}d ago`}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    {/* Multi-photo gallery — show all images[] if more than the primary image */}
                                                    {p.images && p.images.length > 0 && (
                                                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                                                            {p.images.map((url, i) => (
                                                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", flexShrink: 0 }}>
                                                                    <img
                                                                        src={url}
                                                                        alt={`${p.name} photo ${i + 1}`}
                                                                        style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover", border: `1px solid ${T.border}`, cursor: "pointer" }}
                                                                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                                    />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Load More button */}
            {visibleCount < filtered.length && (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <Btn variant="ghost" onClick={() => setVisibleCount(v => v + 50)}>
                        Load 50 more ({filtered.length - visibleCount} remaining)
                    </Btn>
                </div>
            )}

            <BatchesSlideOver open={!!batchP} product={batchP} onClose={() => setBatchP(null)} toast={toast} />
            <SaleModal open={!!saleP} product={saleP} products={storeProducts} onClose={() => setSaleP(null)} onSave={(data) => onSale(data)} toast={toast} />
            <PurchaseModal open={!!purchP} product={purchP} products={storeProducts} onClose={() => setPurchP(null)} onSave={(data) => onPurchase(data)} toast={toast} />
            <StockAdjustmentModal open={!!adjP} product={adjP} products={storeProducts} onClose={() => setAdjP(null)} onSave={(data) => onAdjust(data)} toast={toast} />
            <PurchaseOrderModal
                open={poModalOpen}
                onClose={() => { setPoModalOpen(false); setSelectedIds([]); }}
                products={shopProducts}
                preselectedIds={selectedIds}
                shopName={(shops || []).find(s => (s.id ?? s.shopId) === activeShopId)?.name || "RED PISTON — Shop"}
                toast={toast}
            />
        </div>
    );
}
