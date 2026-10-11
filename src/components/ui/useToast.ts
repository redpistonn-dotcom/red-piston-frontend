import { useState, useCallback } from "react";
import { uid } from "../../utils";
import type { ToastItem } from "../../types";

export function useToast() {
    const [items, setItems] = useState<ToastItem[]>([]);
    const add = useCallback((msg: string, type: string = "success", title: string = "") => {
        const id = uid();
        setItems(p => [...p, { id, msg, type, title }]);
        setTimeout(() => setItems(p => p.filter(i => i.id !== id)), 4500);
    }, []);
    const remove = useCallback((id: string) => setItems(p => p.filter(i => i.id !== id)), []);
    return { items, add, remove };
}
