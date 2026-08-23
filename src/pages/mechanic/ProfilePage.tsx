import { useEffect, useState } from "react";
import { api } from "../../api/client.js";
import { T, FONT } from "../../theme";

function MSIcon({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }}>{name}</span>;
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div style={{
      background: T.surface, borderRadius: 12, padding: "14px 16px",
      border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.t3 }}>
        <MSIcon name={icon} size={16} />
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: T.t1, fontFamily: FONT.mono }}>{value}</div>
    </div>
  );
}

const SKILL_OPTIONS = ["Electrical", "Body Work", "Engine", "AC/HVAC", "Tyres", "Suspension", "Brakes", "Transmission", "Painting", "Diagnosis"];

export default function MechanicProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [skillInput, setSkillInput] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  function loadSessions() {
    api.get("/api/auth/sessions")
      .then((r: any) => setSessions(r.data || []))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }

  useEffect(() => {
    api.get("/api/mechanic/profile")
      .then((r: any) => {
        setProfile(r.data);
        setSkillInput(r.data?.skills || []);
      })
      .catch(() => setError("Could not load profile"))
      .finally(() => setLoading(false));
    loadSessions();
  }, []);

  async function revokeSession(id: number) {
    setRevokingId(id);
    try {
      await api.delete(`/api/auth/sessions/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch {
      alert("Could not log out that device — try again.");
    } finally {
      setRevokingId(null);
    }
  }

  if (loading) return <p style={{ padding: 24, color: T.t3, fontFamily: FONT.ui }}>Loading…</p>;
  if (error) return <p style={{ padding: 24, color: T.crimson, fontFamily: FONT.ui }}>{error}</p>;
  if (!profile) return null;

  const toggleSkill = (s: string) => {
    setSkillInput(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  async function saveSkills() {
    setSaving(true);
    try {
      await api.patch("/api/mechanic/profile/skills", { skills: skillInput });
      setProfile((p: any) => ({ ...p, skills: skillInput }));
      setEditing(false);
    } catch (e: any) {
      alert(e?.error?.message || "Failed to save skills");
    } finally {
      setSaving(false);
    }
  }

  const roleColor = profile.mechanic_role === "HEAD" ? T.amber : T.emerald;

  return (
    <div style={{ paddingBottom: 32, fontFamily: FONT.ui }}>
      {/* Header card */}
      <div style={{ margin: "16px 16px 0", background: T.surface, borderRadius: 16, padding: 20, border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: T.amberGlow, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: T.amber,
          }}>
            {(profile.name || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.t1 }}>{profile.name}</div>
            <div style={{ fontSize: 13, color: T.t3 }}>{profile.email}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                background: roleColor + "22", color: roleColor,
              }}>
                {profile.mechanic_role} MECHANIC
              </span>
              {profile.avg_rating != null && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                  background: "#FEF3C7", color: "#B45309",
                }}>
                  <MSIcon name="star" size={12} /> {profile.avg_rating} ({profile.rating_count})
                </span>
              )}
            </div>
          </div>
        </div>

        {profile.designation && (
          <div style={{ fontSize: 13, color: T.t2, marginBottom: 6 }}>{profile.designation}</div>
        )}
        {profile.employee_id && (
          <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.mono }}>ID: {profile.employee_id}</div>
        )}
        {profile.joined_at && (
          <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>
            Joined {new Date(profile.joined_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ margin: "16px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatCard label="Completed" value={Number(profile.jobs_completed ?? 0)} icon="check_circle" />
        <StatCard label="Active Jobs" value={Number(profile.jobs_active ?? 0)} icon="build_circle" />
      </div>

      {/* Skills */}
      <div style={{ margin: "16px 16px 0", background: T.surface, borderRadius: 12, padding: 14, border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: 1 }}>Skills</div>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: T.amber, fontSize: 12, fontWeight: 700, fontFamily: FONT.ui,
            }}>
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {SKILL_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSkill(s)}
                  style={{
                    padding: "6px 12px", borderRadius: 20, border: `1.5px solid`,
                    borderColor: skillInput.includes(s) ? T.amber : T.border,
                    background: skillInput.includes(s) ? T.amberGlow : "transparent",
                    color: skillInput.includes(s) ? T.amber : T.t2,
                    fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: FONT.ui,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveSkills}
                disabled={saving}
                style={{
                  flex: 1, padding: "10px", background: T.amber, color: "#fff",
                  border: "none", borderRadius: 8, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1, fontFamily: FONT.ui,
                }}
              >
                {saving ? "Saving…" : "Save Skills"}
              </button>
              <button
                onClick={() => { setEditing(false); setSkillInput(profile.skills || []); }}
                style={{
                  padding: "10px 16px", background: "transparent", border: `1px solid ${T.border}`,
                  borderRadius: 8, cursor: "pointer", color: T.t2, fontFamily: FONT.ui,
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(profile.skills?.length ? profile.skills : []).map((s: string) => (
              <span key={s} style={{
                padding: "4px 10px", borderRadius: 20, background: T.amberGlow,
                color: T.amber, fontSize: 12, fontWeight: 600,
              }}>{s}</span>
            ))}
            {!profile.skills?.length && (
              <span style={{ fontSize: 13, color: T.t3 }}>No skills added yet — tap Edit to add.</span>
            )}
          </div>
        )}
      </div>

      {/* Active sessions — see and revoke other logged-in devices */}
      <div style={{ margin: "16px 16px 0", background: T.surface, borderRadius: 12, padding: 14, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          Active Sessions
        </div>

        {sessionsLoading ? (
          <div style={{ fontSize: 13, color: T.t3 }}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div style={{ fontSize: 13, color: T.t3 }}>No other active sessions.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sessions.map((s: any) => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 8, border: `1px solid ${T.border}`,
                background: s.isCurrent ? T.amberGlow : "transparent",
              }}>
                <MSIcon name={s.deviceInfo?.platform === "mobile" ? "smartphone" : "computer"} size={18} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>
                    {s.deviceInfo?.browser || "Unknown"} · {s.deviceInfo?.platform || "unknown"}
                    {s.isCurrent && (
                      <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: T.amber }}>THIS DEVICE</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: T.t3 }}>
                    {s.ipAddress ? `${s.ipAddress} · ` : ""}
                    Last active {s.lastUsedAt ? new Date(s.lastUsedAt).toLocaleString("en-IN") : "—"}
                  </div>
                </div>
                {!s.isCurrent && (
                  <button
                    onClick={() => revokeSession(s.id)}
                    disabled={revokingId === s.id}
                    style={{
                      padding: "6px 12px", background: "transparent", border: `1px solid ${T.crimson}55`,
                      borderRadius: 8, cursor: "pointer", color: T.crimson, fontSize: 12, fontWeight: 700,
                      fontFamily: FONT.ui, opacity: revokingId === s.id ? 0.5 : 1, flexShrink: 0,
                    }}
                  >
                    {revokingId === s.id ? "…" : "Log out"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
