/**
 * StaffPage — Manage shop staff members.
 *
 * Flow: Staff must already have a RedPiston account. Shop owner invites by phone
 * number → backend looks up User by phone → creates ShopUser row. Staff get
 * immediate access with the permissions for their assigned role.
 *
 * Roles & default permissions:
 *   MANAGER  — billing, inventory, reports, parties, workshop
 *   CASHIER  — billing only
 *   MECHANIC — workshop only
 *   DELIVERY — no module access (delivery tracking only)
 */
import { useState, useEffect, useContext } from "react";
import { T, FONT, SHADOWS } from "../theme";
import { Btn, Input, Select, Modal, Field, Skeleton } from "../components/ui";
import { AppCtx } from "../AppCtx";
import { getStaff, deactivateStaff, reactivateStaff, removeStaff, updateStaffRole } from "../api/staff";
import { api } from "../api/client";

// Staff-role colours matching ProfilePage
const ROLE_COLORS: Record<string, string> = {
    OWNER:    "#D97706",
    MANAGER:  "#8B5CF6",
    CASHIER:  "#0EA5E9",
    MECHANIC: "#059669",
    DELIVERY: "#F97316",
};

const INVITE_ROLES = ["MANAGER", "CASHIER", "MECHANIC", "DELIVERY"];

const ROLE_DESC: Record<string, string> = {
    MANAGER:  "Billing, inventory, reports, parties, workshop",
    CASHIER:  "Billing only",
    MECHANIC: "Workshop only",
    DELIVERY: "Delivery tracking only",
};

