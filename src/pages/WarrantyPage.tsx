import { useState, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn, DataTable, TC, TCMono, type Column } from "../components/ui";
import { getWarrantyClaims, updateWarrantyClaimStatus, type WarrantyClaim } from "../api/warranty";
import { NewWarrantyClaimModal } from "../components/NewWarrantyClaimModal";

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  SENT_TO_SUPPLIER: { bg: T.skyBg, color: T.sky, label: "Sent to supplier" },
  APPROVED: { bg: T.emeraldBg, color: T.emerald, label: "Approved" },
  REJECTED: { bg: "#FFDAD6", color: T.crimson, label: "Rejected" },
  REPLACEMENT_RECEIVED: { bg: T.violetBg, color: T.violet, label: "Replacement received" },
  RETURNED_TO_CUSTOMER: { bg: T.surfaceContainer, color: T.t3, label: "Closed" },
};

// Mirrors the backend's VALID_TRANSITIONS state machine — one primary action per status.
const NEXT_ACTION: Record<string, { status: string; label: string; variant: "emerald" | "sky" | "crimson" }[]> = {
  SENT_TO_SUPPLIER: [
    { status: "APPROVED", label: "Approve", variant: "emerald" },
    { status: "REJECTED", label: "Reject", variant: "crimson" },
  ],
  APPROVED: [{ status: "REPLACEMENT_RECEIVED", label: "Replacement received", variant: "sky" }],
  REPLACEMENT_RECEIVED: [{ status: "RETURNED_TO_CUSTOMER", label: "Hand to customer", variant: "emerald" }],
  REJECTED: [],
  RETURNED_TO_CUSTOMER: [],
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
  { key: "claimNo", label: "Claim No", width: 140 },
  { key: "date", label: "Opened", width: 100 },
  { key: "invoice", label: "Invoice", width: 130 },
  { key: "part", label: "Part", width: 160 },
  { key: "status", label: "Status", width: 150 },
  { key: "actions", label: "Actions", width: 180 },
];

export function WarrantyPage() {
  const { toast } = useAppCtx();
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [advancing, setAdvancing] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getWarrantyClaims()
      .then(data => setClaims(Array.isArray(data?.claims) ? data.claims : []))
      .catch((e: any) => setError(e?.message || "Could not load warranty claims"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const advance = async (claim: WarrantyClaim, nextStatus: string) => {
    setAdvancing(claim.claimId);
    try {
      await updateWarrantyClaimStatus(claim.claimId, { status: nextStatus, version: claim.version });
      toast(`Claim ${claim.claimNo} updated`, "success");
      load();
    } catch (e: any) {
      toast(e?.message || "Could not update claim — it may have changed elsewhere", "error");
      load(); // refresh to pick up the latest version after a conflict
    } finally {
      setAdvancing(null);
    }
  };

  const openCount = claims.filter(c => c.status === "SENT_TO_SUPPLIER" || c.status === "APPROVED" || c.status === "REPLACEMENT_RECEIVED").length;

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>Warranty Claims</h1>
          <p style={{ fontSize: 13, color: T.t3, margin: "4px 0 0" }}>{openCount} claim{openCount !== 1 ? "s" : ""} currently open with a supplier.</p>
        </div>
        <Btn variant="amber" onClick={() => setModalOpen(true)}>+ New Claim</Btn>
      </div>

      <DataTable
        columns={COLUMNS}
        rows={claims}
        loading={loading}
        error={error}
        empty="No warranty claims yet"
        emptyIcon="🛡️"
        renderRow={(row: any) => {
          const claim = row as WarrantyClaim;
          const actions = NEXT_ACTION[claim.status] || [];
          return (
            <tr key={claim.claimId} className="trow">
              <td style={TCMono}>{claim.claimNo}</td>
              <td style={TC}>{new Date(claim.sentDate).toLocaleDateString()}</td>
              <td style={{ ...TCMono, fontSize: 12 }}>{claim.invoice?.invoiceNumber || "—"}</td>
              <td style={TC}>{claim.invoiceItem?.partName || "—"}</td>
              <td style={TC}><StatusBadge status={claim.status} /></td>
              <td style={TC}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {actions.map(a => (
                    <Btn key={a.status} variant={a.variant} size="xs" loading={advancing === claim.claimId} onClick={() => advance(claim, a.status)}>{a.label}</Btn>
                  ))}
                  {actions.length === 0 && <span style={{ fontSize: 11, color: T.t3 }}>—</span>}
                </div>
              </td>
            </tr>
          );
        }}
      />

      <NewWarrantyClaimModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={load}
        toast={toast}
      />
    </div>
  );
}
