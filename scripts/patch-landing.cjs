/**
 * patch-landing.js — replaces all static data sections in LandingPage.tsx
 * with live API-driven code. Run once from project root:
 *   node scripts/patch-landing.js
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'LandingPage.tsx');
// Normalize to LF so all indexOf/replaceOnce calls work regardless of git checkout line-ending setting
let c = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

function replaceOnce(src, oldStr, newStr, label) {
  const idx = src.indexOf(oldStr);
  if (idx === -1) {
    console.error('NOT FOUND [' + label + ']:', JSON.stringify(oldStr.slice(0, 80)));
    process.exit(1);
  }
  return src.slice(0, idx) + newStr + src.slice(idx + oldStr.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Update import to add browseMarketplace + fetchShops
// ─────────────────────────────────────────────────────────────────────────────
c = replaceOnce(c,
  "import { fetchVehicleManufacturers, fetchVehicleModelsByManufacturer } from '../api/marketplace';",
  "import { fetchVehicleManufacturers, fetchVehicleModelsByManufacturer, browseMarketplace, fetchShops } from '../api/marketplace';",
  'import'
);
console.log('1 import done');

// ─────────────────────────────────────────────────────────────────────────────
// 2. Add helpers + constants after Icon function
// ─────────────────────────────────────────────────────────────────────────────
const ICON_FN = `function Icon({ n, className = '' }: { n: string; className?: string }) {
  return <span className={\`material-symbols-outlined \${className}\`}>{n}</span>;
}`;

const HELPERS = `
/* ── Image placeholder — shown when a part has no photo in the DB ───────────
   Uses a maroon-tinted background + category-matched Material Symbol icon.   */
