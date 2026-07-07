/**
 * StaffPage — the single place to invite, list, and manage shop staff.
 * Inviting, editing access/sections, revoking/reactivating, removing, and
 * resending/cancelling a pending invite all live here.
 */
import { useState, useEffect, useContext } from "react";
import { T, FONT, SHADOWS } from "../theme";
import { Btn, Skeleton } from "../components/ui";
import { AppCtx } from "../AppCtx";
import {
  getStaff, deactivateStaff, reactivateStaff, removeStaff, updateStaffAccess,
  getStaffInvites, resendStaffInvite, cancelStaffInvite, createStaffInvite,
  SECTION_OPTIONS, type StaffMember, type StaffInvite,
} from "../api/staff";

const ROLE_COLOR = { OWNER: "#D97706", STAFF: "#0EA5E9" } as Record<string, string>;

export function StaffPage() {
    const { toast } = useContext(AppCtx);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [invites, setInvites] = useState<StaffInvite[]>([]);
    const [loading, setLoading] = useState(true);

    // Per-action loading state, keyed by "actionName-id" — lets each button
    // show its own spinner/disabled state independently (e.g. clicking
    // "Resend" on one invite doesn't grey out "Cancel" on a different one).
    const [pending, setPending] = useState<Record<string, boolean>>({});
    const isPending = (key: string) => !!pending[key];
    const runPending = async (key: string, fn: () => Promise<void>) => {
        setPending(p => ({ ...p, [key]: true }));
        try { await fn(); } finally { setPending(p => ({ ...p, [key]: false })); }
    };

    // Section-edit inline state: staffId → draft section list (pending confirm)
    const [editingSections, setEditingSections] = useState<Record<number, string[]>>({});
    const [editingRoleLabel, setEditingRoleLabel] = useState<Record<number, string>>({});

    // Invite form — collapsed by default, opened by "+ Invite Staff"
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRoleLabel, setInviteRoleLabel] = useState("");
    const [inviteSections, setInviteSections] = useState<string[]>([]);
    const [inviteFieldErrors, setInviteFieldErrors] = useState({ email: false, roleLabel: false, sections: false });
    const [inviting, setInviting] = useState(false);

    const toggleInviteSection = (key: string) =>
        setInviteSections(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const handleInviteStaff = async () => {
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim());
        const errors = {
            email: !inviteEmail.trim() || !emailValid,
            roleLabel: !inviteRoleLabel.trim(),
            sections: inviteSections.length === 0,
        };
        setInviteFieldErrors(errors);
        if (errors.email || errors.roleLabel || errors.sections) {
            toast?.(!inviteEmail.trim() ? "Email is required" : errors.email ? "Enter a valid email address" : errors.roleLabel ? "A role is required" : "Pick at least one section", "error");
            return;
        }
        setInviting(true);
        try {
            await createStaffInvite({ email: inviteEmail.trim(), roleLabel: inviteRoleLabel.trim(), sections: inviteSections });
            const sentTo = inviteEmail.trim();
            setInviteEmail(""); setInviteRoleLabel(""); setInviteSections([]);
            setInviteFieldErrors({ email: false, roleLabel: false, sections: false });
            setShowInviteForm(false);
            toast?.(`Invite sent to ${sentTo} — they'll get a verification code by email`, "success");
            load();
        } catch (e: any) {
            toast?.(e?.data?.error?.message || e?.message || "Failed to invite staff", "error");
        }
        setInviting(false);
    };

    const load = async () => {
        setLoading(true);
        try {
            const [staffRes, invitesRes] = await Promise.all([getStaff(), getStaffInvites()]);
            setStaff(staffRes.data || []);
            setInvites(invitesRes.data || []);
        } catch (e) {
            console.error("[StaffPage] load", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleToggleActive = async (member: StaffMember) => {
        const name = member.user?.name || "Staff";
        if (member.isActive && !window.confirm(`Revoke ${name}'s access? They won't be able to use the shop.`)) return;
        await runPending(`toggle-${member.id}`, async () => {
            try {
                if (member.isActive) {
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
        });
    };

    const handleRemove = async (member: StaffMember) => {
        const name = member.user?.name || "this staff member";
        if (!window.confirm(`Permanently remove ${name}? This cannot be undone.`)) return;
        await runPending(`remove-${member.id}`, async () => {
            try {
                await removeStaff(member.id);
                setStaff(prev => prev.filter(m => m.id !== member.id));
                toast?.(`${name} removed`, "success");
            } catch (e: any) {
                toast?.(e?.data?.error?.message || e?.message || "Failed", "error");
            }
        });
    };

    const startEditingSections = (member: StaffMember) => {
        setEditingSections(prev => ({ ...prev, [member.id]: member.sections || [] }));
        setEditingRoleLabel(prev => ({ ...prev, [member.id]: member.roleLabel || "" }));
    };

    const toggleEditingSection = (memberId: number, key: string) =>
        setEditingSections(prev => ({
            ...prev,
            [memberId]: prev[memberId].includes(key) ? prev[memberId].filter(k => k !== key) : [...prev[memberId], key],
        }));

    const [sectionsInvalid, setSectionsInvalid] = useState<Record<number, boolean>>({});
    const [roleLabelInvalid, setRoleLabelInvalid] = useState<Record<number, boolean>>({});

    const handleSaveSections = async (member: StaffMember) => {
        const sections = editingSections[member.id];
        const roleLabel = editingRoleLabel[member.id]?.trim() ?? "";
        const noSections = !sections || sections.length === 0;
        const noRoleLabel = !roleLabel;
        if (noSections || noRoleLabel) {
            setSectionsInvalid(prev => ({ ...prev, [member.id]: noSections }));
            setRoleLabelInvalid(prev => ({ ...prev, [member.id]: noRoleLabel }));
            toast?.(noSections ? "At least one section is required" : "A role label is required", "error");
            return;
        }
        await runPending(`save-${member.id}`, async () => {
            try {
                await updateStaffAccess(member.id, { sections, roleLabel });
                setStaff(prev => prev.map(m => m.id === member.id ? { ...m, sections, roleLabel } : m));
                setEditingSections(prev => { const next = { ...prev }; delete next[member.id]; return next; });
                setEditingRoleLabel(prev => { const next = { ...prev }; delete next[member.id]; return next; });
                setSectionsInvalid(prev => ({ ...prev, [member.id]: false }));
                setRoleLabelInvalid(prev => ({ ...prev, [member.id]: false }));
                toast?.("Access updated", "success");
            } catch (e: any) {
                toast?.(e?.data?.error?.message || e?.message || "Failed to update access", "error");
            }
        });
    };

    const handleResendInvite = async (invite: StaffInvite) => {
        await runPending(`resend-${invite.id}`, async () => {
            try {
                await resendStaffInvite(invite.id);
                toast?.("Verification code resent", "success");
            } catch (e: any) {
                toast?.(e?.data?.error?.message || e?.message || "Failed to resend", "error");
            }
        });
    };

    const handleCancelInvite = async (invite: StaffInvite) => {
        if (!window.confirm(`Cancel the invite to ${invite.email}?`)) return;
        await runPending(`cancelinv-${invite.id}`, async () => {
            try {
                await cancelStaffInvite(invite.id);
                setInvites(prev => prev.filter(i => i.id !== invite.id));
            } catch (e: any) {
                toast?.(e?.data?.error?.message || e?.message || "Failed to cancel", "error");
            }
        });
    };

    return (
        <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.t1, fontFamily: FONT.display, letterSpacing: "-0.03em" }}>Staff</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: T.t3 }}>Manage your team's access — invite, edit sections, or revoke access.</p>
                </div>
                <Btn onClick={() => setShowInviteForm(v => !v)}>{showInviteForm ? "Cancel" : "+ Invite Staff"}</Btn>
            </div>

            {/* Invite form */}
            {showInviteForm && (
                <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: SHADOWS.xs }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.t2, marginBottom: 10 }}>Invite Staff Member</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                        <div style={{ flex: "1 1 220px", minWidth: 220 }}>
                            <input
                                style={{ width: "100%", boxSizing: "border-box", height: 38, borderRadius: 9, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, color: T.t1, outline: "none", border: `1.5px solid ${inviteFieldErrors.email ? T.crimson : T.border}`, boxShadow: inviteFieldErrors.email ? `0 0 0 3px ${T.crimson}22` : "none" }}
                                type="email" value={inviteEmail}
                                onChange={e => { setInviteEmail(e.target.value); setInviteFieldErrors(p => ({ ...p, email: false })); }}
                                placeholder="Their email (verification code sent here)"
                            />
                            {inviteFieldErrors.email && <div style={{ fontSize: 11, color: T.crimson, fontWeight: 600, marginTop: 4 }}>↑ {inviteEmail.trim() ? "Enter a valid email address" : "Email is required"}</div>}
                        </div>
                        <div style={{ flex: "1 1 160px", minWidth: 160 }}>
                            <input
                                style={{ width: "100%", boxSizing: "border-box", height: 38, borderRadius: 9, padding: "0 12px", fontSize: 13, fontFamily: FONT.ui, color: T.t1, outline: "none", border: `1.5px solid ${inviteFieldErrors.roleLabel ? T.crimson : T.border}`, boxShadow: inviteFieldErrors.roleLabel ? `0 0 0 3px ${T.crimson}22` : "none" }}
                                value={inviteRoleLabel}
                                onChange={e => { setInviteRoleLabel(e.target.value); setInviteFieldErrors(p => ({ ...p, roleLabel: false })); }}
                                placeholder="Role, e.g. Mechanic"
                            />
                            {inviteFieldErrors.roleLabel && <div style={{ fontSize: 11, color: T.crimson, fontWeight: 600, marginTop: 4 }}>↑ Required</div>}
                        </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, marginBottom: 8 }}>Sections they can access</div>
                    <div style={{
                        display: "flex", flexWrap: "wrap", gap: 8, marginBottom: inviteFieldErrors.sections ? 4 : 12,
                        padding: inviteFieldErrors.sections ? 8 : 0, borderRadius: 10,
                        border: inviteFieldErrors.sections ? `1.5px solid ${T.crimson}` : "none",
                    }}>
                        {SECTION_OPTIONS.map(s => (
                            <label key={s.key} style={{
                                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999,
                                border: `1.5px solid ${inviteSections.includes(s.key) ? T.amber : T.border}`,
                                background: inviteSections.includes(s.key) ? `${T.amber}18` : "transparent",
                                cursor: "pointer", fontSize: 12, fontWeight: inviteSections.includes(s.key) ? 700 : 400,
                                color: inviteSections.includes(s.key) ? T.amber : T.t2,
                            }}>
                                <input type="checkbox" checked={inviteSections.includes(s.key)} onChange={() => { toggleInviteSection(s.key); setInviteFieldErrors(p => ({ ...p, sections: false })); }} style={{ width: 14, height: 14 }} />
                                {s.label}
                            </label>
                        ))}
                    </div>
                    {inviteFieldErrors.sections && <div style={{ fontSize: 11, color: T.crimson, fontWeight: 600, marginBottom: 12 }}>↑ Pick at least one section</div>}
                    <button
                        onClick={handleInviteStaff}
                        disabled={inviting}
                        style={{ height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: inviting ? T.amberDim : T.amber, color: "#fff", fontSize: 13, fontWeight: 700, cursor: inviting ? "default" : "pointer", fontFamily: FONT.ui }}
                    >
                        {inviting ? "Sending…" : "Send Invite"}
                    </button>
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 8 }}>They'll get a verification code by email, and fill in their own name + mobile number when they enter it — access activates only then.</div>
                </div>
            )}

            {/* Pending invites */}
            {invites.length > 0 && (
                <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: SHADOWS.xs }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Pending Invites</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {invites.map(inv => (
                            <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.border}` }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: T.t1 }}>{inv.email} <span style={{ fontWeight: 400, color: T.t3 }}>· {inv.roleLabel}</span></div>
                                    <div style={{ fontSize: 12, color: T.t3 }}>Waiting for them to verify and fill in their details</div>
                                </div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: T.amber, background: `${T.amber}18`, padding: "3px 9px", borderRadius: 99 }}>Awaiting verification</span>
                                    <button onClick={() => handleResendInvite(inv)} disabled={isPending(`resend-${inv.id}`) || isPending(`cancelinv-${inv.id}`)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, border: `1px solid ${T.border}`, background: "#fff", cursor: isPending(`resend-${inv.id}`) ? "default" : "pointer", color: T.t2, opacity: isPending(`resend-${inv.id}`) || isPending(`cancelinv-${inv.id}`) ? 0.6 : 1 }}>{isPending(`resend-${inv.id}`) ? "Resending…" : "Resend"}</button>
                                    <button onClick={() => handleCancelInvite(inv)} disabled={isPending(`resend-${inv.id}`) || isPending(`cancelinv-${inv.id}`)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, border: `1px solid ${T.crimson}33`, background: "#fff", cursor: isPending(`cancelinv-${inv.id}`) ? "default" : "pointer", color: T.crimson, opacity: isPending(`resend-${inv.id}`) || isPending(`cancelinv-${inv.id}`) ? 0.6 : 1 }}>{isPending(`cancelinv-${inv.id}`) ? "Cancelling…" : "Cancel"}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Staff list */}
            {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[1,2,3].map(i => <Skeleton key={i} height={70} />)}
                </div>
            ) : staff.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.t1, marginBottom: 6 }}>No staff yet</div>
                    <div style={{ fontSize: 13, color: T.t3 }}>Invite your first team member from your <a href="/profile" style={{ color: T.amber, fontWeight: 700 }}>profile page</a>.</div>
                </div>
            ) : (
                <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOWS.xs }}>
                  <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "60vh", WebkitOverflowScrolling: "touch" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                            <tr style={{ background: T.surfaceContainerLow }}>
                                {["Member", "Role", "Sections", "Status", "Actions"].map(h => (
                                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: T.t2, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((m, i) => {
                                const name    = m.user?.name || "Unknown";
                                const contact = m.user?.phone || m.user?.email || "—";
                                const color   = ROLE_COLOR[m.role] || T.sky;
                                const isOwner = m.role === "OWNER";
                                const editing = editingSections[m.id];
                                return (
                                    <tr key={m.id} style={{ borderBottom: i < staff.length - 1 ? `1px solid ${T.border}` : "none" }}>
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

                                        <td style={{ padding: "12px 16px" }}>
                                            {editing ? (
                                                <input
                                                    value={editingRoleLabel[m.id] ?? ""}
                                                    onChange={e => { setEditingRoleLabel(p => ({ ...p, [m.id]: e.target.value })); setRoleLabelInvalid(p => ({ ...p, [m.id]: false })); }}
                                                    placeholder="e.g. Mechanic"
                                                    style={{
                                                        width: 110, fontSize: 12, padding: "5px 8px", borderRadius: 7, fontFamily: FONT.ui, outline: "none",
                                                        border: `1.5px solid ${roleLabelInvalid[m.id] ? T.crimson : T.border}`,
                                                        boxShadow: roleLabelInvalid[m.id] ? `0 0 0 2px ${T.crimson}22` : "none",
                                                    }}
                                                />
                                            ) : (
                                                <span style={{ fontSize: 11, background: `${color}22`, color, padding: "3px 9px", borderRadius: 99, fontWeight: 700 }}>{m.roleLabel || m.role}</span>
                                            )}
                                        </td>

                                        {/* Sections + inline edit */}
                                        <td style={{ padding: "12px 16px", minWidth: 220 }}>
                                            {isOwner ? (
                                                <span style={{ fontSize: 12, color: T.t3 }}>All sections</span>
                                            ) : editing ? (
                                                <div>
                                                    <div style={{
                                                        display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, padding: sectionsInvalid[m.id] ? 6 : 0,
                                                        borderRadius: 8, border: sectionsInvalid[m.id] ? `1.5px solid ${T.crimson}` : "none",
                                                    }}>
                                                        {SECTION_OPTIONS.map(s => (
                                                            <label key={s.key} style={{
                                                                display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 99,
                                                                border: `1px solid ${editing.includes(s.key) ? T.amber : T.border}`,
                                                                background: editing.includes(s.key) ? `${T.amber}18` : "transparent",
                                                                cursor: "pointer", fontSize: 11, color: editing.includes(s.key) ? T.amber : T.t3,
                                                            }}>
                                                                <input type="checkbox" checked={editing.includes(s.key)} onChange={() => { toggleEditingSection(m.id, s.key); setSectionsInvalid(p => ({ ...p, [m.id]: false })); }} style={{ width: 12, height: 12 }} />
                                                                {s.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                    {sectionsInvalid[m.id] && <div style={{ fontSize: 10, color: T.crimson, fontWeight: 600, marginBottom: 6 }}>↑ Pick at least one section</div>}
                                                    <button onClick={() => handleSaveSections(m)} disabled={isPending(`save-${m.id}`)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "none", background: T.emerald, color: "#fff", cursor: isPending(`save-${m.id}`) ? "default" : "pointer", fontWeight: 700, marginRight: 6, opacity: isPending(`save-${m.id}`) ? 0.7 : 1 }}>{isPending(`save-${m.id}`) ? "Saving…" : "Save"}</button>
                                                    <button disabled={isPending(`save-${m.id}`)} onClick={() => { setEditingSections(p => { const n = { ...p }; delete n[m.id]; return n; }); setEditingRoleLabel(p => { const n = { ...p }; delete n[m.id]; return n; }); setSectionsInvalid(p => ({ ...p, [m.id]: false })); setRoleLabelInvalid(p => ({ ...p, [m.id]: false })); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: `1px solid ${T.border}`, background: "#fff", color: T.t3, cursor: isPending(`save-${m.id}`) ? "default" : "pointer", opacity: isPending(`save-${m.id}`) ? 0.7 : 1 }}>Cancel</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                    <span style={{ fontSize: 12, color: T.t2 }}>{(m.sections || []).join(", ") || "—"}</span>
                                                    <button onClick={() => startEditingSections(m)} title="Edit sections" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#fff", color: T.t3, cursor: "pointer" }}>edit</button>
                                                </div>
                                            )}
                                        </td>

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

                                        <td style={{ padding: "12px 16px" }}>
                                            {!isOwner && (
                                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                    <button
                                                        onClick={() => handleToggleActive(m)}
                                                        disabled={isPending(`toggle-${m.id}`) || isPending(`remove-${m.id}`)}
                                                        style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, border: `1px solid ${T.border}`, background: "#fff", cursor: isPending(`toggle-${m.id}`) ? "default" : "pointer", color: T.t2, fontFamily: FONT.ui, whiteSpace: "nowrap", opacity: isPending(`toggle-${m.id}`) || isPending(`remove-${m.id}`) ? 0.6 : 1 }}
                                                    >
                                                        {isPending(`toggle-${m.id}`) ? "Working…" : (m.isActive !== false ? "Revoke Access" : "Reactivate")}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(m)}
                                                        disabled={isPending(`toggle-${m.id}`) || isPending(`remove-${m.id}`)}
                                                        style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, border: `1px solid ${T.crimson}33`, background: "#fff", cursor: isPending(`remove-${m.id}`) ? "default" : "pointer", color: T.crimson, fontFamily: FONT.ui, whiteSpace: "nowrap", opacity: isPending(`toggle-${m.id}`) || isPending(`remove-${m.id}`) ? 0.6 : 1 }}
                                                    >
                                                        {isPending(`remove-${m.id}`) ? "Removing…" : "Remove"}
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
                </div>
            )}
        </div>
    );
}
