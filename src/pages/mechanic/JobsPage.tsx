import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  { label: "All Jobs",       value: "" },
  { label: "Received",       value: "RECEIVED" },
  { label: "In Progress",    value: "IN_PROGRESS" },
  { label: "Waiting Parts",  value: "WAITING_PARTS" },
  { label: "Ready for QC",   value: "READY" },
  { label: "Rework",         value: "QC_REWORK" },
  { label: "Delivered",      value: "DELIVERED" },
];

const SM: Record<string, { label: string; color: string; bg: string; strip: string; border: string }> = {
  RECEIVED:      { label: "Received",      color: "#5D5F5B", bg: "#F0EDE9",             strip: "#5D5F5B", border: "rgba(93,95,91,.25)" },
  IN_PROGRESS:   { label: "In Progress",   color: T.sky,     bg: "#EEF3FF",             strip: "#1565C0", border: "rgba(21,101,192,.25)" },
  WAITING_PARTS: { label: "Waiting Parts", color: "#B45309", bg: "#FEF3C7",             strip: "#B45309", border: "rgba(180,83,9,.25)" },
  READY:         { label: "Ready for QC",  color: T.violet,  bg: "#EDE7F6",             strip: "#4527A0", border: "rgba(69,39,160,.25)" },
  QC_REWORK:     { label: "Rework",        color: T.crimson, bg: "#FFEBEE",             strip: "#B71C1C", border: "rgba(183,28,28,.25)" },
  QC_PASSED:     { label: "QC Passed",     color: T.emerald, bg: "rgba(22,163,74,.08)", strip: "#1B5E20", border: "rgba(27,94,32,.25)" },
  DELIVERED:     { label: "Delivered",     color: "#00695C", bg: "#E0F2F1",             strip: "#00695C", border: "rgba(0,105,92,.25)" },
  CANCELLED:     { label: "Cancelled",     color: T.crimson, bg: "#FFEBEE",             strip: "#B71C1C", border: "rgba(183,28,28,.25)" },
};

const PM: Record<string, { color: string; bg: string }> = {
  LOW:    { color: T.t3,      bg: T.surfaceContainerHigh },
  NORMAL: { color: T.t2,      bg: T.surfaceContainerLow },
  HIGH:   { color: "#B45309", bg: "#FEF3C7" },
  URGENT: { color: T.crimson, bg: "#FFEBEE" },
};

function MSIcon({ name, size = 18 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }}>{name}</span>;
}

