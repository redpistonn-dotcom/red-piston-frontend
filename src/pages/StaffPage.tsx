import { useState, useEffect, useContext } from "react";
import { T, FONT, SHADOWS } from "../theme";
import { Btn, Input, Select, Modal, Field, Skeleton } from "../components/ui";
import { AppCtx } from "../AppCtx";
import { getStaff, inviteStaff, deactivateStaff, reactivateStaff, removeStaff } from "../api/staff";

const ROLE_OPTS = ["SHOP_OWNER", "SHOP_STAFF"];

export function StaffPage() {
    const { toast } = useContext(AppCtx);
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", phone: "", role: "SHOP_STAFF" });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res: any = await getStaff();
            setStaff(res?.staff || res?.data || res || []);
        } catch (e) {
            console.error("[StaffPage] load", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleInvite = async () => {
        if (!form.name) { toast?.("Name is required", "error"); return; }
        setSaving(true);
        try {
            await inviteStaff({ name: form.name, email: form.email || undefined, phone: form.phone || undefined, role: form.role });
            toast?.(`${form.name} invited!`, "success");
            setShowInvite(false);
            setForm({ name: "", email: "", phone: "", role: "SHOP_STAFF" });
            load();
        } catch (e: any) {
            toast?.(e?.message || "Failed to invite", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (member: any) => {
        try {
            if (member.isActive) await deactivateStaff(member.id);
            else await reactivateStaff(member.id);
            setStaff(prev => prev.map(m => m.id === member.id ? { ...m, isActive: !m.isActive } : m));
            toast?.(`${member.name} ${member.isActive ? "deactivated" : "reactivated"}`, "success");
        } catch (e: any) {
            toast?.(e?.message || "Failed", "error");
        }
    };

    const handleRemove = async (member: any) => {
        if (!window.confirm(`Remove ${member.name}?`)) return;
        try {
            await removeStaff(member.id);
            setStaff(prev => prev.filter(m => m.id !== member.id));
            toast?.(`${member.name} removed`, "success");
        } catch (e: any) {
            toast?.(e?.message || "Failed", "error");
        }
    };

    return (
        <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.t1, fontFamily: FONT.display, letterSpacing: "-0.03em" }}>Staff</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: T.t3 }}>Manage your team members and their roles.</p>
                </div>
                <Btn onClick={() => setShowInvite(true)}>+ Invite Staff</Btn>
            </div>

            {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[1,2,3].map(i => <Skeleton key={i} height={60} />)}
                </div>
            ) : staff.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: T.t3, fontSize: 14 }}>
                    No staff yet. Invite your first team member.
                </div>
            ) : (
                <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOWS.xs }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: T.surfaceContainerLow }}>
                                {["Name", "Contact", "Role", "Status", "Actions"].map(h => (
                                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: T.t2, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((m: any, i: number) => (
                                <tr key={m.id} style={{ borderBottom: i < staff.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                    <td style={{ padding: "12px 16px", fontWeight: 700, color: T.t1 }}>{m.name || m.email}</td>
                                    <td style={{ padding: "12px 16px", color: T.t3, fontSize: 12 }}>{m.email || "—"}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <span style={{ fontSize: 11, background: T.surfaceContainerHigh, color: T.t2, padding: "3px 9px", borderRadius: 99, fontWeight: 600 }}>
                                            {m.role || "SHOP_STAFF"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: m.isActive !== false ? T.emerald : T.t4 }}>
                                            {m.isActive !== false ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 16px" }}>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button onClick={() => handleToggleActive(m)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: `1px solid ${T.border}`, background: "#fff", cursor: "pointer", color: T.t2, fontFamily: FONT.ui }}>
                                                {m.isActive !== false ? "Deactivate" : "Reactivate"}
                                            </button>
                                            <button onClick={() => handleRemove(m)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: `1px solid ${T.crimson}22`, background: "#fff", cursor: "pointer", color: T.crimson, fontFamily: FONT.ui }}>
                                                Remove
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showInvite && (
                <Modal title="Invite Staff Member" onClose={() => setShowInvite(false)}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <Field label="Full Name *">
                            <Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Raju Kumar" />
                        </Field>
                        <Field label="Email">
                            <Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="raju@shop.com" type="email" />
                        </Field>
                        <Field label="Role">
                            <Select value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))} options={ROLE_OPTS.map(r => ({ value: r, label: r.replace("_", " ") }))} />
                        </Field>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <Btn variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Btn>
                            <Btn onClick={handleInvite} loading={saving}>Send Invite</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
