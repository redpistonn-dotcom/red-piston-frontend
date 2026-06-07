/**
 * LogisticsPage — shipping, delivery and fulfillment information.
 */
import '../styles/landing.css';
import { useNavigate } from 'react-router-dom';
import { CatalogSearchBar } from '../components/CatalogSearchBar';

function Icon({ n, style }: { n: string; style?: React.CSSProperties }) {
  return <span className="material-symbols-outlined" style={style}>{n}</span>;
}

const LOGO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHoRqueT7rYQ9UU0uaqdoukDlx38GMecl-iaxA_YPsKta4MkYIh1zNn8Cq0sPsr7M4RgQ_U9qftq7c7PW05n3PYedVKG1_Cpvw5_kyltJtcea9-H5bNgTqs1NRGHFnhX112m_HSJaZ_F722rFQmkTxVmCCp4R5IZWlInV5SCBfQPTQHPO3YJFw6En0MQgRNEFl44PmMZH8bZyTjh0btvYW3gM2r1JgFZvpQS67UpJr1SYz_N81ByrPkXv3k89WFF_7n0z5A0S4BE4';

const SHIPPING_OPTIONS = [
  { icon: 'rocket_launch', title: 'Express Delivery', time: '4-6 Hours', price: '₹149', desc: 'Same-day delivery within city limits. For urgent workshop needs.', color: '#8b1e1e' },
  { icon: 'local_shipping', title: 'Standard Delivery', time: '1-2 Days', price: '₹49', desc: 'Next-day delivery for most metro cities across India.', color: '#0284c7' },
  { icon: 'inventory_2', title: 'Bulk / Wholesale', time: '2-4 Days', price: 'FREE', desc: 'Free shipping on orders above ₹5,000. Ideal for workshops.', color: '#16a34a' },
  { icon: 'public', title: 'International', time: '7-14 Days', price: 'Custom', desc: 'Export-grade packaging. Available for select OEM parts worldwide.', color: '#7c3aed' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: 'search', title: 'Find Your Part', desc: 'Search by part name, OEM number, or vehicle. Browse our 1.2M+ part catalogue.' },
  { step: '02', icon: 'add_shopping_cart', title: 'Add to Cart', desc: 'Select quantity, choose supplier, and add to your cart. Compare prices across sellers.' },
  { step: '03', icon: 'payment', title: 'Secure Payment', desc: 'Pay via UPI, card, net banking or industrial credit. 256-bit SSL encrypted checkout.' },
  { step: '04', icon: 'local_shipping', title: 'Fast Delivery', desc: 'Real-time tracking from warehouse to your doorstep. Live order status updates.' },
];

const COVERAGE = [
  { city: 'Mumbai',    stores: 42, express: true  },
  { city: 'Delhi',     stores: 38, express: true  },
  { city: 'Bangalore', stores: 31, express: true  },
  { city: 'Hyderabad', stores: 26, express: true  },
  { city: 'Chennai',   stores: 22, express: true  },
  { city: 'Pune',      stores: 18, express: false },
  { city: 'Kolkata',   stores: 14, express: false },
  { city: 'Ahmedabad', stores: 12, express: false },
];