function PartImagePlaceholder({ category, height = 140 }: { category?: string; height?: number }) {
  const ICON_MAP: Record<string, string> = {
    Brakes: 'settings_input_component', Engine: 'settings',
    Electrical: 'bolt', Filters: 'filter_alt',
    Suspension: 'architecture', Cooling: 'ac_unit',
    Ignition: 'flash_on', 'Engine Oils': 'oil_barrel',
    Fluids: 'water_drop', Exhaust: 'air', Steering: 'trip_origin',
    'Body & Exterior': 'directions_car',
    'Clutch & Transmission': 'settings_input_composite',
  };
  const icon = (category && ICON_MAP[category]) || 'inventory_2';
  return (
    <div style={{
      width: '100%', height,
      backgroundColor: 'rgba(139,30,30,0.05)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 34, color: 'rgba(139,30,30,0.28)' }}>{icon}</span>
      {category && (
        <span style={{ fontSize: 10, color: 'rgba(139,30,30,0.33)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
          {category}
        </span>
      )}
    </div>
  );
}

/* ── Shop placeholder — shown when a shop has no cover photo in DB ─────────── */
function ShopImagePlaceholder({ name }: { name: string }) {
  const words = (name || '').trim().split(/\\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : (name || 'S').substring(0, 2).toUpperCase();
  return (
    <div className="w-full sm:w-56" style={{
      minHeight: 140, backgroundColor: '#2c2929',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.04em' }}>
        {initials}
      </span>
    </div>
  );
}

/* ── Skeleton card — shown while API fetches part / shop data ─────────────── */
function PartCardSkeleton() {
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 10, overflow: 'hidden' }}>
      <div className="lp-skeleton" style={{ height: 140, backgroundColor: '#f0eded' }} />
      <div style={{ padding: 12 }}>
        <div className="lp-skeleton" style={{ height: 12, backgroundColor: '#f0eded', borderRadius: 4, marginBottom: 8, width: '80%' }} />
        <div className="lp-skeleton" style={{ height: 10, backgroundColor: '#f0eded', borderRadius: 4, width: '58%' }} />
      </div>
    </div>
  );
}

/* ── Fallback OEM brand list used when the manufacturers API is down ─────── */
const OEM_BRANDS_STATIC = [
  { label: 'Maruti Suzuki', color: '#003082', initial: 'MS' },
  { label: 'Hyundai',       color: '#002C5F', initial: 'HY' },
  { label: 'Toyota',        color: '#EB0A1E', initial: 'TY' },
  { label: 'Škoda',         color: '#4BA82E', initial: 'SK' },
  { label: 'Honda',         color: '#CC0000', initial: 'HN' },
  { label: 'BMW',           color: '#1C69D4', initial: 'BM' },
  { label: 'Audi',          color: '#BB0A30', initial: 'AU' },
];

/* ── Color palette cycled for dynamically fetched brands ─────────────────── */
const BRAND_PALETTE = [
  '#003082','#002C5F','#EB0A1E','#4BA82E','#CC0000',
  '#1C69D4','#BB0A30','#005CA9','#1C3764','#6C3483',
  '#117A65','#884EA0',
];
`;
c = replaceOnce(c, ICON_FN, ICON_FN + HELPERS, 'helpers');
console.log('2 helpers done');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Add state + useEffects after YEARS const
// ─────────────────────────────────────────────────────────────────────────────
const YEARS_LINE = `  const YEARS = Array.from({ length: 25 }, (_, i) => String(new Date().getFullYear() - i));`;
const NEW_STATE = `
  /* ── Live data from DB ─────────────────────────────────────────────────── */
  const [topParts,      setTopParts]      = useState<any[]>([]);
  const [trendingParts, setTrendingParts] = useState<any[]>([]);
  const [shopsList,     setShopsList]     = useState<any[]>([]);
  const [oemBrands,     setOemBrands]     = useState<{ label: string; color: string; initial: string }[]>(OEM_BRANDS_STATIC);
  const [partsLoading,  setPartsLoading]  = useState(true);
  const [shopsLoading,  setShopsLoading]  = useState(true);

  /* Fetch top-selling + trending parts in one browse call */
  useEffect(() => {
    setPartsLoading(true);
    browseMarketplace({ limit: 10 })
      .then((res: any) => {
        const parts: any[] = res.parts || [];
        setTopParts(parts.slice(0, 4));
        const byDist = [...parts].sort(
          (a, b) => (a.bestListing?.distance ?? 9999) - (b.bestListing?.distance ?? 9999)
        );
        setTrendingParts(byDist.slice(0, 3));
      })
      .catch(() => { setTopParts([]); setTrendingParts([]); })
      .finally(() => setPartsLoading(false));
  }, []);

  /* Fetch nearest shops */
  useEffect(() => {
    setShopsLoading(true);
    fetchShops()
      .then((shops: any[]) => setShopsList((shops || []).slice(0, 2)))
      .catch(() => setShopsList([]))
      .finally(() => setShopsLoading(false));
  }, []);

  /* Fetch OEM brands from vehicle manufacturers table; fall back to static list */
  useEffect(() => {
    fetchVehicleManufacturers('car')
      .then((data: any[]) => {
        const brands = (data || []).slice(0, 12).map((m: any, i: number) => {
          const name: string = m.name || m.manufacturer || '';
          const words = name.trim().split(/\\s+/);
          const initial = words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
          return { label: name, color: BRAND_PALETTE[i % BRAND_PALETTE.length], initial };
        });
        if (brands.length > 0) setOemBrands(brands);
      })
      .catch(() => { /* keep OEM_BRANDS_STATIC */ });
  }, []);
`;
c = replaceOnce(c, YEARS_LINE, YEARS_LINE + NEW_STATE, 'state');
console.log('3 state done');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Make Popular Categories clickable
// ─────────────────────────────────────────────────────────────────────────────
c = replaceOnce(c,
  "            ].map(cat => (\n              <div\n                key={cat.label}\n                style={{",
  "            ].map(cat => (\n              <div\n                key={cat.label}\n                onClick={() => navigate(`/marketplace?category=${encodeURIComponent(cat.label)}`)}\n                style={{",
  'categories clickable'
);
console.log('4 categories clickable done');

// ─────────────────────────────────────────────────────────────────────────────
// 5. Replace "View All Marketplace" anchor with button
// ─────────────────────────────────────────────────────────────────────────────
c = replaceOnce(c,
  `<a className="text-maroon font-bold hover:underline" href="#" style={{ color: '#8b1e1e', fontWeight: 700 }}>View All Marketplace</a>`,
  `<button onClick={() => navigate('/marketplace')} style={{ color: '#8b1e1e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}>View All Marketplace →</button>`,
  'view all link'
);
console.log('5 view all link done');

// ─────────────────────────────────────────────────────────────────────────────
// 6. Replace Top Selling grid (from grid div to TRENDING section comment)
// ─────────────────────────────────────────────────────────────────────────────
const TOP_GRID_START = '          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-xl">';
const TOP_GRID_END   = '      {/* ═══════════════════════════════════════════════════════════\n          TRENDING NEAR YOU';
const si6 = c.indexOf(TOP_GRID_START);
const ei6 = c.indexOf(TOP_GRID_END);
if (si6 === -1 || ei6 === -1) {
  console.error('top grid markers not found si=' + si6 + ' ei=' + ei6);
  process.exit(1);
}

const NEW_TOP_GRID = `          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-xl">
            {partsLoading
              ? Array.from({ length: 4 }).map((_, i) => <PartCardSkeleton key={i} />)
              : topParts.length > 0
                ? topParts.map((p: any) => {
                    const product = p.product || {};
                    const price = p.bestPrice != null
                      ? \`₹\${Math.round(p.bestPrice).toLocaleString('en-IN')}\`
                      : '—';
                    const shopName = p.bestListing?.shop?.name || '';
                    const distKm   = p.bestListing?.distance != null
                      ? \`\${Math.round(p.bestListing.distance)}km away\`
                      : '';
                    const meta    = [shopName, distKm].filter(Boolean).join(' · ');
                    const inStock = (p.availability ?? 0) > 0;
                    return (
                      <div key={product.id ?? product.name} style={{ backgroundColor: '#fff', border: '1px solid #dfbfbc', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ height: 140, position: 'relative' }}>
                          {product.imageUrl
                            ? <img alt={product.name} src={product.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <PartImagePlaceholder category={product.category} height={140} />
                          }
                          {inStock && (
                            <span style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#dcfce7', color: '#166534', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                              In Stock
                            </span>
                          )}
                        </div>
                        <div style={{ padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1c1b1b' }}>{product.name}</h3>
                            <span style={{ fontWeight: 800, color: '#8b1e1e', marginLeft: 8, whiteSpace: 'nowrap', fontSize: 13 }}>{price}</span>
                          </div>
                          <p style={{ color: '#58413f', fontSize: 12, marginBottom: 8, lineHeight: 1.4 }}>
                            {product.description || product.category || '—'}
                          </p>
                          {meta && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderTop: '1px solid #f0eded', paddingTop: 8, marginTop: 8, fontSize: 11, color: '#58413f' }}>
                              <Icon n="store" style={{ fontSize: 13 } as React.CSSProperties} />
                              <span>{meta}</span>
                            </div>
                          )}
                          <button
                            onClick={() => navigate(\`/marketplace?q=\${encodeURIComponent(product.name || '')}\`)}
                            style={{ width: '100%', marginTop: 10, height: 32, border: '1px solid #8b1e1e', color: '#8b1e1e', backgroundColor: 'transparent', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12, transition: 'all 0.2s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#8b1e1e'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#8b1e1e'; }}
                          >
                            View Part
                          </button>
                        </div>
                      </div>
                    );
                  })
                : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px 0', color: '#58413f' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'rgba(139,30,30,0.22)', display: 'block', marginBottom: 10 }}>inventory_2</span>
                    <p style={{ fontSize: 14 }}>No parts listed yet — check back soon.</p>
                  </div>
                )
            }
          </div>
        </div>
      </section>

      `;
c = c.slice(0, si6) + NEW_TOP_GRID + c.slice(ei6);
console.log('6 top grid done, file len:', c.length);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Replace Trending Near You grid
// ─────────────────────────────────────────────────────────────────────────────
const TREND_START = '          {/* 3-column product cards — exact match to screenshot */}\n          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">';
const TREND_END   = '      {/* ═══════════════════════════════════════════════════════════\n          COMING SOON SERVICES';
const si7 = c.indexOf(TREND_START);
const ei7 = c.indexOf(TREND_END);
if (si7 === -1 || ei7 === -1) {
  console.error('trend grid markers not found si=' + si7 + ' ei=' + ei7);
  process.exit(1);
}

const NEW_TREND = `          {/* 3-column product cards — loaded from DB */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
            {partsLoading
              ? Array.from({ length: 3 }).map((_, i) => <PartCardSkeleton key={i} />)
              : trendingParts.length > 0
                ? trendingParts.map((p: any) => {
                    const product = p.product || {};
                    const price   = p.bestPrice != null ? \`₹\${Math.round(p.bestPrice).toLocaleString('en-IN')}\` : '—';
                    const stock   = p.availability ?? 0;
                    const distKm  = p.bestListing?.distance != null ? \`\${p.bestListing.distance.toFixed(1)}km away\` : '';
                    return (
                      <div
                        key={product.id ?? product.name}
                        style={{ backgroundColor: '#ffffff', border: '1px solid #e5e2e1', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 4px rgba(26,18,5,0.06)', transition: 'box-shadow 0.2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(26,18,5,0.1)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(26,18,5,0.06)'}
                      >
                        <div style={{ position: 'relative' }}>
                          {product.imageUrl
                            ? <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                            : <PartImagePlaceholder category={product.category} height={140} />
                          }
                          {stock > 0 && (
                            <span style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>
                              {stock} IN STOCK
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#1c1b1b', lineHeight: 1.3 }}>{product.name}</span>
                            <span style={{ fontWeight: 800, fontSize: 13, color: '#8b1e1e', whiteSpace: 'nowrap' }}>{price}</span>
                          </div>
                          <p style={{ fontSize: 12, color: '#58413f', lineHeight: 1.4, margin: 0 }}>{product.description || product.category || '—'}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Icon n="local_shipping" style={{ fontSize: 13, color: '#58413f' } as React.CSSProperties} />
                            <span style={{ fontSize: 11, color: '#58413f' }}>Local Pickup{distKm ? \` · \${distKm}\` : ''}</span>
                          </div>
                          <button
                            onClick={() => navigate(\`/marketplace?q=\${encodeURIComponent(product.name || '')}\`)}
                            style={{ marginTop: 6, width: '100%', height: 32, backgroundColor: '#8b1e1e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                          >
                            View Part
                          </button>
                        </div>
                      </div>
                    );
                  })
                : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px 0', color: '#58413f' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'rgba(139,30,30,0.22)', display: 'block', marginBottom: 10 }}>location_off</span>
                    <p style={{ fontSize: 14 }}>No parts available in your area yet.</p>
                  </div>
                )
            }
          </div>
        </div>
      </section>

      `;
c = c.slice(0, si7) + NEW_TREND + c.slice(ei7);
console.log('7 trending done, file len:', c.length);

// ─────────────────────────────────────────────────────────────────────────────
// 8. Replace Trusted Shops grid
// ─────────────────────────────────────────────────────────────────────────────
const SHOPS_START = '          <div className="grid lg:grid-cols-2 gap-xl">';
const SHOPS_END   = '      {/* ═══════════════════════════════════════════════════════════\n          BRAND CAROUSELS';
const si8 = c.indexOf(SHOPS_START);
const ei8 = c.indexOf(SHOPS_END);
if (si8 === -1 || ei8 === -1) {
  console.error('shops markers not found si=' + si8 + ' ei=' + ei8);
  process.exit(1);
}

const NEW_SHOPS = `          <div className="grid lg:grid-cols-2 gap-xl">
            {shopsLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex flex-col sm:flex-row bg-surface border border-outline-variant rounded-xxl overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#dfbfbc', borderRadius: 10 }}>
                    <div className="lp-skeleton w-full sm:w-56" style={{ minHeight: 140, backgroundColor: '#f0eded', flexShrink: 0 }} />
                    <div style={{ padding: 16, flex: 1 }}>
                      <div className="lp-skeleton" style={{ height: 14, backgroundColor: '#f0eded', borderRadius: 4, marginBottom: 10, width: '60%' }} />
                      <div className="lp-skeleton" style={{ height: 10, backgroundColor: '#f0eded', borderRadius: 4, width: '40%' }} />
                    </div>
                  </div>
                ))
              : shopsList.length > 0
                ? shopsList.map((shop: any, idx: number) => {
                    const name     = shop.name || shop.shopName || 'Shop';
                    const city     = shop.city || shop.shopCity || '';
                    const address  = shop.address || shop.shopAddress || '';
                    const rating   = shop.rating != null ? Number(shop.rating).toFixed(1) : null;
                    const imageUrl = shop.imageUrl || shop.coverImage || null;
                    return (
                      <div key={shop.id || shop.shopId || idx}
                           className="flex flex-col sm:flex-row bg-surface border border-outline-variant rounded-xxl overflow-hidden hover:shadow-lg transition-all"
                           style={{ backgroundColor: '#fff', borderColor: '#dfbfbc', borderRadius: 10 }}>
                        {imageUrl
                          ? <img className="w-full sm:w-56 object-cover" src={imageUrl} alt={name} style={{ objectFit: 'cover', flexShrink: 0, maxHeight: 200 }} />
                          : <ShopImagePlaceholder name={name} />
                        }
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1c1b1b' }}>{name}</h3>
                              {rating && (
                                <div style={{ display: 'flex', alignItems: 'center', color: '#ca8a04', gap: 4 }}>
                                  <span className="material-symbols-outlined fill" style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>star</span>
                                  <span style={{ fontWeight: 700, color: '#1c1b1b', fontSize: 13 }}>{rating}</span>
                                </div>
                              )}
                            </div>
                            <p style={{ color: '#58413f', fontSize: 12, marginTop: 6 }}>
                              Authorized RedPiston Partner{city ? \` · \${city}\` : ''}{address ? \` · \${address}\` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => navigate('/marketplace?shops=1')}
                            style={{ marginTop: 14, color: '#8b1e1e', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 13 }}
                          >
                            Browse Parts
                            <Icon n="arrow_forward" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px 0', color: '#58413f' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'rgba(139,30,30,0.22)', display: 'block', marginBottom: 10 }}>store_off</span>
                    <p style={{ fontSize: 14 }}>No shops registered yet.</p>
                  </div>
                )
            }
          </div>
        </div>
      </section>

      `;
c = c.slice(0, si8) + NEW_SHOPS + c.slice(ei8);
console.log('8 shops done, file len:', c.length);

// ─────────────────────────────────────────────────────────────────────────────
// 9. Replace OEM Brands hardcoded array with oemBrands state
// ─────────────────────────────────────────────────────────────────────────────
const OEM_START = `          <div className="flex gap-xl overflow-x-auto pb-lg hide-scrollbar">\n            {[\n              { alt: 'Maruti',  logo: 'https://logo.clearbit.com/marutisuzuki.com'`;
const OEM_END   = `          </div>\n\n          {/* OES */}`;
const si9 = c.indexOf(OEM_START);
const ei9 = c.indexOf(OEM_END);
if (si9 === -1 || ei9 === -1) {
  console.error('OEM markers not found si=' + si9 + ' ei=' + ei9);
  process.exit(1);
}

const NEW_OEM = `          <div className="flex gap-xl overflow-x-auto pb-lg hide-scrollbar">
            {oemBrands.map(b => (
              <div key={b.label} style={{ minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }}
                   onClick={() => navigate(\`/marketplace?make=\${encodeURIComponent(b.label)}\`)}>
                <div
                  style={{ width: 56, height: 56, backgroundColor: b.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: \`0 3px 10px \${b.color}55\`, transition: 'transform 0.18s, box-shadow 0.18s', flexShrink: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = \`0 6px 18px \${b.color}70\`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = \`0 3px 10px \${b.color}55\`; }}
                >
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'Poppins, sans-serif', letterSpacing: '0.04em', lineHeight: 1 }}>{b.initial}</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 12, color: '#1c1b1b', textAlign: 'center' }}>{b.label}</span>
              </div>
            ))}
          </div>

          {/* OES */}`;
c = c.slice(0, si9) + NEW_OEM + c.slice(ei9 + OEM_END.length);
console.log('9 OEM brands done, file len:', c.length);

// ─────────────────────────────────────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync(filePath, c);
console.log('ALL DONE. Final lines:', c.split('\n').length);
