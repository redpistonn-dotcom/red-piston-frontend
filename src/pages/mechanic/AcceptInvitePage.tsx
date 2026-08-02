/**
 * /mechanic/accept-invite — mechanic OTP verification page
 * Same UX flow as staff accept-invite but posts to /api/mechanic-auth/accept
 */
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { useStore } from "../../store";
import { T, FONT } from "../../theme";

type Step = "otp" | "name";

export default function MechanicAcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setCurrentUser, setTokens } = useStore();

  const emailFromUrl = params.get("email") || "";
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>("otp");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    if (!email || !code || code.length !== 6) {
      setError("Enter your email and the 6-digit code"); return;
    }
    setLoading(true); setError("");
    try {
      const r = await api.post("/mechanic-auth/accept", { email, code, name, phone });
      setTokens(r.accessToken, r.refreshToken);
      setCurrentUser(r.user);
      navigate("/mechanic");
    } catch (e: any) {
      const msg = e?.error?.message || e?.message || "Verification failed";
      if (e?.error?.code === "MISSING_NAME" || e?.error?.code === "MISSING_PHONE") {
        setStep("name");
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400, background: T.surface, borderRadius: 16, padding: 28, border: `1px solid ${T.border}` }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 800 }}>
            <span style={{ color: T.amber }}>RED</span><span style={{ color: T.t1 }}>PISTON</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.t1, marginTop: 8 }}>Mechanic Invite</div>
          <div style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>Enter the 6-digit code sent to your email</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={!!emailFromUrl}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="6-digit code"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            style={{ ...inputStyle, letterSpacing: 8, fontFamily: FONT.mono, fontSize: 20, textAlign: "center" }}
          />

          {step === "name" && (
            <>
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
            </>
          )}

          {error && <p style={{ fontSize: 13, color: T.crimson, margin: 0 }}>{error}</p>}

          <button
            onClick={verify}
            disabled={loading}
            style={{
              padding: "13px", background: loading ? T.t4 : T.amber, color: "#fff",
              border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT.ui,
            }}
          >
            {loading ? "Verifying…" : "Join as Mechanic"}
          </button>
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
