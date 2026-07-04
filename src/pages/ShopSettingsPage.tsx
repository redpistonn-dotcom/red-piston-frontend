import { useState, useEffect, useContext, useCallback } from "react";
import { T, FONT, SHADOWS } from "../theme";
import { Btn, Input, Field, Select, Skeleton } from "../components/ui";
import { AppCtx } from "../AppCtx";
import { getShopProfile, updateShopProfile, updateShopBank } from "../api/shop";
import { getReturnPolicyWindows, createReturnPolicyWindow, deleteReturnPolicyWindow, type ReturnPolicyWindow } from "../api/returnPolicyWindows";

const SCOPE_OPTIONS = [
    { value: "CATEGORY", label: "Category" },
    { value: "BRAND", label: "Brand" },
];

export function ShopSettingsPage() {
    const { toast } = useContext(AppCtx);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingBank, setSavingBank] = useState(false);
    const [profileCollapsed, setProfileCollapsed] = useState(false);
    const [bankCollapsed, setBankCollapsed] = useState(false);
    const [profile, setProfile] = useState<any>({});
    const [bank, setBank] = useState({ bankAccountNumber: "", bankIfsc: "", bankAccountName: "" });

    // ── Return policy windows (category/brand overrides) ──
    const [windowsCollapsed, setWindowsCollapsed] = useState(false);
    const [windows, setWindows] = useState<ReturnPolicyWindow[]>([]);
    const [newScope, setNewScope] = useState<"CATEGORY" | "BRAND">("CATEGORY");
    const [newValue, setNewValue] = useState("");
    const [newDays, setNewDays] = useState("30");
    const [savingWindow, setSavingWindow] = useState(false);

    const loadWindows = useCallback(() => {
        getReturnPolicyWindows().then(res => setWindows(res.windows || [])).catch(() => {});
    }, []);
    useEffect(() => { loadWindows(); }, [loadWindows]);

    const handleAddWindow = async () => {
        if (!newValue.trim()) { toast?.("Enter a category or brand name", "error"); return; }
        const daysNum = parseInt(newDays, 10);
        if (!Number.isFinite(daysNum) || daysNum < 0) { toast?.("Days must be a non-negative number", "error"); return; }
        setSavingWindow(true);
        try {
            await createReturnPolicyWindow({ scope: newScope, value: newValue.trim(), days: daysNum });
            setNewValue("");
            loadWindows();
            toast?.("Return window saved", "success");
        } catch (e: any) {
            toast?.(e?.message || "Could not save", "error");
        } finally {
            setSavingWindow(false);
        }
    };

    const handleDeleteWindow = async (id: number) => {
        try {
            await deleteReturnPolicyWindow(id);
            loadWindows();
        } catch (e: any) {
            toast?.(e?.message || "Could not remove", "error");
        }
    };

    useEffect(() => {
        getShopProfile()
            .then((res: any) => {
                const p = res?.shop || res?.data || res || {};
                setProfile(p);
                setBank({
                    bankAccountNumber: p.bankAccountNumber || "",
                    bankIfsc: p.bankIfsc || "",
                    bankAccountName: p.bankAccountName || "",
                });
            })
            .catch(e => console.error("[ShopSettings] load", e))
            .finally(() => setLoading(false));
    }, []);

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await updateShopProfile(profile);
            toast?.("Shop profile saved!", "success");
        } catch (e: any) {
            toast?.(e?.message || "Failed to save", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveBank = async () => {
        setSavingBank(true);
        try {
            await updateShopBank(bank);
            toast?.("Bank details saved!", "success");
        } catch (e: any) {
            toast?.(e?.message || "Failed to save bank details", "error");
        } finally {
            setSavingBank(false);
        }
    };

    if (loading) return <div className="page-in"><Skeleton height={300} /></div>;

    const sf = (k: string) => (v: string) => setProfile((p: any) => ({ ...p, [k]: v }));

    return (
        <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
            <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.t1, fontFamily: FONT.display, letterSpacing: "-0.03em" }}>Shop Settings</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: T.t3 }}>Manage your shop profile, GST details, and bank information.</p>
            </div>

            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, boxShadow: SHADOWS.xs }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: profileCollapsed ? 0 : 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em" }}>Shop Profile</div>
                    <button onClick={() => setProfileCollapsed(c => !c)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.t3, padding: "2px 6px" }}>{profileCollapsed ? "▸" : "▾"}</button>
                </div>
                <div style={{ maxHeight: profileCollapsed ? 0 : 9999, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                    <Field label="Shop Name"><Input value={profile.name || ""} onChange={sf("name")} placeholder="RedPiston Auto" /></Field>
                    <Field label="GSTIN"><Input value={profile.gstin || profile.gstNo || ""} onChange={sf("gstin")} placeholder="27AAAAA0000A1Z5" /></Field>
                    <Field label="PAN"><Input value={profile.pan || ""} onChange={sf("pan")} placeholder="AAAAA0000A" /></Field>
                    <Field label="City"><Input value={profile.city || ""} onChange={sf("city")} placeholder="Mumbai" /></Field>
                    <Field label="Address"><Input value={profile.address || ""} onChange={sf("address")} placeholder="123 Workshop Road" /></Field>
                    <Field label="Email"><Input value={profile.email || ""} onChange={sf("email")} placeholder="shop@email.com" type="email" /></Field>
                    <Field label="WhatsApp Number"><Input value={profile.whatsappNumber || ""} onChange={sf("whatsappNumber")} placeholder="9876543210" /></Field>
                    <Field label="Shop Description"><Input value={profile.shopDescription || ""} onChange={sf("shopDescription")} placeholder="Auto parts and service" /></Field>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <Btn onClick={handleSaveProfile} loading={saving}>Save Profile</Btn>
                </div>
                </div>
            </div>

            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, boxShadow: SHADOWS.xs }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: bankCollapsed ? 0 : 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em" }}>Bank Details</div>
                    <button onClick={() => setBankCollapsed(c => !c)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.t3, padding: "2px 6px" }}>{bankCollapsed ? "▸" : "▾"}</button>
                </div>
                <div style={{ maxHeight: bankCollapsed ? 0 : 9999, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                    <Field label="Account Number"><Input value={bank.bankAccountNumber} onChange={v => setBank(b => ({ ...b, bankAccountNumber: v }))} placeholder="0001234567890" /></Field>
                    <Field label="IFSC Code"><Input value={bank.bankIfsc} onChange={v => setBank(b => ({ ...b, bankIfsc: v }))} placeholder="HDFC0001234" /></Field>
                    <Field label="Account Holder Name"><Input value={bank.bankAccountName} onChange={v => setBank(b => ({ ...b, bankAccountName: v }))} placeholder="RedPiston Auto Parts" /></Field>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <Btn onClick={handleSaveBank} loading={savingBank}>Save Bank Details</Btn>
                </div>
                </div>
            </div>

            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, boxShadow: SHADOWS.xs }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: windowsCollapsed ? 0 : 18 }}>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em" }}>Return Policy Windows</div>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: T.t3 }}>Override the shop's default return window for a specific category or brand — e.g. electricals get 7 days while everything else gets 30.</p>
                    </div>
                    <button onClick={() => setWindowsCollapsed(c => !c)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.t3, padding: "2px 6px" }}>{windowsCollapsed ? "▸" : "▾"}</button>
                </div>
                <div style={{ maxHeight: windowsCollapsed ? 0 : 9999, overflow: "hidden" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
                        <Field label="Scope"><Select value={newScope} onChange={v => setNewScope(v as "CATEGORY" | "BRAND")} options={SCOPE_OPTIONS} /></Field>
                        <Field label={newScope === "BRAND" ? "Brand name" : "Category name"}><Input value={newValue} onChange={setNewValue} placeholder={newScope === "BRAND" ? "e.g. Bosch" : "e.g. Electricals"} /></Field>
                        <Field label="Days"><input type="number" min={0} value={newDays} onChange={e => setNewDays(e.target.value)} style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontFamily: FONT.mono, fontSize: 13 }} /></Field>
                        <Btn onClick={handleAddWindow} loading={savingWindow}>Add Override</Btn>
                    </div>

                    {windows.length === 0 ? (
                        <div style={{ fontSize: 13, color: T.t3, padding: "12px 0" }}>No overrides yet — every category/brand uses the shop's default return window.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {windows.map(w => (
                                <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.border}` }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: "0.04em", width: 70 }}>{w.scope}</span>
                                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.t1 }}>{w.value}</span>
                                    <span style={{ fontSize: 13, fontFamily: FONT.mono, color: T.t2 }}>{w.days} day{w.days !== 1 ? "s" : ""}</span>
                                    <button onClick={() => handleDeleteWindow(w.id)} style={{ background: "none", border: "none", color: T.crimson, cursor: "pointer", fontSize: 16, minWidth: 32, minHeight: 32 }}>×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
