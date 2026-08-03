/**
 * /mechanic/join — mechanic self-signup with a shop's join code
 * Posts to /api/mechanic-auth/register. Unlike accept-invite, this doesn't
 * log the user in — it lands PENDING until the shop owner approves, at which
 * point a welcome + set-password-link email goes out (see shop-admin.js
 * PATCH /:id/approve).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import { T, FONT } from "../../theme";

export default function MechanicJoinPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedTo, setSubmittedTo] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) { setError("Your name is required"); return; }
    if (!phone.trim()) { setError("Your mobile number is required"); return; }
    if (!email.trim()) { setError("Your email is required"); return; }
    if (!joinCode.trim()) { setError("Shop join code is required"); return; }
    setLoading(true); setError("");
    try {
      const r = await api.post("/mechanic-auth/register", {
        name: name.trim(), phone: phone.trim(), email: email.trim(), joinCode: joinCode.trim(),
      });
      setSubmittedTo(r.message || "Registration submitted. You will receive an email once approved.");
    } catch (e: any) {
      setError(e?.data?.error?.message || e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (submittedTo) {
    return (
      <div style={{ minHeight: "100dvh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ width: "100%", maxWidth: 400, background: T.surface, borderRadius: 16, padding: 28, border: `1px solid ${T.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.t1, marginBottom: 8 }}>Request submitted</div>
          <div style={{ fontSize: 13, color: T.t3, lineHeight: 1.6, marginBottom: 20 }}>{submittedTo}</div>
          <Link to="/login" style={{ fontSize: 13, fontWeight: 700, color: T.amber, textDecoration: "none" }}>Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400, background: T.surface, borderRadius: 16, padding: 28, border: `1px solid ${T.border}` }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 800 }}>
            <span style={{ color: T.amber }}>RED</span><span style={{ color: T.t1 }}>PISTON</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.t1, marginTop: 8 }}>Join as a Mechanic</div>
          <div style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>Enter the join code your shop gave you</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="tel"
            placeholder="Mobile number"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Shop join code"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            style={{ ...inputStyle, letterSpacing: 4, fontFamily: FONT.mono, fontSize: 18, textAlign: "center" }}
          />

          {error && <p style={{ fontSize: 13, color: T.crimson, margin: 0 }}>{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            style={{
              padding: "13px", background: loading ? T.t4 : T.amber, color: "#fff",
              border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT.ui,
            }}
          >
            {loading ? "Submitting…" : "Request to Join"}
          </button>

          <div style={{ textAlign: "center", marginTop: 4 }}>
            <Link to="/login" style={{ fontSize: 12, color: T.t3, textDecoration: "none" }}>Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${T.border}`,
  fontFamily: FONT.ui, fontSize: 14, color: T.t1, outline: "none",
  background: T.surfaceContainerLowest, width: "100%", boxSizing: "border-box",
};
