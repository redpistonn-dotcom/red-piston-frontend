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
  /** Fired when the invoice is issued (Print / Download / WhatsApp) — used to
   *  mark the job card as invoiced so it appears in History with the invoice no. */
  onInvoiced?: () => void;
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

// ─── Build the invoice PDF (jsPDF, lazy-loaded). Shared by Download + WhatsApp ──
async function buildInvoiceDoc(m: InvoiceModel) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 40, R = 555, W = R - M;
  doc.setDrawColor(0, 0, 0).setLineWidth(0.5);

  // Title row
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(0, 0, 0);
  doc.text("TAX INVOICE", M + W / 2, 45, { align: "center" });

  // Main Header Box (Top 55 to 155)
  const topY = 55, hdrH = 100;
  doc.rect(M, topY, W, hdrH);
  const midX = M + 210;
  doc.line(midX, topY, midX, topY + hdrH);

  // Left Seller Info
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text(m.shop.name || "Shri Mahesh Automobiles", M + 6, topY + 16);
  doc.setFont("helvetica", "normal").setFontSize(8);
  let sy = topY + 30;
  if (m.shop.address) {
    const lines = doc.splitTextToSize(String(m.shop.address), midX - M - 12);
    doc.text(lines, M + 6, sy); sy += lines.length * 10;
  }
  if (m.shop.phone) { doc.text(`Ph : ${m.shop.phone}`, M + 6, sy); sy += 11; }
  if (m.shop.gstin) { doc.text(`GSTIN/UIN : ${m.shop.gstin}`, M + 6, sy); sy += 11; }

  // Right Invoice Fields Grid (4 rows inside right box)
  const rowH = hdrH / 4;
  for (let i = 1; i < 4; i++) {
    doc.line(midX, topY + i * rowH, R, topY + i * rowH);
  }
  const valX = midX + 80;
  doc.line(valX, topY, valX, topY + hdrH);

  const drawField = (idx: number, label: string, val: string) => {
    const fy = topY + idx * rowH + 16;
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.text(label, midX + 6, fy);
    doc.setFont("helvetica", "normal");
    doc.text(val || "—", valX + 6, fy);
  };
  drawField(0, "Invoice No.", m.invoiceNo || "—");
  drawField(1, "Dated", m.dateStr || "—");
  drawField(2, "Job Card No.", m.jobNumber ? `#JC-${m.jobNumber}` : "—");
  drawField(3, "Mode of Payment", "CASH / UPI / CARD");

  // Buyer Block (Bill to) Box (Top 155 to 220)
  const buyY = topY + hdrH, buyH = 65;
  doc.rect(M, buyY, W, buyH);
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("Buyer (Bill to) / Customer Details :", M + 6, buyY + 14);
  doc.setFont("helvetica", "normal").setFontSize(8);
  let by = buyY + 26;
  if (m.customer.name) {
    doc.text(`Name : ${m.customer.name}${m.customer.phone ? `  (Ph: ${m.customer.phone})` : ""}`, M + 6, by); by += 11;
  }
  if (m.customer.address) {
    const alines = doc.splitTextToSize(`Address : ${m.customer.address}`, W - 12);
    doc.text(alines, M + 6, by); by += alines.length * 10;
  }
  if (m.customer.vehicle) { doc.text(`Vehicle No : ${m.customer.vehicle}`, M + 6, by); by += 11; }

  // Table
  const totalQty = m.lines.reduce((acc, l) => acc + Number(l.qty || 0), 0);
  autoTable(doc, {
    startY: buyY + buyH + 8,
    head: [["Sl No.", "Description of Goods / Services", "HSN/SAC", "Quantity", "Rate (Incl. Tax)", "Rate", "per", "Disc %", "Amount"]],
    body: m.lines.map((l, i) => [
      String(i + 1), l.description, "9987", `${l.qty} NOS`, pdfINR(l.rate), pdfINR(l.rate), "NOS", "—", pdfINR(l.amount)
    ]),
    foot: [
      [
        { content: "Total", colSpan: 3, styles: { fontStyle: "bold", halign: "left" } },
        { content: `${totalQty} NOS`, styles: { fontStyle: "bold", halign: "center" } },
        "", "", "", "",
        { content: pdfINR(m.total), styles: { fontStyle: "bold", halign: "right" } }
      ]
    ],
    styles: { fontSize: 8, cellPadding: 4, textColor: [0, 0, 0], lineWidth: 0.5, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.5, lineColor: [0, 0, 0] },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.5, lineColor: [0, 0, 0] },
    margin: { left: M, right: M },
  });

  let fy = ((doc as any).lastAutoTable?.finalY || (buyY + buyH + 40)) + 12;
  const lx = 340;
  const totLine = (label: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(bold ? 11 : 9).setTextColor(0, 0, 0);
    doc.text(label, lx, fy); doc.text(val, R, fy, { align: "right" }); fy += bold ? 16 : 13;
  };
  totLine("Subtotal", pdfINR(m.subTotal));
  totLine(`CGST (${m.gstRate / 2}%)`, pdfINR(m.cgst));
  totLine(`SGST (${m.gstRate / 2}%)`, pdfINR(m.sgst));
  fy += 4;
  doc.line(lx, fy, R, fy);
  fy += 16;
  totLine("TOTAL AMOUNT", pdfINR(m.total), true);
  fy += 8;

  // Amount in words
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(80, 80, 80);
  doc.text("Amount Chargeable (in words)", M, fy);
  doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(0, 0, 0);
  doc.text(m.amountWords || `INR ${Math.round(m.total).toLocaleString("en-IN")} Only`, M, fy + 12, { maxWidth: lx - M - 10 });
  doc.text("E. & O.E", R, fy + 12, { align: "right" });

  // Declaration & Signature Boxes matching Screenshot 1 exactly
  fy += 26;
  const decH = 65, midBox = M + (W * 0.55);
  doc.rect(M, fy, W, decH);
  doc.line(midBox, fy, midBox, fy + decH);

  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("Declaration", M + 6, fy + 14);
  doc.setFont("helvetica", "italic").setFontSize(7).setTextColor(80, 80, 80);
  doc.text("1. GOODS ONCE SOLD NOT TAKEN BACK", M + 6, fy + 26);
  doc.text("We declare that this tax invoice shows the actual value of\ngoods/services and that all particulars are true and correct.", M + 6, fy + 38);

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
  doc.text(`for ${m.shop.name || "Shri Mahesh Automobiles"}`, R - 6, fy + 14, { align: "right" });
  doc.text("Authorised Signatory", R - 6, fy + decH - 10, { align: "right" });

  return doc;
}

