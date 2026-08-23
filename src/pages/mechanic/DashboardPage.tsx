import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { T, FONT } from "../../theme";
import { useAppCtx } from "../../context/AppCtx.js";

interface DashboardCounts {
  active: string;
  pending: string;
  in_progress: string;
  waiting_parts: string;
  ready_for_qc: string;
  rework: string;
  completed_today: string;
  commission_earned?: number;
  commission_pending?: number;
  avg_rating?: number | null;
  rating_count?: number;
}

function MSIcon({ name, size = 22, filled = false }: { name: string; size?: number; filled?: boolean }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size, lineHeight: 1, display: "inline-block",
        fontVariationSettings: filled ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
      }}
    >
      {name}
    </span>
  );
}

// SVG donut chart — no external deps
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 160 }}>
        <MSIcon name="donut_large" size={40} />
        <p style={{ fontSize: 12, color: T.t3, marginTop: 8 }}>No active jobs</p>
      </div>
    );
  }

  const cx = 80, cy = 80, r = 56, stroke = 22;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const slices = data
    .filter(d => d.value > 0)
    .map(d => {
      const pct = d.value / total;
      const dash = pct * circumference;
      const gap = circumference - dash;
      const slice = { ...d, pct, dash, gap, offset };
      offset += dash;
      return slice;
    });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={160} height={160} viewBox="0 0 160 160" aria-label="Job status distribution donut chart">
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.border} strokeWidth={stroke} />
          {slices.map((s, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.offset + circumference * 0.25}
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
          ))}
          {/* Center total */}
          <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontFamily: FONT.mono, fontSize: 24, fontWeight: 700, fill: T.t1 }}>
            {total}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontFamily: FONT.ui, fontSize: 11, fill: T.t3 }}>
            active
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 120 }}>
        {data.filter(d => d.value > 0).map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.t2, flex: 1, fontFamily: FONT.ui }}>{d.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STAT_CARDS = [
  { key: "pending",        label: "Pending",       icon: "hourglass_empty", color: T.t3,      statusParam: "RECEIVED",       bg: "#F5F5F0" },
  { key: "in_progress",   label: "In Progress",   icon: "autorenew",       color: T.sky,      statusParam: "IN_PROGRESS",    bg: T.skyBg   },
  { key: "waiting_parts", label: "Waiting Parts", icon: "inventory_2",     color: "#F59E0B",  statusParam: "WAITING_PARTS",  bg: "#FEF3C7" },
  { key: "ready_for_qc",  label: "Ready for QC",  icon: "rule",            color: T.violet,   statusParam: "READY",          bg: T.violetBg},
  { key: "rework",        label: "Rework",         icon: "replay",          color: T.crimson,  statusParam: "QC_REWORK",      bg: T.crimsonBg.replace ? T.crimsonBg : "#FFDAD6" },
  { key: "completed_today", label: "Done Today",  icon: "check_circle",    color: T.emerald,  statusParam: "DELIVERED",      bg: T.emeraldBg},
] as const;

const DONUT_COLORS: Record<string, string> = {
  pending:        T.t3,
  in_progress:    T.sky,
  waiting_parts:  "#F59E0B",
  ready_for_qc:   T.violet,
  rework:         T.crimson,
};

function SkeletonCard() {
  return (
    <div style={{ background: T.surface, borderRadius: 14, padding: 16, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="skeleton-shimmer" style={{ width: 32, height: 32, borderRadius: 8 }} />
      <div className="skeleton-shimmer" style={{ width: 48, height: 28, borderRadius: 6 }} />
      <div className="skeleton-shimmer" style={{ width: "60%", height: 12, borderRadius: 4 }} />
    </div>
  );
}

function SkeletonDonut() {
  return (
    <div style={{ background: T.surface, borderRadius: 16, padding: 20, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 20 }}>
      <div className="skeleton-shimmer" style={{ width: 160, height: 160, borderRadius: "50%" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="skeleton-shimmer" style={{ height: 14, borderRadius: 4, width: `${60 + i * 8}%` }} />
        ))}
      </div>
    </div>
  );
}

// Push is only worth an onboarding step if it's actually configured —
// otherwise the item would just be a dead end for the mechanic to tap.
const PUSH_CONFIGURED = Boolean(
  (import.meta as any).env?.VITE_FIREBASE_API_KEY && (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY
);

function OnboardingChecklist({ profile, counts, userId, navigate }: {
  profile: any; counts: DashboardCounts | null; userId: number | string | undefined; navigate: (p: string) => void;
}) {
  const dismissKey = `mechanic_onboarding_dismissed_${userId ?? "anon"}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissKey) === "1");
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const hasHandledAJob = Number(profile?.jobs_completed ?? 0) + Number(profile?.jobs_active ?? 0) > 0
    || (counts ? Number(counts.active) + Number(counts.completed_today) > 0 : false);

  const items = [
    {
      key: "skills",
      label: "Add your skills",
      done: Boolean(profile?.skills?.length),
      onClick: () => navigate("/mechanic/profile"),
    },
    ...(PUSH_CONFIGURED ? [{
      key: "notifications",
      label: "Turn on job notifications",
      done: notifPermission === "granted",
      onClick: async () => {
        if (typeof Notification === "undefined") return;
        const p = await Notification.requestPermission();
        setNotifPermission(p);
      },
    }] : []),
    {
      key: "first-job",
      label: "Handle your first job",
      done: hasHandledAJob,
      onClick: () => navigate("/mechanic/jobs"),
    },
  ];

  const allDone = items.every(i => i.done);
  if (dismissed || allDone) return null;

  function dismiss() {
    localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  }

  return (
    <div style={{
      background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`,
      padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Get set up
        </span>
        <button
          onClick={dismiss}
          style={{ background: "none", border: "none", cursor: "pointer", color: T.t3, fontSize: 11, fontFamily: FONT.ui }}
        >
          Dismiss
        </button>
      </div>
      {items.map(item => (
        <button
          key={item.key}
          onClick={item.done ? undefined : item.onClick}
          disabled={item.done}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 4px",
            background: "transparent", border: "none", textAlign: "left",
            cursor: item.done ? "default" : "pointer", width: "100%",
          }}
        >
          <span style={{
            width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
            background: item.done ? T.emerald : T.border,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MSIcon name="check" size={13} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: item.done ? T.t3 : T.t1, textDecoration: item.done ? "line-through" : "none", flex: 1 }}>
            {item.label}
          </span>
          {!item.done && <MSIcon name="chevron_right" size={16} />}
        </button>
      ))}
    </div>
  );
}

