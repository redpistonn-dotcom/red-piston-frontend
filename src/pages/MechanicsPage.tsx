/**
 * MechanicsPage — shop owner's mechanic team management.
 * Three sources of mechanics feed into one list:
 *   1. Invited by email (OTP flow) — shows up under "Pending Invites" until accepted.
 *   2. Self-registered with the shop's join code — shows up under "Pending Approval".
 *   3. Active mechanics — either of the above once verified/approved.
 */
import { useState, useEffect, useContext, useCallback } from "react";
import { T, FONT } from "../theme";
import { Btn, Skeleton } from "../components/ui";
import { AppCtx } from "../AppCtx";
import {
  getMechanics, getMechanicInvites, getMechanicJoinCode, rotateMechanicJoinCode,
  inviteMechanic, resendMechanicInvite, cancelMechanicInvite,
  approveMechanic, rejectMechanic, updateMechanicRole, deactivateMechanic, reactivateMechanic,
  type ShopMechanic, type MechanicInvite,
} from "../api/mechanics";

const ROLE_COLOR = { HEAD: "#D97706", MEMBER: "#0EA5E9" } as Record<string, string>;

export function MechanicsPage() {
  const { toast } = useContext(AppCtx);
  const [mechanics, setMechanics] = useState<ShopMechanic[]>([]);
  const [invites, setInvites] = useState<MechanicInvite[]>([]);
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
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, i, j] = await Promise.all([getMechanics(), getMechanicInvites(), getMechanicJoinCode()]);
      setMechanics(m.data || []);
      setInvites(i.data || []);
      setJoinCode(j.data?.joinCode || "");
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
      await inviteMechanic({ email: inviteEmail.trim(), mechanicRole: inviteRole });
      toast?.(`Invite sent to ${inviteEmail.trim()}`, "success");
      setInviteEmail(""); setInviteRole("MEMBER"); setShowInviteForm(false);
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

  const handleApprove = (id: number, role: "HEAD" | "MEMBER") => runPending(`approve-${id}`, async () => {
    try { await approveMechanic(id, role); toast?.("Mechanic approved", "success"); load(); }
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
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                <Row key={m.id}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: T.t1, fontSize: 14 }}>{m.name || m.email}</div>
                    <div style={{ fontSize: 12, color: T.t3 }}>{m.email} · {m.phone}</div>
                  </div>
                  <Btn size="sm" onClick={() => handleApprove(m.id, "MEMBER")} disabled={isPending(`approve-${m.id}`)}>Approve</Btn>
                  <Btn variant="danger" size="sm" onClick={() => handleReject(m.id)} disabled={isPending(`reject-${m.id}`)}>Reject</Btn>
                </Row>
              ))}
            </Section>
          )}

          {/* Active mechanics */}
          <Section title={`Team (${active.length})`}>
            {active.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: T.t3, fontSize: 13 }}>No active mechanics yet.</div>
            ) : active.map(m => (
              <Row key={m.id}>
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
              </Row>
            ))}
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
