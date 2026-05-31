import { useState, useEffect, useRef } from "react";
import { T, FONT } from "../theme";
import { fmt, fmtDate } from "../utils";
import { Modal, Field, Input, Select, Divider, Btn } from "./ui";

export function PurchaseModal({ open, onClose, product, products, onSave, toast }) {
    const blank = { productId: product?.id || "", qty: "", buyPrice: "", newSellPrice: "", supplier: product?.supplier || "", invoiceNo: "", payment: "Cash", creditDays: "30", notes: "", gst: product?.gst || 18 };
    const [f, setF] = useState(blank);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const now = useRef(Date.now());
    useEffect(() => { now.current = Date.now(); }, [open]);
    useEffect(() => {
        if (open) setF({ ...blank, productId: product?.id || "", supplier: product?.supplier || "", newSellPrice: String(product?.sellPrice || ""), gst: product?.gst || 18 });
        setErrors({});
    }, [open, product]);

    const set = k => v => setF(p => ({ ...p, [k]: v }));
    const sel = products?.find(p => p.id === f.productId) || product;

    const qty = +f.qty || 0;
    const buyPrice = +f.buyPrice || (sel?.buyPrice || 0);
    const subtotal = qty * buyPrice;
    const gstAmt_ = (subtotal * (+f.gst || 18)) / 100;
    const grandTotal = subtotal + gstAmt_;

    const validate = () => {
        const e = {};
        if (!f.productId) e.productId = "Select a product";
        if (!f.qty || +f.qty <= 0) e.qty = "Enter quantity";
        if (!f.buyPrice || +f.buyPrice <= 0) e.buyPrice = "Enter buying price";
        if (f.payment === "Credit" && (!f.creditDays || +f.creditDays < 1)) e.creditDays = "Enter credit days";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        await new Promise((r) => setTimeout(r, 50));
        onSave({
            productId: f.productId,
            qty: +f.qty,
            buyPrice: +f.buyPrice,
            newSellPrice: f.newSellPrice ? +f.newSellPrice : sel?.sellPrice,
            supplier: f.supplier,
            invoiceNo: f.invoiceNo || "PINV-" + Math.floor(Math.random() * 99000 + 10000),
            payment: f.payment,
            creditDays: f.payment === "Credit" ? +f.creditDays : 0,
            notes: f.notes,
            gst: +f.gst || 18,
            subtotal,
            gstAmount: gstAmt_,
            total: grandTotal,
            date: now.current,
        });
        setSaving(false);
        onClose();
    };

    const paymentModes = ["Cash", "UPI", "Bank Transfer", "Cheque", "Credit"];

    return (
        <Modal open={open} onClose={onClose} title="📥 Purchase Entry" subtitle="Record goods received into inventory" width={620}>
            {/* Product selector (only if no product pre-selected) */}
            {!product && (
                <div style={{ marginBottom: 18 }}>
                    <Field label="Product" required error={errors.productId}>
                        <Select value={f.productId} onChange={v => {
                            const p = products?.find(x => x.id === v);
                            setF(prev => ({ ...prev, productId: v, supplier: p?.supplier || "", buyPrice: String(p?.buyPrice || ""), newSellPrice: String(p?.sellPrice || ""), gst: p?.gst || 18 }));
                        }} options={[{ value: "", label: "— Select product —" }, ...(products || []).map(p => ({ value: p.id, label: `${p.image?.startsWith("http") ? "📦" : (p.image || "📦")} ${p.name} (Stock: ${p.stock})` }))]} />
                    </Field>
                </div>
            )}

            {/* Product Info bar */}
            {sel && (
                <div style={{ background: T.skyBg, border: `1px solid rgba(56,189,248,0.2)`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 14, alignItems: "center" }}>
                    {sel.image?.startsWith("http") ? <img src={sel.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} /> : <span style={{ fontSize: 32 }}>{sel.image || "📦"}</span>}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: T.t1, fontSize: 14 }}>{sel.name}</div>
                        <div style={{ fontSize: 12, color: T.t3, marginTop: 2, fontFamily: FONT.mono }}>{sel.sku} · {sel.category} · {sel.brand}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: T.t3 }}>Current Stock</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: sel.stock < sel.minStock ? T.crimson : T.t1, fontFamily: FONT.mono }}>{sel.stock}</div>
                    </div>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Row 1 */}
                <Field label="Quantity Received" required error={errors.qty}>
                    <Input type="number" value={f.qty} onChange={set("qty")} placeholder="0" suffix="units" autoFocus={!!product} />
                </Field>
                <Field label="Buying Price / Unit" required error={errors.buyPrice} hint={sel ? `Last: ${fmt(sel.buyPrice)}` : ""}>
                    <Input type="number" value={f.buyPrice} onChange={set("buyPrice")} placeholder={String(sel?.buyPrice || "")} prefix="₹" />
                </Field>

                {/* Row 2 */}
                <Field label="New Selling Price / Unit" hint={sel ? `Current: ${fmt(sel.sellPrice)}` : ""}>
                    <Input type="number" value={f.newSellPrice} onChange={set("newSellPrice")} placeholder={String(sel?.sellPrice || "")} prefix="₹" />
                </Field>
                <Field label="GST Rate">
                    <Select value={String(f.gst)} onChange={set("gst")} options={["0", "5", "12", "18", "28"].map(v => ({ value: v, label: v + "% GST" }))} />
                </Field>

                <Divider label="Supplier Details" />
                <div style={{ gridColumn: "span 2" }} />

                <div style={{ gridColumn: "span 2" }}>
                    <Field label="Supplier Name" required>
                        <Input value={f.supplier} onChange={set("supplier")} placeholder="Bosch India Pvt Ltd" icon="🏭" />
                    </Field>
                </div>
                <Field label="Supplier Invoice No." hint="Bill/challan number">
                    <Input value={f.invoiceNo} onChange={set("invoiceNo")} placeholder="INV-2024-00142" icon="🧾" />
                </Field>
                <Field label="Notes / Remarks">
                    <Input value={f.notes} onChange={set("notes")} placeholder="e.g. Monthly restock" />
                </Field>

                <Divider label="Payment" />
                <div style={{ gridColumn: "span 2" }} />

                <div style={{ gridColumn: "span 2" }}>
                    <Field label="Payment Mode">
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {paymentModes.map(pm => (
                                <button key={pm} onClick={() => set("payment")(pm)} style={{ flex: 1, minWidth: 80, background: f.payment === pm ? (pm === "Credit" ? T.crimson : T.amber) : "transparent", color: f.payment === pm ? "#fff" : T.t2, border: `1px solid ${f.payment === pm ? (pm === "Credit" ? T.crimson : T.amber) : T.border}`, borderRadius: 7, padding: "8px 6px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.12s", textAlign: "center" }}>
                                    {pm === "Cash" ? "💵" : pm === "UPI" ? "📱" : pm === "Bank Transfer" ? "🏦" : pm === "Cheque" ? "📝" : "💳"} {pm}
                                </button>
                            ))}
                        </div>
                    </Field>
                </div>
                {f.payment === "Credit" && (
                    <Field label="Credit Period (days)" error={errors.creditDays} hint="Payment due after X days">
                        <Input type="number" value={f.creditDays} onChange={set("creditDays")} placeholder="30" suffix="days" />
                    </Field>
                )}

                {/* LIVE CALCULATION PANEL */}
                {qty > 0 && buyPrice > 0 && (
                    <>
                        <Divider label="Order Summary" />
                        <div style={{ gridColumn: "span 2" }}>
                            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Subtotal</div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, fontFamily: FONT.mono }}>{fmt(subtotal)}</div>
                                    </div>
                                    <div style={{ textAlign: "center", borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }}>
                                        <div style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>GST ({f.gst}%)</div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: T.amber, fontFamily: FONT.mono }}>{fmt(gstAmt_)}</div>
                                    </div>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Grand Total</div>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: T.sky, fontFamily: FONT.mono }}>{fmt(grandTotal)}</div>
                                    </div>
                                </div>
                                {f.newSellPrice && +f.newSellPrice > buyPrice && (
                                    <div style={{ background: T.emeraldBg, borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 12, color: T.t2 }}>Expected profit when all {qty} units sold</span>
                                        <span style={{ fontSize: 15, fontWeight: 800, color: T.emerald, fontFamily: FONT.mono }}>+{fmt(qty * (+f.newSellPrice - buyPrice))}</span>
                                    </div>
                                )}
                                {f.payment === "Credit" && (
                                    <div style={{ background: T.crimsonBg, borderRadius: 8, padding: "8px 12px", marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 12, color: T.t2 }}>Payment due on</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: T.crimson, fontFamily: FONT.mono }}>{fmtDate(Date.now() + +f.creditDays * 86400000)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn variant="sky" loading={saving} onClick={handleSave}>📥 Add to Inventory</Btn>
            </div>
        </Modal>
    );
}
