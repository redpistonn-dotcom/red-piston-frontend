import { useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { setTokens, api } from "../api/client.js";
import { acceptStaffInvite } from "../api/staff";
import { T, FONT } from "../theme.js";
import { AppCtx } from "../AppCtx.js";
import { BrandHeader } from "../components/BrandHeader";

const S = {
  page: { display: "flex", minHeight: "100vh", background: T.bg, fontFamily: FONT.ui, alignItems: "center", justifyContent: "center" },
  card: {
    width: "100%", maxWidth: 420, padding: "48px 40px", background: T.surface,
    borderRadius: 20, border: `1px solid ${T.border}`, boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
  },
  logo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 32 },
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
  fieldError: { fontSize: 12, color: T.crimson, fontWeight: 600, marginTop: -8, marginBottom: 14 },
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
  const [fieldErrors, setFieldErrors] = useState({ email: false, code: false, name: false, phone: false });

  // Shown right after OTP verification succeeds, before handing off to the
  // dashboard — lets them set a password in the same flow (Google sign-in
  // already works with this email regardless; this is the other option).
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const finishLogin = (user: any) => {
    setSuccess(true);
    setTimeout(() => ctx?.handleLogin?.(user), 900);
  };

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match"); return; }
    setPwError(""); setPwLoading(true);
    try {
      await api.post("/api/auth/set-password", { email: email.trim().toLowerCase(), newPassword });
      finishLogin(verifiedUser);
    } catch (e: any) {
      setPwError(e?.data?.error?.message || e?.message || "Could not set password — please try again.");
    }
    setPwLoading(false);
  };

  const phoneDigits = phone.replace(/\D/g, "").slice(-10);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = /^\d{6}$/.test(code);
  const nameValid = name.trim().length > 0;
  const phoneValid = /^[6-9]\d{9}$/.test(phoneDigits);
  const canSubmit = emailValid && codeValid && nameValid && phoneValid;

  const handleVerify = async () => {
    if (!canSubmit) {
      setFieldErrors({ email: !emailValid, code: !codeValid, name: !nameValid, phone: !phoneValid });
      setError("Please fix the highlighted fields below.");
      return;
    }
    setFieldErrors({ email: false, code: false, name: false, phone: false });
    setError(""); setLoading(true);
    try {
      const data: any = await acceptStaffInvite({
        email: email.trim().toLowerCase(), code, name: name.trim(), phone: phoneDigits,
      });
      setTokens(data.accessToken, data.refreshToken);
      setVerifiedUser(data.user);
      setShowSetPassword(true);
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
          <BrandHeader subtitle="Join Your Shop" logoSize={40} />
        </div>

        {success ? (
          <div style={S.success}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.emerald, marginBottom: 6 }}>You're in!</div>
            <div style={{ fontSize: 13, color: T.t2, lineHeight: 1.5 }}>Taking you to your dashboard…</div>
          </div>
        ) : showSetPassword ? (
          <>
            <div style={S.heading}>Set your password</div>
            <div style={S.sub}>
              You're verified — set a password for <strong>{email.trim()}</strong> to finish setting up your account. You'll still be able to sign in with Google too.
            </div>

            {pwError && <div style={S.error}>{pwError}</div>}

            <label style={S.label}>New password</label>
            <input
              style={S.input}
              type="password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPwError(""); }}
              placeholder="Min. 8 characters"
              autoFocus
            />

            <label style={S.label}>Confirm password</label>
            <input
              style={S.input}
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setPwError(""); }}
              placeholder="Re-enter your password"
              onKeyDown={e => e.key === "Enter" && handleSetPassword()}
            />

            <button style={S.btn(pwLoading)} onClick={handleSetPassword} disabled={pwLoading}>
              {pwLoading ? "Saving…" : "Set Password & Continue"}
            </button>
          </>
        ) : (
          <>
            <div style={S.heading}>Join your shop on RedPiston</div>
            <div style={S.sub}>Enter the email your invite was sent to, the 6-digit code from that email, and your own details.</div>

            {error && <div style={S.error}>{error}</div>}

            <label style={S.label}>Email</label>
            <input
              style={{ ...S.input, border: fieldErrors.email ? `1.5px solid ${T.crimson}` : S.input.border, boxShadow: fieldErrors.email ? `0 0 0 3px ${T.crimson}22` : "none" }}
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: false })); }}
              placeholder="you@example.com"
              autoFocus={!searchParams.get("email")}
            />
            {fieldErrors.email && <div style={S.fieldError}>↑ {email.trim() ? "Enter a valid email address" : "Email is required"}</div>}

            <label style={S.label}>Verification code</label>
            <input
              style={{ ...S.codeInput, border: fieldErrors.code ? `1.5px solid ${T.crimson}` : S.codeInput.border, boxShadow: fieldErrors.code ? `0 0 0 3px ${T.crimson}22` : "none" }}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setFieldErrors(p => ({ ...p, code: false })); }}
              placeholder="······"
              autoFocus={!!searchParams.get("email")}
            />
            {fieldErrors.code && <div style={S.fieldError}>↑ Enter the 6-digit code from your email</div>}

            <label style={S.label}>Your full name</label>
            <input
              style={{ ...S.input, border: fieldErrors.name ? `1.5px solid ${T.crimson}` : S.input.border, boxShadow: fieldErrors.name ? `0 0 0 3px ${T.crimson}22` : "none" }}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: false })); }}
              placeholder="Full name"
            />
            {fieldErrors.name && <div style={S.fieldError}>↑ Your name is required</div>}

            <label style={S.label}>Your mobile number</label>
            <input
              style={{ ...S.input, border: fieldErrors.phone ? `1.5px solid ${T.crimson}` : S.input.border, boxShadow: fieldErrors.phone ? `0 0 0 3px ${T.crimson}22` : "none" }}
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={e => { setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10)); setFieldErrors(p => ({ ...p, phone: false })); }}
              placeholder="10-digit mobile number"
              maxLength={10}
            />
            {fieldErrors.phone && <div style={S.fieldError}>↑ Enter a valid 10-digit mobile number</div>}

            <button style={S.btn(loading)} onClick={handleVerify} disabled={loading}>
              {loading ? "Verifying…" : "Verify & Continue"}
            </button>

            <button style={S.link} onClick={() => navigate("/login")}>← Back to login</button>
          </>
        )}
      </div>
    </div>
  );
}
