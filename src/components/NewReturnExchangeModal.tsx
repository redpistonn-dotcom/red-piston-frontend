import { useState, useEffect, useMemo } from "react";
import { T, FONT } from "../theme";
import { Modal, Btn, Field, Input, Select, QtyStepper } from "./ui";
import { useStore } from "../store";
import { getInvoices } from "../api/billing";
import { getEligibleReturnItems, createSalesReturn, createWalkInSalesReturn, type ReturnableItem } from "../api/returns";
import { createExchange, openExchangeInvoicePdf } from "../api/exchanges";
import { useDebounce } from "../utils";

// Same reason list drives both a plain return and an exchange — the customer's
// complaint doesn't change based on what the shop does about it afterward.
const REASONS = [
  { value: "WRONG_PART", label: "Wrong part / doesn't fit" },
  { value: "DEFECTIVE", label: "Defective" },
  { value: "WARRANTY", label: "Warranty" },
  { value: "CHANGED_MIND", label: "Customer changed mind" },
  { value: "OTHER", label: "Other" },
];
const CONDITIONS = [
  { value: "SEALED", label: "Sealed" }, { value: "GOOD", label: "Good" },
  { value: "DAMAGED", label: "Damaged" }, { value: "USED", label: "Used" },
];
const REFUND_MODES = [
  { value: "CASH", label: "Cash" }, { value: "UPI", label: "UPI" },
  { value: "BANK", label: "Bank transfer" }, { value: "STORE_CREDIT", label: "Store credit" },
];

type Step = "pick-invoice" | "walk-in-items" | "pick-items" | "resolve";
type Resolution = "REFUND" | "EXCHANGE";

interface InvoiceHit { invoiceId: number; invoiceNumber: string; partyName?: string; totalAmount: string; createdAt: string; partyId?: number | null; }
interface PartyHit { id: number; name: string; phone?: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  toast: (msg: string, type?: string) => void;
  /** Pre-select an invoice (e.g. opened from the invoice detail view) — skips the search step. */
  initialInvoice?: InvoiceHit;
}

