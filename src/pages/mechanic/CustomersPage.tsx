import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { T, FONT } from "../../theme";

function MSIcon({ name, size = 18 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }}>{name}</span>;
}

export default function MechanicCustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCustomers = useCallback((q = "") => {
    setLoading(true);
    api.get(`/mechanic/customers?q=${encodeURIComponent(q)}&limit=100`)
      .then((r: any) => setCustomers(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearch(v);
    if (v.length === 0 || v.length > 1) fetchCustomers(v);
  }

  async function openCustomer(c: any) {
    setLoadingDetail(true);
    setSelected(null);
    try {
      const r: any = await api.get(`/mechanic/customers/${c.party_id}`);
      setSelected(r.data);
    } catch {
      setSelected(c);
    } finally {
      setLoadingDetail(false);
    }
  }

  if (selected) {
    return (
      <div style={{ paddingBottom: 32, fontFamily: FONT.ui }}>
        <div style={{ padding: "16px 16px 0", display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => setSelected(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.t2, padding: 0 }}
          >
            <MSIcon name="arrow_back" size={22} />
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.t1 }}>{selected.name}</div>
            <div style={{ fontSize: 12, color: T.t3 }}>{selected.type}</div>
          </div>
        </div>

        {selected.address && (
          <div style={{ margin: "12px 16px 0", fontSize: 13, color: T.t2 }}>{selected.address}</div>
        )}

        {/* Vehicles */}
        {selected.vehicles?.length > 0 && (
          <div style={{ margin: "16px 16px 0", background: T.surface, borderRadius: 12, padding: 14, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              Vehicles
            </div>
            {selected.vehicles.map((v: any) => (
              <div key={v.vehicle_id} style={{ padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>
                  {v.make} {v.model} {v.year ? `(${v.year})` : ""}
                </div>
                <div style={{ fontSize: 12, color: T.amber, fontFamily: FONT.mono, fontWeight: 700 }}>
                  {v.registration_number}
                </div>
                {v.fuel_type && (
                  <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{v.fuel_type}</div>
                )}
                <button
                  onClick={() => navigate(`/mechanic/jobs?vehicleReg=${v.registration_number}`)}
                  style={{
                    marginTop: 6, fontSize: 12, color: T.amber, background: "none",
                    border: "none", cursor: "pointer", padding: 0, fontWeight: 600, fontFamily: FONT.ui,
                  }}
                >
                  View service history →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Recent jobs */}
        {selected.recentJobs?.length > 0 && (
          <div style={{ margin: "16px 16px 0", background: T.surface, borderRadius: 12, padding: 14, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              Recent Jobs
            </div>
            {selected.recentJobs.map((j: any) => (
              <div key={j.job_id} style={{ padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 13, fontFamily: FONT.mono, color: T.amber, fontWeight: 700 }}>{j.job_number}</div>
                  <div style={{ fontSize: 12, color: T.t3 }}>{new Date(j.created_at).toLocaleDateString("en-IN")}</div>
                </div>
                <div style={{ fontSize: 13, color: T.t2 }}>{j.vehicle_make} {j.vehicle_model}</div>
                {j.complaint && <div style={{ fontSize: 12, color: T.t3 }}>{j.complaint.slice(0, 80)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 32, fontFamily: FONT.ui }}>
      <div style={{ padding: "16px 16px 8px" }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.t1, marginBottom: 12 }}>Customers</div>
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
      ) : customers.length === 0 ? (
        <p style={{ padding: "12px 16px", color: T.t3 }}>No customers found.</p>
      ) : (
        <div style={{ padding: "0 16px" }}>
          {customers.map(c => (
            <button
              key={c.party_id}
              onClick={() => openCustomer(c)}
              disabled={loadingDetail}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "12px 14px", marginBottom: 8,
                background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>{c.name}</div>
                  {c.email && <div style={{ fontSize: 12, color: T.t3 }}>{c.email}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  {Number(c.vehicle_count) > 0 && (
                    <div style={{ fontSize: 12, color: T.t2 }}>
                      <MSIcon name="directions_car" size={12} /> {c.vehicle_count} vehicle{Number(c.vehicle_count) !== 1 ? "s" : ""}
                    </div>
                  )}
                  {Number(c.job_count) > 0 && (
                    <div style={{ fontSize: 12, color: T.t3 }}>{c.job_count} jobs</div>
                  )}
                </div>
              </div>
              {c.last_visit && (
                <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>
                  Last: {new Date(c.last_visit).toLocaleDateString("en-IN")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
