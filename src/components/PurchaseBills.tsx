/**
 * PurchaseBills — supplier invoice upload → extract → review → add to inventory.
 *
 * Flow:
 *   1. Shop owner uploads a supplier invoice PDF
 *   2. Backend parses it (text-layer, zero API cost) and returns line items
 *   3. Review table: every row is editable; rows can be deselected; selling
 *      price defaults to the supplier's "rate incl. tax" column
 *   4. A totals banner cross-checks Σ(items) against the invoice's printed
 *      taxable total — green when they match, red warning when they don't
 *   5. "Add to Inventory" imports the verified rows (stock-in + movements)
 *   6. All uploaded bills are stored per shop and listed below
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { T, FONT } from "../theme";
import { fmt } from "../utils";
import { api } from "../api/client";

interface ExtractedItem {
  serial: number;
  partName: string;
  hsnCode: string | null;
  qty: number;
  unit: string | null;
  rateExclGst: number;      // unit price without GST (buying rate)
  rateInclGst: number | null; // unit price with GST (default selling price)
  discountPct: number;
  amount: number;           // taxable subtotal (qty × rateExclGst)
  mathOk: boolean;
}
interface Extracted {
  supplierName: string | null;
  supplierGstin: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  items: ExtractedItem[];
  taxableTotal: number | null;
  grandTotal: number | null;
  sumOfItems: number;
  sumMatches: boolean;
  warnings: string[];
}
interface ReviewRow extends ExtractedItem {
  include: boolean;
  sellingPrice: number;
}
interface BillRow {
  billId: number;
  fileUrl: string | null;
  fileName: string | null;
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  taxableTotal: string | null;
  grandTotal: string | null;
  itemCount: number;
  sumMatches: boolean;
  status: string;
  createdAt: string;
}

export function PurchaseBills({ toast }: { toast?: (msg: string, variant?: string, title?: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [billId, setBillId] = useState<number | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [error, setError] = useState("");

  const loadBills = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; bills: BillRow[] }>("/api/shop/purchase-bills");
      setBills(res.bills || []);
    } catch (err) {
      console.error("[PurchaseBills] list failed", err);
    } finally {
      setLoadingBills(false);
    }
  }, []);
  useEffect(() => { loadBills(); }, [loadBills]);

  // ── Upload + extract ───────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setError("");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF invoice (photos/scans support is coming soon)");
      return;
    }
    if (file.size > 12 * 1024 * 1024) { setError("Max 12 MB"); return; }
    setExtracting(true);
    try {
      const b64: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await api.post<{ success: boolean; billId: number; extracted: Extracted }>(
        "/api/shop/purchase-bills/extract",
        { fileBase64: b64, fileName: file.name }
      );
      setBillId(res.billId);
      setExtracted(res.extracted);
      setRows(res.extracted.items.map((it) => ({
        ...it,
        include: true,
        // default sell price = incl-GST rate from invoice, else estimate +18%
        sellingPrice: it.rateInclGst ?? +(it.rateExclGst * 1.18).toFixed(2),
      })));
      loadBills();
    } catch (e: any) {
      setError(e?.data?.error?.message || e?.message || "Could not read this invoice");
    } finally {
      setExtracting(false);
    }
  };

  // ── Import verified rows ───────────────────────────────────────────────────
  const handleImport = async () => {
    if (!billId) return;
    const items = rows.filter((r) => r.include).map((r) => ({
      partName: r.partName,
      hsnCode: r.hsnCode,
      qty: r.qty,
      rateExclGst: r.rateExclGst,
      sellingPrice: r.sellingPrice,
    }));
    if (!items.length) { setError("Select at least one item"); return; }
    setImporting(true);
    setError("");
    try {
      const res = await api.post<{ success: boolean; imported: number; errorCount: number }>(
        `/api/shop/purchase-bills/${billId}/import`, { items }
      );
      toast?.(`${res.imported} item${res.imported === 1 ? "" : "s"} added to inventory`, "emerald", "📦 Stock In");
      setExtracted(null); setRows([]); setBillId(null);
      loadBills();
    } catch (e: any) {
      setError(e?.data?.error?.message || "Import failed — try again");
    } finally {
      setImporting(false);
    }
  };

  const setRow = (i: number, patch: Partial<ReviewRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const includedSum = rows.filter((r) => r.include).reduce((s, r) => s + r.rateExclGst * r.qty, 0);

  const inp: React.CSSProperties = {
    width: "100%", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 6,
    padding: "5px 7px", fontSize: 12, fontFamily: FONT.mono, color: T.t1, outline: "none",
  };

  // ════════════════════════ REVIEW MODE ════════════════════════
  if (extracted) {
    return (
      <div className="page-in">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={() => { setExtracted(null); setRows([]); setBillId(null); }}
            style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", color: T.t2 }}>← Back</button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{extracted.supplierName || "Supplier invoice"}</div>
            <div style={{ fontSize: 12, color: T.t3 }}>
              Bill #{extracted.invoiceNumber || "—"} · {extracted.invoiceDate || "—"} · {extracted.items.length} items
            </div>
          </div>
        </div>

        {/* Totals validation banner */}
        <div style={{
          borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, lineHeight: 1.5,
          background: extracted.sumMatches ? "rgba(22,163,74,0.07)" : "rgba(186,26,26,0.06)",
          border: `1px solid ${extracted.sumMatches ? "rgba(22,163,74,0.3)" : "rgba(186,26,26,0.3)"}`,
          color: extracted.sumMatches ? "#15803D" : T.crimson,
        }}>
          {extracted.sumMatches
            ? <>✅ All items captured — line items sum to <b>{fmt(extracted.sumOfItems)}</b>, matching the invoice's taxable total exactly. Verify the rows below, then add to inventory.</>
            : <>⚠️ Items sum to <b>{fmt(extracted.sumOfItems)}</b> but the invoice total is <b>{fmt(extracted.taxableTotal || 0)}</b> — some items may be missing or misread. Cross-check against the paper bill before importing.</>}
        </div>
        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "9px 12px", color: T.crimson, fontSize: 13, marginBottom: 12 }}>{error}</div>}

        {/* Review table */}
        <div className="table-scroll" style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr>
                {["", "#", "Part Name", "HSN", "Qty", "Rate Excl. GST ₹", "Rate Incl. GST ₹", "Sell Price ₹", "Taxable Amount"].map((h) => (
                  <th key={h} style={{ padding: "9px 10px", fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ opacity: r.include ? 1 : 0.45, background: r.mathOk ? "transparent" : "rgba(217,119,6,0.06)" }}>
                  <td style={{ padding: "7px 10px", borderBottom: `1px solid ${T.border}` }}>
                    <input type="checkbox" checked={r.include} onChange={(e) => setRow(i, { include: e.target.checked })} style={{ width: 16, height: 16, cursor: "pointer" }} />
                  </td>
                  <td style={{ padding: "7px 10px", fontSize: 12, color: T.t3, borderBottom: `1px solid ${T.border}` }}>{r.serial}</td>
                  <td style={{ padding: "7px 10px", borderBottom: `1px solid ${T.border}`, minWidth: 220 }}>
                    <input style={inp} value={r.partName} onChange={(e) => setRow(i, { partName: e.target.value })} />
                  </td>
                  <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: FONT.mono, color: T.t2, borderBottom: `1px solid ${T.border}` }}>{r.hsnCode || "—"}</td>
                  <td style={{ padding: "7px 10px", borderBottom: `1px solid ${T.border}`, width: 70 }}>
                    <input style={inp} type="number" min={1} value={r.qty} onChange={(e) => setRow(i, { qty: Math.max(1, parseInt(e.target.value) || 1) })} />
                  </td>
                  <td style={{ padding: "7px 10px", borderBottom: `1px solid ${T.border}`, width: 110 }}>
                    <input style={inp} type="number" min={0} step="0.01" value={r.rateExclGst} onChange={(e) => setRow(i, { rateExclGst: Math.max(0, parseFloat(e.target.value) || 0) })} />
                  </td>
                  <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: FONT.mono, color: T.t2, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                    {r.rateInclGst != null ? fmt(r.rateInclGst) : "—"}
                  </td>
                  <td style={{ padding: "7px 10px", borderBottom: `1px solid ${T.border}`, width: 110 }}>
                    <input style={inp} type="number" min={0} step="0.01" value={r.sellingPrice} onChange={(e) => setRow(i, { sellingPrice: Math.max(0, parseFloat(e.target.value) || 0) })} />
                  </td>
                  <td style={{ padding: "7px 10px", fontSize: 12, fontFamily: FONT.mono, fontWeight: 600, color: T.t1, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{fmt(r.rateExclGst * r.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: T.t2 }}>
            <b style={{ color: T.t1 }}>{rows.filter((r) => r.include).length}</b> of {rows.length} items selected · purchase value <b style={{ fontFamily: FONT.mono, color: T.t1 }}>{fmt(includedSum)}</b>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={handleImport} disabled={importing}
            style={{ background: importing ? T.border : "#16A34A", color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 13, fontWeight: 800, cursor: importing ? "default" : "pointer", boxShadow: "0 4px 14px rgba(22,163,74,0.3)" }}>
            {importing ? "Adding…" : "✓ Add to Inventory"}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════ UPLOAD + LIST MODE ════════════════════════
  return (
    <div className="page-in">
      {/* Upload zone */}
      <div
        onClick={() => !extracting && fileRef.current?.click()}
        style={{
          border: `2px dashed ${T.border}`, borderRadius: 14, background: "#fff",
          padding: "34px 20px", textAlign: "center", cursor: extracting ? "default" : "pointer",
          marginBottom: 20, transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.amber; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}
      >
        {extracting ? (
          <>
            <div style={{ fontSize: 30, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>Reading invoice…</div>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Extracting parts, quantities and rates</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🧾</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>Upload a supplier invoice</div>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>
              PDF bills (e.g. Tally GST invoices) · parts, qty & rates are extracted automatically for your review
            </div>
          </>
        )}
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </div>
      {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "9px 12px", color: T.crimson, fontSize: 13, marginBottom: 14 }}>{error}</div>}

      {/* Stored bills */}
      <div style={{ fontSize: 13, fontWeight: 800, color: T.t1, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        📂 Your uploaded bills
      </div>
      {loadingBills ? (
        <div style={{ color: T.t3, fontSize: 13, padding: "16px 0" }}>Loading…</div>
      ) : bills.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: "26px 20px", textAlign: "center", color: T.t3, fontSize: 13 }}>
          No bills uploaded yet — your supplier invoices will be stored here.
        </div>
      ) : (
        <div className="table-scroll" style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>
                {["Bill #", "Supplier", "Date", "Items", "Total", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.billId}>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: FONT.mono, fontWeight: 600, color: T.t1, borderBottom: `1px solid ${T.border}` }}>{b.invoiceNumber || "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: T.t1, borderBottom: `1px solid ${T.border}`, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.supplierName || b.fileName || "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: T.t2, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{b.invoiceDate || new Date(b.createdAt).toLocaleDateString("en-IN")}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: T.t2, borderBottom: `1px solid ${T.border}` }}>{b.itemCount}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: FONT.mono, color: T.t1, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{b.grandTotal ? fmt(Number(b.grandTotal)) : "—"}</td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap",
                      background: b.status === "IMPORTED" ? "rgba(22,163,74,0.1)" : "rgba(217,119,6,0.1)",
                      color: b.status === "IMPORTED" ? "#16A34A" : "#D97706",
                      border: `1px solid ${b.status === "IMPORTED" ? "rgba(22,163,74,0.3)" : "rgba(217,119,6,0.3)"}`,
                    }}>{b.status === "IMPORTED" ? "✓ IMPORTED" : "PENDING REVIEW"}</span>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                    {b.fileUrl && (
                      <a href={b.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.amber, fontWeight: 700, textDecoration: "none" }}>View PDF ↗</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
