/**
 * printInvoice.ts — two print templates: A4 (professional, GST-compliant) and Thermal (80mm receipt).
 *
 * Usage:
 *   printInvoice({ format, shop, invoice, items, lineCalcs, totals });
 *
 * Physical printer selection happens in the browser's native print dialog (Ctrl+P /
 * the "Print" button in the popup). The format setting only controls page size + layout.
 */

import type { PrintFormat } from "./printSettings";

interface ShopInfo {
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
  logoUrl?: string;
}

interface InvoiceInfo {
  invoiceNo: string;
  invoiceAt?: string;
  isInvoice: boolean;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;
  billingAddress?: string;
  vehicleReg?: string;
  paymentMode?: string;
  upiRef?: string;
  notes?: string;
}

interface LineItem {
  name: string;
  sku?: string;
  oemNumber?: string;
  mrp?: number | null;
  qty: number;
  price: number;
  discAmt: number;
  gstAmt: number;
  afterDisc: number;        // line total (taxable + gst)
  gstRate?: number;         // e.g. 18 for 18% GST; used for display column
  hsnCode?: string;         // HSN / SAC code for GST compliance
}

interface Totals {
  grandDiscount: number;
  additionalDisc: number;
  grandGst: number;
  finalTotal: number;
}

export interface PrintInvoiceParams {
  format: PrintFormat;
  shop: ShopInfo;
  invoice: InvoiceInfo;
  items: LineItem[];
  totals: Totals;
  /** Show each item's OEM number on the printed/shared bill. Off by default. */
  showOem?: boolean;
  /** Show each item's MRP on the printed/shared bill. Off by default. */
  showMrp?: boolean;
}

export function printInvoice(p: PrintInvoiceParams): void {
  const w = window.open(
    "",
    "_blank",
    p.format === "thermal" ? "width=340,height=700" : "width=900,height=960"
  );
  if (!w) return;
  const html = p.format === "thermal" ? thermalHtml(p) : a4Html(p);
  w.document.write(html);
  w.document.close();
}

