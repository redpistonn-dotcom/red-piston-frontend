/**
 * CatalogStockInModal.jsx
 *
 * The MNC-style "Add to Inventory" flow — shop owner NEVER types product data from scratch.
 *
 * Flow:
 *   Step 1 — SEARCH:    Type name / OEM number / scan barcode → live catalog results
 *   Step 2 — CONFIGURE: Review auto-filled part details → enter ONLY price + stock → Add to Cart
 *   Fallback:           "Not in catalog?" → contribute a new part (manual entry) → Add to Cart
 *   Cart:               Accumulate multiple parts, then "Save All" submits them all at once
 *
 * Why this matters:
 *   A human typing "Bosch brak pad" instead of "Bosch Brake Pad" creates a duplicate
 *   in the catalog. This modal eliminates that problem by forcing selection from the
 *   global brain (Layer 1) before writing to the per-shop ledger (Layer 3).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { T, FONT } from "../theme";
import { Modal, Field, Input, Select, Btn } from "./ui";
import { BarcodeScanner } from "./BarcodeScanner.jsx";
import { lookupCatalog, lookupByBarcode, scanBarcode, addInventory, contributePart } from "../api/inventory.js";
import { uid, CATEGORIES, fmt } from "../utils";

// ─── constants ────────────────────────────────────────────────────────────────

const EMOJI_BY_CATEGORY = {
  Brakes: "🛑", Filters: "🔘", Ignition: "⚡", Electrical: "🔋",
  Engine: "⚙️", Suspension: "🔩", "Body & Exterior": "🚗",
  "Engine Oils": "🛢️", Lubrication: "🛢️", Fluids: "💧",
  "Clutch & Transmission": "⚙️", General: "📦", Tyres: "🔘",
  Lights: "💡", AC: "❄️", Braking: "🛑",
};
const catEmoji = (cat) => EMOJI_BY_CATEGORY[cat] || "🔧";

const GST_RATES = ["0", "5", "12", "18", "28"];
const UNIT_OPTIONS = ["Piece", "Set", "Pair", "Litre", "Kg", "Metre", "Box", "Roll"];

// ─── sub-component: PartImage ────────────────────────────────────────────────
function PartImage({ src, category, size = 40 }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55, flexShrink: 0 }}>
      {catEmoji(category)}
    </div>
  );
}

// ─── sub-component: StatusBadge ───────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    VERIFIED: { color: T.emerald, bg: `${T.emerald}22`, label: "✓ Verified" },
    PENDING:  { color: T.amber,   bg: `${T.amber}22`,   label: "⏳ Pending" },
    REJECTED: { color: "#EF4444", bg: "#EF444422",      label: "✗ Rejected" },
  };
  const c = cfg[status] || cfg.PENDING;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color: c.color, background: c.bg, padding: "2px 7px", borderRadius: 4 }}>
      {c.label}
    </span>
  );
}

// ─── sub-component: FitmentPills ─────────────────────────────────────────────
function FitmentPills({ fitments }) {
  if (!fitments || fitments.length === 0) return (
    <span style={{ fontSize: 11, color: T.t4 }}>Universal / Not specified</span>
  );
  const shown = fitments.slice(0, 4);
  const extra = fitments.length - shown.length;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {shown.map((f) => (
        <span key={f.fitmentId || f.vehicleId} style={{ fontSize: 10, fontWeight: 600, color: T.sky, background: `${T.sky}18`, padding: "2px 8px", borderRadius: 4 }}>
          {f.vehicle ? `${f.vehicle.make} ${f.vehicle.model} ${f.vehicle.yearFrom}–${f.vehicle.yearTo || "present"}` : f.fitType}
        </span>
      ))}
      {extra > 0 && <span style={{ fontSize: 10, color: T.t3, padding: "2px 8px" }}>+{extra} more</span>}
    </div>
  );
}

// ─── ScanButton: tactile amber CTA with press-down feedback ──────────────────
function ScanButton({ onClick }) {
  const [active, setActive] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onMouseLeave={() => setActive(false)}
      style={{
        flexShrink: 0,
        background: `linear-gradient(135deg, ${T.amber}, #9B1F12)`,
        border: "none",
        borderRadius: 10,
        color: "#fff",
        fontWeight: 800,
        fontSize: 12,
        fontFamily: FONT.ui,
        cursor: "pointer",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
        minHeight: 46,
        boxShadow: active ? "0 1px 6px rgba(190,43,26,0.2)" : "0 3px 14px rgba(190,43,26,0.35)",
        transform: active ? "scale(0.97) translateY(1px)" : "scale(1) translateY(0)",
        transition: "transform 0.1s cubic-bezier(0.16,1,0.3,1), box-shadow 0.1s",
        willChange: "transform",
      }}
    >
      📷 Scan
    </button>
  );
}

// ─── BackButton: subtle left-arrow nav ───────────────────────────────────────
function BackButton({ onClick, label = "Back to search" }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "none", border: "none",
        color: hover ? T.amber : T.t3,
        cursor: "pointer", fontSize: 12, fontWeight: 600,
        fontFamily: FONT.ui, marginBottom: 16, padding: "4px 0",
        transition: "color 0.15s",
      }}
    >
      ← {label}
    </button>
  );
}

// ─── sub-component: CartPanel ─────────────────────────────────────────────────
function CartPanel({ cart, onRemove, onEdit, onSaveAll, saving, supplier, setSupplier }) {
  const [triedSave, setTriedSave] = useState(false);
  const nameErr    = triedSave && !supplier.name.trim();
  const invoiceErr = triedSave && !supplier.invoiceNo.trim();

  function handleSave() {
    setTriedSave(true);
    if (!supplier.name.trim() || !supplier.invoiceNo.trim()) return;
    onSaveAll();
  }

  return (
    <div className="csim-cart" style={{
      width: 268,
      flexShrink: 0,
      borderLeft: `1px solid ${T.border}`,
      paddingLeft: 20,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.t1, fontFamily: FONT.ui }}>
          🛒 Cart
        </div>
        {cart.length > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 800, color: "#fff",
            background: T.amber, borderRadius: "50%",
            width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FONT.mono,
          }}>
            {cart.length}
          </span>
        )}
      </div>

      {/* Empty state */}
      {cart.length === 0 && (
        <div style={{
          flex: 1,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          color: T.t4, fontSize: 12, textAlign: "center", padding: "24px 8px",
          gap: 8,
        }}>
          <div style={{ fontSize: 34 }}>🛒</div>
          <div style={{ fontWeight: 700, color: T.t3, fontSize: 13 }}>Cart is empty</div>
          <div style={{ fontSize: 11, color: T.t4, lineHeight: 1.6 }}>
            Search and configure parts,<br />then click "Add to Cart".<br />
            Save everything in one go.
          </div>
        </div>
      )}

      {/* Items list */}
      {cart.length > 0 && (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, maxHeight: 460 }}>
          {cart.map((item) => {
            const name     = item.type === "catalog" ? item.part.partName  : item.form.partName;
            const brand    = item.type === "catalog" ? item.part.brand     : item.form.brand;
            const category = item.type === "catalog" ? item.part.categoryL1 : item.form.categoryL1;
            const imgSrc   = item.type === "catalog"
              ? (item.part.imageUrl || (item.part.images && item.part.images[0]))
              : null;

            const editable = item.type === "catalog";
            return (
              <div key={item.cartId}
                onClick={editable ? () => onEdit?.(item.cartId) : undefined}
                title={editable ? "Click to edit price / stock / supplier" : undefined}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: editable ? "pointer" : "default",
                }}>
                {/* Icon */}
                <div style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.1 }}>
                  {imgSrc
                    ? <img src={imgSrc} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
                    : catEmoji(category)
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name}
                  </div>
                  {brand && (
                    <div style={{ fontSize: 10, color: T.t3, marginBottom: 4 }}>{brand}</div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 10 }}>
                    <span style={{ fontFamily: FONT.mono, color: T.emerald, fontWeight: 700 }}>₹{fmt(parseFloat(item.form.sellPrice) || 0)}</span>
                    <span style={{ color: T.t4 }}>·</span>
                    <span style={{ color: T.t2 }}>{parseInt(item.form.stockQty) || 0} units</span>
                    {editable && <span style={{ color: T.amber, fontWeight: 700 }}>· ✎ edit</span>}
                    {item.type === "contribution" && (
                      <span style={{ fontSize: 9, color: T.amber, fontWeight: 700, background: `${T.amber}18`, padding: "1px 5px", borderRadius: 3 }}>NEW</span>
                    )}
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(item.cartId); }}
                  style={{
                    background: "none", border: "none",
                    color: T.t4, cursor: "pointer",
                    fontSize: 13, lineHeight: 1,
                    padding: "3px 5px", borderRadius: 5,
                    transition: "color 0.15s, background 0.15s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.background = "#EF444418"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = T.t4; e.currentTarget.style.background = "none"; }}
                  title="Remove from cart"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared Supplier Details */}
      {cart.length > 0 && (
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
            Supplier Details <span style={{ color: T.crimson }}>*</span>
          </div>
          <div style={{ fontSize: 10, color: T.t4, marginBottom: 10 }}>
            Applied to all {cart.length} item{cart.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div style={{ gridColumn: "span 2" }}>
              <input
                value={supplier.name}
                onChange={e => setSupplier(s => ({ ...s, name: e.target.value }))}
                placeholder="Supplier Name *"
                maxLength={100}
                style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${nameErr ? T.crimson : T.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 11, fontFamily: FONT.ui, color: T.t1, background: T.card, outline: "none" }}
              />
              {nameErr && <div style={{ fontSize: 10, color: T.crimson, marginTop: 2 }}>Supplier name is required</div>}
            </div>
            <div>
              <input
                value={supplier.invoiceNo}
                onChange={e => setSupplier(s => ({ ...s, invoiceNo: e.target.value }))}
                placeholder="Invoice No *"
                maxLength={50}
                style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${invoiceErr ? T.crimson : T.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 11, fontFamily: FONT.ui, color: T.t1, background: T.card, outline: "none" }}
              />
              {invoiceErr && <div style={{ fontSize: 10, color: T.crimson, marginTop: 2 }}>Required</div>}
            </div>
            <input
              value={supplier.gstin}
              onChange={e => setSupplier(s => ({ ...s, gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15) }))}
              placeholder="GSTIN (15 chars)"
              maxLength={15}
              style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 11, fontFamily: FONT.ui, color: T.t1, background: T.card, outline: "none" }}
            />
            <input
              value={supplier.phone}
              onChange={e => setSupplier(s => ({ ...s, phone: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }))}
              placeholder="Phone"
              type="tel" maxLength={10} inputMode="numeric"
              style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 9px", fontSize: 11, fontFamily: FONT.ui, color: T.t1, background: T.card, outline: "none" }}
            />
          </div>
        </div>
      )}

      {/* Save All CTA */}
      {cart.length > 0 && (
        <div style={{ paddingTop: 4 }}>
          <Btn
            variant="amber"
            loading={saving}
            onClick={handleSave}
            style={{ width: "100%", justifyContent: "center" }}
          >
            💾 Save All ({cart.length} {cart.length === 1 ? "part" : "parts"})
          </Btn>
          <div style={{ fontSize: 10, color: T.t4, textAlign: "center", marginTop: 6 }}>
            All items will be added to inventory
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 1: Search ────────────────────────────────────────────────────────────
function SearchStep({ onSelect, onManual, initialQuery }) {
  // onManual(name, barcode?) — barcode is defined only when called from camera scan not-found
  const [query, setQuery]       = useState(initialQuery || "");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120); }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await lookupCatalog(query, 14);
        setResults(data.parts || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  // ── Camera barcode scan result ────────────────────────────────────────────
  const handleCameraScan = useCallback(async (barcode) => {
    setScanOpen(false);
    setScanError("");
    setQuery(barcode);
    setLoading(true);
    try {
      const data = await scanBarcode(barcode);
      if (data.exactMatch) {
        onSelect(data.exactMatch);
        return;
      }
      if (data.parts && data.parts.length > 0) {
        setResults(data.parts);
        setSearched(true);
      }
    } catch (err) {
      if (err.status === 404 && err.data?.allow_contribution) {
        // Part not in catalog — auto-open contribution form with barcode pre-filled
        onManual("", barcode);
        return;
      }
      setScanError("Lookup failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [onSelect, onManual]);

  // ── Keyboard Enter: exact barcode lookup ─────────────────────────────────
  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && query.trim().length >= 4) {
      setLoading(true);
      try {
        const data = await lookupByBarcode(query.trim());
        if (data.exactMatch) {
          onSelect(data.exactMatch);
          return;
        }
        if (data.parts && data.parts.length > 0) {
          setResults(data.parts);
          setSearched(true);
        } else {
          setResults([]);
          setSearched(true);
        }
      } catch {
        // fallback to text search already running
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div>
      {/* Camera scanner overlay */}
      <BarcodeScanner
        open={scanOpen}
        onScan={handleCameraScan}
        onClose={() => setScanOpen(false)}
        hint="Point at a product barcode, EAN-13, or OEM label"
      />

      {/* Primary action: Add manually */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => onManual("")}
          style={{
            flex: 1,
            background: `linear-gradient(135deg, ${T.amber}22, ${T.amber}11)`,
            border: `2px solid ${T.amber}55`,
            borderRadius: 12,
            padding: "14px 18px",
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12,
            textAlign: "left",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.amber; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.amber}18`; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = `${T.amber}55`; e.currentTarget.style.boxShadow = "none"; }}
        >
          <div style={{ fontSize: 26, flexShrink: 0 }}>✏️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.amber }}>Add item manually</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>Enter part name, price &amp; stock — works for any item</div>
          </div>
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>or search global catalog</span>
        <div style={{ flex: 1, height: 1, background: T.border }} />
      </div>

      {/* Header hint */}
      <div style={{
        padding: "10px 14px",
        background: T.amberSoft,
        borderRadius: 10,
        border: `1px solid ${T.amber}22`,
        marginBottom: 14,
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>◈</span>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: T.amber, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>
            Step 1 of 2 — Global Parts Catalog
          </div>
          <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.5 }}>
            Scan a barcode, enter an OEM number, or type the part name.
            Product details fill automatically — you only enter price &amp; stock.
          </div>
        </div>
      </div>

      {/* Scan button + text input row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "stretch" }}>
        <ScanButton onClick={() => { setScanError(""); setScanOpen(true); }} />

        {/* Search input */}
        <div style={{ position: "relative", flex: 1 }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="OEM number · Part name · Brand"
            style={{
              width: "100%", boxSizing: "border-box",
              background: T.card,
              border: `2px solid ${query.length >= 2 ? T.amber + "99" : T.border}`,
              borderRadius: 10, padding: "11px 44px 11px 14px",
              color: T.t1, fontSize: 13, fontWeight: 600,
              fontFamily: FONT.ui, outline: "none",
              transition: "border-color 0.18s, box-shadow 0.18s",
              height: "100%",
              boxShadow: query.length >= 2 ? `0 0 0 3px ${T.amber}18` : "none",
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = T.amber + "99";
              e.currentTarget.style.boxShadow = `0 0 0 3px ${T.amber}18`;
            }}
            onBlur={e => {
              if (query.length < 2) {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          />
          {loading ? (
            <span style={{
              position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)",
              width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                width: 14, height: 14, border: `2px solid ${T.border}`,
                borderTopColor: T.amber, borderRadius: "50%",
                animation: "spin 0.7s linear infinite", display: "block",
              }} />
            </span>
          ) : query.length >= 2 && (
            <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: T.amber, fontWeight: 700, fontFamily: FONT.mono }}>↵</span>
          )}
        </div>
      </div>

      {/* Scan error / not found banner */}
      {scanError && (
        <div style={{
          padding: "10px 14px",
          background: `${T.amber}12`,
          border: `1px solid ${T.amber}44`,
          borderRadius: 8,
          fontSize: 12,
          color: T.amber,
          fontWeight: 600,
          marginBottom: 12,
          fontFamily: FONT.ui,
        }}>
          ⚠️ {scanError}
        </div>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 12, maxHeight: 380, overflowY: "auto" }}>
          {results.map((part, i) => (
            <div
              key={part.masterPartId}
              onClick={() => onSelect(part)}
              className="row-hover"
              style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${T.border}`,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 14,
                background: T.card,
                transition: "background 0.12s",
              }}
            >
              <PartImage src={part.imageUrl || (part.images && part.images[0])} category={part.categoryL1} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>
                    {part.partName}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {part.brand && (
                    <span style={{ fontSize: 11, color: T.t2, fontWeight: 600 }}>{part.brand}</span>
                  )}
                  {part.oemNumber && (
                    <span style={{ fontSize: 10, color: T.amber, fontFamily: FONT.mono, background: `${T.amber}14`, padding: "1px 6px", borderRadius: 4 }}>
                      {part.oemNumber}
                    </span>
                  )}
                  {part.categoryL1 && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: T.sky, background: `${T.sky}18`, padding: "1px 6px", borderRadius: 4 }}>
                      {part.categoryL1}
                    </span>
                  )}
                  {part.fitments?.length > 0 && (
                    <span style={{ fontSize: 9, color: T.t3, fontWeight: 600 }}>
                      Fits {part.fitments.length} vehicle{part.fitments.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {part.hsnCode && (
                    <span style={{ fontSize: 9, color: T.t4, fontFamily: FONT.mono }}>HSN {part.hsnCode}</span>
                  )}
                </div>
              </div>
              <Btn size="xs" variant="amber" style={{ flexShrink: 0 }}>
                Select →
              </Btn>
            </div>
          ))}

          {/* "Other" row — always shown at bottom of results */}
          <div
            onClick={() => onManual(query)}
            className="row-hover"
            style={{
              padding: "11px 16px",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 14,
              background: T.surface,
              transition: "background 0.12s",
            }}
          >
            <div style={{
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              background: `${T.amber}14`, borderRadius: 8, flexShrink: 0, fontSize: 18,
            }}>
              ＋
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>Other — not in the list</div>
              <div style={{ fontSize: 11, color: T.t3, marginTop: 1 }}>
                Add a new part manually and contribute it to the catalog
              </div>
            </div>
            <Btn size="xs" variant="ghost" style={{ flexShrink: 0, borderColor: T.amber, color: T.amber }}>
              Add →
            </Btn>
          </div>
        </div>
      )}

      {/* No results */}
      {searched && results.length === 0 && (
        <div style={{
          textAlign: "center", padding: "32px 24px",
          border: `2px dashed ${T.border}`, borderRadius: 12, marginBottom: 12,
          background: T.surface,
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t2, marginBottom: 6 }}>
            "{query}" not found in catalog
          </div>
          <div style={{ fontSize: 12, color: T.t3, marginBottom: 18, lineHeight: 1.6 }}>
            This part isn't in our global catalog yet.<br />
            You can add it manually — it will be submitted for catalog review.
          </div>
          <Btn variant="amber" size="sm" onClick={() => onManual(query)}>
            ＋ Add "{query.slice(0, 32)}{query.length > 32 ? "…" : ""}" Manually
          </Btn>
        </div>
      )}

      {/* Idle hint */}
      {!searched && query.length < 2 && (
        <div style={{ padding: "24px 16px", color: T.t4, fontSize: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.t3, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Trusted Brands
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
            {["Bosch", "NGK", "Denso", "TVS", "Minda", "Exide", "MRF", "Amaron"].map(b => (
              <span key={b} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, color: T.t2, fontWeight: 600 }}>{b}</span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { icon: "📷", text: "Tap Scan to use camera barcode reader" },
              { icon: "⌨", text: "Type OEM number or part name above" },
              { icon: "↵", text: "Press Enter for exact barcode scan" },
            ].map(h => (
              <div key={h.text} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7 }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{h.icon}</span>
                <span style={{ fontSize: 11, color: T.t3 }}>{h.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Configure price + stock ──────────────────────────────────────────
function ConfigureStep({ part, onBack, onSave, saving, activeShopId, initialForm }) {
  const catalogImage = part.imageUrl || (part.images && part.images[0]) || "";
  // When re-editing a cart item, prefill with its saved form; otherwise blank.
  const [f, setF] = useState(initialForm || {
    buyPrice: "", sellPrice: "", stockQty: "0",
    rackLocation: "", minStockAlert: "5",
    shopImageUrl: catalogImage, // pre-fill from catalog; owner can override
  });
  const [errors, setErrors] = useState({});

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const profit = f.buyPrice && f.sellPrice
    ? parseFloat(f.sellPrice) - parseFloat(f.buyPrice)
    : null;
  const margin = profit !== null && parseFloat(f.sellPrice) > 0
    ? ((profit / parseFloat(f.sellPrice)) * 100).toFixed(1)
    : null;

  const validate = () => {
    const e = {};
    if (!f.buyPrice || isNaN(f.buyPrice) || parseFloat(f.buyPrice) <= 0) e.buyPrice = "Must be greater than 0";
    if (!f.sellPrice || isNaN(f.sellPrice) || parseFloat(f.sellPrice) <= 0) e.sellPrice = "Must be greater than 0";
    if (f.stockQty === "" || isNaN(f.stockQty)) e.stockQty = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (validate()) onSave(f);
  };

  const specs = part.specifications && typeof part.specifications === "object"
    ? Object.entries(part.specifications).slice(0, 6)
    : [];

  return (
    <div>
      <BackButton onClick={onBack} />

      {/* Part details card (read-only — from global catalog) */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: T.amber, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Step 2 of 2 — Global Catalog Details (auto-filled)
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <PartImage src={part.imageUrl || (part.images && part.images[0])} category={part.categoryL1} size={56} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{part.partName}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              {part.brand && <span style={{ fontSize: 11, fontWeight: 700, color: T.t2 }}>{part.brand}</span>}
              {part.categoryL1 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: T.amber, background: `${T.amber}14`, padding: "2px 8px", borderRadius: 4 }}>
                  {part.categoryL1}{part.categoryL2 ? ` › ${part.categoryL2}` : ""}
                </span>
              )}
              {part.unitOfSale && part.unitOfSale !== "Piece" && (
                <span style={{ fontSize: 10, color: T.t3, fontWeight: 600 }}>Unit: {part.unitOfSale}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11 }}>
              {part.oemNumber && (
                <span><span style={{ color: T.t4 }}>OEM: </span><span style={{ fontFamily: FONT.mono, color: T.amber, fontWeight: 700 }}>{part.oemNumber}</span></span>
              )}
              {part.oemNumbers?.length > 1 && (
                <span style={{ color: T.t3 }}>+{part.oemNumbers.length - 1} cross refs</span>
              )}
              {part.hsnCode && (
                <span><span style={{ color: T.t4 }}>HSN: </span><span style={{ fontFamily: FONT.mono, color: T.t2 }}>{part.hsnCode}</span></span>
              )}
              {part.gstRate != null && (
                <span><span style={{ color: T.t4 }}>GST: </span><span style={{ color: T.t2, fontWeight: 700 }}>{parseFloat(part.gstRate)}%</span></span>
              )}
            </div>
          </div>
        </div>

        {/* Technical specs */}
        {specs.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {specs.map(([k, v]) => (
              <div key={k} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 10 }}>
                <span style={{ color: T.t4, textTransform: "uppercase", fontWeight: 700 }}>{k.replace(/_/g, " ")}: </span>
                <span style={{ color: T.t2, fontWeight: 700 }}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Fitments */}
        {part.fitments?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Fits:</div>
            <FitmentPills fitments={part.fitments} />
          </div>
        )}
      </div>

      {/* Shop-specific fields — ONLY these need manual entry */}
      <div style={{ background: T.card, border: `1px solid ${T.amber}44`, borderRadius: 12, padding: "16px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.amber, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
          Your Shop Details — Price &amp; Stock
        </div>
        {/* Photo is added later at marketplace "Go Live" — not required here. */}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Buying Price (₹)" required error={errors.buyPrice}>
            <Input type="number" value={f.buyPrice} onChange={set("buyPrice")} placeholder="0" prefix="₹" autoFocus min="0" max="10000000" step="0.01" />
          </Field>
          <Field label="Selling Price (₹)" required error={errors.sellPrice}>
            <Input type="number" value={f.sellPrice} onChange={set("sellPrice")} placeholder="0" prefix="₹" min="0" max="10000000" step="0.01" />
          </Field>
          <Field label="Opening Stock" required error={errors.stockQty} hint="Units currently in hand">
            <Input type="number" value={f.stockQty} onChange={set("stockQty")} placeholder="0" suffix="units" min="0" max="100000" />
          </Field>
          <Field label="Min Stock Alert" hint="Alert below this threshold">
            <Input type="number" value={f.minStockAlert} onChange={set("minStockAlert")} placeholder="5" suffix="units" min="0" max="10000" />
          </Field>
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Rack / Storage Location" hint="e.g. Rack A-12, Shelf 3B">
              <Input value={f.rackLocation} onChange={set("rackLocation")} placeholder="Rack A-12" maxLength={50} />
            </Field>
          </div>
        </div>

        {/* Profit preview — only shown once both prices are entered */}
        {profit !== null && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14,
            animation: "scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) both",
          }}>
            <div style={{
              background: profit > 0 ? `${T.emerald}12` : `${T.crimson}12`,
              border: `1px solid ${profit > 0 ? T.emerald : T.crimson}33`,
              borderRadius: 10, padding: "12px 14px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: profit > 0 ? T.emerald : T.crimson, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                Profit / Unit
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: profit > 0 ? T.emerald : T.crimson, fontFamily: FONT.mono }}>
                {profit > 0 ? "+" : ""}{fmt(profit)}
              </div>
            </div>
            <div style={{
              background: `${T.amber}10`,
              border: `1px solid ${T.amber}33`,
              borderRadius: 10, padding: "12px 14px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: T.amber, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                Margin
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.amber, fontFamily: FONT.mono }}>
                {margin}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onBack}>Cancel</Btn>
        <Btn variant="amber" loading={saving} onClick={handleSave}>
          🛒 Add to Cart
        </Btn>
      </div>
    </div>
  );
}

// ─── Fallback: Contribute new part ────────────────────────────────────────────
function ContributeStep({ initialName, initialBarcode, onBack, onSave, saving }) {
  const blank = {
    partName: initialName || "", brand: "", categoryL1: "", categoryL2: "",
    oemNumber: initialBarcode || "", hsnCode: "", gstRate: "18", unitOfSale: "Piece", description: "",
    buyPrice: "", sellPrice: "", stockQty: "0", rackLocation: "", minStockAlert: "5",
    imageUrl: "", partType: "OEM",
    _scannedBarcode: initialBarcode || "",
  };
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState({});
  // Vehicle fitment state
  const [fitments, setFitments] = useState([]); // [{ make, model, yearFrom, yearTo, fitType }]
  const [fitMake, setFitMake]   = useState("");
  const [fitModel, setFitModel] = useState("");
  const [fitYear, setFitYear]   = useState("");

  const addFitment = () => {
    const make  = fitMake.trim();
    const model = fitModel.trim();
    if (!make || !model) return;
    if (fitments.some(f => f.make.toLowerCase() === make.toLowerCase() && f.model.toLowerCase() === model.toLowerCase())) return;
    setFitments(prev => [...prev, { make, model, yearFrom: fitYear || null, yearTo: null, fitType: "COMPATIBLE" }]);
    setFitMake(""); setFitModel(""); setFitYear("");
  };
  const removeFitment = (i) => setFitments(prev => prev.filter((_, idx) => idx !== i));

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!f.partName.trim()) e.partName  = "Required";
    if (!f.categoryL1)      e.categoryL1 = "Select a category";
    if (!f.buyPrice || isNaN(f.buyPrice) || parseFloat(f.buyPrice) <= 0) e.buyPrice = "Must be greater than 0";
    if (!f.sellPrice || isNaN(f.sellPrice) || parseFloat(f.sellPrice) <= 0) e.sellPrice = "Must be greater than 0";
    if (f.stockQty === "" || isNaN(f.stockQty)) e.stockQty = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (validate()) onSave({ ...f, _fitments: fitments });
  };

  return (
    <div>
      <BackButton onClick={onBack} />

      <div style={{ padding: "12px 16px", background: `${T.amber}11`, border: `1px solid ${T.amber}44`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.amber, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          Contribute New Part to Catalog
        </div>
        <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.5 }}>
          This part will be added with <b style={{ color: T.amber }}>Pending</b> status and reviewed by our catalog team.
          Once verified, it becomes available to all shops on the platform.
        </div>
      </div>

      {/* Scanned barcode indicator */}
      {initialBarcode && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: `${T.sky}12`, border: `1px solid ${T.sky}44`, borderRadius: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }}>📷</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.sky, textTransform: "uppercase", letterSpacing: "0.06em" }}>Scanned Barcode</div>
            <div style={{ fontSize: 12, fontFamily: "monospace", color: T.t1, fontWeight: 700 }}>{initialBarcode}</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "span 2" }}>
          <Field label="Part Name" required error={errors.partName}>
            <Input value={f.partName} onChange={set("partName")} placeholder="Bosch Front Brake Pad Set" maxLength={200} />
          </Field>
        </div>
        {/* Photo is added later at marketplace "Go Live" — not required here. */}
        <Field label="Brand">
          <Input value={f.brand} onChange={set("brand")} placeholder="Bosch, NGK, Denso…" maxLength={80} />
        </Field>
        <Field label="Category" required error={errors.categoryL1}>
          <Select
            value={f.categoryL1}
            onChange={set("categoryL1")}
            options={[
              { value: "", label: "Select category…" },
              ...CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
        </Field>
        <div style={{ gridColumn: "span 2" }}>
          <Field label="Part Type" hint="OEM = original manufacturer part · OES = aftermarket / compatible">
            <Select
              value={f.partType}
              onChange={set("partType")}
              options={[
                { value: "OEM", label: "OEM — Original Equipment Manufacturer" },
                { value: "OES", label: "OES — Original Equipment Supplier (Aftermarket)" },
              ]}
            />
          </Field>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <Field label="OEM Part Number" hint="From the box / manufacturer website">
            <Input value={f.oemNumber} onChange={set("oemNumber")} placeholder="04465-02220" maxLength={50} />
          </Field>
        </div>
        <Field label="HSN Code">
          <Input value={f.hsnCode} onChange={e => set("hsnCode")(e.replace(/[^\d]/g, "").slice(0, 8))} placeholder="87083000" maxLength={8} inputMode="numeric" />
        </Field>
        <Field label="GST Rate">
          <Select value={f.gstRate} onChange={set("gstRate")} options={GST_RATES.map((r) => ({ value: r, label: r + "% GST" }))} />
        </Field>
        <Field label="Unit of Sale">
          <Select value={f.unitOfSale} onChange={set("unitOfSale")} options={UNIT_OPTIONS.map((u) => ({ value: u, label: u }))} />
        </Field>
        <Field label="Buying Price (₹)" required error={errors.buyPrice}>
          <Input type="number" value={f.buyPrice} onChange={set("buyPrice")} placeholder="0" prefix="₹" min="0" max="10000000" step="0.01" />
        </Field>
        <Field label="Selling Price (₹)" required error={errors.sellPrice}>
          <Input type="number" value={f.sellPrice} onChange={set("sellPrice")} placeholder="0" prefix="₹" min="0" max="10000000" step="0.01" />
        </Field>
        <Field label="Opening Stock" required error={errors.stockQty}>
          <Input type="number" value={f.stockQty} onChange={set("stockQty")} placeholder="0" suffix="units" min="0" max="100000" />
        </Field>
        <Field label="Min Stock Alert">
          <Input type="number" value={f.minStockAlert} onChange={set("minStockAlert")} placeholder="5" suffix="units" min="0" max="10000" />
        </Field>
        <div style={{ gridColumn: "span 2" }}>
          <Field label="Rack / Storage Location">
            <Input value={f.rackLocation} onChange={set("rackLocation")} placeholder="Rack A-12" />
          </Field>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <Field label="Description" hint="Technical notes, material, application">
            <Input value={f.description} onChange={set("description")} placeholder="Ceramic brake pads for front axle…" />
          </Field>
        </div>
      </div>

      {/* Vehicle Fitment */}
      <div style={{ gridColumn: "span 2", borderTop: `1px solid ${T.border}`, paddingTop: 12, marginTop: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Vehicle Fitment (optional) — which vehicles does this part fit?
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ flex: "1 1 120px" }}>
            <div style={{ fontSize: 10, color: T.t3, marginBottom: 3 }}>Make</div>
            <input
              value={fitMake}
              onChange={e => setFitMake(e.target.value)}
              placeholder="e.g. Maruti"
              style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, fontFamily: FONT.ui, color: T.t1, background: T.card, outline: "none" }}
            />
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <div style={{ fontSize: 10, color: T.t3, marginBottom: 3 }}>Model</div>
            <input
              value={fitModel}
              onChange={e => setFitModel(e.target.value)}
              placeholder="e.g. Swift"
              style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, fontFamily: FONT.ui, color: T.t1, background: T.card, outline: "none" }}
            />
          </div>
          <div style={{ flex: "0 1 90px" }}>
            <div style={{ fontSize: 10, color: T.t3, marginBottom: 3 }}>Year (from)</div>
            <input
              type="number"
              value={fitYear}
              onChange={e => setFitYear(e.target.value)}
              placeholder="2015"
              min={1980} max={2030}
              style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, fontFamily: FONT.ui, color: T.t1, background: T.card, outline: "none" }}
            />
          </div>
          <button
            type="button"
            onClick={addFitment}
            style={{ background: T.sky, color: "#fff", border: "none", borderRadius: 7, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: FONT.ui }}
          >+ Add</button>
        </div>
        {fitments.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {fitments.map((ft, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, background: `${T.sky}14`, border: `1px solid ${T.sky}44`, borderRadius: 20, padding: "3px 10px 3px 12px", fontSize: 11, color: T.sky, fontWeight: 700 }}>
                {ft.make} {ft.model}{ft.yearFrom ? ` (${ft.yearFrom})` : ""}
                <button onClick={() => removeFitment(i)} style={{ background: "none", border: "none", cursor: "pointer", color: T.sky, fontSize: 13, lineHeight: 1, padding: "0 2px" }}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onBack}>Cancel</Btn>
        <Btn variant="amber" loading={saving} onClick={handleSave}>
          🛒 Add to Cart
        </Btn>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export function CatalogStockInModal({ open, onClose, onSave, onMovementSaved, toast, activeShopId, existingProducts = [] }) {
  const [step, setStep]               = useState("search"); // "search" | "configure" | "contribute"
  const [selected, setSelected]       = useState(null);
  const [manualQuery, setManualQuery] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [saving, setSaving]           = useState(false);
  const [cart, setCart]               = useState([]); // { cartId, type: 'catalog'|'contribution', part?, form }
  const [editingCartId, setEditingCartId] = useState(null); // cart item being re-edited
  const [editForm, setEditForm]       = useState(null);     // its saved form, prefilled into ConfigureStep
  const [supplier, setSupplier]       = useState({ name: "", gstin: "", phone: "", invoiceNo: "" });

  // Reset on open / close
  useEffect(() => {
    if (!open) {
      setStep("search");
      setSelected(null);
      setManualQuery("");
      setManualBarcode("");
      setSaving(false);
      setCart([]);
      setEditingCartId(null);
      setEditForm(null);
      setSupplier({ name: "", gstin: "", phone: "", invoiceNo: "" });
    }
  }, [open]);

  const handleSelect = useCallback((part) => {
    setSelected(part);
    setStep("configure");
  }, []);

  const handleManual = useCallback((query, barcode = "") => {
    setManualQuery(query);
    setManualBarcode(barcode);
    setStep("contribute");
  }, []);

  // ── Add catalog part to cart, OR save edits back to an existing cart item ──
  const handleConfigureSave = useCallback((form) => {
    setCart((c) => editingCartId
      ? c.map((it) => (it.cartId === editingCartId ? { ...it, form } : it))
      : [...c, { cartId: uid(), type: "catalog", part: selected, form }]);
    setEditingCartId(null);
    setEditForm(null);
    setSelected(null);
    setStep("search");
  }, [selected, editingCartId]);

  // ── Click a (catalog) cart item → re-open it in the configure form ─────────
  const handleEditCart = useCallback((cartId) => {
    const item = cart.find((it) => it.cartId === cartId);
    if (!item || item.type !== "catalog") return;
    setSelected(item.part);
    setEditForm(item.form);
    setEditingCartId(cartId);
    setStep("configure");
  }, [cart]);

  // ── Add contributed part to cart (no API call yet) ────────────────────────
  const handleContributeSave = useCallback((form) => {
    setCart((c) => [...c, { cartId: uid(), type: "contribution", form }]);
    setStep("search");
  }, []);

  // ── Remove item from cart ─────────────────────────────────────────────────
  const handleRemoveFromCart = useCallback((cartId) => {
    setCart((c) => c.filter((item) => item.cartId !== cartId));
  }, []);

  // ── Save All: process every cart item and call the API ────────────────────
  const handleSaveAll = useCallback(async () => {
    if (cart.length === 0) return;
    if (!supplier.name.trim() || !supplier.invoiceNo.trim()) return;
    setSaving(true);
    let savedCount = 0;
    // All items in this batch share one reference so they group together in History.
    // If the user entered a supplier invoice number, use that; otherwise generate a
    // short batch token so items saved together stay linked without a real invoice.
    const batchRef = `batch-${Date.now().toString(36)}`;
    const sharedRef = supplier.invoiceNo || batchRef;

    try {
      for (const item of cart) {
        if (item.type === "catalog") {
          const { part, form } = item;
          let product;

          const resolvedImage = form.shopImageUrl || part.imageUrl || (part.images && part.images[0]) || "";
          try {
            const res = await addInventory({
              masterPartId:  part.masterPartId,
              sellingPrice:  parseFloat(form.sellPrice),
              buyingPrice:   parseFloat(form.buyPrice),
              stockQty:      parseInt(form.stockQty) || 0,
              rackLocation:  form.rackLocation || null,
              minStockAlert: parseInt(form.minStockAlert) || 5,
              supplierName:  supplier.name || undefined,
              supplierGstin: supplier.gstin || undefined,
              supplierPhone: supplier.phone || undefined,
              supplierInvoiceNo: sharedRef,
              imageUrl:      resolvedImage || undefined,
            });
            const inv = res.item;
            product = {
              id:             inv.inventoryId,
              inventoryId:    inv.inventoryId,
              masterPartId:   part.masterPartId,
              globalSku:      part.masterPartId,
              name:           part.partName,
              oemNumber:      part.oemNumber || (part.oemNumbers && part.oemNumbers[0]) || "",
              oemNumbers:     part.oemNumbers || [],
              barcodes:       part.barcodes  || [],
              brand:          part.brand     || "",
              category:       part.categoryL1 || "General",
              categoryL2:     part.categoryL2  || "",
              hsnCode:        part.hsnCode   || "",
              gstRate:        parseFloat(part.gstRate || 18),
              unitOfSale:     part.unitOfSale || "Piece",
              specifications: part.specifications || {},
              sellPrice:      parseFloat(form.sellPrice),
              buyPrice:       parseFloat(form.buyPrice),
              stock:          parseInt(form.stockQty) || 0,
              minStock:       parseInt(form.minStockAlert) || 5,
              rack:           form.rackLocation || "",
              location:       form.rackLocation || "",
              image:          resolvedImage || catEmoji(part.categoryL1),
              sku:            part.oemNumber || (Array.isArray(part.oemNumbers) ? part.oemNumbers[0] : part.oemNumbers) || String(inv.inventoryId).slice(0, 8),
              shopId:         activeShopId,
            };
          } catch (apiErr) {
            // Product already in this shop's inventory → do NOT create a duplicate
            // local copy (that's how duplicates were sneaking in). Tell the user to
            // adjust stock / price on the existing item instead, and skip this row.
            if (apiErr?.status === 409) {
              toast(`"${part.partName}" is already in your inventory — open it to add stock or change the price.`, "warning");
              continue;
            }
            console.warn("[CatalogStockIn] API unavailable, saving locally:", apiErr.message);
            const localId = "p" + uid();
            product = {
              id:           localId,
              masterPartId: part.masterPartId,
              globalSku:    part.masterPartId,
              name:         part.partName,
              oemNumber:    part.oemNumber || "",
              brand:        part.brand    || "",
              category:     part.categoryL1 || "General",
              hsnCode:      part.hsnCode   || "",
              gstRate:      parseFloat(part.gstRate || 18),
              unitOfSale:   part.unitOfSale || "Piece",
              sellPrice:    parseFloat(form.sellPrice),
              buyPrice:     parseFloat(form.buyPrice),
              stock:        parseInt(form.stockQty) || 0,
              minStock:     parseInt(form.minStockAlert) || 5,
              rack:         form.rackLocation || "",
              location:     form.rackLocation || "",
              image:        resolvedImage || catEmoji(part.categoryL1),
              sku:          part.oemNumber || localId.slice(0, 8),
              shopId:       activeShopId,
              _pendingSync: true,
            };
          }

          onSave(product);
          savedCount++;

        } else {
          // type === "contribution"
          const { form } = item;
          let masterPartId = null;
          let product;

          // Prevent duplicates: if the shop already has a product with the same name
          // (case-insensitive), skip and notify rather than creating a second entry.
          const dupName = form.partName.trim().toLowerCase();
          const alreadyExists = existingProducts.some(
            (p) => (p.name || "").toLowerCase() === dupName
          );
          if (alreadyExists) {
            toast(`"${form.partName}" is already in your inventory — update stock or price on the existing item instead.`, "warning");
            continue;
          }

          const contribImage = form.imageUrl || "";
          try {
            const catalogRes = await contributePart({
              partName:    form.partName,
              brand:       form.brand       || undefined,
              categoryL1:  form.categoryL1,
              oemNumber:   form.oemNumber   || undefined,
              hsnCode:     form.hsnCode     || undefined,
              gstRate:     parseFloat(form.gstRate || 18),
              unitOfSale:  form.unitOfSale  || "Piece",
              description: form.description || undefined,
              partType:    form.partType    || "OEM",
              fitments:    form._fitments?.length ? form._fitments : undefined,
              // backend reads images[] array, not imageUrl
              ...(contribImage && { images: [contribImage] }),
              ...(form._scannedBarcode && { barcodes: [form._scannedBarcode] }),
              ...(form.oemNumber && { oemNumbers: [form.oemNumber] }),
            });
            masterPartId = catalogRes.part?.masterPartId;

            if (masterPartId) {
              const invRes = await addInventory({
                masterPartId,
                sellingPrice:  parseFloat(form.sellPrice),
                buyingPrice:   parseFloat(form.buyPrice),
                stockQty:      parseInt(form.stockQty) || 0,
                rackLocation:  form.rackLocation || null,
                minStockAlert: parseInt(form.minStockAlert) || 5,
                supplierName:  supplier.name || undefined,
                supplierGstin: supplier.gstin || undefined,
                supplierPhone: supplier.phone || undefined,
                supplierInvoiceNo: sharedRef,
                imageUrl:      contribImage || undefined,
              });
              product = {
                id:           invRes.item.inventoryId,
                inventoryId:  invRes.item.inventoryId,
                masterPartId,
                globalSku:    masterPartId,
                name:         form.partName,
                oemNumber:    form.oemNumber || "",
                brand:        form.brand    || "",
                category:     form.categoryL1 || "General",
                hsnCode:      form.hsnCode   || "",
                gstRate:      parseFloat(form.gstRate || 18),
                unitOfSale:   form.unitOfSale || "Piece",
                sellPrice:    parseFloat(form.sellPrice),
                buyPrice:     parseFloat(form.buyPrice),
                stock:        parseInt(form.stockQty) || 0,
                minStock:     parseInt(form.minStockAlert) || 5,
                rack:         form.rackLocation || "",
                location:     form.rackLocation || "",
                image:        contribImage || catEmoji(form.categoryL1),
                sku:          form.oemNumber || String(invRes.item.inventoryId).slice(0, 8),
                shopId:       activeShopId,
                _pendingCatalogVerification: true,
              };
            }
          } catch (apiErr) {
            if (apiErr?.status === 409) {
              toast(`"${form.partName}" is already in your inventory — update stock or price on the existing item instead.`, "warning");
              continue;
            }
            console.warn("[CatalogStockIn] Contribute API failed, saving locally:", apiErr.message);
          }

          // Fallback: local-only product if API is down
          if (!product) {
            const localId = "p" + uid();
            product = {
              id:        localId,
              name:      form.partName,
              oemNumber: form.oemNumber || "",
              brand:     form.brand    || "",
              category:  form.categoryL1 || "General",
              hsnCode:   form.hsnCode   || "",
              gstRate:   parseFloat(form.gstRate || 18),
              unitOfSale: form.unitOfSale || "Piece",
              sellPrice: parseFloat(form.sellPrice),
              buyPrice:  parseFloat(form.buyPrice),
              stock:     parseInt(form.stockQty) || 0,
              minStock:  parseInt(form.minStockAlert) || 5,
              rack:      form.rackLocation || "",
              location:  form.rackLocation || "",
              image:     contribImage || catEmoji(form.categoryL1),
              sku:       form.oemNumber || localId.slice(0, 8),
              shopId:    activeShopId,
            };
          }

          onSave(product);
          savedCount++;
        }
      }

      // Refresh movements store so Orders page shows the new entries immediately
      onMovementSaved?.();
      toast(
        `${savedCount} part${savedCount !== 1 ? "s" : ""} added to inventory!`,
        "success",
        "Inventory Updated"
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }, [cart, supplier, activeShopId, onSave, toast, onClose]);

  // ── Titles ────────────────────────────────────────────────────────────────
  const titles = {
    search:     "Add Products to Inventory",
    configure:  selected ? `Configure — ${selected.partName}` : "Configure Stock",
    contribute: "Contribute New Part",
  };
  const subtitles = {
    search:     "Add multiple parts to cart, then save all at once",
    configure:  "Enter your shop price and opening stock — then add to cart",
    contribute: "Part not in catalog? Contribute it — reviewed by catalog team",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titles[step]}
      subtitle={subtitles[step]}
      width={980}
    >
      <div className="csim-row" style={{ display: "flex", gap: 0, alignItems: "flex-start", minHeight: 480 }}>
        <style>{`
          @media (max-width: 760px) {
            .csim-row { flex-direction: column !important; min-height: 0 !important; }
            .csim-row > div { padding-right: 0 !important; width: 100% !important; }
            .csim-cart { border-left: none !important; padding-left: 0 !important; border-top: 1px solid #E0D5C8; padding-top: 16px; margin-top: 16px; }
          }
        `}</style>

        {/* ── Left panel: search / configure / contribute ── */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 20, overflowY: "auto" }}>
          {step === "search" && (
            <SearchStep onSelect={handleSelect} onManual={handleManual} />
          )}
          {step === "configure" && selected && (
            <ConfigureStep
              part={selected}
              initialForm={editForm}
              onBack={() => { setSelected(null); setEditingCartId(null); setEditForm(null); setStep("search"); }}
              onSave={handleConfigureSave}
              saving={false}
              activeShopId={activeShopId}
            />
          )}
          {step === "contribute" && (
            <ContributeStep
              initialName={manualQuery}
              initialBarcode={manualBarcode}
              onBack={() => setStep("search")}
              onSave={handleContributeSave}
              saving={false}
            />
          )}
        </div>

        {/* ── Right panel: cart ── */}
        <CartPanel
          cart={cart}
          onRemove={handleRemoveFromCart}
          onEdit={handleEditCart}
          onSaveAll={handleSaveAll}
          saving={saving}
          supplier={supplier}
          setSupplier={setSupplier}
        />
      </div>
    </Modal>
  );
}
