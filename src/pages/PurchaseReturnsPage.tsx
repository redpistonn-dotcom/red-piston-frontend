import { useState, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn, Select, Field, Input, Modal, DataTable, TC, TCMono, type Column } from "../components/ui";
import { getPurchaseReturns, updatePurchaseReturnResolution } from "../api/purchaseReturns";
import { getPartyLedger, applySupplierCredit } from "../api/parties";
import { NewPurchaseReturnModal } from "../components/NewPurchaseReturnModal";

const RESOLUTION_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "SUPPLIER_REFUND", label: "Supplier refund" },
  { value: "SUPPLIER_CREDIT", label: "Supplier credit" },
  { value: "REPLACEMENT", label: "Replacement" },
];

// Update a return's resolution, and — once it's SUPPLIER_CREDIT — apply that
// supplier's available credit against a later purchase. The credit itself is
// a real PartyLedger balance (posted server-side the first time resolution
// lands on SUPPLIER_CREDIT), not just this status label.
function ResolutionModal({ row, onClose, onUpdated, toast }: any) {
  const [resolution, setResolution] = useState(row.resolution);
  const [supplierCreditNoteNo, setSupplierCreditNoteNo] = useState(row.supplierCreditNoteNo || "");
  const [saving, setSaving] = useState(false);
  const [party, setParty] = useState<any>(null);
  const [partyLoading, setPartyLoading] = useState(false);
  const [applyAmount, setApplyAmount] = useState("");
  const [applyNotes, setApplyNotes] = useState("");
  const [applying, setApplying] = useState(false);
  // Tracks version/partyId locally so a second save in the same modal session
  // (e.g. edit the credit note no. after it's already SUPPLIER_CREDIT) doesn't
  // 409 against the now-stale version from the initial `row` prop.
  const [current, setCurrent] = useState(row);

  const loadParty = useCallback(() => {
    if (!current.partyId) return;
    setPartyLoading(true);
    getPartyLedger(current.partyId)
      .then((res: any) => setParty(res?.party || null))
      .catch(() => setParty(null))
      .finally(() => setPartyLoading(false));
  }, [current.partyId]);

  useEffect(() => { if (current.resolution === "SUPPLIER_CREDIT") loadParty(); }, [loadParty, current.resolution]);

  const handleSave = () => {
    setSaving(true);
    updatePurchaseReturnResolution(current.returnId, { resolution, supplierCreditNoteNo: supplierCreditNoteNo || undefined, version: current.version })
      .then((res: any) => {
        if (res?.purchaseReturn) setCurrent(res.purchaseReturn);
        if (res?.ledgerSkippedReason) toast(res.ledgerSkippedReason, "warning");
        else if (res?.ledgerBalanceAfter != null) toast(`Supplier credit posted — new balance ₹${Number(res.ledgerBalanceAfter).toFixed(2)}`, "success");
        onUpdated();
        if (resolution === "SUPPLIER_CREDIT") loadParty();
        else onClose();
      })
      .catch((e: any) => toast(e?.message || "Could not update resolution", "error"))
      .finally(() => setSaving(false));
  };

  const handleApply = () => {
    const amt = parseFloat(applyAmount);
    if (!amt || amt <= 0) return;
    setApplying(true);
    applySupplierCredit(current.partyId, { amount: amt, notes: applyNotes || undefined })
      .then((res: any) => {
        toast(`Applied ₹${amt.toFixed(2)} — remaining balance ₹${Number(res.newOutstanding).toFixed(2)}`, "success");
        setApplyAmount(""); setApplyNotes("");
        loadParty();
      })
      .catch((e: any) => toast(e?.message || "Could not apply credit", "error"))
      .finally(() => setApplying(false));
  };

  const available = party ? Number(party.outstanding) : 0;

  return (
    <Modal open onClose={onClose} title="Update Resolution" subtitle={current.returnNo} width={460}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Resolution">
          <Select value={resolution} onChange={setResolution} options={RESOLUTION_OPTIONS} />
        </Field>
        <Field label="Supplier Credit Note No." hint="Optional — for audit matching against the supplier's GSTR-1/2B">
          <Input value={supplierCreditNoteNo} onChange={setSupplierCreditNoteNo} placeholder="CN-2026-00045" maxLength={60} />
        </Field>
        <Btn variant="amber" loading={saving} onClick={handleSave}>Save Resolution</Btn>

        {resolution === "SUPPLIER_CREDIT" && current.partyId && (
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.violet, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Supplier Credit Balance
            </div>
            {partyLoading ? (
              <div style={{ fontSize: 12, color: T.t3 }}>Loading…</div>
            ) : (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, color: available > 0 ? T.violet : T.t3, fontFamily: FONT.mono, marginBottom: 10 }}>
                  ₹{Math.max(available, 0).toFixed(2)} <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>owed by supplier</span>
                </div>
                {available > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Input type="number" value={applyAmount} onChange={setApplyAmount} placeholder="Amount to apply" prefix="₹" min="0" max={String(available)} step="0.01" />
                    <Input value={applyNotes} onChange={setApplyNotes} placeholder="Notes (optional) — e.g. netted off invoice #123" maxLength={200} />
                    <Btn variant="ghost" loading={applying} onClick={handleApply}>Apply Credit to a Purchase</Btn>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {resolution === "SUPPLIER_CREDIT" && !current.partyId && (
          <div style={{ fontSize: 12, color: T.amber, background: `${T.amber}12`, border: `1px solid ${T.amber}44`, borderRadius: 8, padding: "8px 12px" }}>
            This supplier isn't a registered party, so no credit balance is tracked. Register them as a party to use this.
          </div>
        )}
      </div>
    </Modal>
  );
}

const REASON_FILTER = [
  { value: "", label: "All reasons" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "WRONG_ITEM", label: "Wrong item" },
  { value: "EXCESS_SUPPLY", label: "Excess supply" },
  { value: "QUALITY_ISSUE", label: "Quality issue" },
];

const REASON_LABEL: Record<string, string> = {
  DAMAGED: "Damaged", WRONG_ITEM: "Wrong item", EXCESS_SUPPLY: "Excess supply", QUALITY_ISSUE: "Quality issue",
};

function resolutionBadge(resolution: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: "#FFFBF0", color: "#B45309", label: "Pending" },
    SUPPLIER_REFUND: { bg: T.emeraldBg, color: T.emerald, label: "Refund" },
    SUPPLIER_CREDIT: { bg: T.violetBg, color: T.violet, label: "Supplier credit" },
    REPLACEMENT: { bg: T.skyBg, color: T.sky, label: "Replacement" },
  };
  const m = map[resolution] || { bg: T.surfaceContainer, color: T.t3, label: resolution };
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

const COLUMNS: Column[] = [
  { key: "returnNo", label: "Return No", width: 150 },
  { key: "date", label: "Date", width: 100 },
  { key: "bill", label: "Bill", width: 130 },
  { key: "reason", label: "Reason", width: 120 },
  { key: "resolution", label: "Resolution", width: 130 },
  { key: "amount", label: "Amount", width: 100, align: "right" },
  { key: "actions", label: "", width: 40 },
];

export function PurchaseReturnsPage() {
  const { toast } = useAppCtx();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reasonFilter, setReasonFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [resolutionRow, setResolutionRow] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (reasonFilter) params.reason = reasonFilter;
    getPurchaseReturns(params)
      .then((data: any) => setReturns(Array.isArray(data?.returns) ? data.returns : []))
      .catch((e: any) => setError(e?.message || "Could not load purchase returns"))
      .finally(() => setLoading(false));
  }, [reasonFilter]);

  useEffect(() => { load(); }, [load]);

  const totalValue = returns.reduce((s, r) => s + (r.items || []).reduce((si: number, i: any) => si + Number(i.taxableValue) + Number(i.cgst) + Number(i.sgst), 0), 0);
  const pendingResolution = returns.filter(r => r.resolution === "PENDING").length;

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>Purchase Returns</h1>
          <p style={{ fontSize: 13, color: T.t3, margin: "4px 0 0" }}>Goods returned to suppliers — stock and ITC adjust automatically.</p>
        </div>
        <Btn variant="amber" onClick={() => setModalOpen(true)}>+ New Purchase Return</Btn>
      </div>

      <div className="kpi-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Returns</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.t1, fontFamily: FONT.mono, marginTop: 6 }}>{returns.length}</div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Value Returned</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.t1, fontFamily: FONT.mono, marginTop: 6 }}>₹{totalValue.toFixed(0)}</div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Awaiting Resolution</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: pendingResolution > 0 ? "#B45309" : T.t1, fontFamily: FONT.mono, marginTop: 6 }}>{pendingResolution}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Select value={reasonFilter} onChange={setReasonFilter} options={REASON_FILTER} style={{ width: 180 }} />
      </div>

      <DataTable
        columns={COLUMNS}
        rows={returns}
        loading={loading}
        error={error}
        empty="No purchase returns yet"
        emptyIcon="📦"
        renderRow={(row: any) => (
          <tr key={row.returnId} className="trow">
            <td style={{ ...TCMono }}>{row.returnNo}</td>
            <td style={TC}>{new Date(row.createdAt).toLocaleDateString()}</td>
            <td style={{ ...TCMono, fontSize: 12 }}>{row.bill?.invoiceNumber || "—"}</td>
            <td style={TC}>{REASON_LABEL[row.reason] || row.reason}</td>
            <td style={TC}>{resolutionBadge(row.resolution)}</td>
            <td style={{ ...TCMono, textAlign: "right" }}>
              ₹{(row.items || []).reduce((s: number, i: any) => s + Number(i.taxableValue) + Number(i.cgst) + Number(i.sgst), 0).toFixed(0)}
            </td>
            <td style={TC}>
              <button onClick={() => setResolutionRow(row)} title="Update resolution"
                style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, width: 26, height: 26, cursor: "pointer", color: T.t3, fontSize: 13 }}>
                ✎
              </button>
            </td>
          </tr>
        )}
      />

      {resolutionRow && (
        <ResolutionModal
          row={resolutionRow}
          onClose={() => setResolutionRow(null)}
          onUpdated={load}
          toast={toast}
        />
      )}

      <NewPurchaseReturnModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={load}
        toast={toast}
      />
    </div>
  );
}
