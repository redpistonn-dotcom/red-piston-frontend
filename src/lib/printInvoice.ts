/**
 * printInvoice.ts — two print templates: A4 (professional) and Thermal (80mm receipt).
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
  invoiceAt?: string;       // formatted date-time string
  isInvoice: boolean;       // true = TAX INVOICE, false = ESTIMATE/QUOTATION
  customerName?: string;
  customerPhone?: string;
  vehicleReg?: string;
  paymentMode?: string;
  notes?: string;
}

interface LineItem {
  name: string;
  sku?: string;
  qty: number;
  price: number;
  discAmt: number;
  gstAmt: number;
  afterDisc: number;        // line total
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
}

export function printInvoice(p: PrintInvoiceParams): void {
  const w = window.open(
    "",
    "_blank",
    p.format === "thermal" ? "width=340,height=700" : "width=720,height=960"
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

// ─── A4 template ─────────────────────────────────────────────────────────────
function a4Html(p: PrintInvoiceParams): string {
  const { shop, invoice, items, totals } = p;
  const label = invoice.isInvoice ? "TAX INVOICE" : "ESTIMATE / QUOTATION";
  const accentColor = invoice.isInvoice ? "#d97706" : "#2563eb";

  const rows = items.map((item, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${esc(item.name)}</td>
      <td class="mono muted">${esc(item.sku) || "—"}</td>
      <td class="num">${item.qty}</td>
      <td class="num">${rs(item.price)}</td>
      <td class="num red">${item.discAmt > 0 ? `−${rs(item.discAmt)}` : "—"}</td>
      <td class="num muted">${rs(item.gstAmt)}</td>
      <td class="num bold">${rs(item.afterDisc)}</td>
    </tr>`).join("");

  const logoHtml = shop.logoUrl
    ? `<img src="${esc(shop.logoUrl)}" alt="${esc(shop.name)}" style="height:52px;max-width:120px;object-fit:contain;margin-bottom:6px">`
    : `<div style="width:52px;height:52px;border-radius:12px;background:linear-gradient(145deg,#1e3a5f,#0f2040);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:900">${esc(shop.name.charAt(0).toUpperCase())}</div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(invoice.invoiceNo)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1c1b1b;padding:32px 36px;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid ${accentColor};margin-bottom:18px}
  .shop-name{font-size:20px;font-weight:900;margin:6px 0 2px}
  .shop-meta{font-size:10px;color:#888;line-height:1.6}
  .label-badge{font-size:10px;font-weight:800;letter-spacing:.12em;color:${accentColor}}
  .inv-no{font-family:monospace;font-weight:700;margin-top:5px;font-size:13px}
  .muted{color:#888}
  .red{color:#dc2626}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th{padding:7px 6px;text-align:right;color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #f3f0eb}
  th:nth-child(1),th:nth-child(2),th:nth-child(3){text-align:left}
  td{padding:7px 6px;border-bottom:1px solid #f3f0eb}
  .num{text-align:right;font-family:monospace}
  .bold{font-weight:700}
  .mono{font-family:monospace;font-size:10px}
  .meta-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px}
  .total-row{border-top:1px solid #e5e0d8;padding:7px 4px;font-size:11px;color:#888;display:flex;justify-content:space-between}
  .grand{font-size:17px;font-weight:900;padding-top:9px;border-top:1px solid #e5e0d8;display:flex;justify-content:space-between}
  .footer{margin-top:18px;padding-top:12px;border-top:1px solid #e5e0d8;font-size:10px;color:#aaa;text-align:center;line-height:1.7}
  @media print{button{display:none}@page{size:A4;margin:12mm}}
</style></head><body>

<div class="header">
  <div style="display:flex;gap:14px;align-items:flex-start">
    ${logoHtml}
    <div>
      <div class="shop-name">${esc(shop.name)}</div>
      <div class="shop-meta">${esc(shop.address) || ""}</div>
      ${shop.phone ? `<div class="shop-meta">${esc(shop.phone)}</div>` : ""}
    </div>
  </div>
  <div style="text-align:right">
    <div class="label-badge">${label}</div>
    <div class="inv-no">${esc(invoice.invoiceNo)}</div>
    ${invoice.invoiceAt ? `<div class="shop-meta" style="margin-top:3px">${esc(invoice.invoiceAt)}</div>` : ""}
    ${shop.gstin ? `<div class="shop-meta" style="margin-top:5px">GSTIN: <b>${esc(shop.gstin)}</b></div>` : ""}
  </div>
</div>

${invoice.customerName ? `<div class="meta-row"><span class="muted">Customer</span><b>${esc(invoice.customerName)}</b></div>` : ""}
${invoice.vehicleReg ? `<div class="meta-row"><span class="muted">Vehicle</span><b style="color:${accentColor};font-family:monospace">${esc(invoice.vehicleReg)}</b></div>` : ""}
${invoice.notes ? `<div class="meta-row"><span class="muted">Notes</span><span>${esc(invoice.notes)}</span></div>` : ""}

<table>
  <thead><tr>${["#","Item","SKU","Qty","Rate","Disc","GST","Amount"].map(h=>`<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${rows}</tbody>
</table>

<div style="margin-top:14px">
  ${totals.grandDiscount > 0 ? `<div class="total-row"><span>Item Discounts</span><span class="red">−${rs(totals.grandDiscount)}</span></div>` : ""}
  ${totals.additionalDisc > 0 ? `<div class="total-row"><span>Additional Discount</span><span class="red">−${rs(totals.additionalDisc)}</span></div>` : ""}
  <div class="total-row"><span>GST (Inclusive)</span><span>${rs(totals.grandGst)}</span></div>
  <div class="grand"><span>TOTAL</span><span style="color:${accentColor}">${rs(totals.finalTotal)}</span></div>
</div>

<div class="footer">
  ${invoice.paymentMode ? `Paid via ${esc(invoice.paymentMode)} · ` : ""}Computer-generated ${invoice.isInvoice ? "tax invoice" : "quotation"}.<br>
  Thank you for your business!
</div>

<br>
<button onclick="window.print()" style="padding:8px 22px;background:${accentColor};color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
  🖨&nbsp; Print
</button>
</body></html>`;
}

// ─── Thermal (80 mm) template ─────────────────────────────────────────────────
function thermalHtml(p: PrintInvoiceParams): string {
  const { shop, invoice, items, totals } = p;
  const label = invoice.isInvoice ? "TAX INVOICE" : "QUOTATION";

  // Build item rows — narrow, right-aligned amounts
  const rows = items.map(item => {
    const lineTotal = item.afterDisc.toFixed(2);
    const rateDisc  = item.discAmt > 0
      ? `${rs(item.price)} - ${rs(item.discAmt)} disc`
      : `${rs(item.price)}`;
    return `
<div class="item-row">
  <div class="item-name">${item.qty} x ${esc(item.name)}</div>
  <div class="item-right">${rs(item.afterDisc)}</div>
</div>
<div class="item-sub">${rateDisc}${item.sku ? ` | ${esc(item.sku)}` : ""}</div>`;
  }).join("");

  const dashes = "------------------------------------------------";

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
${shop.gstin  ? `<div class="shop-sub">GSTIN: ${esc(shop.gstin)}</div>` : ""}
${shop.phone  ? `<div class="shop-sub">Ph: ${esc(shop.phone)}</div>` : ""}

<div class="dashes">${dashes}</div>

<div class="badge">${label}</div>
<div class="inv-no">${esc(invoice.invoiceNo)}</div>
${invoice.invoiceAt ? `<div class="shop-sub">${esc(invoice.invoiceAt)}</div>` : ""}

<div class="dashes">${dashes}</div>

${invoice.customerName ? `<div class="kv"><span>Customer</span><span>${esc(invoice.customerName)}</span></div>` : ""}
${invoice.vehicleReg   ? `<div class="kv"><span>Vehicle</span><span><b>${esc(invoice.vehicleReg)}</b></span></div>` : ""}
${invoice.paymentMode  ? `<div class="kv"><span>Payment</span><span>${esc(invoice.paymentMode)}</span></div>` : ""}
${invoice.notes        ? `<div class="kv"><span>Notes</span><span>${esc(invoice.notes)}</span></div>` : ""}

<div class="dashes">${dashes}</div>
<div class="kv bold"><span>Item</span><span>Amt</span></div>
<div class="dashes">${dashes}</div>

${rows}

<div class="dashes">${dashes}</div>

${totals.grandDiscount > 0 ? `<div class="total-row"><span>Discounts</span><span>−${rs(totals.grandDiscount)}</span></div>` : ""}
${totals.additionalDisc > 0 ? `<div class="total-row"><span>Extra Disc</span><span>−${rs(totals.additionalDisc)}</span></div>` : ""}
<div class="total-row"><span>GST (Incl.)</span><span>${rs(totals.grandGst)}</span></div>

<div class="dashes">${dashes}</div>
<div class="grand-row"><span>TOTAL</span><span>${rs(totals.finalTotal)}</span></div>
<div class="dashes">${dashes}</div>

<div class="footer">
  Computer-generated ${invoice.isInvoice ? "tax invoice" : "quotation"}.<br>
  Thank you for your business!
</div>

<br>
<button onclick="window.print()" style="width:100%;padding:7px;background:#000;color:#fff;border:none;cursor:pointer;font-size:12px;font-family:monospace;font-weight:700;border-radius:4px">
  🖨 PRINT
</button>
</body></html>`;
}
