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
import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { AppCtx } from '../context/AppCtx';
import { CatalogSearchBar } from '../components/CatalogSearchBar';
import { PublicHeader } from '../components/PublicHeader';
import { browseMarketplace, fetchShops, fetchVehicleManufacturers, fetchVehicleModelsByManufacturer } from '../api/marketplace';
import { isSaved, toggleSavedItem } from '../marketplace/savedItems';
import { ProfileDropdown } from '../components/ProfileDropdown';

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
  onCartClick, onAuthClick, cartCount, currentUser, onLogout,
}: {
  onCartClick: () => void;
  onAuthClick: () => void;
  cartCount: number;
  currentUser: any;
  onLogout?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <PublicHeader
      searchPlaceholder="Search by Part Name, OEM Number, or Brand..."
      rightSlot={currentUser ? (
        /* ── Logged in: wishlist + cart + profile dropdown ── */
        <>
          <button onClick={() => navigate('/saved')} title="Saved Items"
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <Icon n="favorite_border" style={{ color: '#58413f', fontSize: 22 }} />
          </button>
          <button onClick={onCartClick}
            style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', position: 'relative' }}>
            <Icon n="shopping_cart" style={{ color: '#58413f', fontSize: 22 }} />
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#8b1e1e', color: '#fff', fontSize: 10, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cartCount}</span>
            )}
          </button>
          <ProfileDropdown user={currentUser} onLogout={onLogout} />
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
  const [saved, setSaved] = useState(() => isSaved(product.id));
  const hasImage = product.image && !imgError;

  useEffect(() => {
    const sync = () => setSaved(isSaved(product.id));
    window.addEventListener('mp-saved-changed', sync);
    return () => window.removeEventListener('mp-saved-changed', sync);
  }, [product.id]);

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSavedItem({
      id: product.id,
      name: product.name,
      brand: product.brand,
      sku: product.partNo,
      image: product.image || null,
      price: product.price,
      inStock: product.availability !== 'Out of Stock',
      listing: null,
      type: product.type,
    });
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#fff', border: '1px solid #dfbfbc',
        borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        height: '100%',   // fills grid cell so all cards in a row are equal height
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.3s',
      }}>
      {/* Image / placeholder — fixed height, not full aspect-ratio square */}
      <div style={{ height: 140, backgroundColor: '#fff', padding: hasImage ? 12 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {hasImage ? (
          <img
            src={product.image} alt={product.name}
            onError={() => setImgError(true)}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transform: hovered ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.4s' }}
          />
        ) : (
          <PartImagePlaceholder category={product.category} />
        )}
        {/* OEM/OES badge */}
        <span style={{
          position: 'absolute', top: 8, right: 8,
          backgroundColor: product.type === 'OEM' ? '#8b1e1e' : '#e0e0db',
          color: product.type === 'OEM' ? '#fff' : '#62635f',
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {product.type || 'OEM'}
        </span>
        {product.discount > 0 && (
          <span style={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#8b1e1e', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>
            -{product.discount}%
          </span>
        )}
        {/* Save to procurement list */}
        <button
          onClick={handleSaveToggle}
          aria-label={saved ? 'Remove from saved' : 'Save item'}
          style={{
            position: 'absolute', bottom: 8, right: 8,
            width: 30, height: 30, borderRadius: '50%',
            backgroundColor: '#fff', border: '1px solid #dfbfbc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 17, color: '#8b1e1e', fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}>
            {saved ? 'favorite' : 'favorite_border'}
          </span>
        </button>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {product.brand && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#8b716e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{product.brand}</span>
        )}
        {/* Reserve exactly 2 lines so all cards align below the title */}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1c1b1b', lineHeight: 1.4, margin: '4px 0 8px', height: '2.8em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
          {product.name}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {product.partNo && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#58413f' }}>
              <span>Item No:</span>
              <span style={{ fontWeight: 700, color: '#1c1b1b' }}>#{product.partNo}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#58413f' }}>
            <span>Availability:</span>
            <span style={{ fontWeight: 700, color: product.availability === 'In Stock' ? '#166534' : '#8b1e1e' }}>{product.availability || 'Available'}</span>
          </div>
          {product.shopName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8b716e' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>storefront</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.shopName}</span>
              {product.distance != null && <span style={{ flexShrink: 0 }}>· {product.distance}km</span>}
            </div>
          )}
          {(product.sellers ?? 0) > 1 && (
            <div style={{ fontSize: 11, color: '#8b716e' }}>{product.sellers} sellers</div>
          )}
        </div>

        {/* Price + Add to cart */}
        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #f0eded', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            {product.price > 0 ? (
              <span style={{ fontSize: 18, fontWeight: 800, color: '#8b1e1e', fontFamily: 'Poppins, sans-serif' }}>
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#8b716e' }}>Contact for price</span>
            )}
            {product.discount > 0 && product.originalPrice && product.originalPrice !== product.price && (
              <span style={{ fontSize: 11, color: '#8b716e', textDecoration: 'line-through', marginLeft: 4 }}>
                ₹{product.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <button
            onClick={() => onAddToCart(product)}
            title="Add to Cart"
            style={{
              flexShrink: 0, border: 'none', cursor: 'pointer',
              backgroundColor: '#8b1e1e',
              borderRadius: 9, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background-color 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#6a0000';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#8b1e1e';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {/* Clean Feather-style cart */}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 001.95 1.61h9.72a2 2 0 001.95-1.61L23 6H6"/>
            </svg>
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

  // ── URL params — must be declared before any useState that uses them ──────────
  const urlQuery = params.get('q')     || '';
  const urlMake  = params.get('make')  || '';
  const urlModel = params.get('model') || '';
  const urlYear  = params.get('year')  || '';

  const [page,          setPage]          = useState(1);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [search,        setSearch]        = useState(urlQuery);

  // ── Applied (committed) filter values — these drive the actual render/query ──
  const [priceMax,      setPriceMax]      = useState(50000);
  const [sortBy,        setSortBy]        = useState('Relevance');
  const [partTypes,     setPartTypes]     = useState({ OEM: true, OES: true });
  const [activeCateg,   setActiveCateg]   = useState<string | null>(null);

  // ── Staged (draft) filter values — only committed on "Apply Filters" click ──
  const [draftPriceMax,  setDraftPriceMax]  = useState(50000);
  const [draftSortBy,    setDraftSortBy]    = useState('Relevance');
  const [draftPartTypes, setDraftPartTypes] = useState({ OEM: true, OES: true });
  const [draftCateg,     setDraftCateg]     = useState<string | null>(null);

  // ── Vehicle filter (sidebar cascading selects) — urlMake/Model/Year are safe now ──
  const [draftVehicleMake,    setDraftVehicleMake]    = useState(urlMake);
  const [draftVehicleModel,   setDraftVehicleModel]   = useState(urlModel);
  const [draftVehicleYear,    setDraftVehicleYear]    = useState(urlYear);
  const [appliedVehicleMake,  setAppliedVehicleMake]  = useState(urlMake);
  const [appliedVehicleModel, setAppliedVehicleModel] = useState(urlModel);
  const [appliedVehicleYear,  setAppliedVehicleYear]  = useState(urlYear);
  const [makesList,    setMakesList]    = useState<{ id: number; name: string }[]>([]);
  const [modelsList,   setModelsList]   = useState<{ id: number; name: string }[]>([]);
  const [makesLoading,  setMakesLoading]  = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);

  // ── Shop filter ──
  const [draftShopId,   setDraftShopId]   = useState<number | null>(null);
  const [appliedShopId, setAppliedShopId] = useState<number | null>(null);
  const [shopsList,  setShopsList]  = useState<{ id: number; name: string; city?: string }[]>([]);
  const [shopSearch, setShopSearch] = useState('');

  const applyFilters = () => {
    setPriceMax(draftPriceMax);
    setSortBy(draftSortBy);
    setPartTypes(draftPartTypes);
    setActiveCateg(draftCateg);
    setAppliedVehicleMake(draftVehicleMake);
    setAppliedVehicleModel(draftVehicleModel);
    setAppliedVehicleYear(draftVehicleYear);
    setAppliedShopId(draftShopId);
    setPage(1);
  };

  const resetFilters = () => {
    setDraftPriceMax(50000);      setPriceMax(50000);
    setDraftSortBy('Relevance');  setSortBy('Relevance');
    setDraftPartTypes({ OEM: true, OES: true }); setPartTypes({ OEM: true, OES: true });
    setDraftCateg(null);          setActiveCateg(null);
    setDraftVehicleMake('');      setAppliedVehicleMake('');
    setDraftVehicleModel('');     setAppliedVehicleModel('');
    setDraftVehicleYear('');      setAppliedVehicleYear('');
    setDraftShopId(null);         setAppliedShopId(null);
    setVehicleFilter(null);
    setModelsList([]);
    setPage(1);
  };

  // Real catalog data from backend
  const PAGE_SIZE = 20; // 20 = LCM of 4 and 5 columns → last row always full, no orphan card
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogLoading,  setCatalogLoading]  = useState(false);
  const [totalResults,    setTotalResults]    = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  // Vehicle filter (from logged-in user's saved vehicle)
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);

  // Login wall
  const [showLoginToast, setShowLoginToast] = useState(false);

  // ── Load vehicle makes on mount ──────────────────────────────────────────────
  useEffect(() => {
    setMakesLoading(true);
    fetchVehicleManufacturers(undefined)
      .then((data: any[]) => setMakesList((data || []).map((m: any) => ({ id: m.id ?? m.manufacturerId, name: m.name ?? m.manufacturerName ?? m.make }))))
      .catch(() => setMakesList([]))
      .finally(() => setMakesLoading(false));
  }, []);

  // ── Load models whenever draft make changes ───────────────────────────────────
  useEffect(() => {
    if (!draftVehicleMake) { setModelsList([]); return; }
    const mfr = makesList.find(m => m.name.toLowerCase() === draftVehicleMake.toLowerCase());
    if (!mfr) { setModelsList([]); return; }
    setModelsLoading(true);
    fetchVehicleModelsByManufacturer(mfr.id, undefined)
      .then((data: any[]) => setModelsList((data || []).map((m: any) => ({ id: m.id ?? m.modelId, name: m.name ?? m.modelName ?? m.model }))))
      .catch(() => setModelsList([]))
      .finally(() => setModelsLoading(false));
  }, [draftVehicleMake, makesList]);

  // ── Load shops once ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchShops()
      .then((shops: any[]) => setShopsList((shops || []).map((s: any) => ({ id: s.id ?? s.shopId, name: s.name, city: s.city }))))
      .catch(() => setShopsList([]));
  }, []);

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

  // Derive a single part_type param from the partTypes checkboxes
  // → 'OEM' | 'OES' | 'ALL'  (ALL means no filter — show both)
  const activePartType =
    partTypes.OEM && partTypes.OES ? 'ALL'
    : partTypes.OEM ? 'OEM'
    : partTypes.OES ? 'OES'
    : 'ALL'; // neither checked → show all (edge case)

  // Reset to page 1 whenever any filter/search param changes
  useEffect(() => {
    setPage(1);
  }, [urlQuery, appliedVehicleMake, appliedVehicleModel, appliedVehicleYear, activeCateg, priceMax, activePartType, appliedShopId]);

  // Fetch from browseMarketplace — filters are now server-side so total/pagination are accurate
  useEffect(() => {
    const fetchCatalog = async () => {
      setCatalogLoading(true);
      try {
        const res = await browseMarketplace({
          q:        urlQuery              || undefined,
          make:     appliedVehicleMake    || undefined,
          model:    appliedVehicleModel   || undefined,
          year:     appliedVehicleYear    || undefined,
          category: activeCateg           || undefined,
          priceMax: priceMax < 50000      ? priceMax : undefined,
          partType: activePartType !== 'ALL' ? activePartType : undefined,
          shopId:   appliedShopId         || undefined,
          limit:    PAGE_SIZE,
          offset:   (page - 1) * PAGE_SIZE,
        } as any);

        // browseMarketplace returns RankedPart[]; map to Product shape
        const parts: Product[] = (res.parts || []).map((rp: any) => {
          const prod = rp.product || rp;
          return {
            id:           String(prod.id || prod.masterPartId),
            name:         prod.name || prod.partName || 'Unknown Part',
            brand:        prod.brand || '',
            partNo:       String(prod.id || prod.masterPartId || ''), // item number (masterPartId) — OEM no. is confidential
            price:        rp.bestPrice || prod.price || 0,
            image:        prod.imageUrl || '',
            category:     prod.category || prod.categoryL1 || '',
            type:         ((rp.partType || prod.partType || 'OEM').toUpperCase() === 'OES' ? 'OES' : 'OEM') as 'OEM' | 'OES',
            availability: (rp.availability || 0) > 0 ? 'In Stock' : 'Available',
            discount:     0,
            shopName:     rp.bestListing?.shop?.name || rp.bestShop?.name || '',
            distance:     rp.bestListing?.distance ?? null,
            sellers:      rp.shopCount || 1,
          };
        });

        setCatalogProducts(parts);
        setTotalResults(res.total || parts.length); // total is now the DB-filtered count
      } catch {
        setCatalogProducts([]);
        setTotalResults(0);
      } finally {
        setCatalogLoading(false);
      }
    };
    fetchCatalog();
  }, [urlQuery, appliedVehicleMake, appliedVehicleModel, appliedVehicleYear, activeCateg, priceMax, activePartType, appliedShopId, page]);

  // Only client-side sorting remains (no need to re-fetch for order change)
  const filtered = catalogProducts.slice().sort((a, b) => {
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

  // Scroll results into view when page changes (not the whole window — just the section top)
  const resultsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [page]);

  const sep: React.CSSProperties = { width: '100%', height: 1, backgroundColor: '#dfbfbc', margin: '0 0 20px' };
  const secTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#58413f', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 };

  return (
    <div className="lp-root" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#fcf9f8', minHeight: '100vh' }}>
      <MarketplaceNav
        onCartClick={() => navigate('/cart')}
        onAuthClick={() => currentUser ? null : setAuthModalOpen(true)}
        cartCount={cartCount}
        currentUser={currentUser}
        onLogout={ctx?.handleLogout}
      />

      <main className="mp-main-layout" style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', gap: 24, padding: '24px 24px 48px' }}>

        {/* ── SIDEBAR FILTERS ──────────────────────────────────────── */}
        {/* mp-sidebar-hidden hides on mobile; mp-sidebar-open shows when toggled */}
        <aside className={`mp-sidebar-hidden${sidebarOpen ? ' mp-sidebar-open' : ''}`}
          style={{ width: 260, flexShrink: 0 }}>
          <div style={{
            backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 12,
          }}>
            <div style={{ padding: 24 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1b1b' }}>Filters</h2>
              <button onClick={resetFilters}
                style={{ background: 'none', border: 'none', color: '#8b1e1e', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Reset All
              </button>
            </div>

            {/* ── VEHICLE FILTER ─────────────────────────────────────── */}
            <div style={{ marginBottom: 20 }}>
              <p style={secTitle}>
                <Icon n="directions_car" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 5 }} />
                Filter by Vehicle
              </p>

              {/* Make */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: '#8b716e', display: 'block', marginBottom: 4 }}>Make</label>
                <select
                  value={draftVehicleMake}
                  onChange={e => { setDraftVehicleMake(e.target.value); setDraftVehicleModel(''); }}
                  style={{ width: '100%', height: 38, border: '1px solid #dfbfbc', borderRadius: 8, padding: '0 10px', fontSize: 13, color: '#1c1b1b', backgroundColor: '#fff', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="">All Makes</option>
                  {makesLoading
                    ? <option disabled>Loading…</option>
                    : makesList.map(m => <option key={m.id} value={m.name}>{m.name}</option>)
                  }
                </select>
              </div>

              {/* Model — only shown once a make is picked */}
              {draftVehicleMake && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: '#8b716e', display: 'block', marginBottom: 4 }}>Model</label>
                  <select
                    value={draftVehicleModel}
                    onChange={e => setDraftVehicleModel(e.target.value)}
                    style={{ width: '100%', height: 38, border: '1px solid #dfbfbc', borderRadius: 8, padding: '0 10px', fontSize: 13, color: '#1c1b1b', backgroundColor: '#fff', cursor: 'pointer', outline: 'none' }}
                  >
                    <option value="">All Models</option>
                    {modelsLoading
                      ? <option disabled>Loading…</option>
                      : modelsList.map(m => <option key={m.id} value={m.name}>{m.name}</option>)
                    }
                  </select>
                </div>
              )}

              {/* Year */}
              <div>
                <label style={{ fontSize: 11, color: '#8b716e', display: 'block', marginBottom: 4 }}>Year</label>
                <input
                  type="number" min={1990} max={new Date().getFullYear()} placeholder="e.g. 2020"
                  value={draftVehicleYear}
                  onChange={e => setDraftVehicleYear(e.target.value)}
                  style={{ width: '100%', height: 38, border: '1px solid #dfbfbc', borderRadius: 8, padding: '0 10px', fontSize: 13, color: '#1c1b1b', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Active vehicle chip */}
              {appliedVehicleMake && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,30,30,0.07)', border: '1px solid rgba(139,30,30,0.25)', borderRadius: 20, padding: '5px 10px' }}>
                  <Icon n="directions_car" style={{ fontSize: 14, color: '#8b1e1e' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#8b1e1e', flex: 1 }}>
                    {[appliedVehicleMake, appliedVehicleModel, appliedVehicleYear].filter(Boolean).join(' · ')}
                  </span>
                  <button onClick={() => {
                    setDraftVehicleMake(''); setDraftVehicleModel(''); setDraftVehicleYear('');
                    setAppliedVehicleMake(''); setAppliedVehicleModel(''); setAppliedVehicleYear('');
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b1e1e', fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
              )}
            </div>
            <div style={sep} />

            {/* ── SHOP FILTER ────────────────────────────────────────── */}
            <div style={{ marginBottom: 20 }}>
              <p style={secTitle}>
                <Icon n="storefront" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 5 }} />
                Filter by Shop
              </p>

              {/* Search box */}
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Icon n="search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#8b716e' }} />
                <input
                  type="text" placeholder="Search shops…"
                  value={shopSearch} onChange={e => setShopSearch(e.target.value)}
                  style={{ width: '100%', height: 36, border: '1px solid #dfbfbc', borderRadius: 8, paddingLeft: 30, paddingRight: 10, fontSize: 13, color: '#1c1b1b', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Shop list — radio style, max 6 visible then scroll */}
              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* "All shops" option */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 6px', borderRadius: 6, backgroundColor: draftShopId === null ? 'rgba(139,30,30,0.06)' : 'transparent' }}>
                  <input type="radio" name="shopFilter" checked={draftShopId === null} onChange={() => setDraftShopId(null)}
                    style={{ accentColor: '#8b1e1e', cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: '#1c1b1b', fontWeight: draftShopId === null ? 600 : 400 }}>All Shops</span>
                </label>

                {shopsList
                  .filter(s => !shopSearch || s.name.toLowerCase().includes(shopSearch.toLowerCase()) || (s.city || '').toLowerCase().includes(shopSearch.toLowerCase()))
                  .map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '5px 6px', borderRadius: 6, backgroundColor: draftShopId === s.id ? 'rgba(139,30,30,0.06)' : 'transparent' }}>
                      <input type="radio" name="shopFilter" checked={draftShopId === s.id} onChange={() => setDraftShopId(s.id)}
                        style={{ accentColor: '#8b1e1e', cursor: 'pointer' }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#1c1b1b', fontWeight: draftShopId === s.id ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                        {s.city && <div style={{ fontSize: 11, color: '#8b716e' }}>{s.city}</div>}
                      </div>
                    </label>
                  ))
                }
              </div>

              {/* Active shop chip */}
              {appliedShopId !== null && (() => {
                const shop = shopsList.find(s => s.id === appliedShopId);
                return shop ? (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,30,30,0.07)', border: '1px solid rgba(139,30,30,0.25)', borderRadius: 20, padding: '5px 10px' }}>
                    <Icon n="storefront" style={{ fontSize: 14, color: '#8b1e1e' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#8b1e1e', flex: 1 }}>{shop.name}</span>
                    <button onClick={() => { setDraftShopId(null); setAppliedShopId(null); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b1e1e', fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                ) : null;
              })()}
            </div>
            <div style={sep} />

            {/* Price Range */}
            <div style={{ marginBottom: 20 }}>
              <p style={secTitle}>Price Range</p>
              <input type="range" min={0} max={50000} value={draftPriceMax} onChange={e => setDraftPriceMax(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#8b1e1e' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8b716e', marginTop: 6 }}>
                <span>₹0</span>
                <span style={{ fontWeight: 600, color: '#1c1b1b' }}>₹{draftPriceMax.toLocaleString('en-IN')}</span>
                <span>₹50k+</span>
              </div>
            </div>
            <div style={sep} />

            {/* Sort By */}
            <div style={{ marginBottom: 20 }}>
              <p style={secTitle}>Sort By</p>
              <select value={draftSortBy} onChange={e => setDraftSortBy(e.target.value)}
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
                  <input type="checkbox" checked={draftPartTypes[t]} onChange={e => setDraftPartTypes(pt => ({ ...pt, [t]: e.target.checked }))}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <div key={cat.name} onClick={() => setDraftCateg(draftCateg === cat.name ? null : cat.name)}
                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
                    <span style={{ fontSize: 14, color: draftCateg === cat.name ? '#8b1e1e' : '#1c1b1b', fontWeight: draftCateg === cat.name ? 700 : 400 }}>
                      {cat.name}
                    </span>
                    <span style={{ fontSize: 11, backgroundColor: draftCateg === cat.name ? 'rgba(139,30,30,0.1)' : '#e0e0db', color: draftCateg === cat.name ? '#8b1e1e' : '#62635f', padding: '2px 7px', borderRadius: 12, fontWeight: draftCateg === cat.name ? 700 : 400 }}>{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={applyFilters}
              style={{ width: '100%', height: 48, backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 2 }}>
              Apply Filters
            </button>

            </div>{/* /padding wrapper */}
          </div>
        </aside>

        {/* ── RESULTS ──────────────────────────────────────────────── */}
        <section ref={resultsRef} style={{ flex: 1, minWidth: 0 }}>
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
            {sidebarOpen ? 'Hide Filters' : 'Sort & Filter'}
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
          </div>

          {/* Card animation keyframes */}
          <style>{`
            @keyframes mp-card-in {
              from { opacity: 0; transform: translateY(14px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes mp-skeleton-pulse {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.45; }
            }
            .mp-card-animated {
              animation: mp-card-in 0.32s ease-out both;
            }
            .mp-skeleton-box {
              background: #ede8e7;
              border-radius: 6px;
              animation: mp-skeleton-pulse 1.4s ease-in-out infinite;
            }
          `}</style>

          {/* Product grid — skeletons while loading, then real cards with stagger */}
          {catalogLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px, 100%), 1fr))', gap: 14 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 12, overflow: 'hidden' }}>
                  {/* image placeholder */}
                  <div className="mp-skeleton-box" style={{ height: 140, borderRadius: 0, animationDelay: `${i * 0.05}s` }} />
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="mp-skeleton-box" style={{ height: 10, width: '45%', animationDelay: `${i * 0.05 + 0.1}s` }} />
                    <div className="mp-skeleton-box" style={{ height: 13, width: '90%', animationDelay: `${i * 0.05 + 0.15}s` }} />
                    <div className="mp-skeleton-box" style={{ height: 13, width: '70%', animationDelay: `${i * 0.05 + 0.2}s` }} />
                    <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="mp-skeleton-box" style={{ height: 18, width: '40%', animationDelay: `${i * 0.05 + 0.25}s` }} />
                      <div className="mp-skeleton-box" style={{ height: 34, width: 38, borderRadius: 7, animationDelay: `${i * 0.05 + 0.25}s` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#8b716e' }}>
              <Icon n="search_off" style={{ fontSize: 48, display: 'block', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 18, fontWeight: 600 }}>No parts found</p>
              <p style={{ fontSize: 14 }}>Try adjusting your filters or search term</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px, 100%), 1fr))', gap: 14 }}>
              {filtered.map((p, i) => (
                <div
                  key={p.id}
                  className="mp-card-animated"
                  style={{ animationDelay: `${Math.min(i, 9) * 0.04}s`, display: 'flex', flexDirection: 'column' }}
                >
                  <ProductCard product={p} onAddToCart={handleAddToCart} />
                </div>
              ))}
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
