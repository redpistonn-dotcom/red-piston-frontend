import { useState, useRef } from "react";
import { sendPhoneOtp, verifyPhoneOtp, signInWithGoogle } from "../firebase.js";
import { api, setTokens } from "../api/client.js";
import { T, FONT } from "../theme.js";

/**
 * AUTH FLOW — two clearly separated paths:
 *
 * SIGN IN (existing users)
 *   → Phone OTP  → verify → login
 *   → Email + Password → login
 *   → Google → login
 *   → If shop owner PENDING/REJECTED → show status screen
 *
 * CREATE ACCOUNT (new users)
 *   → Pick role (Shop Owner / Customer)
 *   → Phone OTP or Email or Google
 *   → Shop Owner: Shop Details form → PENDING screen
 *   → Customer: Name → Marketplace
 */

const STEPS = {
  LANDING:      "landing",      // Sign In / Create Account choice
  SIGNIN:       "signin",       // Sign-in form (phone/email/google)
  SIGNIN_OTP:   "signin_otp",   // OTP boxes for sign-in
  REG_ROLE:     "reg_role",     // Role selection for new users
  REG_AUTH:     "reg_auth",     // Auth method for new users
  REG_OTP:      "reg_otp",      // OTP boxes for registration
  SHOP_DETAILS: "shop_details", // Shop info form (new shop owners)
  PROFILE:      "profile",      // Name setup (new customers)
  PENDING:      "pending",      // Shop owner awaiting approval
  REJECTED:     "rejected",     // Shop owner rejected
  ADMIN_AUTH:   "admin_auth",   // Admin email+password login
};

