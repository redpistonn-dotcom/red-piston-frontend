import { useState, useEffect, useCallback, useMemo } from "react";
import { T, FONT } from "../theme";
import { DataTable, TC, TCMono, type Column } from "../components/ui";
import { getCreditNotes, type CreditNote } from "../api/creditNotes";
import { fmt } from "../utils";

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  UNUSED:          { bg: T.skyBg,      color: T.sky,     label: "Unused" },
  PARTIALLY_USED:  { bg: "rgba(245,158,11,0.12)", color: "#D97706", label: "Partially used" },
  FULLY_USED:      { bg: T.surfaceContainer, color: T.t3, label: "Fully used" },
  REFUNDED:        { bg: T.emeraldBg,  color: T.emerald, label: "Refunded" },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] || { bg: T.surfaceContainer, color: T.t3, label: status };
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

const COLUMNS: Column[] = [
  { key: "creditNoteNo", label: "Credit Note #", width: 170 },
  { key: "date",         label: "Issued",        width: 100 },
  { key: "customer",     label: "Customer",      width: 160 },
  { key: "invoice",      label: "Original Invoice", width: 150 },
  { key: "amount",       label: "Amount",        width: 100 },
  { key: "remaining",    label: "Balance Left",  width: 110 },
  { key: "status",       label: "Status",        width: 130 },
  { key: "reason",       label: "Reason",        width: 140 },
];

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "UNUSED", label: "Unused" },
  { value: "PARTIALLY_USED", label: "Partially used" },
  { value: "FULLY_USED", label: "Fully used" },
  { value: "REFUNDED", label: "Refunded" },
];

export function CreditNotesPage() {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getCreditNotes(status ? { status } : undefined)
      .then((data: any) => {
        setNotes(Array.isArray(data?.creditNotes) ? data.creditNotes : []);
        setOutstanding(Number(data?.outstandingCreditBalance) || 0);
      })
      .catch((e: any) => setError(e?.message || "Could not load credit notes"))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  // No backend text-search by customer name — filter the current page client-side.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n =>
      (n.party?.name || "").toLowerCase().includes(q) ||
      (n.party?.phone || "").includes(q) ||
      n.creditNoteNo.toLowerCase().includes(q) ||
      (n.invoice?.invoiceNumber || "").toLowerCase().includes(q)
    );
  }, [notes, search]);

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>Credit Notes</h1>
          <p style={{ fontSize: 13, color: T.t3, margin: "4px 0 0" }}>
            Store credit issued to customers from returns — {fmt(outstanding)} still outstanding across all customers.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by customer, phone, credit note #, or invoice #..."
          style={{ flex: 1, minWidth: 240, height: 38, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, color: T.t1, background: T.card, outline: "none" }}
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{ height: 38, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 10px", fontSize: 13, fontFamily: FONT.ui, color: T.t1, background: T.card, outline: "none" }}
        >
          {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <DataTable
        columns={COLUMNS}
        rows={filtered}
        loading={loading}
        error={error}
        empty="No credit notes yet"
        emptyIcon="🧾"
        renderRow={(row: any) => {
          const n = row as CreditNote;
          return (
            <tr key={n.creditNoteId} className="trow">
              <td style={TCMono}>{n.creditNoteNo}</td>
              <td style={TC}>{new Date(n.issueDate).toLocaleDateString()}</td>
              <td style={TC}>
                {n.party ? (
                  <>
                    <div style={{ fontWeight: 600 }}>{n.party.name}</div>
                    {n.party.phone && <div style={{ fontSize: 11, color: T.t4 }}>{n.party.phone}</div>}
                  </>
                ) : (
                  <span style={{ color: T.t4, fontStyle: "italic" }}>Walk-in — no customer linked</span>
                )}
              </td>
              <td style={{ ...TCMono, fontSize: 12 }}>{n.invoice?.invoiceNumber || "—"}</td>
              <td style={TCMono}>{fmt(n.totalAmount)}</td>
              <td style={{ ...TCMono, fontWeight: 700, color: Number(n.remainingBalance) > 0 ? T.amber : T.t4 }}>{fmt(n.remainingBalance)}</td>
              <td style={TC}><StatusBadge status={n.status} /></td>
              <td style={{ ...TC, fontSize: 12, color: T.t3 }}>{n.reason || "—"}</td>
            </tr>
          );
        }}
      />
    </div>
  );
}
