/**
 * PurchaseOrderModal — full PO flow with market-parity features:
 *   • Freight + other charges on every PO
 *   • Partial receipt UI — per-item qty inputs
 *   • State-machine enforcement (transitions match backend)
 *   • Duplicate any PO as a fresh DRAFT
 *   • Link a purchase bill to reconcile a received PO
 */
import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { T, FONT } from "../theme";
import { fmt } from "../utils";
import { getParties } from "../api/parties.js";
import { getAccessToken } from "../api/client.js";
import { getPurchaseBills } from "../api/purchaseBills.js";
import {
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus,
  getSupplierProducts, getPurchaseOrderPdfUrl,
  clonePurchaseOrder, linkPurchaseOrderBill, getSupplierPriceHistory,
  sendPurchaseOrderByEmail,
} from "../api/purchaseOrders";

interface ProductRow {
  id: number; inventoryId?: number; sku: string; name: string;
  stock: number; minStock: number; buyPrice: number; gstRate?: number;
  hsnCode?: string | null; category?: string;
}
interface Supplier { partyId: number; id?: number; name: string; phone?: string | null; gstin?: string | null; }
interface PoLine { selected: boolean; qty: number; price: number; }

const STATUS_META: Record<string, {
  label: string; color: string; bg: string;
  next?: { status: string; label: string };
  canPartial?: boolean;
}> = {
  DRAFT:     { label: "Draft",     color: "#92400E", bg: "#FEF3C7", next: { status: "APPROVED", label: "Approve" } },
  APPROVED:  { label: "Approved",  color: "#1D4ED8", bg: "#DBEAFE", next: { status: "SENT",     label: "Mark Sent" } },
  SENT:      { label: "Sent",      color: "#6D28D9", bg: "#EDE9FE", next: { status: "RECEIVED", label: "Receive All" }, canPartial: true },
  RECEIVED:  { label: "Received",  color: "#065F46", bg: "#D1FAE5" },
  PARTIAL:   { label: "Partial",   color: "#92400E", bg: "#FEF3C7", next: { status: "RECEIVED", label: "Receive Rest" }, canPartial: true },
  PENDING:   { label: "Pending",   color: "#92400E", bg: "#FEF3C7", next: { status: "RECEIVED", label: "Receive All"  }, canPartial: true },
  CANCELLED: { label: "Cancelled", color: "#991B1B", bg: "#FEE2E2" },
};

function suggestedQty(p: ProductRow) {
  return Math.max(p.minStock * 2 - p.stock, p.minStock, 1);
}

// ── Excel export ─────────────────────────────────────────────────────────────
function downloadPoExcel(po: any, shopName: string) {
  const items = po.items || [];
  const freightAmt      = Number(po.freight      || 0);
  const otherChargesAmt = Number(po.otherCharges || 0);
  const rows: (string | number)[][] = [
    ["PURCHASE ORDER"],
    [],
    ["PO Number",        po.poNumber],
    ["Date",             new Date(po.createdAt).toLocaleDateString("en-IN")],
    ["Supplier",         po.party?.name || po.supplierName || "—"],
    ["Warehouse / Shop", shopName],
    ["Status",           po.status],
    ...(po.notes ? [["Remarks", po.notes]] : []),
    [],
    ["#", "Part Name", "HSN", "Qty", "Unit Price", "GST %", "Amount"],
    ...items.map((it: any, i: number) => [
      i + 1, it.partName, it.hsnCode || "-", it.orderedQty,
      Number(it.unitPrice), Number(it.gstRate), Number(it.total),
    ]),
    [],
    ["", "", "", "", "", "Subtotal",      Number(po.subtotal)],
    ["", "", "", "", "", "CGST",          Number(po.cgst)],
    ["", "", "", "", "", "SGST",          Number(po.sgst)],
    ...(freightAmt      > 0 ? [["", "", "", "", "", "Freight",       freightAmt]]      : []),
    ...(otherChargesAmt > 0 ? [["", "", "", "", "", "Other Charges", otherChargesAmt]] : []),
    ["", "", "", "", "", "TOTAL",         Number(po.totalAmount)],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 4 }, { wch: 36 }, { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
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
  const url = ph.length >= 10
    ? `https://wa.me/91${ph.slice(-10)}?text=${msg}`
    : `https://wa.me/?text=${msg}`;
  window.open(url, "_blank");
}

// ── Small UI atoms ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.DRAFT;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: m.color, background: m.bg,
      padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}

