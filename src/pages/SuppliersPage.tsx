/**
 * SuppliersPage — verified automotive parts suppliers directory.
 * Fully responsive: 320px → 1440px+
 *
 * Supplier cards are loaded from the DB via fetchShops().
 * When a shop has no cover photo, initials are shown on a dark background
 * (same pattern as the OEM brand circles on the landing page).
 */
import '../styles/landing.css';
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketplaceFonts } from '../hooks/useMarketplaceFonts';
import { PublicHeader } from '../components/PublicHeader';
import { ProfileDropdown } from '../components/ProfileDropdown';
import { AppCtx } from '../context/AppCtx';
import { fetchShops } from '../api/marketplace';

const BENEFITS = [
  { emoji: '🔒', title: 'Background Verified',  desc: 'All suppliers undergo thorough KYC and stock verification before listing' },
  { emoji: '🚀', title: 'Fast Shipping',         desc: 'Average delivery of 2-3 business days across major Indian cities' },
  { emoji: '💰', title: 'Competitive Pricing',   desc: 'Best price guarantee with fully transparent fee structure' },
  { emoji: '🎧', title: 'Dedicated Support',     desc: '24/7 supplier coordination and dispute resolution team' },
];

/** Initials placeholder shown when a shop has no cover photo */
function ShopImagePlaceholder({ name }: { name: string }) {
  const words = (name || '').trim().split(/\s+/);
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : (name || 'S').substring(0, 2).toUpperCase();
  return (
    <div
      className="sp-supplier-img"
      style={{
        width: 200, minHeight: 160, backgroundColor: '#2c2929',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.04em' }}>
        {initials}
      </span>
    </div>
  );
}

/** Single skeleton card while shops are loading */
function SupplierCardSkeleton() {
  return (
    <div className="sp-supplier-card" style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 16, overflow: 'hidden', display: 'flex' }}>
      <div className="lp-skeleton sp-supplier-img" style={{ width: 200, minHeight: 160, backgroundColor: '#f0eded', flexShrink: 0 }} />
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <div className="lp-skeleton" style={{ height: 18, width: '50%', backgroundColor: '#f0eded', borderRadius: 4, marginBottom: 10 }} />
        <div className="lp-skeleton" style={{ height: 13, width: '30%', backgroundColor: '#f0eded', borderRadius: 4, marginBottom: 14 }} />
        <div className="lp-skeleton" style={{ height: 12, width: '80%', backgroundColor: '#f0eded', borderRadius: 4, marginBottom: 8 }} />
        <div className="lp-skeleton" style={{ height: 12, width: '65%', backgroundColor: '#f0eded', borderRadius: 4 }} />
      </div>
    </div>
  );
}

