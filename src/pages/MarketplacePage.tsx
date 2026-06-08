/**
 * MarketplacePage — pixel-perfect implementation of:
 * "RedPiston Marketplace - Industrial Beige Results" (Stitch design)
 *
 * Rules:
 *   • Browse & search: anyone (no login required)
 *   • Add to cart: login required → shows auth modal
 *   • Vehicle filter: shown as removable tag, can be changed
 */
import '../styles/landing.css';
import { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { AppCtx } from '../context/AppCtx';
import { CatalogSearchBar } from '../components/CatalogSearchBar';
import { PublicHeader } from '../components/PublicHeader';
import { browseMarketplace } from '../api/marketplace';

/* ── Shared icon shorthand ─────────────────────────────────────────── */
function Icon({ n, style }: { n: string; style?: React.CSSProperties }) {
  return <span className="material-symbols-outlined" style={style}>{n}</span>;
}

/* ── Part image placeholder (shown when no imageUrl in DB) ─────────── */
const CATEGORY_ICON_MAP: Record<string, string> = {
  Brakes: 'settings_input_component', Engine: 'settings',
  Electrical: 'bolt', Filters: 'filter_alt',
  Suspension: 'architecture', Cooling: 'ac_unit',
  Ignition: 'flash_on', 'Engine Oils': 'oil_barrel',
  Fluids: 'water_drop', Exhaust: 'air', Steering: 'trip_origin',
  'Body & Exterior': 'directions_car',
  'Clutch & Transmission': 'settings_input_composite',
};
function PartImagePlaceholder({ category }: { category?: string }) {
  const icon = (category && CATEGORY_ICON_MAP[category]) || 'inventory_2';
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(139,30,30,0.04)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 38, color: 'rgba(139,30,30,0.25)' }}>{icon}</span>
      {category && <span style={{ fontSize: 10, color: 'rgba(139,30,30,0.30)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{category}</span>}
    </div>
  );
}

/* ── Nav bar — uses shared PublicHeader ─────────────────────────── */
function MarketplaceNav({
  onCartClick, onAuthClick, cartCount, currentUser,
}: {
  onCartClick: () => void;
  onAuthClick: () => void;
  cartCount: number;
  currentUser: any;
}) {
  const navigate = useNavigate();
  return (
    <PublicHeader
      searchPlaceholder="Search by Part Name, OEM Number, or Brand..."
      rightSlot={currentUser ? (
        /* ── Logged in: wishlist + cart + account ── */
        <>
          <button style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <Icon n="favorite_border" style={{ color: '#58413f', fontSize: 22 }} />
          </button>
          <button onClick={onCartClick}
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', position: 'relative' }}>
            <Icon n="shopping_cart" style={{ color: '#58413f', fontSize: 22 }} />
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#8b1e1e', color: '#fff', fontSize: 10, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cartCount}</span>
            )}
          </button>
          <button onClick={onAuthClick}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #dfbfbc', borderRadius: 8, backgroundColor: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1c1b1b' }}>
            <Icon n="account_circle" style={{ fontSize: 20, color: '#58413f' }} />
            {currentUser.name || currentUser.email?.split('@')[0] || 'Account'}
          </button>
        </>
      ) : (
        /* ── Not logged in: Sign In + Get Started (matches landing page) ── */
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
      )}
    />
  );
}