export default function MechanicDashboard() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAppCtx();

  useEffect(() => {
    api.get("/api/mechanic/dashboard")
      .then(r => setCounts(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
    api.get("/api/mechanic/profile").then((r: any) => setProfile(r.data)).catch(() => {});
  }, []);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

  const donutData = STAT_CARDS.slice(0, 5).map(card => ({
    label: card.label,
    value: counts ? Number(counts[card.key as keyof DashboardCounts]) : 0,
    color: DONUT_COLORS[card.key],
  }));

  const completedToday = counts ? Number(counts.completed_today) : 0;
  const activeTotal = counts ? Number(counts.active) : 0;
  const reworkCount = counts ? Number(counts.rework) : 0;

  return (
    <div className="page-in rp-page-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <h1 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.t1, lineHeight: 1.2 }}>
            {currentUser?.name ? `Hey, ${currentUser.name.split(" ")[0]} 👋` : "My Dashboard"}
          </h1>
          <p style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>{today}</p>
        </div>

        {/* Done today badge */}
        {!loading && (
          <div style={{
            background: completedToday > 0 ? T.emeraldBg : T.surfaceContainerLow,
            border: `1px solid ${completedToday > 0 ? T.emerald : T.border}`,
            borderRadius: 10, padding: "6px 12px",
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          }}>
            <MSIcon name="check_circle" size={16} filled={completedToday > 0} />
            <span style={{ fontSize: 12, fontWeight: 700, color: completedToday > 0 ? T.emerald : T.t3, fontFamily: FONT.mono }}>
              {completedToday} done
            </span>
          </div>
        )}
      </div>

      {!loading && (
        <OnboardingChecklist profile={profile} counts={counts} userId={currentUser?.userId} navigate={navigate} />
      )}

      {/* Rework alert banner */}
      {!loading && reworkCount > 0 && (
        <div
          onClick={() => navigate("/mechanic/jobs?status=QC_REWORK")}
          style={{
            background: "#FFDAD6", border: `1px solid ${T.crimson}`,
            borderRadius: 12, padding: "12px 14px",
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          }}
        >
          <MSIcon name="replay" size={20} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.crimson }}>
              {reworkCount} job{reworkCount > 1 ? "s" : ""} need rework
            </span>
            <span style={{ fontSize: 11, color: T.crimsonDim, display: "block" }}>Tap to review</span>
          </div>
          <MSIcon name="chevron_right" size={20} />
        </div>
      )}

      {/* Earnings + rating strip */}
      {!loading && counts && (Number(counts.commission_earned) > 0 || Number(counts.commission_pending) > 0 || counts.avg_rating != null) && (
        <div style={{ display: "grid", gridTemplateColumns: counts.avg_rating != null ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10 }}>
          <div style={{ background: T.emeraldBg, border: `1px solid ${T.emerald}44`, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.emerald, textTransform: "uppercase", letterSpacing: "0.06em" }}>Earned</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 800, color: T.t1, marginTop: 2 }}>
              ₹{Number(counts.commission_earned || 0).toFixed(0)}
            </div>
          </div>
          <div style={{ background: T.amberGlow, border: `1px solid ${T.amber}44`, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pending</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 800, color: T.t1, marginTop: 2 }}>
              ₹{Number(counts.commission_pending || 0).toFixed(0)}
            </div>
          </div>
          {counts.avg_rating != null && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Rating</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 800, color: T.t1 }}>{counts.avg_rating}</span>
                <MSIcon name="star" size={14} filled />
                <span style={{ fontSize: 11, color: T.t3 }}>({counts.rating_count})</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Donut section */}
      <div style={{
        background: T.surface, borderRadius: 16,
        border: `1px solid ${T.border}`, padding: 20,
        boxShadow: "0 2px 8px rgba(28,27,27,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <MSIcon name="donut_large" size={18} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.t2, fontFamily: FONT.ui, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Job Status Overview
          </span>
        </div>
        {loading ? <SkeletonDonut /> : <DonutChart data={donutData} />}
      </div>

      {/* KPI cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {loading
          ? STAT_CARDS.map((_, i) => <SkeletonCard key={i} />)
          : STAT_CARDS.map(card => {
              const val = counts ? Number(counts[card.key as keyof DashboardCounts]) : 0;
              const isAlert = card.key === "rework" && val > 0;
              const isDone = card.key === "completed_today";

              return (
                <button
                  key={card.key}
                  onClick={() => navigate(`/mechanic/jobs?status=${card.statusParam}`)}
                  className="stat-card-hover"
                  style={{
                    background: T.surface,
                    borderRadius: 14, padding: "14px 14px 12px",
                    border: `1px solid ${isAlert ? T.crimson : T.border}`,
                    cursor: "pointer", textAlign: "left",
                    display: "flex", flexDirection: "column", gap: 6,
                    boxShadow: isAlert ? `0 0 0 1px ${T.crimson}22` : undefined,
                    position: "relative", overflow: "hidden",
                  }}
                >
                  {/* Color left accent strip */}
                  <span style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                    background: card.color, borderRadius: "14px 0 0 14px",
                  }} />

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: card.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: card.color,
                    }}>
                      <MSIcon name={card.icon} size={18} filled={isDone && val > 0} />
                    </span>
                    {val > 0 && (
                      <MSIcon name="chevron_right" size={16} />
                    )}
                  </div>

                  <div style={{ fontFamily: FONT.mono, fontSize: 28, fontWeight: 700, color: val > 0 ? T.t1 : T.t3, lineHeight: 1 }}>
                    {val}
                  </div>
                  <div style={{ fontSize: 11, color: T.t3, fontWeight: 600, letterSpacing: "0.02em" }}>
                    {card.label}
                  </div>
                </button>
              );
            })
        }
      </div>

      {/* Active jobs summary strip */}
      {!loading && activeTotal > 0 && (
        <div style={{
          background: `linear-gradient(135deg, ${T.amber}11 0%, ${T.amberSoft} 100%)`,
          border: `1px solid ${T.border}`,
          borderRadius: 14, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: T.amber, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", flexShrink: 0,
          }}>
            <MSIcon name="build_circle" size={22} filled />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1, fontFamily: FONT.mono }}>
              {activeTotal} active job{activeTotal > 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>across all open statuses</div>
          </div>
          <MSIcon name="chevron_right" size={20} />
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => navigate("/mechanic/jobs")}
        className="btn-primary-hover"
        style={{
          width: "100%", padding: "14px", background: T.amber,
          color: "#fff", border: "none", borderRadius: 12, fontWeight: 700,
          fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 8, fontFamily: FONT.ui,
          boxShadow: "0 4px 16px rgba(139,30,30,0.28)",
        }}
      >
        <MSIcon name="build_circle" size={20} filled />
        View All My Jobs
      </button>

      {/* Share daily summary */}
      {!loading && counts && (
        <button
          onClick={() => {
            const name = currentUser?.name;
            const dateStr = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
            const lines = [
              `🔧 Work Summary${name ? ` — ${name.split(" ")[0]}` : ""}`,
              `📅 ${dateStr}`,
              ``,
              `✅ Completed Today: ${counts.completed_today}`,
              `🔄 Active Jobs: ${counts.active}`,
              `🔵 In Progress: ${counts.in_progress}`,
              `⏳ Waiting Parts: ${counts.waiting_parts}`,
              `✔️ Ready for QC: ${counts.ready_for_qc}`,
              Number(counts.rework) > 0 ? `⚠️ Rework: ${counts.rework}` : null,
              ``,
              `📍 RedPiston`,
            ].filter(x => x !== null).join("\n");
            if ((navigator as any).share) {
              (navigator as any).share({ text: lines }).catch(() => {});
            } else {
              window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(lines), "_blank");
            }
          }}
          style={{
            width: "100%", padding: "13px", background: "transparent",
            color: T.t2, border: `1.5px solid ${T.border}`, borderRadius: 12,
            fontWeight: 600, fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            fontFamily: FONT.ui,
          }}
        >
          <MSIcon name="share" size={18} />
          Share My Day
        </button>
      )}

    </div>
  );
}
