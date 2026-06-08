/**
 * LandingPage — pixel-perfect implementation of:
 * "RedPiston Discovery - Full Version with Footer" (Stitch design)
 *
 * Approach: JSX conversion of the exact code.html from the Stitch export.
 * Every class, spacing, color and structure mirrors the design 1:1.
 */
import '../styles/landing.css';
import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithGoogle, sendPhoneOtp, verifyPhoneOtp, isFirebaseConfigured } from '../config/firebase';
import { api, setTokens } from '../api/client';
import { getDefaultRoute } from '../components/routes';
import { AppCtx } from '../context/AppCtx';
import { fetchVehicleManufacturers, fetchVehicleModelsByManufacturer } from '../api/marketplace';
import { CatalogSearchBar } from '../components/CatalogSearchBar';
import { PublicHeader } from '../components/PublicHeader';

/* ── Load fonts + Material Symbols exactly as the design does ──────── */
function useDesignFonts() {
  useEffect(() => {
    const links = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700;800;900&display=swap',
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
    ];
    links.forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = href;
        document.head.appendChild(l);
      }
    });
  }, []);
}

function Icon({ n, className = '' }: { n: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{n}</span>;
}

/* ── Auth Modal — fully revised ─────────────────────────────────────────────
   Fixes applied:
   ① Left panel — correct image fill, no overflow clipping, no "showing" issue
   ② Role tag   — styled badge with shimmer/pulse animation (not casual pill)
   ③ Logo       — explicit sizes, never invisible
   ④ Step 3 customer — collects Make / Model / Year / Fuel type
                       saves to POST /api/customer/garage
   Backdrop: glass blur 12px over landing page
────────────────────────────────────────────────────────────────────────── */
type AuthStep = 'role' | 'auth' | 'email-form' | 'extra-info';

/* ── Role-tag with shimmer animation ────────────────────────────────────── */
function RoleTag({ role }: { role: 'customer' | 'shop' }) {
  return (
    <>
      <style>{`
        @keyframes role-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .role-tag {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px; border-radius: 20px;
          font-size: 12px; font-weight: 700; margin-bottom: 12px;
          background-size: 200% auto;
          animation: role-shimmer 2.5s linear infinite;
        }
        .role-tag.customer {
          background-image: linear-gradient(90deg,
            rgba(22,163,74,0.12) 0%,
            rgba(22,163,74,0.28) 40%,
            rgba(22,163,74,0.12) 100%);
          border: 1.5px solid rgba(22,163,74,0.35);
          color: #166534;
        }
        .role-tag.shop {
          background-image: linear-gradient(90deg,
            rgba(139,30,30,0.09) 0%,
            rgba(139,30,30,0.22) 40%,
            rgba(139,30,30,0.09) 100%);
          border: 1.5px solid rgba(139,30,30,0.32);
          color: #8b1e1e;
        }
      `}</style>
      <div className={`role-tag ${role}`}>
        <span style={{ fontSize: 15 }}>{role === 'shop' ? '🔧' : '🛒'}</span>
        <span>{role === 'shop' ? 'Shop Owner' : 'Customer'}</span>
      </div>
    </>
  );
}

function AuthModal({ mode: initialMode, onClose }: { mode: 'signin' | 'signup'; onClose: () => void }) {
  const [step,     setStep]    = useState<AuthStep>('role');
  const [authMode, setAuthMode] = useState<'signin'|'signup'>(initialMode);
  const [role,     setRole]    = useState<'customer'|'shop'>('customer');
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const [showPw,        setShowPw]        = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  /* Email fields */
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName,        setFullName]        = useState('');
  const [terms,           setTerms]           = useState(false);
  /* Flag: user came via email form (not Google) — used to call /register in completeExtra */
  const [fromEmailForm,   setFromEmailForm]   = useState(false);

  /* Extra-info — new user after Google */
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [shopName,    setShopName]    = useState('');
  const [shopCity,    setShopCity]    = useState('');
  const [displayName, setDisplayName] = useState('');

  /* Customer vehicle details */
  const [vMake,  setVMake]  = useState('');
  const [vModel, setVModel] = useState('');
  const [vYear,  setVYear]  = useState('');
  const [vFuel,  setVFuel]  = useState('Petrol');

  const navigate = useNavigate();
  const ctx = useContext(AppCtx);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  /* Save customer vehicle to /api/customer/garage */
  const saveVehicle = async (userId: number | string) => {
    if (!vMake) return;
    try {
      await api.post('/api/customer/garage', {
        make: vMake, model: vModel || '', year: vYear ? parseInt(vYear) : null,
        fuelType: vFuel, isDefault: true,
      });
    } catch { /* non-blocking — vehicle saved locally by store below */ }
    /* Also save locally via store */
    const v = { id: `v_${Date.now()}`, makeId: '', make: vMake, modelId: '', model: vModel, year: vYear, fuelType: vFuel, registrationNumber: '', ownerId: String(userId), engineType: '', odometer: '' };
    try { ctx?.toast?.('Vehicle saved!', 'success'); } catch {}
  };

  const finishLogin = async (data: any) => {
    const user = data?.data?.user || data?.user;
    const at   = data?.data?.accessToken || data?.accessToken;
    const rt   = data?.refreshToken;
    if (!user) { setError('Unexpected server response.'); return; }
    setTokens(at, rt);
    localStorage.setItem('as_user', JSON.stringify(user));
    ctx?.handleLogin(user);
    onClose();
    navigate(getDefaultRoute(user), { replace: true });
  };

  const callFirebase = async (token: string) => {
    const data = await api.post('/api/auth/firebase', {
      firebaseToken: token,
      mode: authMode === 'signin' ? 'signin' : undefined,
      role: authMode === 'signup' ? role : undefined,
    });
    if (data?.needsShopDetails) { setPendingUser({ userId: data.userId, role: 'SHOP_OWNER' }); setStep('extra-info'); return; }
    if (data?.pending) { setError('Your shop is pending verification.'); return; }
    const userData = data?.data?.user || data?.user;
    if (data?.isNewUser && userData?.role !== 'SHOP_OWNER') {
      setPendingUser(userData);
      setTokens(data?.data?.accessToken || data?.accessToken, data?.refreshToken);
      localStorage.setItem('as_user', JSON.stringify(userData));
      setStep('extra-info'); return;
    }
    await finishLogin(data);
  };

  const googleAuth = async () => {
    setError(''); setLoading(true);
    try { const { token } = await signInWithGoogle(); await callFirebase(token); }
    catch (err: any) {
      const c = err.data?.error?.code;
      if (c === 'NO_ACCOUNT') setError("No account found. Switch to 'Create Account'.");
      else if (!err.message?.includes('popup-closed')) setError(err.data?.error?.message || err.message || 'Google sign-in failed.');
    }
    setLoading(false);
  };

  const emailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password required.'); return; }
    setError(''); setLoading(true);
    try { const data = await api.post('/api/auth/email/login', { email, password }); await finishLogin(data); }
    catch (err: any) { setError(err.data?.error?.message || err.message || 'Login failed.'); }
    setLoading(false);
  };

  const emailRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password)             { setError('Email and password are required.'); return; }
    if (password !== confirmPassword)    { setError('Passwords do not match — please re-enter.'); return; }
    if (password.length < 8)             { setError('Password must be at least 8 characters.'); return; }
    if (!terms)                          { setError('Accept the Terms of Service to continue.'); return; }
    // Passwords validated — collect extra details before actually registering
    setError('');
    setFromEmailForm(true);
    setStep('extra-info');
  };

  const completeExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const isShop = pendingUser?.role === 'SHOP_OWNER' || role === 'shop';

      // ── Email registration path: user came from email form, not Google ──────
      // We deferred the API call so we can collect name/shop details first.
      if (fromEmailForm) {
        if (isShop) {
          // Register shop owner → backend issues PENDING status
          const data = await api.post('/api/auth/register', {
            email, password,
            name: shopName || fullName,
            role: 'shop',
            shopName, city: shopCity,
          });
          await finishLogin(data);
        } else {
          // Register customer → then save vehicle if provided
          const data = await api.post('/api/auth/register', {
            email, password,
            name: displayName || fullName,
            role: 'customer',
          });
          const user = data?.data?.user || data?.user;
          // Save vehicle if the user filled it in
          if (vMake && user) await saveVehicle(user.userId || user.id || '');
          await finishLogin(data);
        }
        setLoading(false);
        return;
      }

      // ── Google registration path (pendingUser was set by callFirebase) ───────
      if (isShop) {
        const data = await api.post('/api/auth/shop-setup', { userId: pendingUser?.userId, shopName, city: shopCity });
        await finishLogin(data);
      } else {
        /* Update display name */
        if (displayName && pendingUser) {
          await api.put('/api/auth/profile/update', { name: displayName }).catch(() => {});
          const updated = { ...pendingUser, name: displayName };
          localStorage.setItem('as_user', JSON.stringify(updated));
          /* Save vehicle */
          await saveVehicle(pendingUser.userId || pendingUser.id || '');
          ctx?.handleLogin(updated);
          onClose();
          navigate(getDefaultRoute(updated), { replace: true });
        }
      }
    } catch (err: any) { setError(err.data?.error?.message || err.message || 'Setup failed.'); }
    setLoading(false);
  };

  /* ── Style tokens ─────────────────────────────────────────────────── */
  const inp: React.CSSProperties = {
    width: '100%', height: 48, border: '1.5px solid #dfbfbc',
    borderRadius: 10, backgroundColor: '#fff', color: '#1c1b1b',
    fontSize: 14, fontFamily: 'Inter,sans-serif',
    padding: '0 14px', outline: 'none', boxSizing: 'border-box',
  };
  const inpIcon: React.CSSProperties = { ...inp, paddingLeft: 40 };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#58413f', marginBottom: 5 };
  const pBtn = (dis = false): React.CSSProperties => ({
    width: '100%', height: 50, backgroundColor: dis ? '#c9bab8' : '#8b1e1e', color: '#fff',
    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
    cursor: dis ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: dis ? 'none' : '0 4px 18px rgba(139,30,30,0.28)',
  });

  const LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHoRqueT7rYQ9UU0uaqdoukDlx38GMecl-iaxA_YPsKta4MkYIh1zNn8Cq0sPsr7M4RgQ_U9qftq7c7PW05n3PYedVKG1_Cpvw5_kyltJtcea9-H5bNgTqs1NRGHFnhX112m_HSJaZ_F722rFQmkTxVmCCp4R5IZWlInV5SCBfQPTQHPO3YJFw6En0MQgRNEFl44PmMZH8bZyTjh0btvYW3gM2r1JgFZvpQS67UpJr1SYz_N81ByrPkXv3k89WFF_7n0z5A0S4BE4';

  const leftImg = authMode === 'signin'
    ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjMP3RRmsP6xZyscJ4_snDX9yiwBJ8qd2Bhv5OvpRSZR4STXir2_jeconbvWDHtvZnqrvcVpLvPBZwwus89xp6am3iaLSbh52zU4rYnxAy4IjVb5jDhEzF_5udFPkTSAcK22RhufIPIdV-ZLYCoo4G4j31QsZITvrJ8ztlS7cqqVVyjzny7qMDafsKx_LRRPm6Y7kDt8RXK4QCHEE_jG1OmDdHD5W4GLnAa3fZ-vD-ZjUpsv-DdmIZSN5zaSC_gG47jyl8WO90akQ'
    : 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSZummUzltjHPytFd98cuSOjqSpYB18b6bu2YBO10h4yuaEEZz0PleEUBxh0RUiAxy-3XmZcpZEIw_ryKI6Ag9_6pEgzra14o6-eJtXiwW9bUHYRTY-y4zak7HhZ-6v2SuklkQFWj3ESlyRRE48_Zk3jcBx-_EY-JOSTFYZxq1JVBj1b6nUlz6J7hGlUaG7FQKZ8kbg0GV9GoBphlC9KWXtEP3XwvnH1Y7rxwNJNbrway_Zb0EYLq1KkmOSDfqXNYrhgy-f3uyK9M';

  const ErrBox = () => error ? <div style={{ backgroundColor: '#ffdad6', color: '#8b1e1e', fontSize: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid #ffb3ad', marginTop: 6 }}>{error}</div> : null;
  const BackBtn = ({ to }: { to: AuthStep }) => (
    <button onClick={() => { setStep(to); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b716e', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, marginBottom: 14 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span> Back
    </button>
  );

  const MAKES = ['Maruti Suzuki','Hyundai','Toyota','Honda','Tata','Mahindra','Kia','MG','Renault','Volkswagen','Skoda','Ford','Jeep','BMW','Mercedes','Audi','Other'];
  const YEARS = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - i));
  const FUELS = ['Petrol','Diesel','CNG','Electric','Hybrid'];

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(8,6,6,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

      <div style={{ width: '100%', maxWidth: 880, display: 'flex', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.65)', maxHeight: '90vh' }}>

        {/* ── LEFT: cinematic image panel ───────────────────────── */}
        <div style={{ flex: '0 0 42%', position: 'relative', overflow: 'hidden', minHeight: 520, display: 'none' }}
             className="auth-left-panel">
          {/* WHY display:none with class: the image panel hides on very small screens
              via media query in landing.css .auth-left-panel { display: flex } at ≥700px */}
          <img src={leftImg} alt=""
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                     objectFit: 'cover', objectPosition: 'center' }} />
          {/* Gradient overlay — consistent visibility of text */}
          <div style={{ position: 'absolute', inset: 0,
            background: authMode === 'signin'
              ? 'linear-gradient(160deg, rgba(106,2,10,0.12) 0%, rgba(14,12,12,0.86) 100%)'
              : 'linear-gradient(180deg, rgba(106,2,10,0.38) 0%, rgba(14,12,12,0.92) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px 32px', color: '#fff', zIndex: 2 }}>
            {authMode === 'signin' ? (<>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,30,30,0.28)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '4px 10px', marginBottom: 14, backdropFilter: 'blur(6px)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>verified</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Enterprise Grade Infrastructure</span>
              </div>
              <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 10, letterSpacing: '-0.02em' }}>
                Precision Built for <span style={{ color: '#ffb3ad' }}>Industrial Excellence.</span>
              </h2>
              <p style={{ fontSize: 13, opacity: 0.72, lineHeight: 1.5, maxWidth: 260, marginBottom: 22 }}>Streamlining global procurement and logistics.</p>
              <div style={{ display: 'flex', gap: 20 }}>
                <div><div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 700 }}>1.2M+</div><div style={{ fontSize: 11, opacity: 0.55 }}>SKUs Managed</div></div>
                <div style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                <div><div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 700 }}>99.9%</div><div style={{ fontSize: 11, opacity: 0.55 }}>Uptime Reliability</div></div>
              </div>
            </>) : (<>
              <img src={LOGO} alt="RedPiston" style={{ height: 42, width: 'auto', objectFit: 'contain', marginBottom: 18, display: 'block' }} />
              <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 10 }}>Fueling the future of industrial fleet management.</h2>
              <p style={{ fontSize: 13, color: '#b7b8b8', lineHeight: 1.5, maxWidth: 260 }}>Join the global network of procurement leaders.</p>
            </>)}
            <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ffb3ad' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </div>
          </div>
        </div>

        {/* ── RIGHT: form panel ──────────────────────────────────── */}
        <div className="auth-right-panel" style={{ flex: 1, backgroundColor: '#fcf9f8', padding: '24px 32px 20px', display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: '50%', border: '1px solid #dfbfbc', backgroundColor: '#fff', cursor: 'pointer', fontSize: 16, color: '#8b716e', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>×</button>

          {/* Logo — explicit size so it's always visible */}
          <img src={LOGO} alt="RedPiston"
            style={{ height: 36, width: 'auto', objectFit: 'contain', marginBottom: 18, alignSelf: 'flex-start', display: 'block' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />

          {/* STEP 1 — Role selection */}
          {step === 'role' && (<>
            <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 22, fontWeight: 700, color: '#1c1b1b', marginBottom: 4 }}>
              {authMode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p style={{ fontSize: 13, color: '#58413f', marginBottom: 18 }}>How do you use RedPiston?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {([['customer','🛒','Customer','Browse & buy auto parts'],['shop','🔧','Shop Owner','Manage your parts business']] as const).map(([v,icon,title,desc]) => (
                <div key={v} onClick={() => setRole(v as 'customer'|'shop')}
                  style={{ border: `2px solid ${role === v ? '#8b1e1e' : '#dfbfbc'}`, borderRadius: 14, padding: '16px 14px', cursor: 'pointer', backgroundColor: role === v ? 'rgba(139,30,30,0.05)' : '#fff', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: role === v ? '#8b1e1e' : '#1c1b1b' }}>{title}</div>
                  <div style={{ fontSize: 12, color: '#8b716e', marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
                  {role === v && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}><div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#8b1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontSize: 9, fontWeight: 900 }}>✓</span></div><span style={{ fontSize: 11, color: '#8b1e1e', fontWeight: 600 }}>Selected</span></div>}
                </div>
              ))}
            </div>
            <button onClick={() => setStep('auth')} style={pBtn()}>
              Continue <span className="material-symbols-outlined" style={{ fontSize: 17 }}>arrow_forward</span>
            </button>
            <p style={{ fontSize: 13, color: '#8b716e', textAlign: 'center', marginTop: 14 }}>
              {authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b1e1e', fontWeight: 700, fontSize: 13 }}>
                {authMode === 'signin' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </>)}

          {/* STEP 2 — Auth method */}
          {step === 'auth' && (<>
            <BackBtn to="role" />
            <RoleTag role={role} />
            <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 700, color: '#1c1b1b', marginBottom: 4 }}>
              {authMode === 'signin' ? 'Sign in to continue' : 'Create your account'}
            </h2>
            <p style={{ fontSize: 13, color: '#58413f', marginBottom: 20 }}>
              {authMode === 'signin' ? 'Access your industrial dashboard.' : 'Join the RedPiston marketplace.'}
            </p>
            {/* Google — primary CTA */}
            <button onClick={googleAuth} disabled={loading}
              style={{ width: '100%', height: 52, border: '1.5px solid #dfbfbc', backgroundColor: '#fff', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: '#1c1b1b', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'background 0.15s' }}
              onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = '#f6f3f2')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}>
              {loading ? <><span className="rp-spinner rp-spinner-md" /> Please wait…</>
               : <><svg width="20" height="20" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/></svg>Continue with Google</>}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: '#dfbfbc' }} />
              <span style={{ fontSize: 11, color: '#8b716e', fontWeight: 600, letterSpacing: '0.06em' }}>OR</span>
              <div style={{ flex: 1, height: 1, backgroundColor: '#dfbfbc' }} />
            </div>
            <button onClick={() => setStep('email-form')}
              style={{ width: '100%', height: 46, border: '1.5px solid #dfbfbc', backgroundColor: 'transparent', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1c1b1b', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f6f3f2')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
              {authMode === 'signin' ? '📧 Sign in with Email & Password' : '📧 Register with Email & Password'}
            </button>
            <ErrBox />
            <p style={{ fontSize: 11, color: '#9c8c7c', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
              By continuing you agree to our <a href="#" style={{ color: '#8b1e1e', textDecoration: 'none', fontWeight: 600 }}>Terms</a> & <a href="#" style={{ color: '#8b1e1e', textDecoration: 'none', fontWeight: 600 }}>Privacy</a>
            </p>
          </>)}

          {/* STEP 2b — Email form */}
          {step === 'email-form' && (<>
            <BackBtn to="auth" />
            <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 700, color: '#1c1b1b', marginBottom: 16 }}>
              {authMode === 'signin' ? 'Sign in with email' : 'Create account with email'}
            </h2>
            <form onSubmit={authMode === 'signin' ? emailLogin : emailRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {authMode === 'signup' && <div><label style={lbl}>Full Name</label><input type="text" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} style={inp} /></div>}
              <div><label style={lbl}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#8b716e' }}>mail</span>
                  <input type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} style={inpIcon} required />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>Password</label>
                  {authMode === 'signin' && <a href="#" style={{ fontSize: 12, color: '#8b1e1e', textDecoration: 'none', fontWeight: 600 }}>Forgot?</a>}
                </div>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#8b716e' }}>lock</span>
                  <input type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inpIcon, paddingRight: 44 }} required />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8b716e', display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showPw ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Confirm Password — signup only */}
              {authMode === 'signup' && (
                <div>
                  <label style={lbl}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: confirmPassword && confirmPassword !== password ? '#ba1a1a' : confirmPassword === password && confirmPassword ? '#16a34a' : '#8b716e' }}>
                      {confirmPassword && confirmPassword === password ? 'lock_open' : 'lock'}
                    </span>
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      style={{
                        ...inpIcon, paddingRight: 44,
                        borderColor: confirmPassword
                          ? confirmPassword === password ? '#16a34a' : '#ba1a1a'
                          : '#dfbfbc',
                      }}
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8b716e', display: 'flex' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showConfirmPw ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {/* Live match indicator */}
                  {confirmPassword && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: confirmPassword === password ? '#16a34a' : '#ba1a1a' }}>
                        {confirmPassword === password ? 'check_circle' : 'cancel'}
                      </span>
                      <span style={{ fontSize: 11, color: confirmPassword === password ? '#16a34a' : '#ba1a1a', fontWeight: 600 }}>
                        {confirmPassword === password ? 'Passwords match' : 'Passwords do not match'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {authMode === 'signup' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} style={{ width: 15, height: 15, accentColor: '#8b1e1e', cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#58413f' }}>I agree to the <a href="#" style={{ color: '#8b1e1e', textDecoration: 'none' }}>Terms</a> and <a href="#" style={{ color: '#8b1e1e', textDecoration: 'none' }}>Privacy Policy</a></span>
                </label>
              )}
              <ErrBox />
              <button type="submit" style={pBtn(loading)} disabled={loading}>
                {loading
                  ? <><span className="rp-spinner rp-spinner-md" /> Please wait…</>
                  : authMode === 'signin'
                    ? 'Secure Login →'
                    : 'Continue to Details →'
                }
              </button>
            </form>
          </>)}

          {/* STEP 3 — Extra info */}
          {step === 'extra-info' && (<>
            {(pendingUser?.role === 'SHOP_OWNER' || role === 'shop') ? (<>
              <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 700, color: '#1c1b1b', marginBottom: 4 }}>Set up your shop</h2>
              <p style={{ fontSize: 13, color: '#58413f', marginBottom: 18 }}>Tell us about your automotive shop to complete registration.</p>
              <form onSubmit={completeExtra} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label style={lbl}>Shop Name *</label><input type="text" placeholder="e.g. Sharma Motors" value={shopName} onChange={e => setShopName(e.target.value)} style={inp} required /></div>
                <div><label style={lbl}>City</label><input type="text" placeholder="e.g. Hyderabad" value={shopCity} onChange={e => setShopCity(e.target.value)} style={inp} /></div>
                <ErrBox />
                <button type="submit" style={pBtn(loading)} disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit for Approval →'}
                </button>
              </form>
            </>) : (<>
              <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 700, color: '#1c1b1b', marginBottom: 4 }}>Almost there!</h2>
              <p style={{ fontSize: 13, color: '#58413f', marginBottom: 16 }}>Tell us about yourself and your vehicle so we can show the right parts for you.</p>
              <form onSubmit={completeExtra} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {/* Name */}
                <div><label style={lbl}>Your Name *</label><input type="text" placeholder="John Doe" value={displayName} onChange={e => setDisplayName(e.target.value)} style={inp} required /></div>
                {/* Vehicle divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: '#dfbfbc' }} />
                  <span style={{ fontSize: 11, color: '#8b716e', fontWeight: 600, letterSpacing: '0.06em' }}>YOUR VEHICLE (OPTIONAL)</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: '#dfbfbc' }} />
                </div>
                <p style={{ fontSize: 12, color: '#8b716e', margin: '-6px 0 2px' }}>We'll use this to show compatible parts for your car.</p>
                {/* Make */}
                <div>
                  <label style={lbl}>Make / Brand</label>
                  <select value={vMake} onChange={e => setVMake(e.target.value)} style={{ ...inp, padding: '0 36px 0 14px', cursor: 'pointer' }}>
                    <option value="">Select Make</option>
                    {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {/* Model + Year row — collapses to 1-col on mobile via lp-vehicle-grid */}
                <div className="lp-vehicle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>Model</label>
                    <input type="text" placeholder="e.g. Swift, Creta" value={vModel} onChange={e => setVModel(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Year</label>
                    <select value={vYear} onChange={e => setVYear(e.target.value)} style={{ ...inp, padding: '0 36px 0 14px', cursor: 'pointer' }}>
                      <option value="">Select Year</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                {/* Fuel type */}
                <div>
                  <label style={lbl}>Fuel Type</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {FUELS.map(f => (
                      <button key={f} type="button" onClick={() => setVFuel(f)}
                        style={{ height: 34, padding: '0 14px', border: `1.5px solid ${vFuel === f ? '#8b1e1e' : '#dfbfbc'}`, borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, backgroundColor: vFuel === f ? 'rgba(139,30,30,0.06)' : '#fff', color: vFuel === f ? '#8b1e1e' : '#58413f', transition: 'all 0.1s' }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <ErrBox />
                <button type="submit" style={pBtn(loading)} disabled={loading}>
                  {loading ? <><span className="rp-spinner rp-spinner-md" /> Saving…</> : 'Get Started →'}
                </button>
              </form>
            </>)}
          </>)}

          {/* Footer */}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #e5e2e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#9c8c7c' }}>© 2024 RedPiston Industrial.</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {['Privacy','Compliance','Contact'].map(l => <a key={l} href="#" style={{ fontSize: 11, color: '#9c8c7c', textDecoration: 'none' }}>{l}</a>)}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .auth-left-panel { display: flex !important; flex-direction: column; justify-content: flex-end; }
        @media (max-width: 600px) { .auth-left-panel { display: none !important; } }
        @media (max-width: 480px) {
          .auth-right-panel { padding: 20px 16px !important; }
          .auth-modal-inner { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export function LandingPage({ openAuth = false }: { openAuth?: boolean }) {
  useDesignFonts();
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const [tab, setTab] = useState<'vehicle' | 'plate'>('vehicle');

  /* ── Hero vehicle selector — fetched from DB ────────────────────── */
  const [makes,         setMakes]         = useState<{ id: number; name: string }[]>([]);
  const [models,        setModels]        = useState<{ id: number; name: string }[]>([]);
  const [selectedMake,  setSelectedMake]  = useState('');
  const [selectedMakeId,setSelectedMakeId]= useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear,  setSelectedYear]  = useState('');
  const [plateNumber,   setPlateNumber]   = useState('');
  const [makesLoading,  setMakesLoading]  = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);

  /* Fetch manufacturers on mount */
  useEffect(() => {
    setMakesLoading(true);
    fetchVehicleManufacturers('car')
      .then((data: any[]) => {
        const list = (data || []).map((m: any) => ({ id: m.manufacturerId || m.id, name: m.name || m.manufacturer }));
        setMakes(list);
      })
      .catch(() => {
        // Fallback to popular brands if API unavailable
        setMakes([
          { id: 1, name: 'Maruti Suzuki' }, { id: 2, name: 'Hyundai' },
          { id: 3, name: 'Toyota' },         { id: 4, name: 'Honda' },
          { id: 5, name: 'Tata' },           { id: 6, name: 'Mahindra' },
          { id: 7, name: 'Kia' },            { id: 8, name: 'MG' },
          { id: 9, name: 'Renault' },        { id: 10, name: 'Volkswagen' },
          { id: 11, name: 'Skoda' },         { id: 12, name: 'Ford' },
        ]);
      })
      .finally(() => setMakesLoading(false));
  }, []);

  /* Fetch models when make changes */
  useEffect(() => {
    if (!selectedMakeId) { setModels([]); setSelectedModel(''); return; }
    setModelsLoading(true);
    setSelectedModel('');
    fetchVehicleModelsByManufacturer(selectedMakeId, 'car')
      .then((data: any[]) => {
        setModels((data || []).map((m: any) => ({ id: m.modelId || m.id, name: m.name || m.model })));
      })
      .catch(() => setModels([]))
      .finally(() => setModelsLoading(false));
  }, [selectedMakeId]);

  const YEARS = Array.from({ length: 25 }, (_, i) => String(new Date().getFullYear() - i));

  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'signin' | 'signup' }>({
    open: openAuth,
    mode: 'signin',
  });

  return (
    <div
      className="lp-root bg-background text-on-surface font-body-md antialiased overflow-x-hidden"
      style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#fcf9f8' }}
    >
      {/* Auth modal — renders over the landing page, no navigation needed */}
      {authModal.open && (
        <AuthModal
          mode={authModal.mode}
          onClose={() => setAuthModal({ open: false, mode: 'signin' })}
        />
      )}

      <PublicHeader
        searchPlaceholder="Search by Part Number, VIN, or Category..."
        rightSlot={<>
          <button
            onClick={() => setAuthModal({ open: true, mode: 'signin' })}
            style={{ color: '#8b1e1e', padding: '0 16px', height: 44, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#eae7e7')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Sign In
          </button>
          <button
            onClick={() => setAuthModal({ open: true, mode: 'signup' })}
            style={{ backgroundColor: '#8b1e1e', color: '#fff', padding: '0 16px', height: 44, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Get Started
          </button>
        </>}
      />

      {/* ═══════════════════════════════════════════════════════════
          HERO — industrial dot grid, two-column layout
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-giant industrial-grid overflow-hidden">
        <div className="max-w-7xl mx-auto px-lg grid lg:grid-cols-2 gap-huge items-center">
          {/* Left */}
          <div className="z-10">
            <h1
              className="font-display-lg text-on-surface mb-md"
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#1c1b1b' }}
            >
              Precision Parts for{' '}
              <span style={{ color: '#8b1e1e' }}>Industrial Reliability.</span>
            </h1>
            <p className="text-on-surface-variant text-title-lg mb-xl max-w-lg" style={{ color: '#58413f', fontSize: 'clamp(15px, 4vw, 20px)' }}>
              Direct access to authentic OEM and OES components. Engineered for performance, delivered for speed.
            </p>

            {/* Selector Card */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xxl p-xl shadow-sm"
                 style={{ backgroundColor: '#fff', borderColor: '#dfbfbc', borderRadius: 16 }}>
              {/* Tabs */}
              <div className="flex border-b border-outline-variant mb-xl" style={{ borderColor: '#dfbfbc' }}>
                <button
                  onClick={() => setTab('vehicle')}
                  className="pb-md px-lg font-title-lg text-label-md transition-all"
                  style={{
                    color: tab === 'vehicle' ? '#8b1e1e' : '#58413f',
                    borderBottom: tab === 'vehicle' ? '2px solid #8b1e1e' : '2px solid transparent',
                    fontWeight: 600,
                  }}
                >
                  Vehicle Selector
                </button>
                <button
                  onClick={() => setTab('plate')}
                  className="pb-md px-lg font-title-lg text-label-md transition-all"
                  style={{
                    color: tab === 'plate' ? '#8b1e1e' : '#58413f',
                    borderBottom: tab === 'plate' ? '2px solid #8b1e1e' : '2px solid transparent',
                    fontWeight: 600,
                  }}
                >
                  Number Plate Search
                </button>
              </div>

              {/* ── Vehicle Selector — data fetched from DB ─────────────── */}
              {tab === 'vehicle' && (
                <div className="lp-vehicle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Make */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1c1b1b', marginBottom: 5 }}>Make</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedMake}
                        onChange={e => {
                          const opt = e.target.options[e.target.selectedIndex];
                          setSelectedMake(e.target.value);
                          setSelectedMakeId(opt.dataset.id ? Number(opt.dataset.id) : null);
                        }}
                        disabled={makesLoading}
                        style={{ width: '100%', height: 48, backgroundColor: '#fcf9f8', color: selectedMake ? '#1c1b1b' : '#8b716e', border: '1px solid #dfbfbc', borderRadius: 12, padding: '0 36px 0 12px', fontSize: 14, cursor: 'pointer', appearance: 'none', outline: 'none' }}
                      >
                        <option value="">{makesLoading ? 'Loading…' : 'Select Make'}</option>
                        {makes.map(m => <option key={m.id} value={m.name} data-id={String(m.id)}>{m.name}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#8b716e', fontSize: 16 }}>▾</span>
                    </div>
                  </div>

                  {/* Model */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1c1b1b', marginBottom: 5 }}>Model</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedModel}
                        onChange={e => setSelectedModel(e.target.value)}
                        disabled={!selectedMakeId || modelsLoading}
                        style={{ width: '100%', height: 48, backgroundColor: !selectedMakeId ? '#f0eded' : '#fcf9f8', color: selectedModel ? '#1c1b1b' : '#8b716e', border: '1px solid #dfbfbc', borderRadius: 12, padding: '0 36px 0 12px', fontSize: 14, cursor: selectedMakeId ? 'pointer' : 'not-allowed', appearance: 'none', outline: 'none' }}
                      >
                        <option value="">{modelsLoading ? 'Loading…' : !selectedMakeId ? 'Select Make first' : 'Select Model'}</option>
                        {models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#8b716e', fontSize: 16 }}>▾</span>
                    </div>
                  </div>

                  {/* Year */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1c1b1b', marginBottom: 5 }}>Year</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(e.target.value)}
                        style={{ width: '100%', height: 48, backgroundColor: '#fcf9f8', color: selectedYear ? '#1c1b1b' : '#8b716e', border: '1px solid #dfbfbc', borderRadius: 12, padding: '0 36px 0 12px', fontSize: 14, cursor: 'pointer', appearance: 'none', outline: 'none' }}
                      >
                        <option value="">Select Year</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#8b716e', fontSize: 16 }}>▾</span>
                    </div>
                  </div>

                  {/* Variant — free text since DB doesn't store variants separately */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1c1b1b', marginBottom: 5 }}>Variant <span style={{ fontWeight: 400, color: '#8b716e' }}>(optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. VXI, ZXI, Petrol"
                      style={{ width: '100%', height: 48, backgroundColor: '#fcf9f8', color: '#1c1b1b', border: '1px solid #dfbfbc', borderRadius: 12, padding: '0 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* CTA — redirects to /marketplace with vehicle filters as query params */}
                  <button
                    disabled={!selectedMake}
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (selectedMake)  params.set('make',  selectedMake);
                      if (selectedModel) params.set('model', selectedModel);
                      if (selectedYear)  params.set('year',  selectedYear);
                      navigate(`/marketplace?${params.toString()}`);
                    }}
                    style={{ gridColumn: 'span 2', height: 50, backgroundColor: selectedMake ? '#8b1e1e' : '#c9bab8', color: '#fff', borderRadius: 12, marginTop: 6, fontWeight: 700, fontSize: 14, border: 'none', cursor: selectedMake ? 'pointer' : 'not-allowed', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
                    Find Compatible Parts
                  </button>
                </div>
              )}

              {/* ── Number Plate Search ─────────────────────────────────── */}
              {tab === 'plate' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1c1b1b', marginBottom: 5 }}>Vehicle Registration Number</label>
                    {/* Plate input with Indian format styling */}
                    <div style={{ display: 'flex', border: '1.5px solid #dfbfbc', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}>
                      {/* IND flag strip */}
                      <div style={{ backgroundColor: '#003580', width: 42, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, flexShrink: 0 }}>
                        <span style={{ fontSize: 14 }}>🇮🇳</span>
                        <span style={{ fontSize: 8, color: '#fff', fontWeight: 700, letterSpacing: '0.05em' }}>IND</span>
                      </div>
                      <input
                        type="text"
                        value={plateNumber}
                        onChange={e => setPlateNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, ''))}
                        placeholder="MH 12 AB 1234"
                        maxLength={13}
                        className="lp-plate-input"
                        style={{ flex: 1, height: 52, border: 'none', outline: 'none', padding: '0 16px', fontSize: 'clamp(14px, 4vw, 20px)', fontWeight: 800, letterSpacing: 'clamp(0.08em, 1vw, 0.18em)', color: '#1c1b1b', backgroundColor: 'transparent', fontFamily: 'JetBrains Mono, Inter, monospace' }}
                      />
                    </div>
                    <p style={{ fontSize: 12, color: '#58413f', marginTop: 6 }}>
                      We'll look up your vehicle by registration and show compatible parts automatically.
                    </p>
                  </div>

                  <button
                    disabled={plateNumber.replace(/\s/g,'').length < 6}
                    style={{ width: '100%', height: 50, backgroundColor: plateNumber.replace(/\s/g,'').length >= 6 ? '#8b1e1e' : '#c9bab8', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', cursor: plateNumber.replace(/\s/g,'').length >= 6 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>manage_search</span>
                    Search Parts by Plate
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right — hero image */}
          <div className="relative hidden lg:block">
            <div className="aspect-square bg-surface-container rounded-full absolute -top-xl -right-xl w-[120%] opacity-20 blur-3xl" />
            <img
              alt="Modern Industrial Parts"
              className="rounded-xxl shadow-2xl relative z-10 w-full object-cover aspect-video border border-outline-variant"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCui7fRvDLkXBS9YG21CxcCQvGpAixGCPn_OaaeID2lNbVMnojpGWZbkdGMblEu-rIiqOjJ2a9VVFdNwiyiFqxbzKhkVdZsHGKrv8uxRuXd6RF09DP8hyGyWcLEy_X0c8NVWKCG957v01KtZgen43G1A807snJ2VG-9vdH0qYsbq_W0lzKn9dbk2UhxEj2naIIX2kb2rgTZZ-ERCNelwNYJBp0HE1UKMwua55A3v1_ct440V1bHsBFJWfmRM-lGH1Ctd_AOFw7Jd1g"
              style={{ borderRadius: 16, borderColor: '#dfbfbc' }}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          POPULAR CATEGORIES
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-huge bg-surface-container-low" style={{ backgroundColor: '#f6f3f2' }}>
        <div className="max-w-7xl mx-auto px-lg">
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 24 }}>
            Popular Categories
          </h2>
          {/* Exact layout from design: 6-column grid, white card, icon circle + label */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-lg">
            {[
              { icon: 'settings',                 label: 'Engine'     },
              { icon: 'settings_input_component', label: 'Brakes'     },
              { icon: 'bolt',                     label: 'Electrical' },
              { icon: 'architecture',             label: 'Suspension' },
              { icon: 'filter_alt',               label: 'Filters'    },
              { icon: 'ac_unit',                  label: 'Cooling'    },
            ].map(cat => (
              <div
                key={cat.label}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e2e1',
                  borderRadius: 16,
                  padding: '20px 12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  boxShadow: '0 1px 3px rgba(26,18,5,0.05)',
                  textAlign: 'center',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(139,30,30,0.12)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(26,18,5,0.05)'}
              >
                {/* Icon circle — matches design exactly */}
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(139,30,30,0.09)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 26, color: '#8b1e1e', lineHeight: 1 }}
                  >
                    {cat.icon}
                  </span>
                </div>
                {/* Label — short text, no overflow */}
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1c1b1b',
                  letterSpacing: '0.01em',
                  lineHeight: 1.2,
                }}>
                  {cat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          GLOBAL TOP SELLING PARTS
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-giant">
        <div className="max-w-7xl mx-auto px-lg">
          <div className="flex flex-wrap justify-between items-end mb-xl gap-2">
            <div>
              <h2 className="font-headline-md text-headline-md"
                  style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#1c1b1b' }}>
                Global Top Selling Parts
              </h2>
              <p style={{ color: '#58413f' }}>Authenticated OEM components sourced from tier-1 global suppliers.</p>
            </div>
            <a className="text-maroon font-bold hover:underline" href="#" style={{ color: '#8b1e1e', fontWeight: 700 }}>View All Marketplace</a>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-xl">
            {[
              { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOlwJou4Lm9VYehyDxPD6GSrcXp1SQsbDzfUUnW0U3cn8Wl7zZPHlclUzHORFL4ZIDCTpichc5D2-Wv0aGDeqMfcWEq_2M9fPjnDTwcECwoL7cfNlxRiiaWffJuWbkQa0_oduZ2eA2EejoMURv-b4oqBZk0jc5nVQpR5qsrvcgxlLb9ttHCyApdiw95089dKsrk0fry-rrxmJn6O7sSa1Y94p8yPfDWde-8wzVc4Y_-XfyRyaK6c2vyf2U5zeN6yxFuYB3FfLTIJU', alt: 'Brake Pad', badge: 'In Stock', name: 'Brembo Front Brake Pads', price: '₹8,499', desc: 'High-performance ceramic compound for superior stopping power and low dust.', meta: 'Global Logistics Hub • 2,400km away' },
              { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPSbtVcZf8MtQulEvKqd6_g1QL2kD0p8dOvN0YxCpsNLm1OiQ0EKYKihuDvvc-qzMFB5Xiyy854c0ObHSTgjFGgmp6K50aT7H1yCTO7aSOHLMosYyNv8KmCGYaglhVXqnM-k8bLC3boidchfAgzq9GwTdyaEQIPYGlqSFYWsQvY11Wa4VmCdWTtmv-25v-6sx3QZk85e07euDjkw839QtJ1kmmk3GYz3W955v9wkkQcKFyzgV3z4MfcsKfi4dPRryvRDg4kUDzhgM', alt: 'Spark Plugs', badge: null, name: 'NGK Laser Iridium Plugs', price: '₹4,650', desc: 'Advanced iridium construction for maximized fuel efficiency and durability.', meta: 'OEM Direct • 12,000km away' },
              { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXTm3hamhmwZRRFB--0oHuFTu0HgD8EVTRCeX048yM6eoD5STRTQdt18i9oVWgd3T0tS_E9ug0pOhMlLM938X4A2uQrYoi9DZ2_LIJVyvRdefdswg7BHDbWIcHWJ7bnxEOHmi7SfOi1litnm2QP8emzE4mO7waXRBmUtrWi6GIP-3WQBqfQZRmQMGjtfEiC3XXdIIw2xTmRM0IkJRi4sQ2e012iVqmpM1QBkgTSim3hT484e95caHoSYXkjOLcqndN0GFimb893Ks', alt: 'Air Filter', badge: null, name: 'Bosch PureLight Air Filter', price: '₹2,199', desc: 'Multilayer filtration technology capturing 99% of contaminants.', meta: 'Berlin Warehouse • 6,500km away' },
              { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-5uk-GIYbtK6b5b-svhCZvUWI7ZQ0TEEw_2rB7_ogIfWXDRASPps40KkOjUTh9Ko1M6_HmQqeNz_3E6V2PlfKw818YWIrMxaw6l_rkPHpMYtksRNf3cWDB3QexA1teMcUrVS0hEma-lbDKFMP5bm1AhNxkpcamNBISLCl-TKxIOttxCK-Hm1fpscxNnLNeo2sMVLJloXgKi5NB9bNjkpng9ZUwyIEx8RAqdcTPD11Aqs2DL54EpOe_3qUMw7yhvobh-AuYC2TG1c', alt: 'Engine Oil', badge: null, name: 'Castrol EDGE 5W-30', price: '₹3,699', desc: 'Advanced full synthetic oil for extreme engine performance under pressure.', meta: 'Local Distributor • 45km away' },
            ].map(p => (
              <div key={p.name} className="bg-surface border border-outline-variant rounded-xxl overflow-hidden hover:shadow-md transition-all"
                   style={{ backgroundColor: '#fff', borderColor: '#dfbfbc', borderRadius: 16 }}>
                <div className="h-48 relative" style={{ height: 192, position: 'relative' }}>
                  <img alt={p.alt} className="w-full h-full object-cover" src={p.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {p.badge && (
                    <span className="absolute top-md right-md bg-green-100 text-green-800 px-sm py-1 rounded text-xs font-bold uppercase tracking-wider"
                          style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="p-lg" style={{ padding: 16 }}>
                  <div className="flex justify-between items-start mb-sm" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3 className="font-title-lg text-label-md line-clamp-1" style={{ fontSize: 14, fontWeight: 600, color: '#1c1b1b' }}>{p.name}</h3>
                    <span className="font-black text-maroon" style={{ fontWeight: 900, color: '#8b1e1e', marginLeft: 8, whiteSpace: 'nowrap' }}>{p.price}</span>
                  </div>
                  <p className="text-on-surface-variant text-label-md line-clamp-2 mb-md" style={{ color: '#58413f', fontSize: 14, marginBottom: 12 }}>{p.desc}</p>
                  <div className="flex items-center gap-xs text-xs text-on-surface-variant border-t border-outline-variant pt-md mt-md"
                       style={{ display: 'flex', alignItems: 'center', gap: 4, borderTop: '1px solid #dfbfbc', paddingTop: 12, marginTop: 12, fontSize: 12, color: '#58413f' }}>
                    <Icon n="store" className="" style={{ fontSize: 16 } as React.CSSProperties} />
                    <span>{p.meta}</span>
                  </div>
                  {/* Outline button — matches design exactly */}
                  <button
                    className="w-full mt-lg h-[40px] border border-maroon text-maroon font-bold rounded-lg hover:bg-maroon hover:text-white transition-all"
                    style={{ width: '100%', marginTop: 16, height: 40, border: '1px solid #8b1e1e', color: '#8b1e1e', backgroundColor: 'transparent', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#8b1e1e'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#8b1e1e'; }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TRENDING NEAR YOU — white cards, matches screenshot
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-giant" style={{ backgroundColor: '#fcf9f8' }}>
        <div className="max-w-7xl mx-auto px-lg">
          {/* Header row */}
          <div className="lp-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#1c1b1b', margin: '0 0 4px' }}>
                Trending Near You
              </h2>
              <p style={{ color: '#58413f', fontSize: 14, margin: 0 }}>
                High-demand items available for same-day pickup in your region.
              </p>
            </div>
            {/* Location chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: '#fff', border: '1px solid #dfbfbc',
              borderRadius: 9999, padding: '7px 14px',
              boxShadow: '0 1px 3px rgba(26,18,5,0.06)',
              flexShrink: 0, marginLeft: 16,
            }}>
              <Icon n="location_on" style={{ fontSize: 16, color: '#8b1e1e' } as React.CSSProperties} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1c1b1b', whiteSpace: 'nowrap' }}>Hyderabad, TS</span>
            </div>
          </div>

          {/* 3-column product cards — exact match to screenshot */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
            {[
              {
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNzvgZbtt0-WMxiMPt9NVAb1j32_dfm2tXCU08wa3XFS7KCYd4MqR9tVczihi5eS0ZLbBe8gqtro81Nhpekw3aZXASamj9jg85y4Xt7CprJUPMm4rP9nnUYvIFBFws-qqeASe8PRBVJ-FwRTKeqd5VS1NLpPQJhcs9xvRtUSFlVIruKJWXXZOngbrT0rxJAQmBtClV92bPXfG2LO39yEQg2cwUbl-HYo9bwMhKC_TxsdzvUK8YPimXj7g5xeJ6n_p56wOS3O2oN0Q',
                badge: '8 IN STOCK',
                name: 'Michelin Pilot Sport 4',
                price: '₹14,299',
                desc: 'Superior grip and steering response on both wet and dry pavement.',
                pickup: 'Local Pickup • 4.2 miles away',
              },
              {
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeha2cuXVLgQtqAYKu1vWQCNdhdI4ERIb0wSewhORpZ3yRKBPwEOvAzjnkwKI2H9GI2K-hjPDgkO4NxuZ6mBubVHGQkSWVL5IjGyMe8KAh6QFpYA5mhQvFM1NtmPgU4M3gRbiWVTGQPxSBxExXi0TcSs8sScFR7OljwCo4LUjmBrrD6j9LQiR153omncNBpgrFQ4Hom6HZVy_bgVt2U0XOHUrN0a2220aNwKD_ipiFubNRn0d0eOq3NipfPZONQfAGRqqrpK8UYRU',
                badge: '14 IN STOCK',
                name: 'Philips LED H4 Bulbs',
                price: '₹5,799',
                desc: 'Ultinon Essential LED provides a modern high-end look and high brightness.',
                pickup: 'Local Pickup • 2.8 miles away',
              },
              {
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4fPF_rKOpa9xTAZMOjck5SI12nnY5U-bmgUi2qawldmYfqGs9wuQu98X55LkpvhtTf4W_kgLTa2Vs60TBfBm0wsFIjXCmcD89Dap_KVRme6EYSwnfXjiFOsFAuTL5T7nUcwBfXu_ZNcQ0n98we6S5OuhxnBLSmezYQPFcWKjZO_4l637iEPcYLHqTXYq52vILsTjsSEuMGVGj4-RfKq8_KnFgTR8e7m5MYOU1DJG75kFVRiMw7xLJOPvVds80PQUKCYC5ZFUMd8M',
                badge: '3 IN STOCK',
                name: 'Exide Matrix Battery',
                price: '₹9,849',
                desc: 'Zero maintenance battery with high performance and long life.',
                pickup: 'Local Pickup • 1.5 miles away',
              },
            ].map(t => (
              <div
                key={t.name}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e2e1',
                  borderRadius: 12,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 1px 4px rgba(26,18,5,0.06)',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(26,18,5,0.1)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(26,18,5,0.06)'}
              >
                {/* Image + IN STOCK badge */}
                <div style={{ position: 'relative' }}>
                  <img
                    src={t.img}
                    alt={t.name}
                    style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                  />
                  <span style={{
                    position: 'absolute', top: 10, right: 10,
                    backgroundColor: '#16a34a', color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    padding: '3px 8px', borderRadius: 4,
                    letterSpacing: '0.05em',
                  }}>
                    {t.badge}
                  </span>
                </div>

                {/* Card body */}
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Name + Price row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1c1b1b', lineHeight: 1.3 }}>{t.name}</span>
                    <span style={{ fontWeight: 900, fontSize: 15, color: '#8b1e1e', whiteSpace: 'nowrap' }}>{t.price}</span>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: 13, color: '#58413f', lineHeight: 1.5, margin: 0 }}>{t.desc}</p>

                  {/* Pickup info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Icon n="local_shipping" style={{ fontSize: 15, color: '#58413f' } as React.CSSProperties} />
                    <span style={{ fontSize: 12, color: '#58413f' }}>{t.pickup}</span>
                  </div>

                  {/* Add to Cart button — full-width maroon */}
                  <button
                    style={{
                      marginTop: 8,
                      width: '100%', height: 40,
                      backgroundColor: '#8b1e1e', color: '#fff',
                      border: 'none', borderRadius: 8,
                      fontWeight: 700, fontSize: 14,
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          COMING SOON SERVICES — dark maroon band, 3×2 grid
          Matches Stitch design: "Coming Soon Services" section
      ═══════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#8b1e1e', padding: '64px 0' }}>
        <div className="max-w-7xl mx-auto px-lg">
          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 700,
              color: '#fff',
              marginBottom: 12,
              letterSpacing: '-0.01em',
            }}>
              Coming Soon Services
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.72)',
              fontSize: 'clamp(13px, 2vw, 15px)',
              maxWidth: 480,
              margin: '0 auto',
              lineHeight: 1.6,
            }}>
              Expert automotive services and maintenance hubs located in your immediate vicinity.
              Verified technical standards.
            </p>
          </div>

          {/* 3-column grid → 2-col tablet → 1-col mobile */}
          <div className="coming-soon-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              {
                icon: 'local_car_wash',
                emoji: '🚗',
                title: 'Car Washing',
                desc: 'Professional exterior and interior steam cleaning',
              },
              {
                icon: 'auto_fix_high',
                emoji: '✨',
                title: 'Detailing Studios',
                desc: 'Ceramic coating and paint protection specialists',
              },
              {
                icon: 'shopping_bag',
                emoji: '🛍',
                title: 'Car & Bike Accessories',
                desc: 'Premium styling and comfort modifications',
              },
              {
                icon: 'two_wheeler',
                emoji: '🏍',
                title: 'Bike Spare Parts',
                desc: 'OEM components for two-wheeler performance',
              },
              {
                icon: 'build',
                emoji: '⚙️',
                title: 'Customisation & Upgrade Parts',
                desc: 'Bespoke performance tuning and body kits',
              },
              {
                icon: 'more_horiz',
                emoji: '···',
                title: 'More Automotive Services Coming Soon...',
                desc: '',
                isPlaceholder: true,
              },
            ].map(s => (
              <div
                key={s.title}
                style={{
                  backgroundColor: s.isPlaceholder ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)',
                  border: `1px solid ${s.isPlaceholder ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.16)'}`,
                  borderRadius: 14,
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 10,
                  cursor: s.isPlaceholder ? 'default' : 'pointer',
                  transition: 'background 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  if (!s.isPlaceholder) {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.15)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = s.isPlaceholder ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 48, height: 48,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {s.isPlaceholder
                    ? <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>···</span>
                    : <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#fff' }}>{s.icon}</span>
                  }
                </div>

                {/* Title */}
                <span style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  color: s.isPlaceholder ? 'rgba(255,255,255,0.45)' : '#fff',
                  lineHeight: 1.3,
                }}>
                  {s.title}
                </span>

                {/* Description */}
                {s.desc && (
                  <span style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.60)',
                    lineHeight: 1.5,
                  }}>
                    {s.desc}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SERVICES NEAR YOU — industrial grid background
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-giant industrial-grid">
        <div className="max-w-7xl mx-auto px-lg">
          <h2 className="font-headline-md text-headline-md mb-xl text-center"
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 24, textAlign: 'center' }}>
            Services Near You
          </h2>
          <div className="flex flex-wrap justify-center gap-lg">
            {[
              { icon: 'description',   title: 'PUC Info',        desc: 'Emission compliance checks nearby' },
              { icon: 'info',          title: 'Car Info',        desc: 'Ownership and insurance data' },
              { icon: 'garage_home',   title: 'Garage',          desc: 'Top rated mechanics close by' },
              { icon: 'local_car_wash',title: 'Washing Center',  desc: 'Professional detailing services' },
              { icon: 'hail',          title: 'Towing',          desc: '24/7 emergency recovery' },
            ].map(s => (
              <div key={s.title}
                   className="bg-surface border border-outline-variant p-xl rounded-xxl shadow-sm text-center hover:border-maroon transition-all cursor-pointer"
                   style={{ backgroundColor: '#fff', borderColor: '#dfbfbc', padding: 24, borderRadius: 16, width: 'clamp(160px, 40vw, 224px)', textAlign: 'center' }}>
                <span className="material-symbols-outlined text-maroon mb-md" style={{ fontSize: 48, color: '#8b1e1e', display: 'block', marginBottom: 12 }}>{s.icon}</span>
                <h4 className="font-bold" style={{ fontWeight: 700 }}>{s.title}</h4>
                <p className="text-sm text-on-surface-variant mt-sm" style={{ fontSize: 14, color: '#58413f', marginTop: 8 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TRUSTED SHOPS NEAR YOU
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-huge bg-surface-container-low" style={{ backgroundColor: '#f6f3f2' }}>
        <div className="max-w-7xl mx-auto px-lg">
          <h2 className="font-headline-md text-headline-md mb-xl"
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 24 }}>
            Trusted Shops Near You
          </h2>
          <div className="grid lg:grid-cols-2 gap-xl">
            {[
              { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjMF9hu5XyoPROfLCSDYKJ7WVw5l1cZoOTB5_ZFK_c4W-fv4ta5e4XqCf-nfiuiGup936q9P1TkzYPBXNMnvwQYfSSBbBxrzk_4os0oapj8jWPZmEzpAD1Tu5F_5tqF_n3k22FRhv4PpF9iO0b5FQRlRFrnb9KkffIhX8hOghV1AjNq0zwBvtqv28qdVcw8U5jIsIXFHd6G-dx1z0p613uKfBHBYmR1AAkKnScvgXpVQsTNXaOWZFDnWLrYMjCMKgOLBbYbgMY5dg', name: 'Elite Automotive Solutions', rating: '4.9', dist: '1.2 miles away', tags: ['Engine Repair','Diagnostics','OEM Spares'], cta: 'Book an Appointment' },
              { img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxvyBJDw8Rbgq_si3vplJBpgVpeNHLwgS1X6lX4FjpmF6_6_9PRaGT_pDkpLDSQK1RnOmGq4u0ipcu8FYFidpoOk7D_365uxjESF2J70wSHfxNCyIGtyb6ZHDnNIQmLbtcAoQE2Be0qf_XpTKMXJmbgRNBOGiEX5NNQf0xSQa77IVMJ_lPY43KPkoZzd3w1hFXpizvouvsYzgcL0qAIjufTEw2hFw-MEqN6diQXVAUJg_p1TFD5i_07sltrUODfV0a6umd2hHHn4Q', name: 'Speedy Gear Spares', rating: '4.7', dist: '3.5 miles away', tags: ['Transmission','Electrical'], cta: 'Contact Vendor' },
            ].map(shop => (
              <div key={shop.name}
                   className="flex flex-col sm:flex-row bg-surface border border-outline-variant rounded-xxl overflow-hidden hover:shadow-lg transition-all"
                   style={{ backgroundColor: '#fff', borderColor: '#dfbfbc', borderRadius: 16 }}>
                <img className="w-full sm:w-64 object-cover" src={shop.img}
                     style={{ objectFit: 'cover', flexShrink: 0 }} />
                <div className="p-xl flex flex-col justify-between" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 className="font-bold text-xl" style={{ fontSize: 20, fontWeight: 700, color: '#1c1b1b' }}>{shop.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', color: '#ca8a04', gap: 4 }}>
                        <span className="material-symbols-outlined fill" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="font-bold text-on-surface" style={{ fontWeight: 700, color: '#1c1b1b' }}>{shop.rating}</span>
                      </div>
                    </div>
                    <p className="text-on-surface-variant text-sm mt-sm" style={{ color: '#58413f', fontSize: 14, marginTop: 8 }}>Authorized RedPiston Partner · {shop.dist}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {shop.tags.map(t => (
                        <span key={t} style={{ backgroundColor: '#f0eded', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="mt-xl text-maroon font-bold flex items-center gap-sm group"
                    style={{ marginTop: 24, color: '#8b1e1e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}
                  >
                    {shop.cta}
                    <Icon n="arrow_forward" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          BRAND CAROUSELS
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-huge overflow-hidden">
        <div className="max-w-7xl mx-auto px-lg">
          {/* OEM */}
          <h2 className="font-headline-md text-headline-md mb-xl"
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 24 }}>
            Popular OEM Brands
          </h2>
          <div className="flex gap-xl overflow-x-auto pb-lg hide-scrollbar">
            {[
              { alt: 'Maruti',  logo: 'https://logo.clearbit.com/marutisuzuki.com', label: 'Maruti Suzuki', color: '#003082', initial: 'MS' },
              { alt: 'Hyundai', logo: 'https://logo.clearbit.com/hyundai.com',       label: 'Hyundai',       color: '#002C5F', initial: 'HY' },
              { alt: 'Toyota',  logo: 'https://logo.clearbit.com/toyota.com',        label: 'Toyota',        color: '#EB0A1E', initial: 'TY' },
              { alt: 'Skoda',   logo: 'https://logo.clearbit.com/skoda-auto.com',    label: 'Škoda',         color: '#4BA82E', initial: 'SK' },
              { alt: 'Honda',   logo: 'https://logo.clearbit.com/honda.com',         label: 'Honda',         color: '#CC0000', initial: 'HN' },
              { alt: 'BMW',     logo: 'https://logo.clearbit.com/bmw.com',           label: 'BMW',           color: '#1C69D4', initial: 'BM' },
              { alt: 'Audi',    logo: 'https://logo.clearbit.com/audi.com',          label: 'Audi',          color: '#BB0A30', initial: 'AU' },
            ].map(b => (
              <div key={b.label} className="min-w-[140px] flex flex-col items-center gap-md" style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ width: 96, height: 96, backgroundColor: '#fff', border: '1.5px solid #dfbfbc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxShadow: '0 2px 8px rgba(26,18,5,0.07)', transition: 'box-shadow 0.2s, transform 0.2s' }}
                     onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(139,30,30,0.14)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                     onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(26,18,5,0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}>
                  <img alt={b.alt} src={b.logo} style={{ width: 64, height: 64, objectFit: 'contain', display: 'block' }}
                       onError={e => {
                         const img = e.currentTarget;
                         img.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="${b.color}18"/><text x="32" y="40" text-anchor="middle" font-size="18" font-weight="800" font-family="Poppins,sans-serif" fill="${b.color}">${b.initial}</text></svg>`)}`;
                       }}
                  />
                </div>
                <span className="font-bold" style={{ fontWeight: 700, fontSize: 14, color: '#1c1b1b' }}>{b.label}</span>
              </div>
            ))}
          </div>

          {/* OES */}
          <h2 className="font-headline-md text-headline-md mb-xl mt-giant"
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 24, marginTop: 64 }}>
            Popular OES Brands
          </h2>
          <div className="flex gap-xl overflow-x-auto pb-lg hide-scrollbar">
            {[
              { alt: 'Bosch',   logo: 'https://logo.clearbit.com/bosch.com',    label: 'Bosch',    color: '#EA0016', initial: 'BS' },
              { alt: 'Castrol', logo: 'https://logo.clearbit.com/castrol.com',  label: 'Castrol',  color: '#00693C', initial: 'CS' },
              { alt: 'Brembo',  logo: 'https://logo.clearbit.com/brembo.com',   label: 'Brembo',   color: '#C8102E', initial: 'BR' },
              { alt: 'Valeo',   logo: 'https://logo.clearbit.com/valeo.com',    label: 'Valeo',    color: '#005CA9', initial: 'VA' },
              { alt: 'ZF',      logo: 'https://logo.clearbit.com/zf.com',       label: 'ZF Group', color: '#1C3764', initial: 'ZF' },
            ].map(b => (
              <div key={b.label} className="min-w-[140px] flex flex-col items-center gap-md" style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ width: 96, height: 96, backgroundColor: '#fff', border: '1.5px solid #dfbfbc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxShadow: '0 2px 8px rgba(26,18,5,0.07)', transition: 'box-shadow 0.2s, transform 0.2s' }}
                     onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(139,30,30,0.14)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                     onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(26,18,5,0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}>
                  <img alt={b.alt} src={b.logo} style={{ width: 64, height: 64, objectFit: 'contain', display: 'block' }}
                       onError={e => {
                         const img = e.currentTarget;
                         img.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="${b.color}18"/><text x="32" y="40" text-anchor="middle" font-size="18" font-weight="800" font-family="Poppins,sans-serif" fill="${b.color}">${b.initial}</text></svg>`)}`;
                       }}
                  />
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1c1b1b' }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHY CHOOSE US
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-giant bg-surface-container-low"
               style={{ backgroundColor: '#f6f3f2' }}>
        <div className="max-w-7xl mx-auto px-lg">
          <h2 className="text-center mb-huge"
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 48, textAlign: 'center' }}>
            Why Choose Us
          </h2>
          <div className="grid md:grid-cols-3 gap-xl">
            {[
              {
                icon: 'verified',
                title: 'Verified Quality',
                desc: 'Every part in our marketplace is vetted for authenticity and structural integrity. No compromises on performance.',
                badge: '100% Authentic',
              },
              {
                icon: 'speed',
                title: 'Industrial Speed',
                desc: 'Advanced logistics network ensuring your production line or vehicle never stays idle. Real-time tracking included.',
                badge: 'Next Day Delivery',
              },
              {
                icon: 'shield_with_heart',
                title: 'Deep Trust',
                desc: 'Used by thousands of procurement officers and professional mechanics worldwide for mission-critical supply chains.',
                badge: '50,000+ Partners',
              },
            ].map(w => (
              <div
                key={w.title}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #dfbfbc',
                  borderRadius: 16,
                  padding: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxShadow: '0 1px 4px rgba(26,18,5,0.06)',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(139,30,30,0.12)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(26,18,5,0.06)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Icon circle */}
                <div style={{
                  width: 56, height: 56,
                  backgroundColor: 'rgba(139,30,30,0.08)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#8b1e1e' }}>{w.icon}</span>
                </div>

                {/* Badge */}
                <span style={{
                  display: 'inline-block',
                  backgroundColor: 'rgba(139,30,30,0.08)',
                  color: '#8b1e1e',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: 9999,
                  width: 'fit-content',
                }}>
                  {w.badge}
                </span>

                {/* Title */}
                <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 700, color: '#1c1b1b', margin: 0 }}>
                  {w.title}
                </h3>

                {/* Description */}
                <p style={{ color: '#58413f', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{w.desc}</p>

                {/* Bottom accent line */}
                <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #f0eded', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#8b1e1e' }}>arrow_forward</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#8b1e1e' }}>Learn more</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FOOTER — dark background
      ═══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-outline-variant text-white" style={{ backgroundColor: '#1c1b1b', borderTop: '1px solid #dfbfbc', color: '#fff' }}>
        <div className="max-w-7xl mx-auto px-lg py-xl flex flex-col md:flex-row justify-between items-start gap-lg">
          <div className="max-w-sm">
            <span className="font-headline-md text-headline-md font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontSize: 28, fontWeight: 700 }}>
              <span style={{ color: '#8b1e1e' }}>RED</span>
              <span style={{ color: '#fff' }}>PISTON</span>
            </span>
            <p className="mt-md font-body-md text-body-md" style={{ marginTop: 12, color: '#fff', opacity: 0.8, lineHeight: 1.6 }}>
              The world's leading industrial commerce platform for automotive components, providing enterprise-grade reliability to the aftermarket.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-huge">
            {/* Solutions column — links are real routes; Company/Support are placeholders */}
            <div className="flex flex-col gap-sm">
              <h5 style={{ color: '#fff', fontWeight: 700 }}>Solutions</h5>
              {([
                { label: 'Marketplace',  href: '/marketplace' },
                { label: 'OEM Parts',    href: '/marketplace?type=oem' },
                { label: 'Suppliers',    href: '/suppliers' },
              ] as { label: string; href: string }[]).map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={e => { e.preventDefault(); navigate(link.href); }}
                  style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecoration: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                >{link.label}</a>
              ))}
            </div>
            {[
              { h: 'Company', links: ['Contact Us','Legal Details','Privacy Policy'] },
              { h: 'Support', links: ['Help Center','Shipping','Returns'] },
            ].map(col => (
              <div key={col.h} className="flex flex-col gap-sm">
                <h5 className="font-bold text-white" style={{ color: '#fff', fontWeight: 700 }}>{col.h}</h5>
                {col.links.map(l => (
                  <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecoration: 'none' }}>{l}</a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-lg py-lg border-t flex flex-wrap justify-between items-center gap-2"
             style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fff', fontSize: 14 }}>© 2024 RedPiston Industrial. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 16 }}>
            <span className="material-symbols-outlined cursor-pointer" style={{ color: '#fff', cursor: 'pointer', fontSize: 24 }}>language</span>
            <span className="material-symbols-outlined cursor-pointer" style={{ color: '#fff', cursor: 'pointer', fontSize: 24 }}>share</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;