export function NewReturnExchangeModal({ open, onClose, onCreated, toast, initialInvoice }: Props) {
  const { products: storeProducts, parties: storeParties, activeShopId } = useStore();
  const [step, setStep] = useState<Step>("pick-invoice");

  // ── Step 1: invoice search ──
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [hits, setHits] = useState<InvoiceHit[]>([]);
  const [recentHits, setRecentHits] = useState<InvoiceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceHit | null>(null);

  // ── Walk-in fallback: no invoice could be found ──
  // isWalkIn stays true for the rest of the flow once entered this way — `invoice`
  // is never set on this path, so submit() branches on `!invoice`.
  const [walkInSearch, setWalkInSearch] = useState("");
  const [partySearch, setPartySearch] = useState("");
  const [selectedParty, setSelectedParty] = useState<PartyHit | null>(null);

  // ── Step 2: items + reason (shared shape for both invoice and walk-in paths —
  // walk-in items are added directly into `items`/`selected` using inventoryId
  // as the synthetic invoiceItemId key, so pick-items/resolve/submit all work
  // unchanged for either source) ──
  const [items, setItems] = useState<ReturnableItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [withinPolicy, setWithinPolicy] = useState(true);
  const [daysSinceSale, setDaysSinceSale] = useState(0);
  const [selected, setSelected] = useState<Record<number, { qty: number; condition: string }>>({});
  const [reason, setReason] = useState("WRONG_PART");
  const [notes, setNotes] = useState("");

  // ── Step 3: resolution fork ──
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [refundMode, setRefundMode] = useState("CASH");
  const [newSearch, setNewSearch] = useState("");
  const [newItems, setNewItems] = useState<Record<number, { qty: number; name: string; unitPrice: number; gstRate: number }>>({});
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectionError, setSelectionError] = useState(false);
  const [completedExchangeId, setCompletedExchangeId] = useState<number | null>(null);
  const [openingInvoice, setOpeningInvoice] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("pick-invoice"); setSearch(""); setHits([]); setInvoice(null);
      setWalkInSearch(""); setPartySearch(""); setSelectedParty(null);
      setItems([]); setSelected({}); setReason("WRONG_PART"); setNotes("");
      setResolution(null); setRefundMode("CASH"); setNewSearch(""); setNewItems({});
      setCashAmount(""); setUpiAmount(""); setError(""); setSelectionError(false);
      setCompletedExchangeId(null); setOpeningInvoice(false);
      return;
    }
    if (initialInvoice) { pickInvoice(initialInvoice); return; }
    // No pre-selected invoice — show a browsable list of recent sales, since a
    // walk-in customer has no name/phone on file to search by.
    getInvoices({ limit: "20" })
      .then((data: any) => setRecentHits(Array.isArray(data?.invoices) ? data.invoices : []))
      .catch(() => setRecentHits([]));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!debouncedSearch.trim() || step !== "pick-invoice") { setHits([]); return; }
    let cancelled = false;
    setSearching(true);
    getInvoices({ search: debouncedSearch.trim(), limit: "20" })
      .then((data: any) => { if (!cancelled) setHits(Array.isArray(data?.invoices) ? data.invoices : []); })
      .catch(() => { if (!cancelled) setHits([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, step]);

  // Shared product list — used by both the walk-in item picker below and the
  // exchange "giving instead" picker further down.
  const shopProducts = useMemo(() => (storeProducts ?? []).filter((p: any) => p.shopId === activeShopId), [storeProducts, activeShopId]);

  // ── Walk-in item picker — same shopProducts list the exchange "giving instead" search uses ──
  const walkInProductHits = useMemo(() => {
    if (!walkInSearch.trim()) return [];
    const q = walkInSearch.toLowerCase();
    return shopProducts.filter((p: any) => (p.name || "").toLowerCase().includes(q) || (p.oemNumber || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)).slice(0, 10);
  }, [shopProducts, walkInSearch]);

  const addWalkInItem = (p: any) => {
    const id = Number(p.inventoryId ?? p.id);
    setItems(prev => [...prev.filter(i => i.invoiceItemId !== id), {
      invoiceItemId: id, inventoryId: id, partName: p.name,
      unitPrice: Number(p.sellPrice) || 0, discount: 0, gstRate: Number(p.gstRate) || 18,
      qtySold: 0, qtyReturned: 0, qtyReturnable: 9999,
    }]);
    setSelected(prev => ({ ...prev, [id]: { qty: 1, condition: "GOOD" } }));
    setWalkInSearch("");
  };
  const removeWalkInItem = (id: number) => {
    setItems(prev => prev.filter(i => i.invoiceItemId !== id));
    setSelected(prev => { const next = { ...prev }; delete next[id]; return next; });
  };
  const updateWalkInPrice = (id: number, unitPrice: number) =>
    setItems(prev => prev.map(i => i.invoiceItemId === id ? { ...i, unitPrice } : i));

  // ── Party picker — filters the already-loaded store parties, no extra request ──
  const partyHits = useMemo(() => {
    if (!partySearch.trim()) return [];
    const q = partySearch.toLowerCase();
    return (storeParties ?? [])
      .filter((p: any) => p.shopId === activeShopId && ((p.name || "").toLowerCase().includes(q) || (p.phone || "").includes(q)))
      .slice(0, 8)
      .map((p: any) => ({ id: Number(p.partyId ?? p.id), name: p.name, phone: p.phone }));
  }, [storeParties, activeShopId, partySearch]);

  function pickInvoice(inv: InvoiceHit) {
    setInvoice(inv);
    setLoadingItems(true);
    getEligibleReturnItems(inv.invoiceId)
      .then(data => {
        setItems(data.items.filter(i => i.qtyReturnable > 0));
        setWithinPolicy(data.withinPolicy);
        setDaysSinceSale(data.daysSinceSale);
        setStep("pick-items");
      })
      .catch((e: any) => toast(e?.message || "Could not load invoice items", "error"))
      .finally(() => setLoadingItems(false));
  }

  const toggleItem = (item: ReturnableItem) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[item.invoiceItemId]) delete next[item.invoiceItemId];
      else next[item.invoiceItemId] = { qty: item.qtyReturnable, condition: "GOOD" };
      return next;
    });
  };
  const updateSelection = (id: number, patch: Partial<{ qty: number; condition: string }>) =>
    setSelected(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const selectedCount = Object.keys(selected).length;

  // ── New-item picker (exchange path only) — shopProducts defined earlier, shared with walk-in picker ──
  const productHits = useMemo(() => {
    if (!newSearch.trim()) return [];
    const q = newSearch.toLowerCase();
    return shopProducts.filter((p: any) => (p.name || "").toLowerCase().includes(q) || (p.oemNumber || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)).slice(0, 10);
  }, [shopProducts, newSearch]);
  const addNewItem = (p: any) => {
    setNewItems(prev => ({ ...prev, [p.inventoryId ?? p.id]: { qty: 1, name: p.name, unitPrice: Number(p.sellPrice) || 0, gstRate: Number(p.gstRate) || 18 } }));
    setNewSearch("");
  };
  const removeNewItem = (id: number) => setNewItems(prev => { const next = { ...prev }; delete next[id]; return next; });
  const updateNewQty = (id: number, qty: number) => setNewItems(prev => ({ ...prev, [id]: { ...prev[id], qty: Math.max(1, qty) } }));
  const newItemCount = Object.keys(newItems).length;

  // Each item keeps its own real GST rate — auto parts commonly span 5/12/18/28%,
  // so a flat 18% assumption (the old behavior) showed a total that didn't match
  // what the backend actually charges on submit.
  const oldTaxable = Object.entries(selected).reduce((sum, [id, v]) => {
    const item = items.find(i => i.invoiceItemId === Number(id));
    return item ? sum + (item.unitPrice - item.discount) * v.qty : sum;
  }, 0);
  const oldGst = Object.entries(selected).reduce((sum, [id, v]) => {
    const item = items.find(i => i.invoiceItemId === Number(id));
    if (!item) return sum;
    const taxable = (item.unitPrice - item.discount) * v.qty;
    return sum + taxable * (item.gstRate / 100);
  }, 0);
  const oldTotalEst = oldTaxable + oldGst;

  const newTaxable = Object.values(newItems).reduce((sum, v) => sum + v.unitPrice * v.qty, 0);
  const newGst = Object.values(newItems).reduce((sum, v) => sum + v.unitPrice * v.qty * (v.gstRate / 100), 0);
  const newTotalEst = newTaxable + newGst;

  const netAmount = newTotalEst - oldTotalEst;
  const amountCollected = (parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0);
  const collectionShort = netAmount > 0.5 && amountCollected < netAmount - 0.5;

  // Walk-in mode = no invoice was ever picked (the "Process without one" fallback).
  const isWalkIn = !invoice;
  const effectivePartyId = invoice?.partyId ?? selectedParty?.id;

  const canSubmit = resolution === "REFUND"
    ? selectedCount > 0 && (refundMode !== "STORE_CREDIT" || !!effectivePartyId)
    : resolution === "EXCHANGE"
    ? selectedCount > 0 && newItemCount > 0 && !collectionShort
    : false;

  const submit = async () => {
    if (!resolution || (!invoice && !isWalkIn)) return;
    setSubmitting(true);
    setError("");
    try {
      if (resolution === "REFUND") {
        if (isWalkIn) {
          await createWalkInSalesReturn({
            items: Object.entries(selected).map(([id, v]) => {
              const item = items.find(i => i.invoiceItemId === Number(id))!;
              return { inventoryId: item.inventoryId, qty: v.qty, condition: v.condition as any, unitPrice: item.unitPrice };
            }),
            reason: reason as any,
            refundMode: refundMode as any,
            notes: notes || undefined,
            partyId: selectedParty?.id,
          });
        } else {
          await createSalesReturn({
            originalInvoiceId: invoice!.invoiceId,
            items: Object.entries(selected).map(([id, v]) => ({ invoiceItemId: Number(id), qty: v.qty, condition: v.condition as any })),
            reason: reason as any,
            refundMode: refundMode as any,
            notes: notes || undefined,
          });
        }
        toast("Return created — credit note generated", "success");
      } else {
        const result: any = await createExchange({
          ...(isWalkIn
            ? {
                walkInItems: Object.entries(selected).map(([id, v]) => {
                  const item = items.find(i => i.invoiceItemId === Number(id))!;
                  return { inventoryId: item.inventoryId, qty: v.qty, condition: v.condition as any, unitPrice: item.unitPrice };
                }),
                walkInPartyId: selectedParty?.id,
              }
            : {
                originalInvoiceId: invoice!.invoiceId,
                returnItems: Object.entries(selected).map(([id, v]) => ({ invoiceItemId: Number(id), qty: v.qty, condition: v.condition as any })),
              }),
          returnReason: reason as any,
          returnNotes: notes || undefined,
          newItems: Object.entries(newItems).map(([id, v]) => ({ inventoryId: Number(id), qty: v.qty })),
          cashAmount: cashAmount ? parseFloat(cashAmount) : undefined,
          upiAmount: upiAmount ? parseFloat(upiAmount) : undefined,
        });
        toast("Exchange completed", "success");
        onCreated?.();
        // Stay open one more beat so the owner can pull up the Exchange
        // Invoice right away, instead of having to find it later in the list.
        setCompletedExchangeId(result?.exchangeOrder?.exchangeId ?? null);
        return;
      }
      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Could not complete this");
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle = invoice
    ? `Invoice ${invoice.invoiceNumber}`
    : step === "pick-invoice"
    ? "Find the original invoice to start"
    : "Walk-in — no invoice on file";

  return (
    <Modal open={open} onClose={onClose} title="Return / Exchange" subtitle={subtitle} width={680}>
      {/* ── Exchange completed — offer the Exchange Invoice right away ── */}
      {completedExchangeId != null ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "20px 0" }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.t1 }}>Exchange completed</div>
          <div style={{ fontSize: 13, color: T.t3, textAlign: "center" }}>
            The old item was credited and the new item was sold. You can pull up the Exchange Invoice — it shows both items and the price difference — any time from the Returns &amp; Exchange list.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <Btn variant="ghost" onClick={onClose}>Done</Btn>
            <Btn
              variant="amber"
              loading={openingInvoice}
              onClick={async () => {
                setOpeningInvoice(true);
                try { await openExchangeInvoicePdf(completedExchangeId); }
                catch (e: any) { toast(e?.message || "Could not open the exchange invoice", "error"); }
                setOpeningInvoice(false);
              }}
            >
              🖨 View Exchange Invoice
            </Btn>
          </div>
        </div>
      ) : (
      <>
      {/* ── Step 1: find invoice ── */}
      {step === "pick-invoice" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Search invoice" hint="Search by invoice number, customer name, or phone">
            <Input value={search} onChange={setSearch} placeholder="e.g. S3-202607-0012 or customer name" autoFocus icon="🔍" />
          </Field>
          {searching && <div style={{ fontSize: 13, color: T.t3 }}>Searching…</div>}
          {!searching && debouncedSearch.trim() && hits.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.t3, fontSize: 13 }}>No invoices found for "{debouncedSearch}"</div>
          )}
          {hits.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
              {hits.map(inv => (
                <button key={inv.invoiceId} onClick={() => pickInvoice(inv)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, cursor: "pointer", textAlign: "left", minHeight: 44 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{inv.invoiceNumber}</div>
                    <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{inv.partyName || "Walk-in"} · {new Date(inv.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>₹{Number(inv.totalAmount).toFixed(0)}</div>
                </button>
              ))}
            </div>
          )}

          {/* No active search — show a browsable recent-sales list. A walk-in
              customer has no name/phone on file, so text search alone can leave
              staff with nothing to type. */}
          {!debouncedSearch.trim() && recentHits.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Recent sales</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                {recentHits.map(inv => (
                  <button key={inv.invoiceId} onClick={() => pickInvoice(inv)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, cursor: "pointer", textAlign: "left", minHeight: 44 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{inv.invoiceNumber}</div>
                      <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{inv.partyName || "Walk-in"} · {new Date(inv.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>₹{Number(inv.totalAmount).toFixed(0)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setStep("walk-in-items")} style={{ background: "none", border: "none", color: T.amber, fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left", padding: "6px 0", minHeight: 32 }}>
            Can't find the invoice? Process without one →
          </button>
        </div>
      )}

      {/* ── Step 1b: walk-in fallback — no invoice could be located ── */}
      {step === "walk-in-items" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#FFFBF0", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#92400E", display: "flex", gap: 8 }}>
            <span>⚠</span>
            <span>No invoice on file — this will be recorded as a walk-in return and automatically flagged for manager review.</span>
          </div>

          <Field label="Item(s) being returned" required hint="Search the shop's own inventory for what the customer is bringing back">
            <Input value={walkInSearch} onChange={setWalkInSearch} placeholder="Search parts by name or OEM number…" icon="🔍" />
          </Field>
          {walkInProductHits.length > 0 && (
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
              {walkInProductHits.map((p: any) => (
                <button key={p.inventoryId ?? p.id} onClick={() => addWalkInItem(p)} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "10px 12px", border: "none", borderBottom: `1px solid ${T.border}`, background: T.surface, cursor: "pointer", textAlign: "left", minHeight: 44 }}>
                  <span style={{ fontSize: 13, color: T.t1 }}>{p.name}</span>
                  <span style={{ fontSize: 13, fontFamily: FONT.mono, color: T.t2 }}>₹{p.sellPrice}</span>
                </button>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(item => {
                const sel = selected[item.invoiceItemId];
                if (!sel) return null;
                return (
                  <div key={item.invoiceItemId} style={{ border: `1px solid ${T.amber}`, borderRadius: 10, padding: 12, background: T.amberGlow }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{item.partName}</div>
                      <button onClick={() => removeWalkInItem(item.invoiceItemId)} style={{ background: "none", border: "none", color: T.crimson, cursor: "pointer", fontSize: 16, minWidth: 32, minHeight: 32 }}>×</button>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <Field label="Qty" horizontal>
                        <QtyStepper value={sel.qty} min={1} onChange={qty => updateSelection(item.invoiceItemId, { qty })} />
                      </Field>
                      <Field label="Condition" horizontal>
                        <Select value={sel.condition} onChange={v => updateSelection(item.invoiceItemId, { condition: v })} options={CONDITIONS} style={{ width: 120, padding: "6px 10px" }} />
                      </Field>
                      <Field label="Price paid (₹/unit)" horizontal hint="Staff-entered — no invoice line to read it from">
                        <input type="number" min={0} value={item.unitPrice}
                          onChange={e => updateWalkInPrice(item.invoiceItemId, Math.max(0, parseFloat(e.target.value) || 0))}
                          style={{ width: 80, padding: "6px 8px", borderRadius: 8, border: `1px solid ${T.border}`, fontFamily: FONT.mono, fontSize: 13 }} />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Field label="Customer (optional)" hint="Search if they're a registered customer — needed to offer store credit">
            <Input value={partySearch} onChange={setPartySearch} placeholder="Search by name or phone…" />
          </Field>
          {partyHits.length > 0 && (
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
              {partyHits.map(p => (
                <button key={p.id} onClick={() => { setSelectedParty(p); setPartySearch(""); }} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "10px 12px", border: "none", borderBottom: `1px solid ${T.border}`, background: T.surface, cursor: "pointer", textAlign: "left", minHeight: 44 }}>
                  <span style={{ fontSize: 13, color: T.t1 }}>{p.name}</span>
                  {p.phone && <span style={{ fontSize: 12, fontFamily: FONT.mono, color: T.t3 }}>{p.phone}</span>}
                </button>
              ))}
            </div>
          )}
          {selectedParty && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.amber}`, background: T.amberGlow, width: "fit-content" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{selectedParty.name}</span>
              <button onClick={() => setSelectedParty(null)} style={{ background: "none", border: "none", color: T.crimson, cursor: "pointer", fontSize: 14, minWidth: 24, minHeight: 24 }}>×</button>
            </div>
          )}

          <Field label="Reason" required>
            <Select value={reason} onChange={setReason} options={REASONS} />
          </Field>
          <Field label="Notes" hint="Optional context — helpful since there's no invoice to refer back to">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${T.border}`, fontFamily: FONT.ui, fontSize: 13, resize: "vertical" }} />
          </Field>

          {selectionError && selectedCount === 0 && (
            <div style={{ fontSize: 12, color: T.crimson, fontWeight: 600, textAlign: "right" }}>↑ Add at least one item being returned</div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setStep("pick-invoice")}>Back</Btn>
            <Btn variant="amber" onClick={() => selectedCount === 0 ? setSelectionError(true) : (setSelectionError(false), setStep("resolve"))}>
              Continue{selectedCount > 0 ? ` (${selectedCount} item${selectedCount > 1 ? "s" : ""})` : ""}
            </Btn>
          </div>
        </div>
      )}

      {/* ── Step 2: pick items + reason (shared by both paths) ── */}
      {step === "pick-items" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!withinPolicy && (
            <div style={{ background: "#FFFBF0", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#92400E", display: "flex", gap: 8 }}>
              <span>⚠</span>
              <span>This sale was {daysSinceSale} days ago — outside the return window. It will still process but is flagged for manager review.</span>
            </div>
          )}

          {loadingItems ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.t3, fontSize: 13 }}>Loading items…</div>
          ) : items.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.t3, fontSize: 13 }}>Nothing left to return on this invoice.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(item => {
                const sel = selected[item.invoiceItemId];
                return (
                  <div key={item.invoiceItemId} style={{ border: `1px solid ${sel ? T.amber : T.border}`, borderRadius: 10, padding: 12, background: sel ? T.amberGlow : T.surface }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minHeight: 44 }}>
                      <input type="checkbox" checked={!!sel} onChange={() => toggleItem(item)} style={{ width: 18, height: 18, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{item.partName}</div>
                        <div style={{ fontSize: 11, color: T.t3 }}>Sold {item.qtySold} · {item.qtyReturnable} returnable · ₹{item.unitPrice}/unit</div>
                      </div>
                    </label>
                    {sel && (
                      <div style={{ display: "flex", gap: 10, marginTop: 10, paddingLeft: 28 }}>
                        <Field label="Qty" horizontal>
                          <QtyStepper value={sel.qty} min={1} max={item.qtyReturnable} onChange={qty => updateSelection(item.invoiceItemId, { qty })} />
                        </Field>
                        <Field label="Condition" horizontal>
                          <Select value={sel.condition} onChange={v => updateSelection(item.invoiceItemId, { condition: v })} options={CONDITIONS} style={{ width: 130, padding: "6px 10px" }} />
                        </Field>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Field label="Reason" required>
            <Select value={reason} onChange={setReason} options={REASONS} />
          </Field>
          <Field label="Notes" hint="Optional context">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${T.border}`, fontFamily: FONT.ui, fontSize: 13, resize: "vertical" }} />
          </Field>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setStep("pick-invoice")}>Back</Btn>
            <Btn variant="amber" onClick={() => setStep("resolve")} disabled={selectedCount === 0}>
              Continue{selectedCount > 0 ? ` (${selectedCount} item${selectedCount > 1 ? "s" : ""})` : ""}
            </Btn>
          </div>
        </div>
      )}

      {/* ── Step 3: resolution fork — the "Return or Replace" decision ── */}
      {step === "resolve" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {!resolution && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em" }}>What should happen to this?</div>
              <button onClick={() => setResolution("REFUND")} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.surface, cursor: "pointer", textAlign: "left", minHeight: 44 }}>
                <span style={{ fontSize: 24 }}>💳</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>Refund or Store Credit</div>
                  <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Customer gets money back now, or credit to use on a future purchase</div>
                </div>
              </button>
              <button onClick={() => setResolution("EXCHANGE")} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.surface, cursor: "pointer", textAlign: "left", minHeight: 44 }}>
                <span style={{ fontSize: 24 }}>🔄</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>Exchange for a Different Item</div>
                  <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Give a different part instead — only the price difference changes hands</div>
                </div>
              </button>
              <Btn variant="ghost" onClick={() => setStep(isWalkIn ? "walk-in-items" : "pick-items")} style={{ alignSelf: "flex-start", marginTop: 4 }}>Back</Btn>
            </div>
          )}

          {resolution === "REFUND" && (
            <>
              <button onClick={() => setResolution(null)} style={{ background: "none", border: "none", color: T.t3, fontSize: 12, cursor: "pointer", textAlign: "left", padding: 0 }}>← Change resolution</button>
              <Field label="Refund mode" required>
                <Select value={refundMode} onChange={setRefundMode} options={REFUND_MODES} />
              </Field>
              {refundMode === "STORE_CREDIT" && !effectivePartyId && (
                <div style={{ fontSize: 12, color: T.crimson, fontWeight: 600 }}>
                  ↑ Store credit needs a registered customer{isWalkIn ? " — search/select one on the previous step, or " : " — this sale was to a walk-in. "}Choose Cash/UPI/Bank instead.
                </div>
              )}
              {error && <div style={{ fontSize: 12, color: T.crimson, fontWeight: 600 }}>{error}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn variant="amber" onClick={submit} disabled={!canSubmit} loading={submitting}>Create Return</Btn>
              </div>
            </>
          )}

          {resolution === "EXCHANGE" && (
            <>
              <button onClick={() => setResolution(null)} style={{ background: "none", border: "none", color: T.t3, fontSize: 12, cursor: "pointer", textAlign: "left", padding: 0 }}>← Change resolution</button>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Giving instead</div>
                <Input value={newSearch} onChange={setNewSearch} placeholder="Search parts to give instead…" icon="🔍" />
                {productHits.length > 0 && (
                  <div style={{ marginTop: 6, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
                    {productHits.map((p: any) => (
                      <button key={p.inventoryId ?? p.id} onClick={() => addNewItem(p)} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "10px 12px", border: "none", borderBottom: `1px solid ${T.border}`, background: T.surface, cursor: "pointer", textAlign: "left", minHeight: 44 }}>
                        <span style={{ fontSize: 13, color: T.t1 }}>{p.name}</span>
                        <span style={{ fontSize: 13, fontFamily: FONT.mono, color: T.t2 }}>₹{p.sellPrice}</span>
                      </button>
                    ))}
                  </div>
                )}
                {newItemCount > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                    {Object.entries(newItems).map(([id, v]) => (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.amber}`, background: T.amberGlow }}>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.t1 }}>{v.name}</div>
                        <QtyStepper value={v.qty} min={1} onChange={qty => updateNewQty(Number(id), qty)} />
                        <div style={{ fontSize: 13, fontFamily: FONT.mono, color: T.t2, width: 70, textAlign: "right" }}>₹{(v.unitPrice * v.qty).toFixed(0)}</div>
                        <button onClick={() => removeNewItem(Number(id))} style={{ background: "none", border: "none", color: T.crimson, cursor: "pointer", fontSize: 16, minWidth: 32, minHeight: 32 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(selectedCount > 0 || newItemCount > 0) && (
                <div style={{ background: T.surfaceContainerLow, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Old item(s) returned</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: T.t3 }}>Taxable value</span><span style={{ fontFamily: FONT.mono }}>₹{oldTaxable.toFixed(0)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: T.t3 }}>GST</span><span style={{ fontFamily: FONT.mono }}>₹{oldGst.toFixed(0)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}><span style={{ color: T.t2 }}>Old item value</span><span style={{ fontFamily: FONT.mono }}>₹{oldTotalEst.toFixed(0)}</span></div>

                  <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 10, marginBottom: 2 }}>New item(s) given</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: T.t3 }}>Taxable value</span><span style={{ fontFamily: FONT.mono }}>₹{newTaxable.toFixed(0)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: T.t3 }}>GST</span><span style={{ fontFamily: FONT.mono }}>₹{newGst.toFixed(0)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}><span style={{ color: T.t2 }}>New item value</span><span style={{ fontFamily: FONT.mono }}>₹{newTotalEst.toFixed(0)}</span></div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 6 }}>
                    <span>{netAmount > 0.5 ? "Customer pays" : netAmount < -0.5 ? "Credit to customer" : "Even exchange"}</span>
                    <span style={{ fontFamily: FONT.mono, color: netAmount > 0.5 ? T.crimson : netAmount < -0.5 ? T.emerald : T.t1 }}>₹{Math.abs(netAmount).toFixed(0)}</span>
                  </div>
                </div>
              )}

              {netAmount > 0.5 && (
                <>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Field label="Cash collected"><Input type="number" value={cashAmount} onChange={setCashAmount} placeholder="0" /></Field>
                    <Field label="UPI collected"><Input type="number" value={upiAmount} onChange={setUpiAmount} placeholder="0" /></Field>
                  </div>
                  {collectionShort && (
                    <div style={{ fontSize: 12, color: T.crimson, fontWeight: 600 }}>
                      ↑ ₹{netAmount.toFixed(0)} is due but only ₹{amountCollected.toFixed(0)} is entered — collect the rest before completing.
                    </div>
                  )}
                </>
              )}

              {error && <div style={{ fontSize: 12, color: T.crimson, fontWeight: 600 }}>{error}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn variant="amber" onClick={submit} disabled={!canSubmit} loading={submitting}>Complete Exchange</Btn>
              </div>
            </>
          )}
        </div>
      )}
      </>
      )}
    </Modal>
  );
}
