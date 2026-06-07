/**
 * SuppliersPage — verified automotive parts suppliers directory.
 */
import '../styles/landing.css';
import { useNavigate } from 'react-router-dom';
import { CatalogSearchBar } from '../components/CatalogSearchBar';
import { useMarketplaceFonts } from '../hooks/useMarketplaceFonts';

const LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHoRqueT7rYQ9UU0uaqdoukDlx38GMecl-iaxA_YPsKta4MkYIh1zNn8Cq0sPsr7M4RgQ_U9qftq7c7PW05n3PYedVKG1_Cpvw5_kyltJtcea9-H5bNgTqs1NRGHFnhX112m_HSJaZ_F722rFQmkTxVmCCp4R5IZWlInV5SCBfQPTQHPO3YJFw6En0MQgRNEFl44PmMZH8bZyTjh0btvYW3gM2r1JgFZvpQS67UpJr1SYz_N81ByrPkXv3k89WFF_7n0z5A0S4BE4';

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

const NAV = [
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'OEM Parts',   href: '/oem-parts'   },
  { label: 'Suppliers',   href: '/suppliers',   active: true },
];

export function SuppliersPage() {
  useMarketplaceFonts(); // ← loads Material Symbols + Inter + Poppins
  const navigate = useNavigate();

  return (
    <div className="lp-root" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#fcf9f8', minHeight: '100vh' }}>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #dfbfbc', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', padding: '0 24px', height: 72, gap: 24 }}>
          <img src={LOGO} alt="RedPiston" onClick={() => navigate('/')}
            style={{ height: 40, width: 'auto', objectFit: 'contain', cursor: 'pointer' }} />
          <nav style={{ display: 'flex', gap: 28 }}>
            {NAV.map(n => (
              <a key={n.label} href={n.href} style={{
                color: n.active ? '#8b1e1e' : '#58413f', fontSize: 14, fontWeight: n.active ? 700 : 500,
                textDecoration: 'none', borderBottom: n.active ? '2px solid #8b1e1e' : '2px solid transparent', paddingBottom: 4,
              }}>{n.label}</a>
            ))}
          </nav>
          <div style={{ flex: 1, maxWidth: 480, marginLeft: 'auto' }}>
            <CatalogSearchBar placeholder="Search parts by brand, OEM number…" />
          </div>
          <button onClick={() => navigate('/marketplace')}
            style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Browse Parts
          </button>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(160deg, #1c1b1b 0%, #313030 100%)', color: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 48 }}>
          <div style={{ flex: 1 }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139,30,30,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 16px', marginBottom: 24 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffb3ad' }}>Verified Supplier Network</span>
            </div>
            <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 44, fontWeight: 800, lineHeight: 1.2, margin: '0 0 20px' }}>
              Trusted Parts<br />Suppliers Network
            </h1>
            <p style={{ fontSize: 16, opacity: 0.78, maxWidth: 460, lineHeight: 1.7, marginBottom: 32 }}>
              Connect with 500+ verified OEM and OES parts suppliers across India. Real-time inventory, competitive pricing, and guaranteed authenticity.
            </p>
            <div style={{ display: 'flex', gap: 14 }}>
              <button style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 26px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Browse Suppliers
              </button>
              <button style={{ backgroundColor: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '13px 26px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Become a Supplier →
              </button>
            </div>
          </div>

          {/* Stat grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flexShrink: 0 }}>
            {[['500+','Verified Suppliers'],['50k+','SKUs Listed'],['₹2Cr+','Monthly GMV'],['99.2%','Order Accuracy']].map(([n, l]) => (
              <div key={l} style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '20px 24px', textAlign: 'center', minWidth: 140 }}>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 28, fontWeight: 800, color: '#ffb3ad' }}>{n}</div>
                <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUPPLIER CARDS ──────────────────────────────────────── */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
            <div>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 32, fontWeight: 700, color: '#1c1b1b', margin: '0 0 6px' }}>Featured Suppliers</h2>
              <p style={{ color: '#58413f', margin: 0 }}>Top-rated verified automotive parts suppliers</p>
            </div>
            <a href="#" style={{ color: '#8b1e1e', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>View all 500+ suppliers →</a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {SUPPLIERS.map(s => (
              <div key={s.name} style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 16, overflow: 'hidden', display: 'flex', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <img src={s.img} alt={s.name} style={{ width: 200, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ padding: '28px 32px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1c1b1b', margin: 0 }}>{s.name}</h3>
                      {s.verified && (
                        <span style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: '#166534', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 12 }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: '#58413f', margin: '0 0 8px' }}>{s.type} · {s.city}</p>
                    <p style={{ fontSize: 14, color: '#58413f', lineHeight: 1.5, margin: '0 0 14px', maxWidth: 500 }}>{s.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#eab308', fontSize: 16 }}>★</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1b1b' }}>{s.rating}</span>
                        <span style={{ fontSize: 13, color: '#58413f' }}> · {s.parts.toLocaleString()} parts</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {s.brands.map(b => <span key={b} style={{ backgroundColor: '#f0eded', color: '#58413f', fontSize: 12, padding: '3px 10px', borderRadius: 6 }}>{b}</span>)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
                    <button onClick={() => navigate('/marketplace')}
                      style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      View Inventory
                    </button>
                    <button style={{ backgroundColor: 'transparent', color: '#8b1e1e', border: '1.5px solid #dfbfbc', borderRadius: 10, padding: '11px 22px', fontWeight: 600, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
      <section style={{ padding: '56px 24px', backgroundColor: '#f6f3f2', borderTop: '1px solid #dfbfbc' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 28, fontWeight: 700, color: '#1c1b1b', textAlign: 'center', margin: '0 0 40px' }}>
            Why Source From RedPiston Suppliers?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {BENEFITS.map(b => (
              <div key={b.title} style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 14, padding: 24 }}>
                <div style={{ width: 52, height: 52, backgroundColor: 'rgba(139,30,30,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 24 }}>
                  {b.emoji}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1b1b', marginBottom: 8 }}>{b.title}</div>
                <p style={{ fontSize: 13, color: '#58413f', lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#1c1b1b', padding: '48px 24px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>Want to list your shop on RedPiston?</h2>
        <p style={{ opacity: 0.7, fontSize: 16, marginBottom: 28 }}>Join 500+ verified suppliers and reach 50,000+ buyers</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Apply as Supplier →
          </button>
          <button onClick={() => navigate('/marketplace')}
            style={{ backgroundColor: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
            Browse Parts
          </button>
        </div>
      </section>
    </div>
  );
}

export default SuppliersPage;
