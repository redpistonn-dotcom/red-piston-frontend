/**
 * LandingPage — pixel-perfect implementation of:
 * "RedPiston Discovery - Full Version with Footer" (Stitch design)
 *
 * Approach: JSX conversion of the exact code.html from the Stitch export.
 * Every class, spacing, color and structure mirrors the design 1:1.
 */
import '../styles/landing.css';
import { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { signInWithGoogle, sendPhoneOtp, verifyPhoneOtp, isFirebaseConfigured } from '../config/firebase';
import { api, setTokens } from '../api/client';
import { getDefaultRoute } from '../components/routes';
import { AppCtx } from '../context/AppCtx';
import { fetchVehicleManufacturers, fetchVehicleModelsByManufacturer, fetchShops } from '../api/marketplace';
import { CatalogSearchBar } from '../components/CatalogSearchBar';
import { PublicHeader } from '../components/PublicHeader';
import LoginPage from './LoginPage';

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

/* ── Shop placeholder — shown when a shop has no cover photo in DB ─────────── */
function ShopImagePlaceholder({ name }: { name: string }) {
  const words = (name || '').trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (name || 'S').substring(0, 2).toUpperCase();
  return (
    <div className="w-full sm:w-56" style={{
      minHeight: 140, backgroundColor: '#2c2929',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.04em' }}>
        {initials}
      </span>
    </div>
  );
}


/* ── Fallback OEM brand list used when the manufacturers API is down ─────── */
const OEM_BRANDS_STATIC = [
  { label: 'Maruti Suzuki', color: '#003082', initial: 'MS' },
  { label: 'Hyundai',       color: '#002C5F', initial: 'HY' },
  { label: 'Toyota',        color: '#EB0A1E', initial: 'TY' },
  { label: 'Škoda',         color: '#4BA82E', initial: 'SK' },
  { label: 'Honda',         color: '#CC0000', initial: 'HN' },
  { label: 'BMW',           color: '#1C69D4', initial: 'BM' },
  { label: 'Audi',          color: '#BB0A30', initial: 'AU' },
];

/* ── Color palette cycled for dynamically fetched brands ─────────────────── */
const BRAND_PALETTE = [
  '#003082','#002C5F','#EB0A1E','#4BA82E','#CC0000',
  '#1C69D4','#BB0A30','#005CA9','#1C3764','#6C3483',
  '#117A65','#884EA0',
];


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

/* ── Auth Modal — thin wrapper around the canonical LoginPage flow ──────────
   The previous inline auth implementation here duplicated (and had drifted
   from) LoginPage: it called a non-existent /api/auth/email/login endpoint,
   never stored tokens on the shop-owner signup path, and submitted an
   incomplete shop-setup payload. All auth logic now lives in
   src/pages/LoginPage.tsx — this wrapper only provides the modal chrome. */
function AuthModal({ onClose }: { mode: 'signin' | 'signup'; onClose: () => void; initialRole?: 'customer' | 'shop' }) {
  const ctx = useContext(AppCtx);
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);

  const handleLogin = (user: any) => {
    localStorage.setItem('as_user', JSON.stringify(user));
    ctx?.handleLogin?.(user);
    onClose();
    navigate(getDefaultRoute(user), { replace: true });
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,18,5,0.6)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: 'min(92vw, 960px)', height: 'min(640px, 88vh)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(26,18,5,0.3)', border: '1px solid #E0D5C8', display: 'flex', flexDirection: 'column' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 200, width: 34, height: 34, borderRadius: '50%', background: '#FFFFFF', border: '1.5px solid #E0D5C8', color: '#5C4F40', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(26,18,5,0.15)' }}
        >✕</button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <LoginPage onLogin={handleLogin} isModal={true} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function LandingPage({ openAuth = false }: { openAuth?: boolean }) {
  useDesignFonts();
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
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
  /* ── Live data from DB ─────────────────────────────────────────────────── */
  const [shopsList,     setShopsList]     = useState<any[]>([]);
  const [oemBrands,     setOemBrands]     = useState<{ label: string; color: string; initial: string }[]>(OEM_BRANDS_STATIC);
  const [shopsLoading,  setShopsLoading]  = useState(true);

  /* Fetch nearest shops */
  useEffect(() => {
    setShopsLoading(true);
    fetchShops()
      .then((shops: any[]) => setShopsList((shops || []).slice(0, 2)))
      .catch(() => setShopsList([]))
      .finally(() => setShopsLoading(false));
  }, []);

  /* Fetch OEM brands from vehicle manufacturers table; fall back to static list */
  useEffect(() => {
    fetchVehicleManufacturers('car')
      .then((data: any[]) => {
        const brands = (data || []).slice(0, 12).map((m: any, i: number) => {
          const name: string = m.name || m.manufacturer || '';
          const words = name.trim().split(/\s+/);
          const initial = words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
          return { label: name, color: BRAND_PALETTE[i % BRAND_PALETTE.length], initial };
        });
        if (brands.length > 0) setOemBrands(brands);
      })
      .catch(() => { /* keep OEM_BRANDS_STATIC */ });
  }, []);


  // ?role=shop in the URL (from "Apply as Supplier" CTA) pre-selects Shop Owner + signup
  const urlRole = searchParams.get('role') === 'shop' ? 'shop' : undefined;
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'signin' | 'signup'; initialRole?: 'customer' | 'shop' }>({
    open: openAuth,
    mode: urlRole ? 'signup' : 'signin',
    initialRole: urlRole,
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
          initialRole={authModal.initialRole}
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
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(20px, 2.8vw, 30px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#1c1b1b' }}
            >
              Precision Parts for{' '}
              <span style={{ color: '#8b1e1e' }}>Industrial Reliability.</span>
            </h1>
            <p className="text-on-surface-variant text-title-lg mb-xl max-w-lg" style={{ color: '#58413f', fontSize: 'clamp(13px, 1.4vw, 15px)' }}>
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
                  {/* Shared select style helper */}
                  {/* Make */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#58413f', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Make</label>
                    <select
                      value={selectedMake}
                      onChange={e => {
                        const opt = e.target.options[e.target.selectedIndex];
                        setSelectedMake(e.target.value);
                        setSelectedMakeId(opt.dataset.id ? Number(opt.dataset.id) : null);
                        // reset model when make changes
                        setSelectedModel('');
                      }}
                      disabled={makesLoading}
                      style={{ width: '100%', height: 48, backgroundColor: '#fff', color: selectedMake ? '#1c1b1b' : '#8b716e', border: '1.5px solid #dfbfbc', borderRadius: 10, padding: '0 36px 0 14px', fontSize: 14, fontFamily: 'Inter, sans-serif', cursor: 'pointer', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                    >
                      <option value="">{makesLoading ? 'Loading…' : 'Select Make'}</option>
                      {makes.map(m => <option key={m.id} value={m.name} data-id={String(m.id)}>{m.name}</option>)}
                    </select>
                  </div>

                  {/* Model */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#58413f', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Model</label>
                    <select
                      value={selectedModel}
                      onChange={e => setSelectedModel(e.target.value)}
                      disabled={!selectedMakeId || modelsLoading}
                      style={{ width: '100%', height: 48, backgroundColor: '#fff', color: selectedModel ? '#1c1b1b' : '#8b716e', border: '1.5px solid #dfbfbc', borderRadius: 10, padding: '0 36px 0 14px', fontSize: 14, fontFamily: 'Inter, sans-serif', cursor: selectedMakeId ? 'pointer' : 'not-allowed', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                    >
                      <option value="">{modelsLoading ? 'Loading…' : !selectedMakeId ? 'Select Make first' : 'Select Model'}</option>
                      {models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>

                  {/* Year */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#58413f', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Year</label>
                    <select
                      value={selectedYear}
                      onChange={e => setSelectedYear(e.target.value)}
                      style={{ width: '100%', height: 48, backgroundColor: '#fff', color: selectedYear ? '#1c1b1b' : '#8b716e', border: '1.5px solid #dfbfbc', borderRadius: 10, padding: '0 36px 0 14px', fontSize: 14, fontFamily: 'Inter, sans-serif', cursor: 'pointer', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                    >
                      <option value="">Select Year</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  {/* Variant — free text */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#58413f', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Variant <span style={{ fontWeight: 400, color: '#8b716e', textTransform: 'none' }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VXI, ZXI, Petrol"
                      style={{ width: '100%', height: 48, backgroundColor: '#fff', color: '#1c1b1b', border: '1.5px solid #dfbfbc', borderRadius: 10, padding: '0 14px', fontSize: 14, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s' }}
                    />
                  </div>

                  {/* CTA — full maroon always, opacity dims when disabled */}
                  <button
                    disabled={!selectedMake}
                    onClick={() => {
                      const qp = new URLSearchParams();
                      if (selectedMake)  qp.set('make',  selectedMake);
                      if (selectedModel) qp.set('model', selectedModel);
                      if (selectedYear)  qp.set('year',  selectedYear);
                      navigate(`/marketplace?${qp.toString()}`);
                    }}
                    style={{ gridColumn: 'span 2', height: 52, backgroundColor: '#8b1e1e', color: '#fff', borderRadius: 12, marginTop: 4, fontWeight: 700, fontSize: 15, border: 'none', cursor: selectedMake ? 'pointer' : 'not-allowed', opacity: selectedMake ? 1 : 0.45, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Inter, sans-serif' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
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

          {/* Right — hero image (visible on all sizes; stacks below the selector on mobile) */}
          <div className="relative block">
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
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 16 }}>
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
                onClick={() => navigate(`/marketplace?category=${encodeURIComponent(cat.label)}`)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e2e1',
                  borderRadius: 10,
                  padding: '12px 8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  boxShadow: '0 1px 2px rgba(26,18,5,0.04)',
                  textAlign: 'center',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 3px 12px rgba(139,30,30,0.10)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 2px rgba(26,18,5,0.04)'}
              >
                {/* Icon circle */}
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(139,30,30,0.09)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, color: '#8b1e1e', lineHeight: 1 }}
                  >
                    {cat.icon}
                  </span>
                </div>
                {/* Label */}
                <span style={{
                  fontSize: 12,
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
          COMING SOON SERVICES — dark maroon band, 3×2 grid
          Matches Stitch design: "Coming Soon Services" section
      ═══════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#8b1e1e', padding: '40px 0' }}>
        <div className="max-w-7xl mx-auto px-lg">
          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h2 style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: 'clamp(18px, 2.2vw, 26px)',
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
          <div className="coming-soon-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
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
                  borderRadius: 10,
                  padding: '14px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 8,
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
                  width: 32, height: 32,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {s.isPlaceholder
                    ? <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>···</span>
                    : <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>{s.icon}</span>
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
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 16, textAlign: 'center' }}>
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
                   style={{ backgroundColor: '#fff', borderColor: '#dfbfbc', padding: 16, borderRadius: 10, width: 'clamp(120px, 28vw, 180px)', textAlign: 'center' }}>
                <span className="material-symbols-outlined text-maroon mb-md" style={{ fontSize: 26, color: '#8b1e1e', display: 'block', marginBottom: 8 }}>{s.icon}</span>
                <h4 className="font-bold" style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</h4>
                <p className="text-sm text-on-surface-variant mt-sm" style={{ fontSize: 12, color: '#58413f', marginTop: 6 }}>{s.desc}</p>
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
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 16 }}>
            Trusted Shops Near You
          </h2>
          <div className="grid lg:grid-cols-2 gap-xl">
            {shopsLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex flex-col sm:flex-row bg-surface border border-outline-variant rounded-xxl overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#dfbfbc', borderRadius: 10 }}>
                    <div className="lp-skeleton w-full sm:w-56" style={{ minHeight: 140, backgroundColor: '#f0eded', flexShrink: 0 }} />
                    <div style={{ padding: 16, flex: 1 }}>
                      <div className="lp-skeleton" style={{ height: 14, backgroundColor: '#f0eded', borderRadius: 4, marginBottom: 10, width: '60%' }} />
                      <div className="lp-skeleton" style={{ height: 10, backgroundColor: '#f0eded', borderRadius: 4, width: '40%' }} />
                    </div>
                  </div>
                ))
              : shopsList.length > 0
                ? shopsList.map((shop: any, idx: number) => {
                    const name     = shop.name || shop.shopName || 'Shop';
                    const city     = shop.city || shop.shopCity || '';
                    const address  = shop.address || shop.shopAddress || '';
                    const rating   = shop.rating != null ? Number(shop.rating).toFixed(1) : null;
                    const imageUrl = shop.imageUrl || shop.coverImage || null;
                    return (
                      <div key={shop.id || shop.shopId || idx}
                           className="flex flex-col sm:flex-row bg-surface border border-outline-variant rounded-xxl overflow-hidden hover:shadow-lg transition-all"
                           style={{ backgroundColor: '#fff', borderColor: '#dfbfbc', borderRadius: 10 }}>
                        {imageUrl
                          ? <img className="w-full sm:w-56 object-cover" src={imageUrl} alt={name} style={{ objectFit: 'cover', flexShrink: 0, maxHeight: 200 }} />
                          : <ShopImagePlaceholder name={name} />
                        }
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1c1b1b' }}>{name}</h3>
                              {rating && (
                                <div style={{ display: 'flex', alignItems: 'center', color: '#ca8a04', gap: 4 }}>
                                  <span className="material-symbols-outlined fill" style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>star</span>
                                  <span style={{ fontWeight: 700, color: '#1c1b1b', fontSize: 13 }}>{rating}</span>
                                </div>
                              )}
                            </div>
                            <p style={{ color: '#58413f', fontSize: 12, marginTop: 6 }}>
                              Authorized RedPiston Partner{city ? ` · ${city}` : ''}{address ? ` · ${address}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => navigate('/marketplace?shops=1')}
                            style={{ marginTop: 14, color: '#8b1e1e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 13 }}
                          >
                            Browse Parts
                            <Icon n="arrow_forward" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px 0', color: '#58413f' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'rgba(139,30,30,0.22)', display: 'block', marginBottom: 10 }}>store_off</span>
                    <p style={{ fontSize: 14 }}>No shops registered yet.</p>
                  </div>
                )
            }
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
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 16 }}>
            Popular OEM Brands
          </h2>
          <div className="flex gap-xl overflow-x-auto pb-lg hide-scrollbar">
            {oemBrands.map(b => (
              <div key={b.label} style={{ minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }}
                   onClick={() => navigate(`/marketplace?make=${encodeURIComponent(b.label)}`)}>
                <div
                  style={{ width: 56, height: 56, backgroundColor: b.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px ${b.color}55`, transition: 'transform 0.18s, box-shadow 0.18s', flexShrink: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 18px ${b.color}70`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 3px 10px ${b.color}55`; }}
                >
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'Poppins, sans-serif', letterSpacing: '0.04em', lineHeight: 1 }}>{b.initial}</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 12, color: '#1c1b1b', textAlign: 'center' }}>{b.label}</span>
              </div>
            ))}
          </div>

          {/* OES */}
          <h2 className="font-headline-md text-headline-md mb-xl mt-giant"
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 20, marginTop: 40 }}>
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
              <div key={b.label} style={{ minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                {/* Solid brand-color circle — no external image needed */}
                <div
                  style={{
                    width: 56, height: 56,
                    backgroundColor: b.color,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 3px 10px ${b.color}55`,
                    transition: 'transform 0.18s, box-shadow 0.18s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 18px ${b.color}70`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 3px 10px ${b.color}55`; }}
                >
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'Poppins, sans-serif', letterSpacing: '0.04em', lineHeight: 1 }}>{b.initial}</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 12, color: '#1c1b1b', textAlign: 'center' }}>{b.label}</span>
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
              style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, color: '#1c1b1b', marginBottom: 28, textAlign: 'center' }}>
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
                  borderRadius: 10,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 1px 3px rgba(26,18,5,0.05)',
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
                  width: 36, height: 36,
                  backgroundColor: 'rgba(139,30,30,0.08)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#8b1e1e' }}>{w.icon}</span>
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
                <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 16, fontWeight: 700, color: '#1c1b1b', margin: 0 }}>
                  {w.title}
                </h3>

                {/* Description */}
                <p style={{ color: '#58413f', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{w.desc}</p>

                {/* Spacer so cards stay same height */}
                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f0eded' }} />
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
            <span className="font-headline-md text-headline-md font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700 }}>
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