export function LogisticsPage() {
  const navigate = useNavigate();
  const navLinks = [
    { label: 'Marketplace', path: '/marketplace' },
    { label: 'OEM Parts',   path: '/oem-parts' },
    { label: 'Suppliers',   path: '/suppliers' },
    { label: 'Logistics',   path: '/logistics', active: true },
  ];

  return (
    <div className="lp-root" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#fcf9f8', minHeight: '100vh' }}>
      {/* NAV */}
      <header style={{ backgroundColor: '#fcf9f8', borderBottom: '1px solid #dfbfbc', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', padding: '0 24px', height: 72, gap: 24 }}>
          <img src={LOGO} alt="RedPiston" style={{ height: 40, objectFit: 'contain', cursor: 'pointer' }} onClick={() => navigate('/')} />
          <div style={{ display: 'flex', gap: 24 }}>
            {navLinks.map(l => (
              <a key={l.label} href={l.path} style={{ color: l.active ? '#8b1e1e' : '#58413f', fontSize: 14, fontWeight: l.active ? 700 : 500, textDecoration: 'none', borderBottom: l.active ? '2px solid #8b1e1e' : '2px solid transparent', paddingBottom: 4 }}>{l.label}</a>
            ))}
          </div>
          <div style={{ flex: 1, maxWidth: 500, marginLeft: 'auto' }}><CatalogSearchBar /></div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #1c1b1b 0%, #313030 100%)', color: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,30,30,0.28)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 14px', marginBottom: 20 }}>
            <Icon n="speed" style={{ fontSize: 14, color: '#ffb3ad' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffb3ad' }}>Same-day delivery available</span>
          </div>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 48, fontWeight: 700, lineHeight: 1.2, margin: '0 0 20px' }}>
            Parts Delivered at<br /><span style={{ color: '#ffb3ad' }}>Industrial Speed</span>
          </h1>
          <p style={{ fontSize: 17, opacity: 0.75, maxWidth: 580, lineHeight: 1.7, margin: '0 auto 36px' }}>
            Our logistics network covers 50+ cities with real-time tracking, express delivery options, and guaranteed authenticity at every step.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 56 }}>
            <button onClick={() => navigate('/marketplace')} style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon n="local_shipping" style={{ fontSize: 20 }} /> Order Parts Now
            </button>
            <button style={{ backgroundColor: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
              Track Order →
            </button>
          </div>
          {/* Live stats */}
          <div style={{ display: 'flex', gap: 0, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden', maxWidth: 700, margin: '0 auto' }}>
            {[['98.7%','On-Time Delivery'],['4.2h','Avg Express Time'],['50+','Cities Covered'],['₹99','Avg Delivery Cost']].map(([n, l], i, arr) => (
              <div key={l} style={{ flex: 1, padding: '20px 16px', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 800, color: '#ffb3ad' }}>{n}</div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHIPPING OPTIONS */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 32, fontWeight: 700, color: '#1c1b1b', marginBottom: 8 }}>Delivery Options</h2>
          <p style={{ color: '#58413f', marginBottom: 36 }}>Choose the right speed for your requirement</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {SHIPPING_OPTIONS.map(s => (
              <div key={s.title} style={{ border: '1px solid #dfbfbc', borderRadius: 16, padding: 24, backgroundColor: '#fff', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: 48, height: 48, backgroundColor: `${s.color}15`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon n={s.icon} style={{ fontSize: 24, color: s.color }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1c1b1b', marginBottom: 4 }}>{s.title}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: '#8b716e' }}>⏱ {s.time}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.price}</span>
                </div>
                <p style={{ fontSize: 13, color: '#58413f', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '64px 24px', backgroundColor: '#f6f3f2' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 32, fontWeight: 700, color: '#1c1b1b', textAlign: 'center', marginBottom: 48 }}>How Ordering Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', top: 40, left: '12.5%', right: '12.5%', height: 2, backgroundColor: '#dfbfbc', zIndex: 0 }} />
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#8b1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 16px rgba(139,30,30,0.3)' }}>
                  <Icon n={step.icon} style={{ fontSize: 32, color: '#fff' }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8b1e1e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>STEP {step.step}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1c1b1b', marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: '#58413f', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COVERAGE MAP */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
            <div>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 32, fontWeight: 700, color: '#1c1b1b', margin: '0 0 8px' }}>Service Coverage</h2>
              <p style={{ color: '#58413f', margin: 0 }}>Delivery network across major Indian cities</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {COVERAGE.map(c => (
              <div key={c.city} style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 12, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1b1b' }}>{c.city}</div>
                  <div style={{ fontSize: 13, color: '#58413f', marginTop: 2 }}>{c.stores} local stores</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {c.express && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: 'rgba(22,163,74,0.1)', color: '#166534', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12 }}>
                    <Icon n="bolt" style={{ fontSize: 13 }} /> Express
                  </div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: '#8b1e1e', padding: '56px 24px', textAlign: 'center', color: '#fff' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <Icon n="local_shipping" style={{ fontSize: 48, display: 'block', margin: '0 auto 20px', color: '#ffb3ad' }} />
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 32, fontWeight: 700, margin: '0 0 16px' }}>Ready to order?</h2>
          <p style={{ opacity: 0.8, fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>Browse 1.2M+ parts and get them delivered to your workshop today.</p>
          <button onClick={() => navigate('/marketplace')} style={{ backgroundColor: '#fff', color: '#8b1e1e', border: 'none', borderRadius: 12, padding: '16px 36px', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
            Browse Parts Now →
          </button>
        </div>
      </section>
    </div>
  );
}

export default LogisticsPage;
