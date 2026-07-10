import { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { T, FONT } from "../theme";
import { fmt, fmtDateTime, margin } from "../utils";
import { BarcodeScanner } from "../components/BarcodeScanner.jsx";
import { PurchaseBills } from "../components/PurchaseBills";
import { NewReturnExchangeModal } from "../components/NewReturnExchangeModal";
import { PartyAutocomplete } from "../components/PartyAutocomplete";
import PdfPreviewModal from "../components/PdfPreviewModal";
import { useStore } from "../store";
import { AppCtx } from "../AppCtx";
import { getAccessToken } from "../api/client";
import { getInvoicePdfUrl } from "../api/billing";
import { getAvailableCreditNotes } from "../api/creditNotes";
import { printInvoice } from "../lib/printInvoice";
import { getPrintFormat, setPrintFormat, type PrintFormat } from "../lib/printSettings";

// ─── Payment mode button ───────────────────────────────────────────────────────
function PayBtn({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            flex: 1, height: 58, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
            background: active ? T.amber : "#FFFFFF",
            border: `1px solid ${active ? T.amber : T.border}`,
            borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
            color: active ? "#FFFFFF" : T.t2,
        }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: FONT.ui, letterSpacing: "0.06em" }}>{label}</span>
        </button>
    );
}

