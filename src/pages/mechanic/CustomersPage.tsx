import { useEffect, useState, useCallback, useRef } from "react";
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
    api.get(`/api/mechanic/customers?q=${encodeURIComponent(q)}&limit=100`)
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
      if (c.party_id) {
        // Shop mechanic — use party-based detail endpoint
        const r: any = await api.get(`/api/mechanic/customers/${c.party_id}`);
        setSelected(r.data);
      } else {
        // Independent mechanic — query service history by phone
        const phone = c.phone || "";
        const name = c.name || "";
        const param = phone ? `phone=${encodeURIComponent(phone)}` : `name=${encodeURIComponent(name)}`;
        const r: any = await api.get(`/api/mechanic/customers/history?${param}`);
        setSelected({ ...c, recentJobs: r.data || [], vehicles: [], isIndependent: true });
      }
    } catch {
      setSelected({ ...c, recentJobs: [], vehicles: [], isIndependent: true });
    } finally {
      setLoadingDetail(false);
    }
  }

  const STATUS_LABEL: Record<string, string> = {
    RECEIVED: "Received", IN_PROGRESS: "In Progress", WAITING_PARTS: "Waiting Parts",
    READY: "Ready for QC", QC_REWORK: "Rework", QC_PASSED: "QC Passed",
    DELIVERED: "Delivered", CANCELLED: "Cancelled",
  };
  const STATUS_COLOR: Record<string, string> = {
    DELIVERED: T.emerald, QC_PASSED: T.emerald, IN_PROGRESS: T.amber,
    WAITING_PARTS: "#F59E0B", QC_REWORK: T.crimson, CANCELLED: T.t3,
  };

  if (selected) {
    const jobs: any[] = selected.recentJobs || [];
    const totalSpend = jobs.reduce((s: number, j: any) => s + Number(j.total_amount || 0), 0);

    return (
      <div style={{ paddingBottom: 40, fontFamily: FONT.ui }}>
        {/* Header */}
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, paddingBottom: 14 }}>
          <div style={{ height: 3, background: `linear-gradient(90deg, ${T.amber}, ${T.crimson})` }} />
          <div style={{ padding: "14px 16px 0", display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={() => setSelected(null)} style={{
              background: T.bg, border: `1px solid ${T.border}`, cursor: "pointer",
              color: T.t2, padding: 8, borderRadius: 10, display: "flex", alignItems: "center",
            }}>
              <MSIcon name="arrow_back" size={20} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.t1 }}>{selected.name}</div>
              {(selected.phone || selected.member_phone) && (
                <div style={{ fontSize: 13, color: T.t3, marginTop: 2 }}>
                  <MSIcon name="call" size={13} /> {selected.phone || selected.member_phone}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "flex", gap: 1, margin: "12px 16px 0" }}>
          {[
            { label: "Total Jobs", value: jobs.length },
            { label: "Delivered", value: jobs.filter((j: any) => j.status === "DELIVERED").length },
            { label: "Total Spend", value: `₹${totalSpend.toFixed(0)}` },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 0, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.amber, fontFamily: FONT.mono }}>{s.value}</div>
              <div style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Vehicles (shop mechanic) */}
        {selected.vehicles?.length > 0 && (
          <div style={{ margin: "12px 16px 0", background: T.surface, borderRadius: 14, padding: "4px 16px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, borderLeft: `3px solid ${T.amber}`, paddingLeft: 8, marginTop: 12 }}>
              Vehicles
            </div>
            {selected.vehicles.map((v: any, idx: number) => (
              <div key={v.vehicle_id} style={{ padding: "10px 0", borderBottom: idx < selected.vehicles.length - 1 ? `1px solid ${T.border}88` : "none", display: "flex", gap: 10, alignItems: "center" }}>
                <MSIcon name="directions_car" size={18} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>
                    {v.make} {v.model} {v.year ? `(${v.year})` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: T.amber, fontFamily: FONT.mono, fontWeight: 700 }}>{v.registration_number}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Service history */}
        <div style={{ margin: "12px 16px 0", background: T.surface, borderRadius: 14, border: `1px solid ${T.border}` }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", borderLeft: `3px solid ${T.amber}`, paddingLeft: 8 }}>
              Service History ({jobs.length})
            </div>
          </div>
          {jobs.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: T.t3, fontSize: 14 }}>No jobs found</div>
          ) : (
            jobs.map((j: any, idx: number) => (
              <button
                key={j.job_id}
                onClick={() => navigate(`/mechanic/jobs/${j.job_id}`)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "14px 16px",
                  borderBottom: idx < jobs.length - 1 ? `1px solid ${T.border}88` : "none",
                  background: "transparent", border: "none", cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 12, color: T.amber, fontWeight: 700 }}>{j.job_number}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, marginTop: 2 }}>
                      {j.vehicle_make} {j.vehicle_model}
                      {j.vehicle_reg && <span style={{ color: T.t3, fontWeight: 400 }}> · {j.vehicle_reg}</span>}
                    </div>
                    {j.complaint && (
                      <div style={{ fontSize: 12, color: T.t3, marginTop: 3, lineHeight: 1.4 }}>{j.complaint.slice(0, 80)}{j.complaint.length > 80 ? "…" : ""}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 10,
                      background: STATUS_COLOR[j.status] ? STATUS_COLOR[j.status] + "22" : T.bg,
                      color: STATUS_COLOR[j.status] || T.t3,
                      border: `1px solid ${STATUS_COLOR[j.status] ? STATUS_COLOR[j.status] + "55" : T.border}`,
                    }}>
                      {STATUS_LABEL[j.status] || j.status}
                    </span>
                    {Number(j.total_amount) > 0 && (
                      <div style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: T.t1, marginTop: 4 }}>₹{Number(j.total_amount).toFixed(0)}</div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.t3, marginTop: 6 }}>
                  {new Date(j.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </button>
            ))
          )}
        </div>
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
          {customers.map((c, i) => (
            <button
              key={c.party_id || c.phone || i}
              onClick={() => openCustomer(c)}
              disabled={loadingDetail}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "14px 16px", marginBottom: 8,
                background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`,
                cursor: loadingDetail ? "not-allowed" : "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}><MSIcon name="call" size={12} /> {c.phone}</div>}
                  {c.email && <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{c.email}</div>}
                  {Array.isArray(c.vehicles) && c.vehicles.filter(Boolean).length > 0 && (
                    <div style={{ fontSize: 12, color: T.t3, marginTop: 3 }}>
                      <MSIcon name="directions_car" size={12} /> {c.vehicles.filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                  {Number(c.job_count) > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.amber, padding: "3px 8px", background: T.amberGlow, borderRadius: 10 }}>
                      {c.job_count} job{Number(c.job_count) !== 1 ? "s" : ""}
                    </div>
                  )}
                  {c.last_visit && (
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
                      Last {new Date(c.last_visit).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
