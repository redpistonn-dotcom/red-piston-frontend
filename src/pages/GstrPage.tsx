/**
 * GstrPage — GSTR-1 Export
 *
 * Lets shop owners select a date range (month / quarter / custom), preview
 * B2B invoices or HSN summaries, and download GSTR-1 data as Excel or JSON.
 *
 * API:
 *   GET /api/billing/gstr1?from=YYYY-MM-DD&to=YYYY-MM-DD&format=excel|json|preview
 *
 * Auth: same Bearer token as all other pages (via api.get / raw fetch with
 * Authorization header for the binary Excel download).
 */
import { useState, useCallback, useEffect } from "react";
import { T, FONT, SHADOWS } from "../theme";
import { fmt } from "../utils";
import { api, getAccessToken, BASE_URL } from "../api/client.js";
import { getGstPeriodLocks, lockGstPeriod, unlockGstPeriod, type GstPeriodLock } from "../api/gstPeriods";

// ── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** First day of the current month */
function firstOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return toDateStr(d);
}

/** Last day of the current month */
function lastOfMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toDateStr(d);
}

/** Quarter boundaries (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec) */
function currentQuarter(): { from: string; to: string } {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const from = new Date(now.getFullYear(), q * 3, 1);
  const to   = new Date(now.getFullYear(), q * 3 + 3, 0);
  return { from: toDateStr(from), to: toDateStr(to) };
}

// ── types ─────────────────────────────────────────────────────────────────────

interface B2BRow {
  invoiceNo: string;
  invoiceDate: string;
  partyName: string;
  gstin?: string;
  taxableAmount: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  totalAmount: number;
}

interface HsnRow {
  hsnCode: string;
  description: string;
  uom: string;
  qty: number;
  taxableAmount: number;
  igstRate?: number;
  igst?: number;
  cgstRate?: number;
  cgst?: number;
  sgstRate?: number;
  sgst?: number;
}

interface B2CSRow {
  supplyType: string;
  eCommerceGstin?: string;
  rate: number;
  taxableAmount: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  cesAmount?: number;
}

interface CreditNoteRow {
  gstin?: string | null;
  noteNumber: string;
  noteDate: string;
  originalInvoiceNumber?: string | null;
  originalInvoiceDate?: string | null;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
}

