/**
 * PurchaseOrderModal — production PO flow for shop owners.
 *
 * Create:  pick supplier → pick items (supplier-linked first) → edit qty/price →
 *          Save Draft → download Excel / PDF, share on WhatsApp.
 * History: list POs with status flow DRAFT → APPROVED → SENT → RECEIVED.
 */
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { T, FONT } from "../theme";
import { fmt } from "../utils";
import { getParties } from "../api/parties.js";
import { getAccessToken } from "../api/client.js";
import {
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus,
  getSupplierProducts, getPurchaseOrderPdfUrl,
} from "../api/purchaseOrders";

// ── Types (loose — backend rows come through as plain JSON) ─────────────────
interface ProductRow {
  id: number; inventoryId?: number; sku: string; name: string;
  stock: number; minStock: number; buyPrice: number; gstRate?: number;
  hsnCode?: string | null; category?: string;
}
interface Supplier { partyId: number; id?: number; name: string; phone?: string | null; gstin?: string | null; }
interface PoLine { selected: boolean; qty: number; price: number; }

const STATUS_META: Record<string, { label: string; color: string; bg: string; next?: { status: string; label: string } }> = {
  DRAFT:     { label: "Draft",     color: "#92400E", bg: "#FEF3C7", next: { status: "APPROVED", label: "Approve" } },
  APPROVED:  { label: "Approved",  color: "#1D4ED8", bg: "#DBEAFE", next: { status: "SENT", label: "Mark Sent" } },
  SENT:      { label: "Sent",      color: "#6D28D9", bg: "#EDE9FE", next: { status: "RECEIVED", label: "Mark Received" } },
  RECEIVED:  { label: "Received",  color: "#065F46", bg: "#D1FAE5" },
  PARTIAL:   { label: "Partial",   color: "#92400E", bg: "#FEF3C7" },
  PENDING:   { label: "Pending",   color: "#92400E", bg: "#FEF3C7", next: { status: "RECEIVED", label: "Mark Received" } },
  CANCELLED: { label: "Cancelled", color: "#991B1B", bg: "#FEE2E2" },
};

function suggestedQty(p: ProductRow) {
  return Math.max(p.minStock * 2 - p.stock, p.minStock, 1);
}

// ── Excel export (xlsx, professional layout) ────────────────────────────────
function downloadPoExcel(po: any, shopName: string) {
  const items = po.items || [];
  const rows: (string | number)[][] = [
    ["PURCHASE ORDER"],
    [],
    ["PO Number", po.poNumber],
    ["Date", new Date(po.createdAt).toLocaleDateString("en-IN")],
    ["Supplier", po.party?.name || po.supplierName || "—"],
    ["Warehouse / Shop", shopName],
    ["Status", po.status],
    ...(po.notes ? [["Remarks", po.notes]] : []),
    [],
    ["#", "Part Name", "HSN", "Qty", "Unit Price", "GST %", "Amount"],
    ...items.map((it: any, i: number) => [
      i + 1, it.partName, it.hsnCode || "-", it.orderedQty,
      Number(it.unitPrice), Number(it.gstRate), Number(it.total),
    ]),
    [],
    ["", "", "", "", "", "Subtotal", Number(po.subtotal)],
    ["", "", "", "", "", "CGST", Number(po.cgst)],
    ["", "", "", "", "", "SGST", Number(po.sgst)],
    ["", "", "", "", "", "TOTAL", Number(po.totalAmount)],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 4 }, { wch: 36 }, { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 8 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Purchase Order");
  XLSX.writeFile(wb, `${po.poNumber}.xlsx`);
}

async function downloadPoPdf(po: any, toast?: (m: string, t?: string) => void) {
  try {
    const res = await fetch(getPurchaseOrderPdfUrl(po.poId), {
      headers: { Authorization: `Bearer ${getAccessToken()}` }, credentials: "include",
    });
    if (!res.ok) throw new Error("pdf fetch failed");
    const url = URL.createObjectURL(await res.blob());
    window.open(url, "_blank");
  } catch {
    toast?.("Could not fetch the PDF — check your connection", "warning");
  }
}

function sharePoWhatsApp(po: any, shopName: string) {
  const msg = encodeURIComponent(
    `*${shopName}*\nPurchase Order ${po.poNumber}\n` +
    `Supplier: ${po.party?.name || po.supplierName || "—"}\n` +
    `Items: ${(po.items || []).length}\nTotal: ₹${Number(po.totalAmount).toFixed(2)}\n` +
    (po.notes ? `Remarks: ${po.notes}\n` : "") +
    `\nPlease confirm availability and delivery date. Thank you!`
  );
  const ph = String(po.party?.phone || po.supplierPhone || "").replace(/\D/g, "");
  const url = ph.length >= 10 ? `https://wa.me/91${ph.slice(-10)}?text=${msg}` : `https://wa.me/?text=${msg}`;
  window.open(url, "_blank");
}

// ── Small UI bits ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.DRAFT;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: m.color, background: m.bg,
      padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}

