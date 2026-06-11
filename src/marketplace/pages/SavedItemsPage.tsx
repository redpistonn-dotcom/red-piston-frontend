import { useEffect, useState } from "react";
import { useStore } from "../../store";
import { fmt } from "../../utils";
import { PartImage } from "../components/PartImage";
import { getSavedItems, removeSavedItem, type SavedItem } from "../savedItems";

// "Saved Items" / procurement list — mobile-first screen matching the stitch design:
// stacked cards (image · name+heart · badges · price · Add to Cart) and a
// "Share Procurement List" outline button at the end.
export function SavedItemsPage({ onBack }: { onBack?: () => void }) {
    const { cart, saveCart, setIsCartOpen } = useStore();
    const [items, setItems] = useState<SavedItem[]>(getSavedItems);
    const [addedId, setAddedId] = useState<SavedItem["id"] | null>(null);

    useEffect(() => {
        const sync = () => setItems(getSavedItems());
        window.addEventListener("mp-saved-changed", sync);
        return () => window.removeEventListener("mp-saved-changed", sync);
    }, []);

    const addToCart = (item: SavedItem) => {
        if (!item.listing) return;
        const listing = { ...item.listing, selling_price: item.listing.selling_price ?? item.price };
        const product = { id: item.id, name: item.name, brand: item.brand, sku: item.sku, image: item.image };
        const existing = (cart || []).find(
            (c: any) => String(c.listing?.product_id) === String(listing.product_id) && String(c.listing?.shop_id) === String(listing.shop_id)
        );
        if (existing) {
            saveCart((cart || []).map((c: any) => (c === existing ? { ...c, qty: c.qty + 1 } : c)));
        } else {
            saveCart([...(cart || []), { listing, product, qty: 1, deliveryOption: "standard" }]);
        }
        setAddedId(item.id);
        setTimeout(() => setAddedId(null), 1500);
    };

    const shareList = async () => {
        const text = items.map(i => `• ${i.name}${i.sku ? ` (SKU: ${i.sku})` : ""} — ${fmt(i.price)}`).join("\n");
        const payload = { title: "Red Piston — Procurement List", text: `My procurement list:\n${text}` };
        try {
            if (navigator.share) await navigator.share(payload);
            else { await navigator.clipboard.writeText(payload.text); alert("Procurement list copied to clipboard"); }
        } catch { /* user cancelled */ }
    };

    return (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 64px", animation: "fadeUp 0.3s ease-out" }}>
            {onBack && (
                <button
                    onClick={onBack}
                    style={{ background: "none", border: "none", color: "#BE2B1A", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 14 }}
                >← Back to marketplace</button>
            )}

            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 800, color: "#1A1205", margin: "0 0 4px" }}>
                Saved Items
            </h1>
            <p style={{ fontSize: 14, color: "#9C8C7C", margin: "0 0 22px" }}>
                {items.length} component{items.length !== 1 ? "s" : ""} in your procurement list
            </p>

            {items.length === 0 ? (
                <div style={{ background: "#FAF6F0", border: "1.5px dashed #E0D5C8", borderRadius: 14, padding: 48, textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.5 }}>🤍</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1205", marginBottom: 6 }}>Nothing saved yet</div>
                    <div style={{ fontSize: 13, color: "#9C8C7C", lineHeight: 1.6 }}>
                        Tap the heart on any part to add it to your procurement list.
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {items.map(item => (
                            <div key={String(item.id)} style={{ background: "#fff", border: "1.5px solid #E0D5C8", borderRadius: 14, padding: 14, display: "flex", gap: 14, boxShadow: "0 2px 10px rgba(26,18,5,0.06)" }}>
                                {/* Thumbnail */}
                                <div style={{ width: 84, height: 84, borderRadius: 10, background: "#FAF6F0", border: "1px solid #E0D5C8", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <PartImage src={item.image} alt={item.name} size="sm" />
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1205", lineHeight: 1.3 }}>{item.name}</div>
                                        <button
                                            onClick={() => removeSavedItem(item.id)}
                                            title="Remove from saved"
                                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2, flexShrink: 0 }}
                                        >❤️</button>
                                    </div>

                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        <span style={{ background: item.inStock ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.08)", color: item.inStock ? "#16A34A" : "#DC2626", fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                            {item.inStock ? "In Stock" : "Out of Stock"}
                                        </span>
                                        {item.sku && (
                                            <span style={{ background: "#F0E8DF", color: "#5C4F40", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                                SKU: {item.sku}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, marginTop: "auto" }}>
                                        <div>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: "#9C8C7C", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Price</div>
                                            <div style={{ fontSize: 19, fontWeight: 900, color: "#BE2B1A", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{fmt(item.price)}</div>
                                        </div>
                                        <button
                                            onClick={() => addToCart(item)}
                                            disabled={!item.listing || !item.inStock}
                                            style={{
                                                background: addedId === item.id ? "#16A34A" : "#9B1F12",
                                                color: "#fff", border: "none", borderRadius: 20,
                                                padding: "9px 18px", fontSize: 12, fontWeight: 800,
                                                cursor: item.listing && item.inStock ? "pointer" : "not-allowed",
                                                opacity: item.listing && item.inStock ? 1 : 0.45,
                                                transition: "background 0.15s", whiteSpace: "nowrap",
                                            }}
                                        >
                                            {addedId === item.id ? "✓ Added" : "Add to Cart"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={shareList}
                        style={{ width: "100%", marginTop: 24, padding: "13px", background: "transparent", border: "1.5px solid #BE2B1A", borderRadius: 10, color: "#BE2B1A", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                    >
                        Share Procurement List
                    </button>
                    {(cart || []).length > 0 && (
                        <button
                            onClick={() => setIsCartOpen(true)}
                            style={{ width: "100%", marginTop: 10, padding: "13px", background: "#BE2B1A", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}
                        >
                            View Cart ({(cart || []).reduce((s: number, i: any) => s + i.qty, 0)})
                        </button>
                    )}
                    <div style={{ textAlign: "center", fontSize: 10, color: "#BFB0A0", marginTop: 16, letterSpacing: "0.15em", textTransform: "uppercase", fontStyle: "italic" }}>
                        RedPiston Industrial Logistics
                    </div>
                </>
            )}
        </div>
    );
}