export function SuppliersPage() {
  useMarketplaceFonts();
  const navigate = useNavigate();
  const ctx = useContext(AppCtx);
  const currentUser = ctx?.currentUser ?? null;
  const onLogout = ctx?.handleLogout;

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [suppLoading, setSuppLoading] = useState(true);

  useEffect(() => {
    setSuppLoading(true);
    fetchShops()
      .then((shops: any[]) => setSuppliers(shops || []))
      .catch(() => setSuppliers([]))
      .finally(() => setSuppLoading(false));
  }, []);

  return (
    <div className="lp-root" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#fcf9f8', minHeight: '100vh' }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <PublicHeader
        searchPlaceholder="Search parts by brand, OEM number…"
        rightSlot={
          currentUser ? (
            /* Logged in — "Browse Parts" action + profile dropdown (logout/profile) */
            <>
              <button
                onClick={() => navigate('/marketplace')}
                style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }}
              >
                Browse Parts
              </button>
              <ProfileDropdown user={currentUser} onLogout={onLogout} />
            </>
          ) : (
            /* Not logged in — match landing page header */
            <>
              <button
                onClick={() => navigate('/login')}
                style={{ color: '#8b1e1e', padding: '0 16px', height: 44, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 14, transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#eae7e7')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/login')}
                style={{ backgroundColor: '#8b1e1e', color: '#fff', padding: '0 16px', height: 44, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Get Started
              </button>
            </>
          )
        }
      />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(160deg, #1c1b1b 0%, #313030 100%)', color: '#fff', padding: '56px 20px' }}>
        {/* sp-hero-inner: flex-row on desktop, column on mobile */}
        <div className="sp-hero-inner" style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 40 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139,30,30,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 16px', marginBottom: 20 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffb3ad' }}>Verified Supplier Network</span>
            </div>
            {/* Responsive headline */}
            <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(26px, 6vw, 44px)', fontWeight: 800, lineHeight: 1.2, margin: '0 0 16px' }}>
              Trusted Parts<br />Suppliers Network
            </h1>
            <p style={{ fontSize: 'clamp(14px, 3vw, 16px)', opacity: 0.78, maxWidth: 460, lineHeight: 1.7, marginBottom: 28 }}>
              Connect with 500+ verified OEM and OES parts suppliers across India. Real-time inventory, competitive pricing, and guaranteed authenticity.
            </p>
            {/* lp-cta-row: wraps on narrow screens */}
            <div className="lp-cta-row" style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => document.getElementById('featured-suppliers')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 44 }}>
                Browse Suppliers
              </button>
              <button
                onClick={() => navigate('/login?role=shop')}
                style={{ backgroundColor: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '13px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer', minHeight: 44 }}>
                Become a Supplier →
              </button>
            </div>
          </div>

          {/* Stat grid — full-width on mobile */}
          <div className="sp-stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flexShrink: 0 }}>
            {[['500+','Verified Suppliers'],['50k+','SKUs Listed'],['₹2Cr+','Monthly GMV'],['99.2%','Order Accuracy']].map(([n, l]) => (
              <div key={l} style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '18px 20px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: '#ffb3ad' }}>{n}</div>
                <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUPPLIER CARDS ──────────────────────────────────────── */}
      <section id="featured-suppliers" style={{ padding: '48px 20px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* lp-section-header: wraps on mobile */}
          <div className="lp-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
            <div>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#1c1b1b', margin: '0 0 6px' }}>Featured Suppliers</h2>
              <p style={{ color: '#58413f', margin: 0, fontSize: 14 }}>Top-rated verified automotive parts suppliers</p>
            </div>
            {suppliers.length > 0 && (
              <span style={{ color: '#58413f', fontSize: 13 }}>{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} found</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {suppLoading ? (
              /* Loading skeletons */
              [0, 1, 2].map(i => <SupplierCardSkeleton key={i} />)
            ) : suppliers.length === 0 ? (
              /* Empty state */
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#58413f', fontSize: 15 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏪</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>No suppliers found</div>
                <div style={{ opacity: 0.7 }}>Check back soon — more suppliers are being verified.</div>
              </div>
            ) : suppliers.map((s: any, idx: number) => {
              // Backend /api/marketplace/shops returns: id, name, address, city,
              // logo, is_verified, rating, parts_count, distance
              const name      = s.name         || s.shopName    || 'Unnamed Shop';
              const city      = s.city         || s.shopCity    || '';
              const address   = s.address      || s.shopAddress || '';
              const verified  = s.is_verified  ?? s.isVerified  ?? s.verified ?? false;
              const rating    = s.rating       != null ? Number(s.rating).toFixed(1) : null;
              const coverImg  = s.logo         || s.logoUrl     || s.imageUrl  || s.coverImage || '';
              const partsCount= s.parts_count  ?? s.partsCount  ?? null;
              const desc      = s.description  || '';

              return (
                /* sp-supplier-card: row on desktop, column on mobile */
                <div key={s.id ?? idx} className="sp-supplier-card"
                  style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 16, overflow: 'hidden', display: 'flex', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

                  {/* Cover photo or initials placeholder */}
                  {coverImg ? (
                    <img src={coverImg} alt={name} className="sp-supplier-img"
                      style={{ width: 200, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <ShopImagePlaceholder name={name} />
                  )}

                  {/* Card body */}
                  <div className="sp-supplier-body"
                    style={{ padding: '24px 28px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name + verified badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1c1b1b', margin: 0 }}>{name}</h3>
                        {verified && (
                          <span style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: '#166534', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 12, whiteSpace: 'nowrap' }}>
                            ✓ Verified
                          </span>
                        )}
                      </div>

                      {/* City / address */}
                      {(city || address) && (
                        <p style={{ fontSize: 13, color: '#58413f', margin: '0 0 8px' }}>
                          {[city, address].filter(Boolean).join(' · ')}
                        </p>
                      )}

                      {/* Description */}
                      {desc && (
                        <p style={{ fontSize: 14, color: '#58413f', lineHeight: 1.5, margin: '0 0 14px' }}>{desc}</p>
                      )}

                      {/* Rating + parts count */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        {rating && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: '#eab308', fontSize: 16 }}>★</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1b1b' }}>{rating}</span>
                          </div>
                        )}
                        {partsCount != null && partsCount > 0 && (
                          <span style={{ fontSize: 13, color: '#58413f' }}>{partsCount.toLocaleString()} parts listed</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="sp-supplier-btns"
                      style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
                      <button onClick={() => navigate('/marketplace')}
                        style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }}>
                        View Inventory
                      </button>
                      <button
                        style={{ backgroundColor: 'transparent', color: '#8b1e1e', border: '1.5px solid #dfbfbc', borderRadius: 10, padding: '11px 22px', fontWeight: 600, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }}>
                        Contact Supplier
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ────────────────────────────────────────────── */}
      <section style={{ padding: '48px 20px', backgroundColor: '#f6f3f2', borderTop: '1px solid #dfbfbc' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: '#1c1b1b', textAlign: 'center', margin: '0 0 36px' }}>
            Why Source From RedPiston Suppliers?
          </h2>
          {/* sp-benefits-grid: 4-col → 2-col → 1-col via CSS */}
          <div className="sp-benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {BENEFITS.map(b => (
              <div key={b.title} style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 14, padding: 20 }}>
                <div style={{ width: 48, height: 48, backgroundColor: 'rgba(139,30,30,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 22 }}>
                  {b.emoji}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1b1b', marginBottom: 6 }}>{b.title}</div>
                <p style={{ fontSize: 13, color: '#58413f', lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="lp-cta-footer" style={{ backgroundColor: '#1c1b1b', padding: '48px 20px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, margin: '0 0 12px' }}>
          Want to list your shop on RedPiston?
        </h2>
        <p style={{ opacity: 0.7, fontSize: 15, marginBottom: 28 }}>Join 500+ verified suppliers and reach 50,000+ buyers</p>
        <div className="lp-cta-row" style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/login?role=shop')}
            style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontWeight: 800, fontSize: 15, cursor: 'pointer', minHeight: 44 }}>
            Apply as Supplier →
          </button>
          <button onClick={() => navigate('/marketplace')}
            style={{ backgroundColor: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer', minHeight: 44 }}>
            Browse Parts
          </button>
        </div>
      </section>
    </div>
  );
}

export default SuppliersPage;