const inputStyle: React.CSSProperties = {
  width: 72, height: 32, border: `1px solid ${T.border}`, borderRadius: 8,
  padding: "0 8px", fontSize: 13, fontFamily: FONT.ui, color: T.t1,
  outline: "none", boxSizing: "border-box", textAlign: "right", background: "#fff",
};

const actBtn: React.CSSProperties = {
  height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid ${T.border}`,
  background: "#fff", fontSize: 12, fontWeight: 600, color: T.t1, cursor: "pointer",
  fontFamily: FONT.ui, whiteSpace: "nowrap",
};

interface PurchaseOrderModalProps {
  open: boolean;
  onClose: () => void;
  products: ProductRow[];
  preselectedIds: number[];
  shopName: string;
  toast?: (msg: string, type?: string, title?: string) => void;
}

export function PurchaseOrderModal({ open, onClose, products, preselectedIds, shopName, toast }: PurchaseOrderModalProps) {
  const [view, setView] = useState<"create" | "done" | "list">("create");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [linkedIds, setLinkedIds] = useState<number[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [lines, setLines] = useState<Record<number, PoLine>>({});
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdPo, setCreatedPo] = useState<any>(null);
  const [poList, setPoList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const supplier = suppliers.find(s => (s.partyId ?? s.id) === supplierId) || null;

  // Load suppliers on open + reset state
  useEffect(() => {
    if (!open) return;
    setView("create"); setError(""); setRemarks(""); setCreatedPo(null);
    setSupplierId(""); setLinkedIds(null); setShowAll(false); setItemSearch("");
    getParties("SUPPLIER")
      .then((r: any) => setSuppliers(r?.parties || []))
      .catch(() => setSuppliers([]));
    // Pre-select: explicitly checked rows, else all low-stock items
    const init: Record<number, PoLine> = {};
    const wanted = preselectedIds.length > 0
      ? products.filter(p => preselectedIds.includes(p.id))
      : products.filter(p => p.stock < p.minStock);
    wanted.forEach(p => { init[p.id] = { selected: true, qty: suggestedQty(p), price: p.buyPrice || 0 }; });
    setLines(init);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the supplier changes, fetch their linked products
  useEffect(() => {
    if (!supplierId) { setLinkedIds(null); return; }
    let alive = true;
    getSupplierProducts(Number(supplierId))
      .then((r: any) => { if (alive) setLinkedIds(r?.inventoryIds || []); })
      .catch(() => { if (alive) setLinkedIds([]); });
    return () => { alive = false; };
  }, [supplierId]);

  const loadList = () => {
    setListLoading(true);
    getPurchaseOrders()
      .then((r: any) => setPoList(r?.data || []))
      .catch(() => setPoList([]))
      .finally(() => setListLoading(false));
  };
  useEffect(() => { if (open && view === "list") loadList(); }, [open, view]);

  // Visible product candidates: supplier-linked first; "show all" reveals the rest.
  const candidates = useMemo(() => {
    let list = products;
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      list = list.filter(p => [p.name, p.sku, p.category].some(s => (s || "").toLowerCase().includes(q)));
    }
    const linked = new Set(linkedIds || []);
    const hasLinks = supplierId && linkedIds !== null && linkedIds.length > 0;
    if (hasLinks && !showAll) {
      // linked products + anything already ticked (so a selection never disappears)
      list = list.filter(p => linked.has(p.id) || lines[p.id]?.selected);
    }
    return [...list].sort((a, b) => {
      const la = linked.has(a.id) ? 0 : 1, lb = linked.has(b.id) ? 0 : 1;
      if (la !== lb) return la - lb;
      const sa = a.stock < a.minStock ? 0 : 1, sb = b.stock < b.minStock ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
  }, [products, itemSearch, linkedIds, supplierId, showAll, lines]);

  const selected = useMemo(
    () => products.filter(p => lines[p.id]?.selected),
    [products, lines]
  );
  const totals = useMemo(() => {
    let amount = 0;
    selected.forEach(p => {
      const l = lines[p.id];
      const taxable = l.qty * l.price;
      amount += taxable * (1 + (p.gstRate ?? 18) / 100);
    });
    return { count: selected.length, amount };
  }, [selected, lines]);

  const toggleLine = (p: ProductRow) => {
    setLines(prev => {
      const cur = prev[p.id];
      if (cur?.selected) return { ...prev, [p.id]: { ...cur, selected: false } };
      return { ...prev, [p.id]: { selected: true, qty: cur?.qty || suggestedQty(p), price: cur?.price ?? (p.buyPrice || 0) } };
    });
  };
  const setQty = (id: number, qty: number) =>
    setLines(prev => ({ ...prev, [id]: { ...prev[id], qty: Math.max(1, qty || 1) } }));
  const setPrice = (id: number, price: number) =>
    setLines(prev => ({ ...prev, [id]: { ...prev[id], price: Math.max(0, price || 0) } }));

  const handleSaveDraft = async () => {
    setError("");
    if (!supplier) { setError("Select a supplier before generating the PO."); return; }
    if (selected.length === 0) { setError("Select at least one product."); return; }
    setSaving(true);
    try {
      const res: any = await createPurchaseOrder({
        partyId: supplier.partyId ?? supplier.id,
        supplierName: supplier.name,
        supplierGstin: supplier.gstin || undefined,
        notes: remarks || undefined,
        items: selected.map(p => ({
          inventoryId: p.inventoryId ?? p.id,
          orderedQty: lines[p.id].qty,
          unitPrice: lines[p.id].price,
          gstRate: p.gstRate ?? 18,
        })),
      });
      const po = res?.data;
      // keep supplier phone handy for WhatsApp share (list payload includes party)
      if (po && !po.party) po.party = { name: supplier.name, phone: supplier.phone };
      setCreatedPo(po);
      setView("done");
      toast?.(`Draft ${po?.poNumber} saved — ${selected.length} items · ${fmt(totals.amount)}`, "success", "📦 PO Created");
    } catch (e: any) {
      setError(e?.data?.error?.message || e?.message || "Failed to save the purchase order.");
    }
    setSaving(false);
  };

  const advanceStatus = async (po: any) => {
    const next = STATUS_META[po.status]?.next;
    if (!next) return;
    try {
      const receivedItems = next.status === "RECEIVED"
        ? (po.items || []).map((it: any) => ({ itemId: it.itemId, receivedQty: it.orderedQty - (it.receivedQty || 0) }))
        : undefined;
      await updatePurchaseOrderStatus(po.poId, next.status, receivedItems);
      toast?.(`${po.poNumber} → ${STATUS_META[next.status].label}${next.status === "RECEIVED" ? " · stock updated" : ""}`, "success");
      loadList();
    } catch (e: any) {
      toast?.(e?.data?.error?.message || "Could not update status", "warning");
    }
  };

  if (!open) return null;

  const lowStock = (p: ProductRow) => p.stock < p.minStock;
  const linkedSet = new Set(linkedIds || []);

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 2147483000, background: "rgba(15,10,8,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(960px, 100%)", maxHeight: "92vh", display: "flex", flexDirection: "column",
        background: "#fff", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        fontFamily: FONT.ui, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.t1 }}>📦 Purchase Orders</div>
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {([["create", "New PO"], ["list", "History"]] as const).map(([v, label]) => {
              const active = view === v || (v === "create" && view === "done");
              return (
                <button key={v} onClick={() => setView(v)} style={{
                  height: 30, padding: "0 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                  fontFamily: FONT.ui, cursor: "pointer",
                  border: `1px solid ${active ? T.amber : T.border}`,
                  background: active ? `${T.amber}14` : "#fff",
                  color: active ? T.amber : T.t2,
                }}>{label}</button>
              );
            })}
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", width: 32, height: 32, border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: T.t3 }}>✕</button>
        </div>

        {/* ── CREATE VIEW ── */}
        {view === "create" && (
          <>
            <div style={{ padding: "14px 20px", display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ minWidth: 240 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                  Supplier <span style={{ color: "#8B1E1E" }}>*</span>
                </label>
                <select
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value ? Number(e.target.value) : "")}
                  style={{ width: "100%", height: 38, border: `1.5px solid ${supplierId ? T.border : "#F59E0B"}`, borderRadius: 10, padding: "0 10px", fontSize: 13, fontFamily: FONT.ui, background: "#fff", color: T.t1, outline: "none" }}
                >
                  <option value="">Select supplier…</option>
                  {suppliers.map(s => (
                    <option key={s.partyId ?? s.id} value={s.partyId ?? s.id}>{s.name}</option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>No suppliers yet — add one in the Parties page first.</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <input
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  placeholder="Search products…"
                  style={{ width: "100%", height: 38, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              {supplierId && linkedIds !== null && linkedIds.length > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.t2, cursor: "pointer", height: 38 }}>
                  <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
                  Show all products
                </label>
              )}
            </div>

            {supplierId && linkedIds !== null && linkedIds.length === 0 && (
              <div style={{ padding: "8px 20px", fontSize: 12, color: "#92400E", background: "#FFFBEB", borderBottom: `1px solid ${T.border}` }}>
                No purchase history with this supplier yet — showing all products.
              </div>
            )}

            {/* Items table */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
                    {["", "SKU", "Product", "Stock", "Qty", "Buy Price", "Amount"].map((h, i) => (
                      <th key={i} style={{ textAlign: i >= 3 ? "right" : "left", padding: "10px 8px", fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {candidates.map(p => {
                    const l = lines[p.id];
                    const isSel = !!l?.selected;
                    const low = lowStock(p);
                    const amount = isSel ? l.qty * l.price * (1 + (p.gstRate ?? 18) / 100) : 0;
                    return (
                      <tr key={p.id} style={{ background: low ? "#FFFBEB" : "transparent", borderBottom: `1px solid ${T.border}22` }}>
                        <td style={{ padding: "8px", width: 28 }}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleLine(p)} style={{ cursor: "pointer" }} />
                        </td>
                        <td style={{ padding: "8px", color: T.t3, fontSize: 12, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.sku}</td>
                        <td style={{ padding: "8px", fontWeight: 600, color: T.t1 }}>
                          {p.name}
                          {linkedSet.has(p.id) && <span title="Previously bought from this supplier" style={{ marginLeft: 6, fontSize: 10, color: "#065F46", background: "#D1FAE5", padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>linked</span>}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: low ? "#B45309" : T.t2 }}>
                          {p.stock}{low && <span style={{ fontSize: 10, marginLeft: 4 }}>⚠ min {p.minStock}</span>}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          {isSel ? (
                            <input type="number" min={1} value={l.qty} onChange={e => setQty(p.id, parseInt(e.target.value))} style={inputStyle} />
                          ) : (
                            <span style={{ color: T.t3, fontSize: 12 }}>{suggestedQty(p)}</span>
                          )}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          {isSel ? (
                            <input type="number" min={0} step="0.01" value={l.price} onChange={e => setPrice(p.id, parseFloat(e.target.value))} style={inputStyle} />
                          ) : (
                            <span style={{ color: T.t3, fontSize: 12 }}>{fmt(p.buyPrice || 0)}</span>
                          )}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: isSel ? T.t1 : T.t3 }}>
                          {isSel ? fmt(amount) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {candidates.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: T.t3 }}>No products match.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 20px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Remarks for supplier (optional)…"
                style={{ flex: 1, minWidth: 200, height: 38, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }}
              />
              <div style={{ fontSize: 13, color: T.t2 }}>
                <b style={{ color: T.t1 }}>{totals.count}</b> items · <b style={{ color: T.t1 }}>{fmt(totals.amount)}</b> (incl. GST)
              </div>
              {error && <div style={{ width: "100%", fontSize: 12.5, color: "#B91C1C", fontWeight: 600 }}>{error}</div>}
              <button
                onClick={handleSaveDraft}
                disabled={saving || !supplierId || totals.count === 0}
                style={{
                  height: 40, padding: "0 20px", borderRadius: 10, border: "none",
                  background: (!supplierId || totals.count === 0) ? "#D6CDC8" : T.amber,
                  color: "#fff", fontSize: 13.5, fontWeight: 700, fontFamily: FONT.ui,
                  cursor: (!supplierId || totals.count === 0) ? "not-allowed" : "pointer",
                }}
              >{saving ? "Saving…" : "💾 Save Draft PO"}</button>
            </div>
          </>
        )}

        {/* ── DONE VIEW ── */}
        {view === "done" && createdPo && (
          <div style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, overflowY: "auto" }}>
            <div style={{ fontSize: 44 }}>✅</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: T.t1 }}>{createdPo.poNumber} saved as Draft</div>
            <div style={{ fontSize: 13.5, color: T.t2 }}>
              {createdPo.party?.name || createdPo.supplierName} · {(createdPo.items || []).length} items · {fmt(Number(createdPo.totalAmount))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap", justifyContent: "center" }}>
              <button style={{ ...actBtn, height: 42, padding: "0 18px", fontSize: 13 }} onClick={() => downloadPoExcel(createdPo, shopName)}>📊 Download Excel</button>
              <button style={{ ...actBtn, height: 42, padding: "0 18px", fontSize: 13 }} onClick={() => downloadPoPdf(createdPo, toast)}>📄 Download PDF</button>
              <button style={{ ...actBtn, height: 42, padding: "0 18px", fontSize: 13, background: "#25D366", color: "#fff", border: "none", fontWeight: 700 }} onClick={() => sharePoWhatsApp(createdPo, shopName)}>💬 Share WhatsApp</button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={actBtn} onClick={() => setView("list")}>View All POs</button>
              <button style={actBtn} onClick={() => { setView("create"); setCreatedPo(null); }}>+ New PO</button>
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
            {listLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: T.t3 }}>Loading purchase orders…</div>
            ) : poList.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: T.t3 }}>No purchase orders yet.</div>
            ) : (
              poList.map(po => {
                const next = STATUS_META[po.status]?.next;
                return (
                  <div key={po.poId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px", borderBottom: `1px solid ${T.border}55`, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 150 }}>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: T.t1 }}>{po.poNumber}</div>
                      <div style={{ fontSize: 11.5, color: T.t3 }}>{new Date(po.createdAt).toLocaleDateString("en-IN")}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{po.party?.name || po.supplierName || "—"}</div>
                      <div style={{ fontSize: 11.5, color: T.t3 }}>{(po.items || []).length} items · {fmt(Number(po.totalAmount))}</div>
                    </div>
                    <StatusBadge status={po.status} />
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {next && (
                        <button style={{ ...actBtn, background: T.amber, color: "#fff", border: "none", fontWeight: 700 }} onClick={() => advanceStatus(po)}>
                          {next.label}
                        </button>
                      )}
                      <button style={actBtn} title="Download Excel" onClick={() => downloadPoExcel(po, shopName)}>📊</button>
                      <button style={actBtn} title="Download PDF" onClick={() => downloadPoPdf(po, toast)}>📄</button>
                      <button style={{ ...actBtn, background: "#25D366", color: "#fff", border: "none" }} title="Share on WhatsApp" onClick={() => sharePoWhatsApp(po, shopName)}>💬</button>
                      {po.status === "DRAFT" && (
                        <button style={{ ...actBtn, color: "#B91C1C" }} title="Cancel PO" onClick={async () => {
                          try { await updatePurchaseOrderStatus(po.poId, "CANCELLED"); toast?.(`${po.poNumber} cancelled`, "info"); loadList(); }
                          catch { toast?.("Could not cancel", "warning"); }
                        }}>✕</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
