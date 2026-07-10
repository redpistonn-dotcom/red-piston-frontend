import { useState, useMemo, useContext, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { T, FONT, SHADOWS } from "../theme";
import { useStore } from "../store";
import { api } from "../api/client";
import { AppCtx } from "../AppCtx";
import { fmt, fmtDate, downloadCSV, generateCSV, uid } from "../utils";
import { MobileCard, MobileCardList, useIsMobile, Skeleton } from "../components/ui";
import PdfPreviewModal from "../components/PdfPreviewModal";
import { getInvoicePdfUrl } from "../api/billing";
import { getAccessToken } from "../api/client";

// ─── Status config ────────────────────────────────────────────────────────────
type OrderStatus = "Shipped" | "Pending" | "Delivered" | "Cancelled" | "Processing" | "Stock Added";

const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; dot?: string; solid?: boolean }> = {
    Shipped:       { color: "#6B7280", bg: "transparent", dot: "#6B7280" },
    Pending:       { color: "#FFFFFF", bg: T.amber,       solid: true },
    Delivered:     { color: T.emerald, bg: "transparent", dot: T.emerald },
    Cancelled:     { color: "#9CA3AF", bg: "transparent", dot: "#9CA3AF" },
    Processing:    { color: T.sky,     bg: "transparent", dot: T.sky },
    "Stock Added": { color: T.sky,     bg: "transparent", dot: T.sky },
};

function StatusBadge({ status }: { status: OrderStatus }) {
    const cfg = STATUS_CFG[status] || STATUS_CFG.Pending;
    if (cfg.solid) {
        return (
            <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: cfg.bg, color: cfg.color,
                fontSize: 11, fontWeight: 700, fontFamily: FONT.ui,
                padding: "4px 12px", borderRadius: 20,
            }}>{status}</span>
        );
    }
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            border: `1px solid ${cfg.dot}44`, color: cfg.color,
            fontSize: 11, fontWeight: 600, fontFamily: FONT.ui,
            padding: "4px 10px", borderRadius: 20, background: "transparent",
        }}>
            {cfg.dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />}
            {status}
        </span>
    );
}

function TypeBadge({ type }: { type: "Sale" | "Purchase" }) {
    const isSale = type === "Sale";
    return (
        <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: FONT.ui,
            padding: "4px 12px", borderRadius: 20,
            color: isSale ? T.amber : T.sky,
            background: isSale ? T.amberGlow : T.skyBg,
            border: `1px solid ${isSale ? "rgba(139,30,30,0.2)" : "rgba(2,132,199,0.2)"}`,
        }}>{type}</span>
    );
}

// ─── Backend marketplace order helpers ───────────────────────────────────────
// Backend lifecycle (PENDING|CONFIRMED|PACKED|SHIPPED|DELIVERED|CANCELLED|RETURNED)
// → this page's OrderStatus badge values.
const MKT_STATUS_TO_LOCAL: Record<string, OrderStatus> = {
    PENDING: "Pending", NEW: "Pending", CONFIRMED: "Processing", PACKED: "Processing",
    SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled", RETURNED: "Cancelled",
};

// Next step in the fulfilment chain, used by the "advance status" pill button.
const MKT_NEXT_STATUS: Record<string, { next: string; label: string }> = {
    PENDING:   { next: "CONFIRMED", label: "Confirm" },
    NEW:       { next: "CONFIRMED", label: "Confirm" },
    CONFIRMED: { next: "PACKED",    label: "Packed" },
    PACKED:    { next: "SHIPPED",   label: "Shipped" },
    SHIPPED:   { next: "DELIVERED", label: "Delivered" },
};