export default function MechanicJobsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppCtx();
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/mechanic/jobs")
      .then((r: any) => setAllJobs(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const isIndependent = !currentUser?.shopId;
  const jobs = activeFilter ? allJobs.filter(j => j.status === activeFilter) : allJobs;

  const inProgressCount   = allJobs.filter(j => j.status === "IN_PROGRESS").length;
  const waitingPartsCount = allJobs.filter(j => j.status === "WAITING_PARTS").length;
  const readyCount        = allJobs.filter(j => j.status === "READY").length;

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Stat chips */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", scrollbarWidth: "none" } as React.CSSProperties}>
        <StatChip
          label="In Progress" count={inProgressCount}
          color={T.sky} bg="#EEF3FF" bdr="rgba(21,101,192,.2)"
          onClick={() => setActiveFilter(f => f === "IN_PROGRESS" ? "" : "IN_PROGRESS")}
          active={activeFilter === "IN_PROGRESS"}
        />
        <StatChip
          label="Waiting Parts" count={waitingPartsCount}
          color="#B45309" bg="#FEF3C7" bdr="rgba(180,83,9,.2)"
          onClick={() => setActiveFilter(f => f === "WAITING_PARTS" ? "" : "WAITING_PARTS")}
          active={activeFilter === "WAITING_PARTS"}
        />
        <StatChip
          label="Ready QC" count={readyCount}
          color={T.violet} bg="#EDE7F6" bdr="rgba(69,39,160,.2)"
          onClick={() => setActiveFilter(f => f === "READY" ? "" : "READY")}
          active={activeFilter === "READY"}
        />
        <StatChip
          label="All Jobs" count={allJobs.length}
          color={T.amber} bg={T.amberGlow} bdr={`${T.amber}33`}
          onClick={() => setActiveFilter("")}
          active={activeFilter === ""}
        />
      </div>

      {/* Pill filters */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 16px 12px", scrollbarWidth: "none" } as React.CSSProperties}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            style={{
              flexShrink: 0, padding: "7px 16px", borderRadius: 20, cursor: "pointer",
              fontFamily: FONT.ui, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${activeFilter === f.value ? T.amber : T.border}`,
              background: activeFilter === f.value ? T.amberGlow : "transparent",
              color: activeFilter === f.value ? T.amber : T.t3,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Job list */}
      {loading ? (
        <p style={{ padding: "24px 16px", color: T.t3, fontSize: 14, fontFamily: FONT.ui }}>Loading…</p>
      ) : jobs.length === 0 ? (
        <div style={{ padding: "60px 16px", textAlign: "center" }}>
          <MSIcon name="build_circle" size={48} />
          <p style={{ color: T.t3, marginTop: 12, fontSize: 14, fontFamily: FONT.ui }}>No jobs found</p>
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
        <div style={{ background: T.surface }}>
          {jobs.map(job => {
            const sm = SM[job.status] || SM.RECEIVED;
            const pm = PM[job.priority] || PM.NORMAL;
            const isUrgent = job.priority === "URGENT";
            return (
              <div
                key={job.job_id}
                onClick={() => navigate(`/mechanic/jobs/${job.job_id}`)}
                style={{ display: "flex", cursor: "pointer", borderBottom: `1px solid ${T.border}` }}
              >
                {/* Coloured left status strip */}
                <div style={{ width: 5, flexShrink: 0, background: sm.strip }} />
                {/* Card body */}
                <div style={{ flex: 1, padding: "14px 16px 14px 12px", minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, color: T.amber, letterSpacing: "0.05em" }}>
                        {job.job_number}
                      </div>
                      <div style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: T.t1, marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {job.customer_name}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
                        {sm.label}
                      </span>
                      {isUrgent && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: T.crimson, background: "#FFEBEE", border: "1px solid rgba(183,28,28,.2)" }}>
                          ● URGENT
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: T.t2, marginBottom: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {job.vehicle_make} {job.vehicle_model}
                    {job.vehicle_reg && <span style={{ color: T.t3 }}> · {job.vehicle_reg}</span>}
                  </div>

                  {job.complaint && (
                    <div style={{ fontSize: 12, color: T.t3, marginBottom: 8, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {job.complaint}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, flexWrap: "wrap" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontWeight: 700, color: pm.color, background: pm.bg, fontSize: 11 }}>
                      {job.priority}
                    </span>
                    {Number(job.item_count) > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3, color: T.t3 }}>
                        <MSIcon name="build" size={13} />{job.item_count}
                      </span>
                    )}
                    {Number(job.photo_count) > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3, color: T.t3 }}>
                        <MSIcon name="photo_camera" size={13} />{job.photo_count}
                      </span>
                    )}
                    {job.estimated_at && (
                      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, fontWeight: 700, color: isUrgent ? T.crimson : T.amber }}>
                        <MSIcon name="schedule" size={13} />
                        {new Date(job.estimated_at).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      {isIndependent && (
        <button
          onClick={() => navigate("/mechanic/jobs/new")}
          aria-label="Create new job"
          style={{
            position: "fixed", bottom: 76, right: 16, zIndex: 100,
            background: T.amber, color: "#fff", border: "none",
            borderRadius: 16, display: "flex", alignItems: "center", gap: 8,
            padding: "14px 20px 14px 16px", fontWeight: 700, fontSize: 14,
            cursor: "pointer", boxShadow: "0 4px 20px rgba(139,30,30,0.4)",
            fontFamily: FONT.ui,
          }}
        >
          <MSIcon name="add" size={22} /> New Job
        </button>
      )}
    </div>
  );
}

function StatChip({ label, count, color, bg, bdr, onClick, active }: {
  label: string; count: number; color: string; bg: string; bdr: string;
  onClick: () => void; active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: "12px 16px", borderRadius: 12, cursor: "pointer",
        minWidth: 76, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        background: bg, border: `1.5px solid ${active ? color : bdr}`,
        boxShadow: active ? `0 0 0 2px ${color}22` : "none",
      }}
    >
      <div style={{ fontFamily: FONT.mono, fontSize: 24, fontWeight: 800, color }}>{count}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color, lineHeight: 1.2, textAlign: "center" }}>{label}</div>
    </button>
  );
}
