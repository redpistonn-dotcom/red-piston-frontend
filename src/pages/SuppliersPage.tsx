/**
 * SuppliersPage — verified automotive parts suppliers directory.
 * Fully responsive: 320px → 1440px+
 */
import '../styles/landing.css';
import { useNavigate } from 'react-router-dom';
import { useMarketplaceFonts } from '../hooks/useMarketplaceFonts';
import { PublicHeader } from '../components/PublicHeader';

const SUPPLIERS = [
  {
    name: 'Elite Automotive Solutions', city: 'Hyderabad', rating: 4.9, parts: 2840,
    type: 'OEM Distributor', verified: true,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjMF9hu5XyoPROfLCSDYKJ7WVw5l1cZoOTB5_ZFK_c4W-fv4ta5e4XqCf-nfiuiGup936q9P1TkzYPBXNMnvwQYfSSBbBxrzk_4os0oapj8jWPZmEzpAD1Tu5F_5tqF_n3k22FRhv4PpF9iO0b5FQRlRFrnb9KkffIhX8hOghV1AjNq0zwBvtqv28qdVcw8U5jIsIXFHd6G-dx1z0p613uKfBHBYmR1AAkKnScvgXpVQsTNXaOWZFDnWLrYMjCMKgOLBbYbgMY5dg',
    brands: ['Bosch', 'Brembo', 'Denso'],
    desc: 'Authorized OEM distributor specializing in premium braking systems, engine components, and electrical parts.',
  },
  {
    name: 'Speedy Gear Spares', city: 'Mumbai', rating: 4.7, parts: 1520,
    type: 'Multi-Brand Supplier', verified: true,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxvyBJDw8Rbgq_si3vplJBpgVpeNHLwgS1X6lX4FjpmF6_6_9PRaGT_pDkpLDSQK1RnOmGq4u0ipcu8FYFidpoOk7D_365uxjESF2J70wSHfxNCyIGtyb6ZHDnNIQmLbtcAoQE2Be0qf_XpTKMXJmbgRNBOGiEX5NNQf0xSQa77IVMJ_lPY43KPkoZzd3w1hFXpizvouvsYzgcL0qAIjufTEw2hFw-MEqN6diQXVAUJg_p1TFD5i_07sltrUODfV0a6umd2hHHn4Q',
    brands: ['NGK', 'Valeo', 'Gates'],
    desc: 'Trusted multi-brand supplier with 15+ years in the auto parts industry. Fast delivery across Maharashtra.',
  },
  {
    name: 'Pro-Tech Parts Hub', city: 'Delhi', rating: 4.8, parts: 3100,
    type: 'OES Specialist', verified: true,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNzvgZbtt0-WMxiMPt9NVAb1j32_dfm2tXCU08wa3XFS7KCYd4MqR9tVczihi5eS0ZLbBe8gqtro81Nhpekw3aZXASamj9jg85y4Xt7CprJUPMm4rP9nnUYvIFBFws-qqeASe8PRBVJ-FwRTKeqd5VS1NLpPQJhcs9xvRtUSFlVIruKJWXXZOngbrT0rxJAQmBtClV92bPXfG2LO39yEQg2cwUbl-HYo9bwMhKC_TxsdzvUK8YPimXj7g5xeJ6n_p56wOS3O2oN0Q',
    brands: ['Bilstein', 'KYB', 'Sachs'],
    desc: 'Leading OES specialist for suspension, shock absorbers, and chassis parts across North India.',
  },
];

const BENEFITS = [
  { emoji: '🔒', title: 'Background Verified',  desc: 'All suppliers undergo thorough KYC and stock verification before listing' },
  { emoji: '🚀', title: 'Fast Shipping',         desc: 'Average delivery of 2-3 business days across major Indian cities' },
  { emoji: '💰', title: 'Competitive Pricing',   desc: 'Best price guarantee with fully transparent fee structure' },
  { emoji: '🎧', title: 'Dedicated Support',     desc: '24/7 supplier coordination and dispute resolution team' },
];

export function SuppliersPage() {
  useMarketplaceFonts();
  const navigate = useNavigate();

  return (
    <div className="lp-root" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#fcf9f8', minHeight: '100vh' }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <PublicHeader
        searchPlaceholder="Search parts by brand, OEM number…"
        rightSlot={
          <button onClick={() => navigate('/marketplace')}
            style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }}>
            Browse Parts
          </button>
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
              <button style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 44 }}>
                Browse Suppliers
              </button>
              <button style={{ backgroundColor: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '13px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer', minHeight: 44 }}>
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
      <section style={{ padding: '48px 20px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* lp-section-header: wraps on mobile */}
          <div className="lp-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
            <div>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: '#1c1b1b', margin: '0 0 6px' }}>Featured Suppliers</h2>
              <p style={{ color: '#58413f', margin: 0, fontSize: 14 }}>Top-rated verified automotive parts suppliers</p>
            </div>
            <a href="#" style={{ color: '#8b1e1e', fontWeight: 700, textDecoration: 'none', fontSize: 14, whiteSpace: 'nowrap' }}>View all 500+ →</a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {SUPPLIERS.map(s => (
              // sp-supplier-card: row on desktop, column on mobile
              <div key={s.name} className="sp-supplier-card"
                style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 16, overflow: 'hidden', display: 'flex', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

                {/* sp-supplier-img: fixed-width on desktop, full-width on mobile */}
                <img src={s.img} alt={s.name} className="sp-supplier-img"
                  style={{ width: 200, objectFit: 'cover', flexShrink: 0 }} />

                {/* Card body: row on desktop (info left, buttons right), column on mobile */}
                <div className="sp-supplier-body"
                  style={{ padding: '24px 28px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1c1b1b', margin: 0 }}>{s.name}</h3>
                      {s.verified && (
                        <span style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: '#166534', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 12, whiteSpace: 'nowrap' }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: '#58413f', margin: '0 0 8px' }}>{s.type} · {s.city}</p>
                    <p style={{ fontSize: 14, color: '#58413f', lineHeight: 1.5, margin: '0 0 14px' }}>{s.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#eab308', fontSize: 16 }}>★</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1b1b' }}>{s.rating}</span>
                        <span style={{ fontSize: 13, color: '#58413f' }}> · {s.parts.toLocaleString()} parts</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {s.brands.map(b => <span key={b} style={{ backgroundColor: '#f0eded', color: '#58413f', fontSize: 12, padding: '3px 10px', borderRadius: 6 }}>{b}</span>)}
                      </div>
                    </div>
                  </div>

                  {/* Buttons: column on desktop, row on mobile (via sp-supplier-btns) */}
                  <div className="sp-supplier-btns"
                    style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
                    <button onClick={() => navigate('/marketplace')}
                      style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }}>
                      View Inventory
                    </button>
                    <button style={{ backgroundColor: 'transparent', color: '#8b1e1e', border: '1.5px solid #dfbfbc', borderRadius: 10, padding: '11px 22px', fontWeight: 600, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }}>
                      Contact Supplier
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
          <button style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontWeight: 800, fontSize: 15, cursor: 'pointer', minHeight: 44 }}>
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