// ─── Derive orders from movements ────────────────────────────────────────────
// A single bill/invoice creates ONE movement row per product. We group those
// movements by their shared invoice so the Orders list shows one order per
// invoice — not one per product — and every line item shares one Order ID.
function groupMovementsToOrders(movements: any[]) {
    const groups = new Map<string, any[]>();
    for (const m of movements) {
        const isSale     = m.type === "SALE";
        const isPurchase = m.type === "PURCHASE";
        const isOpening  = m.type === "OPENING";
        if (!isSale && !isPurchase && !isOpening) continue;

        // Collapse all line items of one bill under a single key. Sales/purchases
        // carry a shared invoiceNo/invoiceId; opening-stock and any movement without
        // an invoice stays on its own row (keyed by its unique movement id).
        const invKey = m.invoiceNo || (m.invoiceId != null ? String(m.invoiceId) : null);
        const key = invKey ? `inv:${invKey}` : `mov:${m.id}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(m);
    }

    const orders: any[] = [];
    for (const items of groups.values()) {
        const order = movementGroupToOrder(items);
        if (order) orders.push(order);
    }
    return orders;
}

function movementGroupToOrder(items: any[]) {
    const m = items[0];
    const isSale     = m.type === "SALE";
    const isPurchase = m.type === "PURCHASE";
    const isOpening  = m.type === "OPENING";  // inventory addition by shop owner
    if (!isSale && !isPurchase && !isOpening) return null;

    // Derive status (all line items of one bill share payment mode/status)
    let status: OrderStatus = "Pending";
    if (isOpening) {
        status = "Stock Added" as OrderStatus; // opening stock added directly to inventory
    } else if (m.paymentStatus === "paid" || m.paymentMode === "Cash" || m.paymentMode === "UPI" || m.paymentMode === "Card") {
        status = "Delivered";
    } else if (m.paymentStatus === "cancelled") {
        status = "Cancelled";
    } else if (m.paymentStatus === "pending" || m.paymentMode === "Credit") {
        status = "Pending";
    } else {
        status = isSale ? "Shipped" : "Processing";
    }

    // Order ID is derived from the shared invoice (not the per-product movement id)
    // so all items of one bill collapse to a single #SO-/#PO-/#OS- identifier.
    const idBasis = m.invoiceId != null ? String(m.invoiceId) : String(m.id || "");
    const numId   = idBasis.slice(-5).padStart(5, "0");
    const orderId = isSale ? `#SO-${numId}` : isOpening ? `#OS-${numId}` : `#PO-${numId}`;
    const partyId = isSale ? `PT-${numId}` : `SP-${numId}`;

    const amount = items.reduce((s, it) => s + (Number(it.total) || 0), 0);
    const names  = items.map(it => it.productName).filter(Boolean);
    const product = names.length > 1 ? `${names[0]} +${names.length - 1} more` : (names[0] || "");

    return {
        // Sales use the real invoiceId so the PDF preview fetches the right invoice;
        // non-sales fall back to the movement id (existing behaviour).
        id: (isSale && m.invoiceId != null) ? m.invoiceId : m.id,
        orderId,
        date: m.date,
        partyName: isSale
            ? (m.customerName || "Walk-in Customer")
            : (m.partyName || m.supplierName || m.supplier || "Supplier"),
        partyId,
        type: isSale ? "Sale" : "Purchase" as "Sale" | "Purchase",
        status,
        amount,
        product,
        itemCount: items.length,
        cancelled: status === "Cancelled",
    };
}

// ─── Create New Order Modal ───────────────────────────────────────────────────
function CreateOrderModal({ onClose, onCreated, activeShopId }: { onClose: () => void; onCreated: (id: string) => void; activeShopId: any }) {
    const { orders, saveOrders, products } = useStore();
    const [form, setForm] = useState({
        type: "Sale", party: "", productId: "", qty: "1", amount: "", status: "Pending",
    });
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    // The order product MUST come from the shop's inventory (no free text).
    const shopProducts = useMemo(
        () => (products || []).filter((p: any) => String(p.shopId ?? "") === String(activeShopId ?? "")),
        [products, activeShopId],
    );
    const selectedProd = shopProducts.find((p: any) => String(p.id) === String(form.productId));

    // Auto-fill amount = sellPrice × qty when a product/qty is picked (still editable).
    const pickProduct = (pid: string) => {
        const p = shopProducts.find((x: any) => String(x.id) === String(pid));
        const q = Math.max(1, parseInt(form.qty) || 1);
        setForm(f => ({ ...f, productId: pid, amount: p ? String((Number(p.sellPrice) || 0) * q) : f.amount }));
    };
    const setQty = (v: string) => {
        const q = Math.max(1, parseInt(v) || 1);
        setForm(f => ({ ...f, qty: String(q), amount: selectedProd ? String((Number(selectedProd.sellPrice) || 0) * q) : f.amount }));
    };

    const { toast } = useContext(AppCtx);
    const handleSubmit = () => {
        if (!form.party) { toast?.("Enter a party name to create this order", "warning"); return; }
        if (!selectedProd) { toast?.("Select a product from your inventory", "warning"); return; }
        const numId = Math.floor(Math.random() * 90000) + 10000;
        const newId = `#${form.type === "Sale" ? "SO" : "PO"}-${numId}`;
        const qty = Math.max(1, parseInt(form.qty) || 1);
        const unitPrice = Number(selectedProd.sellPrice) || 0;
        const total = parseFloat(String(form.amount).replace(/,/g, "")) || unitPrice * qty;
        const newOrder = {
            id: `manual_${numId}`,
            shopId: activeShopId,
            customer: form.type === "Sale" ? form.party : undefined,
            supplier: form.type === "Purchase" ? form.party : undefined,
            items: `${selectedProd.name} × ${qty}`,
            inventoryId: selectedProd.inventoryId ?? selectedProd.id,
            productName: selectedProd.name,
            qty,
            unitPrice,
            total,
            status: form.status === "Delivered" ? "DELIVERED" : form.status === "Shipped" ? "DISPATCHED" : form.status === "Cancelled" ? "CANCELLED" : "PENDING",
            time: Date.now(),
        };
        saveOrders([...(orders || []), newOrder]);
        onCreated(newId);
        onClose();
    };

    return createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,27,27,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 20, padding: "28px 28px 24px", width: "min(440px, calc(100vw - 32px))", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, fontFamily: FONT.display, marginBottom: 4 }}>Create New Order</div>
                <div style={{ fontSize: 12, color: T.t3, marginBottom: 22, fontFamily: FONT.ui }}>Add a new sale or procurement order to the pipeline</div>

                {[
                    { label: "Order Type", key: "type", options: ["Sale", "Purchase"] },
                    { label: "Status", key: "status", options: ["Pending", "Processing", "Shipped", "Delivered"] },
                ].map(field => (
                    <div key={field.key} style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: T.t2, display: "block", marginBottom: 5, fontFamily: FONT.ui }}>{field.label}</label>
                        <select value={(form as any)[field.key]} onChange={e => set(field.key, e.target.value)} style={{ width: "100%", height: 38, border: `1px solid ${T.border}`, borderRadius: 9, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, outline: "none", background: "#FFFFFF", color: T.t1 }}>
                            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                ))}

                {/* Party (customer/supplier) */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.t2, display: "block", marginBottom: 5, fontFamily: FONT.ui }}>{form.type === "Sale" ? "Customer Name" : "Supplier Name"}</label>
                    <input value={form.party} onChange={e => set("party", e.target.value)} placeholder={form.type === "Sale" ? "Titan Logistics Corp." : "Industrial Gear Ltd."}
                        style={{ width: "100%", height: 38, border: `1px solid ${T.border}`, borderRadius: 9, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, outline: "none", background: "#FFFFFF", color: T.t1, boxSizing: "border-box" }} />
                </div>

                {/* Product — MUST be chosen from the shop's inventory */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.t2, display: "block", marginBottom: 5, fontFamily: FONT.ui }}>Product (from inventory)</label>
                    <select value={form.productId} onChange={e => pickProduct(e.target.value)}
                        style={{ width: "100%", height: 38, border: `1px solid ${T.border}`, borderRadius: 9, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, outline: "none", background: "#FFFFFF", color: T.t1 }}>
                        <option value="">{shopProducts.length ? "Select a product…" : "No inventory products yet"}</option>
                        {shopProducts.map((p: any) => (
                            <option key={p.id} value={p.id}>{`${p.name} — ₹${p.sellPrice} · ${p.stock} in stock`}</option>
                        ))}
                    </select>
                </div>

                {/* Quantity + Amount */}
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 110 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: T.t2, display: "block", marginBottom: 5, fontFamily: FONT.ui }}>Quantity</label>
                        <input type="number" min={1} value={form.qty} onChange={e => setQty(e.target.value)}
                            style={{ width: "100%", height: 38, border: `1px solid ${T.border}`, borderRadius: 9, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, outline: "none", background: "#FFFFFF", color: T.t1, boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: T.t2, display: "block", marginBottom: 5, fontFamily: FONT.ui }}>Amount (₹)</label>
                        <input value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0"
                            style={{ width: "100%", height: 38, border: `1px solid ${T.border}`, borderRadius: 9, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, outline: "none", background: "#FFFFFF", color: T.t1, boxSizing: "border-box" }} />
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                    <button onClick={onClose} style={{ flex: 1, height: 40, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t2, cursor: "pointer", fontFamily: FONT.ui }}>Cancel</button>
                    <button onClick={handleSubmit} style={{ flex: 2, height: 40, background: T.amber, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", fontFamily: FONT.ui }}>⊕ Create Order</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function OrdersPage() {
    const { movements, products, orders: mktOrders, saveOrders, activeShopId, shops } = useStore();
    const { toast, currentUser } = useContext(AppCtx);
    const isMobile = useIsMobile();

    // Shop info for fallback PDF generation
    const shop = useMemo(() => {
        const fromStore = (shops || []).find((s: any) => s.id === activeShopId || s.shopId === activeShopId);
        if (fromStore) return fromStore;
        if ((currentUser as any)?.shop) return (currentUser as any).shop;
        return {} as any;
    }, [shops, activeShopId, currentUser]);
    const shopName    = shop?.name    || shop?.shopName || "Shri Mahesh Automobiles";
    const shopAddress = [shop?.address, shop?.city, shop?.pincode].filter(Boolean).join(", ") || "";
    const shopGstin   = shop?.gstNo   || shop?.gstin || "";
    const shopPhone   = shop?.phone   || "";
    const shopState   = shop?.state   || "";

    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [typeFilter, setTypeFilter] = useState<string>("All");
    const [search, setSearch] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [visibleCount, setVisibleCount] = useState(25);
    const [shopApiOrders, setShopApiOrders] = useState<any[]>([]);
    const [viewOrder, setViewOrder] = useState<any>(null);
    const [dropdownOrder, setDropdownOrder] = useState<string | null>(null);
    const [orderPdfPreview, setOrderPdfPreview] = useState<{ url: string | null; loading: boolean; title?: string; filename?: string; error?: string | null } | null>(null);

    const printOrder = async (order: any) => {
        setOrderPdfPreview({ url: null, loading: true, title: `Order ${order.orderId}`, filename: `order-${order.id}.pdf`, error: null });
        try {
            if (order.type === "Sale" && order.id) {
                const res = await fetch(getInvoicePdfUrl(order.id, { showOem: true, showMrp: true }), {
                    headers: { Authorization: `Bearer ${getAccessToken()}` }, credentials: "include",
                });
                if (res.ok) {
                    const blob = await res.blob();
                    setOrderPdfPreview({ url: URL.createObjectURL(blob), loading: false, title: `Invoice ${order.orderId}`, filename: `invoice-${order.id}.pdf`, error: null });
                    return;
                }
            } else if (order.type === "Purchase" && order.id) {
                const { previewPurchaseOrderPdf } = await import("../api/purchaseOrders");
                const url = await previewPurchaseOrderPdf(order.id);
                setOrderPdfPreview({ url, loading: false, title: `Purchase Order ${order.orderId}`, filename: `po-${order.id}.pdf`, error: null });
                return;
            }
        } catch {}
        try {
            const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
            const autoTable = autoTableMod.default;
            const doc = new jsPDF({ unit: "pt", format: "a4" });
            const M = 40, R = 555, W = R - M;
            const rs = (n: number) => "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-IN");
            doc.setDrawColor(0, 0, 0).setLineWidth(0.5);

            // Document Title
            doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(0, 0, 0);
            const docTitle = order.type === "Sale" ? "TAX INVOICE" : order.type === "Purchase" ? "PURCHASE ORDER" : "STOCK ORDER";
            doc.text(docTitle, M + W / 2, 45, { align: "center" });

            // Top Header Box (55 to 155)
            const topY = 55, hdrH = 100;
            doc.rect(M, topY, W, hdrH);
            const midX = M + 210;
            doc.line(midX, topY, midX, topY + hdrH);

            // Seller Block (Left)
            doc.setFont("helvetica", "bold").setFontSize(10);
            doc.text(shopName, M + 6, topY + 16);
            doc.setFont("helvetica", "normal").setFontSize(8);
            let sy = topY + 30;
            if (shopAddress) {
                const lines = doc.splitTextToSize(String(shopAddress), midX - M - 12);
                doc.text(lines, M + 6, sy); sy += lines.length * 10;
            }
            if (shopPhone) { doc.text(`Ph : ${shopPhone}`, M + 6, sy); sy += 11; }
            if (shopGstin) { doc.text(`GSTIN/UIN : ${shopGstin}`, M + 6, sy); sy += 11; }
            if (shopState) { doc.text(`State Name : ${shopState}`, M + 6, sy); }

            // Order/Invoice Fields (Right)
            const rowH = hdrH / 4;
            for (let i = 1; i < 4; i++) doc.line(midX, topY + i * rowH, R, topY + i * rowH);
            const valX = midX + 80;
            doc.line(valX, topY, valX, topY + hdrH);

            const drawField = (idx: number, label: string, val: string) => {
                const fy = topY + idx * rowH + 16;
                doc.setFont("helvetica", "bold").setFontSize(8); doc.text(label, midX + 6, fy);
                doc.setFont("helvetica", "normal"); doc.text(val || "—", valX + 6, fy);
            };
            drawField(0, order.type === "Purchase" ? "PO No." : "Invoice No.", order.orderId || "—");
            drawField(1, "Dated", new Date(order.date).toLocaleDateString("en-IN"));
            drawField(2, "Status", order.status || "Completed");
            drawField(3, "Mode of Pay", "ONLINE / CASH");

            // Buyer (Bill to) Box (155 to 215)
            const buyY = topY + hdrH, buyH = 60;
            doc.rect(M, buyY, W, buyH);
            doc.setFont("helvetica", "bold").setFontSize(8);
            doc.text(order.type === "Purchase" ? "Supplier / Vendor Details :" : "Customer (Bill to) Details :", M + 6, buyY + 14);
            doc.setFont("helvetica", "normal").setFontSize(8);
            doc.text(`Name : ${order.partyName || (order.type === "Purchase" ? "Supplier" : "Walk-in Customer")}`, M + 6, buyY + 28);
            doc.text(`Remarks / Product Summary : ${order.product || "—"}`, M + 6, buyY + 42);

            // Table matching Screenshot 1 exactly
            const qtyNum = Number(order.qty || 1) || 1;
            const amtNum = Number(order.amount || 0);
            const unitRate = qtyNum > 0 ? amtNum / qtyNum : amtNum;

            autoTable(doc, {
                startY: buyY + buyH + 10,
                head: [["Sl No.", "Description of Goods", "HSN/SAC", "Quantity", "Rate (Incl. of Tax)", "Rate", "per", "Disc. %", "Amount"]],
                body: [
                    [
                        "1",
                        order.product || "Order Item",
                        "8708",
                        `${qtyNum} NOS`,
                        unitRate.toFixed(2),
                        unitRate.toFixed(2),
                        "NOS",
                        "—",
                        amtNum.toFixed(2),
                    ],
                ],
                foot: [
                    [
                        { content: "Total", colSpan: 3, styles: { fontStyle: "bold", halign: "left" } },
                        { content: `${qtyNum} NOS`, styles: { fontStyle: "bold", halign: "center" } },
                        "", "", "", "",
                        { content: rs(amtNum), styles: { fontStyle: "bold", halign: "right" } }
                    ]
                ],
                styles: { fontSize: 8, cellPadding: 5, textColor: [0, 0, 0], lineWidth: 0.5, lineColor: [0, 0, 0] },
                headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.5, lineColor: [0, 0, 0] },
                footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.5, lineColor: [0, 0, 0] },
                margin: { left: M, right: M },
            });

            let fy = ((doc as any).lastAutoTable?.finalY || 280) + 16;
            
            // Amount in words
            doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(80, 80, 80);
            doc.text("Amount Chargeable (in words)", M, fy);
            doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(0, 0, 0);
            doc.text(`INR ${Math.round(amtNum).toLocaleString("en-IN")} Only`, M, fy + 12);
            doc.text("E. & O.E", R, fy + 12, { align: "right" });

            // Declaration & Signature Boxes
            fy += 26;
            const decH = 65, midBox = M + (W * 0.55);
            doc.rect(M, fy, W, decH);
            doc.line(midBox, fy, midBox, fy + decH);

            doc.setFont("helvetica", "bold").setFontSize(8);
            doc.text("Declaration", M + 6, fy + 14);
            doc.setFont("helvetica", "italic").setFontSize(7).setTextColor(80, 80, 80);
            doc.text("1. GOODS ONCE SOLD NOT TAKEN BACK", M + 6, fy + 26);
            doc.text("We declare that this invoice/order shows the actual value of\ngoods and that all particulars are true and correct.", M + 6, fy + 38);

            doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
            doc.text(`for ${shopName}`, R - 6, fy + 14, { align: "right" });
            doc.text("Authorised Signatory", R - 6, fy + decH - 10, { align: "right" });

            setOrderPdfPreview({ url: URL.createObjectURL(doc.output("blob")), loading: false, title: `${docTitle} ${order.orderId}`, filename: `${order.orderId}.pdf`, error: null });
        } catch (err: any) {
            setOrderPdfPreview({ url: null, loading: false, title: `Order ${order.orderId}`, error: err?.message || "Could not load PDF" });
        }
    };

    useEffect(() => {
        if (!dropdownOrder) return;
        const close = () => setDropdownOrder(null);
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, [dropdownOrder]);

    const STATUS_CYCLE = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"] as const;
    const cycleStatusFilter = () => {
        const idx = STATUS_CYCLE.indexOf(statusFilter as typeof STATUS_CYCLE[number]);
        setStatusFilter(STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]);
    };

    // Real incoming marketplace orders for this shop. Non-blocking: failure just
    // leaves the local-store derivation as-is.
    const fetchShopOrders = useCallback(async () => {
        try {
            const res = await api.get<{ success?: boolean; data?: { orders?: any[]; total?: number } }>("/api/marketplace/orders/shop");
            setShopApiOrders(res?.data?.orders || []);
        } catch (err) {
            console.error("[OrdersPage] Failed to fetch marketplace shop orders:", err);
        }
    }, []);

    useEffect(() => { fetchShopOrders(); }, [fetchShopOrders]);

    const handleAdvanceStatus = async (backendId: number, next: string) => {
        try {
            await api.put(`/api/marketplace/orders/${backendId}/status`, { status: next });
            toast?.(`Order moved to ${next}.`, "success");
            await fetchShopOrders();
            // Stock is restored on cancel / stamped on delivery server-side;
            // ERPShell's rp:data-changed listener will refresh the store.
        } catch (err) {
            console.error("[OrdersPage] Failed to update marketplace order status:", err);
            toast?.("Could not update order status. Please try again.", "error");
        }
    };

    // Status workflow for MANUAL pipeline orders (Create Order).
    //   Pending → Delivered: reduce stock by qty (shows in History as a sale).
    //   Delivered → Cancelled: restore the stock (and drops out of History).
    //   Pending → Cancelled: no stock change (nothing was taken).
    // The stock move uses a signed ADJUSTMENT tagged "[order]" so History can hide
    // it (the order entry itself is the History record — avoids a double row).
    const updateManualOrderStatus = async (row: any, next: "DELIVERED" | "CANCELLED") => {
        const local = (mktOrders || []).find((o: any) => o.id === row.localId);
        if (!local) return;
        const cur = local.status; // PENDING / DELIVERED / CANCELLED
        if (cur === next) return;
        const qty = Number(local.qty) || 0;
        const invId = local.inventoryId;
        try {
            if (next === "DELIVERED" && cur !== "DELIVERED" && invId && qty > 0) {
                await api.post("/api/shop/inventory/adjust", { inventoryId: invId, type: "ADJUSTMENT", qty: -qty, notes: `[order] ${row.orderId} delivered` });
            } else if (next === "CANCELLED" && cur === "DELIVERED" && invId && qty > 0) {
                await api.post("/api/shop/inventory/adjust", { inventoryId: invId, type: "ADJUSTMENT", qty: qty, notes: `[order] ${row.orderId} cancelled (restock)` });
            }
            saveOrders((mktOrders || []).map((o: any) => (o.id === row.localId ? { ...o, status: next } : o)));
            toast?.(`Order ${row.orderId} → ${next === "DELIVERED" ? "Delivered" : "Cancelled"}.`, "success");
        } catch (e: any) {
            console.error("[updateManualOrderStatus]", e);
            toast?.(e?.data?.error || "Could not update the order.", "error");
        }
    };

    const shopMovements = useMemo(
        () => (movements || []).filter(m => m.shopId === activeShopId),
        [movements, activeShopId],
    );

    // Convert movements → orders table data
    const allOrders = useMemo(() => {
        const fromMovements = groupMovementsToOrders(shopMovements)
            .sort((a, b) => b.date - a.date);

        // Real backend marketplace orders (GET /api/marketplace/orders/shop)
        const backendIdSet = new Set(shopApiOrders.map(o => Number(o.orderId)));
        const fromBackendMkt = shopApiOrders.map(o => ({
            id: `mkt-${o.orderId}`,
            orderId: `#MO-${String(o.orderId).padStart(5, "0")}`,
            date: o.createdAt ? new Date(o.createdAt).getTime() : Date.now(),
            partyName: o.customerName || o.customer?.name || "Customer",
            partyId: `PT-${String(o.orderId).padStart(5, "0")}`,
            type: "Sale" as const,
            status: MKT_STATUS_TO_LOCAL[o.status] || "Pending",
            amount: Number(o.total) || 0,
            product: (o.items || []).map((i: any) => `${i.partName || i.inventory?.masterPart?.partName || "Part"} × ${i.qty}`).join(", "),
            cancelled: o.status === "CANCELLED" || o.status === "RETURNED",
            mktBackendId: o.orderId as number,
            mktStatus: o.status as string,
        }));

        // Also include local marketplace orders if any (skip ones the backend
        // already returned — checkout attaches backendOrderId; backend wins)
        const fromMarket = (mktOrders || [])
            .filter((o: any) => (!activeShopId || o.shopId === activeShopId) && !(o.backendOrderId && backendIdSet.has(Number(o.backendOrderId))))
            .map((o: any) => {
                const isManual = String(o.id || "").startsWith("manual_");
                const isPurchase = !!o.supplier;
                return {
                    id: o.id,
                    orderId: `#${isPurchase ? "PO" : "SO"}-${String(o.id).slice(-5).padStart(5, "0")}`,
                    date: o.time || o.date || Date.now(),
                    partyName: o.customer || o.supplier || "Customer",
                    partyId: `PT-${String(o.id).slice(-5).padStart(5, "0")}`,
                    type: (isPurchase ? "Purchase" : "Sale") as "Sale" | "Purchase",
                    status: (o.status === "DELIVERED" ? "Delivered" : o.status === "CANCELLED" ? "Cancelled" : o.status === "DISPATCHED" ? "Shipped" : "Pending") as OrderStatus,
                    amount: o.total || 0,
                    product: o.items || "",
                    cancelled: o.status === "CANCELLED",
                    // Manual pipeline orders carry their inventory link so the status
                    // control can reduce/restore stock on deliver/cancel.
                    isManual,
                    localId: o.id,
                    inventoryId: o.inventoryId,
                    qty: o.qty,
                    rawStatus: o.status,
                };
            });

        // Merge (deduplicate by orderId)
        const seen = new Set<string>();
        return [...fromMovements, ...fromBackendMkt, ...fromMarket].filter(o => {
            if (seen.has(o.orderId)) return false;
            seen.add(o.orderId);
            return true;
        });
    }, [shopMovements, mktOrders, activeShopId, shopApiOrders]);

    // KPI stats
    const kpi = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayTs = today.getTime();
        const sales = allOrders.filter(o => o.type === "Sale" && !o.cancelled);
        const purchases = allOrders.filter(o => o.type === "Purchase" && !o.cancelled);
        const pending = allOrders.filter(o => o.status === "Pending" || o.status === "Processing");
        const completedToday = allOrders.filter(o => o.status === "Delivered" && o.date >= todayTs);
        return {
            activeSales: sales.reduce((s, o) => s + o.amount, 0),
            procurement: purchases.reduce((s, o) => s + o.amount, 0),
            pendingCount: pending.length,
            completedToday: completedToday.length,
        };
    }, [allOrders]);

    // Filtered orders
    const filtered = useMemo(() => {
        let list = allOrders;
        if (statusFilter !== "All") list = list.filter(o => o.status === statusFilter);
        if (typeFilter !== "All") list = list.filter(o => o.type === typeFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                (o.orderId || "").toLowerCase().includes(q) ||
                (o.partyName || "").toLowerCase().includes(q) ||
                (o.product || "").toLowerCase().includes(q)
            );
        }
        return list;
    }, [allOrders, statusFilter, typeFilter, search]);

    const handleExportCSV = () => {
        const headers = ["Order ID", "Date", "Party", "Type", "Status", "Amount"];
        const rows = filtered.map(o => [o.orderId, fmtDate(o.date), o.partyName, o.type, o.status, o.amount]);
        downloadCSV(`Orders_Pipeline_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
        toast?.("Orders exported as CSV!", "success");
    };

    const handleCreated = (newId: string) => {
        toast?.(`New order ${newId} has been successfully created.`, "success", "✓ Order Created");
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    // Toolbar buttons + search are shared between desktop header layout and the
    // mobile stacked layout (search → KPIs → CTA → Filter/Export → Recent Orders).
    const filterBtn = (
        <button
            onClick={cycleStatusFilter}
            style={{ height: isMobile ? 46 : 40, padding: "0 16px", background: statusFilter !== "All" ? T.amberGlow : "#FFFFFF", border: `1px solid ${statusFilter !== "All" ? T.amber : T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: statusFilter !== "All" ? T.amber : T.t2, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        >≡ {statusFilter === "All" ? "Filter" : statusFilter}</button>
    );
    const exportBtn = (
        <button
            onClick={handleExportCSV}
            style={{ height: isMobile ? 46 : 40, padding: "0 16px", background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t2, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        ><span style={{ fontSize: 14 }}>↑</span> Export CSV</button>
    );
    const createBtn = (
        <button
            onClick={() => setShowCreate(true)}
            style={{ height: isMobile ? 48 : 40, width: isMobile ? "100%" : undefined, padding: "0 18px", background: T.amber, border: "none", borderRadius: 10, fontSize: isMobile ? 14 : 13, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        ><span style={{ fontSize: 16, lineHeight: 1 }}>⊕</span> Create New Order</button>
    );
    const searchBox = (
        <div style={{ flex: 1, minWidth: isMobile ? 0 : 220, width: isMobile ? "100%" : undefined, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.t3, fontSize: 14, pointerEvents: "none" }}>🔍</span>
            <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by Order ID or Party Name..."
                style={{ width: "100%", height: isMobile ? 46 : 38, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: isMobile ? 12 : 9, padding: "0 32px 0 36px", fontSize: isMobile ? 16 : 13, color: T.t1, fontFamily: FONT.ui, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }}
            />
        </div>
    );

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 14 : 18 }}>

            {/* ── HEADER ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                    <h1 className="rp-h1" style={{ fontSize: 26, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0, letterSpacing: "-0.03em" }}>Orders Pipeline</h1>
                    <p style={{ fontSize: 13, color: T.t3, margin: "5px 0 0", fontFamily: FONT.ui }}>
                        Managing <span style={{ color: T.t1, fontWeight: 700 }}>{allOrders.length.toLocaleString()}</span> total active transactions across regions.
                    </p>
                </div>
                {!isMobile && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                        {filterBtn}
                        {exportBtn}
                        {createBtn}
                    </div>
                )}
            </div>

            {/* Mobile: search sits at the top, per design */}
            {isMobile && searchBox}

            {/* ── 4 KPI CARDS ── */}
            <div className="kpi-grid-4 orders-kpi" style={{ display: "grid", gap: 14 }}>
                {[
                    { label: "ACTIVE SALES", value: fmt(kpi.activeSales), badge: "~12%", badgeColor: T.emerald, badgeBg: T.emeraldBg },
                    { label: "PROCUREMENT", value: fmt(kpi.procurement), badge: "~4.2%", badgeColor: T.emerald, badgeBg: T.emeraldBg },
                    { label: "PENDING SHIPMENT", value: `${kpi.pendingCount} Units`, badge: kpi.pendingCount > 0 ? "Urgent" : "Clear", badgeColor: kpi.pendingCount > 0 ? "#D97706" : T.emerald, badgeBg: kpi.pendingCount > 0 ? "rgba(245,158,11,0.1)" : T.emeraldBg },
                    { label: "COMPLETED TODAY", value: String(kpi.completedToday), sub: `Target ${Math.max(kpi.completedToday + 7, 25)}` },
                ].map((c, i) => (
                    <div key={i} className="card-hover" style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 20px 18px", boxShadow: SHADOWS.xs }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui, marginBottom: 10 }}>{c.label}</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontSize: "clamp(18px,2vw,26px)", fontWeight: 800, color: T.t1, fontFamily: FONT.mono, letterSpacing: "-0.03em" }}>{c.value}</span>
                            {c.badge && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: c.badgeColor, background: c.badgeBg, padding: "2px 8px", borderRadius: 20, fontFamily: FONT.mono }}>{c.badge}</span>
                            )}
                            {c.sub && (
                                <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>Target {Math.max(kpi.completedToday + 7, 25)}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Mobile: full-width CTA + 2-up Filter/Export, per design */}
            {isMobile && (
                <>
                    {createBtn}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {filterBtn}
                        {exportBtn}
                    </div>
                </>
            )}

            {/* ── SEARCH + TYPE FILTER ROW ── */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {!isMobile && searchBox}
                {/* Type filter pills */}
                {(["All", "Sale", "Purchase"] as const).map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)} style={{
                        height: 38, padding: "0 16px", borderRadius: 9, border: `1px solid ${typeFilter === t ? T.amber : T.border}`,
                        background: typeFilter === t ? T.amberGlow : "#FFFFFF", color: typeFilter === t ? T.amber : T.t2,
                        fontSize: 12, fontWeight: typeFilter === t ? 700 : 500, cursor: "pointer", fontFamily: FONT.ui,
                    }}>{t}</button>
                ))}
                {/* Status filter pills */}
                {(["All", "Pending", "Shipped", "Delivered", "Cancelled"] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} style={{
                        height: 38, padding: "0 14px", borderRadius: 9, border: `1px solid ${statusFilter === s ? T.border : T.border}`,
                        background: statusFilter === s ? T.surfaceContainerHigh : "transparent", color: statusFilter === s ? T.t1 : T.t3,
                        fontSize: 12, fontWeight: statusFilter === s ? 700 : 400, cursor: "pointer", fontFamily: FONT.ui,
                    }}>{s}</button>
                ))}
                <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui, marginLeft: 4 }}>{filtered.length} orders</span>
            </div>

            {/* Mobile: section heading, per design */}
            {isMobile && (
                <h2 style={{ fontSize: 17, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: "2px 0 -8px", letterSpacing: "-0.02em" }}>Recent Orders</h2>
            )}

            {/* ── TABLE ── */}
            <div style={isMobile && filtered.length > 0
                ? undefined
                : { background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOWS.xs }}>
                {filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 24px", color: T.t3 }}>
                        <div style={{ fontSize: 48, opacity: 0.25, marginBottom: 16 }}>🛒</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.t2, marginBottom: 6 }}>No orders found</div>
                        <div style={{ fontSize: 13 }}>
                            {search || statusFilter !== "All" || typeFilter !== "All"
                                ? "Try clearing filters"
                                : "Create your first order using the button above"}
                        </div>
                        {(search || statusFilter !== "All" || typeFilter !== "All") && (
                            <button onClick={() => { setSearch(""); setStatusFilter("All"); setTypeFilter("All"); }} style={{ marginTop: 14, background: T.amber, border: "none", borderRadius: 9, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>Clear Filters</button>
                        )}
                    </div>
                ) : isMobile ? (
                    <MobileCardList>
                        {filtered.slice(0, visibleCount).map((order) => {
                            const isSale = order.type === "Sale";
                            const isCancelled = order.status === "Cancelled";
                            const adv = (order as any).mktBackendId ? MKT_NEXT_STATUS[(order as any).mktStatus] : undefined;
                            const iconBtnStyle = { width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: T.t2 } as const;
                            return (
                                <MobileCard key={order.orderId} accent={isSale ? T.amber : T.sky}>
                                    {/* Top: id / party / date on the left, amount + status on the right */}
                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 12 }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 13, color: T.amber }}>{order.orderId}</div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, fontFamily: FONT.ui, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.partyName}</div>
                                            <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui, marginTop: 3 }}>
                                                {new Date(order.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </div>
                                        </div>
                                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                                            <div style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 15, color: isCancelled ? T.t3 : T.t1, textDecoration: isCancelled ? "line-through" : "none" }}>{fmt(order.amount)}</div>
                                            <div style={{ marginTop: 6 }}><StatusBadge status={order.status as OrderStatus} /></div>
                                        </div>
                                    </div>
                                    {order.product && (
                                        <div style={{ width: "100%", fontSize: 11, color: T.t3, fontFamily: FONT.ui, marginTop: -6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.product}</div>
                                    )}
                                    {/* Bottom: type chip + icon actions */}
                                    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                                        <TypeBadge type={order.type} />
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                            {adv && (
                                                <button
                                                    title={`Mark as ${adv.next}`}
                                                    onClick={() => handleAdvanceStatus((order as any).mktBackendId, adv.next)}
                                                    style={{ height: 30, padding: "0 12px", borderRadius: 20, border: `1px solid rgba(139,30,30,0.25)`, background: T.amberGlow, color: T.amber, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}
                                                >{adv.label} →</button>
                                            )}
                                            {(order as any).isManual && (order as any).rawStatus !== "CANCELLED" && (
                                                <>
                                                    {(order as any).rawStatus !== "DELIVERED" && (
                                                        <button title="Mark Delivered (reduces stock)" onClick={() => updateManualOrderStatus(order, "DELIVERED")}
                                                            style={{ height: 30, padding: "0 11px", borderRadius: 20, border: `1px solid rgba(16,185,129,0.3)`, background: T.emeraldBg, color: T.emerald, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>Deliver →</button>
                                                    )}
                                                    <button title={(order as any).rawStatus === "DELIVERED" ? "Cancel (restock)" : "Cancel order"} onClick={() => updateManualOrderStatus(order, "CANCELLED")}
                                                        style={{ height: 30, padding: "0 11px", borderRadius: 20, border: `1px solid ${T.border}`, background: "#FFFFFF", color: T.crimson, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>Cancel</button>
                                                </>
                                            )}
                                            <button title="View Invoice" onClick={() => { if (!isCancelled) printOrder(order); }} style={iconBtnStyle}>👁</button>
                                            <button title={isCancelled ? "Restore" : "Print"} onClick={() => { if (!isCancelled) printOrder(order); }} style={iconBtnStyle}>{isCancelled ? "↺" : "🖨"}</button>
                                            <div style={{ position: "relative" }}>
                                                <button title="More options" style={iconBtnStyle} onClick={e => { e.stopPropagation(); setDropdownOrder(dropdownOrder === (order as any).id ? null : (order as any).id); }}>⋯</button>
                                            </div>
                                        </div>
                                    </div>
                                </MobileCard>
                            );
                        })}
                    </MobileCardList>
                ) : (
                    <div className="table-scroll">
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                                    {[
                                        ["ORDER ID", "left", 120],
                                        ["DATE", "left", 110],
                                        ["CUSTOMER / SUPPLIER", "left", 220],
                                        ["TYPE", "left", 100],
                                        ["STATUS", "left", 130],
                                        ["AMOUNT", "right", 110],
                                        ["ACTIONS", "center", 100],
                                    ].map(([h, align, w]) => (
                                        <th key={h as string} className="th-cell" style={{ textAlign: align as "left" | "right" | "center", width: w as number }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.slice(0, visibleCount).map((order, i) => {
                                    const isSale = order.type === "Sale";
                                    const isCancelled = order.status === "Cancelled";
                                    const adv = (order as any).mktBackendId ? MKT_NEXT_STATUS[(order as any).mktStatus] : undefined;
                                    return (
                                        <tr key={order.orderId} className="trow" style={{
                                            borderBottom: i < Math.min(visibleCount, filtered.length) - 1 ? `1px solid ${T.border}` : "none",
                                            borderLeft: `3px solid ${isSale ? T.amber : T.sky}`,
                                        }}>
                                            {/* ORDER ID */}
                                            <td style={{ padding: "14px 16px" }}>
                                                <span style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 13, color: T.amber }}>{order.orderId}</span>
                                            </td>
                                            {/* DATE */}
                                            <td style={{ padding: "14px 16px", fontFamily: FONT.ui, fontSize: 12, color: T.t2, whiteSpace: "nowrap" }}>
                                                {new Date(order.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </td>
                                            {/* CUSTOMER / SUPPLIER */}
                                            <td style={{ padding: "14px 16px" }}>
                                                <div style={{ fontWeight: 700, color: T.t1, fontSize: 13 }}>{order.partyName}</div>
                                                <div style={{ fontSize: 11, color: T.t3, marginTop: 2, fontFamily: FONT.mono }}>ID: {order.partyId}</div>
                                                {order.product && <div style={{ fontSize: 11, color: T.t3, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{order.product}</div>}
                                            </td>
                                            {/* TYPE */}
                                            <td style={{ padding: "14px 16px" }}>
                                                <TypeBadge type={order.type} />
                                            </td>
                                            {/* STATUS */}
                                            <td style={{ padding: "14px 16px" }}>
                                                <StatusBadge status={order.status} />
                                            </td>
                                            {/* AMOUNT */}
                                            <td style={{ padding: "14px 16px", textAlign: "right" }}>
                                                <span style={{
                                                    fontFamily: FONT.mono, fontWeight: 700, fontSize: 14,
                                                    color: isCancelled ? T.t3 : T.t1,
                                                    textDecoration: isCancelled ? "line-through" : "none",
                                                }}>{fmt(order.amount)}</span>
                                            </td>
                                            {/* ACTIONS */}
                                            <td style={{ padding: "14px 16px", textAlign: "center" }}>
                                                <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                                                    {adv && (
                                                        <button
                                                            title={`Mark as ${adv.next}`}
                                                            onClick={() => handleAdvanceStatus((order as any).mktBackendId, adv.next)}
                                                            style={{ height: 26, padding: "0 12px", borderRadius: 20, border: `1px solid rgba(139,30,30,0.25)`, background: T.amberGlow, color: T.amber, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap", transition: "all 0.12s" }}
                                                        >{adv.label} →</button>
                                                    )}
                                                    {(order as any).isManual && (order as any).rawStatus !== "CANCELLED" && (
                                                        <>
                                                            {(order as any).rawStatus !== "DELIVERED" && (
                                                                <button title="Mark Delivered (reduces stock)" onClick={() => updateManualOrderStatus(order, "DELIVERED")}
                                                                    style={{ height: 26, padding: "0 11px", borderRadius: 20, border: `1px solid rgba(16,185,129,0.3)`, background: T.emeraldBg, color: T.emerald, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>Deliver →</button>
                                                            )}
                                                            <button title={(order as any).rawStatus === "DELIVERED" ? "Cancel (restock)" : "Cancel order"} onClick={() => updateManualOrderStatus(order, "CANCELLED")}
                                                                style={{ height: 26, padding: "0 11px", borderRadius: 20, border: `1px solid ${T.border}`, background: "#FFFFFF", color: T.crimson, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>Cancel</button>
                                                        </>
                                                    )}
                                                    <button title="View Invoice" onClick={() => { if (!isCancelled) printOrder(order); }} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.t2, transition: "all 0.12s" }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t2; }}>
                                                        👁
                                                    </button>
                                                    <button title={isCancelled ? "Restore" : "Print"} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.t2, transition: "all 0.12s" }}
                                                        onClick={() => { if (!isCancelled) printOrder(order); }}
                                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t2; }}>
                                                        {isCancelled ? "↺" : "🖨"}
                                                    </button>
                                                    <div style={{ position: "relative" }}>
                                                        <button title="More options" style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: T.t2, letterSpacing: "0.05em" }}
                                                            onClick={e => { e.stopPropagation(); setDropdownOrder(dropdownOrder === (order as any).id ? null : (order as any).id); }}
                                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t2; }}>
                                                            ⋯
                                                        </button>
                                                        {dropdownOrder === (order as any).id && (
                                                            <div style={{ position: "absolute", right: 0, top: 34, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, minWidth: 140, overflow: "hidden" }}>
                                                                {[
                                                                    { label: "👁 View Details", action: () => { setViewOrder(order); setDropdownOrder(null); } },
                                                                    { label: "🖨 Print", action: () => { printOrder(order); setDropdownOrder(null); }, disabled: isCancelled },
                                                                ].map(item => (
                                                                    <button key={item.label} disabled={item.disabled} onClick={item.action}
                                                                        style={{ display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: "transparent", border: "none", fontSize: 13, fontFamily: FONT.ui, color: item.disabled ? T.t4 : T.t1, cursor: item.disabled ? "default" : "pointer" }}
                                                                        onMouseEnter={e => { if (!item.disabled) (e.currentTarget as HTMLButtonElement).style.background = T.bg; }}
                                                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                                                                        {item.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Load more */}
            {visibleCount < filtered.length && (
                <div style={{ textAlign: "center" }}>
                    <button onClick={() => setVisibleCount(v => v + 25)} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 24px", color: T.t3, fontSize: 13, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t3; }}>
                        Load more ({filtered.length - visibleCount} remaining)
                    </button>
                </div>
            )}

            {/* Order Detail Modal */}
            {viewOrder && createPortal(
                <div style={{ position: "fixed", inset: 0, zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div onClick={() => setViewOrder(null)} style={{ position: "absolute", inset: 0, background: "rgba(28,27,27,0.55)", backdropFilter: "blur(4px)" }} />
                    <div style={{ position: "relative", background: "#FFFFFF", borderRadius: 18, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", overflow: "hidden" }}>
                        <div style={{ background: `linear-gradient(135deg, ${T.amber}, #6A020A)`, padding: "20px 24px 16px" }}>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui }}>Order Details</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#FFFFFF", fontFamily: FONT.display, marginTop: 4 }}>{viewOrder.orderId}</div>
                        </div>
                        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                            {[
                                { label: "Type",    value: viewOrder.type },
                                { label: "Party",   value: viewOrder.partyName || "—" },
                                { label: "Amount",  value: fmt(viewOrder.amount) },
                                { label: "Status",  value: viewOrder.status },
                                { label: "Date",    value: fmtDate(viewOrder.date) },
                                ...(viewOrder.product ? [{ label: "Product", value: viewOrder.product }] : []),
                                ...(viewOrder.qty !== undefined ? [{ label: "Qty", value: String(viewOrder.qty) }] : []),
                                ...(viewOrder.notes ? [{ label: "Notes", value: viewOrder.notes }] : []),
                            ].map(row => (
                                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                                    <span style={{ color: T.t3, fontFamily: FONT.ui, fontWeight: 600 }}>{row.label}</span>
                                    <span style={{ color: T.t1, fontFamily: FONT.ui, fontWeight: 700, textAlign: "right", maxWidth: 280, wordBreak: "break-word" }}>{row.value}</span>
                                </div>
                            ))}
                            <button onClick={() => setViewOrder(null)} style={{ marginTop: 8, height: 44, background: T.amber, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", fontFamily: FONT.ui }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Create Order Modal */}
            {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} onCreated={handleCreated} activeShopId={activeShopId} />}

            {orderPdfPreview && (
                <PdfPreviewModal
                    url={orderPdfPreview.url}
                    loading={orderPdfPreview.loading}
                    error={orderPdfPreview.error}
                    title={orderPdfPreview.title}
                    filename={orderPdfPreview.filename}
                    onClose={() => {
                        if (orderPdfPreview.url) URL.revokeObjectURL(orderPdfPreview.url);
                        setOrderPdfPreview(null);
                    }}
                />
            )}
        </div>
    );
}
