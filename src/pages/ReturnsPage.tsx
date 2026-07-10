import { useState, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn, Select, DataTable, TC, TCMono, type Column } from "../components/ui";
import { getSalesReturns, openReturnInvoicePdf, previewReturnInvoicePdf } from "../api/returns";
import { openExchangeInvoicePdf, previewExchangePdf } from "../api/exchanges";
import { NewReturnExchangeModal } from "../components/NewReturnExchangeModal";
import PdfPreviewModal from "../components/PdfPreviewModal";

// One unified list: a SalesReturn with no exchangeOrder is a plain Return; one
// with an exchangeOrder attached renders as an Exchange — same underlying record,
// different presentation, matching the single "Return or Replace" flow it came from.

const REASON_FILTER = [
  { value: "", label: "All reasons" },
  { value: "WRONG_PART", label: "Wrong part / doesn't fit" },
  { value: "DEFECTIVE", label: "Defective" },
  { value: "WARRANTY", label: "Warranty" },
  { value: "CHANGED_MIND", label: "Changed mind" },
  { value: "OTHER", label: "Other" },
];
const REASON_LABEL: Record<string, string> = {
  WRONG_PART: "Wrong part / doesn't fit", DEFECTIVE: "Defective", WARRANTY: "Warranty",
  CHANGED_MIND: "Changed mind", OTHER: "Other",
};

