/**
 * OEMPartsPage — OEM-specific catalogue view.
 */
import '../styles/landing.css';
import { useNavigate } from 'react-router-dom';
import { CatalogSearchBar } from '../components/CatalogSearchBar';
import { useMarketplaceFonts } from '../hooks/useMarketplaceFonts';

const LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHoRqueT7rYQ9UU0uaqdoukDlx38GMecl-iaxA_YPsKta4MkYIh1zNn8Cq0sPsr7M4RgQ_U9qftq7c7PW05n3PYedVKG1_Cpvw5_kyltJtcea9-H5bNgTqs1NRGHFnhX112m_HSJaZ_F722rFQmkTxVmCCp4R5IZWlInV5SCBfQPTQHPO3YJFw6En0MQgRNEFl44PmMZH8bZyTjh0btvYW3gM2r1JgFZvpQS67UpJr1SYz_N81ByrPkXv3k89WFF_7n0z5A0S4BE4';

const OEM_BRANDS = [
  { name: 'Bosch',   logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuUPNXzjER-6vP59L3HN1lvBkqF6-6UjQu0e537Vjks8ZpUj_3ys_zFrrKpZodg3WqmLfjwE3IPBjeS7tZpe212--BfT19Y-N7QgwwikaB5y3_4o-2eLhCLIBsJVZwnwaboZtgORU7WlpfmZTkr6GM2ZSjvS8iqEitp3s8w3yaWyPLku9SvvTSaxt7JPwu_TlXwuAQ84uTsMzMNIJJYtttk4B84WU6wWA2JzyBeFuD_XaL1bS-a_y2a2tW6Kr4uglgZTdgKHAfibw', parts: '12,400+' },
  { name: 'Brembo',  logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATeZvD3Ga_MEAAc_KT7mXXx3-r4nmn26Jcsrxxy1sOSHGUMb4bbLWo4bdku846nfN1E9eHjYgC1PtWhIuUNg6hXfrN2vsCgJ31BnB9I2vzxAtS8UgP3-7hGncqiSykJILE7bmYWIMD9baTeaHeuPpq_d2F09fbOYeABalr_jX_INe_41sz6LtwwC2r-uOxuOU7loibdV0uz2rUTCLFTo38Lty0gqO463n4SZQyakV3ZKwn0vc65P_5OOZQR4CO4-BjEO9naaytVhs', parts: '3,200+' },
  { name: 'Denso',   logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAB-u93DFaDfPnmYYkqhxHM6Vm4hgfacLYbbBpv9zUFmBY_RlQKGx0Nzfu62mL6NhWpH0nLhET4STsMgAeR2xrzUV8TXDZ78lmAg479Bytcdr6UJjJ8oa3T0o0CRN7z8Pz-wlReuTCGTztgLkvYbD4AvQ7V60dfx410fRXxBn3Wzwxka04lgKmxR5nIoV7i_As1julS0ytjXx_Pv_zai2oA8ZbFsWfqgbYY4OeOSBJb3Z_ck1YOGYM23NouH9Gij30IOc_PVAN5Qc', parts: '8,700+' },
  { name: 'Valeo',   logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGw_8gODiDRhhfg8YvfkojJNIItxaDQCa47A_vnjOJQKQDm8QnEi_dPLnZgZRze3WqzK4A3PqtBOLIgcwIY3Snf5w3gU_JB9syLuNqEGoWyhNOpBEW5EA4UpHgadnuuFy-d6iYcJKHgVJEw33Bmy-ojsqXNUsa_43fqde7RXxrMSW2yYpti_ZbohZK_7nf3YWXMuqRHtkO4cO8QapTfBfYpZ7gY3hGGb3f8yuUWC9B5LxaJHlDFg4CfuQW8ycMZppzHvq1QvjA5Gc', parts: '5,100+' },
];

const OEM_CATEGORIES = [
  { icon: 'engineering',               label: 'Engine & Drivetrain', count: '24,800', desc: 'Pistons, crankshafts, camshafts, timing kits' },
  { icon: 'settings_input_component',  label: 'Brakes & Safety',     count: '11,200', desc: 'Rotors, pads, calipers, ABS sensors' },
  { icon: 'ac_unit',                   label: 'Cooling System',       count: '6,400',  desc: 'Radiators, water pumps, thermostats' },
  { icon: 'bolt',                      label: 'Electrical',           count: '9,100',  desc: 'Alternators, starters, sensors, wiring' },
  { icon: 'architecture',              label: 'Suspension & Steering',count: '7,700',  desc: 'Shocks, struts, ball joints, tie rods' },
  { icon: 'filter_alt',                label: 'Filters & Fluids',     count: '4,300',  desc: 'Oil, air, fuel, cabin filters & lubricants' },
];

const NAV = [
  { label: 'Marketplace', href: '/marketplace'  },
  { label: 'OEM Parts',   href: '/oem-parts',   active: true },
  { label: 'Suppliers',   href: '/suppliers'    },
];

export function OEMPartsPage() {
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
            <CatalogSearchBar placeholder="Search OEM part numbers, brands…" />
          </div>
          <button onClick={() => navigate('/marketplace')}
            style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Browse All Parts
          </button>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#8b1e1e', color: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '6px 16px', marginBottom: 24 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#ffb3ad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffb3ad' }}>100% Genuine OEM</span>
          </div>

          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 48, fontWeight: 800, lineHeight: 1.15, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
            Original Equipment<br />Manufacturer Parts
          </h1>
          <p style={{ fontSize: 18, opacity: 0.82, maxWidth: 560, lineHeight: 1.7, marginBottom: 36 }}>
            Directly sourced from OEM partners. Every part is authenticated, carries manufacturer warranty, and is guaranteed to fit your vehicle.
          </p>

          <div style={{ display: 'flex', gap: 16, marginBottom: 56 }}>
            <button onClick={() => navigate('/marketplace?q=oem')}
              style={{ backgroundColor: '#fff', color: '#8b1e1e', border: 'none', borderRadius: 12, padding: '14px 28px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              Search OEM Parts →
            </button>
            <button style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 12, padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
              OEM Catalogue
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 48, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.18)' }}>
            {[['1.2M+','Verified OEM Parts'],['500+','Certified Brands'],['99.8%','Fitment Accuracy'],['24/7','Expert Support']].map(([n,l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 28, fontWeight: 700 }}>{n}</div>
                <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OEM BRANDS ──────────────────────────────────────────── */}
      <section style={{ padding: '64px 24px', backgroundColor: '#fff' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 32, fontWeight: 700, color: '#1c1b1b', margin: '0 0 8px' }}>Certified OEM Partners</h2>
          <p style={{ color: '#58413f', margin: '0 0 40px' }}>Direct supply chain from global OEM manufacturers</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {OEM_BRANDS.map(b => (
              <div key={b.name} onClick={() => navigate(`/marketplace?q=${b.name}`)}
                style={{ border: '1px solid #dfbfbc', borderRadius: 16, padding: 28, cursor: 'pointer', textAlign: 'center', backgroundColor: '#fff', transition: 'all 0.2s' }}
                onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = '0 8px 24px rgba(139,30,30,0.12)'; d.style.borderColor = '#8b1e1e'; d.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = 'none'; d.style.borderColor = '#dfbfbc'; d.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#f6f3f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', padding: 14 }}>
                  <img src={b.logo} alt={b.name} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1b1b', marginBottom: 4 }}>{b.name}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#8b1e1e' }}>{b.parts} parts</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ──────────────────────────────────────────── */}
      <section style={{ padding: '64px 24px', backgroundColor: '#f6f3f2' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 32, fontWeight: 700, color: '#1c1b1b', margin: '0 0 8px' }}>Browse by Category</h2>
          <p style={{ color: '#58413f', margin: '0 0 40px' }}>Find OEM parts by vehicle system</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {OEM_CATEGORIES.map(cat => (
              <div key={cat.label} onClick={() => navigate(`/marketplace?q=${cat.label}`)}
                style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 16, padding: 28, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; d.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = 'none'; d.style.transform = 'translateY(0)'; }}
              >
                {/* Icon circle using inline SVG fallback instead of Material Symbols to avoid font race */}
                <div style={{ width: 56, height: 56, backgroundColor: 'rgba(139,30,30,0.09)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#8b1e1e' }}>{cat.icon}</span>
                </div>
                <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 700, color: '#1c1b1b', margin: '0 0 6px' }}>{cat.label}</h3>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#8b1e1e', marginBottom: 10 }}>{cat.count} parts</div>
                <p style={{ fontSize: 13, color: '#58413f', lineHeight: 1.5, margin: 0 }}>{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES ────────────────────────────────────────── */}
      <section style={{ padding: '48px 24px', backgroundColor: '#fff', borderTop: '1px solid #dfbfbc' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {[
            { emoji: '✅', title: 'Manufacturer Certified',  desc: 'Every part comes with OEM certification papers' },
            { emoji: '🚚', title: 'Direct Supply Chain',     desc: 'Sourced directly from manufacturers, no middlemen' },
            { emoji: '🔄', title: 'Easy Returns',            desc: '30-day hassle-free return on all OEM parts' },
            { emoji: '🎧', title: 'Technical Support',       desc: 'Expert fitment advice from certified technicians' },
          ].map(b => (
            <div key={b.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 48, height: 48, backgroundColor: 'rgba(139,30,30,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
                {b.emoji}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1b1b', marginBottom: 4 }}>{b.title}</div>
                <div style={{ fontSize: 13, color: '#58413f', lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#1c1b1b', padding: '48px 24px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>Ready to source genuine OEM parts?</h2>
        <p style={{ opacity: 0.7, fontSize: 16, marginBottom: 28 }}>Join 50,000+ procurement professionals on RedPiston</p>
        <button onClick={() => navigate('/marketplace?q=oem')}
          style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 32px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
          Browse OEM Parts Now →
        </button>
      </section>
    </div>
  );
}

export default OEMPartsPage;
