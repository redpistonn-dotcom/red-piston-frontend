import { useState, useCallback } from "react";
import { uid } from "../../utils";

export function useToast() {
    const [items, setItems] = useState([]);
    const add = useCallback((msg, type = "success", title = "") => {
        const id = uid();
        setItems(p => [...p, { id, msg, type, title }]);
        setTimeout(() => setItems(p => p.filter(i => i.id !== id)), 4500);
    }, []);
    const remove = useCallback(id => setItems(p => p.filter(i => i.id !== id)), []);
    return { items, add, remove };
}