export function StaffPage() {
    const { toast } = useContext(AppCtx);
    const [staff, setStaff]   = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [invitePhone, setInvitePhone] = useState("");
    const [inviteRole,  setInviteRole]  = useState("CASHIER");
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState("");

    // Role-change inline state: staffId → new role (pending confirm)
    const [changingRole, setChangingRole] = useState<Record<string, string>>({});

    const load = async () => {
        setLoading(true);
        try {
            const res: any = await getStaff();
            // Backend returns { success, data: [...] }
            const list = Array.isArray(res) ? res : (res?.data || res?.staff || []);
            setStaff(list);
        } catch (e) {
            console.error("[StaffPage] load", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleInvite = async () => {
        setInviteError("");
        if (!invitePhone.trim()) { setInviteError("Phone number is required"); return; }
        if (!/^\d{10}$/.test(invitePhone.trim().replace(/\s/g, ""))) {
            setInviteError("Enter a valid 10-digit phone number"); return;
        }
        setInviting(true);
        try {
            // Backend: POST /api/shop/staff/invite — { phone, role }
            const res: any = await api.post("/api/shop/staff/invite", { phone: invitePhone.trim(), role: inviteRole });
            const newMember = res?.data || res;
            setStaff(prev => [...prev, newMember]);
            toast?.(`${newMember?.user?.name || "Staff member"} added as ${inviteRole}`, "success");
            setShowInvite(false);
            setInvitePhone("");
            setInviteRole("CASHIER");
        } catch (e: any) {
            const msg = e?.data?.error?.message || e?.message || "Failed to add staff";
            setInviteError(msg);
        } finally {
            setInviting(false);
        }
    };

    const handleToggleActive = async (member: any) => {
        const name = member.user?.name || "Staff";
        try {
            if (member.isActive) {
                if (!window.confirm(`Revoke ${name}'s access? They won't be able to use the shop.`)) return;
                await deactivateStaff(member.id);
                setStaff(prev => prev.map(m => m.id === member.id ? { ...m, isActive: false } : m));
                toast?.(`${name}'s access revoked`, "success");
            } else {
                await reactivateStaff(member.id);
                setStaff(prev => prev.map(m => m.id === member.id ? { ...m, isActive: true } : m));
                toast?.(`${name} reactivated`, "success");
            }
        } catch (e: any) {
            toast?.(e?.data?.error?.message || e?.message || "Failed", "error");
        }
    };

    const handleRemove = async (member: any) => {
        const name = member.user?.name || "this staff member";
        if (!window.confirm(`Permanently remove ${name}? This cannot be undone.`)) return;
        try {
            await removeStaff(member.id);
            setStaff(prev => prev.filter(m => m.id !== member.id));
            toast?.(`${name} removed`, "success");
        } catch (e: any) {
            toast?.(e?.data?.error?.message || e?.message || "Failed", "error");
        }
    };

    const handleChangeRole = async (member: any) => {
        const newRole = changingRole[member.id];
        if (!newRole || newRole === member.role) { setChangingRole(p => ({ ...p, [member.id]: "" })); return; }
        try {
            await updateStaffRole(member.id, newRole);
            setStaff(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
            setChangingRole(p => ({ ...p, [member.id]: "" }));
            toast?.(`Role updated to ${newRole}`, "success");
        } catch (e: any) {
            toast?.(e?.data?.error?.message || e?.message || "Failed to change role", "error");
        }
    };

    return (
        <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.t1, fontFamily: FONT.display, letterSpacing: "-0.03em" }}>Staff</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: T.t3 }}>Manage your team and their shop access.</p>
                </div>
                <Btn onClick={() => { setShowInvite(true); setInviteError(""); }}>+ Add Staff</Btn>
            </div>

            {/* How it works callout */}
            <div style={{ background: T.surfaceContainerLow, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px", fontSize: 12, color: T.t3, lineHeight: 1.6 }}>
                <strong style={{ color: T.t2 }}>How staff access works:</strong> Staff must already have a <strong>RedPiston account</strong> (they sign up with their phone number).
                Once added, they log in with their own phone and get access based on their role.
                You can revoke access any time without deleting their account.
            </div>

            {/* Staff list */}
            {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[1,2,3].map(i => <Skeleton key={i} height={70} />)}
                </div>
            ) : staff.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: T.t3, fontSize: 14 }}>
                    No staff yet. Click <strong>+ Add Staff</strong> to add your first team member.
                </div>
            ) : (
                <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOWS.xs }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: T.surfaceContainerLow }}>
                                {["Member", "Role", "Status", "Actions"].map(h => (
                                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: T.t2, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((m: any, i: number) => {
                                const name    = m.user?.name || "Unknown";
                                const contact = m.user?.phone || m.user?.email || "—";
                                const color   = ROLE_COLORS[m.role] || T.t3;
                                const isOwner = m.role === "OWNER";
                                const pending = changingRole[m.id];
                                return (
                                    <tr key={m.id} style={{ borderBottom: i < staff.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                        {/* Name + contact */}
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${color}22`, color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                                                    {name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: T.t1 }}>{name}</div>
                                                    <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono }}>{contact}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role + change */}
                                        <td style={{ padding: "12px 16px" }}>
                                            {isOwner ? (
                                                <span style={{ fontSize: 11, background: `${color}22`, color, padding: "3px 9px", borderRadius: 99, fontWeight: 700 }}>{m.role}</span>
                                            ) : pending ? (
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <select
                                                        value={pending}
                                                        onChange={e => setChangingRole(p => ({ ...p, [m.id]: e.target.value }))}
                                                        style={{ fontSize: 12, padding: "4px 8px", borderRadius: 7, border: `1px solid ${T.border}`, background: "#fff", fontFamily: FONT.ui, color: T.t1, cursor: "pointer" }}
                                                    >
                                                        {INVITE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                    </select>
                                                    <button onClick={() => handleChangeRole(m)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 7, border: "none", background: T.emerald, color: "#fff", cursor: "pointer", fontWeight: 700 }}>✓</button>
                                                    <button onClick={() => setChangingRole(p => ({ ...p, [m.id]: "" }))} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 7, border: `1px solid ${T.border}`, background: "#fff", color: T.t3, cursor: "pointer" }}>✕</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <span style={{ fontSize: 11, background: `${color}22`, color, padding: "3px 9px", borderRadius: 99, fontWeight: 700 }}>{m.role}</span>
                                                    <button
                                                        onClick={() => setChangingRole(p => ({ ...p, [m.id]: m.role }))}
                                                        title="Change role"
                                                        style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#fff", color: T.t3, cursor: "pointer" }}
                                                    >edit</button>
                                                </div>
                                            )}
                                            <div style={{ fontSize: 10, color: T.t4, marginTop: 2 }}>{ROLE_DESC[m.role] || ""}</div>
                                        </td>

                                        {/* Status */}
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: m.isActive !== false ? T.emerald : T.t4 }}>
                                                {m.isActive !== false ? "● Active" : "○ Inactive"}
                                            </span>
                                            {m.joinedAt && (
                                                <div style={{ fontSize: 10, color: T.t4, marginTop: 2 }}>
                                                    Added {new Date(m.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                </div>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td style={{ padding: "12px 16px" }}>
                                            {!isOwner && (
                                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                    <button
                                                        onClick={() => handleToggleActive(m)}
                                                        style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, border: `1px solid ${T.border}`, background: "#fff", cursor: "pointer", color: T.t2, fontFamily: FONT.ui, whiteSpace: "nowrap" }}
                                                    >
                                                        {m.isActive !== false ? "Revoke Access" : "Reactivate"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(m)}
                                                        style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, border: `1px solid ${T.crimson}33`, background: "#fff", cursor: "pointer", color: T.crimson, fontFamily: FONT.ui, whiteSpace: "nowrap" }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Invite modal */}
            {showInvite && (
                <Modal title="Add Staff Member" onClose={() => { setShowInvite(false); setInviteError(""); }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ background: T.surfaceContainerLow, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: T.t3, lineHeight: 1.6 }}>
                            The staff member must already have a <strong style={{ color: T.t2 }}>RedPiston account</strong> registered with their phone number.
                            Enter their registered phone number below.
                        </div>

                        {inviteError && (
                            <div style={{ background: "#1c0909", border: `1.5px solid ${T.crimson}`, borderRadius: 10, padding: "10px 14px", color: T.crimson, fontSize: 13 }}>
                                {inviteError}
                            </div>
                        )}

                        <Field label="Phone Number *">
                            <Input
                                value={invitePhone}
                                onChange={v => { setInvitePhone(v); setInviteError(""); }}
                                placeholder="10-digit phone (e.g. 9876543210)"
                                type="tel"
                            />
                        </Field>

                        <Field label="Role">
                            <Select
                                value={inviteRole}
                                onChange={v => setInviteRole(v)}
                                options={INVITE_ROLES.map(r => ({ value: r, label: `${r} — ${ROLE_DESC[r]}` }))}
                            />
                        </Field>

                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <Btn variant="ghost" onClick={() => { setShowInvite(false); setInviteError(""); }}>Cancel</Btn>
                            <Btn onClick={handleInvite} loading={inviting}>Add Staff</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
