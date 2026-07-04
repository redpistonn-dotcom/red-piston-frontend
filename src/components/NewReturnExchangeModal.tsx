import { useState, useEffect, useMemo } from "react";
import { T, FONT } from "../theme";
import { Modal, Btn, Field, Input, Select } from "./ui";
import { useStore } from "../store";
import { getInvoices } from "../api/billing";
import { getEligibleReturnItems, createSalesReturn, type ReturnableItem } from "../api/returns";
import { createExchange } from "../api/exchanges";
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

type Step = "pick-invoice" | "pick-items" | "resolve";
type Resolution = "REFUND" | "EXCHANGE";

interface InvoiceHit { invoiceId: number; invoiceNumber: string; partyName?: string; totalAmount: string; createdAt: string; partyId?: number | null; }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  toast: (msg: string, type?: string) => void;
  /** Pre-select an invoice (e.g. opened from the invoice detail view) — skips the search step. */
  initialInvoice?: InvoiceHit;
}

export function NewReturnExchangeModal({ open, onClose, onCreated, toast, initialInvoice }: Props) {
  const { products: storeProducts, activeShopId } = useStore();
  const [step, setStep] = useState<Step>("pick-invoice");

  // ── Step 1: invoice search ──
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [hits, setHits] = useState<InvoiceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceHit | null>(null);

  // ── Step 2: items + reason ──
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
  const [newItems, setNewItems] = useState<Record<number, { qty: number; name: string; unitPrice: number }>>({});
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("pick-invoice"); setSearch(""); setHits([]); setInvoice(null);
      setItems([]); setSelected({}); setReason("WRONG_PART"); setNotes("");
      setResolution(null); setRefundMode("CASH"); setNewSearch(""); setNewItems({});
      setCashAmount(""); setUpiAmount(""); setError("");
      return;
    }
    if (initialInvoice) pickInvoice(initialInvoice);
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

  // ── New-item picker (exchange path only) ──
  const shopProducts = useMemo(() => (storeProducts ?? []).filter((p: any) => p.shopId === activeShopId), [storeProducts, activeShopId]);
  const productHits = useMemo(() => {
    if (!newSearch.trim()) return [];
    const q = newSearch.toLowerCase();
    return shopProducts.filter((p: any) => (p.name || "").toLowerCase().includes(q) || (p.oemNumber || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)).slice(0, 10);
  }, [shopProducts, newSearch]);
  const addNewItem = (p: any) => { setNewItems(prev => ({ ...prev, [p.inventoryId ?? p.id]: { qty: 1, name: p.name, unitPrice: p.sellPrice } })); setNewSearch(""); };
  const removeNewItem = (id: number) => setNewItems(prev => { const next = { ...prev }; delete next[id]; return next; });
  const updateNewQty = (id: number, qty: number) => setNewItems(prev => ({ ...prev, [id]: { ...prev[id], qty: Math.max(1, qty) } }));
  const newItemCount = Object.keys(newItems).length;

  const oldTaxable = Object.entries(selected).reduce((sum, [id, v]) => {
    const item = items.find(i => i.invoiceItemId === Number(id));
    return item ? sum + (item.unitPrice - item.discount) * v.qty : sum;
  }, 0);
  const oldTotalEst = oldTaxable * 1.18;
  const newTaxable = Object.values(newItems).reduce((sum, v) => sum + v.unitPrice * v.qty, 0);
  const newTotalEst = newTaxable * 1.18;
  const netAmount = newTotalEst - oldTotalEst;

  const canSubmit = resolution === "REFUND"
    ? selectedCount > 0 && (refundMode !== "STORE_CREDIT" || !!invoice?.partyId)
    : resolution === "EXCHANGE"
    ? selectedCount > 0 && newItemCount > 0
    : false;

  const submit = async () => {
    if (!invoice || !resolution) return;
    setSubmitting(true);
    setError("");
    try {
      if (resolution === "REFUND") {
        await createSalesReturn({
          originalInvoiceId: invoice.invoiceId,
          items: Object.entries(selected).map(([id, v]) => ({ invoiceItemId: Number(id), qty: v.qty, condition: v.condition as any })),
          reason: reason as any,
          refundMode: refundMode as any,
          notes: notes || undefined,
        });
        toast("Return created — credit note generated", "success");
      } else {
        await createExchange({
          originalInvoiceId: invoice.invoiceId,
          returnItems: Object.entries(selected).map(([id, v]) => ({ invoiceItemId: Number(id), qty: v.qty, condition: v.condition as any })),
          returnReason: reason as any,
          returnNotes: notes || undefined,
          newItems: Object.entries(newItems).map(([id, v]) => ({ inventoryId: Number(id), qty: v.qty })),
          cashAmount: cashAmount ? parseFloat(cashAmount) : undefined,
          upiAmount: upiAmount ? parseFloat(upiAmount) : undefined,
        });
        toast("Exchange completed", "success");
      }
      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Could not complete this");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Return / Exchange" subtitle={invoice ? `Invoice ${invoice.invoiceNumber}` : "Find the original invoice to start"} width={680}>
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
                          <input type="number" min={1} max={item.qtyReturnable} value={sel.qty}
                            onChange={e => updateSelection(item.invoiceItemId, { qty: Math.min(item.qtyReturnable, Math.max(1, parseInt(e.target.value) || 1)) })}
                            style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: `1px solid ${T.border}`, fontFamily: FONT.mono, fontSize: 13 }} />
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
              <Btn variant="ghost" onClick={() => setStep("pick-items")} style={{ alignSelf: "flex-start", marginTop: 4 }}>Back</Btn>
            </div>
          )}

          {resolution === "REFUND" && (
            <>
              <button onClick={() => setResolution(null)} style={{ background: "none", border: "none", color: T.t3, fontSize: 12, cursor: "pointer", textAlign: "left", padding: 0 }}>← Change resolution</button>
              <Field label="Refund mode" required>
                <Select value={refundMode} onChange={setRefundMode} options={REFUND_MODES} />
              </Field>
              {refundMode === "STORE_CREDIT" && !invoice?.partyId && (
                <div style={{ fontSize: 12, color: T.crimson, fontWeight: 600 }}>↑ Store credit needs a registered customer — this sale was to a walk-in. Choose Cash/UPI/Bank instead.</div>
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
                        <input type="number" min={1} value={v.qty} onChange={e => updateNewQty(Number(id), parseInt(e.target.value) || 1)} style={{ width: 50, padding: "6px 8px", borderRadius: 8, border: `1px solid ${T.border}`, fontFamily: FONT.mono, fontSize: 13 }} />
                        <div style={{ fontSize: 13, fontFamily: FONT.mono, color: T.t2, width: 70, textAlign: "right" }}>₹{(v.unitPrice * v.qty).toFixed(0)}</div>
                        <button onClick={() => removeNewItem(Number(id))} style={{ background: "none", border: "none", color: T.crimson, cursor: "pointer", fontSize: 16, minWidth: 32, minHeight: 32 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(selectedCount > 0 || newItemCount > 0) && (
                <div style={{ background: T.surfaceContainerLow, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: T.t3 }}>Old item value (est.)</span><span style={{ fontFamily: FONT.mono }}>₹{oldTotalEst.toFixed(0)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: T.t3 }}>New item value (est.)</span><span style={{ fontFamily: FONT.mono }}>₹{newTotalEst.toFixed(0)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, borderTop: `1px solid ${T.border}`, paddingTop: 6, marginTop: 2 }}>
                    <span>{netAmount > 0.5 ? "Customer pays" : netAmount < -0.5 ? "Credit to customer" : "Even exchange"}</span>
                    <span style={{ fontFamily: FONT.mono, color: netAmount > 0.5 ? T.crimson : netAmount < -0.5 ? T.emerald : T.t1 }}>₹{Math.abs(netAmount).toFixed(0)}</span>
                  </div>
                </div>
              )}

              {netAmount > 0.5 && (
                <div style={{ display: "flex", gap: 10 }}>
                  <Field label="Cash collected"><Input type="number" value={cashAmount} onChange={setCashAmount} placeholder="0" /></Field>
                  <Field label="UPI collected"><Input type="number" value={upiAmount} onChange={setUpiAmount} placeholder="0" /></Field>
                </div>
              )}

              {error && <div style={{ fontSize: 12, color: T.crimson, fontWeight: 600 }}>{error}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn variant="amber" onClick={submit} disabled={!canSubmit} loading={submitting}>Complete Exchange</Btn>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