// ── PERIOD PRESETS ────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "This Month", get: () => ({ from: firstOfMonth(), to: lastOfMonth() }) },
  { label: "This Quarter", get: currentQuarter },
  { label: "Custom", get: () => ({ from: firstOfMonth(), to: lastOfMonth() }) },
] as const;

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export function GstrPage() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [customFrom, setCustomFrom] = useState(firstOfMonth);
  const [customTo,   setCustomTo]   = useState(lastOfMonth);

  const [previewMode, setPreviewMode]   = useState<"b2b" | "hsn" | "b2cs" | "credit-notes" | null>(null);
  const [previewData, setPreviewData]   = useState<B2BRow[] | HsnRow[] | CreditNoteRow[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError]   = useState("");
  const [cnSummary, setCnSummary] = useState<{ taxableValue: number; cgst: number; sgst: number; igst: number; totalAmount: number } | null>(null);

  const [downloadMsg, setDownloadMsg] = useState("");

  // ── GST period locking ──────────────────────────────────────────────────────
  const [locks, setLocks] = useState<GstPeriodLock[]>([]);
  const [lockPeriod, setLockPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [lockBusy, setLockBusy] = useState(false);
  const [lockError, setLockError] = useState("");

  const loadLocks = useCallback(() => {
    getGstPeriodLocks().then(res => setLocks(res.locks || [])).catch(() => {});
  }, []);
  useEffect(() => { loadLocks(); }, [loadLocks]);

  const toggleLock = useCallback(async (period: string, currentlyLocked: boolean) => {
    setLockBusy(true);
    setLockError("");
    try {
      if (currentlyLocked) await unlockGstPeriod(period);
      else await lockGstPeriod(period);
      loadLocks();
    } catch (e: any) {
      setLockError(e?.message || "Could not update the lock");
    } finally {
      setLockBusy(false);
    }
  }, [loadLocks]);

  // Resolve active date range from the chosen preset or custom inputs
  const dateRange = (() => {
    if (presetIdx === 2) return { from: customFrom, to: customTo };
    return PRESETS[presetIdx].get();
  })();

  // ── Preview ──────────────────────────────────────────────────────────────────

  const fetchPreview = useCallback(async (mode: "b2b" | "hsn" | "b2cs" | "credit-notes") => {
    setPreviewMode(mode);
    setPreviewData(null);
    setCnSummary(null);
    setPreviewError("");
    setPreviewLoading(true);
    try {
      if (mode === "credit-notes") {
        const res: any = await api.get("/api/billing/gstr1/credit-notes", { from: dateRange.from, to: dateRange.to, format: "json" });
        setPreviewData(res?.rows || []);
        setCnSummary(res?.summary || null);
        setPreviewLoading(false);
        return;
      }
      // Backend returns { success, period, invoiceCount, b2b, b2cs, hsn } for format=json.
      // "preview" is not a recognised format value — use json and extract the relevant section.
      const res: any = await api.get("/api/billing/gstr1", {
        from: dateRange.from,
        to: dateRange.to,
        format: "json",
      });
      let rows: any[];
      if (mode === "b2b") {
        rows = (res?.b2b || []).map((r: any) => ({
          invoiceNo:     r.invoiceNumber,
          invoiceDate:   r.date,
          partyName:     r.partyName || r.gstin || "—",
          gstin:         r.gstin,
          taxableAmount: r.taxableValue,
          cgst:          r.cgst,
          sgst:          r.sgst,
          igst:          r.igst ?? 0,
          totalAmount:   r.invoiceValue,
        }));
      } else if (mode === "b2cs") {
        rows = (res?.b2cs || []).map((r: any) => ({
          supplyType: r.supplyType || "OE",
          rate: r.rate ?? 0,
          taxableAmount: r.taxableValue ?? r.taxableAmount ?? 0,
          igst: r.igst,
          cgst: r.cgst,
          sgst: r.sgst,
        }));
      } else {
        rows = (res?.hsn || []).map((r: any) => ({
          hsnCode:       r.hsnCode,
          description:   r.description,
          uom:           r.uqc || "NOS",
          qty:           r.qty,
          taxableAmount: r.taxableValue,
          cgst:          r.cgst,
          sgst:          r.sgst,
        }));
      }
      setPreviewData(rows);
    } catch (e: any) {
      setPreviewError(e?.message || "Failed to load preview. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  }, [dateRange.from, dateRange.to]);

  // ── Download ─────────────────────────────────────────────────────────────────

  const download = useCallback(async (format: "excel" | "json") => {
    const params = new URLSearchParams({
      from: dateRange.from,
      to: dateRange.to,
      format,
    });
    const url = `${BASE_URL}/api/billing/gstr1?${params}`;

    if (format === "json") {
      // JSON: open in new tab (browser will show or download)
      window.open(url, "_blank");
      return;
    }

    // Excel: fetch as blob so we can attach auth header
    setDownloadMsg("Preparing Excel…");
    try {
      const token = getAccessToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `GSTR1_${dateRange.from}_${dateRange.to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(objUrl); a.remove(); }, 2000);
      setDownloadMsg("Downloaded!");
    } catch (e: any) {
      setDownloadMsg("Download failed: " + (e?.message || "Unknown error"));
    } finally {
      setTimeout(() => setDownloadMsg(""), 4000);
    }
  }, [dateRange.from, dateRange.to]);

  const downloadCreditNotes = useCallback(async (format: "excel" | "json") => {
    const params = new URLSearchParams({ from: dateRange.from, to: dateRange.to, format });
    const url = `${BASE_URL}/api/billing/gstr1/credit-notes?${params}`;

    if (format === "json") {
      window.open(url, "_blank");
      return;
    }

    setDownloadMsg("Preparing Excel…");
    try {
      const token = getAccessToken();
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `GSTR1_9B_CreditNotes_${dateRange.from}_${dateRange.to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(objUrl); a.remove(); }, 2000);
      setDownloadMsg("Downloaded!");
    } catch (e: any) {
      setDownloadMsg("Download failed: " + (e?.message || "Unknown error"));
    } finally {
      setTimeout(() => setDownloadMsg(""), 4000);
    }
  }, [dateRange.from, dateRange.to]);

  // ── render helpers ────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "7px 11px",
    fontSize: 13, fontFamily: FONT.ui, color: T.t1, background: "#fff",
    outline: "none", cursor: "pointer",
  };

  const btnBase: React.CSSProperties = {
    border: "none", borderRadius: 10, padding: "10px 20px",
    fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui,
    transition: "opacity 0.15s",
  };

  // ── preview table renderers ───────────────────────────────────────────────────

  const renderB2B = (rows: B2BRow[]) => (
    <div style={{ overflowX: "auto", marginTop: 16 }}>
      <div style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>{rows.length} invoice{rows.length !== 1 ? "s" : ""}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: T.surfaceContainerLow }}>
            {["Invoice No", "Date", "Party / GSTIN", "Taxable", "CGST", "SGST", "IGST", "Total"].map(h => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: T.t2, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono, fontWeight: 600 }}>{r.invoiceNo}</td>
              <td style={{ padding: "8px 12px", color: T.t3 }}>{r.invoiceDate}</td>
              <td style={{ padding: "8px 12px" }}>
                <div style={{ fontWeight: 600 }}>{r.partyName}</div>
                {r.gstin && <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono }}>{r.gstin}</div>}
              </td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{fmt(r.taxableAmount)}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{r.cgst != null ? fmt(r.cgst) : "—"}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{r.sgst != null ? fmt(r.sgst) : "—"}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{r.igst != null ? fmt(r.igst) : "—"}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono, fontWeight: 700, color: T.amber }}>{fmt(r.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderHsn = (rows: HsnRow[]) => (
    <div style={{ overflowX: "auto", marginTop: 16 }}>
      <div style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>{rows.length} HSN entr{rows.length !== 1 ? "ies" : "y"}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: T.surfaceContainerLow }}>
            {["HSN Code", "Description", "UOM", "Qty", "Taxable", "CGST %", "SGST %", "IGST %", "Total Tax"].map(h => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: T.t2, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono, fontWeight: 600 }}>{r.hsnCode}</td>
              <td style={{ padding: "8px 12px" }}>{r.description}</td>
              <td style={{ padding: "8px 12px", color: T.t3 }}>{r.uom}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{r.qty}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{fmt(r.taxableAmount)}</td>
              <td style={{ padding: "8px 12px", color: T.t3 }}>{r.cgstRate != null ? `${r.cgstRate}%` : "—"}</td>
              <td style={{ padding: "8px 12px", color: T.t3 }}>{r.sgstRate != null ? `${r.sgstRate}%` : "—"}</td>
              <td style={{ padding: "8px 12px", color: T.t3 }}>{r.igstRate != null ? `${r.igstRate}%` : "—"}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono, fontWeight: 700 }}>
                {fmt((r.cgst ?? 0) + (r.sgst ?? 0) + (r.igst ?? 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderB2CS = (rows: B2CSRow[]) => (
    <div style={{ overflowX: "auto", marginTop: 16 }}>
      <div style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>{rows.length} B2C entr{rows.length !== 1 ? "ies" : "y"} (unregistered buyers)</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: T.surfaceContainerLow }}>
            {["Supply Type", "GST Rate", "Taxable", "CGST", "SGST", "IGST"].map(h => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: T.t2, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: "8px 12px", fontWeight: 600 }}>{r.supplyType}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{r.rate}%</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{fmt(r.taxableAmount)}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{r.cgst != null ? fmt(r.cgst) : "—"}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{r.sgst != null ? fmt(r.sgst) : "—"}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{r.igst != null ? fmt(r.igst) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCreditNotes = (rows: CreditNoteRow[]) => (
    <div style={{ overflowX: "auto", marginTop: 16 }}>
      <div style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>
        {rows.length} GST credit note{rows.length !== 1 ? "s" : ""} — commercial-only notes are excluded (never affect GST returns)
      </div>
      {cnSummary && (
        <div style={{ display: "flex", gap: 16, marginBottom: 12, padding: "10px 14px", background: T.surfaceContainerLow, borderRadius: 10, fontSize: 12 }}>
          <span>Taxable: <strong style={{ fontFamily: FONT.mono }}>{fmt(cnSummary.taxableValue)}</strong></span>
          <span>CGST: <strong style={{ fontFamily: FONT.mono }}>{fmt(cnSummary.cgst)}</strong></span>
          <span>SGST: <strong style={{ fontFamily: FONT.mono }}>{fmt(cnSummary.sgst)}</strong></span>
          <span>Total (3.1(a) adjustment): <strong style={{ fontFamily: FONT.mono, color: T.amber }}>{fmt(cnSummary.totalAmount)}</strong></span>
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: T.surfaceContainerLow }}>
            {["Credit Note No", "Date", "Original Invoice", "GSTIN", "Taxable", "CGST", "SGST", "Total"].map(h => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: T.t2, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono, fontWeight: 600 }}>{r.noteNumber}</td>
              <td style={{ padding: "8px 12px", color: T.t3 }}>{r.noteDate}</td>
              <td style={{ padding: "8px 12px" }}>{r.originalInvoiceNumber || "—"}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono, color: T.t3 }}>{r.gstin || "—"}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{fmt(r.taxableValue)}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{fmt(r.cgst)}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono }}>{fmt(r.sgst)}</td>
              <td style={{ padding: "8px 12px", fontFamily: FONT.mono, fontWeight: 700, color: T.amber }}>{fmt(r.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── JSX ───────────────────────────────────────────────────────────────────────

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>

      {/* Page header */}
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.t1, fontFamily: FONT.display, letterSpacing: "-0.03em" }}>
          GSTR-1 Export
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.t3 }}>
          Preview B2B invoices and HSN summaries, or download in Excel / JSON format for filing.
        </p>
      </div>

      {/* Date range selection card */}
      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: SHADOWS.xs }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
          Select Period
        </div>

        {/* Preset pills */}
        <div style={{ display: "flex", background: T.surfaceContainerHigh, borderRadius: 8, padding: 3, gap: 2, marginBottom: 16, width: "fit-content" }}>
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => setPresetIdx(i)} style={{
              padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: presetIdx === i ? 700 : 400,
              background: presetIdx === i ? "#FFFFFF" : "transparent",
              color: presetIdx === i ? "#8B1E1E" : T.t3,
              boxShadow: presetIdx === i ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s", fontFamily: FONT.ui,
            }}>{p.label}</button>
          ))}
        </div>

        {/* Custom date inputs */}
        {presetIdx === 2 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: T.t3 }}>From</label>
            <input type="date" value={customFrom} max={customTo}
              onChange={e => setCustomFrom(e.target.value)} style={inputStyle} />
            <label style={{ fontSize: 12, color: T.t3 }}>To</label>
            <input type="date" value={customTo} min={customFrom} max={toDateStr(new Date())}
              onChange={e => setCustomTo(e.target.value)} style={inputStyle} />
          </div>
        )}

        {/* Active range label */}
        <div style={{ fontSize: 12, color: T.t3, marginBottom: 20 }}>
          Active range: <strong style={{ color: T.t1 }}>{dateRange.from}</strong> → <strong style={{ color: T.t1 }}>{dateRange.to}</strong>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => fetchPreview("b2b")}
            style={{ ...btnBase, background: "#8B1E1E", color: "#fff" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Preview B2B
          </button>

          <button
            onClick={() => fetchPreview("hsn")}
            style={{ ...btnBase, background: T.sky, color: "#fff" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Preview HSN Summary
          </button>

          <button
            onClick={() => fetchPreview("b2cs")}
            style={{ ...btnBase, background: T.amber, color: "#fff" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Preview B2CS
          </button>

          <button
            onClick={() => fetchPreview("credit-notes")}
            style={{ ...btnBase, background: T.violet, color: "#fff" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Preview Credit Notes (9B)
          </button>

          <div style={{ width: 1, height: 28, background: T.border, margin: "0 4px" }} />

          <button
            onClick={() => download("excel")}
            style={{ ...btnBase, background: T.emerald, color: "#fff" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Download Excel
          </button>

          <button
            onClick={() => download("json")}
            style={{ ...btnBase, background: T.violet, color: "#fff" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Download JSON
          </button>

          <div style={{ width: 1, height: 28, background: T.border, margin: "0 4px" }} />

          <button
            onClick={() => downloadCreditNotes("excel")}
            style={{ ...btnBase, background: "transparent", color: T.violet, border: `1.5px solid ${T.violet}` }}
          >
            Download Credit Notes (Excel)
          </button>

          {downloadMsg && (
            <span style={{
              fontSize: 12, color: downloadMsg.startsWith("Download failed") ? T.crimson : T.emerald,
              fontWeight: 600,
            }}>{downloadMsg}</span>
          )}
        </div>
      </div>

      {/* Preview panel */}
      {previewMode && (
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: SHADOWS.xs }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.display }}>
              {previewMode === "b2b" ? "B2B Invoice Preview" : previewMode === "b2cs" ? "B2CS Preview" : previewMode === "credit-notes" ? "Credit Notes (Table 9B) Preview" : "HSN Summary Preview"}
            </div>
            <button
              onClick={() => { setPreviewMode(null); setPreviewData(null); setPreviewError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.t3, lineHeight: 1 }}
            >×</button>
          </div>

          {previewLoading && (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: T.t3 }}>Loading preview…</div>
            </div>
          )}

          {previewError && (
            <div style={{
              marginTop: 12, padding: "12px 16px",
              background: "rgba(186,26,26,0.06)", border: "1px solid rgba(186,26,26,0.2)",
              borderRadius: 10, fontSize: 13, color: T.crimson,
            }}>{previewError}</div>
          )}

          {!previewLoading && !previewError && previewData !== null && previewData.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: T.t3 }}>
              No records found for this period.
            </div>
          )}

          {!previewLoading && !previewError && previewData && previewData.length > 0 && (
            previewMode === "b2b"
              ? renderB2B(previewData as B2BRow[])
              : previewMode === "hsn"
              ? renderHsn(previewData as HsnRow[])
              : previewMode === "credit-notes"
              ? renderCreditNotes(previewData as CreditNoteRow[])
              : null
          )}
          {previewMode === "b2cs" && Array.isArray(previewData) && renderB2CS(previewData as B2CSRow[])}
        </div>
      )}

      {/* GST period locking */}
      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: SHADOWS.xs }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          GST Period Locking
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: T.t3 }}>
          Once a month is filed/reconciled, lock it — any new return's credit note that would otherwise declare into a locked period is automatically kept commercial-only instead of adjusting GST.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input type="month" value={lockPeriod} onChange={e => setLockPeriod(e.target.value)} style={inputStyle} />
          {(() => {
            const isLocked = locks.some(l => l.period === lockPeriod);
            return (
              <button
                onClick={() => toggleLock(lockPeriod, isLocked)}
                disabled={lockBusy}
                style={{ ...btnBase, background: isLocked ? "transparent" : T.crimson, color: isLocked ? T.crimson : "#fff", border: isLocked ? `1.5px solid ${T.crimson}` : "none", opacity: lockBusy ? 0.6 : 1 }}
              >
                {isLocked ? "Unlock period" : "Lock period"}
              </button>
            );
          })()}
          {lockError && <span style={{ fontSize: 12, color: T.crimson, fontWeight: 600 }}>{lockError}</span>}
        </div>
        {locks.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {locks.map(l => (
              <span key={l.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: "rgba(190,43,26,0.08)", color: T.crimson, fontSize: 12, fontWeight: 600, fontFamily: FONT.mono }}>
                🔒 {l.period}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GstrPage;
