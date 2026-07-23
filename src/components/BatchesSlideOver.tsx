/**
 * BatchesSlideOver — slide-over panel that shows all stock batches for a
 * product and provides an "Add Batch" form at the bottom.
 *
 * Usage:
 *   <BatchesSlideOver open={!!batchP} product={batchP} onClose={() => setBatchP(null)} toast={toast} />
 */
import { useState, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { getBatchesForProduct, addBatch, StockBatch, CreateBatchInput } from "../api/stockBatches.js";
import { focusFirstError } from "../utils";

interface Product {
  inventoryId?: number | string;
  id?: number | string;
  name: string;
  sku?: string;
}

interface Props {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  toast?: (msg: string, type?: string) => void;
}

const EMPTY_FORM: CreateBatchInput = {
  batchNumber: "",
  serialNumber: "",
  qtyReceived: 1,
  costPrice: 0,
  supplierName: "",
  expiryDate: "",
  notes: "",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function BatchesSlideOver({ open, product, onClose, toast }: Props) {
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateBatchInput>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateBatchInput, string>>>({});

  const inventoryId = product
    ? Number(product.inventoryId ?? product.id)
    : null;

  const loadBatches = useCallback(async () => {
    if (!inventoryId) return;
    setLoading(true);
    try {
      const data = await getBatchesForProduct(inventoryId);
      setBatches(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast?.(e?.message || "Could not load batches", "warning");
    } finally {
      setLoading(false);
    }
  }, [inventoryId, toast]);

  useEffect(() => {
    if (open && inventoryId) {
      loadBatches();
      setForm(EMPTY_FORM);
      setShowForm(false);
      setErrors({});
    }
  }, [open, inventoryId, loadBatches]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!form.qtyReceived || form.qtyReceived <= 0) errs.qtyReceived = "Must be > 0";
    if (form.costPrice == null || form.costPrice < 0) errs.costPrice = "Must be ≥ 0";
    setErrors(errs);
    focusFirstError(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !inventoryId) return;
    setSaving(true);
    try {
      const payload: CreateBatchInput = {
        qtyReceived: Number(form.qtyReceived),
        costPrice: Number(form.costPrice),
        ...(form.batchNumber   ? { batchNumber:   form.batchNumber   } : {}),
        ...(form.serialNumber  ? { serialNumber:  form.serialNumber  } : {}),
        ...(form.supplierName  ? { supplierName:  form.supplierName  } : {}),
        ...(form.expiryDate    ? { expiryDate:    form.expiryDate    } : {}),
        ...(form.notes         ? { notes:         form.notes         } : {}),
      };
      const newBatch = await addBatch(inventoryId, payload);
      setBatches(prev => [newBatch, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast?.("Batch added successfully", "success");
    } catch (e: any) {
      toast?.(e?.data?.error || e?.message || "Could not add batch", "warning");
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof CreateBatchInput>(key: K, val: CreateBatchInput[K]) {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(28,27,27,0.45)",
          zIndex: 1000, backdropFilter: "blur(2px)",
        }}
      />

      {/* Slide-over panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(620px, 100vw)",
        background: T.surface,
        zIndex: 1001,
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 32px rgba(0,0,0,0.18)",
        animation: "slideInRight 0.22s ease",
        overflow: "hidden",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "18px 22px 16px",
          borderBottom: `1px solid ${T.border}`,
          background: T.surfaceContainerLow,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, fontFamily: FONT.display, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>📦</span>
                Batch / Lot Tracking
              </div>
              <div style={{ fontSize: 12, color: T.t3, marginTop: 3, fontFamily: FONT.ui }}>
                {product?.name}
                {product?.sku && <span style={{ marginLeft: 6, fontFamily: FONT.mono, color: T.t4 }}>{product.sku}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: "pointer", color: T.t2, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >×</button>
          </div>

          {/* Add Batch toggle */}
          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => setShowForm(f => !f)}
              style={{
                height: 36, padding: "0 16px",
                background: showForm ? T.surfaceContainer : T.amber,
                border: `1px solid ${showForm ? T.border : "transparent"}`,
                borderRadius: 9, fontSize: 13, fontWeight: 700,
                color: showForm ? T.t2 : "#FFFFFF",
                cursor: "pointer", fontFamily: FONT.ui,
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
              }}
            >
              {showForm ? "✕ Cancel" : "+ Add Batch"}
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* ── Add Batch Form ── */}
          {showForm && (
            <form onSubmit={handleSubmit} style={{
              padding: "18px 22px",
              borderBottom: `2px solid ${T.border}`,
              background: "#FFFBF5",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginBottom: 14, fontFamily: FONT.display }}>
                New Batch Entry
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Batch Number */}
                <div>
                  <label style={labelStyle}>Batch Number <span style={{ color: T.t4 }}>(optional)</span></label>
                  <input
                    value={form.batchNumber || ""}
                    onChange={e => setField("batchNumber", e.target.value)}
                    placeholder="e.g. LOT-2024-001"
                    style={inputStyle(false)}
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <label style={labelStyle}>Serial Number <span style={{ color: T.t4 }}>(optional)</span></label>
                  <input
                    value={form.serialNumber || ""}
                    onChange={e => setField("serialNumber", e.target.value)}
                    placeholder="e.g. S/N:ABC12345"
                    style={inputStyle(false)}
                  />
                </div>

                {/* Qty Received */}
                <div>
                  <label style={labelStyle}>Qty Received <span style={{ color: T.crimson }}>*</span></label>
                  <input
                    name="qtyReceived"
                    type="number" min={1} step={1}
                    value={form.qtyReceived}
                    onChange={e => setField("qtyReceived", Number(e.target.value))}
                    style={inputStyle(!!errors.qtyReceived)}
                  />
                  {errors.qtyReceived && <div style={errorStyle}>{errors.qtyReceived}</div>}
                </div>

                {/* Cost Price */}
                <div>
                  <label style={labelStyle}>Cost Price (₹) <span style={{ color: T.crimson }}>*</span></label>
                  <input
                    name="costPrice"
                    type="number" min={0} step={0.01}
                    value={form.costPrice}
                    onChange={e => setField("costPrice", Number(e.target.value))}
                    style={inputStyle(!!errors.costPrice)}
                  />
                  {errors.costPrice && <div style={errorStyle}>{errors.costPrice}</div>}
                </div>

                {/* Supplier Name */}
                <div>
                  <label style={labelStyle}>Supplier Name <span style={{ color: T.t4 }}>(optional)</span></label>
                  <input
                    value={form.supplierName || ""}
                    onChange={e => setField("supplierName", e.target.value)}
                    placeholder="e.g. Bosch Distributors"
                    style={inputStyle(false)}
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label style={labelStyle}>Expiry Date <span style={{ color: T.t4 }}>(optional)</span></label>
                  <input
                    type="date"
                    value={form.expiryDate || ""}
                    onChange={e => setField("expiryDate", e.target.value)}
                    style={inputStyle(false)}
                  />
                </div>
              </div>

              {/* Notes — full width */}
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Notes <span style={{ color: T.t4 }}>(optional)</span></label>
                <textarea
                  rows={2}
                  value={form.notes || ""}
                  onChange={e => setField("notes", e.target.value)}
                  placeholder="Supplier invoice, condition notes…"
                  style={{
                    ...inputStyle(false),
                    resize: "vertical", height: 56, lineHeight: 1.5,
                    padding: "8px 12px",
                  }}
                />
              </div>

              {/* Submit */}
              <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setErrors({}); }}
                  style={{ height: 36, padding: "0 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 13, color: T.t2, cursor: "pointer", fontFamily: FONT.ui }}
                >Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ height: 36, padding: "0 20px", background: saving ? T.t4 : T.amber, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#FFFFFF", cursor: saving ? "not-allowed" : "pointer", fontFamily: FONT.ui }}
                >{saving ? "Saving…" : "Save Batch"}</button>
              </div>
            </form>
          )}

          {/* ── Batch List ── */}
          <div style={{ padding: "18px 22px", flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginBottom: 12, fontFamily: FONT.display, display: "flex", alignItems: "center", gap: 8 }}>
              Batch History
              <span style={{ fontSize: 11, fontWeight: 500, color: T.t3, background: T.surfaceContainerHigh, padding: "2px 8px", borderRadius: 10, fontFamily: FONT.ui }}>{batches.length}</span>
            </div>

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ height: 72, borderRadius: 10, background: T.surfaceContainer, animation: "pulse 1.5s infinite" }} />
                ))}
              </div>
            )}

            {!loading && batches.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", color: T.t3 }}>
                <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }}>🗂</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.t2, marginBottom: 6, fontFamily: FONT.display }}>No batches recorded yet</div>
                <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.ui }}>Use "Add Batch" to record your first batch or serial entry.</div>
              </div>
            )}

            {!loading && batches.length > 0 && (
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
                {/* Table header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.2fr 80px 80px 90px 1fr 90px",
                  gap: 0,
                  background: T.surfaceContainerLow,
                  borderBottom: `1px solid ${T.border}`,
                  padding: "8px 14px",
                }}>
                  {["Batch #", "Serial #", "Rcvd", "Rem.", "Cost", "Supplier", "Date"].map(h => (
                    <div key={h} style={{ fontSize: 9, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT.ui }}>{h}</div>
                  ))}
                </div>

                {batches.map((b, idx) => (
                  <div
                    key={b.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1.2fr 80px 80px 90px 1fr 90px",
                      padding: "10px 14px",
                      borderBottom: idx < batches.length - 1 ? `1px solid ${T.border}` : "none",
                      background: idx % 2 === 0 ? T.card : T.surfaceContainerLowest,
                      alignItems: "center",
                      transition: "background 0.1s",
                    }}
                  >
                    {/* Batch # */}
                    <div style={{ fontFamily: FONT.mono, fontSize: 12, color: b.batchNumber ? T.amber : T.t4, fontWeight: b.batchNumber ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.batchNumber || <span style={{ fontFamily: FONT.ui, fontSize: 11, fontStyle: "italic" }}>—</span>}
                    </div>
                    {/* Serial # */}
                    <div style={{ fontFamily: FONT.mono, fontSize: 12, color: b.serialNumber ? T.sky : T.t4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.serialNumber || <span style={{ fontFamily: FONT.ui, fontSize: 11, fontStyle: "italic" }}>—</span>}
                    </div>
                    {/* Qty Received */}
                    <div style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: T.t1 }}>{b.qtyReceived}</div>
                    {/* Qty Remaining */}
                    <div style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: b.qtyRemaining === 0 ? T.t4 : b.qtyRemaining < b.qtyReceived / 2 ? "#D97706" : T.emerald }}>
                      {b.qtyRemaining}
                    </div>
                    {/* Cost Price */}
                    <div style={{ fontFamily: FONT.mono, fontSize: 11, color: T.t2 }}>{fmt(b.costPrice)}</div>
                    {/* Supplier */}
                    <div style={{ fontSize: 11, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.supplierName || <span style={{ color: T.t4, fontStyle: "italic" }}>—</span>}
                    </div>
                    {/* Date */}
                    <div style={{ fontSize: 10, color: T.t3, fontFamily: FONT.ui }}>{fmtDate(b.receivedAt || b.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>
    </>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#58413F",
  marginBottom: 5,
  fontFamily: "'Inter', system-ui, sans-serif",
};

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 36,
    background: "#FFFFFF",
    border: `1px solid ${hasError ? "#BA1A1A" : "#DFBFBC"}`,
    borderRadius: 8,
    padding: "0 10px",
    fontSize: 13,
    color: "#1C1B1B",
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };
}

const errorStyle: React.CSSProperties = {
  fontSize: 10,
  color: "#BA1A1A",
  marginTop: 3,
  fontFamily: "'Inter', system-ui, sans-serif",
};
