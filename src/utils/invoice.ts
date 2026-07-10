/**
 * Service-bill / GST invoice model for workshop job cards.
 * Pure data + formatting (no JSX, no side effects) — consumed by InvoiceModal.
 */
import type { AppUser } from "../types";

// Intra-state GST: split into CGST + SGST, each half of the total rate.
// Auto service/parts in India is commonly taxed at 18%. Change here if needed.
export const GST_RATE = 18;

export interface InvoiceLine {
  description: string;
  qty: number;
  rate: number;
  amount: number;
  kind: "part" | "labour";
}

export interface InvoiceModel {
  invoiceNo: string;
  dateStr: string;
  shop: { name: string; address: string; gstin: string; phone: string; email: string };
  customer: { name: string; vehicle: string };
  jobNumber: string;
  lines: InvoiceLine[];
  subTotal: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  total: number;
  amountWords: string;
}

/**
 * Invoice number for a job card. The job number is already "JOB-YYYYMM-NNNN",
 * so prefixing with "INV-" produced the redundant "INV-JOB-202606-0003". Strip
 * the leading "JOB-" so it reads cleanly as "INV-202606-0003".
 */
export function invoiceNoForJob(jobNumber?: string | null, fallbackId?: string | number | null): string {
  const jn = String(jobNumber || "").replace(/^JOB-?/i, "").trim();
  return jn ? `INV-${jn}` : `INV-${fallbackId || ""}`;
}

/** ₹ formatting for on-screen + print (browser fonts render the glyph fine). */
export function fmtINR(n: number): string {
  return "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
}

/** "Rs." formatting for the PDF — jsPDF's built-in Helvetica can't draw ₹. */
export function pdfINR(n: number): string {
  return "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-IN");
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(n: number): string {
  let s = "";
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + " Hundred "; n %= 100; }
  if (n >= 20) { s += TENS[Math.floor(n / 10)] + " "; n %= 10; }
  if (n > 0) s += ONES[n] + " ";
  return s.trim();
}

/** Indian-system amount in words (handles up to crores). */
export function amountInWords(num: number): string {
  let n = Math.round(Number(num) || 0);
  if (n === 0) return "Zero Rupees Only";
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  let s = "";
  if (crore) s += belowThousand(crore) + " Crore ";
  if (lakh) s += belowThousand(lakh) + " Lakh ";
  if (thousand) s += belowThousand(thousand) + " Thousand ";
  if (n) s += belowThousand(n);
  return s.trim() + " Rupees Only";
}

/** Build the invoice document model from a job card + the logged-in shop owner. */
export function buildInvoice(job: any, user: AppUser | null): InvoiceModel {
  const shop = (user?.shop || {}) as Record<string, any>;
  const parts = (job?.parts || []) as any[];
  const labour = (job?.labour || []) as any[];

  const lines: InvoiceLine[] = [
    ...parts.map((p) => ({
      description: p.name || "Part",
      qty: Number(p.qty) || 0,
      rate: Number(p.price) || 0,
      amount: (Number(p.qty) || 0) * (Number(p.price) || 0),
      kind: "part" as const,
    })),
    ...labour.map((l) => ({
      description: l.description || "Labour",
      qty: 1,
      rate: Number(l.amount) || 0,
      amount: Number(l.amount) || 0,
      kind: "labour" as const,
    })),
  ];

  const subTotal = lines.reduce((s, l) => s + l.amount, 0);
  const cgst = (subTotal * (GST_RATE / 2)) / 100;
  const sgst = (subTotal * (GST_RATE / 2)) / 100;
  const total = subTotal + cgst + sgst;

  const vehicle = [job?.vehicleMake, job?.vehicleModel, job?.vehicleReg ? `(${job.vehicleReg})` : ""]
    .filter(Boolean).join(" ").trim();

  return {
    invoiceNo: invoiceNoForJob(job?.jobNumber, job?.id),
    dateStr: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }),
    shop: {
      name: shop.name || "—",
      address: [shop.address, shop.city, shop.pincode].filter(Boolean).join(", ") || "—",
      gstin: shop.gstin || shop.gstNo || "",
      phone: shop.phone || shop.whatsappNumber || "",
      email: shop.email || "",
    },
    customer: { name: job?.customerName || "Walk-in", vehicle: vehicle || "—" },
    jobNumber: job?.jobNumber || "",
    lines, subTotal, gstRate: GST_RATE, cgst, sgst, total,
    amountWords: amountInWords(total),
  };
}

/**
 * WhatsApp message body. Deliberately contains NO phone numbers — only the
 * itemised bill + totals. The recipient's number (if any) goes in the wa.me URL.
 */
export function invoiceWhatsAppText(m: InvoiceModel): string {
  const head = `*${m.shop.name}*\nTax Invoice ${m.invoiceNo}  •  ${m.dateStr}`;
  const veh = `Vehicle: ${m.customer.vehicle}`;
  const items = m.lines.map((l) => `• ${l.description} ×${l.qty} — ${fmtINR(l.amount)}`).join("\n");
  const tax =
    `Subtotal: ${fmtINR(m.subTotal)}\n` +
    `CGST (${m.gstRate / 2}%): ${fmtINR(m.cgst)}\n` +
    `SGST (${m.gstRate / 2}%): ${fmtINR(m.sgst)}\n` +
    `*Total: ${fmtINR(m.total)}*`;
  return `${head}\n${veh}\n\n${items}\n\n${tax}\n\nThank you for your business!`;
}