async function downloadPDF(m: InvoiceModel) {
  const doc = await buildInvoiceDoc(m);
  doc.save(`${m.invoiceNo}.pdf`);
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export default function InvoiceModal({ job, user, customerPhone, onInvoiced, onClose }: Props) {
  const m = useMemo(() => buildInvoice(job, user), [job, user]);

  const shareWhatsApp = async () => {
    const text = invoiceWhatsAppText(m);
    // Best path (mobile): share the actual invoice PDF *and* the text together via
    // the native share sheet — WhatsApp appears as a target and receives both.
    try {
      const doc = await buildInvoiceDoc(m);
      const blob = doc.output("blob");
      const file = new File([blob], `${m.invoiceNo}.pdf`, { type: "application/pdf" });
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try { await nav.share({ files: [file], text, title: m.invoiceNo }); return; }
        catch (e: any) { if (e?.name === "AbortError") return; /* else fall through */ }
      }
      // Desktop / no file-share support: download the PDF so it can be attached.
      doc.save(`${m.invoiceNo}.pdf`);
    } catch { /* PDF unavailable — still send the text below */ }
    const digits = (customerPhone || "").replace(/\D/g, "");
    const url = digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
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
          <button onClick={() => { shareWhatsApp(); onInvoiced?.(); }} style={btn("#25D366")}>WhatsApp</button>
          <button onClick={() => { printInvoice(m); onInvoiced?.(); }} style={btn("#475569")}>Print</button>
          <button onClick={() => { downloadPDF(m).catch(() => alert("Could not generate PDF — use Print → Save as PDF instead.")); onInvoiced?.(); }} style={btn(ACCENT)}>Download PDF</button>
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
