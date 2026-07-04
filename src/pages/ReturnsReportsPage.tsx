import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line,
} from "recharts";
import { T, FONT } from "../theme";
import { DataTable, TC, TCMono, type Column, Btn, Select } from "../components/ui";
import { ChartTip } from "../components/ui/ChartTip";
import { GRID_PROPS, AXIS_PROPS, YAXIS_PROPS, CHART_COLORS, BAR_ANIMATION, CHART_HEIGHTS } from "../components/charts/ChartTheme";
import { getAccessToken } from "../api/client";
import {
  getSalesReturnsReport, getPurchaseReturnsReport, getExchangesReport,
  getWarrantyAgingReport, getReasonsParetoReport, getReturnRateByBrandReport,
  getInventoryAdjustmentsReport, getCreditNoteRegister, getCreditNoteRegisterExcelUrl,
} from "../api/returnsReports";

const TABS = [
  { key: "sales", label: "Sales Returns" },
  { key: "purchase", label: "Purchase Returns" },
  { key: "exchanges", label: "Exchanges" },
  { key: "warranty", label: "Warranty Aging" },
  { key: "pareto", label: "Reasons Pareto" },
  { key: "brand", label: "Return Rate by Brand" },
  { key: "adjustments", label: "Inventory Adjustments" },
  { key: "creditnotes", label: "Credit Note Register" },
] as const;
type TabKey = typeof TABS[number]["key"];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div style={{ padding: "40px 0", textAlign: "center", color: T.t3, fontSize: 13 }}>{label}</div>;
}

