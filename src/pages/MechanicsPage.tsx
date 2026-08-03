/**
 * MechanicsPage — shop owner's mechanic team management.
 * Three sources of mechanics feed into one list:
 *   1. Invited by email (OTP flow) — shows up under "Pending Invites" until accepted.
 *   2. Self-registered with the shop's join code — shows up under "Pending Approval".
 *   3. Active mechanics — either of the above once verified/approved.
 *
 * Privileges (sections) are DB-backed (see api/mechanics.ts getMechanicSections,
 * prisma Section model, index.js ensureSchemaFixes seed) — not a hardcoded
 * frontend list. HEAD mechanics get every privilege automatically (backend
 * enforces this too, see requireMechanicSection), so the picker is only shown
 * for MEMBER-role rows.
 */
import { useState, useEffect, useContext, useCallback } from "react";
import { T, FONT } from "../theme";
import { Btn, Skeleton } from "../components/ui";
import { AppCtx } from "../AppCtx";
import {
  getMechanics, getMechanicInvites, getMechanicJoinCode, rotateMechanicJoinCode,
  getMechanicSections, inviteMechanic, resendMechanicInvite, cancelMechanicInvite,
  approveMechanic, rejectMechanic, updateMechanicRole, updateMechanicSections,
  deactivateMechanic, reactivateMechanic,
  type ShopMechanic, type MechanicInvite, type MechanicSection,
} from "../api/mechanics";

const ROLE_COLOR = { HEAD: "#D97706", MEMBER: "#0EA5E9" } as Record<string, string>;

function SectionCheckboxes({ sections, value, onChange }: {
  sections: MechanicSection[]; value: string[]; onChange: (next: string[]) => void;
}) {
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter(k => k !== key) : [...value, key]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {sections.map(s => {
        const checked = value.includes(s.key);
        return (
          <label
            key={s.key}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 10px",
              borderRadius: 8, border: `1.5px solid ${checked ? T.amber : T.border}`,
              background: checked ? T.amberGlow : "transparent", cursor: "pointer",
              fontSize: 12, color: checked ? T.amber : T.t2, fontFamily: FONT.ui,
            }}
          >
            <input type="checkbox" checked={checked} onChange={() => toggle(s.key)} style={{ margin: 0 }} />
            {s.label}
          </label>
        );
      })}
    </div>
  );
}

