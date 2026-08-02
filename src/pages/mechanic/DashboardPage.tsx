import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { T, FONT } from "../../theme";

interface DashboardCounts {
  active: string;
  pending: string;
  in_progress: string;
  waiting_parts: string;
  ready_for_qc: string;
  rework: string;
  completed_today: string;
}

const STAT_CARDS = [
  { key: "pending",      label: "Pending",       icon: "hourglass_empty", color: T.t3        },
  { key: "in_progress",  label: "In Progress",   icon: "autorenew",       color: T.sky       },
  { key: "waiting_parts",label: "Waiting Parts", icon: "inventory_2",     color: "#F59E0B"   },
  { key: "ready_for_qc", label: "Ready for QC",  icon: "rule",            color: T.violet    },
  { key: "rework",       label: "Rework",        icon: "replay",          color: T.crimson   },
  { key: "completed_today", label: "Done Today", icon: "check_circle",    color: T.emerald   },
] as const;

function MSIcon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }}>
      {name}
    </span>
  );
}

export default function MechanicDashboard() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/mechanic/dashboard")
      .then(r => setCounts(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "20px 16px" }}>
      <h1 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.t1, marginBottom: 4 }}>
        My Dashboard
      </h1>
      <p style={{ fontSize: 13, color: T.t3, marginBottom: 24 }}>Today's work summary</p>

      {loading ? (
        <p style={{ color: T.t3, fontSize: 14 }}>Loading…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {STAT_CARDS.map(card => (
            <div
              key={card.key}
              onClick={() => navigate(`/mechanic/jobs?status=${card.key === "pending" ? "RECEIVED" : card.key.toUpperCase()}`)}
              style={{
                background: T.surface, borderRadius: 12, padding: "16px",
                border: `1px solid ${T.border}`, cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 8,
              }}
            >
              <span style={{ color: card.color }}><MSIcon name={card.icon} size={24} /></span>
              <div style={{ fontFamily: FONT.mono, fontSize: 28, fontWeight: 700, color: T.t1, lineHeight: 1 }}>
                {counts ? Number(counts[card.key as keyof DashboardCounts]) : 0}
              </div>
              <div style={{ fontSize: 12, color: T.t3, fontWeight: 500 }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate("/mechanic/jobs")}
        style={{
          marginTop: 24, width: "100%", padding: "14px", background: T.amber,
          color: "#fff", border: "none", borderRadius: 10, fontWeight: 700,
          fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 8,
        }}
      >
        <MSIcon name="build_circle" size={20} />
        View All My Jobs
      </button>
    </div>
  );
}
