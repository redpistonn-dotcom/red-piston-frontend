import { useState, useEffect, useRef } from "react";
import { T, FONT } from "../theme";
import { fmt, fmtDate } from "../utils";
import { Modal, Field, Input, Select, Divider, Btn } from "./ui";

const ADJUSTMENT_TYPES = [
    { value: "RETURN_IN", label: "↩️ Customer Return", desc: "Customer returns product — stock increases, refund/credit issued", stockDir: 1, icon: "↩️" },
    { value: "RETURN_OUT", label: "📤 Return to Vendor", desc: "Return product to supplier — stock decreases, credit expected", stockDir: -1, icon: "📤" },
    { value: "CREDIT_NOTE", label: "📝 Credit Note", desc: "Issue credit note to customer — price adjustment without stock change", stockDir: 0, icon: "📝" },
    { value: "DEBIT_NOTE", label: "📋 Debit Note", desc: "Issue debit note to supplier — claim for damaged/short goods", stockDir: 0, icon: "📋" },
    { value: "DAMAGE", label: "💥 Damaged Goods", desc: "Products damaged in storage/transit — write off as loss", stockDir: -1, icon: "💥" },
    { value: "THEFT", label: "🚨 Theft / Shrinkage", desc: "Unaccounted loss — reported for audit", stockDir: -1, icon: "🚨" },
    { value: "AUDIT", label: "📊 Audit Correction", desc: "Physical count mismatch — adjust to match real count", stockDir: 0, icon: "📊" },
    { value: "OPENING", label: "📦 Opening Stock", desc: "Set initial stock for new inventory period", stockDir: 1, icon: "📦" },
];

const REFUND_METHODS = [
    { value: "cash", label: "💵 Cash Refund" },
    { value: "credit_note", label: "📝 Credit Note (Store Credit)" },
    { value: "replacement", label: "🔄 Replacement Part" },
    { value: "upi", label: "📱 UPI Refund" },
];

const RETURN_REASONS = [
    { value: "wrong_part", label: "Wrong part ordered" },
    { value: "defective", label: "Defective / Not working" },
    { value: "not_needed", label: "Customer no longer needs it" },
    { value: "wrong_fitment", label: "Doesn't fit vehicle" },
    { value: "better_price", label: "Found better price elsewhere" },
    { value: "other", label: "Other" },
];

