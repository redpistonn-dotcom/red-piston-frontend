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
import { api } from '../api/client';
import { CatalogSearchBar } from '../components/CatalogSearchBar';

/* ── Shared icon shorthand ─────────────────────────────────────────── */
function Icon({ n, style }: { n: string; style?: React.CSSProperties }) {
  return <span className="material-symbols-outlined" style={style}>{n}</span>;
}

/* ── Shared nav bar ────────────────────────────────────────────────── */
function MarketplaceNav({
  search, onSearch, onCartClick, onAuthClick, cartCount, currentUser,
}: {
  search: string;
  onSearch: (v: string) => void;
  onCartClick: () => void;
  onAuthClick: () => void;
  cartCount: number;
  currentUser: any;
}) {
  const navigate = useNavigate();
  return (
    <header style={{
      backgroundColor: '#fcf9f8', borderBottom: '1px solid #dfbfbc',
      position: 'sticky', top: 0, zIndex: 50,
      width: '100%', height: 72,
    }}>
      <div style={{
        maxWidth: 1440, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: '100%', gap: 24,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexShrink: 0 }}>
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHoRqueT7rYQ9UU0uaqdoukDlx38GMecl-iaxA_YPsKta4MkYIh1zNn8Cq0sPsr7M4RgQ_U9qftq7c7PW05n3PYedVKG1_Cpvw5_kyltJtcea9-H5bNgTqs1NRGHFnhX112m_HSJaZ_F722rFQmkTxVmCCp4R5IZWlInV5SCBfQPTQHPO3YJFw6En0MQgRNEFl44PmMZH8bZyTjh0btvYW3gM2r1JgFZvpQS67UpJr1SYz_N81ByrPkXv3k89WFF_7n0z5A0S4BE4"
            alt="RedPiston"
            style={{ height: 40, width: 'auto', objectFit: 'contain', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          />
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { label: 'Marketplace', href: '/marketplace' },
              { label: 'OEM Parts',   href: '/oem-parts' },
              { label: 'Suppliers',   href: '/suppliers' },
            ].map(({ label: l, href }) => (
              <a key={l} href={href} style={{ color: l === 'Marketplace' ? '#8b1e1e' : '#58413f', fontSize: 14, fontWeight: l === 'Marketplace' ? 700 : 500, textDecoration: 'none', borderBottom: l === 'Marketplace' ? '2px solid #8b1e1e' : '2px solid transparent', paddingBottom: 4 }}>{l}</a>
            ))}
          </div>
        </div>

        {/* Search — connected to master catalog via CatalogSearchBar */}
        <div style={{ flex: 1, maxWidth: 600 }}>
          <CatalogSearchBar placeholder="Search by Part Name, OEM Number, or Brand..." />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Wishlist */}
          <button style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <Icon n="favorite_border" style={{ color: '#58413f', fontSize: 22 }} />
          </button>
          {/* Cart */}
          <button onClick={onCartClick}
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', position: 'relative' }}>
            <Icon n="shopping_cart" style={{ color: '#58413f', fontSize: 22 }} />
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#8b1e1e', color: '#fff', fontSize: 10, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cartCount}</span>
            )}
          </button>
          {/* Auth */}
          <button onClick={onAuthClick}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #dfbfbc', borderRadius: 8, backgroundColor: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1c1b1b' }}>
            <Icon n="account_circle" style={{ fontSize: 20, color: '#58413f' }} />
            {currentUser ? (currentUser.name || currentUser.email?.split('@')[0] || 'Account') : 'Log In'}
          </button>
        </div>
      </div>
    </header>
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
      {/* Image */}
      <div style={{ aspectRatio: '1', backgroundColor: '#fff', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <img src={product.image} alt={product.name}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transform: hovered ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.5s' }} />
        {/* OEM/OES badge */}
        <span style={{
          position: 'absolute', top: 12, right: 12,
          backgroundColor: product.type === 'OEM' ? '#8b1e1e' : '#e0e0db',
          color: product.type === 'OEM' ? '#fff' : '#62635f',
          fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {product.type || 'OEM'}
        </span>
        {/* Save 20% badge */}
        {product.discount && (
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
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#58413f' }}>
            <span>Part No:</span>
            <span style={{ fontWeight: 700, color: '#1c1b1b' }}>{product.partNo}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#58413f' }}>
            <span>Availability:</span>
            <span style={{ fontWeight: 700, color: '#8b1e1e' }}>{product.availability || 'In Stock'}</span>
          </div>
          {product.sellers && (
            <div style={{ fontSize: 12, color: '#8b716e' }}>{product.sellers} Seller{product.sellers > 1 ? 's' : ''}</div>
          )}
        </div>

        {/* Price + Add to cart */}
        <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #dfbfbc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#8b1e1e', fontFamily: 'Poppins, sans-serif' }}>
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {product.originalPrice && (
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
  discount?: number;
  image: string;
  type: 'OEM' | 'OES';
  availability?: string;
  category?: string;
  sellers?: number;
}

/* ── Static demo products (design data) ───────────────────────────── */
const DEMO_PRODUCTS: Product[] = [
  { id: '1', brand: 'BREMBO INDUSTRIAL', name: 'Ventilated Heavy-Duty Brake Disc Rotor with Coating', partNo: '09.C422.11', price: 8499, originalPrice: 10625, discount: 20, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKYvHm0DrXaMNN_XxUcXtGNpo1YzlQhfudU9sHnfqyaH9BWKF-ZehDzu90iflFI7aKOk_BgIzAwzyGR0v2uX0cVq6VJ_AGc1Ur_kCw8YkWjMUMaUNFBY0eHMA4faeNYnv_Rx88UANJoBU4tIqVlkvDzGGycP9d_fDG6WFGYdK5Dgo5mdzji_vqaH_yvonyjt6DreCRXg1iKVOG8n8BLhrqkVn8YY0Nw91IByAFE7hRFW2pIpWozU-azv_zyhr_RP7AM0ETKW0ArlY', type: 'OEM', availability: '1.2 km away', sellers: 1 },
  { id: '2', brand: 'GARRETT MOTION', name: 'GTX3076R Gen II Dual Ball Bearing Turbocharger', partNo: '849849-5002S', price: 27500, originalPrice: 34375, discount: 20, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDP2XS17jS9sTzR__xuzEdhaYtJ6zPkDgNfYg7Jc3-KGzok8JN-R54efiR2BlJ_NWoIByf3tLRGATCLugO6e-_HbhwrXyftzzTQpJtnzbVYLlVI41oEGUJm0w2SYF7TxK-ZwFL92zrJO6bycxzWctuDWSj_qqvsHOqYp4nOezDRuoqjgCVCTp-vu3rh9rq-vMXL-Ss8bm6L0eZzOkidyeB6RXOB0bL8AIo3hUkY5zlZIwAD9lxaBzqahpic0XY7Omh8x8F3nxfy9l0', type: 'OES', availability: '3.5 km away', sellers: 1 },
  { id: '3', brand: 'DENSO CORP', name: 'High Output 150A Alternator - Series 4', partNo: 'DAN1328', price: 5599, originalPrice: 6999, discount: 20, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA22ksS8tjxAPUwMyP-t6RuYT4ZCVK0RhtkjtcKIicUMQ2ty0t8q85baYw--4uCVFDGZJjLrQJXJ1Z7Yym9EPd65aiRGxMPEjX2FXJT86VmLu9QnSL_KvRCocZ0zXRJtiAEjSBBfLX8qtPbxAmISpTSpbMyMvSuHlozVVpScFVYBm40visp55qj3VAVCPgKKrTzfYHUn6nlOxpGQwe3pIy2TRQymTAfgTx1L7YhSdRSXhG9GofNnOzLiVfoAy8WaTQf8aEOO3VTJHk', type: 'OEM', availability: '0.8 km away', sellers: 1 },
  { id: '4', brand: 'BILSTEIN', name: 'B6 Performance Front Gas Pressure Shock Absorber', partNo: '24-184976', price: 3199, originalPrice: 3999, discount: 20, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoFopVMfKmhrpufzMMP0htqnHMzYmG8Gw2UFJ0hb56G23PFuT_AguTZmVvrSeJeJNCrsTcNXWoTanUCceht6AufYTYxReRxFpwLzXsLHTmZaqvrAg9ZbB-GfyTBuLk_lMU2kU2XrIltH29-c01bYLqk8hUvELKIZw7s_MPenuxnVT5RkSmCddyeATO9qicf0XUkmYbqe7YhHRHIoIDdX3rsYjee0j6hkzaIoSmpb1BSK1kT-jtBgMhgFR-5Bvzhmsuey7I0kyAi2M', type: 'OEM', availability: '12 km away', sellers: 1 },
  { id: '5', brand: 'NGK SPARK PLUG', name: 'Laser Iridium Premium Spark Plug Set (x4)', partNo: 'SILZKR7B11', price: 1099, originalPrice: 1374, discount: 20, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCP6gtVYOZ0A8GlMfDslqHyI0zvWxZhWCTFq4RY5Sk6_HLiSTNafQ4ybwLaVrz3GdCbIQGVJ9wUcLBL1q287YNLsJSIfZAQSlX2qcKPv9KiAaNk_hgB0sUX5OW4GRC5BnVN4pkojBQ-ehbBe21fcySgow_10mczGVTlxL-cTFHPRRhyYEORhvwV9f0FPW-ko7njPvZ_P0WTpjZujypnuRNJrm3kR80ECG6gfemx4cGjB46Ggt3uKsz5QR1GyFSAqf9FsuXidEvOqdE', type: 'OEM', availability: '2.1 km away', sellers: 1 },
  { id: '6', brand: 'GATES UNITA', name: 'Reinforced EPDM Timing Belt - Precision Fit', partNo: 'T328RB', price: 1920, originalPrice: 2400, discount: 20, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4P_Dqy6mh5eaLa1iOFGxfTh8FAGVJ1Z1V4fCuQwes4nuTkMKTecPTKAXhd3cGOBVVmu3GI_ttusjfLg_CVoN-IiW0kPYXg2wuB5xIye01LC3VAlrPgB4WHNQwWWaB7052mTekcIADV3BnM2egKq2vZtsw4a0lQtesFjR2vuhlp1nbo3vTOukh4J4JVf95jy9mRaijqwwtcSNezcbiMQvfJS9bLn0Mb85uYKQGupP8Uu1L8EJqdWl2KuxmWF1Bf0uXeCNNNBJUnzM', type: 'OES', availability: '5.5 km away', sellers: 1 },
  { id: '7', brand: 'BOSCH', name: 'Premium Ignition Coil Set — Direct Fit', partNo: 'F000ZS0206', price: 2499, originalPrice: 3124, discount: 20, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOlwJou4Lm9VYehyDxPD6GSrcXp1SQsbDzfUUnW0U3cn8Wl7zZPHlclUzHORFL4ZIDCTpichc5D2-Wv0aGDeqMfcWEq_2M9fPjnDTwcECwoL7cfNlxRiiaWffJuWbkQa0_oduZ2eA2EejoMURv-b4oqBZk0jc5nVQpR5qsrvcgxlLb9ttHCyApdiw95089dKsrk0fry-rrxmJn6O7sSa1Y94p8yPfDWde-8wzVc4Y_-XfyRyaK6c2vyf2U5zeN6yxFuYB3FfLTIJU', type: 'OEM', availability: '4.0 km away', sellers: 1 },
  { id: '8', brand: 'MANN-FILTER', name: 'Heavy Duty Engine Oil Filter — Multi-Layer', partNo: 'W940/66', price: 849, originalPrice: 1062, discount: 20, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJKjKKnIwHK2hAhy56vQWebehIR8DoulZi67ReTWX1Cukr2z4I75DNfCpsroAxDDIfO9AVpKZ56LJ__L43v6EGALPKa4v1B9B-i_ve3T8dxHLMtLIkpxng5NcvRumlrTjJzkrQxHFObjx1FG8g98nB4OF8qFvNA5nWK6JnQKSBUBgqW_BzHE0aEPBU82m46U8I7vLJo-lAxaDag5_m6GvUoopH_hQKYPuKN47Kw7xJJKQfsPbnbMtnl2ny9ZEO8u5pzD675p-pZw', type: 'OES', availability: '1.8 km away', sellers: 1 },
  { id: '9', brand: 'CASTROL', name: 'EDGE 5W-30 Titanium Full Synthetic Engine Oil 5L', partNo: 'CAS5W30-5L', price: 2199, originalPrice: 2749, discount: 20, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-5uk-GIYbtK6b5b-svhCZvUWI7ZQ0TEEw_2rB7_ogIfWXDRASPps40KkOjUTh9Ko1M6_HmQqeNz_3E6V2PlfKw818YWIrMxaw6l_rkPHpMYtksRNf3cWDB3QexA1teMcUrVS0hEma-lbDKFMP5bm1AhNxkpcamNBISLCl-TKxIOttxCK-Hm1fpscxNnLNeo2sMVLJloXgKi5NB9bNjkpng9ZUwyIEx8RAqdcTPD11Aqs2DL54EpOe_3qUMw7yhvobh-AuYC2TG1c', type: 'OES', availability: 'In Stock', sellers: 3 },
];

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
      backgroundColor: '#1c1b1b', color: '#fff', borderRadius: 12, padding: '16px 24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'Inter, sans-serif',
      fontSize: 14, minWidth: 360,
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
  const urlQuery = params.get('q') || '';
  const [search, setSearch] = useState(urlQuery);

  // Real catalog data from backend
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogLoading,  setCatalogLoading]  = useState(false);
  const [totalResults,    setTotalResults]    = useState(0);

  // Vehicle filter (from logged-in user's saved vehicle)
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);

  // Login wall
  const [showLoginToast, setShowLoginToast] = useState(false);

  // Load vehicle from localStorage if user is logged in
  useEffect(() => {
    if (currentUser) {
      try {
        const vehicles = JSON.parse(localStorage.getItem('vl_vehicles') || '[]');
        const defaultV = vehicles[0];
        if (defaultV?.make) setVehicleFilter(`${defaultV.make}${defaultV.model ? ' · ' + defaultV.model : ''}${defaultV.year ? ' ' + defaultV.year : ''}`);
      } catch {}
    }
  }, [currentUser]);

  // Fetch from /api/catalog/search when URL query or filters change
  useEffect(() => {
    const fetchCatalog = async () => {
      setCatalogLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (urlQuery) queryParams.set('q', urlQuery);
        else queryParams.set('q', 'brake'); // default browse
        if (activeCateg) queryParams.set('category', activeCateg);
        queryParams.set('limit', '24');
        queryParams.set('offset', String((page - 1) * 24));

        const data = await api.get<{ parts: any[] }>(`/api/catalog/search?${queryParams}`);
        const parts = (data.parts || []).map((p: any, i: number): Product => ({
          id: String(p.masterPartId || i),
          name: p.partName || 'Unknown Part',
          brand: p.brand || '',
          partNo: p.primaryOemNumber || p.masterPartId || '',
          price: Math.floor(Math.random() * 8000) + 500, // price from ShopInventory in real impl
          image: p.imageUrl || DEMO_PRODUCTS[i % DEMO_PRODUCTS.length]?.image || '',
          type: (p.categoryL1?.includes('OEM') ? 'OEM' : 'OES') as 'OEM' | 'OES',
          availability: 'In Stock',
          discount: 20,
          originalPrice: Math.floor(Math.random() * 10000) + 700,
        }));
        setCatalogProducts(parts.length > 0 ? parts : DEMO_PRODUCTS);
        setTotalResults(parts.length > 0 ? parts.length : DEMO_PRODUCTS.length);
      } catch {
        // Fallback to demo data when backend unavailable
        setCatalogProducts(DEMO_PRODUCTS);
        setTotalResults(DEMO_PRODUCTS.length);
      } finally {
        setCatalogLoading(false);
      }
    };
    fetchCatalog();
  }, [urlQuery, activeCateg, page]);

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
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        onCartClick={() => navigate('/cart')}
        onAuthClick={() => currentUser ? null : setAuthModalOpen(true)}
        cartCount={cartCount}
        currentUser={currentUser}
      />

      <main style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', gap: 24, padding: '24px 24px 48px' }}>

        {/* ── SIDEBAR FILTERS ──────────────────────────────────────── */}
        <aside style={{ width: 260, flexShrink: 0 }}>
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
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            <div>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8b716e', marginBottom: 8 }}>
                <a href="/" style={{ color: '#8b716e', textDecoration: 'none' }}>Home</a>
                <Icon n="chevron_right" style={{ fontSize: 16 }} />
                <span>Marketplace</span>
                <Icon n="chevron_right" style={{ fontSize: 16 }} />
                <span style={{ color: '#1c1b1b' }}>Search Results</span>
              </div>
              <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 28, fontWeight: 700, color: '#1c1b1b', margin: 0 }}>
                {urlQuery ? `Results for "${urlQuery}"` : 'Industrial Parts'}{' '}
                <span style={{ fontWeight: 400, color: '#8b716e', fontSize: 24 }}>
                  {catalogLoading ? '(loading…)' : `(${filtered.length} results)`}
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
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(3, 1fr)' : '1fr',
              gap: 20,
            }}>
              {filtered.map(p => <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />)}
            </div>
          )}

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 40 }}>
            {[1,2,3,'…',42].map((p, i) => (
              <button key={i} onClick={() => typeof p === 'number' && setPage(p)}
                style={{
                  width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8, border: p === page ? 'none' : '1px solid #dfbfbc',
                  backgroundColor: p === page ? '#8b1e1e' : '#fff',
                  color: p === page ? '#fff' : '#1c1b1b',
                  fontWeight: p === page ? 700 : 400, cursor: 'pointer', fontSize: 14,
                }}>
                {p}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Login wall toast */}
      {showLoginToast && (
        <LoginToast
          onLogin={() => { setShowLoginToast(false); setAuthModalOpen(true); }}
          onClose={() => setShowLoginToast(false)}
        />
      )}
    </div>
  );
}

export default MarketplacePage;
