import { useState, useEffect } from "react";
import { T, FONT } from "../theme";
import { Modal, Btn, Field, Input } from "./ui";
import { getInvoices } from "../api/billing";
import { getEligibleReturnItems, type ReturnableItem } from "../api/returns";
import { createWarrantyClaim } from "../api/warranty";
import { useDebounce } from "../utils";

interface InvoiceHit { invoiceId: number; invoiceNumber: string; partyName?: string; createdAt: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  toast: (msg: string, type?: string) => void;
}

export function NewWarrantyClaimModal({ open, onClose, onCreated, toast }: Props) {
  const [step, setStep] = useState<"pick" | "claim">("pick");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [hits, setHits] = useState<InvoiceHit[]>([]);
  const [searching, setSearching] = useState(false);

  const [invoice, setInvoice] = useState<InvoiceHit | null>(null);
  const [items, setItems] = useState<ReturnableItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [warrantyInfo, setWarrantyInfo] = useState<{ daysSinceSale: number; warrantyMonths: number | null; withinWarranty: boolean } | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("pick"); setSearch(""); setHits([]); setInvoice(null);
      setItems([]); setSelectedItemId(null); setQty(1); setNotes(""); setError(""); setWarrantyInfo(null);
    }
  }, [open]);

  useEffect(() => {
    if (!debouncedSearch.trim() || step !== "pick") { setHits([]); return; }
    let cancelled = false;
    setSearching(true);
    getInvoices({ search: debouncedSearch.trim(), limit: "20" })
      .then((data: any) => { if (!cancelled) setHits(Array.isArray(data?.invoices) ? data.invoices : []); })
      .catch(() => { if (!cancelled) setHits([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, step]);

  const pickInvoice = (inv: InvoiceHit) => {
    setInvoice(inv);
    setLoadingItems(true);
    // Warranty claims can reuse the eligible-items view — qty sold is what matters,
    // not "already returned" (a claim doesn't consume the same pool a sales return does).
    getEligibleReturnItems(inv.invoiceId)
      .then(data => { setItems(data.items); setStep("claim"); })
      .catch((e: any) => toast(e?.message || "Could not load invoice items", "error"))
      .finally(() => setLoadingItems(false));
  };

  const submit = async () => {
    if (!invoice || !selectedItemId) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await createWarrantyClaim({
        originalInvoiceId: invoice.invoiceId,
        invoiceItemId: selectedItemId,
        qty,
        notes: notes || undefined,
      });
      setWarrantyInfo({ daysSinceSale: res.daysSinceSale, warrantyMonths: res.warrantyMonths, withinWarranty: res.withinWarranty });
      toast("Warranty claim opened — sent to supplier", "success");
      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Could not open warranty claim");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Warranty Claim" subtitle={invoice ? `Invoice ${invoice.invoiceNumber}` : "Find the original invoice"} width={600}>
      {step === "pick" && (
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{inv.invoiceNumber}</div>
                  <div style={{ fontSize: 12, color: T.t3 }}>{inv.partyName || "Walk-in"} · {new Date(inv.createdAt).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "claim" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {loadingItems ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.t3, fontSize: 13 }}>Loading items…</div>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Which item is being claimed?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map(item => (
                  <label key={item.invoiceItemId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${selectedItemId === item.invoiceItemId ? T.amber : T.border}`, background: selectedItemId === item.invoiceItemId ? T.amberGlow : T.surface, cursor: "pointer", minHeight: 44 }}>
                    <input type="radio" checked={selectedItemId === item.invoiceItemId} onChange={() => { setSelectedItemId(item.invoiceItemId); setQty(1); }} style={{ width: 18, height: 18, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{item.partName}</div>
                      <div style={{ fontSize: 11, color: T.t3 }}>Sold {item.qtySold} · ₹{item.unitPrice}/unit</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedItemId != null && (
            <Field label="Quantity">
              <input type="number" min={1} max={items.find(i => i.invoiceItemId === selectedItemId)?.qtySold || 99} value={qty}
                onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontFamily: FONT.mono, fontSize: 13 }} />
            </Field>
          )}

          <Field label="Notes" hint="Describe the fault reported by the customer">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${T.border}`, fontFamily: FONT.ui, fontSize: 13, resize: "vertical" }} />
          </Field>

          {error && <div style={{ fontSize: 12, color: T.crimson, fontWeight: 600 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setStep("pick")}>Back</Btn>
            <Btn variant="amber" onClick={submit} disabled={!selectedItemId} loading={submitting}>Open Claim</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}