function TypeBadge({ isExchange }: { isExchange: boolean }) {
  return isExchange
    ? <span style={{ background: T.violetBg, color: T.violet, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>🔄 Exchange</span>
    : <span style={{ background: T.skyBg, color: T.sky, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>↩️ Return</span>;
}

function refundModeBadge(mode: string | null) {
  if (!mode) return <span style={{ fontSize: 12, color: T.t3 }}>—</span>;
  const map: Record<string, { bg: string; color: string; label: string }> = {
    CASH: { bg: T.emeraldBg, color: T.emerald, label: "Cash" },
    UPI: { bg: T.skyBg, color: T.sky, label: "UPI" },
    BANK: { bg: T.skyBg, color: T.sky, label: "Bank" },
    STORE_CREDIT: { bg: T.violetBg, color: T.violet, label: "Store Credit" },
  };
  const m = map[mode] || { bg: T.surfaceContainer, color: T.t3, label: mode };
  return <span style={{ background: m.bg, color: m.color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>{m.label}</span>;
}

function settlementBadge(settlementType: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    COLLECT: { bg: T.skyBg, color: T.sky, label: "Collected" },
    REFUND: { bg: T.emeraldBg, color: T.emerald, label: "Refunded" },
    EVEN: { bg: T.surfaceContainer, color: T.t3, label: "Even" },
  };
  const m = map[settlementType] || { bg: T.surfaceContainer, color: T.t3, label: settlementType };
  return <span style={{ background: m.bg, color: m.color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>{m.label}</span>;
}

const COLUMNS: Column[] = [
  { key: "type", label: "Type", width: 100 },
  { key: "returnNo", label: "No.", width: 150 },
  { key: "date", label: "Date", width: 100 },
  { key: "invoice", label: "Invoice", width: 120 },
  { key: "reason", label: "Reason", width: 140 },
  { key: "resolution", label: "Resolution", width: 130 },
  { key: "amount", label: "Amount", width: 100, align: "right" },
  { key: "actions", label: "", width: 60 },
];

export function ReturnsPage() {
  const { toast } = useAppCtx();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reasonFilter, setReasonFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [openingInvoiceId, setOpeningInvoiceId] = useState<number | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ url: string | null; loading: boolean; title: string; filename: string } | null>(null);

  const viewExchangeInvoice = async (exchangeId: number, exchangeNo?: string) => {
    setPdfPreview({ url: null, loading: true, title: `Exchange Invoice ${exchangeNo || exchangeId}`, filename: `exchange-${exchangeNo || exchangeId}.pdf` });
    try {
      const url = await previewExchangePdf(exchangeId);
      setPdfPreview({ url, loading: false, title: `Exchange Invoice ${exchangeNo || exchangeId}`, filename: `exchange-${exchangeNo || exchangeId}.pdf` });
    } catch (e: any) {
      setPdfPreview(null);
      toast(e?.message || "Could not open the exchange invoice", "error");
    }
  };

  const viewReturnInvoice = async (returnId: number, returnNo?: string) => {
    setPdfPreview({ url: null, loading: true, title: `Return Invoice ${returnNo || returnId}`, filename: `return-${returnNo || returnId}.pdf` });
    try {
      const url = await previewReturnInvoicePdf(returnId);
      setPdfPreview({ url, loading: false, title: `Return Invoice ${returnNo || returnId}`, filename: `return-${returnNo || returnId}.pdf` });
    } catch (e: any) {
      setPdfPreview(null);
      toast(e?.message || "Could not open the return invoice", "error");
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (reasonFilter) params.reason = reasonFilter;
    getSalesReturns(params)
      .then((data: any) => setReturns(Array.isArray(data?.returns) ? data.returns : []))
      .catch((e: any) => setError(e?.message || "Could not load returns"))
      .finally(() => setLoading(false));
  }, [reasonFilter]);

  useEffect(() => { load(); }, [load]);

  const rowValue = (row: any) => row.exchangeOrder
    ? Math.abs(Number(row.exchangeOrder.netAmount))
    : (row.items || []).reduce((s: number, i: any) => s + Number(i.taxableValue) + Number(i.cgst) + Number(i.sgst), 0);

  const totalValue = returns.reduce((s, r) => s + rowValue(r), 0);
  const exchangeCount = returns.filter(r => r.exchangeOrder).length;
  const pendingApproval = returns.filter(r => r.requiresApproval).length;

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>Returns &amp; Exchange</h1>
          <p style={{ fontSize: 13, color: T.t3, margin: "4px 0 0" }}>Find the invoice, pick the item, then choose refund or exchange — every case starts the same way.</p>
        </div>
        <Btn variant="amber" onClick={() => setModalOpen(true)}>+ New Return / Exchange</Btn>
      </div>

      <div className="kpi-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Cases</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.t1, fontFamily: FONT.mono, marginTop: 6 }}>{returns.length}</div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Exchanges</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.t1, fontFamily: FONT.mono, marginTop: 6 }}>{exchangeCount}</div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Value</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.t1, fontFamily: FONT.mono, marginTop: 6 }}>₹{totalValue.toFixed(0)}</div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Flagged for Review</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: pendingApproval > 0 ? "#B45309" : T.t1, fontFamily: FONT.mono, marginTop: 6 }}>{pendingApproval}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Select value={reasonFilter} onChange={setReasonFilter} options={REASON_FILTER} style={{ width: 200 }} />
      </div>

      <DataTable
        columns={COLUMNS}
        rows={returns}
        loading={loading}
        error={error}
        empty="No returns or exchanges yet — start one from an original invoice"
        emptyIcon="↩️"
        renderRow={(row: any) => {
          const isExchange = !!row.exchangeOrder;
          return (
            <tr key={row.returnId} className="trow">
              <td style={TC}><TypeBadge isExchange={isExchange} /></td>
              <td style={TCMono}>{isExchange ? row.exchangeOrder.exchangeNo : row.returnNo}</td>
              <td style={TC}>{new Date(row.createdAt).toLocaleDateString()}</td>
              <td style={{ ...TCMono, fontSize: 12 }}>{row.isWalkIn ? "Walk-in" : row.invoice?.invoiceNumber || "—"}</td>
              <td style={TC}>
                {REASON_LABEL[row.reason] || row.reason}
                {row.requiresApproval && (
                  <span title={row.isWalkIn ? "No invoice found — flagged for manager review" : "Outside return policy window — flagged for review"} style={{ marginLeft: 6, fontSize: 11 }}>⚠</span>
                )}
              </td>
              <td style={TC}>{isExchange ? settlementBadge(row.exchangeOrder.settlementType) : refundModeBadge(row.refundMode)}</td>
              <td style={{ ...TCMono, textAlign: "right" }}>₹{rowValue(row).toFixed(0)}</td>
              <td style={TC}>
                <button
                  onClick={() => isExchange ? viewExchangeInvoice(row.exchangeOrder.exchangeId, row.exchangeOrder.exchangeNo) : viewReturnInvoice(row.returnId, row.returnNo)}
                  title={isExchange ? "View Exchange Invoice" : "View Return Invoice / Credit Note"}
                  style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 7, padding: "4px 8px", cursor: "pointer", fontSize: 12, color: T.t2 }}
                >
                  🖨
                </button>
              </td>
            </tr>
          );
        }}
      />

      <NewReturnExchangeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={load}
        toast={toast}
      />

      {pdfPreview && (
        <PdfPreviewModal
          url={pdfPreview.url}
          loading={pdfPreview.loading}
          title={pdfPreview.title}
          filename={pdfPreview.filename}
          onClose={() => {
            if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
            setPdfPreview(null);
          }}
        />
      )}
    </div>
  );
}
