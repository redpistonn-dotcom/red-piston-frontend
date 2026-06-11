/**
 * CartPage — pixel-perfect implementation of:
 * "RedPiston Shopping Cart - Industrial Beige Edition" (Stitch design)
 */
import '../styles/landing.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { PublicHeader } from '../components/PublicHeader';

function Icon({ n, style }: { n: string; style?: React.CSSProperties }) {
  return <span className="material-symbols-outlined" style={style}>{n}</span>;
}

const TAX_RATE    = 0.12;

export function CartPage() {
  const navigate = useNavigate();
  const { items, count, subtotal, removeItem, updateQty } = useCart();
  const [promo, setPromo] = useState('');

  const tax      = Math.round(subtotal * TAX_RATE);
  const total    = subtotal + tax;
  const fmtINR   = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="lp-root" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#fcf9f8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── NAV — shared responsive header (hamburger + search + icons on mobile) ── */}
      <PublicHeader
        searchPlaceholder="Search industrial parts..."
        rightSlot={
          <>
            <button onClick={() => navigate('/saved')} title="Saved Items"
              style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
              <Icon n="favorite_border" style={{ color: '#58413f', fontSize: 22 }} />
            </button>
            <button onClick={() => navigate('/cart')}
              style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#8b1e1e', fontWeight: 700, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon n="shopping_cart" style={{ fontSize: 22 }} />
              {count > 0 && <span style={{ position: 'absolute', top: -4, right: -2, backgroundColor: '#8b1e1e', color: '#fff', fontSize: 10, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{count}</span>}
            </button>
            <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#58413f' }}>
              <Icon n="account_circle" style={{ fontSize: 24 }} />
            </button>
          </>
        }
      />

      {/* ── MAIN ─────────────────────────────────────────────────────── */}
      <main className="cart-main" style={{ flex: 1, maxWidth: 1440, margin: '0 auto', width: '100%', padding: '48px 32px', display: 'flex', gap: 32 }}>

        {/* ── Cart items (75%) ─────────────────────────────────────── */}
        <section className="cart-items-sec" style={{ flex: '0 0 72%', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #dfbfbc', paddingBottom: 16, marginBottom: 24 }}>
            <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 28, fontWeight: 700, color: '#1c1b1b', margin: 0 }}>Shopping Cart</h1>
            <span style={{ fontSize: 13, color: '#58413f' }}>{count} item{count !== 1 ? 's' : ''} in your list</span>
          </div>

          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <Icon n="shopping_cart" style={{ fontSize: 64, color: '#dfbfbc', display: 'block', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 20, fontWeight: 700, color: '#1c1b1b', marginBottom: 8 }}>Your cart is empty</p>
              <p style={{ fontSize: 14, color: '#58413f', marginBottom: 24 }}>Browse our marketplace to find the parts you need</p>
              <button onClick={() => navigate('/marketplace')}
                style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Browse Parts
              </button>
            </div>
          ) : (
            <div style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 12, overflow: 'hidden' }}>
              {items.map((item, idx) => (
                <div key={item.id} className="cart-item-row" style={{
                  padding: '24px', display: 'flex', gap: 24,
                  borderBottom: idx < items.length - 1 ? '1px solid #dfbfbc' : 'none',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f6f3f2')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                >
                  {/* Image */}
                  <div className="cart-item-img" style={{ width: 160, height: 160, backgroundColor: '#f0eded', borderRadius: 10, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image
                      ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                      : <Icon n="build" style={{ fontSize: 48, color: '#dfbfbc' }} />
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1c1b1b', margin: 0, flex: 1, paddingRight: 16 }}>{item.name}</h3>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#8b1e1e', whiteSpace: 'nowrap' }}>{fmtINR(item.price * item.qty)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: '#58413f', marginTop: 6 }}>
                        SKU: {item.partNo} | {item.brand}
                        {item.type && <span style={{ marginLeft: 8, backgroundColor: item.type === 'OEM' ? 'rgba(139,30,30,0.1)' : '#e0e0db', color: item.type === 'OEM' ? '#8b1e1e' : '#62635f', fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>{item.type}</span>}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16a34a' }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#166534' }}>
                          {item.availability || 'In Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="cart-item-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Qty */}
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #dfbfbc', borderRadius: 8, overflow: 'hidden' }}>
                          <button onClick={() => updateQty(item.id, -1)}
                            style={{ padding: '8px 14px', backgroundColor: '#f0eded', border: 'none', cursor: 'pointer', fontSize: 16, color: '#58413f', borderRight: '1px solid #dfbfbc' }}>−</button>
                          <span style={{ padding: '8px 20px', fontWeight: 700, fontSize: 15, color: '#1c1b1b' }}>{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)}
                            style={{ padding: '8px 14px', backgroundColor: '#f0eded', border: 'none', cursor: 'pointer', fontSize: 16, color: '#58413f', borderLeft: '1px solid #dfbfbc' }}>+</button>
                        </div>
                        <button style={{ fontSize: 13, color: '#8b1e1e', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', borderRight: '1px solid #dfbfbc', paddingRight: 12 }}>
                          Save for later
                        </button>
                        <button onClick={() => removeItem(item.id)}
                          style={{ fontSize: 13, color: '#ba1a1a', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                          Remove
                        </button>
                      </div>
                      <span style={{ fontSize: 13, color: '#58413f', fontStyle: 'italic' }}>
                        {item.shipping || 'Standard Bulk Delivery (2-3 days)'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subtotal */}
          {items.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, padding: '16px 0', borderTop: '1px solid #dfbfbc', flexWrap: 'wrap', gap: 12 }}>
              <button onClick={() => navigate('/marketplace')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#8b1e1e', fontWeight: 600, fontSize: 14 }}>
                <Icon n="arrow_back" style={{ fontSize: 18 }} />
                Continue Browsing Parts
              </button>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1c1b1b' }}>
                Subtotal ({count} items): <span style={{ color: '#8b1e1e', fontWeight: 800 }}>{fmtINR(subtotal)}</span>
              </div>
            </div>
          )}
        </section>

        {/* ── Order Summary (25%) ──────────────────────────────────── */}
        {items.length > 0 && (
          <aside className="cart-aside" style={{ flex: 1, minWidth: 300 }}>
            <div style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 12, padding: 24, position: 'sticky', top: 88 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1c1b1b', marginBottom: 20, fontFamily: 'Poppins, sans-serif' }}>Order Summary</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#58413f' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600, color: '#1c1b1b' }}>{fmtINR(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#58413f' }}>
                  <span>Estimated Shipping</span>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>FREE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#58413f' }}>
                  <span>Estimated Tax (12%)</span>
                  <span style={{ fontWeight: 600, color: '#1c1b1b' }}>{fmtINR(tax)}</span>
                </div>
                <div style={{ borderTop: '1px solid #dfbfbc', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#1c1b1b' }}>
                  <span>Total</span>
                  <span style={{ color: '#8b1e1e' }}>{fmtINR(total)}</span>
                </div>
              </div>

              {/* Promo Code */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#58413f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Promo Code</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="Enter code" value={promo} onChange={e => setPromo(e.target.value)}
                    style={{ flex: 1, height: 40, border: '1px solid #dfbfbc', borderRadius: 8, padding: '0 12px', fontSize: 14, color: '#1c1b1b', outline: 'none', backgroundColor: '#fcf9f8' }} />
                  <button style={{ backgroundColor: '#f0eded', border: '1px solid #dfbfbc', borderRadius: 8, padding: '0 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#1c1b1b' }}>
                    APPLY
                  </button>
                </div>
              </div>

              {/* CTA */}
              <button
                style={{ width: '100%', height: 52, backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6a020a')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#8b1e1e')}>
                Proceed to Checkout
                <Icon n="arrow_forward" style={{ fontSize: 20 }} />
              </button>

              {/* Trust badges */}
              <div style={{ backgroundColor: '#f6f3f2', border: '1px solid #dfbfbc', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                <Icon n="verified_user" style={{ fontSize: 22, color: '#16a34a', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1c1b1b', margin: '0 0 3px' }}>Secure Checkout</p>
                  <p style={{ fontSize: 12, color: '#58413f', margin: 0 }}>Industry-standard 256-bit SSL encryption for your security.</p>
                </div>
              </div>
              <div style={{ backgroundColor: '#f6f3f2', border: '1px solid #dfbfbc', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Icon n="inventory_2" style={{ fontSize: 22, color: '#8b1e1e', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1c1b1b', margin: '0 0 3px' }}>Industrial Bulk Order?</p>
                  <p style={{ fontSize: 12, color: '#58413f', margin: '0 0 8px' }}>Our procurement specialists are available for high-volume parts negotiations.</p>
                  <a href="#" style={{ fontSize: 12, color: '#8b1e1e', fontWeight: 700, textDecoration: 'none' }}>Contact Engineering →</a>
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: '#313333', color: '#fff', marginTop: 'auto' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 800 }}>
            <span style={{ color: '#8b1e1e' }}>RED</span>PISTON
          </span>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Terms of Service','Privacy Policy','Contact Support','Global Logistics'].map(l => (
              <a key={l} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', maxWidth: 1440, margin: '0 auto', padding: '16px 32px' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>© 2024 RedPiston Industrial. All rights reserved. Professional Grade Components.</p>
        </div>
      </footer>
    </div>
  );
}

export default CartPage;