export function StockAdjustmentModal({ open, onClose, product, products, onSave, toast }) {
    const blank = {
        adjustType: "RETURN_IN",
        productId: product?.id || "",
        qty: "1",
        reason: "",
        reasonDetail: "",
        refundMethod: "credit_note",
        refundAmount: "",
        supplierName: "",
        originalInvoice: "",
        actualCount: "",
        notes: "",
    };
    const [f, setF] = useState(blank);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const now = useRef(Date.now());

    useEffect(() => { now.current = Date.now(); }, [open]);
    useEffect(() => {
        if (open) {
            setF({
                ...blank,
                productId: product?.id || "",
                supplierName: product?.supplier || "",
                refundAmount: String(product?.sellPrice || ""),
            });
        }
        setErrors({});
    }, [open, product]);

    const set = k => v => setF(p => ({ ...p, [k]: v }));
    const sel = products?.find(p => p.id === f.productId) || product;
    const adjType = ADJUSTMENT_TYPES.find(t => t.value === f.adjustType);

    const qty = +f.qty || 0;
    const refundAmt = +f.refundAmount || 0;
    const totalRefund = refundAmt * qty;

    // For audit: calculate the difference
    const actualCount = +f.actualCount || 0;
    const auditDiff = f.adjustType === "AUDIT" ? actualCount - (sel?.stock || 0) : 0;

    const validate = () => {
        const e = {};
        if (!f.productId) e.productId = "Select a product";
        if (f.adjustType === "AUDIT") {
            if (f.actualCount === "" || actualCount < 0) e.actualCount = "Enter actual physical count";
        } else {
            if (!f.qty || qty <= 0) e.qty = "Enter quantity";
            if (f.adjustType !== "OPENING" && adjType?.stockDir === -1 && sel && qty > sel.stock) {
                e.qty = `Only ${sel.stock} in stock`;
            }
        }
        if (f.adjustType === "RETURN_IN" && !f.reason) e.reason = "Select return reason";
        if (f.adjustType === "RETURN_OUT" && !f.supplierName) e.supplierName = "Enter supplier name";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        await new Promise(r => setTimeout(r, 300));

        const finalQty = f.adjustType === "AUDIT" ? Math.abs(auditDiff) : qty;
        const finalDir = f.adjustType === "AUDIT" ? (auditDiff >= 0 ? 1 : -1) : adjType.stockDir;

        onSave({
            adjustType: f.adjustType,
            productId: f.productId,
            qty: finalQty,
            stockDirection: finalDir, // +1 = add, -1 = deduct
            reason: f.reason || f.adjustType,
            reasonDetail: f.reasonDetail,
            refundMethod: f.adjustType === "RETURN_IN" ? f.refundMethod : null,
            refundAmount: f.adjustType === "RETURN_IN" ? totalRefund : 0,
            supplierName: f.supplierName,
            originalInvoice: f.originalInvoice,
            auditDiff: f.adjustType === "AUDIT" ? auditDiff : null,
            actualCount: f.adjustType === "AUDIT" ? actualCount : null,
            previousStock: sel?.stock || 0,
            notes: f.notes,
            date: now.current,
        });
        setSaving(false);
        onClose();
    };

    if (!open) return null;

    return (
        <Modal open={open} onClose={onClose} title="⚖️ Stock Adjustment" subtitle="Record returns, damages, theft, or audit corrections" width={600}>
            {/* Adjustment Type Selector */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
                {ADJUSTMENT_TYPES.map(t => (
                    <button key={t.value} onClick={() => set("adjustType")(t.value)}
                        style={{
                            background: f.adjustType === t.value ? `${t.value === "RETURN_IN" ? T.emerald : t.value === "DAMAGE" || t.value === "THEFT" ? T.crimson : T.sky}22` : T.surface,
                            border: `1px solid ${f.adjustType === t.value ? (t.value === "RETURN_IN" ? T.emerald : t.value === "DAMAGE" || t.value === "THEFT" ? T.crimson : T.sky) : T.border}`,
                            color: f.adjustType === t.value ? T.t1 : T.t3,
                            borderRadius: 10, padding: "12px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center",
                            transition: "all 0.15s", fontFamily: FONT.ui
                        }}>
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{t.icon}</div>
                        {t.label.replace(/^.*?\s/, "")}
                    </button>
                ))}
            </div>

            {/* Type Description Banner */}
            <div style={{
                background: `${T.amber}11`, border: `1px solid ${T.amber}33`, borderRadius: 10,
                padding: "10px 16px", marginBottom: 20, fontSize: 13, color: T.t2, display: "flex", gap: 10, alignItems: "center"
            }}>
                <span style={{ fontSize: 20 }}>{adjType?.icon}</span>
                <div>
                    <div style={{ fontWeight: 800, color: T.t1 }}>{adjType?.label}</div>
                    <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{adjType?.desc}</div>
                </div>
            </div>

            {/* Product Selector */}
            {!product && (
                <div style={{ marginBottom: 18 }}>
                    <Field label="Product" required error={errors.productId}>
                        <Select value={f.productId} onChange={v => {
                            const p = products?.find(x => x.id === v);
                            setF(prev => ({ ...prev, productId: v, supplierName: p?.supplier || "", refundAmount: String(p?.sellPrice || "") }));
                        }} options={[{ value: "", label: "— Select product —" }, ...(products || []).map(p => ({ value: p.id, label: `${p.image?.startsWith("http") ? "📦" : (p.image || "📦")} ${p.name} (Stock: ${p.stock})` }))]} />
                    </Field>
                </div>
            )}

            {/* Product Info Bar */}
            {sel && (
                <div style={{
                    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
                    padding: "12px 16px", marginBottom: 20, display: "flex", gap: 14, alignItems: "center"
                }}>
                    {sel.image?.startsWith("http") ? <img src={sel.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} /> : <span style={{ fontSize: 32 }}>{sel.image || "📦"}</span>}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: T.t1, fontSize: 14 }}>{sel.name}</div>
                        <div style={{ fontSize: 12, color: T.t3, marginTop: 2, fontFamily: FONT.mono }}>{sel.sku} · {sel.brand}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: T.t3 }}>Current Stock</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: sel.stock < sel.minStock ? T.crimson : T.t1, fontFamily: FONT.mono }}>{sel.stock}</div>
                    </div>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* AUDIT MODE: Enter actual count */}
                {f.adjustType === "AUDIT" ? (
                    <>
                        <Field label="Actual Physical Count" required error={errors.actualCount} hint={sel ? `System says: ${sel.stock}` : ""}>
                            <Input type="number" value={f.actualCount} onChange={set("actualCount")} placeholder="0" suffix="units" autoFocus />
                        </Field>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {f.actualCount !== "" && (
                                <div style={{
                                    background: auditDiff === 0 ? `${T.emerald}22` : `${auditDiff > 0 ? T.sky : T.crimson}22`,
                                    border: `1px solid ${auditDiff === 0 ? T.emerald : auditDiff > 0 ? T.sky : T.crimson}44`,
                                    borderRadius: 10, padding: "12px 18px", textAlign: "center", width: "100%"
                                }}>
                                    <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase" }}>
                                        {auditDiff === 0 ? "No Difference" : auditDiff > 0 ? "Stock Gain" : "Stock Loss"}
                                    </div>
                                    <div style={{
                                        fontSize: 24, fontWeight: 900, fontFamily: FONT.mono,
                                        color: auditDiff === 0 ? T.emerald : auditDiff > 0 ? T.sky : T.crimson
                                    }}>
                                        {auditDiff > 0 ? "+" : ""}{auditDiff}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* NORMAL MODE: Enter qty */
                    <Field label="Quantity" required error={errors.qty}>
                        <Input type="number" value={f.qty} onChange={set("qty")} placeholder="1" suffix="units" autoFocus />
                    </Field>
                )}

                {/* RETURN_IN: Reason + Refund */}
                {f.adjustType === "RETURN_IN" && (
                    <>
                        <Field label="Return Reason" required error={errors.reason}>
                            <Select value={f.reason} onChange={set("reason")} options={[{ value: "", label: "— Select reason —" }, ...RETURN_REASONS]} />
                        </Field>
                        <Field label="Refund Method">
                            <Select value={f.refundMethod} onChange={set("refundMethod")} options={REFUND_METHODS} />
                        </Field>
                        <Field label="Refund Amount / Unit" hint={sel ? `Sell price: ${fmt(sel.sellPrice)}` : ""}>
                            <Input type="number" value={f.refundAmount} onChange={set("refundAmount")} prefix="₹" />
                        </Field>
                    </>
                )}

                {/* RETURN_OUT: Supplier */}
                {f.adjustType === "RETURN_OUT" && (
                    <>
                        <Field label="Supplier Name" required error={errors.supplierName}>
                            <Input value={f.supplierName} onChange={set("supplierName")} placeholder="Bosch India Pvt Ltd" icon="🏭" />
                        </Field>
                        <Field label="Original Invoice No.">
                            <Input value={f.originalInvoice} onChange={set("originalInvoice")} placeholder="PINV-12345" icon="🧾" />
                        </Field>
                    </>
                )}

                {/* CREDIT_NOTE / DEBIT_NOTE */}
                {(f.adjustType === "CREDIT_NOTE" || f.adjustType === "DEBIT_NOTE") && (
                    <>
                        <Field label={f.adjustType === "CREDIT_NOTE" ? "Customer Name" : "Supplier Name"} required error={errors.supplierName}>
                            <Input value={f.supplierName} onChange={set("supplierName")} placeholder={f.adjustType === "CREDIT_NOTE" ? "Customer name" : "Supplier name"} icon={f.adjustType === "CREDIT_NOTE" ? "👤" : "🏭"} />
                        </Field>
                        <Field label="Original Invoice / Bill No.">
                            <Input value={f.originalInvoice} onChange={set("originalInvoice")} placeholder="INV-12345 or PINV-12345" icon="🧾" />
                        </Field>
                        <Field label="Note Amount (₹)" required error={errors.refundAmount}>
                            <Input type="number" value={f.refundAmount} onChange={set("refundAmount")} prefix="₹" placeholder="0" />
                        </Field>
                        <Field label="Reason">
                            <Input value={f.reasonDetail} onChange={set("reasonDetail")} placeholder={f.adjustType === "CREDIT_NOTE" ? "Price difference, return credit" : "Short shipment, quality issue"} />
                        </Field>
                    </>
                )}

                {/* Damage/Theft: Reason detail */}
                {(f.adjustType === "DAMAGE" || f.adjustType === "THEFT") && (
                    <Field label="Description" hint="What happened?">
                        <Input value={f.reasonDetail} onChange={set("reasonDetail")} placeholder={f.adjustType === "DAMAGE" ? "Fell off shelf, packaging torn" : "Missing from shelf during audit"} />
                    </Field>
                )}

                {/* Notes (always) */}
                <div style={{ gridColumn: "span 2" }}>
                    <Field label="Notes / Remarks">
                        <Input value={f.notes} onChange={set("notes")} placeholder="Additional details for record-keeping" />
                    </Field>
                </div>

                {/* IMPACT PREVIEW */}
                {sel && (f.adjustType !== "AUDIT" ? qty > 0 : f.actualCount !== "") && (
                    <>
                        <Divider label="Impact Preview" />
                        <div style={{ gridColumn: "span 2" }}>
                            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 20px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }}>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Before</div>
                                        <div style={{ fontSize: 28, fontWeight: 900, fontFamily: FONT.mono, color: T.t2 }}>{sel.stock}</div>
                                    </div>
                                    <div style={{ fontSize: 24, color: T.t3 }}>→</div>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>After</div>
                                        <div style={{
                                            fontSize: 28, fontWeight: 900, fontFamily: FONT.mono,
                                            color: f.adjustType === "AUDIT"
                                                ? (actualCount < sel.minStock ? T.crimson : T.emerald)
                                                : ((sel.stock + (adjType.stockDir * qty)) < sel.minStock ? T.crimson : T.emerald)
                                        }}>
                                            {f.adjustType === "AUDIT" ? actualCount : sel.stock + (adjType.stockDir * qty)}
                                        </div>
                                    </div>
                                </div>

                                {f.adjustType === "RETURN_IN" && totalRefund > 0 && (
                                    <div style={{
                                        marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`,
                                        display: "flex", justifyContent: "space-between", alignItems: "center"
                                    }}>
                                        <span style={{ fontSize: 13, color: T.t2 }}>
                                            Refund via {REFUND_METHODS.find(m => m.value === f.refundMethod)?.label?.replace(/^.*?\s/, "")}
                                        </span>
                                        <span style={{ fontSize: 18, fontWeight: 900, fontFamily: FONT.mono, color: T.crimson }}>
                                            −{fmt(totalRefund)}
                                        </span>
                                    </div>
                                )}

                                {(f.adjustType === "DAMAGE" || f.adjustType === "THEFT") && (
                                    <div style={{
                                        marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`,
                                        display: "flex", justifyContent: "space-between", alignItems: "center"
                                    }}>
                                        <span style={{ fontSize: 13, color: T.t2 }}>Loss at cost</span>
                                        <span style={{ fontSize: 18, fontWeight: 900, fontFamily: FONT.mono, color: T.crimson }}>
                                            −{fmt((sel.buyPrice || 0) * qty)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn
                    variant={f.adjustType === "RETURN_IN" ? "emerald" : f.adjustType === "DAMAGE" || f.adjustType === "THEFT" ? "danger" : "sky"}
                    loading={saving} onClick={handleSave}
                >
                    {adjType?.icon} {f.adjustType === "AUDIT" ? "Apply Correction" : f.adjustType === "RETURN_IN" ? "Process Return" : f.adjustType === "RETURN_OUT" ? "Return to Vendor" : "Record Adjustment"}
                </Btn>
            </div>
        </Modal>
    );
}
