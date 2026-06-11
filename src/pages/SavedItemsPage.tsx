/**
 * SavedItemsPage — "Saved Items" / procurement list, matching the
 * RedPiston mobile Stitch design: stacked cards with image, name + filled
 * heart, IN STOCK + SKU chips, PRICE label, pill "Add to Cart" button,
 * and an outlined "Share Procurement List" button at the end.
 *
 * Items are saved from the marketplace product-card hearts
 * (localStorage via src/marketplace/savedItems.ts).
 */
import '../styles/landing.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { useCart } from '../context/CartContext';
import { getSavedItems, removeSavedItem, type SavedItem } from '../marketplace/savedItems';

function Icon({ n, style }: { n: string; style?: React.CSSProperties }) {
  return <span className="material-symbols-outlined" style={style}>{n}</span>;
}

const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function SavedItemsPage() {
  const navigate = useNavigate();
  const { addItem, count } = useCart();
  const [items, setItems] = useState<SavedItem[]>(getSavedItems);
  const [addedId, setAddedId] = useState<SavedItem['id'] | null>(null);

  useEffect(() => {
    const sync = () => setItems(getSavedItems());
    window.addEventListener('mp-saved-changed', sync);
    return () => window.removeEventListener('mp-saved-changed', sync);
  }, []);

  const addToCart = (item: SavedItem) => {
    addItem({
      id: String(item.id),
      name: item.name,
      brand: item.brand || '',
      partNo: item.sku || '',
      price: item.price,
      image: item.image || undefined,
      availability: item.inStock ? 'In Stock' : 'Out of Stock',
      type: item.type,
    });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const shareList = async () => {
    const text = items.map(i => `• ${i.name}${i.sku ? ` (SKU: ${i.sku})` : ''} — ${fmtINR(i.price)}`).join('\n');
    const payload = { title: 'RedPiston — Procurement List', text: `My procurement list:\n${text}` };
    try {
      if (navigator.share) await navigator.share(payload);
      else { await navigator.clipboard.writeText(payload.text); alert('Procurement list copied to clipboard'); }
    } catch { /* user cancelled the share sheet */ }
  };

  return (
    <div className="lp-root" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#fcf9f8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicHeader searchPlaceholder="Search OEM parts, suppliers..." />

      <main style={{ flex: 1, maxWidth: 760, margin: '0 auto', width: '100%', padding: '28px 16px 56px' }}>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 700, color: '#1c1b1b', margin: '0 0 4px' }}>
          Saved Items
        </h1>
        <p style={{ fontSize: 14, color: '#58413f', margin: '0 0 24px' }}>
          {items.length} component{items.length !== 1 ? 's' : ''} in your procurement list
        </p>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 24px', backgroundColor: '#fff', border: '1.5px dashed #dfbfbc', borderRadius: 14 }}>
            <Icon n="favorite_border" style={{ fontSize: 56, color: '#dfbfbc', display: 'block', margin: '0 auto 14px' }} />
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1c1b1b', marginBottom: 6 }}>Nothing saved yet</p>
            <p style={{ fontSize: 13, color: '#58413f', marginBottom: 22 }}>Tap the heart on any part in the marketplace to add it here.</p>
            <button onClick={() => navigate('/marketplace')}
              style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Browse Parts
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {items.map(item => (
                <div key={String(item.id)} style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 14, padding: 14, display: 'flex', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  {/* Thumbnail */}
                  <div style={{ width: 84, height: 84, borderRadius: 10, backgroundColor: '#f0eded', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image
                      ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                      : <Icon n="build" style={{ fontSize: 32, color: '#dfbfbc' }} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1c1b1b', margin: 0, lineHeight: 1.3 }}>{item.name}</h3>
                      <button onClick={() => removeSavedItem(item.id)} title="Remove from saved"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                        <Icon n="favorite" style={{ fontSize: 20, color: '#8b1e1e', fontVariationSettings: "'FILL' 1" }} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        backgroundColor: item.inStock ? 'rgba(22,163,74,0.1)' : 'rgba(186,26,26,0.08)',
                        color: item.inStock ? '#166534' : '#ba1a1a',
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {item.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                      {item.sku && (
                        <span style={{ backgroundColor: '#f0eded', color: '#58413f', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4 }}>
                          SKU: {item.sku}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, marginTop: 'auto' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#8b716e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1 }}>Price</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#8b1e1e', fontFamily: 'Poppins, sans-serif' }}>{fmtINR(item.price)}</div>
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!item.inStock}
                        style={{
                          backgroundColor: addedId === item.id ? '#16a34a' : '#8b1e1e',
                          color: '#fff', border: 'none', borderRadius: 22,
                          padding: '10px 20px', fontSize: 13, fontWeight: 700,
                          cursor: item.inStock ? 'pointer' : 'not-allowed',
                          opacity: item.inStock ? 1 : 0.45,
                          transition: 'background-color 0.15s', whiteSpace: 'nowrap',
                        }}
                      >
                        {addedId === item.id ? '✓ Added' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={shareList}
              style={{ width: '100%', marginTop: 26, padding: 13, backgroundColor: 'transparent', border: '1.5px solid #8b1e1e', borderRadius: 12, color: '#8b1e1e', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Share Procurement List
            </button>
            {count > 0 && (
              <button onClick={() => navigate('/cart')}
                style={{ width: '100%', marginTop: 10, padding: 13, backgroundColor: '#8b1e1e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                View Cart ({count})
              </button>
            )}
            <div style={{ textAlign: 'center', fontSize: 10, color: '#8b716e', marginTop: 18, letterSpacing: '0.15em', textTransform: 'uppercase', fontStyle: 'italic' }}>
              RedPiston Industrial Logistics
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default SavedItemsPage;
