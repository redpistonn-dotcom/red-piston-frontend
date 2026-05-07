import { useState, useEffect, useCallback } from "react";
import { VEHICLES } from "../api/mockDatabase";

// A simple global state manager mimicking Zustand
const store = {
    vehicle: null,            // Selected Vehicle object
    searchQuery: "",          // Global search query
    cart: [],                 // Items in cart
    isCartOpen: false,        // UI state

    listeners: new Set(),

    setState: (partial) => {
        Object.assign(store, typeof partial === "function" ? partial(store) : partial);
        store.listeners.forEach(l => l());
    },

    subscribe: (listener) => {
        store.listeners.add(listener);
        return () => store.listeners.delete(listener);
    }
};

// Initialize from localStorage
try {
    const saved = localStorage.getItem("mp_vehicle");
    if (saved) store.vehicle = JSON.parse(saved);
} catch (e) { }

export function useMarketplaceStore() {
    const [state, setState] = useState({
        vehicle: store.vehicle,
        searchQuery: store.searchQuery,
        cart: store.cart,
        isCartOpen: store.isCartOpen
    });

    useEffect(() => {
        return store.subscribe(() => {
            setState({
                vehicle: store.vehicle,
                searchQuery: store.searchQuery,
                cart: store.cart,
                isCartOpen: store.isCartOpen
            });
        });
    }, []);

    const setVehicleId = useCallback((vid) => {
        const v = VEHICLES.find(x => x.id === vid) || null;
        store.setState({ vehicle: v });
        if (v) localStorage.setItem("mp_vehicle", JSON.stringify(v));
        else localStorage.removeItem("mp_vehicle");
    }, []);

    const setSearchQuery = useCallback((q) => {
        store.setState({ searchQuery: q });
    }, []);

    const addToCart = useCallback((listing, qty = 1) => {
        const existing = store.cart.find(i => i.listing.shop_id === listing.shop_id && i.listing.product_id === listing.product_id);
        if (existing) {
            store.setState(s => ({
                cart: s.cart.map(i => i === existing ? { ...i, qty: i.qty + qty } : i)
            }));
        } else {
            store.setState(s => ({ cart: [...s.cart, { listing, qty }] }));
        }
    }, []);

    const toggleCart = useCallback(() => {
        store.setState(s => ({ isCartOpen: !s.isCartOpen }));
    }, []);

    return {
        ...state,
        setVehicleId,
        setSearchQuery,
        addToCart,
        toggleCart
    };
}