export function MechanicsPage() {
  const { toast } = useContext(AppCtx);
  const [mechanics, setMechanics] = useState<ShopMechanic[]>([]);
  const [invites, setInvites] = useState<MechanicInvite[]>([]);
  const [sections, setSections] = useState<MechanicSection[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState<Record<string, boolean>>({});
  const isPending = (key: string) => !!pending[key];
  const runPending = async (key: string, fn: () => Promise<void>) => {
    setPending(p => ({ ...p, [key]: true }));
    try { await fn(); } finally { setPending(p => ({ ...p, [key]: false })); }
  };

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"HEAD" | "MEMBER">("MEMBER");
  const [inviteSections, setInviteSections] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);

  // Per-pending-approval draft section picks, keyed by mechanic id
  const [approvalSections, setApprovalSections] = useState<Record<number, string[]>>({});
  // Per-active-mechanic editing state
  const [editingSections, setEditingSections] = useState<Record<number, string[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, i, j, s] = await Promise.all([
        getMechanics(), getMechanicInvites(), getMechanicJoinCode(), getMechanicSections(),
      ]);
      setMechanics(m.data || []);
      setInvites(i.data || []);
      setJoinCode(j.data?.joinCode || "");
      setSections(s.data || []);
    } catch (e: any) {
      toast?.(e?.data?.error?.message || e?.message || "Failed to load mechanics", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async () => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim());
    if (!emailValid) { toast?.("Enter a valid email address", "error"); return; }
    setInviting(true);
    try {
      await inviteMechanic({ email: inviteEmail.trim(), mechanicRole: inviteRole, sections: inviteSections });
      toast?.(`Invite sent to ${inviteEmail.trim()}`, "success");
      setInviteEmail(""); setInviteRole("MEMBER"); setInviteSections([]); setShowInviteForm(false);
      load();
    } catch (e: any) {
      toast?.(e?.data?.error?.message || e?.message || "Failed to send invite", "error");
    }
    setInviting(false);
  };

  const handleRotateCode = () => runPending("rotate-code", async () => {
    try {
      const r = await rotateMechanicJoinCode();
      setJoinCode(r.data?.joinCode || "");
      toast?.("Join code rotated", "success");
    } catch (e: any) {
      toast?.(e?.data?.error?.message || e?.message || "Failed to rotate code", "error");
    }
  });

  const handleApprove = (id: number) => runPending(`approve-${id}`, async () => {
    try {
      await approveMechanic(id, "MEMBER", approvalSections[id] || []);
      toast?.("Mechanic approved", "success"); load();
    }
    catch (e: any) { toast?.(e?.data?.error?.message || e?.message || "Approve failed", "error"); }
  });

  const handleReject = (id: number) => runPending(`reject-${id}`, async () => {
    try { await rejectMechanic(id); toast?.("Request rejected", "success"); load(); }
    catch (e: any) { toast?.(e?.data?.error?.message || e?.message || "Reject failed", "error"); }
  });

  const handleRoleChange = (id: number, role: "HEAD" | "MEMBER") => runPending(`role-${id}`, async () => {
    try { await updateMechanicRole(id, role); toast?.("Role updated", "success"); load(); }
    catch (e: any) { toast?.(e?.data?.error?.message || e?.message || "Update failed", "error"); }
  });

  const handleSaveSections = (id: number) => runPending(`sections-${id}`, async () => {
    try {
      await updateMechanicSections(id, editingSections[id] || []);
      toast?.("Privileges updated", "success");
      setEditingSections(prev => { const { [id]: _drop, ...rest } = prev; return rest; });
      load();
    } catch (e: any) { toast?.(e?.data?.error?.message || e?.message || "Update failed", "error"); }
  });

  const handleToggleActive = (m: ShopMechanic) => runPending(`toggle-${m.id}`, async () => {
    try {
      if (m.is_active) await deactivateMechanic(m.id); else await reactivateMechanic(m.id);
      toast?.(m.is_active ? "Mechanic deactivated" : "Mechanic reactivated", "success");
      load();
    } catch (e: any) { toast?.(e?.data?.error?.message || e?.message || "Update failed", "error"); }
  });

  const handleResendInvite = (id: number) => runPending(`resend-${id}`, async () => {
    try { await resendMechanicInvite(id); toast?.("Invite resent", "success"); }
    catch (e: any) { toast?.(e?.data?.error?.message || e?.message || "Resend failed", "error"); }
  });

  const handleCancelInvite = (id: number) => runPending(`cancel-${id}`, async () => {
    try { await cancelMechanicInvite(id); toast?.("Invite cancelled", "success"); load(); }
    catch (e: any) { toast?.(e?.data?.error?.message || e?.message || "Cancel failed", "error"); }
  });

  const pendingApproval = mechanics.filter(m => m.approval_status === "PENDING");
  const active = mechanics.filter(m => m.approval_status === "ACTIVE");

  return (
    <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: FONT.display }}>Mechanics</div>
          <div style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>Invite mechanics by email, or share your shop's join code for self-signup.</div>
        </div>
        <Btn onClick={() => setShowInviteForm(v => !v)}>+ Invite Mechanic</Btn>
      </div>

      {/* Join code box */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Shop Join Code</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.amber, fontFamily: FONT.mono, letterSpacing: 3, marginTop: 4 }}>{joinCode || "—"}</div>
          <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Mechanics enter this at <span style={{ fontFamily: FONT.mono }}>/mechanic/join</span> to request access.</div>
        </div>
        <Btn variant="outline" onClick={handleRotateCode} disabled={isPending("rotate-code")}>
          {isPending("rotate-code") ? "Rotating…" : "Rotate Code"}
        </Btn>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, marginBottom: 12 }}>Invite by Email</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <input
              type="email" placeholder="mechanic@example.com" value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{ flex: "1 1 220px", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.bg, color: T.t1, fontSize: 14, fontFamily: FONT.ui, outline: "none" }}
            />
            <select
              value={inviteRole} onChange={e => setInviteRole(e.target.value as "HEAD" | "MEMBER")}
              style={{ padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.bg, color: T.t1, fontSize: 14, fontFamily: FONT.ui }}
            >
              <option value="MEMBER">Member</option>
              <option value="HEAD">Head Mechanic</option>
            </select>
            <Btn onClick={handleInvite} disabled={inviting}>{inviting ? "Sending…" : "Send Invite"}</Btn>
          </div>
          {inviteRole === "MEMBER" && sections.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.t2, marginBottom: 8 }}>Privileges (Head mechanics get all of these automatically)</div>
              <SectionCheckboxes sections={sections} value={inviteSections} onChange={setInviteSections} />
            </div>
          )}
        </div>
      )}

      {loading ? (
        <Skeleton height={200} />
      ) : (
        <>
          {/* Pending invites (email, not yet accepted) */}
          {invites.length > 0 && (
            <Section title="Pending Invites">
              {invites.map(inv => (
                <Row key={inv.id}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: T.t1, fontSize: 14 }}>{inv.email}</div>
                    <div style={{ fontSize: 12, color: T.t3 }}>Invited as {inv.mechanic_role === "HEAD" ? "Head Mechanic" : "Member"} · {inv.status}</div>
                  </div>
                  <Btn variant="outline" size="sm" onClick={() => handleResendInvite(inv.id)} disabled={isPending(`resend-${inv.id}`)}>Resend</Btn>
                  <Btn variant="danger" size="sm" onClick={() => handleCancelInvite(inv.id)} disabled={isPending(`cancel-${inv.id}`)}>Cancel</Btn>
                </Row>
              ))}
            </Section>
          )}

          {/* Pending approval (self-registered with join code) */}
          {pendingApproval.length > 0 && (
            <Section title="Pending Approval">
              {pendingApproval.map(m => (
                <div key={m.id} style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: T.t1, fontSize: 14 }}>{m.name || m.email}</div>
                      <div style={{ fontSize: 12, color: T.t3 }}>{m.email} · {m.phone}</div>
                    </div>
                    <Btn size="sm" onClick={() => handleApprove(m.id)} disabled={isPending(`approve-${m.id}`)}>Approve as Member</Btn>
                    <Btn variant="danger" size="sm" onClick={() => handleReject(m.id)} disabled={isPending(`reject-${m.id}`)}>Reject</Btn>
                  </div>
                  {sections.length > 0 && (
                    <SectionCheckboxes
                      sections={sections}
                      value={approvalSections[m.id] || []}
                      onChange={next => setApprovalSections(prev => ({ ...prev, [m.id]: next }))}
                    />
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Active mechanics */}
          <Section title={`Team (${active.length})`}>
            {active.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: T.t3, fontSize: 13 }}>No active mechanics yet.</div>
            ) : active.map(m => {
              const isEditing = editingSections[m.id] !== undefined;
              return (
                <div key={m.id} style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: T.t1, fontSize: 14 }}>{m.name || "No name"}</div>
                      <div style={{ fontSize: 12, color: T.t3 }}>{m.email || m.phone}</div>
                    </div>
                    <span style={{
                      background: `${ROLE_COLOR[m.mechanic_role]}18`, border: `1px solid ${ROLE_COLOR[m.mechanic_role]}`,
                      color: ROLE_COLOR[m.mechanic_role], borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                    }}>
                      {m.mechanic_role === "HEAD" ? "Head" : "Member"}
                    </span>
                    <select
                      value={m.mechanic_role}
                      onChange={e => handleRoleChange(m.id, e.target.value as "HEAD" | "MEMBER")}
                      disabled={isPending(`role-${m.id}`)}
                      style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, color: T.t2, fontSize: 12, fontFamily: FONT.ui }}
                    >
                      <option value="MEMBER">Member</option>
                      <option value="HEAD">Head</option>
                    </select>
                    <Btn variant={m.is_active ? "danger" : "outline"} size="sm" onClick={() => handleToggleActive(m)} disabled={isPending(`toggle-${m.id}`)}>
                      {m.is_active ? "Deactivate" : "Reactivate"}
                    </Btn>
                  </div>

                  {/* Privileges — HEAD gets everything automatically, no picker needed */}
                  {m.mechanic_role === "MEMBER" && sections.length > 0 && (
                    isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <SectionCheckboxes
                          sections={sections}
                          value={editingSections[m.id] || []}
                          onChange={next => setEditingSections(prev => ({ ...prev, [m.id]: next }))}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <Btn size="sm" onClick={() => handleSaveSections(m.id)} disabled={isPending(`sections-${m.id}`)}>Save Privileges</Btn>
                          <Btn variant="outline" size="sm" onClick={() => setEditingSections(prev => { const { [m.id]: _drop, ...rest } = prev; return rest; })}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {m.sections.length === 0 ? (
                          <span style={{ fontSize: 12, color: T.t3, fontStyle: "italic" }}>No extra privileges granted</span>
                        ) : m.sections.map(key => (
                          <span key={key} style={{ fontSize: 11, background: T.amberGlow, color: T.amber, borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
                            {sections.find(s => s.key === key)?.label || key}
                          </span>
                        ))}
                        <button
                          onClick={() => setEditingSections(prev => ({ ...prev, [m.id]: m.sections }))}
                          style={{ fontSize: 12, color: T.amber, background: "none", border: "none", cursor: "pointer", fontFamily: FONT.ui, fontWeight: 600 }}
                        >
                          Edit
                        </button>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.t2, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
      {children}
    </div>
  );
}
