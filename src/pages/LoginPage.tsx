import { useState, useRef, useEffect } from "react";
import { api, setTokens } from "../api/client.js";
import { T, FONT } from "../theme.js";
import { useCloudinaryUpload } from "../hooks/useCloudinaryUpload";
import { signInWithGoogle } from "../firebase.js";

/** Minimal photo uploader used only inside the shop registration step */
function ShopPhotoUploader({ photoUrl, onUploaded }: { photoUrl: string; onUploaded: (url: string) => void }) {
  const { upload, uploading, progress } = useCloudinaryUpload();
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  const handle = async (file: File) => {
    if (!file.type.startsWith("image/")) { setErr("Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { setErr("File too large — max 10 MB"); return; }
    setErr("");
    try { const r = await upload(file, "shops"); onUploaded(r.secureUrl); }
    catch { setErr("Upload failed — please try again"); }
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div onClick={() => !uploading && ref.current?.click()}
        style={{ height: 100, border: `2px dashed ${photoUrl ? "#22c55e" : "#3F3F46"}`, borderRadius: 10, background: "#16171e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        {photoUrl
          ? <img src={photoUrl} alt="Shop" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ textAlign: "center", color: "#6b6b75" }}>
              <div style={{ fontSize: 28 }}>📷</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Upload shop photo</div>
            </div>}
        {uploading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 100, height: 4, background: "#2e2f3a", borderRadius: 4 }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#BE2B1A", borderRadius: 4, transition: "width 0.1s" }} />
            </div>
            <span style={{ fontSize: 11, color: "#fff" }}>Uploading {progress}%</span>
          </div>
        )}
      </div>
      {err && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 4 }}>{err}</div>}
      {photoUrl && <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>✓ Photo uploaded</div>}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
    </div>
  );
}

/**
 * AUTH FLOW — email + password only:
 *
 * SIGN IN (existing users)
 *   → Email + Password → login
 *   → Forgot password → reset link
 *   → If shop owner PENDING/REJECTED → show status screen
 *
 * CREATE ACCOUNT (new users)
 *   → Pick role (Shop Owner / Customer)
 *   → Email + Password
 *   → Shop Owner: Shop Details form → PENDING screen
 *   → Customer: Name → Marketplace
 */