/* ── Product card (matches design exactly) ─────────────────────────── */
function ProductCard({
  product, onAddToCart,
}: {
  product: Product;
  onAddToCart: (p: Product) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasImage = product.image && !imgError;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#fff', border: '1px solid #dfbfbc',
        borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.3s',
      }}>
      {/* Image or placeholder */}
      <div style={{ aspectRatio: '1', backgroundColor: '#fff', padding: hasImage ? 20 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {hasImage ? (
          <img
            src={product.image} alt={product.name}
            onError={() => setImgError(true)}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transform: hovered ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.5s' }}
          />
        ) : (
          <PartImagePlaceholder category={product.category} />
        )}
        {/* OEM/OES badge */}
        <span style={{
          position: 'absolute', top: 12, right: 12,
          backgroundColor: product.type === 'OEM' ? '#8b1e1e' : '#e0e0db',
          color: product.type === 'OEM' ? '#fff' : '#62635f',
          fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {product.type || 'OES'}
        </span>
        {/* Discount badge — only show if >0 */}
        {product.discount > 0 && (
          <span style={{ position: 'absolute', top: 12, left: 12, backgroundColor: '#8b1e1e', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4 }}>
            Save {product.discount}%
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#8b716e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{product.brand}</span>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1c1b1b', lineHeight: 1.4, margin: '6px 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
          {product.name}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {product.partNo && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#58413f' }}>
              <span>Part No:</span>
              <span style={{ fontWeight: 700, color: '#1c1b1b', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{product.partNo}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#58413f' }}>
            <span>Availability:</span>
            <span style={{ fontWeight: 700, color: product.availability === 'In Stock' ? '#166534' : '#8b1e1e' }}>{product.availability || 'Available'}</span>
          </div>
          {/* Shop name + distance from API */}
          {product.shopName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#8b716e' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>storefront</span>
              <span>{product.shopName}</span>
              {product.distance != null && <span>· {product.distance}km away</span>}
            </div>
          )}
          {(product.sellers ?? 0) > 1 && (
            <div style={{ fontSize: 12, color: '#8b716e' }}>{product.sellers} sellers available</div>
          )}
        </div>

        {/* Price + Add to cart */}
        <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #dfbfbc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {product.price > 0 ? (
              <span style={{ fontSize: 22, fontWeight: 800, color: '#8b1e1e', fontFamily: 'Poppins, sans-serif' }}>
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600, color: '#8b716e' }}>Contact for price</span>
            )}
            {/* Only show strikethrough if there's a real discount */}
            {product.discount > 0 && product.originalPrice && product.originalPrice !== product.price && (
              <span style={{ fontSize: 13, color: '#8b716e', textDecoration: 'line-through', marginLeft: 6 }}>
                ₹{product.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <button
            onClick={() => onAddToCart(product)}
            style={{
              backgroundColor: '#8b1e1e', color: '#fff',
              border: 'none', borderRadius: 8, padding: '10px 12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            title="Add to Cart"
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6a020a')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#8b1e1e')}
          >
            <Icon n="add_shopping_cart" style={{ fontSize: 20 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Product type ──────────────────────────────────────────────────── */
interface Product {
  id: string;
  name: string;
  brand: string;
  partNo: string;
  price: number;
  originalPrice?: number;
  discount: number;      // 0 = no discount
  image: string;
  type: 'OEM' | 'OES';
  availability?: string;
  category?: string;     // used by PartImagePlaceholder
  sellers?: number;
  shopName?: string;     // best shop name from API
  distance?: number | null;
}

/* No static demo products — all parts come from the live DB via browseMarketplace() */

const CATEGORIES = [
  { name: 'Engine Components', count: 124 },
  { name: 'Brake System',      count: 82  },
  { name: 'Air Conditioning',  count: 45  },
  { name: 'Belt & Chain Drive',count: 31  },
  { name: 'Suspension',        count: 19  },
  { name: 'Electrical',        count: 67  },
  { name: 'Filters & Fluids',  count: 53  },
];

/* ── Login wall toast ──────────────────────────────────────────────── */
function LoginToast({ onLogin, onClose }: { onLogin: () => void; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      backgroundColor: '#1c1b1b', color: '#fff', borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'Inter, sans-serif',
      fontSize: 14, width: 'calc(100vw - 32px)', maxWidth: 420,
    }}>
      <Icon n="shopping_cart" style={{ fontSize: 22, color: '#ffb3ad' }} />
      <span style={{ flex: 1 }}>Sign in to add items to your cart</span>
      <button onClick={onLogin} style={{ backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
        Sign In
      </button>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9c8c7c', fontSize: 18, padding: '0 4px' }}>×</button>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────── */
export function MarketplacePage() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const { items: cartItems, addItem, count: cartCount } = useCart();
  const ctx = useContext(AppCtx);
  const currentUser = ctx?.currentUser;

  // Filters
  const [priceMax,      setPriceMax]      = useState(50000);
  const [sortBy,        setSortBy]        = useState('Relevance');
  const [partTypes,     setPartTypes]     = useState({ OEM: true, OES: true });
  const [activeCateg,   setActiveCateg]   = useState<string | null>(null);
  const [viewMode,      setViewMode]      = useState<'grid' | 'list'>('grid');
  const [page,          setPage]          = useState(1);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const urlQuery = params.get('q') || '';
  const urlMake  = params.get('make')  || '';
  const urlModel = params.get('model') || '';
  const urlYear  = params.get('year')  || '';
  const [search, setSearch] = useState(urlQuery);

  // Real catalog data from backend
  const PAGE_SIZE = 24;
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogLoading,  setCatalogLoading]  = useState(false);
  const [totalResults,    setTotalResults]    = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  // Vehicle filter (from logged-in user's saved vehicle)
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);

  // Login wall
  const [showLoginToast, setShowLoginToast] = useState(false);

  // Pre-populate vehicle filter from URL params (set by LandingPage "Find Compatible Parts")
  useEffect(() => {
    if (urlMake) {
      const label = `${urlMake}${urlModel ? ' · ' + urlModel : ''}${urlYear ? ' ' + urlYear : ''}`;
      setVehicleFilter(label);
    }
  }, [urlMake, urlModel, urlYear]);

  // Also load from localStorage for logged-in users (only if no URL vehicle was given)
  useEffect(() => {
    if (currentUser && !urlMake) {
      try {
        const vehicles = JSON.parse(localStorage.getItem('vl_vehicles') || '[]');
        const defaultV = vehicles[0];
        if (defaultV?.make) setVehicleFilter(`${defaultV.make}${defaultV.model ? ' · ' + defaultV.model : ''}${defaultV.year ? ' ' + defaultV.year : ''}`);
      } catch {}
    }
  }, [currentUser, urlMake]);

  // Fetch from browseMarketplace (returns real total for pagination)
  useEffect(() => {
    setPage(1); // reset to page 1 when search/filter changes
  }, [urlQuery, urlMake, urlModel, urlYear, activeCateg]);

  useEffect(() => {
    const fetchCatalog = async () => {
      setCatalogLoading(true);
      try {
        const res = await browseMarketplace({
          q:        urlQuery  || undefined,
          make:     urlMake   || undefined,
          model:    urlModel  || undefined,
          year:     urlYear   || undefined,
          category: activeCateg || undefined,
          limit:    PAGE_SIZE,
          offset:   (page - 1) * PAGE_SIZE,
        });

        // browseMarketplace returns RankedPart[]; map to Product shape
        const parts: Product[] = (res.parts || []).map((rp: any) => {
          const prod = rp.product || rp;
          return {
            id:           String(prod.id || prod.masterPartId),
            name:         prod.name || prod.partName || 'Unknown Part',
            brand:        prod.brand || '',
            partNo:       prod.sku  || prod.oemNumber || String(prod.id || ''),
            price:        rp.bestPrice || prod.price || 0,
            image:        prod.imageUrl || '',
            category:     prod.category || prod.categoryL1 || '',
            type:         'OES' as 'OEM' | 'OES',  // API doesn't distinguish OEM/OES at part level
            availability: (rp.availability || 0) > 0 ? 'In Stock' : 'Available',
            discount:     0,
            shopName:     rp.bestListing?.shop?.name || rp.bestShop?.name || '',
            distance:     rp.bestListing?.distance ?? null,
            sellers:      rp.shopCount || 1,
          };
        });

        setCatalogProducts(parts);
        setTotalResults(res.total || parts.length);
      } catch {
        setCatalogProducts([]);
        setTotalResults(0);
      } finally {
        setCatalogLoading(false);
      }
    };
    fetchCatalog();
  }, [urlQuery, urlMake, urlModel, urlYear, activeCateg, page]);

  // Client-side filter on fetched catalog data
  const filtered = catalogProducts.filter(p => {
    if (!partTypes.OEM && p.type === 'OEM') return false;
    if (!partTypes.OES && p.type === 'OES') return false;
    if (p.price > priceMax) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'Price: Low to High') return a.price - b.price;
    if (sortBy === 'Price: High to Low') return b.price - a.price;
    return 0;
  });

  const handleAddToCart = useCallback((product: Product) => {
    if (!currentUser) {
      setShowLoginToast(true);
      return;
    }
    addItem({
      id: product.id, name: product.name, brand: product.brand,
      partNo: product.partNo, price: product.price,
      image: product.image, type: product.type,
      availability: product.availability,
      shipping: 'Ships via RedPiston Logistics Express',
    });
    // Brief feedback
    ctx?.toast?.(`${product.name.slice(0, 30)}… added to cart`, 'success');
  }, [currentUser, addItem, ctx]);

  const sep: React.CSSProperties = { width: '100%', height: 1, backgroundColor: '#dfbfbc', margin: '0 0 20px' };
  const secTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#58413f', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 };

  return (
    <div className="lp-root" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#fcf9f8', minHeight: '100vh' }}>
      <MarketplaceNav
        onCartClick={() => navigate('/cart')}
        onAuthClick={() => currentUser ? null : setAuthModalOpen(true)}
        cartCount={cartCount}
        currentUser={currentUser}
      />

      <main className="mp-main-layout" style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', gap: 24, padding: '24px 24px 48px' }}>

        {/* ── SIDEBAR FILTERS ──────────────────────────────────────── */}
        {/* mp-sidebar-hidden hides on mobile; mp-sidebar-open shows when toggled */}
        <aside className={`mp-sidebar-hidden${sidebarOpen ? ' mp-sidebar-open' : ''}`}
          style={{ width: 260, flexShrink: 0 }}>
          <div style={{
            backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 12, padding: 24,
            position: 'sticky', top: 88,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1b1b' }}>Filters</h2>
              <button onClick={() => { setPriceMax(50000); setSortBy('Relevance'); setPartTypes({ OEM: true, OES: true }); setActiveCateg(null); setVehicleFilter(null); }}
                style={{ background: 'none', border: 'none', color: '#8b1e1e', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Reset All
              </button>
            </div>

            {/* Vehicle filter tag */}
            {vehicleFilter && (
              <div style={{ marginBottom: 20 }}>
                <p style={secTitle}>Filtered For</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139,30,30,0.07)', border: '1px solid rgba(139,30,30,0.25)', borderRadius: 20, padding: '6px 12px' }}>
                  <Icon n="directions_car" style={{ fontSize: 16, color: '#8b1e1e' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#8b1e1e', flex: 1 }}>{vehicleFilter}</span>
                  <button onClick={() => setVehicleFilter(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b1e1e', fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
                <button onClick={() => navigate('/')} style={{ fontSize: 12, color: '#8b716e', marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Change vehicle
                </button>
              </div>
            )}
            <div style={sep} />

            {/* Price Range */}
            <div style={{ marginBottom: 20 }}>
              <p style={secTitle}>Price Range</p>
              <input type="range" min={0} max={50000} value={priceMax} onChange={e => setPriceMax(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#8b1e1e' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8b716e', marginTop: 6 }}>
                <span>₹0</span>
                <span style={{ fontWeight: 600, color: '#1c1b1b' }}>₹{priceMax.toLocaleString('en-IN')}</span>
                <span>₹50k+</span>
              </div>
            </div>
            <div style={sep} />

            {/* Sort By */}
            <div style={{ marginBottom: 20 }}>
              <p style={secTitle}>Sort By</p>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ width: '100%', height: 44, border: '1px solid #dfbfbc', borderRadius: 8, padding: '0 36px 0 12px', fontSize: 14, color: '#1c1b1b', backgroundColor: '#fff', cursor: 'pointer', outline: 'none', appearance: 'none' }}>
                {['Relevance','Price: Low to High','Price: High to Low','Newest Arrivals'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={sep} />

            {/* Part Type */}
            <div style={{ marginBottom: 20 }}>
              <p style={secTitle}>Part Type</p>
              {(['OEM','OES'] as const).map(t => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
                  <input type="checkbox" checked={partTypes[t]} onChange={e => setPartTypes(pt => ({ ...pt, [t]: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: '#8b1e1e', cursor: 'pointer' }} />
                  <span style={{ fontSize: 14, color: '#1c1b1b' }}>
                    {t === 'OEM' ? 'OEM (Original Equipment)' : 'OES (Original Spare)'}
                  </span>
                </label>
              ))}
            </div>
            <div style={sep} />

            {/* Categories */}
            <div style={{ marginBottom: 20 }}>
              <p style={secTitle}>Categories</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {CATEGORIES.map(cat => (
                  <div key={cat.name} onClick={() => setActiveCateg(activeCateg === cat.name ? null : cat.name)}
                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
                    <span style={{ fontSize: 14, color: activeCateg === cat.name ? '#8b1e1e' : '#1c1b1b', fontWeight: activeCateg === cat.name ? 700 : 400 }}>
                      {cat.name}
                    </span>
                    <span style={{ fontSize: 11, backgroundColor: '#e0e0db', color: '#62635f', padding: '2px 7px', borderRadius: 12 }}>{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              style={{ width: '100%', height: 48, backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Apply Filters
            </button>
          </div>
        </aside>

        {/* ── RESULTS ──────────────────────────────────────────────── */}
        <section style={{ flex: 1, minWidth: 0 }}>
          {/* Mobile Filters button — hidden on desktop via .mp-filter-btn CSS class */}
          <button className="mp-filter-btn"
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              display: 'none', // shown via CSS on mobile
              alignItems: 'center', gap: 8, padding: '10px 18px', marginBottom: 16,
              border: '1.5px solid #dfbfbc', borderRadius: 10, backgroundColor: '#fff',
              color: '#1c1b1b', fontWeight: 600, fontSize: 14, cursor: 'pointer', minHeight: 44,
            }}>
            <Icon n="tune" style={{ fontSize: 18, color: '#8b1e1e' }} />
            {sidebarOpen ? 'Hide Filters' : 'Filters'}
          </button>

          {/* Header: wraps on mobile */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8b716e', marginBottom: 8 }}>
                <a href="/" style={{ color: '#8b716e', textDecoration: 'none' }}>Home</a>
                <Icon n="chevron_right" style={{ fontSize: 16 }} />
                <span>Marketplace</span>
                <Icon n="chevron_right" style={{ fontSize: 16 }} />
                <span style={{ color: '#1c1b1b' }}>Search Results</span>
              </div>
              <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(18px, 5vw, 28px)', fontWeight: 700, color: '#1c1b1b', margin: 0 }}>
                {urlQuery ? `Results for "${urlQuery}"` : 'Industrial Parts'}{' '}
                <span style={{ fontWeight: 400, color: '#8b716e', fontSize: 'clamp(14px, 3.5vw, 24px)' }}>
                  {catalogLoading ? '(loading…)' : `(${totalResults.toLocaleString()} results)`}
                </span>
              </h1>
            </div>
            {/* View toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#58413f' }}>View:</span>
              <div style={{ display: 'flex', backgroundColor: '#f0eded', borderRadius: 8, padding: 4 }}>
                <button onClick={() => setViewMode('grid')} style={{ padding: '6px 8px', backgroundColor: viewMode === 'grid' ? '#fff' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                  <Icon n="grid_view" style={{ fontSize: 18, color: viewMode === 'grid' ? '#8b1e1e' : '#58413f' }} />
                </button>
                <button onClick={() => setViewMode('list')} style={{ padding: '6px 8px', backgroundColor: viewMode === 'list' ? '#fff' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                  <Icon n="list" style={{ fontSize: 18, color: viewMode === 'list' ? '#8b1e1e' : '#58413f' }} />
                </button>
              </div>
            </div>
          </div>

          {/* Product grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#8b716e' }}>
              <Icon n="search_off" style={{ fontSize: 48, display: 'block', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 18, fontWeight: 600 }}>No parts found</p>
              <p style={{ fontSize: 14 }}>Try adjusting your filters or search term</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'grid'
                ? 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))'
                : '1fr',
              gap: 20,
            }}>
              {filtered.map(p => <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />)}
            </div>
          )}

          {/* Pagination — calculated from real totalResults */}
          {totalPages > 1 && (() => {
            // Build smart page list: always show first, last, current ±1, with '…' gaps
            const pageSet = new Set([1, totalPages, page, page - 1, page + 1].filter(n => n >= 1 && n <= totalPages));
            const sorted = Array.from(pageSet).sort((a, b) => a - b);
            const withEllipsis: (number | '…')[] = [];
            sorted.forEach((n, i) => {
              if (i > 0 && n - sorted[i - 1] > 1) withEllipsis.push('…');
              withEllipsis.push(n);
            });

            const btnStyle = (active: boolean): React.CSSProperties => ({
              minWidth: 40, height: 40, padding: '0 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, border: active ? 'none' : '1px solid #dfbfbc',
              backgroundColor: active ? '#8b1e1e' : '#fff',
              color: active ? '#fff' : '#1c1b1b',
              fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: 14,
            });

            return (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 40, flexWrap: 'wrap' }}>
                {/* Prev */}
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ ...btnStyle(false), opacity: page === 1 ? 0.4 : 1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                </button>
                {withEllipsis.map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} style={{ padding: '0 4px', color: '#8b716e' }}>…</span>
                    : <button key={p} onClick={() => setPage(p as number)} style={btnStyle(p === page)}>{p}</button>
                )}
                {/* Next */}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ ...btnStyle(false), opacity: page === totalPages ? 0.4 : 1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                </button>
              </div>
            );
          })()}
        </section>
      </main>

      {/* Login wall toast — Sign In navigates to /login which opens the auth modal */}
      {showLoginToast && (
        <LoginToast
          onLogin={() => {
            setShowLoginToast(false);
            // /login renders LandingPage with openAuth=true; state carries the
            // return URL so the user lands back on /marketplace after signing in.
            navigate('/login', { state: { returnTo: '/marketplace' } });
          }}
          onClose={() => setShowLoginToast(false)}
        />
      )}
    </div>
  );
}

export default MarketplacePage;
