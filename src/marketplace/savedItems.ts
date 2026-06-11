// Persistent "Saved Items" (procurement list) — localStorage-backed, shared across
// ProductCard hearts, the nav badge, and SavedItemsPage. Components subscribe via
// the "mp-saved-changed" window event so every heart/badge stays in sync.

export interface SavedItem {
    id: string | number;
    name: string;
    brand?: string;
    sku?: string;
    image?: string | null;
    price: number;
    inStock: boolean;
    type?: "OEM" | "OES";
    // Minimal listing snapshot so "Add to Cart" works from the saved list
    listing?: {
        shop_id?: string | number;
        product_id?: string | number;
        selling_price?: number;
        shop?: { name?: string; city?: string };
    } | null;
}

const KEY = "mp_saved";

export function getSavedItems(): SavedItem[] {
    try {
        const raw = localStorage.getItem(KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

function persist(list: SavedItem[]) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent("mp-saved-changed"));
}

export function isSaved(id: SavedItem["id"]): boolean {
    return getSavedItems().some(i => String(i.id) === String(id));
}

export function toggleSavedItem(entry: SavedItem): boolean {
    const list = getSavedItems();
    const idx = list.findIndex(i => String(i.id) === String(entry.id));
    if (idx >= 0) {
        list.splice(idx, 1);
        persist(list);
        return false;
    }
    list.push(entry);
    persist(list);
    return true;
}

export function removeSavedItem(id: SavedItem["id"]) {
    persist(getSavedItems().filter(i => String(i.id) !== String(id)));
}
