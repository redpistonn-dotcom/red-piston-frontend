/**
 * InvoiceModal — GST service bill generated from a workshop job card.
 *
 * Shows a print-ready tax invoice (parts + labour + CGST/SGST) and lets the
 * shop owner: Print, Download as PDF (jsPDF), or Share on WhatsApp.
 * No customer mobile number is rendered anywhere; the WhatsApp recipient number
 * (when known) is only used to build the wa.me URL, never displayed.
 */
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { buildInvoice, invoiceWhatsAppText, fmtINR, pdfINR, type InvoiceModel } from "../utils/invoice";
import type { AppUser } from "../types";

const ACCENT = "#8B1E1E";
const INK = "#1A1A1A";
const MUTE = "#6B6B6B";
const LINE = "#E4E0DC";

interface Props {
  job: any;
  user: AppUser | null;
  /** Optional recipient phone (digits ok) — used only for the wa.me URL. */
  customerPhone?: string;
  onClose: () => void;
}

// ─── Print: clean standalone HTML in a new window ───────────────────────────────
function printInvoice(m: InvoiceModel) {
  const rows = m.lines
    .map(
      (l, i) => `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${escapeHtml(l.description)}</td>
        <td style="text-align:center">${l.qty}</td>
        <td style="text-align:right">${fmtINR(l.rate)}</td>
        <td style="text-align:right">${fmtINR(l.amount)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${m.invoiceNo}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:${INK};margin:0;padding:32px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${ACCENT};padding-bottom:16px}
    .shop{font-size:22px;font-weight:800;color:${ACCENT}}
    .muted{color:${MUTE};font-size:12px;line-height:1.5}
    .title{font-size:20px;font-weight:800;letter-spacing:.08em;text-align:right}
    .meta{font-size:12px;text-align:right;margin-top:6px;line-height:1.6}
    .bill{margin:18px 0;font-size:13px}
    .bill b{display:block;font-size:11px;color:${MUTE};text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
    table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
    th{background:${ACCENT};color:#fff;text-align:left;padding:8px 10px;font-size:12px}
    td{padding:8px 10px;border-bottom:1px solid ${LINE}}
    .tot{width:280px;margin-left:auto;margin-top:14px;font-size:13px}
    .tot div{display:flex;justify-content:space-between;padding:4px 0}
    .tot .grand{border-top:2px solid ${ACCENT};margin-top:6px;padding-top:8px;font-weight:800;font-size:16px;color:${ACCENT}}
    .words{margin-top:14px;font-size:12px;font-style:italic;color:${MUTE}}
    .foot{margin-top:28px;border-top:1px solid ${LINE};padding-top:10px;font-size:11px;color:${MUTE};display:flex;justify-content:space-between}
  </style></head><body>
    <div class="top">
      <div>
        <div class="shop">${escapeHtml(m.shop.name)}</div>
        <div class="muted">${escapeHtml(m.shop.address)}</div>
        ${m.shop.gstin ? `<div class="muted">GSTIN: ${escapeHtml(m.shop.gstin)}</div>` : ""}
        ${m.shop.phone ? `<div class="muted">Ph: ${escapeHtml(m.shop.phone)}</div>` : ""}
      </div>
      <div>
        <div class="title">TAX INVOICE</div>
        <div class="meta">Invoice No: <b>${escapeHtml(m.invoiceNo)}</b><br/>Date: ${m.dateStr}</div>
      </div>
    </div>
    <div class="bill">
      <b>Bill To</b>
      ${escapeHtml(m.customer.name)}<br/>
      Vehicle: ${escapeHtml(m.customer.vehicle)}
      ${m.jobNumber ? `<br/>Job Card: ${escapeHtml(m.jobNumber)}` : ""}
    </div>
    <table>
      <thead><tr><th style="width:34px;text-align:center">#</th><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5" style="text-align:center;color:${MUTE}">No line items</td></tr>`}</tbody>
    </table>
    <div class="tot">
      <div><span>Subtotal</span><span>${fmtINR(m.subTotal)}</span></div>
      <div><span>CGST (${m.gstRate / 2}%)</span><span>${fmtINR(m.cgst)}</span></div>
      <div><span>SGST (${m.gstRate / 2}%)</span><span>${fmtINR(m.sgst)}</span></div>
      <div class="grand"><span>Total</span><span>${fmtINR(m.total)}</span></div>
    </div>
    <div class="words">Amount in words: ${escapeHtml(m.amountWords)}</div>
    <div class="foot"><span>This is a computer-generated invoice.</span><span>Authorised Signatory</span></div>
    <script>window.onload=function(){window.print();}</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) { alert("Please allow pop-ups to print the invoice."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ─── Download: real .pdf via jsPDF + autotable (lazy-loaded on demand) ──────────
async function downloadPDF(m: InvoiceModel) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 40;
  const R = 555;

  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(139, 30, 30);
  doc.text(m.shop.name, M, 50);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(80);
  let y = 66;
  doc.text(m.shop.address, M, y);
  if (m.shop.gstin) { y += 12; doc.text(`GSTIN: ${m.shop.gstin}`, M, y); }
  if (m.shop.phone) { y += 12; doc.text(`Ph: ${m.shop.phone}`, M, y); }

  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(20);
  doc.text("TAX INVOICE", R, 50, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(80);
  doc.text(`Invoice No: ${m.invoiceNo}`, R, 66, { align: "right" });
  doc.text(`Date: ${m.dateStr}`, R, 78, { align: "right" });

  y = Math.max(y, 78) + 24;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(120);
  doc.text("BILL TO", M, y);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(20);
  y += 14; doc.text(m.customer.name, M, y);
  y += 12; doc.text(`Vehicle: ${m.customer.vehicle}`, M, y);
  if (m.jobNumber) { y += 12; doc.text(`Job Card: ${m.jobNumber}`, M, y); }

  autoTable(doc, {
    startY: y + 16,
    head: [["#", "Description", "Qty", "Rate", "Amount"]],
    body: m.lines.map((l, i) => [String(i + 1), l.description, String(l.qty), pdfINR(l.rate), pdfINR(l.amount)]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [139, 30, 30], halign: "left" },
    columnStyles: { 0: { cellWidth: 26, halign: "center" }, 2: { halign: "center", cellWidth: 44 }, 3: { halign: "right", cellWidth: 80 }, 4: { halign: "right", cellWidth: 90 } },
    margin: { left: M, right: M },
  });

  let fy = ((doc as any).lastAutoTable?.finalY || y + 40) + 18;
  const lx = 360;
  const totLine = (label: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(bold ? 12 : 10).setTextColor(bold ? 139 : 40, bold ? 30 : 40, bold ? 30 : 40);
    doc.text(label, lx, fy);
    doc.text(val, R, fy, { align: "right" });
    fy += bold ? 18 : 15;
  };
  totLine("Subtotal", pdfINR(m.subTotal));
  totLine(`CGST (${m.gstRate / 2}%)`, pdfINR(m.cgst));
  totLine(`SGST (${m.gstRate / 2}%)`, pdfINR(m.sgst));
  doc.setDrawColor(139, 30, 30).line(lx, fy - 6, R, fy - 6);
  totLine("Total", pdfINR(m.total), true);

  fy += 6;
  doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(100);
  doc.text(`Amount in words: ${m.amountWords}`, M, fy, { maxWidth: R - M });

  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(140);
  doc.text("This is a computer-generated invoice.", M, 800);
  doc.text("Authorised Signatory", R, 800, { align: "right" });

  doc.save(`${m.invoiceNo}.pdf`);
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export default function InvoiceModal({ job, user, customerPhone, onClose }: Props) {
  const m = useMemo(() => buildInvoice(job, user), [job, user]);

  const shareWhatsApp = () => {
    const digits = (customerPhone || "").replace(/\D/g, "");
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(invoiceWhatsAppText(m))}`;
    window.open(url, "_blank", "noopener");
  };

  const btn = (bg: string): React.CSSProperties => ({
    height: 40, padding: "0 18px", borderRadius: 9, border: "none", background: bg,
    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex",
    alignItems: "center", gap: 7,
  });

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,12,12,0.55)", zIndex: 2147483647, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflowY: "auto" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "min(760px,100%)", maxWidth: 760, boxShadow: "0 24px 70px rgba(0,0,0,0.4)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: ACCENT, color: "#fff", padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.04em" }}>TAX INVOICE</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{m.invoiceNo} • {m.dateStr}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 24px", maxHeight: "calc(100vh - 230px)", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ minWidth: 220 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: ACCENT }}>{m.shop.name}</div>
              <div style={{ fontSize: 12, color: MUTE, lineHeight: 1.5, marginTop: 3 }}>{m.shop.address}</div>
              {m.shop.gstin && <div style={{ fontSize: 12, color: MUTE }}>GSTIN: {m.shop.gstin}</div>}
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: INK }}>
              <div style={{ fontSize: 11, color: MUTE, textTransform: "uppercase", letterSpacing: "0.06em" }}>Bill To</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{m.customer.name}</div>
              <div style={{ color: MUTE }}>Vehicle: {m.customer.vehicle}</div>
              {m.jobNumber && <div style={{ color: MUTE }}>Job: {m.jobNumber}</div>}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#FAF6F4", color: INK }}>
                <th style={th(34, "center")}>#</th>
                <th style={th(0, "left")}>Description</th>
                <th style={th(54, "center")}>Qty</th>
                <th style={th(90, "right")}>Rate</th>
                <th style={th(100, "right")}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {m.lines.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: MUTE, padding: 16 }}>No line items</td></tr>
              ) : m.lines.map((l, i) => (
                <tr key={i}>
                  <td style={td("center")}>{i + 1}</td>
                  <td style={td("left")}>{l.description}{l.kind === "labour" && <span style={{ fontSize: 10, color: MUTE, marginLeft: 6 }}>(service)</span>}</td>
                  <td style={td("center")}>{l.qty}</td>
                  <td style={td("right")}>{fmtINR(l.rate)}</td>
                  <td style={{ ...td("right"), fontWeight: 600 }}>{fmtINR(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ width: 280, marginLeft: "auto", marginTop: 14, fontSize: 13 }}>
            {totRow("Subtotal", fmtINR(m.subTotal))}
            {totRow(`CGST (${m.gstRate / 2}%)`, fmtINR(m.cgst))}
            {totRow(`SGST (${m.gstRate / 2}%)`, fmtINR(m.sgst))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${ACCENT}`, marginTop: 6, paddingTop: 8, fontWeight: 800, fontSize: 16, color: ACCENT }}>
              <span>Total</span><span>{fmtINR(m.total)}</span>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, fontStyle: "italic", color: MUTE }}>
            Amount in words: {m.amountWords}
          </div>
        </div>

        {/* Actions */}
        <div style={{ borderTop: `1px solid ${LINE}`, padding: "14px 22px", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...btn("#fff"), color: MUTE, border: `1px solid ${LINE}` }}>Close</button>
          <button onClick={shareWhatsApp} style={btn("#25D366")}>WhatsApp</button>
          <button onClick={() => printInvoice(m)} style={btn("#475569")}>Print</button>
          <button onClick={() => { downloadPDF(m).catch(() => alert("Could not generate PDF — use Print → Save as PDF instead.")); }} style={btn(ACCENT)}>Download PDF</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function th(width: number, align: "left" | "center" | "right"): React.CSSProperties {
  return { padding: "9px 10px", textAlign: align, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: MUTE, borderBottom: `2px solid ${LINE}`, width: width || undefined };
}
function td(align: "left" | "center" | "right"): React.CSSProperties {
  return { padding: "9px 10px", textAlign: align, borderBottom: `1px solid ${LINE}`, color: INK };
}
function totRow(label: string, val: string) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: MUTE }}>
      <span>{label}</span><span style={{ color: INK, fontWeight: 600 }}>{val}</span>
    </div>
  );
}
