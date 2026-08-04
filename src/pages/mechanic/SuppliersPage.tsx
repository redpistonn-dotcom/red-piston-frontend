import { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client.js";
import { T, FONT } from "../../theme";

function MSIcon({ name, size = 18 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }}>{name}</span>;
}

export default function MechanicSuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSuppliers = useCallback((q = "") => {
    setLoading(true);
    api.get(`/mechanic/suppliers?q=${encodeURIComponent(q)}&limit=100`)
      .then((r: any) => setSuppliers(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearch(v);
    if (v.length === 0 || v.length > 1) fetchSuppliers(v);
  }

  return (
    <div style={{ paddingBottom: 32, fontFamily: FONT.ui }}>
      <div style={{ padding: "16px 16px 8px" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.t1, marginBottom: 12 }}>Suppliers</div>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={handleSearch}
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 14px",
            borderRadius: 10, border: `1.5px solid ${T.border}`,
            fontFamily: FONT.ui, fontSize: 14, color: T.t1, outline: "none",
            background: T.surfaceContainerLowest,
          }}
        />
      </div>

      {loading ? (
        <p style={{ padding: "12px 16px", color: T.t3 }}>Loading…</p>
      ) : suppliers.length === 0 ? (
        <p style={{ padding: "12px 16px", color: T.t3 }}>No suppliers found.</p>
      ) : (
        <div style={{ padding: "0 16px" }}>
          {suppliers.map(s => (
            <div
              key={s.party_id}
              style={{
                padding: "12px 14px", marginBottom: 8,
                background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>{s.name}</div>
              {s.email && (
                <div style={{ fontSize: 12, color: T.t3, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <MSIcon name="mail" size={12} /> {s.email}
                </div>
              )}
              {s.address && <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{s.address}</div>}
              {s.gstin && <div style={{ fontSize: 11, color: T.t4, marginTop: 4, fontFamily: FONT.mono }}>GSTIN: {s.gstin}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