const STEPS = {
  LANDING:      "landing",      // Sign In / Create Account choice
  SIGNIN:       "signin",       // Sign-in form (email + password)
  REG_ROLE:     "reg_role",     // Role selection for new users
  REG_AUTH:     "reg_auth",     // Email registration form
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

// ─── CSS — fonts already loaded from index.html, no @import needed ───────────
const css = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes auth-pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  .auth-card { animation: fadeUp 0.28s cubic-bezier(0.16,1,0.3,1); }
  .auth-input:focus { border-color: #be2b1a !important; box-shadow: 0 0 0 2px rgba(190,43,26,0.18) !important; outline: none !important; }
  .admin-input:focus { border-color: #7C3AED !important; box-shadow: 0 0 0 2px rgba(124,58,237,0.2) !important; }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 10px 30px rgba(190,43,26,0.4) !important; }
  .btn-primary:active:not(:disabled) { transform: translateY(0); }
  .role-card:hover { border-color: rgba(190,43,26,0.5) !important; background: rgba(190,43,26,0.06) !important; }
  .role-card.selected { border-color: #be2b1a !important; background: rgba(190,43,26,0.08) !important; box-shadow: 0 0 0 2px rgba(190,43,26,0.18) !important; }
  .tab-btn { transition: all 0.18s; }
  .tab-btn.active { background: rgba(190,43,26,0.08) !important; color: #be2b1a !important; border-bottom: 2px solid #be2b1a !important; }
  .stitch-tab-active { background: #FAF6F0 !important; color: #1A1205 !important; border: 1px solid #E0D5C8 !important; }
  .stitch-tab-inactive { background: transparent !important; color: #9C8C7C !important; border: 1px solid transparent !important; }
  .stitch-tab-inactive:hover { color: #5C4F40 !important; }
  .btn-outline-stitch:hover { background: #F0E8DF !important; }
  /* Left panel hero overlay */
  .auth-left-content { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:space-between; padding:48px; }
  .auth-left-overlay { position:absolute; inset:0; background:linear-gradient(0deg,rgba(18,20,22,0.94) 0%,rgba(18,20,22,0.3) 100%); }
  /* Left panel: hide on small screens */
  @media (max-width: 900px) {
    .auth-hero-left { display: none !important; }
    .auth-form-right { width: 100% !important; }
  }
  @media (max-width: 540px) {
    .auth-form-right { padding: 32px 20px 40px !important; }
  }
  @media (max-width: 380px) {
    .auth-form-right { padding: 28px 16px 36px !important; }
  }
`;

// ─── Shared style tokens (light cream palette) ────────────────────────────────
const BASE_S = {
  label:  { fontSize: 11, fontWeight: 700, color: "#9C8C7C", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block", fontFamily: "'Inter', sans-serif" },
  input:  { width: "100%", background: "#FFFFFF", border: "1.5px solid #E0D5C8", borderRadius: 8, padding: "12px 14px", color: "#1A1205", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'Inter', sans-serif", transition: "border 0.18s, box-shadow 0.18s" },
  phoneRow: { display: "flex", alignItems: "stretch", border: "1.5px solid #E0D5C8", borderRadius: 8, overflow: "hidden", background: "#FFFFFF" },
  phoneFlag: { padding: "12px 14px", background: "#FAF6F0", color: "#5C4F40", fontSize: 13, fontWeight: 500, borderRight: "1px solid #E0D5C8", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif" },
  phoneInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#1A1205", fontSize: 15, padding: "12px 14px", fontFamily: "'Inter', sans-serif", letterSpacing: "0.08em" },
  btnPrimary: (disabled) => ({ width: "100%", padding: "14px", background: disabled ? "#E0D5C8" : "#BE2B1A", color: disabled ? "#9C8C7C" : "#FFFFFF", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.2s", boxShadow: disabled ? "none" : "0 8px 24px rgba(190,43,26,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }),
  btnOutline: { width: "100%", padding: "13px", background: "transparent", border: "1.5px solid #E0D5C8", borderRadius: 8, color: "#5C4F40", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  btnGoogle: { width: "100%", padding: "13px", background: "#fff", border: "1.5px solid #E0D5C8", borderRadius: 8, color: "#1A1205", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" },
  btnBack: { background: "none", border: "none", color: "#9C8C7C", cursor: "pointer", fontSize: 13, padding: "0 0 20px", display: "flex", alignItems: "center", gap: 5, fontFamily: "'Inter', sans-serif" },
  otpRow: { display: "flex", gap: 8, marginBottom: 20, justifyContent: "center" },
  otpBox: { width: 46, height: 54, textAlign: "center", fontSize: 22, fontWeight: 700, fontFamily: "'Inter', sans-serif", background: "#FFFFFF", border: "1.5px solid #E0D5C8", borderRadius: 8, color: "#1A1205", outline: "none" },
  error: { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "11px 14px", color: "#BE2B1A", fontSize: 13, marginBottom: 16, lineHeight: 1.5 },
  divider: { display: "flex", alignItems: "center", gap: 12, margin: "20px 0" },
  dividerLine: { flex: 1, height: 1, background: "#E0D5C8" },
  dividerText: { color: "#9C8C7C", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" },
  heading: { fontSize: 22, fontWeight: 800, color: "#1A1205", marginBottom: 6, letterSpacing: "-0.2px", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  sub: { fontSize: 14, color: "#9C8C7C", marginBottom: 24, lineHeight: 1.55 },
  chip: { fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#BE2B1A", marginBottom: 8, fontFamily: "'Inter', sans-serif" },
  hint: { fontSize: 12, color: "#9C8C7C", lineHeight: 1.6, marginBottom: 16 },
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
export default function LoginPage({ onLogin, isModal = false }) {
  const [step, setStep]           = useState(STEPS.LANDING);
  const [role, setRole]           = useState("");         // "shop" | "customer" | "admin"
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [settingUp, setSettingUp] = useState(false); // overlay while transitioning to shop-details
  const [error, setError]         = useState("");
  const [shopDetails, setShopDetails] = useState({ ownerName: "", shopName: "", address: "", city: "Hyderabad", state: "Telangana", pincode: "", contactPhone: "", email: "", gstin: "", shopCategory: "", whatsappNumber: "", photoUrl: "" });
  const [vehicle, setVehicle] = useState({ make: "", model: "", year: "", fuelType: "", registrationNo: "" });
  const [profile, setProfile]     = useState({ name: "", profileType: "INDIVIDUAL" });
  const [pendingUserId, setPendingUserId] = useState(null);
  const [pendingUser, setPendingUser]     = useState(null); // for profile step
  const [resumeNotice, setResumeNotice]   = useState("");   // "welcome back, finish setup" banner
  const [rejectionMsg, setRejectionMsg]   = useState("");
  const [forgotEmail, setForgotEmail]     = useState("");
  const [forgotMode, setForgotMode]       = useState(false);

  const [forgotSent, setForgotSent]       = useState(false);
  const [landingTab, setLandingTab]       = useState("owner"); // "owner" | "customer"
  const [googleLoading, setGoogleLoading] = useState(false);

  // Modal-responsive style tokens — shadow module-level BASE_S
  const S = isModal ? {
    ...BASE_S,
    heading:   { ...BASE_S.heading, fontSize: 16, marginBottom: 2 },
    sub:       { ...BASE_S.sub, fontSize: 11, marginBottom: 12 },
    chip:      { ...BASE_S.chip, fontSize: 9, marginBottom: 4 },
    label:     { ...BASE_S.label, fontSize: 10, marginBottom: 3 },
    hint:      { ...BASE_S.hint, fontSize: 11, marginBottom: 10 },
    input:     { ...BASE_S.input, padding: "8px 10px", fontSize: 12 },
    phoneFlag: { ...BASE_S.phoneFlag, padding: "8px 10px", fontSize: 12 },
    phoneInput:{ ...BASE_S.phoneInput, padding: "8px 10px", fontSize: 12 },
    btnPrimary:(d) => ({ ...BASE_S.btnPrimary(d), padding: "9px", fontSize: 11 }),
    btnOutline:{ ...BASE_S.btnOutline, padding: "8px", fontSize: 11 },
    btnGoogle: { ...BASE_S.btnGoogle, padding: "8px", fontSize: 11 },
    btnBack:   { ...BASE_S.btnBack, padding: "0 0 10px", fontSize: 11 },
    otpBox:    { ...BASE_S.otpBox, width: 38, height: 44, fontSize: 18 },
    error:     { ...BASE_S.error, padding: "8px 10px", fontSize: 11, marginBottom: 10 },
    divider:   { ...BASE_S.divider, margin: "10px 0" },
  } : BASE_S;

  const go = (s) => { setStep(s); setError(""); };
  const back = (s) => { setStep(s); setError(""); };

  // ── Handle backend response (shared across all auth methods) ──────────────
  const handleAuthResponse = (data) => {
    // Shop owner needing shop details (new registration OR resumed after abandoning).
    // The backend now issues tokens here — /shop-setup requires a Bearer token.
    if (data?.needsShopDetails) {
      if (data.accessToken) setTokens(data.accessToken, data.refreshToken);
      setPendingUserId(data.userId);
      setShopDetails(d => ({
        ...d,
        ownerName:    data.userName || d.ownerName,
        contactPhone: data.phone || d.contactPhone,
        email:        data.email || email || d.email,
      }));
      setResumeNotice("");
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

    if ((isNewUser || !userData.name) && userData.role === "CUSTOMER") {
      // New customer — or returning customer who never finished the name step
      setPendingUser(userData);
      if (userData.name) setProfile(p => ({ ...p, name: userData.name }));
      setResumeNotice(isNewUser ? "" : "Welcome back! Just tell us your name to finish setting up your account.");
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

      // Shop owner who abandoned signup — resume the shop-details step
      if (data?.needsShopDetails) {
        handleAuthResponse(data);
        setLoading(false);
        return;
      }

      const userData = data?.user;
      if (!userData) throw new Error("Server returned an unexpected response.");
      setTokens(data.accessToken, data.refreshToken);

      // Customer who never finished the name step — resume it
      if (!userData.name && userData.role === "CUSTOMER") {
        setPendingUser(userData);
        setResumeNotice("Welcome back! Just tell us your name to finish setting up your account.");
        go(STEPS.PROFILE);
        setLoading(false);
        return;
      }

      localStorage.setItem("as_user", JSON.stringify(userData));
      onLogin(userData);
    } catch (e) {
      const code = e.data?.error?.code;
      if (code === "NO_ACCOUNT") { setError("No account found with this email. Please create an account first."); setLoading(false); return; }
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
      const vehiclePayload = vehicle.make && vehicle.model && vehicle.year ? vehicle : undefined;
      const data = await api.post("/api/auth/register", { email, password, role, name: profile.name || undefined, vehicle: vehiclePayload });
      if (data?.needsShopDetails) {
        setLoading(false);
        setSettingUp(true);
        handleAuthResponse(data); // stores tokens + prefills + goes to SHOP_DETAILS
        setTimeout(() => setSettingUp(false), 500);
        return;
      }
      const userData = data?.user;
      if (!userData) throw new Error("Server returned an unexpected response.");
      setTokens(data.accessToken, data.refreshToken);
      setPendingUser(userData);
      go(STEPS.PROFILE);
    } catch (e) {
      const code = e.data?.error?.code;
      if (code === "EMAIL_EXISTS") {
        setError("An account with this email already exists. Please sign in instead — if your registration was incomplete, you'll resume right where you left off.");
        return setLoading(false);
      }
      setError(getErr(e, "Registration failed. Try again."));
    }
    setLoading(false);
  };

  // ── Submit shop details → POST /api/auth/shop-setup ───────────────────────
  const submitShopDetails = async () => {
    if (!shopDetails.ownerName.trim()) { setError("Enter your full name"); return; }
    if (!shopDetails.shopName.trim())  { setError("Enter your shop name"); return; }
    if (!shopDetails.address.trim())   { setError("Enter your shop address"); return; }
    if (!shopDetails.city.trim())      { setError("Enter your city"); return; }
    if (!shopDetails.state)            { setError("Select your state"); return; }
    const pin = shopDetails.pincode.replace(/\D/g, "");
    if (!pin || pin.length !== 6)      { setError("Enter a valid 6-digit pincode"); return; }
    const ph = shopDetails.contactPhone.replace(/\D/g, "");
    if (ph.length !== 10) { setError("Enter a valid 10-digit contact number"); return; }
    const wa = shopDetails.whatsappNumber.replace(/\D/g, "");
    if (wa.length !== 10) { setError("Enter a valid 10-digit WhatsApp number"); return; }
    if (!shopDetails.email.trim()) { setError("Enter your shop email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shopDetails.email.trim())) { setError("Enter a valid email address"); return; }
    if (shopDetails.gstin.length !== 15) { setError("Enter a valid 15-character GSTIN"); return; }
    if (!shopDetails.photoUrl) { setError("Upload a shop photo to continue"); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/api/auth/shop-setup", {
        userId:          pendingUserId,
        ownerName:       shopDetails.ownerName.trim(),
        shopName:        shopDetails.shopName.trim(),
        address:         shopDetails.address.trim(),
        city:            shopDetails.city.trim(),
        state:           shopDetails.state,
        pincode:         pin,
        contactPhone:    ph,
        email:           shopDetails.email.trim() || undefined,
        gstin:           shopDetails.gstin.trim() || undefined,
        shopCategory:    shopDetails.shopCategory || undefined,
        whatsappNumber:  shopDetails.whatsappNumber.replace(/\D/g,"") || undefined,
        photoUrl:        shopDetails.photoUrl || undefined,
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
    } catch (e) {
      const code = e.data?.error?.code;
      if (code === "USER_NOT_FOUND") {
        setError("No account found with this email. Please create an account first.");
      } else {
        setError(getErr(e, "Could not send reset link. Try again."));
      }
    }
    setLoading(false);
  };

  // ── Google Sign-In ─────────────────────────────────────────────────────────
  const callBackendFirebase = async (firebaseToken: string) => {
    const data = await api.post("/api/auth/firebase", { firebaseToken, role });
    handleAuthResponse(data);
  };

  const googleAuth = async (_intent: string) => {
    setError(""); setGoogleLoading(true);
    try {
      const { token } = await signInWithGoogle();
      await callBackendFirebase(token);
    } catch (e: any) {
      if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") {
        setError(""); // user dismissed — not an error
      } else {
        setError(getErr(e, "Google sign-in failed. Try again."));
      }
    }
    setGoogleLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep = () => {
    // Full-panel loader while Google popup is verifying
    if (googleLoading) {
      return (
        <div className="auth-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 18, textAlign: "center" }}>
          <div style={{ fontSize: 48, animation: "auth-pulse 1.1s ease-in-out infinite" }}>🔐</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#BE2B1A", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>Signing you in…</div>
            <div style={{ fontSize: 12, color: "#9C8C7C", lineHeight: 1.6, maxWidth: 280 }}>Verifying your Google account — just a moment</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#BE2B1A", opacity: 0.3, animation: `auth-pulse 1.1s ease-in-out ${i * 0.22}s infinite` }} />
            ))}
          </div>
        </div>
      );
    }

    // Full-panel loader while email sign-in / register is waiting on the backend
    if (loading && (step === STEPS.SIGNIN || step === STEPS.REG_AUTH || step === STEPS.ADMIN_AUTH)) {
      return (
        <div className="auth-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 18, textAlign: "center" }}>
          <div style={{ fontSize: 48, animation: "auth-pulse 1.1s ease-in-out infinite" }}>⚙️</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#BE2B1A", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>
              {step === STEPS.REG_AUTH ? "Creating your account…" : "Signing you in…"}
            </div>
            <div style={{ fontSize: 12, color: "#9C8C7C", lineHeight: 1.6, maxWidth: 280 }}>This may take a moment — our server may be waking up</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#BE2B1A", opacity: 0.3, animation: `auth-pulse 1.1s ease-in-out ${i * 0.22}s infinite` }} />
            ))}
          </div>
        </div>
      );
    }

    switch (step) {

      // ══════════════════════════════════════════════════════════════════════
      // LANDING — Role selector: Customer vs Shop Owner
      // ══════════════════════════════════════════════════════════════════════
      case STEPS.LANDING:
        return (
          <div className="auth-card">
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={S.heading}>Welcome to RedPiston</div>
              <div style={{ fontSize: 12, color: "#af8785", marginTop: 4 }}>How would you like to continue?</div>
            </div>

            {/* Role cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {/* Customer */}
              <div style={{ background: "#FFFFFF", border: "2px solid #E0D5C8", borderRadius: 12, padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 0, boxShadow: "0 2px 8px rgba(26,18,5,0.06)" }}>
                <div style={{ fontSize: 26, marginBottom: 4 }}>🚗</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1205", marginBottom: 3, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Customer</div>
                <div style={{ fontSize: 11, color: "#9C8C7C", lineHeight: 1.4, textAlign: "center", marginBottom: 10 }}>Buy auto parts with fitment guarantee</div>
                <button className="btn-primary" style={{ ...S.btnPrimary(false), marginBottom: 6, fontSize: 12, padding: "9px 12px" }}
                  onClick={() => { setLandingTab("customer"); go(STEPS.SIGNIN); }}>
                  Sign In →
                </button>
                <button className="btn-outline-stitch" style={{ ...S.btnOutline, fontSize: 11, padding: "8px 12px" }}
                  onClick={() => { setRole("customer"); setLandingTab("customer"); go(STEPS.REG_AUTH); }}>
                  Create Account
                </button>
              </div>

              {/* Shop Owner */}
              <div style={{ background: "#FFFFFF", border: "2px solid #E0D5C8", borderRadius: 12, padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 0, boxShadow: "0 2px 8px rgba(26,18,5,0.06)" }}>
                <div style={{ fontSize: 26, marginBottom: 4 }}>🏪</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1205", marginBottom: 3, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Shop Owner</div>
                <div style={{ fontSize: 11, color: "#9C8C7C", lineHeight: 1.4, textAlign: "center", marginBottom: 10 }}>Manage your shop, billing & inventory</div>
                <button className="btn-primary" style={{ ...S.btnPrimary(false), marginBottom: 6, fontSize: 12, padding: "9px 12px" }}
                  onClick={() => { setLandingTab("owner"); go(STEPS.SIGNIN); }}>
                  Sign In →
                </button>
                <button className="btn-outline-stitch" style={{ ...S.btnOutline, fontSize: 11, padding: "8px 12px" }}
                  onClick={() => { setRole("shop"); setLandingTab("owner"); go(STEPS.REG_AUTH); }}>
                  Register Shop
                </button>
              </div>
            </div>

            {/* Admin access */}
            {!isModal && (
              <div style={{ textAlign: "center", paddingTop: 16, borderTop: "1px solid #E0D5C8" }}>
                <button
                  style={{ background: "none", border: "none", color: "#BFB0A0", cursor: "pointer", fontSize: 11, fontFamily: FONT.mono, letterSpacing: "0.06em" }}
                  onClick={() => { setEmail(""); setPassword(""); go(STEPS.ADMIN_AUTH); }}
                >
                  🛡️ PLATFORM ADMIN ACCESS
                </button>
              </div>
            )}
          </div>
        );

      // ══════════════════════════════════════════════════════════════════════
      // SIGN IN — existing users (email + password only)
      // ══════════════════════════════════════════════════════════════════════
      case STEPS.SIGNIN:
        return (
          <div className="auth-card">
            <button style={S.btnBack} onClick={() => back(STEPS.LANDING)}>← Back</button>
            <div style={S.chip}>{landingTab === "owner" ? "🏪 Shop Owner" : "🚗 Customer"} · Sign In</div>
            <div style={S.heading}>Welcome back</div>
            <div style={S.sub}>{landingTab === "owner" ? "Sign in to your shop dashboard." : "Sign in to browse parts & track orders."}</div>

            {error && <div style={S.error}>{error}</div>}

            {!forgotMode && (
              <>
                <label style={S.label}>Email Address</label>
                <input className="auth-input" style={{ ...S.input, marginBottom: isModal ? 8 : 14 }} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />

                <label style={S.label}>Password</label>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <input className="auth-input" style={{ ...S.input, paddingRight: 44 }} type={showPwd ? "text" : "password"} placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && emailSignIn()} />
                  <button onClick={() => setShowPwd(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9C8C7C", cursor: "pointer", fontSize: 16 }}>{showPwd ? "🙈" : "👁"}</button>
                </div>
                <div style={{ textAlign: "right", marginBottom: isModal ? 10 : 18 }}>
                  <button onClick={() => { setForgotMode(true); setForgotEmail(email); setError(""); }} style={{ background: "none", border: "none", color: "#BE2B1A", cursor: "pointer", fontSize: 12, fontFamily: FONT.ui, fontWeight: 600 }}>Forgot password?</button>
                </div>
                <button className="btn-primary" style={{ ...S.btnPrimary(loading || googleLoading), marginBottom: isModal ? 10 : 16 }} disabled={loading || googleLoading} onClick={emailSignIn}>
                  {loading ? "Signing in…" : "Sign In →"}
                </button>
                <div style={S.divider}><div style={S.dividerLine}/><span style={S.dividerText}>OR</span><div style={S.dividerLine}/></div>
                <button className="btn-google" style={{ ...S.btnGoogle, opacity: loading || googleLoading ? 0.6 : 1, cursor: loading || googleLoading ? "not-allowed" : "pointer" }} disabled={loading || googleLoading} onClick={() => googleAuth("signin")}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  {googleLoading ? "Signing in…" : "Continue with Google"}
                </button>
              </>
            )}

            {/* Forgot password inline */}
            {forgotMode && (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1205", marginBottom: 6 }}>Reset Password</div>
                <div style={{ fontSize: 13, color: "#9C8C7C", marginBottom: 18 }}>Enter your email and we'll send a reset link.</div>
                {forgotSent ? (
                  <div style={{ background: "#F0FDF4", border: `1px solid #86EFAC`, borderRadius: 10, padding: "14px 16px", fontSize: 13 }}>
                    <div style={{ color: "#16A34A", fontWeight: 700, marginBottom: 6 }}>✅ Link sent! Check your inbox.</div>
                    <div style={{ color: "#5C4F40", lineHeight: 1.5 }}>
                      We sent a link to <strong style={{ color: "#1A1205" }}>{forgotEmail}</strong>.<br />
                      Click it to set or reset your password. Check spam if you don't see it.
                    </div>
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
            <div style={{ textAlign: "center", fontSize: 13, color: "#9C8C7C", marginTop: 24, paddingTop: 18, borderTop: `1px solid #E0D5C8` }}>
              {landingTab === "owner" ? "New shop? " : "No account? "}
              <button onClick={() => {
                setRole(landingTab === "owner" ? "shop" : "customer");
                setEmail(""); setPassword("");
                go(STEPS.REG_AUTH);
              }} style={{ background: "none", border: "none", color: "#BE2B1A", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: FONT.ui }}>
                {landingTab === "owner" ? "Register your shop →" : "Create account →"}
              </button>
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
                  style={{ padding: "20px 14px", borderRadius: 14, border: `2px solid #E0D5C8`, background: "#FFFFFF", cursor: "pointer", textAlign: "center", position: "relative", transition: "all 0.2s", boxShadow: "0 1px 4px rgba(26,18,5,0.06)" }}>
                  {role === r.key && <div style={{ position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: "50%", background: "#BE2B1A", color: "#fff", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>}
                  <div style={{ fontSize: 30, marginBottom: 10 }}>{r.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1205", marginBottom: 4 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: "#5C4F40", lineHeight: 1.4 }}>{r.desc}</div>
                </div>
              ))}
            </div>

            <button className="btn-primary" style={S.btnPrimary(!role)} disabled={!role} onClick={() => role && go(STEPS.REG_AUTH)}>
              Continue →
            </button>
          </div>
        );

      // ── Auth method for registration (email only) ─────────────────────────
      case STEPS.REG_AUTH:
        return (
          <div className="auth-card">
            <button style={S.btnBack} onClick={() => back(STEPS.LANDING)}>← Back</button>
            <div style={S.chip}>{role === "shop" ? "🏪 Register Shop" : "🚗 Customer"} · Step 1 of 3</div>
            <div style={S.heading}>{role === "shop" ? "Create Shop Account" : "Create Account"}</div>
            <div style={S.sub}>{role === "shop" ? "Set up your credentials — shop details come next." : "Quick setup — takes under a minute."}</div>

            {error && <div style={S.error}>{error}</div>}

            <label style={S.label}>Email Address</label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 12 }} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            <label style={S.label}>Password</label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input className="auth-input" style={{ ...S.input, paddingRight: 44 }} type={showPwd ? "text" : "password"} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
              <button onClick={() => setShowPwd(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9C8C7C", cursor: "pointer", fontSize: 16 }}>{showPwd ? "🙈" : "👁"}</button>
            </div>
            <label style={S.label}>Confirm Password</label>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <input className="auth-input" style={{ ...S.input, paddingRight: 44 }} type={showConfirmPwd ? "text" : "password"} placeholder="Repeat password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && emailRegister()} />
              <button onClick={() => setShowConfirmPwd(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9C8C7C", cursor: "pointer", fontSize: 16 }}>{showConfirmPwd ? "🙈" : "👁"}</button>
            </div>
            <button className="btn-primary" style={{ ...S.btnPrimary(loading || googleLoading), marginBottom: 14 }} disabled={loading || googleLoading} onClick={emailRegister}>
              {loading ? "Creating account…" : (role === "shop" ? "Continue to Shop Details →" : "Create Account →")}
            </button>
            <div style={S.divider}><div style={S.dividerLine}/><span style={S.dividerText}>OR</span><div style={S.dividerLine}/></div>
            <button className="btn-google" style={{ ...S.btnGoogle, opacity: loading || googleLoading ? 0.6 : 1, cursor: loading || googleLoading ? "not-allowed" : "pointer", marginBottom: 6 }} disabled={loading || googleLoading} onClick={() => googleAuth("register")}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              {googleLoading ? "Signing in…" : "Continue with Google"}
            </button>

            <div style={{ textAlign: "center", fontSize: 13, color: "#9C8C7C", marginTop: 6, paddingTop: 16, borderTop: `1px solid #E0D5C8` }}>
              Already have an account?{" "}
              <button onClick={() => go(STEPS.SIGNIN)} style={{ background: "none", border: "none", color: "#BE2B1A", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: FONT.ui }}>Sign in →</button>
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
                  <div style={{ height: 3, borderRadius: 4, background: i <= 1 ? "#BE2B1A" : "#E0D5C8", marginBottom: 5 }} />
                  <div style={{ fontSize: 9, color: i <= 1 ? "#BE2B1A" : "#BFB0A0", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={S.chip}>Shop Owner · Step 3 of 3</div>
            <div style={S.heading}>Tell us about your shop</div>
            <div style={S.sub}>These details let our team verify you're a legitimate retailer.</div>

            {resumeNotice && (
              <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, padding: "11px 14px", color: "#15803D", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                ✅ {resumeNotice}
              </div>
            )}
            {error && <div style={S.error}>{error}</div>}

            <label style={S.label}>Your Full Name <span style={{ color: "#DC2626" }}>*</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 14 }} placeholder="e.g. Rajesh Kumar" value={shopDetails.ownerName} onChange={e => setShopDetails(d => ({ ...d, ownerName: e.target.value }))} autoFocus />

            <label style={S.label}>Shop Name <span style={{ color: "#DC2626" }}>*</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 14 }} placeholder="e.g. Kumar Auto Parts" value={shopDetails.shopName} onChange={e => setShopDetails(d => ({ ...d, shopName: e.target.value }))} />

            <label style={S.label}>Shop Address <span style={{ color: "#DC2626" }}>*</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 14 }} placeholder="e.g. Plot 12, KPHB Colony, Kukatpally" value={shopDetails.address} onChange={e => setShopDetails(d => ({ ...d, address: e.target.value }))} />

            <label style={S.label}>City <span style={{ color: "#DC2626" }}>*</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 14 }} placeholder="e.g. Hyderabad" value={shopDetails.city} onChange={e => setShopDetails(d => ({ ...d, city: e.target.value }))} />

            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 2 }}>
                <label style={S.label}>State <span style={{ color: "#DC2626" }}>*</span></label>
                <select className="auth-input" style={{ ...S.input, cursor: "pointer" }} value={shopDetails.state} onChange={e => setShopDetails(d => ({ ...d, state: e.target.value }))}>
                  <option value="">Select state…</option>
                  {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Pincode <span style={{ color: "#DC2626" }}>*</span></label>
                <input className="auth-input" style={S.input} placeholder="500001" value={shopDetails.pincode} maxLength={6} inputMode="numeric" onChange={e => setShopDetails(d => ({ ...d, pincode: e.target.value.replace(/\D/g, "") }))} />
              </div>
            </div>

            <label style={S.label}>Shop Category <span style={{ color: "#DC2626" }}>*</span></label>
            <select className="auth-input" style={{ ...S.input, marginBottom: 14, cursor: "pointer" }} value={shopDetails.shopCategory} onChange={e => setShopDetails(d => ({ ...d, shopCategory: e.target.value }))}>
              <option value="">Select category…</option>
              <option value="AUTO_PARTS">Auto Parts Retailer</option>
              <option value="WORKSHOP">Workshop / Service Centre</option>
              <option value="BOTH">Auto Parts + Workshop</option>
              <option value="TYRES">Tyre Shop</option>
              <option value="ELECTRICAL">Auto Electrical</option>
              <option value="GENERAL">General Automotive</option>
            </select>

            <label style={S.label}>Shop Contact Number <span style={{ color: "#DC2626" }}>*</span></label>
            <div style={{ ...S.phoneRow, marginBottom: 14 }}>
              <div style={S.phoneFlag}>IN +91</div>
              <input className="auth-input" style={S.phoneInput} placeholder="98765 43210" value={shopDetails.contactPhone} maxLength={10} inputMode="numeric" onChange={e => setShopDetails(d => ({ ...d, contactPhone: e.target.value.replace(/\D/g, "") }))} />
            </div>

            <label style={S.label}>WhatsApp Number <span style={{ color: "#DC2626" }}>*</span></label>
            <div style={{ ...S.phoneRow, marginBottom: 14 }}>
              <div style={S.phoneFlag}>IN +91</div>
              <input className="auth-input" style={S.phoneInput} placeholder="98765 43210" value={shopDetails.whatsappNumber} maxLength={10} inputMode="numeric" onChange={e => setShopDetails(d => ({ ...d, whatsappNumber: e.target.value.replace(/\D/g, "") }))} />
            </div>

            <label style={S.label}>Shop Email <span style={{ color: "#DC2626" }}>*</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 14 }} type="email" placeholder="shop@example.com" value={shopDetails.email} onChange={e => setShopDetails(d => ({ ...d, email: e.target.value }))} />

            <label style={S.label}>GSTIN <span style={{ color: "#DC2626" }}>*</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 14, fontFamily: FONT.mono, letterSpacing: "1px" }} placeholder="22AAAAA0000A1Z5" value={shopDetails.gstin} maxLength={15} onChange={e => setShopDetails(d => ({ ...d, gstin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))} />

            <label style={{ ...S.label, marginBottom: 6 }}>Shop Photo <span style={{ color: "#DC2626" }}>*</span></label>
            <ShopPhotoUploader photoUrl={shopDetails.photoUrl} onUploaded={url => setShopDetails(d => ({ ...d, photoUrl: url }))} />

            {/* Repeat the error near the button — on mobile the top-of-form error is off-screen */}
            {error && (
              <div style={{ ...S.error, marginTop: 16, marginBottom: 0 }}>{error}</div>
            )}
            <button className="btn-primary" style={{ ...S.btnPrimary(loading || !shopDetails.ownerName.trim() || !shopDetails.shopName.trim() || !shopDetails.address.trim() || !shopDetails.city.trim() || shopDetails.pincode.replace(/\D/g,"").length !== 6 || shopDetails.contactPhone.length !== 10 || !shopDetails.shopCategory || shopDetails.whatsappNumber.length !== 10 || !shopDetails.email.trim() || shopDetails.gstin.length !== 15 || !shopDetails.photoUrl), marginTop: 12 }}
              disabled={loading || !shopDetails.ownerName.trim() || !shopDetails.shopName.trim() || !shopDetails.address.trim() || !shopDetails.city.trim() || shopDetails.pincode.replace(/\D/g,"").length !== 6 || shopDetails.contactPhone.length !== 10 || !shopDetails.shopCategory || shopDetails.whatsappNumber.length !== 10 || !shopDetails.email.trim() || shopDetails.gstin.length !== 15 || !shopDetails.photoUrl}
              onClick={submitShopDetails}>
              {loading ? "Submitting…" : "Submit for Verification →"}
            </button>
            <div style={{ textAlign: "center", fontSize: 12, color: "#BFB0A0", marginTop: 10 }}>
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
            {resumeNotice && (
              <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, padding: "11px 14px", color: "#15803D", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                ✅ {resumeNotice}
              </div>
            )}
            {error && <div style={S.error}>{error}</div>}
            <label style={S.label}>Full Name <span style={{ color: "#DC2626" }}>*</span></label>
            <input className="auth-input" style={{ ...S.input, marginBottom: 18 }} placeholder="e.g. Arjun Sharma" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} autoFocus />
            <label style={S.label}>I am a…</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
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

            {/* Vehicle — core to the marketplace experience */}
            <div style={{ background: "#16171e", border: "1px solid #2e2f3a", borderRadius: 10, padding: "14px 14px 10px", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c9c6c5", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                🚗 Add Your Vehicle <span style={{ fontWeight: 400, color: "#6b6b75", fontSize: 11 }}>(optional — get personalised part suggestions)</span>
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <input className="auth-input" style={{ ...S.input, flex: 1, marginBottom: 0 }} placeholder="Make (e.g. Maruti)" value={vehicle.make} onChange={e => setVehicle(v => ({ ...v, make: e.target.value }))} />
                <input className="auth-input" style={{ ...S.input, flex: 1, marginBottom: 0 }} placeholder="Model (e.g. Swift)" value={vehicle.model} onChange={e => setVehicle(v => ({ ...v, model: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="auth-input" style={{ ...S.input, flex: 1, marginBottom: 0 }} placeholder="Year (e.g. 2019)" maxLength={4} inputMode="numeric" value={vehicle.year} onChange={e => setVehicle(v => ({ ...v, year: e.target.value.replace(/\D/g,"") }))} />
                <select className="auth-input" style={{ ...S.input, flex: 1, marginBottom: 0, cursor: "pointer" }} value={vehicle.fuelType} onChange={e => setVehicle(v => ({ ...v, fuelType: e.target.value }))}>
                  <option value="">Fuel type</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="CNG">CNG</option>
                  <option value="Electric">Electric</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <button className="btn-primary" style={S.btnPrimary(loading || !profile.name.trim())} disabled={loading || !profile.name.trim()} onClick={saveProfile}>
              {loading ? "Saving…" : "Enter RedPiston →"}
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
                  <div style={{ height: 3, borderRadius: 4, background: "#BE2B1A", marginBottom: 5 }} />
                  <div style={{ fontSize: 9, color: "#BE2B1A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#FEF2F2", border: `2px solid #BE2B1A`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 20px", boxShadow: `0 0 28px rgba(190,43,26,0.18)` }}>⏳</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1A1205", marginBottom: 10 }}>Application Submitted!</div>
            <div style={{ fontSize: 14, color: "#9C8C7C", lineHeight: 1.7, marginBottom: 24, maxWidth: 340, margin: "0 auto 24px" }}>
              Your shop details are under review. We'll email you once approved — usually within <strong style={{ color: "#BE2B1A" }}>24–48 hours</strong>.
            </div>
            <div style={{ background: "#FAF6F0", border: `1px solid #E0D5C8`, borderRadius: 12, padding: "18px 20px", marginBottom: 24, textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#BE2B1A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>What happens next</div>
              {[
                { icon: "✅", label: "Account created & shop details submitted", done: true },
                { icon: "🔍", label: "Our team reviews your application (24–48 hrs)", done: false },
                { icon: "📧", label: "You receive an approval email with login link", done: false },
                { icon: "🏪", label: "Log in and start managing your shop!", done: false },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: i < 3 ? 12 : 0 }}>
                  <span style={{ fontSize: 16, flexShrink: 0, opacity: item.done ? 1 : 0.45 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: item.done ? "#1A1205" : "#9C8C7C", fontWeight: item.done ? 600 : 400, lineHeight: 1.5 }}>{item.label}</span>
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
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEF2F2", border: `2px solid #DC2626`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>✕</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1205", marginBottom: 10 }}>Application Not Approved</div>
            {rejectionMsg && (
              <div style={{ background: "#FEF2F2", border: `1px solid #FECACA`, borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: "#DC2626", lineHeight: 1.6, textAlign: "left" }}>
                <strong>Reason:</strong> {rejectionMsg}
              </div>
            )}
            <div style={{ fontSize: 13, color: "#9C8C7C", marginBottom: 24, lineHeight: 1.7 }}>
              If you believe this is a mistake, contact our support team at <strong style={{ color: "#BE2B1A" }}>support@autospaceerp.com</strong>
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
            <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e2e5", marginBottom: 20 }}>Admin Sign In</div>
            {error && <div style={S.error}>{error}</div>}
            <label style={S.label}>Admin Email</label>
            <input className="auth-input admin-input" style={{ ...S.input, marginBottom: 14 }} type="email" placeholder="admin@autospaceerp.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            <label style={S.label}>Password</label>
            <div style={{ position: "relative", marginBottom: 22 }}>
              <input className="auth-input admin-input" style={{ ...S.input, paddingRight: 44 }} type={showPwd ? "text" : "password"} placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && adminSignIn()} />
              <button onClick={() => setShowPwd(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9C8C7C", cursor: "pointer", fontSize: 16 }}>{showPwd ? "🙈" : "👁"}</button>
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

  // ─── Page layout — Stitch "Precision Industrial" split panel ────────────────
  return (
    <div style={{ display: "flex", height: isModal ? "100%" : undefined, minHeight: isModal ? 0 : "100vh", background: "#FAF6F0", fontFamily: "'Inter', sans-serif" }}>
      <style>{css}</style>

      {/* ── Left: Engine photo + branding ── */}
      <div className="auth-hero-left" style={{ width: isModal ? "45%" : "58%", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        {/* Engine photo */}
        {/* loading="lazy" + fetchpriority="low": hero image is decorative, not LCP.
            w=900 serves half the pixels vs w=1932 — panel is never wider than ~800px. */}
        <img
          src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=75&w=900"
          srcSet="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=75&w=900 900w, https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=75&w=1400 1400w"
          sizes="(max-width: 1200px) 900px, 1400px"
          alt="Precision automotive engineering"
          loading="lazy"
          fetchpriority="low"
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(15%) brightness(0.75)", display: "block" }}
          onError={e => { e.target.style.background = "#1a1c1e"; e.target.style.display = "none"; }}
        />
        {/* Overlay */}
        <div className="auth-left-overlay" />

        {/* Content */}
        <div className="auth-left-content">
          {/* Logo — top */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", border: "1.5px solid rgba(255,255,255,0.22)", flexShrink: 0, boxShadow: "0 2px 10px rgba(0,0,0,0.45)" }}>
              <img src="/logo.png" alt="RedPiston" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#e2e2e5", fontFamily: "'Plus Jakarta Sans','Inter',sans-serif", lineHeight: 1 }}>RedPiston</div>
              <div style={{ fontSize: 9, color: "#ffb4a7", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>Auto Parts Platform</div>
            </div>
          </div>

          {/* Headline — middle */}
          <div style={{ maxWidth: 380 }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: "#e2e2e5", fontFamily: "'Plus Jakarta Sans','Inter',sans-serif", lineHeight: 1.15, marginBottom: 14, letterSpacing: "-0.02em" }}>
              Precision Built for Industrial Excellence.
            </div>
            <div style={{ fontSize: 13, color: "#e3beb8", lineHeight: 1.6, maxWidth: 340 }}>
              Access India's most complete auto parts platform — inventory, billing, fitment-guaranteed marketplace, and udhaar ledger.
            </div>
          </div>

          {/* Social proof — bottom */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex" }}>
              {["#be2b1a","#282a2c","#1e2022"].map((bg, i) => (
                <div key={i} style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid #121416", background: bg, marginLeft: i > 0 ? -8 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                  {["🔧","⚙️","🚗"][i]}
                </div>
              ))}
              <div style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid #121416", background: "#be2b1a", marginLeft: -8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#ffd9d3", fontFamily: "'JetBrains Mono',monospace" }}>+2k</div>
            </div>
            <span style={{ fontSize: 11, color: "#e3beb8", fontWeight: 500 }}>Verified Industry Professionals</span>
          </div>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="auth-form-right" style={{
        flex: 1, background: "#FFFFFF",
        backgroundImage: "radial-gradient(rgba(190,43,26,0.06) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        display: "flex", flexDirection: "column",
        alignItems: "center",
        /* No justifyContent:center — it clips the top of tall forms (SHOP_DETAILS).
           The inner form container uses margin:auto to stay centered on short steps. */
        padding: isModal ? "20px 32px" : "32px 48px",
        position: "relative", overflowY: "auto",
      }}>
        {/* Live badge */}
        {!isModal && <div style={{ position: "absolute", top: 24, right: 24, display: "flex", alignItems: "center", gap: 8, background: "#FFFFFF", border: "1px solid #E0D5C8", borderRadius: 9999, padding: "6px 14px", boxShadow: "0 1px 4px rgba(26,18,5,0.06)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "block", boxShadow: "0 0 8px rgba(16,185,129,0.6)", animation: "auth-pulse 2s infinite" }} />
          <span style={{ fontSize: 10, color: "#9C8C7C", fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>Secure Access</span>
        </div>}

        {/* Mobile branding */}
        <div style={{ display: "none" }} className="auth-mobile-brand">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#be2b1a" }}>⚙</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e2e5", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>RedPiston</div>
          </div>
        </div>

        {/* Form container — margin:auto centers it vertically on short steps;
            on tall steps (SHOP_DETAILS) it scrolls normally from the top */}
        <div style={{ width: "100%", maxWidth: 400, marginTop: "auto", marginBottom: "auto", paddingTop: 24, paddingBottom: 24 }}>
          {renderStep()}
        </div>

        {/* Transition overlay — shown briefly while navigating from email form to shop details */}
        {settingUp && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, backdropFilter: "blur(3px)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 14, animation: "auth-pulse 1s infinite" }}>⚙️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#BE2B1A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Setting up your shop…</div>
              <div style={{ fontSize: 12, color: "#9C8C7C", marginTop: 6 }}>Just a moment</div>
            </div>
          </div>
        )}

        {/* Footer links — only on main auth steps, not in modal */}
        {!isModal && (step === STEPS.LANDING || step === STEPS.SIGNIN) && (
          <div style={{ width: "100%", maxWidth: 400, marginTop: 32, paddingTop: 24, borderTop: "1px solid #E0D5C8", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#9C8C7C", marginBottom: 14 }}>
              New to the platform?{" "}
              <button
                style={{ background: "none", border: "none", color: "#BE2B1A", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}
                onClick={() => go(STEPS.REG_ROLE)}
              >
                Register a Shop
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
              <span style={{ fontSize: 10, color: "#BFB0A0", fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", letterSpacing: "0.06em" }}>TERMS OF SERVICE</span>
              <span style={{ fontSize: 10, color: "#BFB0A0", fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", letterSpacing: "0.06em" }}>PRIVACY POLICY</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
