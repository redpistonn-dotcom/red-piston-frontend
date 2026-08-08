import { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client.js";
import { T, FONT } from "../../theme";

interface Member {
  id: number;
  member_user_id: number | null;
  name: string;
  email: string;
  phone: string;
  member_phone: string;
  is_registered: boolean;
  joined_at: string;
}

function MSIcon({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }}>{name}</span>;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/mechanic/team")
      .then((r: any) => setMembers(r.data || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addMember() {
    if (!memberName.trim() || !memberPhone.trim()) return;
    setAdding(true);
    setError("");
    setSuccess("");
    try {
      const r = await api.post("/api/mechanic/team", { name: memberName.trim(), phone: memberPhone.trim() }) as any;
      const label = r.data.is_registered ? `${r.data.name} added (registered user)` : `${r.data.name} added as contact`;
      setSuccess(label);
      setMemberName("");
      setMemberPhone("");
      setShowAdd(false);
      load();
    } catch (e: any) {
      setError(e?.error?.message || "Failed to add member");
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(teamId: number, name: string) {
    if (!confirm(`Remove ${name} from your team?`)) return;
    setRemoving(teamId);
    try {
      await api.delete(`/api/mechanic/team/${teamId}`);
      load();
    } catch {
      setError("Failed to remove member");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="page-in rp-page-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.t1, lineHeight: 1.2 }}>My Team</h1>
          <p style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>{members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(""); setSuccess(""); }}
          style={{
            padding: "9px 16px", background: T.amber, color: "#fff",
            border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: FONT.ui,
          }}
        >
          <MSIcon name="person_add" size={16} /> Add
        </button>
      </div>

      {/* Add member panel */}
      {showAdd && (
        <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>Add Team Member</div>
          <p style={{ fontSize: 12, color: T.t3, margin: 0 }}>Enter their name and mobile number. If they have a RedPiston account they'll be linked automatically.</p>

          <input
            type="text"
            value={memberName}
            onChange={e => setMemberName(e.target.value)}
            placeholder="Full name"
            autoFocus
            style={{
              padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`,
              fontFamily: FONT.ui, fontSize: 14, color: T.t1, outline: "none",
              background: T.surfaceContainerLowest,
            }}
          />

          <input
            type="tel"
            value={memberPhone}
            onChange={e => setMemberPhone(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addMember()}
            placeholder="Mobile number (10 digits)"
            style={{
              padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`,
              fontFamily: FONT.ui, fontSize: 14, color: T.t1, outline: "none",
              background: T.surfaceContainerLowest,
            }}
          />

          {error && <div style={{ fontSize: 12, color: T.crimson }}>{error}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={addMember}
              disabled={adding || !memberName.trim() || !memberPhone.trim()}
              style={{
                flex: 1, padding: "10px", background: T.amber, color: "#fff",
                border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer",
                opacity: adding || !memberName.trim() || !memberPhone.trim() ? 0.5 : 1, fontFamily: FONT.ui,
              }}
            >
              {adding ? "Adding…" : "Add Member"}
            </button>
            <button
              onClick={() => { setShowAdd(false); setError(""); setMemberName(""); setMemberPhone(""); }}
              style={{
                padding: "10px 16px", background: "transparent", border: `1px solid ${T.border}`,
                borderRadius: 8, cursor: "pointer", color: T.t2, fontFamily: FONT.ui,
              }}
            >Cancel</button>
          </div>
        </div>
      )}

      {success && (
        <div style={{ background: "#D1FAE5", border: `1px solid ${T.emerald}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.emerald }}>
          {success}
        </div>
      )}

      {/* Members list */}
      {loading ? (
        <p style={{ color: T.t3, fontSize: 14 }}>Loading…</p>
      ) : members.length === 0 && !showAdd ? (
        <div style={{ textAlign: "center", padding: "48px 16px" }}>
          <MSIcon name="group" size={48} />
          <p style={{ color: T.t3, marginTop: 12, fontSize: 14 }}>No team members yet</p>
          <p style={{ color: T.t3, fontSize: 12, marginTop: 4 }}>Add mechanics by phone or email to assign jobs to them</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          {members.map((m, i) => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
              borderBottom: i < members.length - 1 ? `1px solid ${T.border}` : "none",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: T.amberGlow, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: T.amber, flexShrink: 0,
              }}>
                {m.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>{m.name}</span>
                  {m.is_registered && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: "#D1FAE5", color: "#059669" }}>REGISTERED</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
                  {m.phone || m.member_phone}
                </div>
              </div>
              <button
                onClick={() => removeMember(m.id, m.name)}
                disabled={removing === m.id}
                style={{
                  background: "none", border: "none", cursor: "pointer", color: T.crimson,
                  opacity: removing === m.id ? 0.4 : 1, padding: 4, flexShrink: 0,
                }}
              >
                <MSIcon name="person_remove" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
