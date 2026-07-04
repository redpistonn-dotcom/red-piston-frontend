import { useState, useEffect } from "react";
import { T, FONT } from "../theme";
import { Modal, Btn, Field, Input, Select } from "./ui";
import { getPurchaseBills } from "../api/purchaseBills";
import { getEligiblePurchaseReturnItems, createPurchaseReturn, type PurchaseReturnableItem } from "../api/purchaseReturns";
import { useDebounce } from "../utils";

const REASONS = [
  { value: "DAMAGED", label: "Damaged" },
  { value: "WRONG_ITEM", label: "Wrong item" },
  { value: "EXCESS_SUPPLY", label: "Excess supply" },
  { value: "QUALITY_ISSUE", label: "Quality issue" },
];
const RESOLUTIONS = [
  { value: "PENDING", label: "Pending — decide later" },
  { value: "SUPPLIER_REFUND", label: "Supplier refund" },
  { value: "SUPPLIER_CREDIT", label: "Supplier credit (next order)" },
  { value: "REPLACEMENT", label: "Replacement incoming" },
];

interface BillHit { billId: number; invoiceNumber: string | null; supplierName: string | null; grandTotal: string | null; createdAt: string; status: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  toast: (msg: string, type?: string) => void;
}

export function NewPurchaseReturnModal({ open, onClose, onCreated, toast }: Props) {
  const [step, setStep] = useState<"pick" | "items">("pick");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [bills, setBills] = useState<BillHit[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);

  const [bill, setBill] = useState<BillHit | null>(null);
  const [items, setItems] = useState<PurchaseReturnableItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState("");

  const [selected, setSelected] = useState<Record<number, number>>({}); // sourceMovementId -> qty
  const [reason, setReason] = useState("DAMAGED");
  const [resolution, setResolution] = useState("PENDING");
  const [supplierCreditNoteNo, setSupplierCreditNoteNo] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("pick"); setSearch(""); setBill(null); setItems([]);
      setSelected({}); setReason("DAMAGED"); setResolution("PENDING");
      setSupplierCreditNoteNo(""); setNotes(""); setError("");
      return;
    }
    setLoadingBills(true);
    getPurchaseBills({ status: "IMPORTED" })
      .then((data: any) => setBills(Array.isArray(data?.bills) ? data.bills : []))
      .catch(() => setBills([]))
      .finally(() => setLoadingBills(false));
  }, [open]);

  const filteredBills = bills.filter(b => {
    if (!debouncedSearch.trim()) return true;
    const q = debouncedSearch.toLowerCase();
    return (b.invoiceNumber || "").toLowerCase().includes(q) || (b.supplierName || "").toLowerCase().includes(q);
  });

  const pickBill = (b: BillHit) => {
    setBill(b);
    setLoadingItems(true);
    setItemsError("");
    getEligiblePurchaseReturnItems(b.billId)
      .then(data => {
        setItems(data.items.filter(i => i.qtyReturnable > 0));
        setStep("items");
      })
      .catch((e: any) => setItemsError(e?.message || "Could not load bill items"))
      .finally(() => setLoadingItems(false));
  };

  const toggleItem = (item: PurchaseReturnableItem) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[item.sourceMovementId] != null) delete next[item.sourceMovementId];
      else next[item.sourceMovementId] = item.qtyReturnable;
      return next;
    });
  };

  const selectedCount = Object.keys(selected).length;

  const submit = async () => {
    if (!bill) return;
    setSubmitting(true);
    setError("");
    try {
      await createPurchaseReturn({
        originalBillId: bill.billId,
        items: Object.entries(selected).map(([sourceMovementId, qty]) => ({ sourceMovementId: Number(sourceMovementId), qty })),
        reason: reason as any,
        resolution: resolution as any,
        supplierCreditNoteNo: supplierCreditNoteNo || undefined,
        notes: notes || undefined,
      });
      toast("Purchase return recorded — stock and ITC adjusted", "success");
      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Could not create purchase return");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Purchase Return" subtitle={bill ? `Bill ${bill.invoiceNumber || bill.billId}` : "Pick the original purchase bill"} width={640}>
      {step === "pick" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Search bills" hint="Search by bill number or supplier name">
            <Input value={search} onChange={setSearch} placeholder="e.g. INV-2201 or supplier name" autoFocus icon="🔍" />
          </Field>

          {loadingBills ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.t3, fontSize: 13 }}>Loading bills…</div>
          ) : filteredBills.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.t3, fontSize: 13 }}>No imported bills found{debouncedSearch ? ` for "${debouncedSearch}"` : ""}.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
              {filteredBills.map(b => (
                <button
                  key={b.billId}
                  onClick={() => pickBill(b)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.border}`,
                    background: T.surface, cursor: "pointer", textAlign: "left", fontFamily: FONT.ui, minHeight: 44,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{b.invoiceNumber || `Bill #${b.billId}`}</div>
                    <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{b.supplierName || "Unknown supplier"} · {new Date(b.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{b.grandTotal ? `₹${Number(b.grandTotal).toFixed(0)}` : "—"}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "items" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {loadingItems ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.t3, fontSize: 13 }}>Loading items…</div>
          ) : itemsError ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.crimson, fontSize: 13 }}>{itemsError}</div>
          ) : items.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.t3, fontSize: 13 }}>Nothing left to return on this bill.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(item => {
                const sel = selected[item.sourceMovementId];
                return (
                  <div key={item.sourceMovementId} style={{ border: `1px solid ${sel != null ? T.amber : T.border}`, borderRadius: 10, padding: 12, background: sel != null ? T.amberGlow : T.surface }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minHeight: 44 }}>
                      <input type="checkbox" checked={sel != null} onChange={() => toggleItem(item)} style={{ width: 18, height: 18, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{item.partName}</div>
                        <div style={{ fontSize: 11, color: T.t3 }}>Received {item.qtyReceived} · {item.qtyReturnable} returnable · ₹{item.unitPrice}/unit</div>
                      </div>
                    </label>
                    {sel != null && (
                      <div style={{ display: "flex", gap: 10, marginTop: 10, paddingLeft: 28 }}>
                        <Field label="Qty" horizontal>
                          <input
                            type="number" min={1} max={item.qtyReturnable} value={sel}
                            onChange={e => setSelected(prev => ({ ...prev, [item.sourceMovementId]: Math.min(item.qtyReturnable, Math.max(1, parseInt(e.target.value) || 1)) }))}
                            style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: `1px solid ${T.border}`, fontFamily: FONT.mono, fontSize: 13 }}
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Reason" required>
              <Select value={reason} onChange={setReason} options={REASONS} />
            </Field>
            <Field label="Resolution">
              <Select value={resolution} onChange={setResolution} options={RESOLUTIONS} />
            </Field>
          </div>

          {resolution === "SUPPLIER_CREDIT" && (
            <Field label="Supplier credit note no." hint="Optional — record it now or add later">
              <Input value={supplierCreditNoteNo} onChange={setSupplierCreditNoteNo} placeholder="e.g. SCN-4521" />
            </Field>
          )}

          <Field label="Notes" hint="Optional context for this return">
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${T.border}`, fontFamily: FONT.ui, fontSize: 13, resize: "vertical" }}
            />
          </Field>

          {error && <div style={{ fontSize: 12, color: T.crimson, fontWeight: 600 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setStep("pick")}>Back</Btn>
            <Btn variant="amber" onClick={submit} disabled={selectedCount === 0} loading={submitting}>
              Record Return{selectedCount > 0 ? ` (${selectedCount} item${selectedCount > 1 ? "s" : ""})` : ""}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}
