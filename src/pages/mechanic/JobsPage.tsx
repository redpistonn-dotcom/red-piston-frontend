import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api/client.js";
import { T, FONT } from "../../theme";
import { useAppCtx } from "../../context/AppCtx.js";

interface Job {
  job_id: number;
  job_number: string;
  customer_name: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_reg: string | null;
  complaint: string | null;
  status: string;
  priority: string;
  estimated_at: string | null;
  updated_at: string;
  item_count: string;
  photo_count: string;
}

const STATUS_FILTERS = [
  { label: "All",          value: "" },
  { label: "Pending",      value: "RECEIVED" },
  { label: "In Progress",  value: "IN_PROGRESS" },
  { label: "Waiting",      value: "WAITING_PARTS" },
  { label: "Ready",        value: "READY" },
  { label: "Rework",       value: "QC_REWORK" },
  { label: "Done",         value: "DELIVERED" },
];

const STATUS_COLOR: Record<string, string> = {
  RECEIVED:      "#6B7280",
  IN_PROGRESS:   T.sky,
  WAITING_PARTS: "#F59E0B",
  READY:         T.violet,
  QC_REWORK:     T.crimson,
  QC_PASSED:     T.emerald,
  DELIVERED:     T.emerald,
  CANCELLED:     T.crimson,
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: T.t3, NORMAL: T.t2, HIGH: "#F59E0B", URGENT: T.crimson,
};

function MSIcon({ name, size = 18 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }}>{name}</span>;
}

export default function MechanicJobsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { currentUser } = useAppCtx();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const activeStatus = params.get("status") || "";

  const load = useCallback((status: string) => {
    setLoading(true);
    const q = status ? `?status=${status}` : "";
    api.get(`/api/mechanic/jobs${q}`)
      .then(r => { setJobs(r.data); setTotal(r.total ?? r.data.length); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(activeStatus); }, [activeStatus, load]);

  const isIndependent = !currentUser?.shopId;

  return (
    <div style={{ padding: "0 0 80px" }}>
      {/* Status filter pills */}
      <div style={{
        display: "flex", gap: 8, overflowX: "auto", padding: "16px 16px 12px",
        borderBottom: `1px solid ${T.border}`,
      }}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setParams(f.value ? { status: f.value } : {})}
            style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none",
              cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT.ui,
              background: activeStatus === f.value ? T.amber : T.surfaceContainerLow,
              color: activeStatus === f.value ? "#fff" : T.t2,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 16px 4px", fontSize: 12, color: T.t3 }}>
        {total} job{total !== 1 ? "s" : ""}
      </div>

      {loading ? (
        <p style={{ padding: "24px 16px", color: T.t3, fontSize: 14 }}>Loading…</p>
      ) : jobs.length === 0 ? (
        <div style={{ padding: "48px 16px", textAlign: "center" }}>
          <MSIcon name="build_circle" size={48} />
          <p style={{ color: T.t3, marginTop: 12, fontSize: 14 }}>No jobs found</p>
          {isIndependent && (
            <button
              onClick={() => navigate("/mechanic/jobs/new")}
              style={{
                marginTop: 16, padding: "12px 24px", background: T.amber, color: "#fff",
                border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14,
                cursor: "pointer", fontFamily: FONT.ui,
              }}
            >
              Create your first job
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {jobs.map(job => (
            <div
              key={job.job_id}
              onClick={() => navigate(`/mechanic/jobs/${job.job_id}`)}
              style={{
                padding: "14px 16px", borderBottom: `1px solid ${T.border}`,
                cursor: "pointer", background: T.surface,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 12, color: T.amber, fontWeight: 700 }}>
                    {job.job_number}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>{job.customer_name}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                  background: (STATUS_COLOR[job.status] || T.t3) + "18",
                  color: STATUS_COLOR[job.status] || T.t3,
                }}>
                  {job.status.replace("_", " ")}
                </span>
              </div>

              <div style={{ fontSize: 13, color: T.t2 }}>
                {job.vehicle_make} {job.vehicle_model}
                {job.vehicle_reg && <span style={{ color: T.t3 }}> · {job.vehicle_reg}</span>}
              </div>

              {job.complaint && (
                <div style={{ fontSize: 12, color: T.t3, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {job.complaint}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: T.t3 }}>
                <span style={{ color: PRIORITY_COLOR[job.priority] || T.t3, fontWeight: 600 }}>
                  {job.priority}
                </span>
                {Number(job.item_count) > 0 && (
                  <span><MSIcon name="build" size={12} /> {job.item_count} items</span>
                )}
                {Number(job.photo_count) > 0 && (
                  <span><MSIcon name="photo_camera" size={12} /> {job.photo_count} photos</span>
                )}
                {job.estimated_at && (
                  <span><MSIcon name="schedule" size={12} /> {new Date(job.estimated_at).toLocaleDateString("en-IN")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* FAB — create job (independent mechanics only) */}
      {isIndependent && (
        <button
          onClick={() => navigate("/mechanic/jobs/new")}
          aria-label="Create new job"
          style={{
            position: "fixed", bottom: 80, right: 20,
            width: 56, height: 56, borderRadius: "50%",
            background: T.amber, color: "#fff", border: "none",
            boxShadow: "0 4px 16px rgba(139,30,30,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 100,
          }}
        >
          <MSIcon name="add" size={28} />
        </button>
      )}
    </div>
  );
}
