import { useState, useMemo, useRef, useCallback } from "react";
import { T, FONT } from "../../theme";
import { MASTER_PRODUCTS, BRAND_CATALOG, CATEGORIES, VEHICLES } from "../api/mockDatabase";
import { useStore } from "../../store";
import { uid } from "../../utils/utils";
import { PartImage } from "../components/PartImage";

const STATUS_COLORS = {
    published: { bg: `${T.emerald}18`, color: T.emerald, label: "Published" },
    draft: { bg: `${T.amber}18`, color: T.amber, label: "Draft" },
    archived: { bg: `${T.t3}18`, color: T.t3, label: "Archived" },
};

export function GlobalCatalogPage({ onBack }) {
    const { products, saveProducts, activeShopId } = useStore();
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterBrand, setFilterBrand] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [sortBy, setSortBy] = useState("name");

    // Use master catalog for the display table (static mock)
    const masterProducts = MASTER_PRODUCTS;

    // Unique brands from master products
    const brandNames = useMemo(() => [...new Set(masterProducts.map(p => p.brand))].sort(), [masterProducts]);

    // Filtered + sorted products
    const filtered = useMemo(() => {
        let list = [...masterProducts];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q) ||
                p.oem_part_no?.toLowerCase().includes(q) ||
                p.brand.toLowerCase().includes(q)
            );
        }
        if (filterCategory !== "All") list = list.filter(p => p.category === filterCategory);
        if (filterBrand !== "All") list = list.filter(p => p.brand === filterBrand);
        if (filterStatus !== "All") list = list.filter(p => p.status === filterStatus);

        if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
        else if (sortBy === "sku") list.sort((a, b) => a.sku.localeCompare(b.sku));
        else if (sortBy === "sales") list.sort((a, b) => b.global_sales_velocity - a.global_sales_velocity);
        else if (sortBy === "created") list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return list;
    }, [masterProducts, search, filterCategory, filterBrand, filterStatus, sortBy]);

    // Duplicate detection
    const duplicates = useMemo(() => {
        const skuMap = {};
        const dupes = [];
        masterProducts.forEach(p => {
            const key = p.sku.toLowerCase();
            if (skuMap[key]) dupes.push({ existing: skuMap[key], duplicate: p });
            else skuMap[key] = p;
        });
        // Also check similar names (Levenshtein-like: first 10 chars match)
        for (let i = 0; i < masterProducts.length; i++) {
            for (let j = i + 1; j < masterProducts.length; j++) {
                const a = masterProducts[i].name.toLowerCase().slice(0, 15);
                const b = masterProducts[j].name.toLowerCase().slice(0, 15);
                if (a === b && masterProducts[i].sku !== masterProducts[j].sku) {
                    dupes.push({ existing: masterProducts[i], duplicate: masterProducts[j], type: "similar_name" });
                }
            }
        }
        return dupes;
    }, [masterProducts]);

    // Stats
    const stats = useMemo(() => ({
        total: masterProducts.length,
        published: masterProducts.filter(p => p.status === "published").length,
        brandVerified: masterProducts.filter(p => p.brandVerified).length,
        categories: new Set(masterProducts.map(p => p.category)).size,
        brands: new Set(masterProducts.map(p => p.brand)).size,
    }), [masterProducts]);

    const getBrand = (brandId) => BRAND_CATALOG.find(b => b.id === brandId);

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
                        📦 Global Product Catalog
                    </h1>
                    <p style={{ fontSize: 14, color: T.t3, margin: "8px 0 0" }}>
                        Platform-wide master SKU registry. Single source of truth for all product data.
                    </p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                        onClick={() => setShowImportModal(true)}
                        style={{
                            background: T.surface, border: `1px solid ${T.border}`, color: T.t1,
                            borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 700,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                        }}
                    >
                        📥 Import CSV
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            background: T.amber, color: "#fff", border: "none", borderRadius: 12,
                            padding: "12px 20px", fontSize: 14, fontWeight: 800, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 8,
                            boxShadow: `0 4px 16px ${T.amber}44`
                        }}
                    >
                        + Add Master SKU
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
                {[
                    { label: "Total SKUs", value: stats.total, icon: "📦", color: T.sky },
                    { label: "Published", value: stats.published, icon: "✓", color: T.emerald },
                    { label: "Brand Verified", value: stats.brandVerified, icon: "🛡️", color: T.amber },
                    { label: "Categories", value: stats.categories, icon: "📂", color: T.violet },
                    { label: "Brands", value: stats.brands, icon: "🏷️", color: T.sky },
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

            {/* Duplicate Warnings */}
            {duplicates.length > 0 && (
                <div style={{
                    background: `${T.amber}0a`, border: `2px solid ${T.amber}44`, borderRadius: 14,
                    padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14
                }}>
                    <span style={{ fontSize: 24 }}>⚠️</span>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.amber }}>{duplicates.length} Potential Duplicate{duplicates.length > 1 ? "s" : ""} Detected</div>
                        <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>
                            {duplicates.map((d, i) => (
                                <span key={i}>
                                    {d.type === "similar_name" ? "Similar names" : "Duplicate SKU"}: <strong>{d.existing.sku}</strong> vs <strong>{d.duplicate.sku}</strong>
                                    {i < duplicates.length - 1 && " · "}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters Bar */}
            <div style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
                padding: "16px 20px", marginBottom: 24,
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap"
            }}>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, SKU, OEM part no..."
                    style={{
                        flex: 1, minWidth: 250, background: T.bg, border: `1px solid ${T.border}`,
                        borderRadius: 10, padding: "10px 16px", color: T.t1, fontSize: 14,
                        fontFamily: FONT.ui, outline: "none"
                    }}
                />
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.t1, fontSize: 13, fontWeight: 700, fontFamily: FONT.ui, cursor: "pointer" }}>
                    <option value="All">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.t1, fontSize: 13, fontWeight: 700, fontFamily: FONT.ui, cursor: "pointer" }}>
                    <option value="All">All Brands</option>
                    {brandNames.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.t1, fontSize: 13, fontWeight: 700, fontFamily: FONT.ui, cursor: "pointer" }}>
                    <option value="All">All Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.t1, fontSize: 13, fontWeight: 700, fontFamily: FONT.ui, cursor: "pointer" }}>
                    <option value="name">Sort: Name</option>
                    <option value="sku">Sort: SKU</option>
                    <option value="sales">Sort: Sales ↓</option>
                    <option value="created">Sort: Newest</option>
                </select>
            </div>

            {/* Results count */}
            <div style={{ fontSize: 13, color: T.t3, marginBottom: 16, fontWeight: 700 }}>
                Showing {filtered.length} of {masterProducts.length} master products
            </div>

            {/* Product Table */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
                {/* Table Header */}
                <div style={{
                    display: "grid", gridTemplateColumns: "60px 2fr 1fr 1fr 1fr 100px 80px 100px",
                    padding: "14px 20px", borderBottom: `2px solid ${T.border}`,
                    background: T.surface, fontSize: 11, fontWeight: 800, color: T.t3,
                    textTransform: "uppercase", letterSpacing: "0.06em", gap: 12
                }}>
                    <div>#</div>
                    <div>Product</div>
                    <div>SKU / OEM</div>
                    <div>Category</div>
                    <div>Compatibility</div>
                    <div>Sales</div>
                    <div>Status</div>
                    <div>Verified</div>
                </div>

                {/* Table Rows */}
                {filtered.length === 0 ? (
                    <div style={{ padding: "60px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }}>🔍</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.t2 }}>No products match your filters</div>
                    </div>
                ) : (
                    filtered.map((p, idx) => {
                        const brand = getBrand(p.brandId);
                        const statusMeta = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
                        const isSelected = selectedProduct?.id === p.id;

                        return (
                            <div key={p.id}>
                                <div
                                    onClick={() => setSelectedProduct(isSelected ? null : p)}
                                    style={{
                                        display: "grid", gridTemplateColumns: "60px 2fr 1fr 1fr 1fr 100px 80px 100px",
                                        padding: "14px 20px", gap: 12,
                                        borderBottom: `1px solid ${T.border}22`,
                                        background: isSelected ? `${T.amber}08` : "transparent",
                                        cursor: "pointer", transition: "all 0.15s",
                                        alignItems: "center"
                                    }}
                                >
                                    <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.mono }}>{idx + 1}</div>

                                    {/* Product Name + Brand */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10, overflow: "hidden",
                                            background: T.surface, flexShrink: 0,
                                        }}>
                                            <PartImage src={p.image} alt={p.name} size="sm" />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                                            <div style={{ fontSize: 11, color: T.t3, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                                {brand && <span>{brand.logo}</span>}
                                                <span>{p.brand}</span>
                                                {brand?.tier === "premium" && <span style={{ color: T.amber, fontSize: 10 }}>★</span>}
                                                {brand?.tier === "oem" && <span style={{ background: `${T.sky}22`, color: T.sky, fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, marginLeft: 4 }}>OEM</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* SKU / OEM */}
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{p.sku}</div>
                                        {p.oem_part_no && <div style={{ fontSize: 10, color: T.amber, fontFamily: FONT.mono, marginTop: 2 }}>{p.oem_part_no}</div>}
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <span style={{
                                            background: `${T.sky}14`, color: T.sky, fontSize: 11, fontWeight: 700,
                                            padding: "4px 10px", borderRadius: 6
                                        }}>{p.category}</span>
                                    </div>

                                    {/* Compatibility */}
                                    <div style={{ fontSize: 11, color: T.t3 }}>
                                        {p.compatibility.length === 0 ? (
                                            <span style={{ background: `${T.emerald}14`, color: T.emerald, padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 800 }}>UNIVERSAL</span>
                                        ) : (
                                            <span>{p.compatibility.length} vehicle{p.compatibility.length > 1 ? "s" : ""}</span>
                                        )}
                                    </div>

                                    {/* Sales */}
                                    <div style={{ fontSize: 13, fontWeight: 800, color: T.t1, fontFamily: FONT.mono }}>
                                        {(p.global_sales_velocity || 0).toLocaleString()}
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <span style={{
                                            background: statusMeta.bg, color: statusMeta.color,
                                            fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 6
                                        }}>{statusMeta.label}</span>
                                    </div>

                                    {/* Verified */}
                                    <div>
                                        {p.brandVerified ? (
                                            <span style={{
                                                background: `${T.emerald}18`, color: T.emerald,
                                                fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 6,
                                                display: "inline-flex", alignItems: "center", gap: 4
                                            }}>🛡️ Verified</span>
                                        ) : (
                                            <span style={{ fontSize: 10, color: T.t3, fontWeight: 700 }}>Pending</span>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Detail Panel */}
                                {isSelected && (
                                    <div style={{
                                        padding: "20px 24px", background: `${T.amber}04`,
                                        borderBottom: `2px solid ${T.amber}22`
                                    }}>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
                                            {/* Description & Specs */}
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Description</div>
                                                <div style={{ fontSize: 13, color: T.t2, lineHeight: 1.6 }}>{p.description}</div>
                                                {p.specifications && (
                                                    <div style={{ marginTop: 14 }}>
                                                        <div style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Specifications</div>
                                                        {Object.entries(p.specifications).map(([k, v]) => (
                                                            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${T.border}11` }}>
                                                                <span style={{ fontSize: 12, color: T.t3, textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</span>
                                                                <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{v}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Compatibility */}
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Vehicle Compatibility</div>
                                                {p.compatibility.length === 0 ? (
                                                    <div style={{ background: `${T.emerald}14`, border: `1px solid ${T.emerald}33`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                                                        <span style={{ fontSize: 20 }}>🌍</span>
                                                        <div>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: T.emerald }}>Universal Fit</div>
                                                            <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>Compatible with all vehicles</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                                                        {p.compatibility.map(vId => {
                                                            const veh = VEHICLES.find(v => v.id === vId);
                                                            return veh ? (
                                                                <div key={vId} style={{
                                                                    background: T.surface, border: `1px solid ${T.border}`,
                                                                    borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: T.t1,
                                                                    display: "flex", alignItems: "center", gap: 8
                                                                }}>
                                                                    <span>{veh.type === "Car" ? "🚙" : "🏍️"}</span>
                                                                    {veh.brand} {veh.model} ({veh.year} · {veh.fuel})
                                                                </div>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Admin Info */}
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Admin & Brand Info</div>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                                        <span style={{ color: T.t3 }}>Created By</span>
                                                        <span style={{ fontWeight: 700, color: T.t1 }}>{p.createdBy || "admin"}</span>
                                                    </div>
                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                                        <span style={{ color: T.t3 }}>Admin Approved</span>
                                                        <span style={{ fontWeight: 700, color: p.adminApproved ? T.emerald : T.amber }}>
                                                            {p.adminApproved ? "✓ Yes" : "Pending"}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                                        <span style={{ color: T.t3 }}>Brand Verified</span>
                                                        <span style={{ fontWeight: 700, color: p.brandVerified ? T.emerald : T.t3 }}>
                                                            {p.brandVerified ? "🛡️ Yes" : "No"}
                                                        </span>
                                                    </div>
                                                    {p.brandVerifiedAt && (
                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                                            <span style={{ color: T.t3 }}>Verified Date</span>
                                                            <span style={{ fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>
                                                                {new Date(p.brandVerifiedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {brand && (
                                                        <div style={{
                                                            marginTop: 8, background: T.surface, border: `1px solid ${T.border}`,
                                                            borderRadius: 10, padding: "12px 14px"
                                                        }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                                <span style={{ fontSize: 18 }}>{brand.logo}</span>
                                                                <span style={{ fontSize: 13, fontWeight: 800, color: T.t1 }}>{brand.name}</span>
                                                                {brand.isVerified && <span style={{ fontSize: 10, background: `${T.emerald}18`, color: T.emerald, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>✓ Partner</span>}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: T.t3 }}>{brand.country} · Est. {brand.founded}</div>
                                                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                                                                {brand.certifications?.slice(0, 3).map(c => (
                                                                    <span key={c} style={{ background: `${T.sky}12`, color: T.sky, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{c}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                                            <button style={{
                                                background: T.amber, color: "#fff", border: "none", borderRadius: 10,
                                                padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer",
                                                display: "flex", alignItems: "center", gap: 6
                                            }}>✏️ Edit Product</button>
                                            <button style={{
                                                background: T.surface, border: `1px solid ${T.border}`, color: T.t1,
                                                borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer"
                                            }}>📋 Clone SKU</button>
                                            {!p.brandVerified && (
                                                <button style={{
                                                    background: `${T.emerald}14`, border: `1px solid ${T.emerald}33`, color: T.emerald,
                                                    borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer"
                                                }}>🛡️ Mark Brand Verified</button>
                                            )}
                                            <button style={{
                                                background: `${T.crimson}14`, border: `1px solid ${T.crimson}33`, color: T.crimson,
                                                borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                                                marginLeft: "auto"
                                            }}>🗑️ Archive</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Import CSV Modal */}
            {showImportModal && (
                <ImportModal
                    onClose={() => setShowImportModal(false)}
                    existingProducts={products || []}
                    activeShopId={activeShopId || "s1"}
                    onImport={(newProds) => {
                        saveProducts([...(products || []), ...newProds]);
                        setShowImportModal(false);
                    }}
                />
            )}

            {/* Add Modal (Simplified) */}
            {showAddModal && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
                    display: "flex", alignItems: "center", justifyContent: "center"
                }} onClick={() => setShowAddModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: T.bg, borderRadius: 20, width: 600, maxHeight: "85vh",
                        overflow: "auto", padding: "32px 28px", border: `1px solid ${T.border}`
                    }}>
                        <h2 style={{ fontSize: 22, fontWeight: 900, color: T.t1, margin: "0 0 24px" }}>
                            Add New Master SKU
                        </h2>

                        {[
                            { label: "Product Name", placeholder: "e.g. Bosch Front Brake Pads", type: "text" },
                            { label: "SKU", placeholder: "e.g. BSH-BRK-001", type: "text" },
                            { label: "OEM Part Number", placeholder: "e.g. 09.9752.1403", type: "text" },
                        ].map(field => (
                            <div key={field.label} style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: T.t3, display: "block", marginBottom: 6 }}>{field.label}</label>
                                <input placeholder={field.placeholder} style={{
                                    width: "100%", background: T.surface, border: `1px solid ${T.border}`,
                                    borderRadius: 10, padding: "12px 16px", color: T.t1, fontSize: 14,
                                    fontFamily: FONT.ui, outline: "none", boxSizing: "border-box"
                                }} />
                            </div>
                        ))}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: T.t3, display: "block", marginBottom: 6 }}>Category</label>
                                <select style={{
                                    width: "100%", background: T.surface, border: `1px solid ${T.border}`,
                                    borderRadius: 10, padding: "12px 16px", color: T.t1, fontSize: 14,
                                    fontFamily: FONT.ui, cursor: "pointer"
                                }}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: T.t3, display: "block", marginBottom: 6 }}>Brand</label>
                                <select style={{
                                    width: "100%", background: T.surface, border: `1px solid ${T.border}`,
                                    borderRadius: 10, padding: "12px 16px", color: T.t1, fontSize: 14,
                                    fontFamily: FONT.ui, cursor: "pointer"
                                }}>
                                    {BRAND_CATALOG.map(b => <option key={b.id} value={b.id}>{b.logo} {b.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: T.t3, display: "block", marginBottom: 6 }}>Description</label>
                            <textarea rows={3} placeholder="Product description..." style={{
                                width: "100%", background: T.surface, border: `1px solid ${T.border}`,
                                borderRadius: 10, padding: "12px 16px", color: T.t1, fontSize: 14,
                                fontFamily: FONT.ui, outline: "none", resize: "vertical", boxSizing: "border-box"
                            }} />
                        </div>

                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                            <button onClick={() => setShowAddModal(false)} style={{
                                background: T.surface, border: `1px solid ${T.border}`, color: T.t2,
                                borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer"
                            }}>Cancel</button>
                            <button style={{
                                background: T.amber, color: "#fff", border: "none", borderRadius: 10,
                                padding: "12px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer"
                            }}>Save as Draft</button>
                            <button style={{
                                background: T.emerald, color: "#fff", border: "none", borderRadius: 10,
                                padding: "12px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer"
                            }}>Publish</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   IMPORT CSV MODAL
   Supports drag-and-drop or click-to-browse CSV uploads.
   Parses → validates → previews → imports into ERP inventory.
══════════════════════════════════════════════════════════════ */
const CSV_COLUMNS = [
    { key: "name",               label: "Product Name",       required: true,  type: "string" },
    { key: "sku",                label: "SKU",                required: true,  type: "string" },
    { key: "category",           label: "Category",           required: false, type: "string" },
    { key: "brand",              label: "Brand",              required: false, type: "string" },
    { key: "supplier",           label: "Supplier",           required: false, type: "string" },
    { key: "buyPrice",           label: "Buy Price (₹)",      required: false, type: "number" },
    { key: "sellPrice",          label: "Sell Price (₹)",     required: false, type: "number" },
    { key: "mrp",                label: "MRP (₹)",            required: false, type: "number" },
    { key: "gstRate",            label: "GST %",              required: false, type: "number" },
    { key: "stock",              label: "Opening Stock",      required: false, type: "number" },
    { key: "minStock",           label: "Min Stock",          required: false, type: "number" },
    { key: "unit",               label: "Unit",               required: false, type: "string" },
    { key: "location",           label: "Location",           required: false, type: "string" },
    { key: "oemNumber",          label: "OEM Part No",        required: false, type: "string" },
    { key: "compatibleVehicles", label: "Compatible Vehicles (semicolon-separated)", required: false, type: "string" },
    { key: "description",        label: "Description",        required: false, type: "string" },
];

const CSV_TEMPLATE_HEADER = CSV_COLUMNS.map(c => c.key).join(",");
const CSV_TEMPLATE_EXAMPLE = [
    "Bosch Front Brake Pads",
    "BSH-BRK-001",
    "Brakes",
    "Bosch",
    "Bosch India Pvt Ltd",
    "1200",
    "1850",
    "2200",
    "18",
    "24",
    "10",
    "set",
    "Rack A-12",
    "04465-02220",
    "Maruti Suzuki Swift;Hyundai i20",
    "Premium ceramic brake pads. Fits 2015-2023 models.",
].join(",");

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { headers: [], rows: [] };

    // Parse a single CSV line respecting quoted fields
    const parseLine = (line) => {
        const result = [];
        let cur = "";
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
                else { inQuote = !inQuote; }
            } else if (ch === "," && !inQuote) {
                result.push(cur.trim());
                cur = "";
            } else {
                cur += ch;
            }
        }
        result.push(cur.trim());
        return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, ""));
    const rows = lines.slice(1).filter(l => l.trim()).map(line => {
        const vals = parseLine(line);
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
        return row;
    });
    return { headers, rows };
}

function mapRow(rawRow, idx) {
    // Normalize header keys from CSV → our column keys
    const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const get = (...candidates) => {
        for (const c of candidates) {
            const v = rawRow[normalize(c)];
            if (v !== undefined && v !== "") return v;
        }
        return "";
    };

    return {
        _rowIdx: idx + 2, // 1-based + header row
        name:               get("name", "productname"),
        sku:                get("sku"),
        category:           get("category") || "General",
        brand:              get("brand") || "",
        supplier:           get("supplier") || "",
        buyPrice:           parseFloat(get("buyprice", "buy_price", "costprice")) || 0,
        sellPrice:          parseFloat(get("sellprice", "sell_price", "sellingprice")) || 0,
        mrp:                parseFloat(get("mrp")) || 0,
        gstRate:            parseFloat(get("gstrate", "gst", "gst%")) || 18,
        stock:              parseInt(get("stock", "openingstock", "qty")) || 0,
        minStock:           parseInt(get("minstock", "min_stock", "reorderpoint")) || 5,
        unit:               get("unit") || "pcs",
        location:           get("location") || "",
        oemNumber:          get("oemnumber", "oem_part_no", "oempartno") || "",
        compatibleVehicles: get("compatiblevehicles", "compatible_vehicles", "vehicles")
                                .split(";").map(s => s.trim()).filter(Boolean),
        description:        get("description") || "",
    };
}

function validateRow(row, existingSkus) {
    const errors = [];
    if (!row.name || row.name.trim() === "") errors.push("Name is required");
    if (!row.sku || row.sku.trim() === "") errors.push("SKU is required");
    else if (existingSkus.has(row.sku.trim())) errors.push(`SKU "${row.sku}" already exists`);
    if (row.sellPrice < row.buyPrice && row.sellPrice > 0) errors.push("Sell price < buy price");
    return errors;
}

function ImportModal({ onClose, existingProducts, activeShopId, onImport }) {
    const [step, setStep] = useState("upload"); // upload | preview | done
    const [dragging, setDragging] = useState(false);
    const [fileName, setFileName] = useState("");
    const [parsedRows, setParsedRows] = useState([]);
    const [parseError, setParseError] = useState("");
    const [importing, setImporting] = useState(false);
    const [importedCount, setImportedCount] = useState(0);
    const fileInputRef = useRef(null);

    const existingSkus = useMemo(() => {
        const s = new Set();
        (existingProducts || []).forEach(p => p.sku && s.add(p.sku.trim()));
        return s;
    }, [existingProducts]);

    const validRows = useMemo(() => parsedRows.filter(r => r._errors.length === 0), [parsedRows]);
    const errorRows = useMemo(() => parsedRows.filter(r => r._errors.length > 0), [parsedRows]);

    const processFile = useCallback((file) => {
        if (!file) return;
        setParseError("");
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const { rows } = parseCSV(text);
                if (rows.length === 0) {
                    setParseError("No data rows found. Make sure the file has a header row and at least one data row.");
                    return;
                }
                const mapped = rows.map((raw, i) => {
                    const row = mapRow(raw, i);
                    row._errors = validateRow(row, existingSkus);
                    return row;
                });
                setParsedRows(mapped);
                setStep("preview");
            } catch (err) {
                setParseError("Failed to parse file: " + err.message);
            }
        };
        reader.onerror = () => setParseError("Failed to read file.");
        reader.readAsText(file, "UTF-8");
    }, [existingSkus]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
            processFile(file);
        } else {
            setParseError("Please upload a .csv file.");
        }
    }, [processFile]);

    const downloadTemplate = () => {
        const content = [CSV_TEMPLATE_HEADER, CSV_TEMPLATE_EXAMPLE].join("\n");
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "master_inventory_template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        if (validRows.length === 0) return;
        setImporting(true);
        const now = Date.now();
        const newProducts = validRows.map(row => ({
            id: "p_imp_" + uid(),
            shopId: activeShopId,
            name: row.name.trim(),
            sku: row.sku.trim(),
            category: row.category,
            brand: row.brand,
            supplier: row.supplier,
            buyPrice: row.buyPrice,
            sellPrice: row.sellPrice || row.mrp || row.buyPrice * 1.3,
            mrp: row.mrp || row.sellPrice,
            gstRate: row.gstRate,
            stock: row.stock,
            reservedStock: 0,
            minStock: row.minStock,
            unit: row.unit,
            location: row.location,
            description: row.description,
            oemNumber: row.oemNumber,
            compatibleVehicles: row.compatibleVehicles.length > 0 ? row.compatibleVehicles : ["Universal"],
            image: "📦",
            condition: "New",
            warranty: "",
            globalSku: null,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        }));
        setTimeout(() => {
            onImport(newProducts);
            setImportedCount(newProducts.length);
            setStep("done");
            setImporting(false);
        }, 600);
    };

    const MODAL_STYLE = {
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    };
    const BOX_STYLE = {
        background: T.bg, borderRadius: 20, width: "100%", maxWidth: 860,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        border: `1px solid ${T.border}`, boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
    };

    return (
        <div style={MODAL_STYLE} onClick={onClose}>
            <div style={BOX_STYLE} onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div style={{
                    padding: "22px 28px", borderBottom: `1px solid ${T.border}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: T.surface, flexShrink: 0,
                }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 900, color: T.t1, margin: 0 }}>
                            📥 Import Master Inventory
                        </h2>
                        <p style={{ fontSize: 12, color: T.t3, margin: "4px 0 0", fontWeight: 600 }}>
                            Upload a CSV file to bulk-import products into the ERP inventory
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
                        width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, color: T.t2, cursor: "pointer", flexShrink: 0,
                    }}>✕</button>
                </div>

                {/* Step Indicator */}
                <div style={{
                    display: "flex", gap: 0, padding: "14px 28px 0",
                    borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0,
                }}>
                    {[
                        { key: "upload",  label: "1. Upload File" },
                        { key: "preview", label: "2. Preview & Validate" },
                        { key: "done",    label: "3. Done" },
                    ].map(s => (
                        <div key={s.key} style={{
                            padding: "10px 20px", fontSize: 13, fontWeight: 700,
                            color: step === s.key ? T.amber : T.t3,
                            borderBottom: step === s.key ? `2px solid ${T.amber}` : "2px solid transparent",
                            marginBottom: -1,
                        }}>{s.label}</div>
                    ))}
                </div>

                {/* Modal Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

                    {/* ── STEP 1: UPLOAD ── */}
                    {step === "upload" && (
                        <div>
                            {/* Template Download */}
                            <div style={{
                                background: `${T.sky}08`, border: `1px solid ${T.sky}22`,
                                borderRadius: 14, padding: "16px 20px", marginBottom: 24,
                                display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                            }}>
                                <div style={{ fontSize: 28 }}>📄</div>
                                <div style={{ flex: 1, minWidth: 180 }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: T.t1 }}>Download CSV Template</div>
                                    <div style={{ fontSize: 12, color: T.t3, marginTop: 3 }}>
                                        Use this template to format your data correctly before uploading.
                                        All column headers must match exactly.
                                    </div>
                                </div>
                                <button onClick={downloadTemplate} style={{
                                    background: T.sky, color: "#fff", border: "none", borderRadius: 10,
                                    padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer",
                                    whiteSpace: "nowrap",
                                }}>
                                    ⬇ Download Template
                                </button>
                            </div>

                            {/* Column Reference */}
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                                    CSV Column Reference
                                </div>
                                <div className="import-col-ref" style={{
                                    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                                    gap: 8,
                                }}>
                                    {CSV_COLUMNS.map(col => (
                                        <div key={col.key} style={{
                                            background: T.card, border: `1px solid ${T.border}`,
                                            borderRadius: 8, padding: "8px 12px",
                                            display: "flex", alignItems: "center", gap: 8,
                                        }}>
                                            <span style={{
                                                background: col.required ? `${T.amber}18` : `${T.t3}10`,
                                                color: col.required ? T.amber : T.t3,
                                                fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
                                                textTransform: "uppercase", flexShrink: 0,
                                            }}>{col.required ? "REQ" : "OPT"}</span>
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{col.key}</div>
                                                <div style={{ fontSize: 10, color: T.t3 }}>{col.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Drop Zone */}
                            <div
                                className="import-drop-zone"
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragging ? T.amber : T.border}`,
                                    borderRadius: 16, padding: "48px 24px", textAlign: "center",
                                    cursor: "pointer", transition: "all 0.2s",
                                    background: dragging ? `${T.amber}06` : T.surface,
                                }}
                            >
                                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.6 }}>📂</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 6 }}>
                                    {dragging ? "Drop to upload" : "Drag & drop your CSV here"}
                                </div>
                                <div style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>
                                    or click to browse your files
                                </div>
                                <div style={{
                                    display: "inline-block", background: T.card, border: `1px solid ${T.border}`,
                                    borderRadius: 10, padding: "8px 20px", fontSize: 13, fontWeight: 700, color: T.t2,
                                }}>
                                    Choose File (.csv)
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,text/csv"
                                    style={{ display: "none" }}
                                    onChange={e => processFile(e.target.files[0])}
                                />
                            </div>

                            {parseError && (
                                <div style={{
                                    marginTop: 16, background: `${T.crimson}10`, border: `1px solid ${T.crimson}33`,
                                    borderRadius: 10, padding: "12px 16px", color: T.crimson, fontSize: 13, fontWeight: 600,
                                }}>
                                    ⚠️ {parseError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 2: PREVIEW ── */}
                    {step === "preview" && (
                        <div>
                            {/* Summary Bar */}
                            <div className="import-summary-bar" style={{
                                display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap",
                            }}>
                                {[
                                    { label: "Total Rows", value: parsedRows.length, color: T.sky },
                                    { label: "Valid — Ready to Import", value: validRows.length, color: T.emerald },
                                    { label: "Rows with Errors", value: errorRows.length, color: errorRows.length > 0 ? T.crimson : T.t3 },
                                ].map(s => (
                                    <div key={s.label} style={{
                                        background: `${s.color}10`, border: `1px solid ${s.color}22`,
                                        borderRadius: 12, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12,
                                    }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: FONT.mono }}>{s.value}</div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase" }}>{s.label}</div>
                                    </div>
                                ))}
                                <button onClick={() => { setStep("upload"); setFileName(""); setParsedRows([]); }} style={{
                                    marginLeft: "auto", background: T.surface, border: `1px solid ${T.border}`,
                                    borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 700,
                                    color: T.t2, cursor: "pointer",
                                }}>↩ Re-upload</button>
                            </div>

                            <div style={{ fontSize: 12, color: T.t3, marginBottom: 12, fontWeight: 600 }}>
                                File: <span style={{ color: T.t1, fontFamily: FONT.mono }}>{fileName}</span>
                            </div>

                            {/* Preview Table */}
                            <div className="import-preview-table" style={{
                                border: `1px solid ${T.border}`, borderRadius: 14,
                                overflow: "hidden", marginBottom: 16,
                            }}>
                                {/* Table Header */}
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "40px 2fr 1fr 1fr 1fr 80px 80px 80px 40px",
                                    padding: "12px 16px",
                                    background: T.surface, borderBottom: `1px solid ${T.border}`,
                                    fontSize: 10, fontWeight: 800, color: T.t3,
                                    textTransform: "uppercase", letterSpacing: "0.06em", gap: 8,
                                }}>
                                    <div>#</div>
                                    <div>Product Name</div>
                                    <div>SKU</div>
                                    <div>Category</div>
                                    <div>Brand</div>
                                    <div>Buy ₹</div>
                                    <div>Sell ₹</div>
                                    <div>Stock</div>
                                    <div></div>
                                </div>
                                {/* Table Rows */}
                                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                                    {parsedRows.map((row, idx) => {
                                        const hasError = row._errors.length > 0;
                                        return (
                                            <div key={idx} style={{
                                                display: "grid",
                                                gridTemplateColumns: "40px 2fr 1fr 1fr 1fr 80px 80px 80px 40px",
                                                padding: "10px 16px", gap: 8, alignItems: "center",
                                                borderBottom: `1px solid ${T.border}18`,
                                                background: hasError ? `${T.crimson}05` : "transparent",
                                            }}>
                                                <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono }}>{row._rowIdx}</div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: hasError ? T.crimson : T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {row.name || <em style={{ color: T.crimson }}>Missing</em>}
                                                </div>
                                                <div style={{ fontSize: 11, fontFamily: FONT.mono, color: hasError ? T.crimson : T.t2 }}>
                                                    {row.sku || <em>Missing</em>}
                                                </div>
                                                <div style={{ fontSize: 11, color: T.t2 }}>{row.category}</div>
                                                <div style={{ fontSize: 11, color: T.t2 }}>{row.brand}</div>
                                                <div style={{ fontSize: 11, fontFamily: FONT.mono, color: T.t1 }}>
                                                    {row.buyPrice > 0 ? `₹${row.buyPrice}` : "—"}
                                                </div>
                                                <div style={{ fontSize: 11, fontFamily: FONT.mono, color: T.t1 }}>
                                                    {row.sellPrice > 0 ? `₹${row.sellPrice}` : "—"}
                                                </div>
                                                <div style={{ fontSize: 11, fontFamily: FONT.mono, color: T.t1 }}>{row.stock}</div>
                                                <div>
                                                    {hasError ? (
                                                        <span title={row._errors.join("; ")} style={{
                                                            background: `${T.crimson}18`, color: T.crimson,
                                                            fontSize: 10, fontWeight: 800, padding: "3px 7px", borderRadius: 5,
                                                            cursor: "help",
                                                        }}>✕</span>
                                                    ) : (
                                                        <span style={{
                                                            background: `${T.emerald}18`, color: T.emerald,
                                                            fontSize: 10, fontWeight: 800, padding: "3px 7px", borderRadius: 5,
                                                        }}>✓</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Error Detail */}
                            {errorRows.length > 0 && (
                                <div style={{
                                    background: `${T.crimson}08`, border: `1px solid ${T.crimson}22`,
                                    borderRadius: 12, padding: "14px 18px",
                                }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: T.crimson, marginBottom: 8 }}>
                                        ⚠️ {errorRows.length} row{errorRows.length > 1 ? "s" : ""} will be skipped (hover ✕ for details)
                                    </div>
                                    {errorRows.slice(0, 5).map((r, i) => (
                                        <div key={i} style={{ fontSize: 12, color: T.t2, marginBottom: 4 }}>
                                            Row {r._rowIdx}: {r._errors.join(" · ")}
                                        </div>
                                    ))}
                                    {errorRows.length > 5 && (
                                        <div style={{ fontSize: 11, color: T.t3 }}>...and {errorRows.length - 5} more</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP 3: DONE ── */}
                    {step === "done" && (
                        <div style={{ textAlign: "center", padding: "40px 24px" }}>
                            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                            <h3 style={{ fontSize: 24, fontWeight: 900, color: T.emerald, margin: "0 0 10px" }}>
                                Import Successful!
                            </h3>
                            <p style={{ fontSize: 15, color: T.t2, margin: "0 0 8px" }}>
                                <strong style={{ color: T.t1 }}>{importedCount} product{importedCount !== 1 ? "s" : ""}</strong> added to the ERP inventory.
                            </p>
                            <p style={{ fontSize: 13, color: T.t3, margin: "0 0 32px" }}>
                                You can now manage them in the Inventory page of the Shop ERP.
                            </p>
                            <button onClick={onClose} style={{
                                background: T.emerald, color: "#fff", border: "none", borderRadius: 12,
                                padding: "14px 36px", fontSize: 15, fontWeight: 800, cursor: "pointer",
                            }}>
                                Close
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                {step !== "done" && (
                    <div style={{
                        padding: "16px 28px", borderTop: `1px solid ${T.border}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: T.surface, flexShrink: 0, gap: 12, flexWrap: "wrap",
                    }}>
                        <button onClick={onClose} style={{
                            background: "transparent", border: `1px solid ${T.border}`, color: T.t2,
                            borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                        }}>Cancel</button>

                        {step === "preview" && (
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                {validRows.length === 0 && (
                                    <span style={{ fontSize: 12, color: T.crimson, fontWeight: 700 }}>
                                        No valid rows to import
                                    </span>
                                )}
                                <button
                                    onClick={handleImport}
                                    disabled={validRows.length === 0 || importing}
                                    style={{
                                        background: validRows.length === 0 ? T.t4 : T.emerald,
                                        color: "#fff", border: "none", borderRadius: 10,
                                        padding: "12px 28px", fontSize: 14, fontWeight: 800,
                                        cursor: validRows.length === 0 ? "not-allowed" : "pointer",
                                        display: "flex", alignItems: "center", gap: 8,
                                        opacity: importing ? 0.7 : 1,
                                        transition: "all 0.2s",
                                    }}
                                >
                                    {importing ? "⏳ Importing..." : `✅ Import ${validRows.length} Product${validRows.length !== 1 ? "s" : ""}`}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