// ─── Error message helper ─────────────────────────────────────────────────────
function getErr(e, fallback = "Something went wrong. Please try again.") {
  if (e?.data?.error?.message) return e.data.error.message;
  if (typeof e?.data?.error === "string") return e.data.error;
  if (e?.data?.message) return e.data.message;
  if (e?.message && e.message !== "Request failed") return e.message;
  return fallback;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  .auth-card { animation: fadeUp 0.28s cubic-bezier(0.16,1,0.3,1); }
  .auth-input:focus { border-color: #FF1F3A !important; box-shadow: 0 0 0 2px rgba(255,31,58,0.15) !important; outline: none !important; }
  .admin-input:focus { border-color: #7C3AED !important; box-shadow: 0 0 0 2px rgba(124,58,237,0.2) !important; }
  .otp-box:focus { border-color: #FF1F3A !important; box-shadow: 0 0 0 2px rgba(255,31,58,0.15); outline: none !important; }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 0 24px rgba(255,31,58,0.35); }
  .btn-primary:active:not(:disabled) { transform: translateY(0); }
  .btn-google:hover { background: #f0f0f0 !important; }
  .role-card:hover { border-color: rgba(255,31,58,0.5) !important; background: rgba(255,31,58,0.06) !important; }
  .role-card.selected { border-color: #FF1F3A !important; background: rgba(255,31,58,0.08) !important; box-shadow: 0 0 0 2px rgba(255,31,58,0.15) !important; }
  .tab-btn { transition: all 0.18s; }
  .tab-btn.active { background: rgba(255,31,58,0.1) !important; color: #FF1F3A !important; border-bottom: 2px solid #FF1F3A !important; }
  .stitch-tab-active { background: #33343c !important; color: #e3e1ec !important; border: 1px solid rgba(255,255,255,0.06) !important; }
  .stitch-tab-inactive { background: transparent !important; color: #c9c6c5 !important; border: 1px solid transparent !important; }
  .stitch-tab-inactive:hover { color: #e3e1ec !important; }
  .btn-outline-stitch:hover { background: #292931 !important; }
  /* Left panel: hide on small screens */
  @media (max-width: 900px) {
    .auth-hero-left { display: none !important; }
    .auth-form-right { width: 100% !important; }
  }
  @media (max-width: 540px) {
    .auth-form-right { padding: 32px 20px 40px !important; }
    .otp-box { width: 38px !important; height: 46px !important; font-size: 18px !important; }
  }
  @media (max-width: 380px) {
    .auth-form-right { padding: 28px 16px 36px !important; }
    .otp-box { width: 34px !important; height: 42px !important; }
  }
`;

// ─── Shared style tokens (Stitch Apex Performance palette) ───────────────────
const S = {
  label:  { fontSize: 11, fontWeight: 700, color: "#af8785", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block", fontFamily: "'Inter', sans-serif" },
  input:  { width: "100%", background: "#1a1b22", border: "1px solid #3F3F46", borderRadius: 8, padding: "12px 14px", color: "#e3e1ec", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: FONT.mono, transition: "border 0.18s, box-shadow 0.18s" },
  phoneRow: { display: "flex", alignItems: "stretch", border: "1px solid #3F3F46", borderRadius: 8, overflow: "hidden", background: "#1a1b22" },
  phoneFlag: { padding: "12px 14px", background: "#0d0e15", color: "#c9c6c5", fontSize: 13, fontWeight: 500, borderRight: "1px solid #3F3F46", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontFamily: FONT.mono },
  phoneInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#e3e1ec", fontSize: 15, padding: "12px 14px", fontFamily: FONT.mono, letterSpacing: "0.08em" },
  btnPrimary: (disabled) => ({ width: "100%", padding: "14px", background: disabled ? "#3F3F46" : "#FF1F3A", color: disabled ? "#af8785" : "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.2s", boxShadow: disabled ? "none" : "0 0 20px rgba(255,31,58,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }),
  btnOutline: { width: "100%", padding: "13px", background: "transparent", border: "1px solid #3F3F46", borderRadius: 8, color: "#c9c6c5", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  btnGoogle: { width: "100%", padding: "13px", background: "#fff", border: "none", borderRadius: 8, color: "#313030", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" },
  btnBack: { background: "none", border: "none", color: "#af8785", cursor: "pointer", fontSize: 13, padding: "0 0 20px", display: "flex", alignItems: "center", gap: 5, fontFamily: "'Inter', sans-serif" },
  otpRow: { display: "flex", gap: 8, marginBottom: 20, justifyContent: "center" },
  otpBox: { width: 46, height: 54, textAlign: "center", fontSize: 22, fontWeight: 700, fontFamily: FONT.mono, background: "#1a1b22", border: "1px solid #3F3F46", borderRadius: 8, color: "#e3e1ec", outline: "none" },
  error: { background: "#1c0909", border: "1px solid #EF4444", borderRadius: 8, padding: "11px 14px", color: "#EF4444", fontSize: 13, marginBottom: 16, lineHeight: 1.5 },
  divider: { display: "flex", alignItems: "center", gap: 12, margin: "20px 0" },
  dividerLine: { flex: 1, height: 1, background: "#3F3F46" },
  dividerText: { color: "#af8785", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: FONT.mono },
  heading: { fontSize: 22, fontWeight: 600, color: "#e3e1ec", marginBottom: 6, letterSpacing: "-0.2px", fontFamily: "'Outfit', sans-serif" },
  sub: { fontSize: 14, color: "#af8785", marginBottom: 24, lineHeight: 1.55 },
  chip: { fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#ffb3b0", marginBottom: 8, fontFamily: FONT.mono },
  hint: { fontSize: 12, color: "#5e3f3d", lineHeight: 1.6, marginBottom: 16 },
};

// ─── Indian states for shop registration ─────────────────────────────────────
const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand",
  "West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

// ─── Left branding panel content ─────────────────────────────────────────────
const FEATURES = [
  { icon: "🧾", title: "GST billing in seconds", desc: "Multi-tender invoices with WhatsApp delivery" },
  { icon: "📦", title: "Live inventory & stock alerts", desc: "Immutable ledger — every movement tracked" },
  { icon: "🤝", title: "Udhaar / credit tracking", desc: "Digital khata — automated reminders" },
  { icon: "🔍", title: "Fitment-guaranteed search", desc: "Parts guaranteed to fit your exact vehicle" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginPage({ onLogin }) {
  const [step, setStep]           = useState(STEPS.LANDING);
  const [role, setRole]           = useState("");         // "shop" | "customer" | "admin"
  const [authTab, setAuthTab]     = useState("phone");    // "phone" | "email"
  const [phone, setPhone]         = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [otp, setOtp]             = useState(["","","","","",""]);
  const [confirmResult, setConfirmResult] = useState(null);
  const [resendTimer, setResendTimer]     = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [shopDetails, setShopDetails] = useState({ ownerName: "", shopName: "", city: "Hyderabad", state: "Telangana", pincode: "", contactPhone: "", gstin: "" });
  const [profile, setProfile]     = useState({ name: "", profileType: "INDIVIDUAL" });
  const [pendingUserId, setPendingUserId] = useState(null);
  const [pendingUser, setPendingUser]     = useState(null); // for profile step
  const [rejectionMsg, setRejectionMsg]   = useState("");
  const [forgotEmail, setForgotEmail]     = useState("");
  const [forgotMode, setForgotMode]       = useState(false);
  const [forgotSent, setForgotSent]       = useState(false);
  const [landingTab, setLandingTab]       = useState("owner"); // "owner" | "customer"

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const startResendTimer = () => {
    setResendTimer(60);
    const iv = setInterval(() => setResendTimer(t => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; }), 1000);
  };

  const go = (s) => { setStep(s); setError(""); };
  const back = (s) => { setStep(s); setError(""); setOtp(["","","","","",""]); };

  // ── Send Firebase OTP ──────────────────────────────────────────────────────
  const sendOtp = async (nextStep) => {
    if (!phone || phone.length !== 10) { setError("Enter a valid 10-digit number"); return; }
    setError(""); setLoading(true);
    try {
      const result = await sendPhoneOtp(phone, "recaptcha-container");
      setConfirmResult(result);
      startResendTimer();
      go(nextStep);
    } catch (e) { setError(e.message || "Could not send OTP. Try again."); }
    setLoading(false);
  };

  // ── Verify OTP → call backend ──────────────────────────────────────────────
  const verifyAndAuth = async (mode) => {
    const code = otp.join("");
    if (code.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setError(""); setLoading(true);
    try {
      const { token } = await verifyPhoneOtp(confirmResult, code);
      await callBackendFirebase(token, mode);
    } catch (e) { setError(e.message || "Invalid OTP. Try again."); }
    setLoading(false);
  };

  // ── Google sign-in → call backend ─────────────────────────────────────────
  const googleAuth = async (mode) => {
    setError(""); setLoading(true);
    try {
      const { token } = await signInWithGoogle();
      await callBackendFirebase(token, mode);
    } catch (e) {
      if (e.message?.includes("popup-closed") || e.message?.includes("popup_closed")) {
        setError("Sign-in popup was closed. Try again.");
      } else if (e.message?.includes("network") || e.message?.includes("Failed to fetch")) {
        setError("Network error — check your connection and that the backend is running.");
      } else {
        setError(e.message || "Google sign-in failed. Try again.");
      }
    }
    setLoading(false);
  };

  // ── Core Firebase backend call ─────────────────────────────────────────────
  // mode = "signin" → never create user
  // mode = "register" → create user with `role`
  const callBackendFirebase = async (firebaseToken, mode) => {
    let data;
    try {
      data = await api.post("/api/auth/firebase", {
        firebaseToken,
        mode: mode === "signin" ? "signin" : undefined,
        role: mode === "register" ? role : undefined,
      });
    } catch (e) {
      const code = e.data?.error?.code;
      if (code === "NO_ACCOUNT") {
        setError("No account found with this phone / Google account. Please create one.");
        return;
      }
      throw new Error(e.data?.error?.message || e.message || "Authentication failed.");
    }

    handleAuthResponse(data);
  };

  // ── Handle backend response (shared across all auth methods) ──────────────
  const handleAuthResponse = (data) => {
    // New shop owner — collect shop details first
    if (data?.needsShopDetails) {
      setPendingUserId(data.userId);
      setShopDetails(d => ({ ...d, ownerName: data.userName || "", contactPhone: data.phone || phone || "" }));
      go(STEPS.SHOP_DETAILS);
      return;
    }
    // Existing PENDING shop owner trying to login
    if (data?.pending) { go(STEPS.PENDING); return; }

    const userData    = data?.data?.user || data?.user;
    const accessToken = data?.data?.accessToken || data?.accessToken;
    const refreshToken = data?.refreshToken;
    const isNewUser   = data?.data?.isNewUser ?? data?.isNewUser;

    if (!userData) throw new Error("Server returned an unexpected response.");

    setTokens(accessToken, refreshToken);

    if (isNewUser && userData.role !== "SHOP_OWNER") {
      // New customer — collect name
      setPendingUser(userData);
      if (userData.name) setProfile({ name: userData.name });
      go(STEPS.PROFILE);
    } else {
      // Existing user (or new shop owner already handled above)
      localStorage.setItem("as_user", JSON.stringify(userData));
      onLogin(userData);
    }
  };

  // ── Sign-in via email + password ───────────────────────────────────────────
  const emailSignIn = async () => {
    if (!email || !password) { setError("Enter both email and password"); return; }
    setError(""); setLoading(true);
    try {
      const data = await api.post("/api/auth/login", { email, password });
      const userData = data?.user;
      if (!userData) throw new Error("Server returned an unexpected response.");
      setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem("as_user", JSON.stringify(userData));
      onLogin(userData);
    } catch (e) {
      const code = e.data?.error?.code;
      if (code === "SHOP_OWNER_PENDING")  { go(STEPS.PENDING);  return; }
      if (code === "SHOP_OWNER_REJECTED") { setRejectionMsg(e.data?.error?.message || ""); go(STEPS.REJECTED); return; }
      setError(getErr(e, "Login failed. Check your credentials."));
    }
    setLoading(false);
  };

  // ── Register via email + password ──────────────────────────────────────────
  const emailRegister = async () => {
    if (!email) { setError("Enter your email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email"); return; }
    if (!password || password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPwd) { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);
    try {
      const data = await api.post("/api/auth/register", { email, password, role });
      if (data?.needsShopDetails) {
        setPendingUserId(data.userId);
        go(STEPS.SHOP_DETAILS);
        return;
      }
      const userData = data?.user;
      if (!userData) throw new Error("Server returned an unexpected response.");
      setTokens(data.accessToken, data.refreshToken);
      setPendingUser(userData);
      go(STEPS.PROFILE);
    } catch (e) { setError(getErr(e, "Registration failed. Try again.")); }
    setLoading(false);
  };

  // ── Submit shop details → POST /api/auth/shop-setup ───────────────────────
  const submitShopDetails = async () => {
    if (!shopDetails.ownerName.trim()) { setError("Enter your full name"); return; }
    if (!shopDetails.shopName.trim())  { setError("Enter your shop name"); return; }
    if (!shopDetails.city.trim())      { setError("Enter your city"); return; }
    if (!shopDetails.state)            { setError("Select your state"); return; }
    const pin = shopDetails.pincode.replace(/\D/g, "");
    if (pin && pin.length !== 6)       { setError("Enter a valid 6-digit pincode"); return; }
    const ph = shopDetails.contactPhone.replace(/\D/g, "");
    if (ph.length !== 10) { setError("Enter a valid 10-digit contact number"); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/api/auth/shop-setup", {
        userId:       pendingUserId,
        ownerName:    shopDetails.ownerName.trim(),
        shopName:     shopDetails.shopName.trim(),
        city:         shopDetails.city.trim(),
        state:        shopDetails.state,
        pincode:      pin || undefined,
        contactPhone: ph,
        gstin:        shopDetails.gstin.trim() || undefined,
      });
      go(STEPS.PENDING);
    } catch (e) { setError(getErr(e, "Could not submit shop details. Try again.")); }
    setLoading(false);
  };

  // ── Save customer profile name ─────────────────────────────────────────────
  const saveProfile = async () => {
    if (!profile.name.trim()) { setError("Enter your name"); return; }
    setError(""); setLoading(true);
    try {
      const res = await api.patch("/api/auth/me", { name: profile.name.trim(), profileType: profile.profileType });
      const user = { ...pendingUser, name: (res?.data || res)?.name || profile.name.trim() };
      localStorage.setItem("as_user", JSON.stringify(user));
      onLogin(user);
    } catch (e) { setError(getErr(e, "Could not save name. Try again.")); }
    setLoading(false);
  };

  // ── Admin email login ──────────────────────────────────────────────────────
  const adminSignIn = async () => {
    if (!email || !password) { setError("Enter both email and password"); return; }
    setError(""); setLoading(true);
    try {
      const data = await api.post("/api/auth/login", { email, password });
      const userData = data?.user;
      if (!userData) throw new Error("Unexpected response.");
      if (userData.role !== "PLATFORM_ADMIN" && userData.userType?.slug !== "PLATFORM_ADMIN") {
        setError("Access denied. This console is for platform admins only.");
        setLoading(false); return;
      }
      setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem("as_user", JSON.stringify(userData));
      onLogin(userData);
    } catch (e) { setError(getErr(e, "Login failed.")); }
    setLoading(false);
  };

  // ── Forgot password ────────────────────────────────────────────────────────
  const sendForgotPassword = async () => {
    if (!forgotEmail) { setError("Enter your email"); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch (e) { setError(getErr(e, "Could not send reset link.")); }
    setLoading(false);
  };

  // ── OTP box helpers ────────────────────────────────────────────────────────
  const handleOtpChange = (i, v) => {
    if (!/^\d*$/.test(v)) return;
    const n = [...otp]; n[i] = v.slice(-1); setOtp(n);
    if (v && i < 5) otpRefs[i + 1].current?.focus();
    if (!v && i > 0) otpRefs[i - 1].current?.focus();
  };
  const handleOtpKey = (i, e, onDone) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
    if (e.key === "Enter") onDone();
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {

      // ══════════════════════════════════════════════════════════════════════
      // LANDING — Stitch design: tab switcher + phone OTP form
      // ══════════════════════════════════════════════════════════════════════
      case STEPS.LANDING:
        return (
          <div className="auth-card">
            {/* Heading */}
            <div style={{ marginBottom: 28 }}>
              <div style={S.heading}>System Access</div>
              <div style={{ fontSize: 14, color: "#af8785", lineHeight: 1.5, marginTop: 4 }}>Initialize your session to manage operations.</div>
            </div>

            {/* Role tab switcher */}
            <div style={{ background: "#1a1b22", borderRadius: 8, border: "1px solid #3F3F46", padding: 4, display: "flex", marginBottom: 28, gap: 4 }}>
              <button
                className={landingTab === "owner" ? "stitch-tab-active" : "stitch-tab-inactive"}
                style={{ flex: 1, padding: "10px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.15s" }}
                onClick={() => setLandingTab("owner")}
              >SHOP OWNER / STAFF</button>
              <button
                className={landingTab === "customer" ? "stitch-tab-active" : "stitch-tab-inactive"}
                style={{ flex: 1, padding: "10px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.15s" }}
                onClick={() => setLandingTab("customer")}
              >CUSTOMER</button>
            </div>

            {/* Phone input */}
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>MOBILE NUMBER</label>
              <div style={S.phoneRow}>
                <div style={S.phoneFlag}>
                  <span style={{ fontSize: 16 }}>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  className="auth-input"
                  style={S.phoneInput}
                  placeholder="Enter 10 digit number"
                  value={phone}
                  maxLength={10}
                  inputMode="numeric"
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && phone.length === 10 && sendOtp(STEPS.SIGNIN_OTP)}
                  autoFocus
                />
              </div>
            </div>

            {error && <div style={{ ...S.error, marginBottom: 16 }}>{error}</div>}

            {/* GET OTP button */}
            <button
              className="btn-primary"
              style={{ ...S.btnPrimary(loading || phone.length !== 10), marginBottom: 20 }}
              disabled={loading || phone.length !== 10}
              onClick={() => sendOtp(STEPS.SIGNIN_OTP)}
            >
              {loading ? "Sending…" : <><span>GET OTP</span><span style={{ fontSize: 16 }}>→</span></>}
            </button>

            {/* OR divider */}
            <div style={S.divider}>
              <div style={S.dividerLine} />
              <span style={S.dividerText}>OR</span>
              <div style={S.dividerLine} />
            </div>

            {/* Login with password */}
            <button
              className="btn-outline-stitch"
              style={{ ...S.btnOutline, marginBottom: landingTab === "customer" ? 12 : 0 }}
              onClick={() => { setAuthTab("email"); go(STEPS.SIGNIN); }}
            >
              <span style={{ fontSize: 15 }}>🔑</span>
              LOGIN WITH PASSWORD
            </button>

            {/* Google — customer tab only */}
            {landingTab === "customer" && (
              <button className="btn-google" style={S.btnGoogle} onClick={() => googleAuth("signin")}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                CONTINUE WITH GOOGLE
              </button>
            )}

            {/* Admin access */}
            <div style={{ textAlign: "center", marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(63,63,70,0.4)" }}>
              <button
                style={{ background: "none", border: "none", color: "#5e3f3d", cursor: "pointer", fontSize: 11, fontFamily: FONT.mono, letterSpacing: "0.06em" }}
                onClick={() => { setEmail(""); setPassword(""); go(STEPS.ADMIN_AUTH); }}
              >
                🛡️ PLATFORM ADMIN ACCESS
              </button>
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // SIGN IN — existing users
      // ══════════════════════════════════════════════════════════════════════
      case STEPS.SIGNIN:
        return (
          <div className="auth-card">
            <button style={S.btnBack} onClick={() => back(STEPS.LANDING)}>← Back</button>
            <div style={S.chip}>Welcome back</div>
            <div style={S.heading}>Sign In</div>
            <div style={S.sub}>Access your shop dashboard or marketplace account.</div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
              {["phone", "email"].map(t => (
                <button
                  key={t}
                  className={`tab-btn ${authTab === t ? "active" : ""}`}
                  onClick={() => { setAuthTab(t); setError(""); setForgotMode(false); }}
                  style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: "2px solid transparent", color: authTab === t ? T.amber : T.t3, fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "capitalize", fontFamily: FONT.ui }}
                >
                  {t === "phone" ? "📱 Phone OTP" : "✉️ Email"}
                </button>
              ))}
            </div>

            {error && <div style={S.error}>{error}</div>}

            {/* Phone OTP tab */}
            {authTab === "phone" && (
              <>
                <label style={S.label}>Mobile Number</label>
                <div style={{ ...S.phoneRow, marginBottom: 8 }}>
                  <div style={S.phoneFlag}>IN +91</div>
                  <input
                    className="auth-input"
                    style={S.phoneInput}
                    placeholder="98765 43210"
                    value={phone}
                    maxLength={10}
                    inputMode="numeric"
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={e => e.key === "Enter" && sendOtp(STEPS.SIGNIN_OTP)}
                    autoFocus
                  />
                </div>
                <div style={{ ...S.hint, marginBottom: 18 }}>We'll send a 6-digit OTP via SMS.</div>
                <button
                  className="btn-primary"
                  style={{ ...S.btnPrimary(loading || phone.length !== 10), marginBottom: 16 }}
                  disabled={loading || phone.length !== 10}
                  onClick={() => sendOtp(STEPS.SIGNIN_OTP)}
                >
                  {loading ? "Sending…" : "Send OTP →"}
                </button>
                <div style={S.divider}><div style={S.dividerLine}/><span style={S.dividerText}>OR</span><div style={S.dividerLine}/></div>
                <button className="btn-google" style={S.btnGoogle} onClick={() => googleAuth("signin")}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Continue with Google
                </button>
              </>
            )}

            {/* Email tab */}
            {authTab === "email" && !forgotMode && (
              <>
                <label style={S.label}>Email Address</label>
                <input className="auth-input" style={{ ...S.input, marginBottom: 14 }} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />

                <label style={S.label}>Password</label>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <input className="auth-input" style={{ ...S.input, paddingRight: 44 }} type={showPwd ? "text" : "password"} placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && emailSignIn()} />
                  <button onClick={() => setShowPwd(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 16 }}>{showPwd ? "🙈" : "👁"}</button>
                </div>
                <div style={{ textAlign: "right", marginBottom: 18 }}>
                  <button onClick={() => { setForgotMode(true); setForgotEmail(email); setError(""); }} style={{ background: "none", border: "none", color: T.amber, cursor: "pointer", fontSize: 12, fontFamily: FONT.ui, fontWeight: 600 }}>Forgot password?</button>
                </div>
                <button className="btn-primary" style={{ ...S.btnPrimary(loading), marginBottom: 16 }} disabled={loading} onClick={emailSignIn}>
                  {loading ? "Signing in…" : "Sign In →"}
                </button>
                <div style={S.divider}><div style={S.dividerLine}/><span style={S.dividerText}>OR</span><div style={S.dividerLine}/></div>
                <button className="btn-google" style={S.btnGoogle} onClick={() => googleAuth("signin")}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Continue with Google
                </button>
              </>
            )}

            {/* Forgot password inline */}
            {authTab === "email" && forgotMode && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.t1, marginBottom: 6 }}>Reset Password</div>
                <div style={{ fontSize: 13, color: T.t3, marginBottom: 18 }}>Enter your email and we'll send a reset link.</div>
                {forgotSent ? (
                  <div style={{ background: "#0a1f0a", border: `1px solid ${T.emerald}`, borderRadius: 10, padding: "14px 16px", color: T.emerald, fontSize: 13 }}>
                    ✅ Reset link sent! Check your inbox and spam folder.
                  </div>
                ) : (
                  <>
                    <label style={S.label}>Email Address</label>
                    <input className="auth-input" style={{ ...S.input, marginBottom: 16 }} type="email" placeholder="you@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} autoFocus />
                    <button className="btn-primary" style={{ ...S.btnPrimary(loading), marginBottom: 12 }} disabled={loading} onClick={sendForgotPassword}>
                      {loading ? "Sending…" : "Send Reset Link →"}
                    </button>
                  </>
                )}
                <button style={{ ...S.btnOutline }} onClick={() => { setForgotMode(false); setForgotSent(false); setError(""); }}>← Back to Sign In</button>
              </>
            )}

            {/* Link to create account */}
            <div style={{ textAlign: "center", fontSize: 13, color: T.t3, marginTop: 24, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
              No account?{" "}
              <button onClick={() => { setPhone(""); setEmail(""); setPassword(""); go(STEPS.REG_ROLE); }} style={{ background: "none", border: "none", color: T.amber, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: FONT.ui }}>Create one →</button>
            </div>
          </div>
        );

      // ── Sign-in OTP verify ────────────────────────────────────────────────
      case STEPS.SIGNIN_OTP:
        return (
          <div className="auth-card">
            <button style={S.btnBack} onClick={() => back(STEPS.LANDING)}>← Back</button>
            <div style={S.chip}>Sign In · OTP Verification</div>
            <div style={S.heading}>Enter OTP</div>
            <div style={S.sub}>Sent to +91 {phone}. Check your SMS.</div>
            {error && <div style={S.error}>{error}</div>}
            <div style={S.otpRow}>
              {otp.map((v, i) => (
                <input key={i} ref={otpRefs[i]} className="otp-box" style={S.otpBox} maxLength={1} inputMode="numeric" value={v}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e, () => verifyAndAuth("signin"))}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <button className="btn-primary" style={{ ...S.btnPrimary(loading || otp.join("").length !== 6), marginBottom: 12 }}
              disabled={loading || otp.join("").length !== 6} onClick={() => verifyAndAuth("signin")}>
              {loading ? "Verifying…" : "Sign In →"}
            </button>
            <div style={{ textAlign: "center", fontSize: 13, color: T.t3 }}>
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : <button style={{ background: "none", border: "none", color: T.amber, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT.ui }} onClick={() => sendOtp(STEPS.SIGNIN_OTP)}>Resend OTP</button>}
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // CREATE ACCOUNT — new users
      // ══════════════════════════════════════════════════════════════════════

      // ── Role selection ────────────────────────────────────────────────────
      case STEPS.REG_ROLE:
        return (
          <div className="auth-card">
            <button style={S.btnBack} onClick={() => back(STEPS.LANDING)}>← Back</button>
            <div style={S.chip}>Create Account · Step 1 of 3</div>
            <div style={S.heading}>What describes you?</div>
            <div style={S.sub}>Choose your role to get the right setup.</div>
            {error && <div style={S.error}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
              {[
                { key: "shop", icon: "🏪", title: "Shop Owner", desc: "Run your auto parts shop — billing, inventory, credit" },
                { key: "customer", icon: "🚗", title: "Customer / Mechanic", desc: "Buy parts with fitment guarantee & track orders" },
              ].map(r => (
                <div key={r.key} className={`role-card ${role === r.key ? "selected" : ""}`}
                  onClick={() => setRole(r.key)} role="button" tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setRole(r.key)}
                  style={{ padding: "20px 14px", borderRadius: 14, border: `2px solid ${T.border}`, background: T.surface, cursor: "pointer", textAlign: "center", position: "relative", transition: "all 0.2s" }}>
                  {role === r.key && <div style={{ position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: "50%", background: T.amber, color: "#000", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>}
                  <div style={{ fontSize: 30, marginBottom: 10 }}>{r.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginBottom: 4 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: T.t2, lineHeight: 1.4 }}>{r.desc}</div>
                </div>
              ))}
            </div>

            <button className="btn-primary" style={S.btnPrimary(!role)} disabled={!role} onClick={() => role && go(STEPS.REG_AUTH)}>
              Continue →
            </button>
          </div>
        );

      // ── Auth method for registration ──────────────────────────────────────
      case STEPS.REG_AUTH:
        return (
          <div className="auth-card">
            <button style={S.btnBack} onClick={() => { back(STEPS.REG_ROLE); }}>← Back</button>
            <div style={S.chip}>{role === "shop" ? "Shop Owner" : "Customer"} · Step 2 of 3</div>
            <div style={S.heading}>{role === "shop" ? "Verify Your Identity" : "Create Account"}</div>
            <div style={S.sub}>{role === "shop" ? "We verify every shop owner to keep the platform trustworthy." : "Quick setup — takes under a minute."}</div>

            {/* Tabs — email tab only for customers (shop owners prefer phone for KYC) */}
            <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
              {(role === "shop" ? ["phone"] : ["phone", "email"]).map(t => (
                <button key={t} className={`tab-btn ${authTab === t ? "active" : ""}`}
                  onClick={() => { setAuthTab(t); setError(""); }}
                  style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: "2px solid transparent", color: authTab === t ? T.amber : T.t3, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>
                  {t === "phone" ? "📱 Phone OTP" : "✉️ Email"}
                </button>
              ))}
            </div>

            {error && <div style={S.error}>{error}</div>}

            {/* Phone OTP */}
            {authTab === "phone" && (
              <>
                <label style={S.label}>Mobile Number</label>
                <div style={{ ...S.phoneRow, marginBottom: 8 }}>
                  <div style={S.phoneFlag}>IN +91</div>
                  <input className="auth-input" style={S.phoneInput} placeholder="98765 43210" value={phone} maxLength={10} inputMode="numeric"
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={e => e.key === "Enter" && sendOtp(STEPS.REG_OTP)}
                    autoFocus
                  />
                </div>
                <div style={{ ...S.hint }}>We'll send a 6-digit OTP. Used for identity verification.</div>
                <button className="btn-primary" style={{ ...S.btnPrimary(loading || phone.length !== 10), marginBottom: 16 }}
                  disabled={loading || phone.length !== 10} onClick={() => sendOtp(STEPS.REG_OTP)}>
                  {loading ? "Sending…" : "Send OTP →"}
                </button>
                <>
                  <div style={S.divider}><div style={S.dividerLine}/><span style={S.dividerText}>OR</span><div style={S.dividerLine}/></div>
                  <button className="btn-google" style={S.btnGoogle} onClick={() => googleAuth("register")}>
                    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    Continue with Google
                  </button>
                  {role === "shop" && (
                    <div style={{ fontSize: 11, color: T.t4, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
                      Google will pre-fill your name & email in the shop registration form
                    </div>
                  )}
                </>
              </>
            )}

            {/* Email (customers only) */}
            {authTab === "email" && role === "customer" && (
              <>
                <label style={S.label}>Email Address</label>
                <input className="auth-input" style={{ ...S.input, marginBottom: 12 }} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
                <label style={S.label}>Password</label>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <input className="auth-input" style={{ ...S.input, paddingRight: 44 }} type={showPwd ? "text" : "password"} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
                  <button onClick={() => setShowPwd(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 16 }}>{showPwd ? "🙈" : "👁"}</button>
                </div>
                <label style={S.label}>Confirm Password</label>
                <div style={{ position: "relative", marginBottom: 20 }}>
                  <input className="auth-input" style={{ ...S.input, paddingRight: 44 }} type={showConfirmPwd ? "text" : "password"} placeholder="Repeat password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && emailRegister()} />
                  <button onClick={() => setShowConfirmPwd(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 16 }}>{showConfirmPwd ? "🙈" : "👁"}</button>
                </div>
                <button className="btn-primary" style={{ ...S.btnPrimary(loading), marginBottom: 14 }} disabled={loading} onClick={emailRegister}>
                  {loading ? "Creating account…" : "Create Account →"}
                </button>
                <div style={S.divider}><div style={S.dividerLine}/><span style={S.dividerText}>OR</span><div style={S.dividerLine}/></div>
                <button className="btn-google" style={S.btnGoogle} onClick={() => googleAuth("register")}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Continue with Google
                </button>
              </>
            )}

            <div style={{ textAlign: "center", fontSize: 13, color: T.t3, marginTop: 22, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              Already have an account?{" "}
              <button onClick={() => { setPhone(""); go(STEPS.SIGNIN); }} style={{ background: "none", border: "none", color: T.amber, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: FONT.ui }}>Sign in →</button>
            </div>
          </div>
        );

      // ── Registration OTP verify ───────────────────────────────────────────
      case STEPS.REG_OTP:
        return (
          <div className="auth-card">
            <button style={S.btnBack} onClick={() => back(STEPS.REG_AUTH)}>← Back</button>
            <div style={S.chip}>{role === "shop" ? "Shop Owner" : "Customer"} · Verify Phone</div>
            <div style={S.heading}>Enter OTP</div>
            <div style={S.sub}>Sent to +91 {phone}. Check your SMS.</div>
            {error && <div style={S.error}>{error}</div>}
            <div style={S.otpRow}>
              {otp.map((v, i) => (
                <input key={i} ref={otpRefs[i]} className="otp-box" style={S.otpBox} maxLength={1} inputMode="numeric" value={v}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e, () => verifyAndAuth("register"))}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            <button className="btn-primary" style={{ ...S.btnPrimary(loading || otp.join("").length !== 6), marginBottom: 12 }}
              disabled={loading || otp.join("").length !== 6} onClick={() => verifyAndAuth("register")}>
              {loading ? "Verifying…" : (role === "shop" ? "Verify & Continue →" : "Create Account →")}
            </button>
            <div style={{ textAlign: "center", fontSize: 13, color: T.t3 }}>
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : <button style={{ background: "none", border: "none", color: T.amber, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT.ui }} onClick={() => sendOtp(STEPS.REG_OTP)}>Resend OTP</button>}
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // SHOP DETAILS — step 3 for new shop owners
      // ══════════════════════════════════════════════════════════════════════
      case STEPS.SHOP_DETAILS:
        return (
          <div className="auth-card">
            {/* Progress indicator */}
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
              {["Identity", "Shop Details", "Verification"].map((label, i) => (
                <div key={label} style={{ flex: 1 }}>
                  <div style={{ height: 3, borderRadius: 4, background: i <= 1 ? T.amber : T.border, marginBottom: 5 }} />
                  <div style={{ fontSize: 9, color: i <= 1 ? T.amber : T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={S.chip}>Shop Owner · Step 3 of 3</div>
            <div style={S.heading}>Tell us about your shop</div>
            <div style={S.sub}>These details let our team verify you're a legitimate retailer.</div>

            {error && <div style={S.error}>{error}</div>}

            <label style={S.label}>Your Full Name <span style={{ color: T.crimson }}>*</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 14 }} placeholder="e.g. Rajesh Kumar" value={shopDetails.ownerName} onChange={e => setShopDetails(d => ({ ...d, ownerName: e.target.value }))} autoFocus />

            <label style={S.label}>Shop Name <span style={{ color: T.crimson }}>*</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 14 }} placeholder="e.g. Kumar Auto Parts" value={shopDetails.shopName} onChange={e => setShopDetails(d => ({ ...d, shopName: e.target.value }))} />

            <label style={S.label}>City <span style={{ color: T.crimson }}>*</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 14 }} placeholder="e.g. Hyderabad" value={shopDetails.city} onChange={e => setShopDetails(d => ({ ...d, city: e.target.value }))} />

            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 2 }}>
                <label style={S.label}>State <span style={{ color: T.crimson }}>*</span></label>
                <select className="auth-input" style={{ ...S.input, cursor: "pointer" }} value={shopDetails.state} onChange={e => setShopDetails(d => ({ ...d, state: e.target.value }))}>
                  <option value="">Select state…</option>
                  {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Pincode</label>
                <input className="auth-input" style={S.input} placeholder="500001" value={shopDetails.pincode} maxLength={6} inputMode="numeric" onChange={e => setShopDetails(d => ({ ...d, pincode: e.target.value.replace(/\D/g, "") }))} />
              </div>
            </div>

            <label style={S.label}>Shop Contact Number <span style={{ color: T.crimson }}>*</span></label>
            <div style={{ ...S.phoneRow, marginBottom: 14 }}>
              <div style={S.phoneFlag}>IN +91</div>
              <input className="auth-input" style={S.phoneInput} placeholder="98765 43210" value={shopDetails.contactPhone} maxLength={10} inputMode="numeric" onChange={e => setShopDetails(d => ({ ...d, contactPhone: e.target.value.replace(/\D/g, "") }))} />
            </div>

            <label style={S.label}>GSTIN <span style={{ color: T.t4, fontWeight: 400, textTransform: "none" }}>(optional — for GST billing)</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 28, fontFamily: FONT.mono, letterSpacing: "1px" }} placeholder="22AAAAA0000A1Z5" value={shopDetails.gstin} maxLength={15} onChange={e => setShopDetails(d => ({ ...d, gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))} />

            <button className="btn-primary"
              style={S.btnPrimary(loading || !shopDetails.ownerName.trim() || !shopDetails.shopName.trim() || !shopDetails.city.trim() || shopDetails.contactPhone.length !== 10)}
              disabled={loading || !shopDetails.ownerName.trim() || !shopDetails.shopName.trim() || !shopDetails.city.trim() || shopDetails.contactPhone.length !== 10}
              onClick={submitShopDetails}>
              {loading ? "Submitting…" : "Submit for Verification →"}
            </button>
            <div style={{ textAlign: "center", fontSize: 12, color: T.t4, marginTop: 10 }}>
              Our team reviews and approves within 24–48 hours.
            </div>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // PROFILE — new customer name setup
      // ══════════════════════════════════════════════════════════════════════
      case STEPS.PROFILE:
        return (
          <div className="auth-card">
            <div style={S.chip}>Almost done!</div>
            <div style={S.heading}>Quick setup</div>
            <div style={S.sub}>Tell us a bit about yourself so we can personalise your experience.</div>
            {error && <div style={S.error}>{error}</div>}
            <label style={S.label}>Full Name <span style={{ color: T.crimson }}>*</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 18 }} placeholder="e.g. Arjun Sharma" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === "Enter" && saveProfile()} autoFocus />
            <label style={S.label}>I am a…</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[
                { value: "INDIVIDUAL", label: "Car Owner", icon: "🚗" },
                { value: "MECHANIC",   label: "Mechanic",  icon: "🔧" },
                { value: "FLEET_MANAGER", label: "Fleet Manager", icon: "🚚" },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setProfile(p => ({ ...p, profileType: opt.value }))}
                  style={{ flex: 1, padding: "10px 6px", borderRadius: 8, border: `1.5px solid ${profile.profileType === opt.value ? "#FF1F3A" : "#3F3F46"}`, background: profile.profileType === opt.value ? "rgba(255,31,58,0.08)" : "#1a1b22", color: profile.profileType === opt.value ? "#FF1F3A" : "#c9c6c5", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.15s", textAlign: "center" }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{opt.icon}</div>
                  {opt.label}
                </button>
              ))}
            </div>
            <button className="btn-primary" style={S.btnPrimary(loading || !profile.name.trim())} disabled={loading || !profile.name.trim()} onClick={saveProfile}>
              {loading ? "Saving…" : "Enter AutoSpace →"}
            </button>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // PENDING — shop owner awaiting approval
      // ══════════════════════════════════════════════════════════════════════
      case STEPS.PENDING:
        return (
          <div className="auth-card" style={{ textAlign: "center" }}>
            {/* Progress — all 3 done */}
            <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
              {["Identity", "Shop Details", "Under Review"].map(label => (
                <div key={label} style={{ flex: 1 }}>
                  <div style={{ height: 3, borderRadius: 4, background: T.amber, marginBottom: 5 }} />
                  <div style={{ fontSize: 9, color: T.amber, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#1E1A0A", border: `2px solid ${T.amber}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 20px", boxShadow: `0 0 28px ${T.amber}33` }}>⏳</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.t1, marginBottom: 10 }}>Application Submitted!</div>
            <div style={{ fontSize: 14, color: T.t3, lineHeight: 1.7, marginBottom: 24, maxWidth: 340, margin: "0 auto 24px" }}>
              Your shop details are under review. We'll email you once approved — usually within <strong style={{ color: T.amber }}>24–48 hours</strong>.
            </div>
            <div style={{ background: "#0D1628", border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 24, textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>What happens next</div>
              {[
                { icon: "✅", label: "Phone verified & shop details submitted", done: true },
                { icon: "🔍", label: "Our team reviews your application (24–48 hrs)", done: false },
                { icon: "📧", label: "You receive an approval email with login link", done: false },
                { icon: "🏪", label: "Log in and start managing your shop!", done: false },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < 3 ? 12 : 0 }}>
                  <span style={{ fontSize: 16, flexShrink: 0, opacity: item.done ? 1 : 0.45 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: item.done ? T.t1 : T.t3, fontWeight: item.done ? 600 : 400, lineHeight: 1.5 }}>{item.label}</span>
                </div>
              ))}
            </div>
            <button style={{ ...S.btnOutline }} onClick={() => { go(STEPS.LANDING); setRole(""); }}>← Back to Home</button>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // REJECTED — shop owner application not approved
      // ══════════════════════════════════════════════════════════════════════
      case STEPS.REJECTED:
        return (
          <div className="auth-card" style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1c0909", border: `2px solid ${T.crimson}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>✕</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.t1, marginBottom: 10 }}>Application Not Approved</div>
            {rejectionMsg && (
              <div style={{ background: "#1c0909", border: `1px solid ${T.crimson}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: T.crimson, lineHeight: 1.6, textAlign: "left" }}>
                <strong>Reason:</strong> {rejectionMsg}
              </div>
            )}
            <div style={{ fontSize: 13, color: T.t3, marginBottom: 24, lineHeight: 1.7 }}>
              If you believe this is a mistake, contact our support team at <strong style={{ color: T.amber }}>support@autospaceerp.com</strong>
            </div>
            <button style={{ ...S.btnOutline }} onClick={() => { go(STEPS.LANDING); setRole(""); }}>← Back to Home</button>
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // ADMIN AUTH — platform admin console login
      // ══════════════════════════════════════════════════════════════════════
      case STEPS.ADMIN_AUTH:
        return (
          <div className="auth-card" style={{ border: "1.5px solid #7C3AED", borderRadius: 16, background: "linear-gradient(160deg, #0e0c1f 0%, #0A0F1D 100%)", padding: "28px 32px", boxShadow: "0 0 40px rgba(124,58,237,0.12)" }}>
            <button style={{ ...S.btnBack, color: "#7C3AED" }} onClick={() => go(STEPS.LANDING)}>← Back</button>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: "#2D1B69", border: "1px solid #7C3AED", borderRadius: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🛡️</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#A78BFA", letterSpacing: "0.07em", textTransform: "uppercase" }}>Platform Admin Console</div>
                <div style={{ fontSize: 11, color: "#7C3AED" }}>Restricted access · Authorised personnel only</div>
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, marginBottom: 20 }}>Admin Sign In</div>
            {error && <div style={S.error}>{error}</div>}
            <label style={S.label}>Admin Email</label>
            <input className="auth-input admin-input" style={{ ...S.input, marginBottom: 14 }} type="email" placeholder="admin@autospaceerp.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            <label style={S.label}>Password</label>
            <div style={{ position: "relative", marginBottom: 22 }}>
              <input className="auth-input admin-input" style={{ ...S.input, paddingRight: 44 }} type={showPwd ? "text" : "password"} placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && adminSignIn()} />
              <button onClick={() => setShowPwd(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 16 }}>{showPwd ? "🙈" : "👁"}</button>
            </div>
            <button
              className="btn-primary"
              style={{ ...S.btnPrimary(loading), background: loading ? "#2a2a2a" : "linear-gradient(135deg, #4F46E5, #7C3AED)", color: loading ? "#555" : "#fff" }}
              disabled={loading} onClick={adminSignIn}>
              {loading ? "Signing in…" : "Access Console →"}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Page layout — Stitch "Apex Performance" split panel ────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#12131a", fontFamily: "'Inter', sans-serif" }}>
      <style>{css}</style>
      <div id="recaptcha-container" />

      {/* ── Left 3/5: Engine photo + branding ── */}
      <div className="auth-hero-left" style={{
        width: "60%", position: "relative", overflow: "hidden", flexShrink: 0,
      }}>
        {/* Engine photo */}
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuASXvM9fpki5nRklH4bc9MrdWCwsO7Prc9vjumG1rrrQzdx7_u5nqcWbJDm7CjEajHps3gCqJlk5mAeZT9qmQB4GA73ygs2XJq3ibgeCSHal4hXeiENvVurlO0mbgMV_hshY2tgwLQzQspUJ2CyvPzGx-RnUjAba2cUsGpQRNw1VR7RCeJjo4gw9JRX_bMgqpID9cRCmfhPTH6UOUCo279hEECl6geFyDTi3pRLnBNtbLkScT_5v1nPWI82e2ehX9QhmO0HIFOG6A"
          alt="High-performance engine"
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(20%)", display: "block" }}
          onError={e => { e.target.style.display = "none"; }}
        />
        {/* Hero overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(18,19,26,0.92) 0%, rgba(18,19,26,0.25) 100%)" }} />

        {/* Content over the image */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 48 }}>

          {/* Logo — top */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, background: "#FF1F3A", borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, color: "#fff", flexShrink: 0,
              boxShadow: "0 0 20px rgba(255,31,58,0.3)",
            }}>⚙</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>Red Piston OS</div>
              <div style={{ fontSize: 10, color: "#ffb3b0", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>Version 4.2.0 Build Delta</div>
            </div>
          </div>

          {/* Headline — middle */}
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 56, fontWeight: 900, color: "#fff", fontFamily: "'Outfit', sans-serif", lineHeight: 1.08, marginBottom: 20, letterSpacing: "-0.02em" }}>
              The Engine of Automotive Commerce.
            </div>
            <div style={{ fontSize: 16, color: "#e8bcb9", lineHeight: 1.65, maxWidth: 400 }}>
              Streamline logistics, manage high-performance inventory, and scale your automotive enterprise with precision engineering.
            </div>
          </div>

          {/* Stats — bottom */}
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div>
              <div style={{ fontSize: 10, color: "#ffb3b0", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>UPTIME</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif" }}>99.98%</div>
            </div>
            <div style={{ width: 1, height: 40, background: "#3F3F46" }} />
            <div>
              <div style={{ fontSize: 10, color: "#ffb3b0", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>THROUGHPUT</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif" }}>450k/s</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right 2/5: Form panel ── */}
      <div className="auth-form-right" style={{
        flex: 1,
        background: "#12131a",
        backgroundImage: "radial-gradient(#3F3F46 0.5px, transparent 0.5px)",
        backgroundSize: "24px 24px",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "32px 48px",
        position: "relative",
        overflowY: "auto",
      }}>
        {/* Secure Terminal badge */}
        <div style={{
          position: "absolute", top: 24, right: 24,
          display: "flex", alignItems: "center", gap: 8,
          background: "#292931", border: "1px solid #3F3F46",
          borderRadius: 9999, padding: "6px 14px",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", display: "block", boxShadow: "0 0 8px rgba(16,185,129,0.6)" }} />
          <span style={{ fontSize: 10, color: "#af8785", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>Secure Terminal 08-AX</span>
        </div>

        {/* Mobile branding (only visible when left panel is hidden) */}
        <div style={{ display: "none" }} className="auth-mobile-brand">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#FF1F3A" }}>⚙</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#e3e1ec", fontFamily: "'Outfit', sans-serif" }}>Red Piston</div>
          </div>
        </div>

        {/* Form container */}
        <div style={{ width: "100%", maxWidth: 400 }}>
          {renderStep()}
        </div>

        {/* Footer links — only on main auth steps */}
        {(step === STEPS.LANDING || step === STEPS.SIGNIN) && (
          <div style={{ width: "100%", maxWidth: 400, marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(63,63,70,0.35)", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#af8785", marginBottom: 14 }}>
              New to the platform?{" "}
              <button
                style={{ background: "none", border: "none", color: "#ffb3b0", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}
                onClick={() => go(STEPS.REG_ROLE)}
              >
                Register a Shop
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
              <span style={{ fontSize: 10, color: "#5e3f3d", fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", letterSpacing: "0.06em" }}>TERMS OF SERVICE</span>
              <span style={{ fontSize: 10, color: "#5e3f3d", fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", letterSpacing: "0.06em" }}>PRIVACY POLICY</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
