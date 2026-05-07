import { useState, useMemo } from "react";
import { T, FONT } from "../../theme";
import { MASTER_PRODUCTS, BRAND_CATALOG, CATEGORIES, VEHICLES } from "../api/mockDatabase";

const STATUS_COLORS = {
    published: { bg: `${T.emerald}18`, color: T.emerald, label: "Published" },
    draft: { bg: `${T.amber}18`, color: T.amber, label: "Draft" },
    archived: { bg: `${T.t3}18`, color: T.t3, label: "Archived" },
};

export function GlobalCatalogPage({ onBack }) {
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterBrand, setFilterBrand] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [sortBy, setSortBy] = useState("name");

    const products = MASTER_PRODUCTS;

    // Unique brands from products
    const brandNames = useMemo(() => [...new Set(products.map(p => p.brand))].sort(), [products]);

    // Filtered + sorted products
    const filtered = useMemo(() => {
        let list = [...products];
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
    }, [products, search, filterCategory, filterBrand, filterStatus, sortBy]);

    // Duplicate detection
    const duplicates = useMemo(() => {
        const skuMap = {};
        const dupes = [];
        products.forEach(p => {
            const key = p.sku.toLowerCase();
            if (skuMap[key]) dupes.push({ existing: skuMap[key], duplicate: p });
            else skuMap[key] = p;
        });
        // Also check similar names (Levenshtein-like: first 10 chars match)
        for (let i = 0; i < products.length; i++) {
            for (let j = i + 1; j < products.length; j++) {
                const a = products[i].name.toLowerCase().slice(0, 15);
                const b = products[j].name.toLowerCase().slice(0, 15);
                if (a === b && products[i].sku !== products[j].sku) {
                    dupes.push({ existing: products[i], duplicate: products[j], type: "similar_name" });
                }
            }
        }
        return dupes;
    }, [products]);

    // Stats
    const stats = useMemo(() => ({
        total: products.length,
        published: products.filter(p => p.status === "published").length,
        brandVerified: products.filter(p => p.brandVerified).length,
        categories: new Set(products.map(p => p.category)).size,
        brands: new Set(products.map(p => p.brand)).size,
    }), [products]);

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
                <button
                    onClick={() => setShowAddModal(true)}
                    style={{
                        background: T.amber, color: "#000", border: "none", borderRadius: 12,
                        padding: "14px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 8,
                        boxShadow: `0 4px 16px ${T.amber}44`
                    }}
                >
                    + Add Master SKU
                </button>
            </div>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 28 }}>
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
                Showing {filtered.length} of {products.length} master products
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
                                            background: T.surface, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center"
                                        }}>
                                            {p.image ? (
                                                <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <span style={{ fontSize: 20, opacity: 0.4 }}>📦</span>
                                            )}
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
                                                background: T.amber, color: "#000", border: "none", borderRadius: 10,
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
                                background: T.amber, color: "#000", border: "none", borderRadius: 10,
                                padding: "12px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer"
                            }}>Save as Draft</button>
                            <button style={{
                                background: T.emerald, color: "#000", border: "none", borderRadius: 10,
                                padding: "12px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer"
                            }}>Publish</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