// ─── Shared escaping ──────────────────────────────────────────────────────────
function esc(s?: string | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rs(n: number): string {
  return `&#x20B9;${n.toFixed(2)}`;
}

// Format a GST percentage cleanly: 9 not 9.00, 2.5 stays 2.5.
function fmtPct(n: number): string {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
}

// ─── Indian number-to-words (handles 0 – 99,99,999) ──────────────────────────
function toWords(n: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function twoDigits(num: number): string {
    if (num === 0) return "";
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "");
  }

  function threeDigits(num: number): string {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    let result = "";
    if (h > 0) result += ones[h] + " Hundred";
    if (rest > 0) result += (result ? " " : "") + twoDigits(rest);
    return result;
  }

  const rupees = Math.floor(Math.abs(n));
  const paise  = Math.round((Math.abs(n) - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Zero";

  let result = "";
  const crore = Math.floor(rupees / 10000000);
  const lakh  = Math.floor((rupees % 10000000) / 100000);
  const thou  = Math.floor((rupees % 100000) / 1000);
  const rem   = rupees % 1000;

  if (crore > 0) result += twoDigits(crore) + " Crore ";
  if (lakh  > 0) result += twoDigits(lakh)  + " Lakh ";
  if (thou  > 0) result += twoDigits(thou)  + " Thousand ";
  if (rem   > 0) result += threeDigits(rem);

  result = result.trim();
  if (paise > 0) result += " and " + twoDigits(paise) + " Paise";

  return result;
}

// ─── A4 GST-compliant template ────────────────────────────────────────────────
function a4Html(p: PrintInvoiceParams): string {
  const { shop, invoice, items, totals, showOem } = p;
  const label       = invoice.isInvoice ? "TAX INVOICE" : "ESTIMATE / QUOTATION";
  const accentColor = invoice.isInvoice ? "#d97706" : "#2563eb";

  // Per-line GST computations
  const lineData = items.map(item => {
    const taxableAmt = item.afterDisc - item.gstAmt;
    const cgst       = item.gstAmt / 2;
    const sgst       = item.gstAmt / 2;
    // Derive gstRate% from amounts when not supplied
    const gstRatePct = item.gstRate != null
      ? item.gstRate
      : taxableAmt > 0
        ? Math.round((item.gstAmt / taxableAmt) * 100)
        : 0;
    // Rate per unit excluding GST
    const rateExcl = item.qty > 0 ? taxableAmt / item.qty : 0;
    return { taxableAmt, cgst, sgst, gstRatePct, rateExcl };
  });

  // Footer totals
  const totalTaxable = lineData.reduce((s, l) => s + l.taxableAmt, 0);
  const totalCgst    = totals.grandGst / 2;
  const totalSgst    = totals.grandGst / 2;

  // GST tax-analysis table: group taxable/CGST/SGST by rate slab
  const n2 = (x: number) => x.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const slabMap = new Map<number, { taxable: number; cgst: number; sgst: number }>();
  lineData.forEach(l => {
    const r = l.gstRatePct || 0;
    const cur = slabMap.get(r) || { taxable: 0, cgst: 0, sgst: 0 };
    cur.taxable += l.taxableAmt; cur.cgst += l.cgst; cur.sgst += l.sgst;
    slabMap.set(r, cur);
  });
  let sumTax = 0, sumC = 0, sumS = 0;
  const taxSlabRows = [...slabMap.keys()].sort((a, b) => a - b).map(r => {
    const s = slabMap.get(r)!; sumTax += s.taxable; sumC += s.cgst; sumS += s.sgst;
    const half = fmtPct(r / 2);
    return `<tr><td class="tr-num">${n2(s.taxable)}</td><td class="tr-c">${half}%</td><td class="tr-num">${n2(s.cgst)}</td><td class="tr-c">${half}%</td><td class="tr-num">${n2(s.sgst)}</td><td class="tr-num">${n2(s.cgst + s.sgst)}</td></tr>`;
  }).join("");
  const taxWords = toWords(sumC + sumS);

  const rows = items.map((item, i) => {
    const d = lineData[i];
    return `
    <tr>
      <td class="num">${i + 1}</td>
      <td class="left-td">
        ${esc(item.name)}
        ${showOem && item.oemNumber ? `<div class="sub-line">OEM: ${esc(item.oemNumber)}</div>` : ""}
        ${item.sku ? `<div class="sub-line">SKU: ${esc(item.sku)}</div>` : ""}
      </td>
      <td class="num mono">${esc(item.hsnCode) || "—"}</td>
      <td class="num">${item.qty}</td>
      <td class="num">${rs(d.rateExcl)}</td>
      <td class="num">${rs(d.taxableAmt)}</td>
      <td class="num">${d.gstRatePct}%</td>
      <td class="num">${rs(d.cgst)}</td>
      <td class="num">${rs(d.sgst)}</td>
      <td class="num bold">${rs(item.afterDisc)}</td>
    </tr>`;
  }).join("");

  const logoHtml = shop.logoUrl
    ? `<img src="${esc(shop.logoUrl)}" alt="${esc(shop.name)}" style="height:52px;max-width:120px;object-fit:contain;margin-bottom:6px">`
    : `<div style="width:52px;height:52px;border-radius:12px;background:linear-gradient(145deg,#1e3a5f,#0f2040);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:900">${esc(shop.name.charAt(0).toUpperCase())}</div>`;

  // Round the grand total to the nearest rupee (Tally-style Round Off)
  const roundedTotal = Math.round(totals.finalTotal);
  const roundOff     = +(roundedTotal - totals.finalTotal).toFixed(2);
  const amountWords  = toWords(roundedTotal);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(invoice.invoiceNo)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1c1b1b;padding:28px 32px;font-size:12px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid ${accentColor};margin-bottom:16px}
  .shop-name{font-size:19px;font-weight:900;margin:6px 0 2px}
  .shop-meta{font-size:10px;color:#888;line-height:1.6}
  .label-badge{font-size:10px;font-weight:800;letter-spacing:.12em;color:${accentColor}}
  .inv-no{font-family:monospace;font-weight:700;margin-top:5px;font-size:13px}
  .muted{color:#888}
  .red{color:#dc2626}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}
  th{padding:6px 5px;text-align:right;color:#666;font-size:9px;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e8e3dc;border-top:1px solid #e8e3dc;background:#faf9f7;white-space:nowrap}
  th.left-th{text-align:left}
  td{padding:6px 5px;border-bottom:1px solid #f0ece6;vertical-align:top}
  .left-td{text-align:left}
  .num{text-align:right;font-family:monospace;white-space:nowrap}
  .bold{font-weight:700}
  .mono{font-family:monospace;font-size:10px}
  .sub-line{font-size:9px;color:#999;margin-top:2px}
  .meta-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px}
  .summary-table{width:100%;margin-top:14px;border-collapse:collapse}
  .summary-table td{padding:5px 6px;font-size:11px;border:none}
  .summary-table .label{color:#666}
  .summary-table .val{text-align:right;font-family:monospace;white-space:nowrap}
  .summary-table .sep{border-top:1px solid #e5e0d8}
  .summary-table .grand{font-size:15px;font-weight:900}
  .words-box{margin-top:10px;padding:8px 10px;background:#faf9f7;border:1px solid #e8e3dc;border-radius:4px;font-size:11px}
  .words-box .wlabel{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
  .tax-table{width:100%;margin-top:12px;border-collapse:collapse}
  .tax-table th,.tax-table td{border:1px solid #333;padding:4px 6px;font-size:10px}
  .tax-table th{background:#f3f4f6;text-align:center;font-weight:700}
  .tax-table .tr-num{text-align:right;font-family:monospace;white-space:nowrap}
  .tax-table .tr-c{text-align:center}
  .tax-table .tax-total td{font-weight:700}
  .decl-box{display:flex;gap:0;margin-top:18px;border:1px solid #e8e3dc;border-radius:4px;font-size:10px}
  .decl-left{flex:1;padding:10px 12px;border-right:1px solid #e8e3dc;color:#555;line-height:1.6}
  .decl-right{width:220px;padding:10px 12px;text-align:right;color:#555;line-height:1.8}
  .decl-right .auth-name{font-weight:700;font-size:11px;color:#1c1b1b}
  .sig-space{height:40px;border-bottom:1px dashed #bbb;margin-top:4px;width:100%}
  .footer{margin-top:14px;padding-top:10px;border-top:1px solid #e5e0d8;font-size:10px;color:#aaa;text-align:center;line-height:1.7}
  @media print{button{display:none}@page{size:A4;margin:10mm}}
</style></head><body>

<div class="header">
  <div style="display:flex;gap:14px;align-items:flex-start">
    ${logoHtml}
    <div>
      <div class="shop-name">${esc(shop.name)}</div>
      ${shop.address ? `<div class="shop-meta">${esc(shop.address)}</div>` : ""}
      ${shop.phone   ? `<div class="shop-meta">Ph: ${esc(shop.phone)}</div>` : ""}
      ${shop.gstin   ? `<div class="shop-meta" style="margin-top:4px">GSTIN: <b>${esc(shop.gstin)}</b></div>` : ""}
    </div>
  </div>
  <div style="text-align:right">
    <div class="label-badge">${label}</div>
    <div class="inv-no">${esc(invoice.invoiceNo)}</div>
    ${invoice.invoiceAt ? `<div class="shop-meta" style="margin-top:3px">${esc(invoice.invoiceAt)}</div>` : ""}
  </div>
</div>

${invoice.customerName ? `<div class="meta-row"><span class="muted">Bill To</span><b>${esc(invoice.customerName)}${invoice.customerPhone ? ` <span class="muted" style="font-weight:400">(${esc(invoice.customerPhone)})</span>` : ""}</b></div>` : ""}
${(invoice.customerAddress || invoice.billingAddress) ? `<div class="meta-row"><span class="muted">Address</span><span>${esc(invoice.customerAddress || invoice.billingAddress)}</span></div>` : ""}
${invoice.customerGstin ? `<div class="meta-row"><span class="muted">Buyer GSTIN</span><b style="font-family:monospace">${esc(invoice.customerGstin)}</b></div>` : ""}
${invoice.vehicleReg ? `<div class="meta-row"><span class="muted">Vehicle</span><b style="color:${accentColor};font-family:monospace">${esc(invoice.vehicleReg)}</b></div>` : ""}
${invoice.paymentMode ? `<div class="meta-row"><span class="muted">Payment</span><span>${esc(invoice.paymentMode)}${invoice.upiRef ? ` — Ref: <span style="font-family:monospace">${esc(invoice.upiRef)}</span>` : ""}</span></div>` : ""}
${invoice.notes ? `<div class="meta-row"><span class="muted">Remarks</span><span>${esc(invoice.notes)}</span></div>` : ""}

<table>
  <thead>
    <tr>
      <th class="left-th">#</th>
      <th class="left-th">Description</th>
      <th>HSN/SAC</th>
      <th>Qty</th>
      <th>Rate (Excl. GST)</th>
      <th>Taxable Amt</th>
      <th>GST%</th>
      <th>CGST</th>
      <th>SGST</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<table class="summary-table">
  <tbody>
    ${totals.grandDiscount > 0 ? `<tr><td class="label">Item Discounts</td><td class="val red">&#x2212;${rs(totals.grandDiscount)}</td></tr>` : ""}
    ${totals.additionalDisc > 0 ? `<tr><td class="label">Additional Discount</td><td class="val red">&#x2212;${rs(totals.additionalDisc)}</td></tr>` : ""}
    <tr class="sep">
      <td class="label">Taxable Amount</td>
      <td class="val">${rs(totalTaxable)}</td>
    </tr>
    <tr>
      <td class="label">Total Tax (CGST + SGST)</td>
      <td class="val">${rs(totalCgst + totalSgst)}</td>
    </tr>
    ${roundOff !== 0 ? `<tr><td class="label">Round Off</td><td class="val">${roundOff < 0 ? "&#x2212;" : ""}${rs(Math.abs(roundOff))}</td></tr>` : ""}
    <tr class="sep">
      <td class="grand">Grand Total</td>
      <td class="val grand" style="color:${accentColor}">${rs(roundedTotal)}</td>
    </tr>
  </tbody>
</table>

<div class="words-box">
  <div class="wlabel">Amount Chargeable (in words)</div>
  <div><b>INR ${amountWords} Only</b></div>
</div>

<table class="tax-table">
  <thead>
    <tr>
      <th rowspan="2">Taxable Value</th>
      <th colspan="2">CGST</th>
      <th colspan="2">SGST/UTGST</th>
      <th rowspan="2">Total Tax Amount</th>
    </tr>
    <tr><th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th></tr>
  </thead>
  <tbody>
    ${taxSlabRows}
    <tr class="tax-total">
      <td class="tr-num">${n2(sumTax)}</td>
      <td class="tr-c">Total</td>
      <td class="tr-num">${n2(sumC)}</td>
      <td></td>
      <td class="tr-num">${n2(sumS)}</td>
      <td class="tr-num">${n2(sumC + sumS)}</td>
    </tr>
  </tbody>
</table>

<div class="words-box">
  <div class="wlabel">Tax Amount (in words)</div>
  <div><b>INR ${taxWords} Only</b></div>
</div>

<div class="decl-box">
  <div class="decl-left">
    <b>Declaration</b><br>
    We declare that this invoice shows the actual price of the goods / services described and that all particulars are true and correct.
  </div>
  <div class="decl-right">
    <div>For <span class="auth-name">${esc(shop.name)}</span></div>
    <div class="sig-space"></div>
    <div style="font-size:9px;color:#aaa;margin-top:4px">Authorised Signatory</div>
  </div>
</div>

<div class="footer">
  ${invoice.paymentMode ? `Paid via ${esc(invoice.paymentMode)} &middot; ` : ""}Computer-generated ${invoice.isInvoice ? "tax invoice" : "quotation"}. Subject to jurisdiction.<br>
  Thank you for your business!
</div>

<br>
<button onclick="window.print()" style="padding:8px 22px;background:${accentColor};color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
  &#x1F5A8;&nbsp; Print
</button>
</body></html>`;
}

// ─── Thermal (80 mm) template ─────────────────────────────────────────────────
function thermalHtml(p: PrintInvoiceParams): string {
  const { shop, invoice, items, totals, showOem, showMrp } = p;
  const label = invoice.isInvoice ? "TAX INVOICE" : "QUOTATION";

  const rows = items.map(item => {
    const taxableAmt = item.afterDisc - item.gstAmt;
    const cgst       = item.gstAmt / 2;
    const sgst       = item.gstAmt / 2;
    const rateDisc   = item.discAmt > 0
      ? `${rs(item.price)} - ${rs(item.discAmt)} disc`
      : `${rs(item.price)}`;
    const extras = [
      showOem && item.oemNumber  ? `OEM: ${esc(item.oemNumber)}` : "",
      showMrp && item.mrp        ? `MRP: ${rs(item.mrp)}` : "",
      item.hsnCode               ? `HSN: ${esc(item.hsnCode)}` : "",
    ].filter(Boolean).join(" | ");
    return `
<div class="item-row">
  <div class="item-name">${item.qty} x ${esc(item.name)}</div>
  <div class="item-right">${rs(item.afterDisc)}</div>
</div>
<div class="item-sub">${rateDisc} | Taxable: ${rs(taxableAmt)} | CGST: ${rs(cgst)} | SGST: ${rs(sgst)}${extras ? ` | ${extras}` : ""}</div>`;
  }).join("");

  const totalCgst = totals.grandGst / 2;
  const totalSgst = totals.grandGst / 2;
  const thermalTaxable = totals.finalTotal - totals.grandGst;
  const thermalPct = thermalTaxable > 0 ? fmtPct((totalCgst / thermalTaxable) * 100) : "";
  const thermalRounded = Math.round(totals.finalTotal);
  const thermalRoundOff = +(thermalRounded - totals.finalTotal).toFixed(2);
  const dashes    = "------------------------------------------------";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(invoice.invoiceNo)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Courier New',Courier,monospace;background:#fff;color:#000;width:80mm;font-size:11px;padding:4mm 4mm 6mm}
  .center{text-align:center}
  .right{text-align:right}
  .bold{font-weight:700}
  .shop-name{font-size:15px;font-weight:900;text-align:center;letter-spacing:.04em;margin:4px 0 2px}
  .shop-sub{font-size:9px;text-align:center;color:#333;line-height:1.5}
  .badge{font-size:10px;font-weight:700;text-align:center;letter-spacing:.1em;margin:6px 0 2px}
  .inv-no{font-size:11px;text-align:center;font-weight:700}
  .dashes{color:#999;font-size:10px;text-align:center;letter-spacing:.02em;margin:4px 0}
  .kv{display:flex;justify-content:space-between;font-size:10px;margin:2px 0}
  .kv span:first-child{color:#555}
  .item-row{display:flex;justify-content:space-between;font-size:11px;margin-top:5px;font-weight:600}
  .item-name{flex:1;padding-right:6px;word-break:break-word}
  .item-right{white-space:nowrap;font-weight:700}
  .item-sub{font-size:9px;color:#555;padding-left:0;margin-bottom:2px}
  .total-row{display:flex;justify-content:space-between;font-size:10px;color:#555;margin:2px 0}
  .grand-row{display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin:4px 0}
  .footer{font-size:9px;text-align:center;color:#666;line-height:1.7;margin-top:6px}
  .logo-initial{font-size:24px;font-weight:900;text-align:center;margin:2px 0}
  @media print{button{display:none}@page{size:80mm auto;margin:0}}
</style></head><body>

${shop.logoUrl
  ? `<div class="center"><img src="${esc(shop.logoUrl)}" alt="" style="height:48px;max-width:60mm;object-fit:contain;margin:4px auto;display:block"></div>`
  : `<div class="logo-initial">${esc(shop.name.charAt(0).toUpperCase())}</div>`}

<div class="shop-name">${esc(shop.name)}</div>
${shop.address ? `<div class="shop-sub">${esc(shop.address)}</div>` : ""}
${shop.gstin   ? `<div class="shop-sub">GSTIN: ${esc(shop.gstin)}</div>` : ""}
${shop.phone   ? `<div class="shop-sub">Ph: ${esc(shop.phone)}</div>` : ""}

<div class="dashes">${dashes}</div>

<div class="badge">${label}</div>
<div class="inv-no">${esc(invoice.invoiceNo)}</div>
${invoice.invoiceAt ? `<div class="shop-sub">${esc(invoice.invoiceAt)}</div>` : ""}

<div class="dashes">${dashes}</div>

${invoice.customerName  ? `<div class="kv"><span>Customer</span><span>${esc(invoice.customerName)}</span></div>` : ""}
${invoice.customerPhone ? `<div class="kv"><span>Phone</span><span>${esc(invoice.customerPhone)}</span></div>` : ""}
${(invoice.customerAddress || invoice.billingAddress) ? `<div class="kv"><span>Address</span><span>${esc(invoice.customerAddress || invoice.billingAddress)}</span></div>` : ""}
${invoice.customerGstin ? `<div class="kv"><span>Buyer GSTIN</span><span style="font-family:monospace">${esc(invoice.customerGstin)}</span></div>` : ""}
${invoice.vehicleReg    ? `<div class="kv"><span>Vehicle</span><span><b>${esc(invoice.vehicleReg)}</b></span></div>` : ""}
${invoice.paymentMode   ? `<div class="kv"><span>Payment</span><span>${esc(invoice.paymentMode)}${invoice.upiRef ? ` | Ref: ${esc(invoice.upiRef)}` : ""}</span></div>` : ""}
${invoice.notes         ? `<div class="kv"><span>Remarks</span><span>${esc(invoice.notes)}</span></div>` : ""}

<div class="dashes">${dashes}</div>
<div class="kv bold"><span>Item</span><span>Amt</span></div>
<div class="dashes">${dashes}</div>

${rows}

<div class="dashes">${dashes}</div>

${totals.grandDiscount  > 0 ? `<div class="total-row"><span>Discounts</span><span>&#x2212;${rs(totals.grandDiscount)}</span></div>` : ""}
${totals.additionalDisc > 0 ? `<div class="total-row"><span>Extra Disc</span><span>&#x2212;${rs(totals.additionalDisc)}</span></div>` : ""}
<div class="total-row"><span>Taxable Amt</span><span>${rs(totals.finalTotal - totals.grandGst)}</span></div>
<div class="total-row"><span>CGST${thermalPct ? ` @ ${thermalPct}%` : ""}</span><span>${rs(totalCgst)}</span></div>
<div class="total-row"><span>SGST${thermalPct ? ` @ ${thermalPct}%` : ""}</span><span>${rs(totalSgst)}</span></div>
${thermalRoundOff !== 0 ? `<div class="total-row"><span>Round Off</span><span>${thermalRoundOff < 0 ? "&#x2212;" : ""}${rs(Math.abs(thermalRoundOff))}</span></div>` : ""}

<div class="dashes">${dashes}</div>
<div class="grand-row"><span>TOTAL</span><span>${rs(thermalRounded)}</span></div>
<div class="dashes">${dashes}</div>

<div class="footer">
  Computer-generated ${invoice.isInvoice ? "tax invoice" : "quotation"}.<br>
  Thank you for your business!
</div>

<br>
<button onclick="window.print()" style="width:100%;padding:7px;background:#000;color:#fff;border:none;cursor:pointer;font-size:12px;font-family:monospace;font-weight:700;border-radius:4px">
  &#x1F5A8; PRINT
</button>
</body></html>`;
}
