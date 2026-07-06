import { useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { setTokens } from "../api/client.js";
import { acceptStaffInvite } from "../api/staff";
import { T, FONT } from "../theme.js";
import { AppCtx } from "../AppCtx.js";

const S = {
  page: { display: "flex", minHeight: "100vh", background: T.bg, fontFamily: FONT.ui, alignItems: "center", justifyContent: "center" },
  card: {
    width: "100%", maxWidth: 420, padding: "48px 40px", background: T.surface,
    borderRadius: 20, border: `1px solid ${T.border}`, boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
  },
  logo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 32 },
  logoMark: { width: 40, height: 40, borderRadius: 10, background: T.amber, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },
  logoText: { fontSize: 20, fontWeight: 800, color: T.t1, letterSpacing: "-0.5px" },
  heading: { fontSize: 22, fontWeight: 800, color: T.t1, marginBottom: 6 },
  sub: { fontSize: 14, color: T.t2, marginBottom: 28, lineHeight: 1.5 },
  label: { fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 6, display: "block" },
  input: {
    width: "100%", background: T.bg, border: `1.5px solid ${T.border}`,
    borderRadius: 10, padding: "12px 14px", color: T.t1, fontSize: 15,
    outline: "none", boxSizing: "border-box" as const, fontFamily: FONT.ui, marginBottom: 14,
  },
  codeInput: {
    width: "100%", background: T.bg, border: `1.5px solid ${T.border}`,
    borderRadius: 10, padding: "14px", color: T.t1, fontSize: 26, fontWeight: 800,
    letterSpacing: "0.4em", textAlign: "center" as const, outline: "none",
    boxSizing: "border-box" as const, fontFamily: FONT.mono, marginBottom: 14,
  },
  btn: (disabled: boolean) => ({
    width: "100%", padding: "14px", background: disabled ? T.amberDim : T.amber,
    color: disabled ? "#aaa" : "#000", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer", marginBottom: 14,
    fontFamily: FONT.ui,
  }),
  error: {
    background: "#1c0909", border: `1.5px solid ${T.crimson}`, borderRadius: 10,
    padding: "11px 14px", color: T.crimson, fontSize: 13, marginBottom: 14,
  },
  success: {
    background: "#091c0f", border: `1.5px solid ${T.emerald}`, borderRadius: 10,
    padding: "16px", textAlign: "center" as const, marginBottom: 14,
  },
  link: { background: "none", border: "none", color: T.amber, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT.ui },
};

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ctx = useContext(AppCtx);

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const phoneDigits = phone.replace(/\D/g, "").slice(-10);
  const canSubmit = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && /^\d{6}$/.test(code)
    && name.trim().length > 0 && /^[6-9]\d{9}$/.test(phoneDigits);

  const handleVerify = async () => {
    if (!canSubmit) return;
    setError(""); setLoading(true);
    try {
      const data: any = await acceptStaffInvite({
        email: email.trim().toLowerCase(), code, name: name.trim(), phone: phoneDigits,
      });
      setTokens(data.accessToken, data.refreshToken);
      setSuccess(true);
      // Brief pause so the success state is visible before the shell takes over.
      setTimeout(() => ctx?.handleLogin?.(data.user), 900);
    } catch (e: any) {
      const errCode = e?.data?.error?.code;
      let msg = e?.data?.error?.message || e?.message || "Could not verify — please try again.";
      if (errCode === "INVITE_NOT_FOUND") msg = "No pending invite found for this email. Ask the shop owner to invite you again.";
      if (errCode === "INVALID_OTP") msg = "That code is incorrect or has expired. Check your email for the latest one.";
      if (errCode === "MISSING_NAME") msg = "Please enter your name.";
      if (errCode === "MISSING_PHONE") msg = "Please enter a valid 10-digit mobile number.";
      if (errCode === "PHONE_IN_USE") msg = "That mobile number is already linked to another account.";
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.logoMark}>⚙️</div>
          <span style={S.logoText}>RedPiston</span>
        </div>

        {success ? (
          <div style={S.success}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.emerald, marginBottom: 6 }}>You're in!</div>
            <div style={{ fontSize: 13, color: T.t2, lineHeight: 1.5 }}>Taking you to your dashboard…</div>
          </div>
        ) : (
          <>
            <div style={S.heading}>Join your shop on RedPiston</div>
            <div style={S.sub}>Enter the email your invite was sent to, the 6-digit code from that email, and your own details.</div>

            {error && <div style={S.error}>{error}</div>}

            <label style={S.label}>Email</label>
            <input
              style={S.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus={!searchParams.get("email")}
            />

            <label style={S.label}>Verification code</label>
            <input
              style={S.codeInput}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="······"
              autoFocus={!!searchParams.get("email")}
            />

            <label style={S.label}>Your full name</label>
            <input
              style={S.input}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
            />

            <label style={S.label}>Your mobile number</label>
            <input
              style={S.input}
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              maxLength={10}
            />

            <button style={S.btn(!canSubmit || loading)} onClick={handleVerify} disabled={!canSubmit || loading}>
              {loading ? "Verifying…" : "Verify & Continue"}
            </button>

            <button style={S.link} onClick={() => navigate("/login")}>← Back to login</button>
          </>
        )}
      </div>
    </div>
  );
}
