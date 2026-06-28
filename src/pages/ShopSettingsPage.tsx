import { useState, useEffect, useContext } from "react";
import { T, FONT, SHADOWS } from "../theme";
import { Btn, Input, Field, Skeleton } from "../components/ui";
import { AppCtx } from "../AppCtx";
import { getShopProfile, updateShopProfile, updateShopBank } from "../api/shop";

export function ShopSettingsPage() {
    const { toast } = useContext(AppCtx);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingBank, setSavingBank] = useState(false);
    const [profile, setProfile] = useState<any>({});
    const [bank, setBank] = useState({ bankAccountNumber: "", bankIfsc: "", bankAccountName: "" });

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
                <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18 }}>Shop Profile</div>
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

            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, boxShadow: SHADOWS.xs }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18 }}>Bank Details</div>
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
    );
}