// ─── Sales / Purchase Returns — grouped bar with a dimension toggle ──────────
function GroupedReturnsReport({ kind }: { kind: "sales" | "purchase" }) {
  const groupOptions = kind === "sales"
    ? [{ value: "reason", label: "By reason" }, { value: "product", label: "By product" }, { value: "staff", label: "By staff" }, { value: "date", label: "By date" }]
    : [{ value: "reason", label: "By reason" }, { value: "supplier", label: "By supplier" }, { value: "resolution", label: "By resolution" }];
  const [groupBy, setGroupBy] = useState(groupOptions[0].value);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = kind === "sales" ? getSalesReturnsReport : getPurchaseReturnsReport;
    fetcher({ groupBy })
      .then((data: any) => setRows(Array.isArray(data?.rows) ? data.rows : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [kind, groupBy]);

  return (
    <ChartCard title={kind === "sales" ? "Sales Returns" : "Purchase Returns"}>
      <div style={{ marginBottom: 14 }}>
        <Select value={groupBy} onChange={setGroupBy} options={groupOptions} style={{ width: 180 }} />
      </div>
      {loading ? <EmptyState label="Loading…" /> : rows.length === 0 ? <EmptyState label="No returns in this period" /> : (
        <ResponsiveContainer width="100%" height={CHART_HEIGHTS.lg} className="chart-container">
          <BarChart data={rows.slice(0, 12)}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis {...AXIS_PROPS} dataKey="key" interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis {...YAXIS_PROPS} />
            <Tooltip content={<ChartTip />} />
            <Bar dataKey="value" name="Value returned (₹)" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} {...BAR_ANIMATION} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── Exchanges — table ────────────────────────────────────────────────────────
function ExchangesReport() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getExchangesReport().then((data: any) => setRows(Array.isArray(data?.rows) ? data.rows : [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);
  const columns: Column[] = [
    { key: "exchangeNo", label: "Exchange No", width: 150 }, { key: "old", label: "Old Part", width: 180 },
    { key: "new", label: "New Part", width: 180 }, { key: "net", label: "Net", width: 100, align: "right" },
    { key: "settlement", label: "Settlement", width: 110 },
  ];
  return (
    <DataTable columns={columns} rows={rows} loading={loading} empty="No exchanges in this period" emptyIcon="🔄"
      renderRow={(row: any, i: number) => (
        <tr key={row.exchangeNo || i} className="trow">
          <td style={TCMono}>{row.exchangeNo}</td><td style={TC}>{row.oldPart}</td><td style={TC}>{row.newPart}</td>
          <td style={{ ...TCMono, textAlign: "right" }}>₹{Math.abs(row.netAmount).toFixed(0)}</td>
          <td style={TC}>{row.settlementType}</td>
        </tr>
      )}
    />
  );
}

// ─── Warranty Aging ───────────────────────────────────────────────────────────
function WarrantyAgingReport() {
  const [data, setData] = useState<{ openClaims: any[]; avgTurnaroundDays: number | null; bySupplier: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getWarrantyAgingReport().then((d: any) => setData(d)).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);
  if (loading) return <EmptyState label="Loading…" />;
  const openClaims = data?.openClaims || [];
  const bySupplier = data?.bySupplier || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="kpi-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase" }}>Claims Open</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.t1, fontFamily: FONT.mono, marginTop: 6 }}>{openClaims.length}</div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase" }}>Avg Resolution Time</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.t1, fontFamily: FONT.mono, marginTop: 6 }}>{data?.avgTurnaroundDays != null ? `${data.avgTurnaroundDays}d` : "—"}</div>
        </div>
      </div>
      <ChartCard title="Open claims — oldest first">
        {openClaims.length === 0 ? <EmptyState label="No open claims" /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {openClaims.map((c: any) => (
              <div key={c.claimNo} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: c.daysOpen > 14 ? "#FFDAD6" : T.surfaceContainerLow }}>
                <span style={{ fontSize: 12, color: T.t1, fontFamily: FONT.mono }}>{c.claimNo}</span>
                <span style={{ fontSize: 12, color: T.t2 }}>{c.partName} · {c.supplier}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.daysOpen > 14 ? T.crimson : T.t2 }}>{c.daysOpen}d open</span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
      {bySupplier.length > 0 && (
        <ChartCard title="Turnaround by supplier">
          <ResponsiveContainer width="100%" height={CHART_HEIGHTS.md} className="chart-container">
            <BarChart data={bySupplier}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis {...AXIS_PROPS} dataKey="supplier" />
              <YAxis {...YAXIS_PROPS} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="avgTurnaroundDays" name="Avg days" fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} {...BAR_ANIMATION} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

// ─── Reasons Pareto ────────────────────────────────────────────────────────────
function ReasonsParetoReport() {
  const [type, setType] = useState<"sales" | "purchase">("sales");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    getReasonsParetoReport({ type }).then((d: any) => setRows(Array.isArray(d?.pareto) ? d.pareto : [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, [type]);
  return (
    <ChartCard title="Return Reasons — Pareto">
      <div style={{ marginBottom: 14 }}>
        <Select value={type} onChange={v => setType(v as "sales" | "purchase")} options={[{ value: "sales", label: "Sales returns" }, { value: "purchase", label: "Purchase returns" }]} style={{ width: 180 }} />
      </div>
      {loading ? <EmptyState label="Loading…" /> : rows.length === 0 ? <EmptyState label="No returns in this period" /> : (
        <ResponsiveContainer width="100%" height={CHART_HEIGHTS.lg} className="chart-container">
          <ComposedChart data={rows}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis {...AXIS_PROPS} dataKey="reason" />
            <YAxis {...YAXIS_PROPS} yAxisId="left" />
            <YAxis {...YAXIS_PROPS} yAxisId="right" orientation="right" domain={[0, 100]} />
            <Tooltip content={<ChartTip />} />
            <Bar yAxisId="left" dataKey="count" name="Count" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} {...BAR_ANIMATION} />
            <Line yAxisId="right" type="monotone" dataKey="cumulativePercent" name="Cumulative %" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── Return Rate by Brand ──────────────────────────────────────────────────────
function ReturnRateByBrandReport() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getReturnRateByBrandReport().then((d: any) => setRows(Array.isArray(d?.rows) ? d.rows : [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);
  return (
    <ChartCard title="Return Rate by Brand">
      {loading ? <EmptyState label="Loading…" /> : rows.length === 0 ? <EmptyState label="No sales in this period" /> : (
        <ResponsiveContainer width="100%" height={Math.max(CHART_HEIGHTS.lg, rows.length * 34)} className="chart-container">
          <BarChart data={rows.slice(0, 15)} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid {...GRID_PROPS} horizontal={false} />
            <XAxis {...AXIS_PROPS} type="number" unit="%" />
            <YAxis {...AXIS_PROPS} type="category" dataKey="brand" width={100} />
            <Tooltip content={<ChartTip />} />
            <Bar dataKey="returnRatePercent" name="Return rate %" fill={CHART_COLORS[3]} radius={[0, 6, 6, 0]} {...BAR_ANIMATION} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── Inventory Adjustments — table ─────────────────────────────────────────────
function InventoryAdjustmentsReport() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getInventoryAdjustmentsReport().then((d: any) => setRows(Array.isArray(d?.rows) ? d.rows : [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);
  const columns: Column[] = [
    { key: "date", label: "Date", width: 100 }, { key: "type", label: "Type", width: 150 },
    { key: "part", label: "Part", width: 180 }, { key: "qty", label: "Qty", width: 70, align: "right" },
    { key: "notes", label: "Reason", width: 200 }, { key: "approver", label: "Approver", width: 120 },
  ];
  return (
    <DataTable columns={columns} rows={rows} loading={loading} empty="No non-sale stock movements in this period" emptyIcon="📋"
      renderRow={(row: any) => (
        <tr key={row.movementId} className="trow">
          <td style={TC}>{new Date(row.createdAt).toLocaleDateString()}</td>
          <td style={TC}>{row.type.replace(/_/g, " ")}</td>
          <td style={TC}>{row.partName}</td>
          <td style={{ ...TCMono, textAlign: "right" }}>{row.qty}</td>
          <td style={TC}>{row.notes || "—"}</td>
          <td style={TC}>{row.approver}</td>
        </tr>
      )}
    />
  );
}

// ─── Credit Note Register — table + Excel export ───────────────────────────────
function CreditNoteRegisterReport() {
  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getCreditNoteRegister().then((d: any) => { setSummary(d?.summary); setRows(Array.isArray(d?.rows) ? d.rows : []); }).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch(getCreditNoteRegisterExcelUrl(), { headers: { Authorization: `Bearer ${getAccessToken()}` }, credentials: "include" });
      if (!res.ok) throw new Error("export failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = "credit_note_register.xlsx"; a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silent — user can retry; not worth a modal for a report export
    } finally {
      setExporting(false);
    }
  };

  const columns: Column[] = [
    { key: "creditNoteNo", label: "Credit Note", width: 150 }, { key: "date", label: "Date", width: 100 },
    { key: "invoice", label: "Invoice", width: 130 }, { key: "party", label: "Party", width: 130 },
    { key: "type", label: "Type", width: 100 }, { key: "amount", label: "Amount", width: 100, align: "right" },
    { key: "remaining", label: "Remaining", width: 100, align: "right" }, { key: "status", label: "Status", width: 120 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="kpi-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: 1 }}>
          <MiniStat label="Total Notes" value={summary?.totalNotes ?? "—"} />
          <MiniStat label="GST Notes" value={summary?.gstCount ?? "—"} />
          <MiniStat label="Commercial" value={summary?.commercialCount ?? "—"} />
          <MiniStat label="Outstanding" value={summary ? `₹${Number(summary.totalOutstanding).toFixed(0)}` : "—"} />
        </div>
        <Btn variant="subtle" size="sm" onClick={exportExcel} loading={exporting} style={{ marginLeft: 12 }}>⬇ Export Excel</Btn>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} empty="No credit notes in this period" emptyIcon="🧾"
        renderRow={(row: any) => (
          <tr key={row.creditNoteNo} className="trow">
            <td style={TCMono}>{row.creditNoteNo}</td><td style={TC}>{row.issueDate}</td>
            <td style={{ ...TCMono, fontSize: 12 }}>{row.invoiceNumber || "—"}</td><td style={TC}>{row.party}</td>
            <td style={TC}>{row.type}</td><td style={{ ...TCMono, textAlign: "right" }}>₹{row.totalAmount.toFixed(0)}</td>
            <td style={{ ...TCMono, textAlign: "right" }}>₹{row.remainingBalance.toFixed(0)}</td><td style={TC}>{row.status.replace(/_/g, " ")}</td>
          </tr>
        )}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, fontFamily: FONT.mono, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export function ReturnsReportsPage() {
  const [tab, setTab] = useState<TabKey>("sales");

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>Returns &amp; Warranty Reports</h1>
        <p style={{ fontSize: 13, color: T.t3, margin: "4px 0 0" }}>Aggregated views over Sales Returns, Purchase Returns, Exchanges, and Warranty Claims.</p>
      </div>

      <div className="rpt-header-actions" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
              border: `1px solid ${tab === t.key ? T.amber : T.border}`,
              background: tab === t.key ? T.amber : T.surface,
              color: tab === t.key ? "#fff" : T.t2, cursor: "pointer", fontFamily: FONT.ui,
              minHeight: 36, whiteSpace: "nowrap",
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === "sales" && <GroupedReturnsReport kind="sales" />}
      {tab === "purchase" && <GroupedReturnsReport kind="purchase" />}
      {tab === "exchanges" && <ExchangesReport />}
      {tab === "warranty" && <WarrantyAgingReport />}
      {tab === "pareto" && <ReasonsParetoReport />}
      {tab === "brand" && <ReturnRateByBrandReport />}
      {tab === "adjustments" && <InventoryAdjustmentsReport />}
      {tab === "creditnotes" && <CreditNoteRegisterReport />}
    </div>
  );
}