const inputStyle: CSSProperties = {
  width: 72, height: 32, border: `1px solid ${T.border}`, borderRadius: 8,
  padding: "0 8px", fontSize: 13, fontFamily: FONT.ui, color: T.t1,
  outline: "none", boxSizing: "border-box", textAlign: "right", background: "#fff",
};

const actBtn: CSSProperties = {
  height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid ${T.border}`,
  background: "#fff", fontSize: 12, fontWeight: 600, color: T.t1, cursor: "pointer",
  fontFamily: FONT.ui, whiteSpace: "nowrap",
};

// ── Partial receipt dialog ────────────────────────────────────────────────────
function ReceiveItemsDialog({
  po, onDone, onClose, toast,
}: {
  po: any;
  onDone: () => void;
  onClose: () => void;
  toast?: (m: string, t?: string) => void;
}) {
  const remaining = (po.items || [])
    .map((it: any) => ({ ...it, remaining: it.orderedQty - (it.receivedQty || 0) }))
    .filter((it: any) => it.remaining > 0);

  const [qtys, setQtys] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    remaining.forEach((it: any) => { init[it.itemId] = it.remaining; });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const allFull    = remaining.every((it: any) => (qtys[it.itemId] ?? 0) >= it.remaining);
  const anyQty     = remaining.some((it: any)  => (qtys[it.itemId] ?? 0) > 0);
  const nextStatus = allFull ? "RECEIVED" : "PARTIAL";

  const handleSave = async () => {
    if (!anyQty) return;
    setSaving(true);
    try {
      const receivedItems = remaining
        .map((it: any) => ({ itemId: it.itemId, receivedQty: qtys[it.itemId] ?? 0 }))
        .filter((r: any) => r.receivedQty > 0);
      await updatePurchaseOrderStatus(po.poId, nextStatus, receivedItems);
      toast?.(
        `${po.poNumber} ${nextStatus === "RECEIVED" ? "fully received" : "partially received"} · stock updated`,
        "success"
      );
      onDone();
    } catch (e: any) {
      toast?.(e?.data?.error?.message || "Could not update receipt", "warning");
    }
    setSaving(false);
  };

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 2147483646, background: "rgba(15,10,8,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(560px,100%)", background: "#fff", borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", fontFamily: FONT.ui, overflow: "hidden",
      }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: T.t1 }}>📥 Receive items — {po.poNumber}</span>
          <button onClick={onClose} style={{ marginLeft: "auto", border: "none", background: "none", fontSize: 18, cursor: "pointer", color: T.t3 }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", maxHeight: "50vh" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Part", "Ordered", "Already in", "Receiving now"].map((h, i) => (
                  <th key={i} style={{ textAlign: i >= 1 ? "right" : "left", padding: "8px 14px", fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {remaining.map((it: any) => (
                <tr key={it.itemId} style={{ borderBottom: `1px solid ${T.border}22` }}>
                  <td style={{ padding: "9px 14px", fontWeight: 600, color: T.t1 }}>{it.partName}</td>
                  <td style={{ padding: "9px 14px", textAlign: "right", color: T.t2 }}>{it.orderedQty}</td>
                  <td style={{ padding: "9px 14px", textAlign: "right", color: T.t3 }}>{it.receivedQty || 0}</td>
                  <td style={{ padding: "9px 14px", textAlign: "right" }}>
                    <input
                      type="number" min={0} max={it.remaining}
                      value={qtys[it.itemId] ?? it.remaining}
                      onChange={e => setQtys(prev => ({
                        ...prev,
                        [it.itemId]: Math.min(it.remaining, Math.max(0, parseInt(e.target.value) || 0)),
                      }))}
                      style={{ ...inputStyle, width: 64 }}
                    />
                    <span style={{ fontSize: 11, color: T.t3, marginLeft: 4 }}>/ {it.remaining}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 12, color: T.t3, marginRight: "auto" }}>
            Will mark as: <b style={{ color: nextStatus === "RECEIVED" ? "#065F46" : "#92400E" }}>{nextStatus}</b>
          </span>
          <button onClick={onClose} style={actBtn}>Cancel</button>
          <button
            onClick={handleSave} disabled={saving || !anyQty}
            style={{ ...actBtn, background: anyQty ? "#059669" : "#D6CDC8", color: "#fff", border: "none", fontWeight: 700 }}
          >{saving ? "Saving…" : "✓ Confirm Receipt"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Link bill dialog ──────────────────────────────────────────────────────────
function LinkBillDialog({
  po, onDone, onClose, toast,
}: {
  po: any;
  onDone: () => void;
  onClose: () => void;
  toast?: (m: string, t?: string) => void;
}) {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(po.linkedBillId ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPurchaseBills({ status: "IMPORTED" })
      .then((r: any) => setBills(r?.data || r?.bills || []))
      .catch(() => setBills([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await linkPurchaseOrderBill(po.poId, selectedId);
      toast?.(selectedId ? `Bill linked to ${po.poNumber}` : `Bill unlinked from ${po.poNumber}`, "success");
      onDone();
    } catch (e: any) {
      toast?.(e?.data?.error?.message || "Could not link bill", "warning");
    }
    setSaving(false);
  };

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 2147483646, background: "rgba(15,10,8,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "min(520px,100%)", background: "#fff", borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)", fontFamily: FONT.ui, overflow: "hidden",
      }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: T.t1 }}>🔗 Link purchase bill — {po.poNumber}</span>
          <button onClick={onClose} style={{ marginLeft: "auto", border: "none", background: "none", fontSize: 18, cursor: "pointer", color: T.t3 }}>✕</button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <p style={{ fontSize: 12.5, color: T.t2, margin: "0 0 12px" }}>
            Select the vendor invoice that corresponds to this PO. This links the two for reconciliation.
          </p>
          {loading ? (
            <div style={{ color: T.t3, fontSize: 13 }}>Loading bills…</div>
          ) : bills.length === 0 ? (
            <div style={{ color: T.t3, fontSize: 13 }}>No imported bills found. Import a bill from Purchase Bills first.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: `1px solid ${selectedId === null ? T.amber : T.border}`, cursor: "pointer", background: selectedId === null ? "#FFFBEB" : "#fff" }}>
                <input type="radio" name="bill" checked={selectedId === null} onChange={() => setSelectedId(null)} />
                <span style={{ fontSize: 13, color: T.t2 }}>No bill (unlink)</span>
              </label>
              {bills.map((b: any) => (
                <label key={b.billId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: `1px solid ${selectedId === b.billId ? T.amber : T.border}`, cursor: "pointer", background: selectedId === b.billId ? "#FFFBEB" : "#fff" }}>
                  <input type="radio" name="bill" checked={selectedId === b.billId} onChange={() => setSelectedId(b.billId)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{b.invoiceNumber || `Bill #${b.billId}`}</div>
                    <div style={{ fontSize: 11, color: T.t3 }}>
                      {b.supplierName || "—"} &nbsp;·&nbsp; {b.grandTotal ? `₹${Number(b.grandTotal).toLocaleString("en-IN")}` : "—"} &nbsp;·&nbsp; {b.invoiceDate || ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={actBtn}>Cancel</button>
          <button
            onClick={handleSave} disabled={saving || loading}
            style={{ ...actBtn, background: T.amber, color: "#fff", border: "none", fontWeight: 700 }}
          >{saving ? "Saving…" : "Link Bill"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
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
  const [freight, setFreight] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdPo, setCreatedPo] = useState<any>(null);
  const [poList, setPoList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [receiveFor, setReceiveFor] = useState<any>(null);
  const [linkBillFor, setLinkBillFor] = useState<any>(null);
  const [emailSending, setEmailSending] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<number, Array<{ price: number; qty: number; date: string; poNumber: string }>> | null>(null);

  const supplier = suppliers.find(s => (s.partyId ?? s.id) === supplierId) || null;

  useEffect(() => {
    if (!open) return;
    setView("create"); setError(""); setRemarks(""); setCreatedPo(null);
    setSupplierId(""); setLinkedIds(null); setShowAll(false); setItemSearch("");
    setFreight(0); setOtherCharges(0); setPriceHistory(null);
    getParties("SUPPLIER")
      .then((r: any) => setSuppliers(r?.parties || []))
      .catch(() => setSuppliers([]));
    const init: Record<number, PoLine> = {};
    const wanted = preselectedIds.length > 0
      ? (products || []).filter(p => preselectedIds.includes(p.id))
      : (products || []).filter(p => p.stock < p.minStock);
    wanted.forEach(p => { init[p.id] = { selected: true, qty: suggestedQty(p), price: p.buyPrice || 0 }; });
    setLines(init);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!supplierId) { setLinkedIds(null); setPriceHistory(null); return; }
    let alive = true;
    Promise.all([
      getSupplierProducts(Number(supplierId)),
      getSupplierPriceHistory(Number(supplierId)),
    ]).then(([prodRes, histRes]: any[]) => {
      if (!alive) return;
      setLinkedIds(prodRes?.inventoryIds || []);
      setPriceHistory(histRes?.data || {});
    }).catch(() => {
      if (!alive) return;
      setLinkedIds([]);
      setPriceHistory({});
    });
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

  const candidates = useMemo(() => {
    let list = products;
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      list = list.filter(p => [p.name, p.sku, p.category].some(s => (s || "").toLowerCase().includes(q)));
    }
    const linked = new Set(linkedIds || []);
    const hasLinks = supplierId && linkedIds !== null && linkedIds.length > 0;
    if (hasLinks && !showAll) {
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
    () => (products || []).filter(p => lines[p.id]?.selected),
    [products, lines]
  );
  const totals = useMemo(() => {
    let itemsAmount = 0;
    selected.forEach(p => {
      const l = lines[p.id];
      itemsAmount += l.qty * l.price * (1 + (p.gstRate ?? 18) / 100);
    });
    return { count: selected.length, itemsAmount, total: itemsAmount + freight + otherCharges };
  }, [selected, lines, freight, otherCharges]);

  const toggleLine = (p: ProductRow) => {
    setLines(prev => {
      const cur = prev[p.id];
      if (cur?.selected) return { ...prev, [p.id]: { ...cur, selected: false } };
      return { ...prev, [p.id]: { selected: true, qty: cur?.qty || suggestedQty(p), price: cur?.price ?? (p.buyPrice || 0) } };
    });
  };
  const setQty   = (id: number, qty: number)   => setLines(prev => ({ ...prev, [id]: { ...prev[id], qty:   Math.max(1, qty   || 1) } }));
  const setPrice = (id: number, price: number) => setLines(prev => ({ ...prev, [id]: { ...prev[id], price: Math.max(0, price || 0) } }));

  const handleSaveDraft = async () => {
    setError("");
    if (!supplier)            { setError("Select a supplier before generating the PO."); return; }
    if (selected.length === 0) { setError("Select at least one product."); return; }
    setSaving(true);
    try {
      const res: any = await createPurchaseOrder({
        partyId:       supplier.partyId ?? supplier.id,
        supplierName:  supplier.name,
        supplierGstin: supplier.gstin || undefined,
        notes:         remarks || undefined,
        freight,
        otherCharges,
        items: selected.map(p => ({
          inventoryId: p.inventoryId ?? p.id,
          orderedQty:  lines[p.id].qty,
          unitPrice:   lines[p.id].price,
          gstRate:     p.gstRate ?? 18,
        })),
      });
      const po = res?.data;
      if (po && !po.party) po.party = { name: supplier.name, phone: supplier.phone };
      setCreatedPo(po);
      setView("done");
      toast?.(`Draft ${po?.poNumber} saved — ${selected.length} items · ${fmt(totals.total)}`, "success", "📦 PO Created");
    } catch (e: any) {
      setError(e?.data?.error?.message || e?.message || "Failed to save the purchase order.");
    }
    setSaving(false);
  };

  const advanceStatus = async (po: any) => {
    const meta = STATUS_META[po.status];
    if (!meta?.next) return;
    if (meta.canPartial) { setReceiveFor(po); return; }
    try {
      await updatePurchaseOrderStatus(po.poId, meta.next.status);
      toast?.(`${po.poNumber} → ${STATUS_META[meta.next.status]?.label}`, "success");
      loadList();
    } catch (e: any) {
      toast?.(e?.data?.error?.message || "Could not update status", "warning");
    }
  };

  const handleClone = async (po: any) => {
    try {
      const res: any = await clonePurchaseOrder(po.poId);
      toast?.(`Duplicated as ${res?.data?.poNumber}`, "success");
      loadList();
    } catch (e: any) {
      toast?.(e?.data?.error?.message || "Could not duplicate", "warning");
    }
  };

  const handleSendEmail = async (po: any) => {
    setEmailSending(po.poId);
    try {
      await sendPurchaseOrderByEmail(po.poId);
      toast?.(`${po.poNumber} emailed to ${po.party?.email || "supplier"} — status moved to Sent`, "success");
      loadList();
    } catch (e: any) {
      toast?.(e?.data?.error?.message || "Could not send email", "warning");
    }
    setEmailSending(null);
  };

  if (!open) return null;

  const lowStock  = (p: ProductRow) => p.stock < p.minStock;
  const linkedSet = new Set(linkedIds || []);

  const surchargeInput = (label: string, val: number, set: (n: number) => void) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 12, color: T.t3, whiteSpace: "nowrap" }}>{label}</span>
      <input
        type="number" min={0} step="0.01" value={val || ""}
        placeholder="0"
        onChange={e => set(parseFloat(e.target.value) || 0)}
        style={{ ...inputStyle, width: 88 }}
      />
    </div>
  );

  return createPortal(
    <>
      {receiveFor && (
        <ReceiveItemsDialog
          po={receiveFor}
          toast={toast}
          onClose={() => setReceiveFor(null)}
          onDone={() => { setReceiveFor(null); loadList(); }}
        />
      )}
      {linkBillFor && (
        <LinkBillDialog
          po={linkBillFor}
          toast={toast}
          onClose={() => setLinkBillFor(null)}
          onDone={() => { setLinkBillFor(null); loadList(); }}
        />
      )}
      <div style={{
        position: "fixed", inset: 0, zIndex: 2147483000, background: "rgba(15,10,8,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{
          width: "min(980px, 100%)", maxHeight: "92vh", display: "flex", flexDirection: "column",
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
                    onChange={e => { setSupplierId(e.target.value ? Number(e.target.value) : ""); setError(""); }}
                    style={{ width: "100%", height: 38, border: `1.5px solid ${!supplierId && error ? "#DC2626" : supplierId ? T.border : "#F59E0B"}`, borderRadius: 10, padding: "0 10px", fontSize: 13, fontFamily: FONT.ui, background: "#fff", color: T.t1, outline: "none" }}
                  >
                    <option value="">Select supplier…</option>
                    {suppliers.map(s => (
                      <option key={s.partyId ?? s.id} value={s.partyId ?? s.id}>{s.name}</option>
                    ))}
                  </select>
                  {suppliers.length === 0 && (
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>No suppliers yet — add one in Parties first.</div>
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
                      const invId = p.inventoryId ?? p.id;
                      const hist = priceHistory?.[invId] ?? [];
                      const lastPrice = hist[0]?.price;
                      const prevPrice = hist[1]?.price;
                      const trend = lastPrice !== undefined && prevPrice !== undefined
                        ? lastPrice > prevPrice ? "↑" : lastPrice < prevPrice ? "↓" : "="
                        : null;
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
                              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                <input type="number" min={0} step="0.01" value={l.price} onChange={e => setPrice(p.id, parseFloat(e.target.value))} style={inputStyle} />
                                {hist.length > 0 && (
                                  <span style={{ fontSize: 10, color: T.t3, lineHeight: 1.2 }}>
                                    {hist.slice(0, 3).map((h, i) => (
                                      <span key={i} title={`${h.poNumber} — qty ${h.qty}`}>
                                        {i > 0 && <span style={{ margin: "0 3px", opacity: 0.4 }}>·</span>}
                                        ₹{h.price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: T.t3, fontSize: 12 }}>
                                {lastPrice !== undefined
                                  ? <>₹{lastPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}{trend && <span style={{ marginLeft: 3, color: trend === "↑" ? "#B45309" : trend === "↓" ? "#059669" : T.t3 }}>{trend}</span>}</>
                                  : fmt(p.buyPrice || 0)
                                }
                              </span>
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

              {/* Footer with surcharges */}
              <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 20px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Remarks for supplier (optional)…"
                  style={{ flex: 1, minWidth: 160, height: 36, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }}
                />
                {surchargeInput("Freight ₹", freight, setFreight)}
                {surchargeInput("Other charges ₹", otherCharges, setOtherCharges)}
                <div style={{ fontSize: 13, color: T.t2, whiteSpace: "nowrap" }}>
                  <b style={{ color: T.t1 }}>{totals.count}</b> items · <b style={{ color: T.t1 }}>{fmt(totals.total)}</b>
                  {(freight > 0 || otherCharges > 0) && (
                    <span style={{ fontSize: 11, color: T.t3, marginLeft: 4 }}>(incl. surcharges)</span>
                  )}
                </div>
                {error && <div style={{ width: "100%", fontSize: 12.5, color: "#B91C1C", fontWeight: 600 }}>↑ {error}</div>}
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  style={{
                    height: 40, padding: "0 20px", borderRadius: 10, border: "none",
                    background: saving ? "#D6CDC8" : T.amber,
                    color: "#fff", fontSize: 13.5, fontWeight: 700, fontFamily: FONT.ui,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >{saving ? "Saving…" : "💾 Save Draft PO"}</button>
              </div>
            </>
          )}

          {/* ── DONE VIEW ── */}
          {view === "done" && createdPo && (
            <div style={{ padding: "28px 24px 32px", display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 14, padding: "20px 28px", width: "100%", maxWidth: 420, textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#059669", marginBottom: 4 }}>Draft saved!</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: T.t1, fontFamily: FONT.mono, letterSpacing: "0.04em", marginBottom: 6 }}>{createdPo.poNumber}</div>
                <div style={{ fontSize: 13, color: T.t2 }}>{createdPo.party?.name || createdPo.supplierName}</div>
                <div style={{ fontSize: 13, color: T.t3, marginTop: 2 }}>
                  {(createdPo.items || []).length} items &nbsp;·&nbsp; {fmt(Number(createdPo.totalAmount))}
                </div>
                {(Number(createdPo.freight) > 0 || Number(createdPo.otherCharges) > 0) && (
                  <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
                    {Number(createdPo.freight) > 0 && `Freight: ${fmt(Number(createdPo.freight))}  `}
                    {Number(createdPo.otherCharges) > 0 && `Other: ${fmt(Number(createdPo.otherCharges))}`}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
                <button style={{ ...actBtn, height: 38 }} onClick={() => downloadPoExcel(createdPo, shopName)}>📊 Excel</button>
                <button style={{ ...actBtn, height: 38 }} onClick={() => downloadPoPdf(createdPo, toast)}>📄 PDF</button>
                <button style={{ ...actBtn, height: 38, background: "#25D366", color: "#fff", border: "none", fontWeight: 700 }} onClick={() => sharePoWhatsApp(createdPo, shopName)}>💬 WhatsApp</button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <button style={{ ...actBtn, height: 38 }} onClick={() => { setView("create"); setCreatedPo(null); setSupplierId(""); setLines({}); setLinkedIds(null); setRemarks(""); setFreight(0); setOtherCharges(0); }}>+ New PO</button>
                <button style={{ ...actBtn, height: 38 }} onClick={() => setView("list")}>View All POs</button>
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
                  const meta = STATUS_META[po.status];
                  return (
                    <div key={po.poId} style={{ padding: "12px 4px", borderBottom: `1px solid ${T.border}55` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 150 }}>
                          <div style={{ fontWeight: 800, fontSize: 13.5, color: T.t1 }}>{po.poNumber}</div>
                          <div style={{ fontSize: 11.5, color: T.t3 }}>{new Date(po.createdAt).toLocaleDateString("en-IN")}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 130 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{po.party?.name || po.supplierName || "—"}</div>
                          <div style={{ fontSize: 11.5, color: T.t3 }}>{(po.items || []).length} items · {fmt(Number(po.totalAmount))}</div>
                        </div>
                        <StatusBadge status={po.status} />
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                          {meta?.next && (
                            <button
                              style={{ ...actBtn, background: meta.canPartial ? "#059669" : T.amber, color: "#fff", border: "none", fontWeight: 700 }}
                              onClick={() => advanceStatus(po)}
                            >
                              {meta.canPartial ? "📥 Receive" : meta.next.label}
                            </button>
                          )}
                          <button style={actBtn} title="Excel" onClick={() => downloadPoExcel(po, shopName)}>📊</button>
                          <button style={actBtn} title="PDF"   onClick={() => downloadPoPdf(po, toast)}>📄</button>
                          <button style={{ ...actBtn, background: "#25D366", color: "#fff", border: "none" }} title="WhatsApp" onClick={() => sharePoWhatsApp(po, shopName)}>💬</button>
                          {po.status === "APPROVED" && (
                            <button
                              title={po.party?.email ? `Email PO to ${po.party.email}` : "No supplier email on file — add one in Parties"}
                              disabled={emailSending === po.poId || !po.party?.email}
                              onClick={() => handleSendEmail(po)}
                              style={{
                                ...actBtn,
                                background: po.party?.email ? "#1D4ED8" : "#D6CDC8",
                                color: "#fff", border: "none", fontWeight: 700,
                                cursor: po.party?.email ? "pointer" : "not-allowed",
                              }}
                            >
                              {emailSending === po.poId ? "Sending…" : "📧 Send"}
                            </button>
                          )}
                          <button style={actBtn} title="Duplicate as new Draft" onClick={() => handleClone(po)}>⧉</button>
                          {(po.status === "RECEIVED" || po.status === "PARTIAL") && (
                            <button
                              style={{ ...actBtn, color: po.linkedBill ? "#065F46" : T.t2, borderColor: po.linkedBill ? "#6EE7B7" : T.border }}
                              title={po.linkedBill ? `Linked: ${po.linkedBill.invoiceNumber || "bill"}` : "Link purchase bill"}
                              onClick={() => setLinkBillFor(po)}
                            >
                              {po.linkedBill ? "🔗 Linked" : "🔗 Link bill"}
                            </button>
                          )}
                          {po.status === "DRAFT" && (
                            <button style={{ ...actBtn, color: "#B91C1C" }} title="Cancel PO" onClick={async () => {
                              try { await updatePurchaseOrderStatus(po.poId, "CANCELLED"); toast?.(`${po.poNumber} cancelled`, "info"); loadList(); }
                              catch (e: any) { toast?.(e?.data?.error?.message || "Could not cancel", "warning"); }
                            }}>✕</button>
                          )}
                        </div>
                      </div>
                      {po.linkedBill && (
                        <div style={{ marginTop: 6, fontSize: 11.5, color: "#065F46", background: "#D1FAE5", borderRadius: 6, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 8 }}>
                          🔗 Reconciled with {po.linkedBill.invoiceNumber || `bill #${po.linkedBill.billId}`}
                          {po.linkedBill.grandTotal && ` · ₹${Number(po.linkedBill.grandTotal).toLocaleString("en-IN")}`}
                        </div>
                      )}
                      {(Number(po.freight) > 0 || Number(po.otherCharges) > 0) && (
                        <div style={{ marginTop: 4, fontSize: 11, color: T.t3 }}>
                          {Number(po.freight) > 0 && `Freight: ${fmt(Number(po.freight))}  `}
                          {Number(po.otherCharges) > 0 && `Other charges: ${fmt(Number(po.otherCharges))}`}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