export function POSBillingPage() {
    const { products, activeShopId, shops, parties, movements } = useStore();
    const { handleMultiItemSale: onMultiSale, toast, currentUser } = useContext(AppCtx);
    const navigate = useNavigate();
    const shop = useMemo(() => {
        const fromStore = (shops || []).find((s: any) => s.id === activeShopId || s.shopId === activeShopId);
        if (fromStore) return fromStore;
        if ((currentUser as any)?.shop) return (currentUser as any).shop;
        return null;
    }, [shops, activeShopId, currentUser]);
    const shopProducts = useMemo(() => (products || []).filter((p: any) => p.shopId === activeShopId && p.isActive !== false), [products, activeShopId]);

    const shopName    = shop?.name    || shop?.shopName || "My Shop";
    const shopAddress = [shop?.address, shop?.city, shop?.pincode].filter(Boolean).join(" · ") || "";
    const shopGst     = shop?.gstNo   || shop?.gstin || "";
    const shopPhone   = shop?.phone   || "";
    const shopCity    = shop?.city    || "";

    // ── Bill state ─────────────────────────────────────────────────────────────
    // Restore draft from localStorage (per shop, 24h expiry)
    const draftKey = `pos_draft_${activeShopId || "default"}`;
    const loadDraft = () => {
        try {
            const raw = JSON.parse(localStorage.getItem(draftKey) || "null");
            if (!raw || (raw.expiresAt && Date.now() > raw.expiresAt)) {
                localStorage.removeItem(draftKey);
                return null;
            }
            return raw;
        } catch { return null; }
    };
    const draft = loadDraft();

    const [billType, setBillType]   = useState(draft?.billType || "Sale");
    const [items, setItems]         = useState<any[]>(draft?.items || []);
    const [paymentMode, setPaymentMode] = useState(draft?.paymentMode || "Cash");
    const [additionalDisc, setAdditionalDisc] = useState(draft?.additionalDisc || 0);
    const [notes, setNotes]         = useState(draft?.notes || "");
    const [customerName, setCustomerName] = useState(draft?.customerName || "");
    const [customerPhone, setCustomerPhone] = useState(draft?.customerPhone || "");
    const [customerAddress, setCustomerAddress] = useState(draft?.customerAddress || "");
    const [vehicleReg, setVehicleReg]   = useState(draft?.vehicleReg || "");
    const [partyId, setPartyId]     = useState<string | number | null>(draft?.partyId || null);
    const [showInvoice, setShowInvoice] = useState(false);
    const [saving, setSaving]       = useState(false);

    // Store credit available for the linked customer (partyId), and how much
    // of it the cashier chose to apply to this bill.
    const [availableCredit, setAvailableCredit] = useState<{ creditNoteId: number; remainingBalance: number }[]>([]);
    const [appliedCreditNoteId, setAppliedCreditNoteId] = useState<number | null>(null);
    const [appliedCreditAmount, setAppliedCreditAmount] = useState(0);

    useEffect(() => {
        setAppliedCreditNoteId(null);
        setAppliedCreditAmount(0);
        if (!partyId) { setAvailableCredit([]); return; }
        let cancelled = false;
        getAvailableCreditNotes(partyId).then((res: any) => {
            if (cancelled) return;
            const list = Array.isArray(res) ? res : (res?.creditNotes || []);
            setAvailableCredit(list.map((c: any) => ({ creditNoteId: c.creditNoteId, remainingBalance: parseFloat(c.remainingBalance) || 0 })));
        }).catch(() => { if (!cancelled) setAvailableCredit([]); });
        return () => { cancelled = true; };
    }, [partyId]);

    const totalAvailableCredit = availableCredit.reduce((s, c) => s + c.remainingBalance, 0);

    const applyCreditAmount = (raw: number, finalTotal: number) => {
        const max = Math.min(totalAvailableCredit, finalTotal);
        const amt = Math.max(0, Math.min(max, raw));
        setAppliedCreditAmount(amt);
        // Redeem from the first note(s) with enough balance — server-side only takes
        // one creditNoteId per sale today, so pick the first note that can cover it,
        // or the largest one otherwise (cashier can split across bills if needed).
        const covering = availableCredit.find(c => c.remainingBalance >= amt);
        setAppliedCreditNoteId(amt > 0 ? (covering?.creditNoteId ?? availableCredit[0]?.creditNoteId ?? null) : null);
    };
    const [invoiceNo, setInvoiceNo] = useState("");
    const [invoiceAt, setInvoiceAt] = useState<number | null>(null);
    const [scanOpen, setScanOpen]   = useState(false);
    const [search, setSearch]       = useState("");
    const [outOfStockItem, setOutOfStockItem] = useState<{ id: string; name: string; sku: string } | null>(null);
    const [posTab, setPosTab]       = useState<"pos" | "bills">("pos");
    const [printFormat, setPrintFormatState] = useState<PrintFormat>(getPrintFormat);

    const handleSetPrintFormat = useCallback((fmt: PrintFormat) => {
        setPrintFormat(fmt);
        setPrintFormatState(fmt);
    }, []);

    // Backend invoice id once the sale syncs — enables PDF download + WhatsApp share
    const [syncedInvoiceId, setSyncedInvoiceId] = useState<number | null>(null);
    const [returnModalOpen, setReturnModalOpen] = useState(false);

    // Bill visibility toggles — shown inline near the print/share buttons so the
    // shop can set them once per bill instead of confirming through a popup each time.
    const [showOemOnBill, setShowOemOnBill] = useState(true);
    const [showMrpOnBill, setShowMrpOnBill] = useState(false);

    // PDF preview modal state
    const [pdfPreview, setPdfPreview] = useState<{ url: string | null; loading: boolean; error: string | null } | null>(null);

    const openPdfPreview = useCallback(async () => {
        setPdfPreview({ url: null, loading: true, error: null });
        if (syncedInvoiceId) {
            try {
                const res = await fetch(getInvoicePdfUrl(syncedInvoiceId, { showOem: showOemOnBill, showMrp: showMrpOnBill }), {
                    headers: { Authorization: `Bearer ${getAccessToken()}` },
                    credentials: 'include',
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    setPdfPreview({ url, loading: false, error: null });
                    return;
                }
            } catch {}
        }
        try {
            const doc = await buildBillPdf({ showOem: showOemOnBill, showMrp: showMrpOnBill });
            const url = URL.createObjectURL(doc.output("blob"));
            setPdfPreview({ url, loading: false, error: null });
        } catch (e: any) {
            setPdfPreview({ url: null, loading: false, error: e?.message || 'Could not load PDF' });
        }
    }, [syncedInvoiceId, showOemOnBill, showMrpOnBill, buildBillPdf]);

    const closePdfPreview = useCallback(() => {
        setPdfPreview(prev => {
            if (prev?.url) URL.revokeObjectURL(prev.url);
            return null;
        });
    }, []);

    // Inline PDF state for the success screen (A4 view)
    const [inlinePdfUrl, setInlinePdfUrl] = useState<string | null>(null);

    useEffect(() => {
        if (showInvoice && printFormat === 'a4') {
            let cancelled = false;
            const updatePdf = async () => {
                if (syncedInvoiceId) {
                    try {
                        const res = await fetch(getInvoicePdfUrl(syncedInvoiceId, { showOem: showOemOnBill, showMrp: showMrpOnBill }), {
                            headers: { Authorization: `Bearer ${getAccessToken()}` },
                            credentials: 'include',
                        });
                        if (res.ok) {
                            const blob = await res.blob();
                            if (!cancelled) setInlinePdfUrl(URL.createObjectURL(blob));
                            return;
                        }
                    } catch {}
                }
                try {
                    const doc = await buildBillPdf({ showOem: showOemOnBill, showMrp: showMrpOnBill });
                    if (!cancelled) setInlinePdfUrl(URL.createObjectURL(doc.output("blob")));
                } catch {}
            };
            updatePdf();
            return () => { cancelled = true; };
        }
    }, [showInvoice, syncedInvoiceId, printFormat, showOemOnBill, showMrpOnBill, items]);

    const [suspendedBill, setSuspendedBill] = useState(() => {
        try {
            const raw = JSON.parse(localStorage.getItem("vl_suspended_bill") || "null");
            if (raw?.expiresAt && Date.now() > raw.expiresAt) {
                localStorage.removeItem("vl_suspended_bill");
                return null;
            }
            return raw;
        } catch { return null; }
    });

    const searchRef = useRef<HTMLInputElement>(null);

    // Auto-save draft to localStorage (debounced 600ms, 24h expiry)
    useEffect(() => {
        if (showInvoice) return; // don't overwrite draft while invoice is shown
        const t = setTimeout(() => {
            if (items.length === 0) { localStorage.removeItem(draftKey); return; }
            localStorage.setItem(draftKey, JSON.stringify({
                items, billType, paymentMode, additionalDisc,
                notes, customerName, customerPhone, customerAddress, vehicleReg, partyId,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            }));
        }, 600);
        return () => clearTimeout(t);
    }, [items, billType, paymentMode, additionalDisc, notes, customerName, customerPhone, customerAddress, vehicleReg, partyId, showInvoice, draftKey]);

    useEffect(() => { searchRef.current?.focus(); }, []);

    // The sale syncs to the backend asynchronously — capture the created
    // invoice id so the preview can offer Download PDF / WhatsApp share.
    useEffect(() => {
        const handler = (e: Event) => {
            const d = (e as CustomEvent).detail;
            if (d?.invoiceId) setSyncedInvoiceId(d.invoiceId);
        };
        window.addEventListener("invoice:synced", handler);
        return () => window.removeEventListener("invoice:synced", handler);
    }, []);

    // Ctrl+Enter shortcut + "/" to focus search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && items.length > 0 && !saving && !showInvoice) {
                e.preventDefault(); handleSubmitRef.current?.();
            }
            if (e.key === "/" && document.activeElement !== searchRef.current) {
                e.preventDefault(); searchRef.current?.focus();
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [items.length, saving, showInvoice]);

    // Search results
    const searchResults = useMemo(() => {
        if (!search.trim()) return [];
        const q = search.toLowerCase();
        return shopProducts.filter((p: any) =>
            [p.name, p.sku, p.brand, p.category, p.oemNumber].some(s => String(s ?? "").toLowerCase().includes(q))
        ).slice(0, 8);
    }, [search, shopProducts]);

    // Recent items: last 8 unique products sold from this shop's movements
    const recentItems = useMemo(() => {
        const seen = new Set<string>();
        const result: any[] = [];
        const shopMoves = (movements || [])
            .filter((m: any) => m.type === "SALE" && m.shopId === activeShopId)
            .sort((a: any, b: any) => (b.date || 0) - (a.date || 0));
        for (const m of shopMoves) {
            const pid = String(m.productId);
            if (!pid || seen.has(pid)) continue;
            const prod = shopProducts.find((p: any) => String(p.id) === pid);
            if (prod && prod.stock > 0) { seen.add(pid); result.push(prod); }
            if (result.length >= 8) break;
        }
        return result;
    }, [movements, shopProducts, activeShopId]);

    // Add product
    const addProduct = useCallback((p: any) => {
        if ((p.stock ?? 0) <= 0) {
            setOutOfStockItem({ id: p.id, name: p.name, sku: p.sku || "" });
            setSearch("");
            return;
        }
        setItems(prev => {
            const existing = prev.find(i => i.productId === p.id);
            if (existing) return prev.map(i => i.productId === p.id ? { ...i, qty: Math.min(i.qty + 1, i.maxStock) } : i);
            return [...prev, {
                productId: p.id, name: p.name, sku: p.sku || "", oemNumber: p.oemNumber || "", image: p.image || "📦",
                qty: 1, price: p.sellPrice, originalPrice: p.sellPrice, discount: 0, discountType: "%",
                gstRate: p.gstRate || 18, buyPrice: p.buyPrice, maxStock: p.stock, hsnCode: p.hsnCode || "",
                mrp: p.mrp || null,
            }];
        });
        setSearch("");
        setTimeout(() => searchRef.current?.focus(), 50);
    }, []);

    const handlePosScan = useCallback((barcode: string) => {
        setScanOpen(false);
        const bc = barcode.trim().toLowerCase();
        const found = shopProducts.find((p: any) =>
            (p.sku && p.sku.toLowerCase() === bc) ||
            (p.oemNumber && p.oemNumber.toLowerCase() === bc) ||
            (Array.isArray(p.barcodes) && p.barcodes.some((b: string) => b.toLowerCase() === bc))
        );
        if (found) { addProduct(found); toast?.(`${found.name} added`, "success"); }
        else { setSearch(barcode); toast?.(`"${barcode}" not found — searching…`, "info"); }
    }, [shopProducts, addProduct, toast]);

    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
    const updateItem = (idx: number, field: string, val: any) => setItems(prev => prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === "discount") {
            const maxDiscount = item.discountType === "%" ? 80 : item.price * 0.8;
            val = Math.min(maxDiscount, Math.max(0, parseFloat(val) || 0));
        }
        return { ...item, [field]: val };
    }));

    // Line calculations — memoized so they don't recompute on every render
    const { lineCalcs, grandSubtotal, grandDiscount, grandGst, grandProfit, grandTotal } = useMemo(() => {
        const calcs = items.map(item => {
            const subtotal = item.price * item.qty;
            const discAmt = item.discountType === "%" ? subtotal * item.discount / 100 : item.discount;
            const afterDisc = subtotal - discAmt;
            const gstAmt = (afterDisc * item.gstRate) / (100 + item.gstRate);
            const profit = (item.price - item.buyPrice) * item.qty - discAmt;
            return { subtotal, discAmt, afterDisc, gstAmt, profit };
        });
        return {
            lineCalcs: calcs,
            grandSubtotal: calcs.reduce((s, l) => s + l.subtotal, 0),
            grandDiscount: calcs.reduce((s, l) => s + l.discAmt, 0),
            grandGst:      calcs.reduce((s, l) => s + l.gstAmt, 0),
            grandProfit:   calcs.reduce((s, l) => s + l.profit, 0),
            grandTotal:    calcs.reduce((s, l) => s + l.afterDisc, 0),
        };
    }, [items]);
    const finalTotal = Math.max(0, grandTotal - additionalDisc);
    // Clamp applied credit whenever the bill total shrinks below it (item removed, etc).
    useEffect(() => {
        if (appliedCreditAmount > finalTotal) applyCreditAmount(finalTotal, finalTotal);
    }, [finalTotal]); // eslint-disable-line react-hooks/exhaustive-deps
    const amountDue = Math.max(0, finalTotal - appliedCreditAmount);

    // Credit limit check for Udhaar
    const selectedParty = useMemo(() => (parties || []).find((p: any) => String(p.id) === String(partyId)), [parties, partyId]);
    const partyOutstanding = useMemo(() => {
      if (!selectedParty) return 0;
      const partyName = (selectedParty.name || "").toLowerCase();
      return (movements || []).filter((m: any) => {
        if (m.paymentStatus !== "pending") return false;
        // Match by partyId (set on sales made after party-selector was added) OR
        // by customer name for older/unlinked Udhaar sales.
        return String(m.partyId) === String(selectedParty.id) ||
          (!m.partyId && m.customerName && m.customerName.toLowerCase() === partyName);
      }).reduce((s: number, m: any) => s + (m.total || m.totalAmount || 0), 0);
    }, [selectedParty, movements]);
    const creditLimit = selectedParty?.creditLimit || 0;
    const creditAfterSale = partyOutstanding + finalTotal;
    const overLimit = creditLimit > 0 && creditAfterSale > creditLimit;

    // Submit
    const handleSubmitRef = useRef<(() => void) | null>(null);
    const validate = (effectiveType?: "Sale" | "Quotation") => {
        const checkType = effectiveType ?? billType;
        if (items.length === 0) { toast?.("Add at least one product", "warning"); return false; }
        if (paymentMode === "Udhaar" && overLimit) {
            toast?.(`Credit limit exceeded — ${selectedParty?.name || "party"}'s outstanding will reach ${fmt(creditAfterSale)} (limit ${fmt(creditLimit)}). Collect a payment first or reduce the sale.`, "error");
            return false;
        }
        for (const item of items) {
            if (item.qty <= 0) { toast?.(`Invalid qty for ${item.name}`, "warning"); return false; }
            const isCustom = String(item.productId || "").startsWith("custom_");
            if (!isCustom && item.maxStock <= 0) { toast?.(`"${item.name}" is out of stock (0 available)`, "error"); return false; }
            if (checkType === "Sale" && !isCustom && item.qty > item.maxStock) { toast?.(`Only ${item.maxStock} units of ${item.name} in stock`, "warning"); return false; }
            if (isCustom && (!item.name || item.name === "Custom Item")) {
                toast?.("Enter a name for the custom item before submitting", "warning"); return false;
            }
            if (item.price <= 0) {
                toast?.(`"${item.name}" has no valid price (₹${item.price}). Set a price before submitting`, "warning"); return false;
            }
        }
        return true;
    };

    const handleSubmit = async (typeOverride?: "Sale" | "Quotation") => {
        // Guard: onClick={handleSubmit} passes a MouseEvent as the first arg; ignore it.
        const safeOverride = (typeOverride === "Sale" || typeOverride === "Quotation") ? typeOverride : undefined;
        if (!validate(safeOverride)) return;
        const effectiveBillType = safeOverride ?? billType;
        setSaving(true);
        setSyncedInvoiceId(null); // new sale — previous backend invoice no longer applies
        await new Promise(r => setTimeout(r, 50));
        const ts = Date.now();
        const inv = `${effectiveBillType === "Sale" ? "INV" : "EST"}-${ts.toString(36).toUpperCase()}`;
        setInvoiceNo(inv); setInvoiceAt(ts);
        onMultiSale({
            type: effectiveBillType, invoiceNo: inv,
            items: items.map((item, idx) => ({
                productId: item.productId, name: item.name, qty: item.qty,
                sellPrice: item.price, buyPrice: item.buyPrice,
                discount: lineCalcs[idx].discAmt, total: lineCalcs[idx].afterDisc,
                gstAmount: lineCalcs[idx].gstAmt, profit: lineCalcs[idx].profit, gstRate: item.gstRate,
            })),
            customerName, customerPhone, customerAddress, vehicleReg, notes,
            partyId: partyId || undefined,
            // amountDue (finalTotal minus any applied store credit) is what's actually
            // collected via the chosen payment method — the credit portion is reported
            // separately below so the backend can redeem the credit note. Keys here must
            // match what handleMultiItemSale reads (data.payments?.Cash/.UPI/.Credit) —
            // paymentMode's *display* label ("Card/UPI") does not equal "UPI", so map it.
            payments: { [paymentMode === "Udhaar" ? "Credit" : paymentMode === "Card/UPI" ? "UPI" : "Cash"]: amountDue },
            appliedCreditNoteId: appliedCreditNoteId || undefined,
            appliedCreditAmount: appliedCreditAmount || undefined,
            paymentMode, subtotal: grandSubtotal, discount: grandDiscount + additionalDisc,
            total: finalTotal, gstAmount: grandGst, profit: grandProfit, date: ts,
        });
        if (safeOverride) setBillType(safeOverride);
        localStorage.removeItem(draftKey); // clear draft on successful save
        setSaving(false); setShowInvoice(true);
    };

    useLayoutEffect(() => { handleSubmitRef.current = handleSubmit; });

    const newBill = () => {
        localStorage.removeItem(draftKey);
        setItems([]); setNotes(""); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setVehicleReg("");
        setPaymentMode("Cash"); setAdditionalDisc(0); setPartyId(null); setShowInvoice(false); setSearch("");
        setAppliedCreditNoteId(null); setAppliedCreditAmount(0);
        setInvoiceAt(null); setBillType("Sale");
        setTimeout(() => searchRef.current?.focus(), 50);
    };

    const SUSPEND_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
    const handleSuspend = () => {
        if (items.length === 0) return;
        const draft = { items, customerName, customerPhone, customerAddress, vehicleReg, notes, billType, additionalDisc, paymentMode, timestamp: Date.now(), expiresAt: Date.now() + SUSPEND_TTL_MS };
        localStorage.setItem("vl_suspended_bill", JSON.stringify(draft));
        setSuspendedBill(draft); newBill();
        toast?.("Bill suspended — resume from the POS banner.", "info");
    };

    const handleResume = () => {
        if (!suspendedBill) return;
        if (items.length > 0 && !window.confirm("Replace current items?")) return;
        setItems(suspendedBill.items || []);
        setCustomerName(suspendedBill.customerName || "");
        setCustomerPhone(suspendedBill.customerPhone || "");
        setCustomerAddress(suspendedBill.customerAddress || "");
        setVehicleReg(suspendedBill.vehicleReg || "");
        setNotes(suspendedBill.notes || "");
        setBillType(suspendedBill.billType || "Sale");
        setAdditionalDisc(Number(suspendedBill.additionalDisc) || 0);
        setPaymentMode(suspendedBill.paymentMode || "Cash");
        localStorage.removeItem("vl_suspended_bill");
        setSuspendedBill(null);
        toast?.("Bill restored.", "success");
    };

    // Build the GST invoice as a jsPDF doc from the on-screen bill (jsPDF lazy-loaded).
    // Shared by "Download PDF" and "Share WhatsApp" (so WhatsApp can attach the file).
    async function buildBillPdf(opts?: { showOem?: boolean; showMrp?: boolean }) {
        const showOem = !!opts?.showOem, showMrp = !!opts?.showMrp;
        const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
        const autoTable = autoTableMod.default;
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const M = 40, R = 555, W = R - M;
        const rs = (n: number) => "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-IN");
        doc.setDrawColor(0, 0, 0).setLineWidth(0.5);

        // Title row
        doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(0, 0, 0);
        doc.text(billType === "Sale" ? "TAX INVOICE" : "QUOTATION", M + W / 2, 45, { align: "center" });

        // Main Header Box (Top 55 to 155)
        const topY = 55, hdrH = 100;
        doc.rect(M, topY, W, hdrH);
        const midX = M + 210;
        doc.line(midX, topY, midX, topY + hdrH);

        // Left Seller Info
        doc.setFont("helvetica", "bold").setFontSize(10);
        doc.text(shopName || "Shri Mahesh Automobiles", M + 6, topY + 16);
        doc.setFont("helvetica", "normal").setFontSize(8);
        let sy = topY + 30;
        if (shopAddress) {
            const lines = doc.splitTextToSize(String(shopAddress), midX - M - 12);
            doc.text(lines, M + 6, sy); sy += lines.length * 10;
        }
        if (shopPhone) { doc.text(`Ph : ${shopPhone}`, M + 6, sy); sy += 11; }
        if (shopGst) { doc.text(`GSTIN/UIN : ${shopGst}`, M + 6, sy); sy += 11; }

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
        drawField(0, "Invoice No.", invoiceNo || "—");
        drawField(1, "Dated", invoiceAt ? fmtDateTime(invoiceAt) : fmtDate(Date.now()));
        drawField(2, "Order ID", `#SO-${invoiceNo || ""}`);
        drawField(3, "Mode of Payment", paymentMode || "CASH");

        // Buyer Block (Bill to) Box (Top 155 to 220)
        const buyY = topY + hdrH, buyH = 65;
        doc.rect(M, buyY, W, buyH);
        doc.setFont("helvetica", "bold").setFontSize(8);
        doc.text("Buyer (Bill to) / Customer Details :", M + 6, buyY + 14);
        doc.setFont("helvetica", "normal").setFontSize(8);
        let by = buyY + 26;
        if (customerName) {
            doc.text(`Name : ${customerName}${customerPhone ? `  (Ph: ${customerPhone})` : ""}`, M + 6, by); by += 11;
        }
        if (customerAddress) {
            const alines = doc.splitTextToSize(`Address : ${customerAddress}`, W - 12);
            doc.text(alines, M + 6, by); by += alines.length * 10;
        }
        if (vehicleReg) { doc.text(`Vehicle No : ${vehicleReg}`, M + 6, by); by += 11; }
        if (notes) { doc.text(`Remarks : ${notes}`, M + 6, by); }

        // Table
        const head = ["Sl No.", "Description of Goods", "HSN/SAC", ...(showOem ? ["OEM No."] : []), "Qty", "Rate (Incl. Tax)", "Rate", ...(showMrp ? ["MRP"] : []), "Disc %", "Amount"];
        const totalQty = items.reduce((s: number, it: any) => s + Number(it.qty || 0), 0);
        autoTable(doc, {
            startY: buyY + buyH + 8,
            head: [head],
            body: items.map((it: any, i: number) => {
                const lc = lineCalcs[i];
                return [
                    String(i + 1), it.name,
                    "8708",
                    ...(showOem ? [it.oemNumber || "—"] : []),
                    `${it.qty} NOS`, rs(it.price), rs(it.price),
                    ...(showMrp ? [it.mrp ? rs(it.mrp) : "—"] : []),
                    lc.discAmt > 0 ? `${Math.round((lc.discAmt / (it.price * it.qty)) * 100)}%` : "—", rs(lc.afterDisc),
                ];
            }),
            foot: [
                [
                    { content: "Total", colSpan: 3 + (showOem ? 1 : 0), styles: { fontStyle: "bold", halign: "left" } },
                    { content: `${totalQty} NOS`, styles: { fontStyle: "bold", halign: "center" } },
                    "", "", ...(showMrp ? [""] : []), "",
                    { content: rs(finalTotal), styles: { fontStyle: "bold", halign: "right" } }
                ]
            ],
            styles: { fontSize: 8, cellPadding: 4, textColor: [0, 0, 0], lineWidth: 0.5, lineColor: [0, 0, 0] },
            headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.5, lineColor: [0, 0, 0] },
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.5, lineColor: [0, 0, 0] },
            margin: { left: M, right: M },
        });

        let fy = ((doc as any).lastAutoTable?.finalY || (buyY + buyH + 40)) + 12;
        const lx = 340;
        const trow = (l: string, v: string, b = false) => {
            doc.setFont("helvetica", b ? "bold" : "normal").setFontSize(b ? 11 : 9).setTextColor(0, 0, 0);
            doc.text(l, lx, fy); doc.text(v, R, fy, { align: "right" }); fy += b ? 16 : 13;
        };
        if (grandDiscount > 0) trow("Item Discounts", `-${rs(grandDiscount)}`);
        if (additionalDisc > 0) trow("Additional Discount", `-${rs(additionalDisc)}`);
        trow("GST (Inclusive)", rs(grandGst));
        fy += 4;
        doc.line(lx, fy, R, fy);
        fy += 16;
        trow("TOTAL AMOUNT", rs(finalTotal), true);
        fy += 8;

        // Amount in words matching Screenshot 1
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(80, 80, 80);
        doc.text("Amount Chargeable (in words)", M, fy);
        doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(0, 0, 0);
        doc.text(`INR ${Math.round(finalTotal).toLocaleString("en-IN")} Only`, M, fy + 12);
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
        doc.text(`We declare that this ${billType === "Sale" ? "tax invoice" : "quotation"} shows the actual value of\ngoods and that all particulars are true and correct.`, M + 6, fy + 38);

        doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
        doc.text(`for ${shopName || "Shri Mahesh Automobiles"}`, R - 6, fy + 14, { align: "right" });
        doc.text("Authorised Signatory", R - 6, fy + decH - 10, { align: "right" });

        return doc;
    };

    // Runs the actual print/download/share action once the shop has confirmed
    // whether OEM number and MRP should appear on the bill.
    async function runBillAction(action: "print" | "download" | "whatsapp", opts: { showOem: boolean; showMrp: boolean }) {
        if (action === "print") {
            if (printFormat === "a4") {
                let blobUrl: string | null = null;
                if (syncedInvoiceId) {
                    try {
                        const res = await fetch(getInvoicePdfUrl(syncedInvoiceId, opts), {
                            headers: { Authorization: `Bearer ${getAccessToken()}` }, credentials: "include",
                        });
                        if (res.ok) blobUrl = URL.createObjectURL(await res.blob());
                    } catch {}
                }
                if (!blobUrl && inlinePdfUrl) blobUrl = inlinePdfUrl;
                if (!blobUrl) {
                    try {
                        const doc = await buildBillPdf(opts);
                        blobUrl = URL.createObjectURL(doc.output("blob"));
                    } catch {}
                }
                if (blobUrl) {
                    setPdfPreview({ url: blobUrl, loading: false, error: null });
                    return;
                }
            }
            printInvoice({
                format: printFormat,
                shop: { name: shopName, address: shopAddress, gstin: shopGst, phone: shopPhone, logoUrl: (shop as any)?.logoUrl || (shop as any)?.photoUrl || undefined },
                invoice: {
                    invoiceNo,
                    invoiceAt: invoiceAt ? fmtDateTime(invoiceAt) : undefined,
                    isInvoice: billType === "Sale",
                    customerName: customerName || undefined,
                    customerPhone: customerPhone || undefined,
                    customerAddress: customerAddress || undefined,
                    billingAddress: customerAddress || undefined,
                    vehicleReg: vehicleReg || undefined,
                    paymentMode: paymentMode || undefined,
                    notes: notes || undefined,
                },
                items: items.map((item, idx) => {
                    const lc = lineCalcs[idx];
                    return { name: item.name, sku: item.sku, oemNumber: item.oemNumber, mrp: item.mrp, qty: item.qty, price: item.price, discAmt: lc.discAmt, gstAmt: lc.gstAmt, afterDisc: lc.afterDisc };
                }),
                totals: { grandDiscount, additionalDisc, grandGst, finalTotal },
                showOem: opts.showOem,
                showMrp: opts.showMrp,
            });
            return;
        }

        if (action === "download") {
            if (syncedInvoiceId) {
                try {
                    const res = await fetch(getInvoicePdfUrl(syncedInvoiceId, opts), {
                        headers: { Authorization: `Bearer ${getAccessToken()}` }, credentials: "include",
                    });
                    if (res.ok) {
                        // Save via a named <a download> instead of window.open(blob:…) — a
                        // blob: URL handed to an external PDF viewer (common on mobile) can
                        // go stale before that viewer reads it, producing "Failed to load
                        // PDF document" even though the fetch succeeded. A real download
                        // with a proper filename always leaves a complete file on disk.
                        const blobUrl = URL.createObjectURL(await res.blob());
                        const a = document.createElement("a");
                        a.href = blobUrl;
                        a.download = `${invoiceNo || "invoice"}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                        return;
                    }
                } catch { /* fall through to the client-side PDF */ }
            }
            try {
                const doc = await buildBillPdf(opts);
                doc.save(`${invoiceNo || "invoice"}.pdf`);
            } catch { toast?.("Could not generate the PDF", "warning"); }
            return;
        }

        // whatsapp
        const text = `*${shopName}*\n${billType === "Sale" ? "Tax Invoice" : "Quotation"} ${invoiceNo}\nItems: ${items.length}\nTotal: ₹${finalTotal.toFixed(2)}\n\nThank you for your business! 🙏`;
        let pdfDownloaded = false;
        try {
            const doc = await buildBillPdf(opts);
            const blob = doc.output("blob");
            const file = new File([blob], `${invoiceNo || "invoice"}.pdf`, { type: "application/pdf" });
            const nav: any = navigator;
            if (nav.canShare && nav.canShare({ files: [file] })) {
                try { await nav.share({ files: [file], text, title: `Invoice ${invoiceNo}` }); return; }
                catch (e: any) { if (e?.name === "AbortError") return; /* else fall through */ }
            }
            doc.save(`${invoiceNo || "invoice"}.pdf`);
            pdfDownloaded = true;
        } catch { /* PDF unavailable — still send the text */ }
        const ph = customerPhone.replace(/\D/g, "");
        const url = ph.length === 10
            ? `https://wa.me/91${ph}?text=${encodeURIComponent(text)}`
            : `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
        if (pdfDownloaded) toast?.("Invoice PDF downloaded — attach it in the WhatsApp chat that just opened.", "info");
    };

    // ─── Invoice Preview ───────────────────────────────────────────────────────
    if (showInvoice) return (
        <div className="page-in" style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ background: T.emeraldBg, border: `1px solid rgba(16,185,129,0.25)`, borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 28 }}>✓</span>
                <div>
                    <div style={{ fontWeight: 800, color: T.emerald, fontSize: 16 }}>{billType === "Sale" ? "Sale Recorded!" : "Quotation Generated!"}</div>
                    <div style={{ fontSize: 13, color: T.t3, marginTop: 2 }}>{items.length} item{items.length > 1 ? "s" : ""} · {invoiceNo}</div>
                </div>
            </div>
            {/* ── A4 Preview (Inline PDF) ────────────────────────────────────── */}
            {printFormat === "a4" && (
                <div style={{ height: 800, width: "100%", background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", fontFamily: FONT.ui }}>
                    {inlinePdfUrl ? (
                        <iframe src={inlinePdfUrl} style={{ width: "100%", height: "100%", border: "none", display: "block" }} title="A4 Invoice" />
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", height: "100%", color: T.t3 }}>
                            <div style={{ width: 28, height: 28, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.amber}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Loading A4 Preview...</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Thermal Receipt Preview ─────────────────────────────────────── */}
            {printFormat === "thermal" && (() => {
                const dashes = "--------------------------------";
                return (
                <div style={{ display: "flex", justifyContent: "center" }}>
                <div data-print-area className="invoice-print-root" style={{
                    background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10,
                    padding: "14px 16px", width: 320, fontFamily: "'Courier New', Courier, monospace",
                    fontSize: 12, color: "#000",
                }}>
                    {/* Shop header */}
                    {((shop as any)?.logoUrl || (shop as any)?.photoUrl)
                        ? <div style={{ textAlign: "center", marginBottom: 4 }}><img src={(shop as any).logoUrl || (shop as any).photoUrl} alt={shopName} style={{ height: 44, maxWidth: 200, objectFit: "contain" }} /></div>
                        : <div style={{ textAlign: "center", fontSize: 26, fontWeight: 900, marginBottom: 2 }}>{shopName.charAt(0).toUpperCase()}</div>
                    }
                    <div style={{ textAlign: "center", fontWeight: 900, fontSize: 14, letterSpacing: "0.04em", marginBottom: 2 }}>{shopName}</div>
                    {shopAddress && <div style={{ textAlign: "center", fontSize: 10, color: "#555", lineHeight: 1.5 }}>{shopAddress}</div>}
                    {shopGst && <div style={{ textAlign: "center", fontSize: 10, color: "#555" }}>GSTIN: {shopGst}</div>}
                    {shopPhone && <div style={{ textAlign: "center", fontSize: 10, color: "#555" }}>Ph: {shopPhone}</div>}

                    <div style={{ color: "#999", margin: "6px 0", fontSize: 10 }}>{dashes}</div>

                    <div style={{ textAlign: "center", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em" }}>{billType === "Sale" ? "TAX INVOICE" : "QUOTATION"}</div>
                    <div style={{ textAlign: "center", fontWeight: 700, fontSize: 12 }}>{invoiceNo}</div>
                    {invoiceAt && <div style={{ textAlign: "center", fontSize: 10, color: "#555" }}>{fmtDateTime(invoiceAt)}</div>}

                    <div style={{ color: "#999", margin: "6px 0", fontSize: 10 }}>{dashes}</div>

                    {customerName && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}><span style={{ color: "#555" }}>Customer</span><span>{customerName}</span></div>}
                    {vehicleReg && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}><span style={{ color: "#555" }}>Vehicle</span><span style={{ fontWeight: 700 }}>{vehicleReg}</span></div>}
                    {paymentMode && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}><span style={{ color: "#555" }}>Payment</span><span>{paymentMode}</span></div>}

                    <div style={{ color: "#999", margin: "6px 0", fontSize: 10 }}>{dashes}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 11, marginBottom: 4 }}><span>Item</span><span>Amt</span></div>
                    <div style={{ color: "#999", margin: "4px 0 6px", fontSize: 10 }}>{dashes}</div>

                    {items.map((item, idx) => {
                        const lc = lineCalcs[idx];
                        return (
                            <div key={idx} style={{ marginBottom: 6 }}>
                                <div style={{ fontWeight: 600, fontSize: 12, wordBreak: "break-word" }}>
                                    {item.qty} × {item.name}
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 1 }}>
                                    <span style={{ color: "#666" }}>
                                        {fmt(item.price)}{lc.discAmt > 0 ? ` − ${fmt(lc.discAmt)} disc` : ""}
                                        {item.sku ? ` | ${item.sku}` : ""}
                                    </span>
                                    <span style={{ fontWeight: 700, whiteSpace: "nowrap", paddingLeft: 8 }}>{fmt(lc.afterDisc)}</span>
                                </div>
                                <div style={{ fontSize: 10, color: "#666" }}>
                                    {/* spacer kept for sub-line extras if needed */}
                                </div>
                            </div>
                        );
                    })}

                    <div style={{ color: "#999", margin: "6px 0", fontSize: 10 }}>{dashes}</div>

                    {grandDiscount > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666", marginBottom: 2 }}><span>Discounts</span><span>−{fmt(grandDiscount)}</span></div>}
                    {additionalDisc > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666", marginBottom: 2 }}><span>Extra Disc</span><span>−{fmt(additionalDisc)}</span></div>}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666", marginBottom: 4 }}><span>GST (Incl.)</span><span>{fmt(grandGst)}</span></div>

                    <div style={{ color: "#999", margin: "4px 0", fontSize: 10 }}>{dashes}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 15 }}><span>TOTAL</span><span>{fmt(finalTotal)}</span></div>
                    <div style={{ color: "#999", margin: "4px 0 8px", fontSize: 10 }}>{dashes}</div>

                    <div style={{ textAlign: "center", fontSize: 10, color: "#888", lineHeight: 1.6 }}>
                        Computer-generated {billType === "Sale" ? "tax invoice" : "quotation"}.<br />
                        Thank you for your business!
                    </div>
                </div>
                </div>
                );
            })()}
            {/* ── Print format toggle ─────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Print format:</span>
                {(["a4", "thermal"] as PrintFormat[]).map(fmt => (
                    <button key={fmt} onClick={() => handleSetPrintFormat(fmt)} style={{
                        padding: "3px 11px", borderRadius: 7, border: `1.5px solid ${printFormat === fmt ? T.amber : T.border}`,
                        background: printFormat === fmt ? T.amber : "transparent",
                        color: printFormat === fmt ? "#fff" : T.t2,
                        fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui,
                    }}>
                        {fmt === "a4" ? "📄 A4" : "🧾 Thermal"}
                    </button>
                ))}
            </div>

            {/* ── Bill visibility toggles — set once, apply to every action below ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, marginBottom: 2, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={showOemOnBill} onChange={e => setShowOemOnBill(e.target.checked)} style={{ width: 15, height: 15 }} />
                    <span style={{ fontSize: 11, color: T.t2, fontWeight: 600 }}>Show OEM number on bill</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={showMrpOnBill} onChange={e => setShowMrpOnBill(e.target.checked)} style={{ width: 15, height: 15 }} />
                    <span style={{ fontSize: 11, color: T.t2, fontWeight: 600 }}>Show MRP on bill</span>
                </label>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <button onClick={() => runBillAction("print", { showOem: showOemOnBill, showMrp: showMrpOnBill })} style={{ flex: 1, minWidth: 110, height: 42, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t2, cursor: "pointer", fontFamily: FONT.ui }}>🖨 Print</button>
                {syncedInvoiceId && (
                    <button
                        id="pos-preview-pdf-btn"
                        onClick={openPdfPreview}
                        style={{ flex: 1, minWidth: 140, height: 42, background: T.amber, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: FONT.ui }}
                    >
                        👁 Preview PDF
                    </button>
                )}
                <button
                    onClick={() => runBillAction("download", { showOem: showOemOnBill, showMrp: showMrpOnBill })}
                    style={{ flex: 1, minWidth: 140, height: 42, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: syncedInvoiceId ? T.t1 : T.t3, cursor: "pointer", fontFamily: FONT.ui }}>
                    📄 Download PDF
                </button>
                <button
                    onClick={() => runBillAction("whatsapp", { showOem: showOemOnBill, showMrp: showMrpOnBill })}
                    style={{ flex: 1, minWidth: 140, height: 42, background: "#25D366", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: FONT.ui }}>
                    💬 Share WhatsApp
                </button>
                {syncedInvoiceId && billType === "Sale" && (
                    <button onClick={() => setReturnModalOpen(true)} title="Start a return or exchange for this invoice"
                        style={{ flex: 1, minWidth: 140, height: 42, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t1, cursor: "pointer", fontFamily: FONT.ui }}>
                        ↩️ Return / Exchange
                    </button>
                )}
                <button onClick={newBill} style={{ flex: 1.5, minWidth: 130, height: 42, background: T.amber, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", fontFamily: FONT.ui }}>🆕 New Bill</button>
            </div>
            {syncedInvoiceId && (
                <NewReturnExchangeModal
                    open={returnModalOpen}
                    onClose={() => setReturnModalOpen(false)}
                    onCreated={() => setReturnModalOpen(false)}
                    toast={toast}
                    initialInvoice={{
                        invoiceId: syncedInvoiceId,
                        invoiceNumber: invoiceNo,
                        partyName: customerName || undefined,
                        partyId: partyId ? Number(partyId) : null,
                        totalAmount: String(finalTotal),
                        createdAt: invoiceAt ? new Date(invoiceAt).toISOString() : new Date().toISOString(),
                    }}
                />
            )}
            {/* PDF Preview Modal */}
            {pdfPreview && (
                <PdfPreviewModal
                    url={pdfPreview.url}
                    loading={pdfPreview.loading}
                    error={pdfPreview.error}
                    title={`Invoice ${invoiceNo}`}
                    filename={`${invoiceNo || 'invoice'}.pdf`}
                    onClose={closePdfPreview}
                />
            )}
        </div>
    );


    // ─── Main POS UI ───────────────────────────────────────────────────────────
    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* POS / Purchase Bills tab switcher */}
            <div style={{ display: "flex", gap: 6 }}>
                {([["pos", "🧾", "Point of Sale"], ["bills", "📂", "Purchase Bills"]] as const).map(([id, icon, label]) => (
                    <button key={id} onClick={() => setPosTab(id)}
                        style={{ height: 38, padding: "0 16px", borderRadius: 9, border: `1.5px solid ${posTab === id ? T.amber : T.border}`, background: posTab === id ? T.amber : "#FFFFFF", color: posTab === id ? "#FFFFFF" : T.t2, fontSize: 13, fontWeight: posTab === id ? 700 : 500, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s", flexShrink: 0 }}>
                        <span>{icon}</span> {label}
                    </button>
                ))}
            </div>

            {posTab === "bills" ? (
                <PurchaseBills toast={toast} />
            ) : (
            <>
            {/* Barcode Scanner */}
            <BarcodeScanner open={scanOpen} onScan={handlePosScan} onClose={() => setScanOpen(false)} hint="Scan product barcode to add to bill" />

            {/* Out of Stock popup — portalled to body so it covers sidebar + header */}
            {outOfStockItem && createPortal(
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setOutOfStockItem(null)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: "28px 28px 24px", maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.28)", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: T.t1, fontFamily: FONT.display, marginBottom: 6 }}>Out of Stock</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.amber, fontFamily: FONT.ui, marginBottom: 4 }}>{outOfStockItem.name}</div>
                        {outOfStockItem.sku && <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono, marginBottom: 14 }}>SKU: {outOfStockItem.sku}</div>}
                        <div style={{ fontSize: 13, color: T.t2, marginBottom: 8, lineHeight: 1.6 }}>
                            This product has <b>0 units</b> in stock.
                        </div>
                        {items.length > 0 && (
                            <div style={{ fontSize: 12, color: T.t3, background: "#f9f9f9", borderRadius: 8, padding: "8px 12px", marginBottom: 20, lineHeight: 1.5 }}>
                                Your current bill ({items.length} item{items.length > 1 ? "s" : ""}) will be <b>suspended</b> and can be resumed when you return.
                            </div>
                        )}
                        {items.length === 0 && <div style={{ marginBottom: 20 }} />}
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setOutOfStockItem(null)} style={{ flex: 1, height: 44, background: "#f5f5f5", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t2, cursor: "pointer", fontFamily: FONT.ui }}>
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const q = outOfStockItem.sku || outOfStockItem.name;
                                    setOutOfStockItem(null);
                                    if (items.length > 0) handleSuspend();
                                    navigate(`/inventory?q=${encodeURIComponent(q)}`);
                                }}
                                style={{ flex: 2, height: 44, background: T.amber, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                                🔄 Reorder / Add Stock
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Suspended bill banner */}
            {suspendedBill && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.amberGlow, border: `1px solid rgba(139,30,30,0.2)`, borderRadius: 9, padding: "8px 16px" }}>
                    <span style={{ fontSize: 13, color: T.amber, fontWeight: 600, flex: 1 }}>⏸ Suspended bill from {new Date(suspendedBill.timestamp).toLocaleTimeString()}</span>
                    <button onClick={handleResume} style={{ background: T.amber, border: "none", borderRadius: 7, padding: "5px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>Resume</button>
                </div>
            )}

            {/* ── SCAN BARCODE + SEARCH ── */}
            <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {/* Scan barcode button */}
                <button onClick={() => setScanOpen(true)}
                    style={{ flexShrink: 0, height: 46, padding: "0 20px", background: `linear-gradient(135deg, ${T.amber}, #6A020A)`, border: "none", borderRadius: 10, color: "#FFFFFF", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(139,30,30,0.3)" }}>
                    🏷 SCAN BARCODE
                </button>

                {/* Search input */}
                <div style={{ flex: 1, position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: T.t3, pointerEvents: "none" }}>🔍</span>
                    <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by SKU, Name or OEM (CMD + K)"
                        style={{ width: "100%", height: 46, background: T.bg, border: `1px solid ${search ? T.amber : T.border}`, borderRadius: 10, padding: "0 14px 0 42px", fontSize: 14, color: T.t1, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = search ? T.amber : T.border; }}
                    />
                    {/* Dropdown */}
                    {searchResults.length > 0 && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, marginTop: 4, zIndex: 200, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", maxHeight: 320, overflowY: "auto" }}>
                            {searchResults.map((p: any) => (
                                <button key={p.id} onClick={() => addProduct(p)} style={{ width: "100%", padding: "11px 16px", background: "transparent", border: "none", borderBottom: `1px solid ${T.border}`, color: T.t1, cursor: "pointer", textAlign: "left", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 12 }} className="trow">
                                    <span style={{ fontSize: 20 }}>{p.image?.startsWith("http") ? "" : p.image || "📦"}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                                        <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono, marginTop: 1 }}>{p.sku} · Stock: {p.stock}</div>
                                    </div>
                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" }}>
                                            {p.mrp > p.sellPrice && (
                                                <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.t3, textDecoration: "line-through" }}>{fmt(p.mrp)}</span>
                                            )}
                                            <span style={{ fontFamily: FONT.mono, fontWeight: 800, color: T.amber, fontSize: 14 }}>{fmt(p.sellPrice)}</span>
                                        </div>
                                        <div style={{ fontSize: 10, color: T.t3 }}>{margin(p.buyPrice, p.sellPrice)}% margin</div>
                                    </div>
                                    {items.some(i => i.productId === p.id) && <span style={{ background: T.emeraldBg, color: T.emerald, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>Added</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bill type toggle */}
                <div style={{ display: "flex", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2, flexShrink: 0 }}>
                    {["Sale","Quotation"].map(t => (
                        <button key={t} onClick={() => setBillType(t)} style={{ height: 38, padding: "0 14px", borderRadius: 7, border: "none", background: billType === t ? T.amber : "transparent", color: billType === t ? "#FFFFFF" : T.t3, fontSize: 12, fontWeight: billType === t ? 700 : 500, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.12s" }}>{t}</button>
                    ))}
                </div>

                {items.length > 0 && (
                    <button onClick={handleSuspend} style={{ height: 38, padding: "0 14px", background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 12, fontWeight: 600, color: T.t2, cursor: "pointer", fontFamily: FONT.ui, flexShrink: 0 }}>⏸ Suspend</button>
                )}
            </div>

            {items.length > 0 && (
              <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "6px 14px", background: T.surfaceContainerLow, borderRadius: 8, fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>
                <span>Shortcuts:</span>
                <span><kbd style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 4, padding: "1px 6px", fontFamily: FONT.mono, fontSize: 10, color: T.t1 }}>/</kbd> Search</span>
                <span><kbd style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 4, padding: "1px 6px", fontFamily: FONT.mono, fontSize: 10, color: T.t1 }}>Ctrl+Enter</kbd> Print Bill</span>
              </div>
            )}

            {/* ── RECENT ITEMS QUICK-ADD STRIP ── */}
            {recentItems.length > 0 && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.ui, flexShrink: 0 }}>Recent:</span>
                    {recentItems.map((p: any) => (
                        <button key={p.id} onClick={() => addProduct(p)} style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "5px 11px", borderRadius: 20,
                            border: `1px solid ${items.some(i => i.productId === p.id) ? T.amber : T.border}`,
                            background: items.some(i => i.productId === p.id) ? T.amberGlow : "#FFFFFF",
                            color: items.some(i => i.productId === p.id) ? T.amber : T.t2,
                            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui,
                            transition: "all 0.12s", whiteSpace: "nowrap",
                        }}>
                            <span style={{ fontSize: 14 }}>{p.image?.startsWith("http") ? "" : p.image || "📦"}</span>
                            <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                            <span style={{ fontSize: 10, color: T.t3, fontFamily: FONT.ui }}>{fmt(p.sellPrice)}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* ── INVOICE ITEMS ── */}
            <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.t2, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui }}>Invoice Items</span>
                    {items.length > 0 && (
                        <span style={{ background: T.amber, color: "#FFFFFF", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, fontFamily: FONT.ui, letterSpacing: "0.06em" }}>
                            {items.length} ITEMS TOTAL
                        </span>
                    )}
                </div>

                {items.length === 0 ? (
                    <div style={{ padding: "48px 24px", textAlign: "center", color: T.t3 }}>
                        <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 14 }}>🧾</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.t2, marginBottom: 6 }}>No items yet</div>
                        <div style={{ fontSize: 12 }}>Search for a product above or scan a barcode to start billing</div>
                    </div>
                ) : (
                    <div className="table-scroll">
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                                <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                                    {["#","Product","OEM No.","Qty","Price","Disc.","Total","Actions"].map(h => (
                                        <th key={h} style={{ padding: "10px 14px", textAlign: h === "Price" || h === "Total" || h === "Disc." ? "right" : "left", fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => {
                                    const lc = lineCalcs[idx];
                                    return (
                                        <tr key={idx} className="trow" style={{ borderBottom: idx < items.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                            <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 12, color: T.t4, fontWeight: 700 }}>{idx + 1}</td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    {typeof item.image === "string" && item.image.startsWith("http")
                                                        ? <img src={item.image} alt={item.name} style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4, flexShrink: 0 }} />
                                                        : <span style={{ fontSize: 18, flexShrink: 0 }}>{item.image || "📦"}</span>
                                                    }
                                                    <div>
                                                        {String(item.productId || "").startsWith("custom_") ? (
                                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                                <input value={item.name} onChange={e => updateItem(idx, "name", e.target.value)} placeholder="Item name…"
                                                                    maxLength={100}
                                                                    style={{ width: 200, height: 30, background: T.bg, border: `1px solid ${item.name && item.name !== "Custom Item" ? T.border : T.amber}`, borderRadius: 6, padding: "0 8px", color: T.t1, fontSize: 13, fontWeight: 700, outline: "none" }} />
                                                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                                    <span style={{ fontSize: 10, color: T.t3 }}>Buy Price ₹</span>
                                                                    <input type="number" value={item.buyPrice || ""} min="0" placeholder="0"
                                                                        onFocus={e => e.target.select()}
                                                                        onChange={e => updateItem(idx, "buyPrice", e.target.value === "" ? 0 : Math.max(0, +e.target.value))}
                                                                        style={{ width: 64, height: 22, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 5, padding: "0 6px", color: T.t3, fontFamily: FONT.mono, fontSize: 11, outline: "none" }} />
                                                                    <span style={{ fontSize: 9, color: T.t3 }}>(for profit)</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                                                        )}
                                                        {String(item.productId || "").startsWith("custom_")
                                                            ? <div style={{ fontSize: 10, color: T.amber, marginTop: 1, fontWeight: 600 }}>Custom · GST {item.gstRate}%</div>
                                                            : <div style={{ fontSize: 10, color: T.t3, marginTop: 1 }}>
                                                                Stock: {item.maxStock} · GST {item.gstRate}%
                                                                {item.mrp > item.price && <> · MRP <span style={{ textDecoration: "line-through" }}>{fmt(item.mrp)}</span></>}
                                                              </div>
                                                        }
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontSize: 11, color: T.t3 }}>{item.oemNumber || "—"}</td>
                                            <td style={{ padding: "12px 10px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                    <button onClick={() => updateItem(idx, "qty", Math.max(1, item.qty - 1))}
                                                        style={{ width: 26, height: 34, background: T.bg, border: `1px solid ${T.border}`, borderRadius: "7px 0 0 7px", color: T.t1, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>−</button>
                                                    <input type="number" value={item.qty} min="1" max={billType === "Sale" ? item.maxStock : 999}
                                                        onChange={e => updateItem(idx, "qty", Math.max(1, +e.target.value))}
                                                        style={{ width: 44, height: 34, background: T.bg, border: `1px solid ${T.border}`, borderLeft: "none", borderRight: "none", padding: "0 4px", color: T.t1, fontFamily: FONT.mono, fontSize: 14, fontWeight: 800, textAlign: "center", outline: "none" }} />
                                                    <button onClick={() => updateItem(idx, "qty", Math.min(billType === "Sale" ? item.maxStock : 999, item.qty + 1))}
                                                        style={{ width: 26, height: 34, background: T.bg, border: `1px solid ${T.border}`, borderRadius: "0 7px 7px 0", color: T.t1, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
                                                </div>
                                            </td>
                                            <td style={{ padding: "12px 10px", textAlign: "right" }}>
                                                <input type="number" value={item.price === 0 ? "" : item.price} min="0" max="10000000" step="0.01" placeholder="0"
                                                    onFocus={e => e.target.select()}
                                                    onChange={e => updateItem(idx, "price", e.target.value === "" ? 0 : Math.max(0, +e.target.value))}
                                                    style={{ width: 82, height: 34, background: T.bg, border: `1px solid ${item.price !== item.originalPrice ? T.amber : T.border}`, borderRadius: 7, padding: "0 8px", color: T.t1, fontFamily: FONT.mono, fontSize: 13, textAlign: "right", outline: "none" }} />
                                            </td>
                                            <td style={{ padding: "12px 10px", textAlign: "right" }}>
                                                <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "flex-end" }}>
                                                    <input type="number" value={item.discount === 0 ? "" : item.discount} min="0" placeholder="0"
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => updateItem(idx, "discount", e.target.value === "" ? 0 : Math.max(0, +e.target.value))}
                                                        style={{ width: 46, height: 34, background: T.bg, border: `1px solid ${T.border}`, borderRadius: "7px 0 0 7px", borderRight: "none", padding: "0 6px", color: T.t1, fontFamily: FONT.mono, fontSize: 12, textAlign: "center", outline: "none" }} />
                                                    <select value={item.discountType} onChange={e => updateItem(idx, "discountType", e.target.value)}
                                                        title="Discount type: percentage or fixed amount"
                                                        style={{ height: 34, background: T.bg, border: `1px solid ${T.border}`, borderRadius: "0 7px 7px 0", color: T.t2, fontFamily: FONT.ui, fontSize: 12, fontWeight: 700, outline: "none", cursor: "pointer", padding: "0 4px" }}>
                                                        <option value="%">%</option>
                                                        <option value="flat">₹</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td style={{ padding: "12px 14px", fontFamily: FONT.mono, fontWeight: 800, fontSize: 14, color: T.t1, textAlign: "right" }}>{fmt(lc.afterDisc)}</td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <button onClick={() => removeItem(idx)} style={{ width: 30, height: 30, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 7, color: T.crimson, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Custom items are now synced to the backend — no warning needed */}

                {/* Below table row: actions */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderTop: items.length > 0 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ display: "flex", gap: 18 }}>
                        <button onClick={() => {
                            setItems(prev => [...prev, { productId: `custom_${Date.now()}`, name: "Custom Item", sku: "", image: "📦", qty: 1, price: 0, originalPrice: 0, discount: 0, discountType: "%", gstRate: 18, buyPrice: 0, maxStock: 999 }]);
                        }} style={{ background: "none", border: "none", fontSize: 12, fontWeight: 700, color: T.amber, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
                            <span style={{ fontSize: 16 }}>⊕</span> ADD CUSTOM ITEM
                        </button>
                        <button onClick={() => setCustomerName("Walk-in Customer")}
                            style={{ background: "none", border: "none", fontSize: 12, fontWeight: 700, color: T.t2, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
                            🔄 WALK-IN CUSTOMER
                        </button>
                    </div>
                    {items.length > 0 && (
                        <button onClick={() => setItems([])}
                            style={{ background: "none", border: "none", fontSize: 12, fontWeight: 700, color: T.crimson, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
                            🗑 CLEAR ALL
                        </button>
                    )}
                </div>
            </div>

            {/* ── BOTTOM TWO COLUMNS: NOTES (left) + CHECKOUT SUMMARY (right) ── */}
            <div className="rp-grid-2" style={{ alignItems: "start" }}>

                {/* LEFT: Invoice Notes */}
                <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>ℹ</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.t2, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui }}>Invoice Notes</span>
                    </div>

                    {/* Customer fields */}
                    <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, borderBottom: `1px solid ${T.border}` }}>
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4, fontFamily: FONT.ui }}>Customer Name</label>
                            <PartyAutocomplete
                                type="CUSTOMER"
                                value={customerName}
                                onChange={name => { setCustomerName(name); setPartyId(null); }}
                                onSelect={({ partyId: pid, name, phone, billingAddress }) => {
                                    setCustomerName(name);
                                    setPartyId(pid);
                                    if (phone) setCustomerPhone(phone);
                                    if (billingAddress) setCustomerAddress(billingAddress);
                                }}
                                placeholder="Name or garage"
                                inputStyle={{ height: 34, fontSize: 12 }}
                                toast={toast}
                            />
                            {partyId && <div style={{ fontSize: 10, color: T.emerald, marginTop: 3 }}>✓ Linked to saved customer{totalAvailableCredit > 0 ? ` · ₹${totalAvailableCredit.toFixed(0)} credit available` : ""}</div>}
                        </div>
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4, fontFamily: FONT.ui }}>WhatsApp No.</label>
                            <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                                placeholder="For invoice sharing" type="tel" maxLength={10} inputMode="numeric"
                                style={{ width: "100%", height: 34, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 10px", color: T.t1, fontSize: 12, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4, fontFamily: FONT.ui }}>Vehicle Reg.</label>
                            <input value={vehicleReg} onChange={e => setVehicleReg(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 15))}
                                placeholder="MH 02 AB 1234" maxLength={15}
                                style={{ width: "100%", height: 34, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 10px", color: T.t1, fontSize: 12, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4, fontFamily: FONT.ui }}>Customer Address</label>
                            <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
                                placeholder="Billing / Delivery Address" maxLength={200}
                                style={{ width: "100%", height: 34, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 10px", color: T.t1, fontSize: 12, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box" }}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }} />
                        </div>
                    </div>

                    {/* Notes textarea */}
                    <div style={{ padding: "12px 16px" }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4, fontFamily: FONT.ui }}>Remarks / Special Instructions</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={500}
                            placeholder="Special instructions for shipping, warranty, or installation..."
                            rows={3}
                            style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
                            onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = T.amber; }}
                            onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = T.border; }}
                        />
                    </div>

                    {/* Quotation / Hold buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 16px 16px" }}>
                        <button onClick={() => handleSubmit("Quotation")}
                            style={{ height: 42, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 13, fontWeight: 700, color: T.t2, cursor: "pointer", fontFamily: FONT.ui, letterSpacing: "0.03em", transition: "all 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t2; }}>
                            SAVE QUOTATION
                        </button>
                        <button onClick={handleSuspend}
                            style={{ height: 42, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 13, fontWeight: 700, color: T.t2, cursor: "pointer", fontFamily: FONT.ui, letterSpacing: "0.03em", transition: "all 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; }}>
                            HOLD ORDER
                        </button>
                    </div>
                </div>

                {/* RIGHT: Checkout Summary */}
                <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ padding: "14px 18px 0" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui, marginBottom: 4 }}>Checkout Summary</div>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>Total Payable</span>
                            <span style={{ fontSize: 30, fontWeight: 900, color: T.amber, fontFamily: FONT.mono, letterSpacing: "-0.04em" }}>{fmt(finalTotal)}</span>
                        </div>

                        {/* Line items */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 14, borderBottom: `1px solid ${T.border}`, marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.t2 }}>
                                <span>Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})</span>
                                <span style={{ fontFamily: FONT.mono, fontWeight: 600 }}>{fmt(grandSubtotal)}</span>
                            </div>
                            {grandDiscount > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.crimson }}>
                                    <span>Item Discounts</span>
                                    <span style={{ fontFamily: FONT.mono, fontWeight: 600 }}>−{fmt(grandDiscount)}</span>
                                </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.t2 }}>
                                {/* grandTotal is tax-INCLUSIVE, so grandGst/grandTotal understates the
                                    rate (e.g. an 18%-rate item shows as ~15%, since 18/118 ≈ 15%). The
                                    actual weighted rate is tax / (tax-exclusive base) — base = total - tax. */}
                                <span>Taxes (GST avg {(grandTotal - grandGst) > 0 ? Math.round(grandGst / (grandTotal - grandGst) * 100) : 18}%)</span>
                                <span style={{ fontFamily: FONT.mono, fontWeight: 600 }}>{fmt(grandGst)} <span style={{ fontSize: 10, color: T.t3 }}>inc.</span></span>
                            </div>
                            {/* Additional Discount */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                                <span style={{ color: T.amber, fontWeight: 600 }}>Additional Discount</span>
                                <div style={{ position: "relative" }}>
                                    <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: T.t3, pointerEvents: "none" }}>₹</span>
                                    <input type="number" value={additionalDisc || ""} min="0" max={grandTotal}
                                        onChange={e => setAdditionalDisc(Math.max(0, Math.min(grandTotal, +e.target.value || 0)))}
                                        placeholder="0.00"
                                        style={{ width: 80, height: 30, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "0 8px 0 18px", fontFamily: FONT.mono, fontSize: 13, color: T.t1, outline: "none", textAlign: "right" }} />
                                </div>
                            </div>
                            {totalAvailableCredit > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                                    <span style={{ color: T.emerald, fontWeight: 600 }}>Store Credit (₹{totalAvailableCredit.toFixed(0)} available)</span>
                                    <div style={{ position: "relative" }}>
                                        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: T.t3, pointerEvents: "none" }}>₹</span>
                                        <input type="number" value={appliedCreditAmount || ""} min="0" max={Math.min(totalAvailableCredit, finalTotal)}
                                            onChange={e => applyCreditAmount(+e.target.value || 0, finalTotal)}
                                            placeholder="0.00"
                                            style={{ width: 80, height: 30, background: T.bg, border: `1px solid ${T.emerald}`, borderRadius: 7, padding: "0 8px 0 18px", fontFamily: FONT.mono, fontSize: 13, color: T.t1, outline: "none", textAlign: "right" }} />
                                    </div>
                                </div>
                            )}
                            {appliedCreditAmount > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: T.t1, paddingTop: 6, borderTop: `1px dashed ${T.border}` }}>
                                    <span>Amount Due</span>
                                    <span style={{ fontFamily: FONT.mono }}>{fmt(amountDue)}</span>
                                </div>
                            )}
                        </div>

                        {/* Payment method */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui, marginBottom: 10 }}>Payment Method</div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <PayBtn label="CASH"     icon="💵" active={paymentMode === "Cash"}     onClick={() => setPaymentMode("Cash")} />
                                <PayBtn label="CARD/UPI" icon="💳" active={paymentMode === "Card/UPI"} onClick={() => setPaymentMode("Card/UPI")} />
                                <PayBtn label="UDHAAR"   icon="📋" active={paymentMode === "Udhaar"}   onClick={() => setPaymentMode("Udhaar")} />
                            </div>
                            {paymentMode === "Udhaar" && (
                                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                                    {/* Party selector */}
                                    <select
                                        value={String(partyId ?? "")}
                                        onChange={e => setPartyId(e.target.value || null)}
                                        style={{ width: "100%", height: 34, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 10px", fontSize: 12, fontFamily: FONT.ui, color: T.t1, background: "#FFF", outline: "none" }}
                                    >
                                        <option value="">— Link a party (optional) —</option>
                                        {(parties || []).map((p: any) => (
                                            <option key={p.id} value={String(p.id)}>{p.name}{p.creditLimit ? ` · Limit ₹${p.creditLimit}` : ""}</option>
                                        ))}
                                    </select>
                                    {/* Credit limit warning */}
                                    {overLimit ? (
                                        <div style={{ background: `${T.crimson}12`, border: `1px solid ${T.crimson}44`, borderRadius: 8, padding: "7px 12px", fontSize: 11, color: T.crimson, fontWeight: 700 }}>
                                            ⛔ Over credit limit! Outstanding {fmt(partyOutstanding)} + this sale {fmt(finalTotal)} = {fmt(creditAfterSale)} (limit {fmt(creditLimit)})
                                        </div>
                                    ) : selectedParty && creditLimit > 0 ? (
                                        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: T.amber, fontWeight: 600 }}>
                                            ⚠ {fmt(finalTotal)} added to credit · Outstanding will be {fmt(creditAfterSale)} of {fmt(creditLimit)} limit
                                        </div>
                                    ) : (
                                        <div style={{ background: `${T.crimson}12`, border: `1px solid ${T.crimson}33`, borderRadius: 8, padding: "7px 12px", fontSize: 11, color: T.crimson, fontWeight: 600 }}>
                                            ⚠ {fmt(finalTotal)} will be added to credit ledger
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Finalize & Print button */}
                    <div style={{ padding: "0 18px 18px" }}>
                        <button onClick={handleSubmit} disabled={saving || items.length === 0}
                            style={{ width: "100%", height: 52, background: items.length === 0 ? T.surfaceContainerHigh : `linear-gradient(135deg, ${T.amber}, #6A020A)`, border: "none", borderRadius: 10, color: items.length === 0 ? T.t3 : "#FFFFFF", fontSize: 15, fontWeight: 800, cursor: items.length === 0 ? "not-allowed" : "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, letterSpacing: "0.03em", boxShadow: items.length > 0 ? "0 3px 12px rgba(139,30,30,0.35)" : "none", transition: "all 0.15s" }}>
                            {saving ? "Processing…" : "🖨 FINALIZE & PRINT"}
                        </button>
                        {items.length > 0 && (
                            <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>
                                Ctrl+Enter to submit · {billType}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </>
            )}
        </div>
    );
}
