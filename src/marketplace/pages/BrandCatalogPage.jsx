import { useState, useMemo } from "react";
import { T, FONT } from "../../theme";
import { BRAND_CATALOG, MASTER_PRODUCTS, SHOP_INVENTORY, SHOPS } from "../api/mockDatabase";

const TIER_META = {
    premium: { label: "Premium", color: T.amber, icon: "⭐" },
    oem: { label: "OEM Genuine", color: T.sky, icon: "🏭" },
    mid: { label: "Mid-Tier", color: T.t2, icon: "🔧" },
};

export function BrandCatalogPage({ onBack, onViewProduct }) {
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [search, setSearch] = useState("");
    const [filterTier, setFilterTier] = useState("All");
    const [filterVerified, setFilterVerified] = useState("All");

    // Enrich brands with product + listing stats
    const enrichedBrands = useMemo(() => {
        return BRAND_CATALOG.map(brand => {
            const products = MASTER_PRODUCTS.filter(p => p.brandId === brand.id);
            const listingCount = products.reduce((acc, p) =>
                acc + SHOP_INVENTORY.filter(inv => inv.product_id === p.id).length, 0
            );
            const totalSales = products.reduce((acc, p) => acc + (p.global_sales_velocity || 0), 0);
            const verifiedProducts = products.filter(p => p.brandVerified).length;
            const categories = [...new Set(products.map(p => p.category))];

            return { ...brand, products, listingCount, totalSales, verifiedProducts, categories };
        });
    }, []);

    // Filtered brands
    const filteredBrands = useMemo(() => {
        let list = [...enrichedBrands];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(b => b.name.toLowerCase().includes(q) || b.country.toLowerCase().includes(q));
        }
        if (filterTier !== "All") list = list.filter(b => b.tier === filterTier);
        if (filterVerified === "verified") list = list.filter(b => b.isVerified);
        if (filterVerified === "unverified") list = list.filter(b => !b.isVerified);
        return list.sort((a, b) => b.totalSales - a.totalSales);
    }, [enrichedBrands, search, filterTier, filterVerified]);

    // Stats
    const stats = useMemo(() => ({
        total: BRAND_CATALOG.length,
        verified: BRAND_CATALOG.filter(b => b.isVerified).length,
        premium: BRAND_CATALOG.filter(b => b.tier === "premium").length,
        totalProducts: MASTER_PRODUCTS.length,
    }), []);

    const selectedBrandData = selectedBrand ? enrichedBrands.find(b => b.id === selectedBrand) : null;

    return (
        <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div>
                    {onBack && (
                        <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 13, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                            ← Back
                        </button>
                    )}
                    <h1 style={{ fontSize: 28, fontWeight: 900, color: T.t1, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
                        🏷️ Brand Catalog
                    </h1>
                    <p style={{ fontSize: 14, color: T.t3, margin: "8px 0 0" }}>
                        Manufacturer profiles, certifications, and brand-verified product listings.
                    </p>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                {[
                    { label: "Total Brands", value: stats.total, icon: "🏷️", color: T.sky },
                    { label: "Verified Partners", value: stats.verified, icon: "🛡️", color: T.emerald },
                    { label: "Premium Tier", value: stats.premium, icon: "⭐", color: T.amber },
                    { label: "Master Products", value: stats.totalProducts, icon: "📦", color: T.violet },
                ].map(s => (
                    <div key={s.label} style={{
                        background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
                        padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 20
                        }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
                padding: "14px 20px", marginBottom: 24,
                display: "flex", alignItems: "center", gap: 12
            }}>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search brands..."
                    style={{
                        flex: 1, background: T.bg, border: `1px solid ${T.border}`,
                        borderRadius: 10, padding: "10px 16px", color: T.t1, fontSize: 14,
                        fontFamily: FONT.ui, outline: "none"
                    }}
                />
                <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.t1, fontSize: 13, fontWeight: 700, fontFamily: FONT.ui, cursor: "pointer" }}>
                    <option value="All">All Tiers</option>
                    <option value="premium">Premium</option>
                    <option value="oem">OEM Genuine</option>
                    <option value="mid">Mid-Tier</option>
                </select>
                <select value={filterVerified} onChange={e => setFilterVerified(e.target.value)}
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.t1, fontSize: 13, fontWeight: 700, fontFamily: FONT.ui, cursor: "pointer" }}>
                    <option value="All">All Verification</option>
                    <option value="verified">Verified Only</option>
                    <option value="unverified">Unverified Only</option>
                </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: selectedBrandData ? "1fr 1.4fr" : "1fr", gap: 24 }}>
                {/* Brand Cards Grid */}
                <div style={{ display: "grid", gridTemplateColumns: selectedBrandData ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                    {filteredBrands.map(brand => {
                        const tierMeta = TIER_META[brand.tier] || TIER_META.mid;
                        const isSelected = selectedBrand === brand.id;

                        return (
                            <div
                                key={brand.id}
                                onClick={() => setSelectedBrand(isSelected ? null : brand.id)}
                                style={{
                                    background: T.card,
                                    border: `${isSelected ? "2px" : "1px"} solid ${isSelected ? T.amber : T.border}`,
                                    borderRadius: 16, padding: "20px 24px", cursor: "pointer",
                                    transition: "all 0.2s",
                                    boxShadow: isSelected ? `0 4px 20px ${T.amber}22` : "0 2px 8px rgba(0,0,0,0.05)"
                                }}
                            >
                                {/* Brand Header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 14,
                                            background: `${tierMeta.color}14`, display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 24
                                        }}>{brand.logo}</div>
                                        <div>
                                            <div style={{ fontSize: 16, fontWeight: 900, color: T.t1, display: "flex", alignItems: "center", gap: 8 }}>
                                                {brand.name}
                                                {brand.isVerified && (
                                                    <span style={{
                                                        background: `${T.emerald}18`, color: T.emerald,
                                                        fontSize: 9, fontWeight: 900, padding: "3px 8px", borderRadius: 6,
                                                        display: "inline-flex", alignItems: "center", gap: 3
                                                    }}>🛡️ VERIFIED</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
                                                {brand.country} · Est. {brand.founded}
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{
                                        background: `${tierMeta.color}14`, color: tierMeta.color,
                                        fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 6
                                    }}>{tierMeta.icon} {tierMeta.label}</span>
                                </div>

                                {/* Description */}
                                <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.5, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    {brand.description}
                                </div>

                                {/* Stats Row */}
                                <div style={{ display: "flex", gap: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{brand.products.length}</div>
                                        <div style={{ fontSize: 10, color: T.t3, fontWeight: 700 }}>Products</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{brand.listingCount}</div>
                                        <div style={{ fontSize: 10, color: T.t3, fontWeight: 700 }}>Listings</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 900, color: T.amber, fontFamily: FONT.mono }}>{(brand.totalSales / 1000).toFixed(1)}k</div>
                                        <div style={{ fontSize: 10, color: T.t3, fontWeight: 700 }}>Sales</div>
                                    </div>
                                    <div style={{ marginLeft: "auto" }}>
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                            {brand.certifications?.slice(0, 2).map(c => (
                                                <span key={c} style={{ background: `${T.sky}10`, color: T.sky, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{c}</span>
                                            ))}
                                            {(brand.certifications?.length || 0) > 2 && (
                                                <span style={{ fontSize: 9, color: T.t3, fontWeight: 700 }}>+{brand.certifications.length - 2}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Category tags */}
                                {brand.categories.length > 0 && (
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                                        {brand.categories.map(c => (
                                            <span key={c} style={{
                                                background: T.surface, border: `1px solid ${T.border}`,
                                                fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, color: T.t2
                                            }}>{c}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Brand Detail Panel (Right Side) */}
                {selectedBrandData && (
                    <div style={{
                        background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
                        padding: "28px", position: "sticky", top: 80, alignSelf: "flex-start",
                        maxHeight: "calc(100vh - 120px)", overflowY: "auto"
                    }}>
                        {/* Brand Profile Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: 18,
                                background: `${TIER_META[selectedBrandData.tier]?.color || T.t3}14`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 32
                            }}>{selectedBrandData.logo}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 22, fontWeight: 900, color: T.t1, display: "flex", alignItems: "center", gap: 8 }}>
                                    {selectedBrandData.name}
                                    {selectedBrandData.isVerified && <span style={{ fontSize: 22 }}>🛡️</span>}
                                </div>
                                <div style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>{selectedBrandData.country} · Est. {selectedBrandData.founded}</div>
                                <div style={{ fontSize: 12, color: T.sky, marginTop: 4 }}>{selectedBrandData.officialWebsite}</div>
                            </div>
                        </div>

                        {/* Description */}
                        <div style={{ fontSize: 14, color: T.t2, lineHeight: 1.7, marginBottom: 24 }}>
                            {selectedBrandData.description}
                        </div>

                        {/* Certifications */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Certifications</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {selectedBrandData.certifications?.map(c => (
                                    <span key={c} style={{
                                        background: `${T.emerald}14`, border: `1px solid ${T.emerald}33`,
                                        color: T.emerald, fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8,
                                    }}>{c}</span>
                                ))}
                            </div>
                        </div>

                        {/* Brand Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
                            {[
                                { label: "Products", value: selectedBrandData.products.length, color: T.sky },
                                { label: "Seller Listings", value: selectedBrandData.listingCount, color: T.violet },
                                { label: "Verified", value: selectedBrandData.verifiedProducts, color: T.emerald },
                                { label: "Total Sales", value: selectedBrandData.totalSales.toLocaleString(), color: T.amber },
                            ].map(s => (
                                <div key={s.label} style={{
                                    background: T.surface, borderRadius: 10, padding: "14px 12px", textAlign: "center"
                                }}>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: s.color, fontFamily: FONT.mono }}>{s.value}</div>
                                    <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, marginTop: 4 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Product List */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                                Products by {selectedBrandData.name} ({selectedBrandData.products.length})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {selectedBrandData.products.map(p => {
                                    const listings = SHOP_INVENTORY.filter(inv => inv.product_id === p.id);
                                    const lowestPrice = listings.length > 0 ? Math.min(...listings.map(l => l.selling_price)) : null;
                                    const totalStock = listings.reduce((acc, l) => acc + l.stock_quantity, 0);

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => onViewProduct?.(p.id)}
                                            style={{
                                                background: T.surface, border: `1px solid ${T.border}`,
                                                borderRadius: 12, padding: "14px 16px",
                                                cursor: onViewProduct ? "pointer" : "default",
                                                transition: "all 0.15s",
                                                display: "flex", alignItems: "center", gap: 14
                                            }}
                                        >
                                            {/* Thumbnail */}
                                            <div style={{
                                                width: 44, height: 44, borderRadius: 10, overflow: "hidden",
                                                background: T.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center"
                                            }}>
                                                {p.image ? (
                                                    <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                ) : (
                                                    <span style={{ fontSize: 18, opacity: 0.3 }}>📦</span>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: 13, fontWeight: 700, color: T.t1,
                                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                                    display: "flex", alignItems: "center", gap: 6
                                                }}>
                                                    {p.name}
                                                    {p.brandVerified && <span style={{ fontSize: 12 }}>🛡️</span>}
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                                    <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono }}>{p.sku}</span>
                                                    <span style={{ background: `${T.sky}12`, color: T.sky, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{p.category}</span>
                                                </div>
                                            </div>

                                            {/* Price & Stats */}
                                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                {lowestPrice ? (
                                                    <div style={{ fontSize: 14, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>₹{lowestPrice.toLocaleString()}</div>
                                                ) : (
                                                    <div style={{ fontSize: 11, color: T.t3 }}>No listings</div>
                                                )}
                                                <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>
                                                    {listings.length} seller{listings.length !== 1 ? "s" : ""} · {totalStock} stock
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {selectedBrandData.products.length === 0 && (
                                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                                        <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>📦</div>
                                        <div style={{ fontSize: 14, color: T.t3 }}>No products listed for this brand yet</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
