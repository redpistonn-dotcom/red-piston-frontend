import { useState, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn, Select, DataTable, TC, TCMono, type Column } from "../components/ui";
import { getPurchaseReturns } from "../api/purchaseReturns";
import { NewPurchaseReturnModal } from "../components/NewPurchaseReturnModal";

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
];

export function PurchaseReturnsPage() {
  const { toast } = useAppCtx();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reasonFilter, setReasonFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

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
          </tr>
        )}
      />

      <NewPurchaseReturnModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={load}
        toast={toast}
      />
    </div>
  );
}
