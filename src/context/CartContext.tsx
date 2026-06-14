/**
 * CartContext — global cart state for the marketplace.
 *
 * WHY separate from the ERP store: the marketplace cart is customer-facing
 * and has different data shapes (product images, part numbers, shipping info)
 * vs the ERP store which is shop-owner-facing inventory management.
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  brand: string;
  partNo: string;
  price: number;
  image?: string;
  qty: number;
  availability?: string;
  type?: 'OEM' | 'OES';
  shipping?: string;
}

interface CartCtxValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
}

const CartCtx = createContext<CartCtxValue | null>(null);

const STORAGE_KEY = 'rp_marketplace_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  // Persist to localStorage whenever cart changes
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const addItem = useCallback((product: Omit<CartItem, 'qty'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setItems(prev => prev
      .map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
      .filter(i => i.qty > 0)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  // Memoize so the context value only changes when `items` changes — otherwise
  // every CartProvider render hands consumers a new object and re-renders them all.
  const value = useMemo<CartCtxValue>(() => ({
    items,
    count:    items.reduce((s, i) => s + i.qty, 0),
    subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
    addItem, removeItem, updateQty, clearCart,
  }), [items, addItem, removeItem, updateQty, clearCart]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart(): CartCtxValue {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
