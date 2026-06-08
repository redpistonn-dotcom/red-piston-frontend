/**
 * StatCard — KPI metric card.
 *
 * STITCH DESIGN ("Premium Industrial"):
 *   - White card, 1px warm border (#DFBFBC), border-radius 16px
 *   - NO top accent border (Stitch is flat — no colored top border)
 *   - Hover → border turns maroon (#8B1E1E), slight shadow
 *   - h-32 equivalent (min-height: 128px)
 *   - Label: 10px uppercase bold text-secondary tracking-wider
 *   - Value: large bold, JetBrains Mono
 *   - Trend pill (green/red) below value
 *
 * From Stitch code.html:
 *   <div class="bg-white p-xl rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between h-32
 *               hover:border-maroon-brand transition-colors">
 */
import { T, FONT, SHADOWS } from "../../theme";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;       // accent color (used for trend pill, icon bg; NOT top border)
  icon?: string;        // Material Symbol name or emoji fallback
  trend?: number | string;
  onClick?: () => void;
}

/** Pick a font-size that won't overflow a ~160px card cell.
 *  ≤6 chars (e.g. "₹0", "123"): full 24px
 *  7–9 chars (e.g. "₹1,234"):   20px
 *  10–11 chars (e.g. "₹20,73,500"): 16px
 *  12+ chars:                   14px
 */
function valueFontSize(val: string | number): string {
  const len = String(val).length;
  if (len <= 6)  return "clamp(18px, 2.2vw, 24px)";
  if (len <= 9)  return "clamp(15px, 1.8vw, 20px)";
  if (len <= 11) return "clamp(13px, 1.4vw, 16px)";
  return "clamp(11px, 1.2vw, 14px)";
}

export function StatCard({ label, value, sub, color, icon, trend, onClick }: StatCardProps) {
  const accent = color || T.amber;

  return (
    <div
      onClick={onClick}
      className="stat-card-hover"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 24,
        minHeight: 128,
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: SHADOWS.xs,
      }}
    >
      {/* ── Top row: label + optional icon ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: T.t2,                            // text-secondary (#5D5F5B)
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: FONT.ui,
          lineHeight: 1.4,
        }}>{label}</span>

        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `${accent}12`,
            border: `1px solid ${accent}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, flexShrink: 0,
          }}>
            {/* Supports Material Symbols or emoji */}
            {icon.length <= 4 || /^\p{Emoji}/u.test(icon)
              ? icon
              : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
            }
          </div>
        )}
      </div>

      {/* ── Bottom: value + trend/sub ─── */}
      <div>
        {/* Value — title-lg / extrabold (Stitch: text-title-lg font-extrabold) */}
        <div style={{
          fontSize: valueFontSize(value),
          fontWeight: 800,
          color: T.t1,                            // on-surface (#1C1B1B)
          fontFamily: FONT.mono,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginBottom: (sub || trend) ? 8 : 0,
        }}>{value}</div>

        {/* Trend + sub-label */}
        {(sub || trend !== undefined) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {trend !== undefined && trend !== null && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: +trend > 0 ? T.emerald : T.crimson,
                fontFamily: FONT.mono,
                background: +trend > 0 ? T.emeraldBg : T.crimsonBg,
                padding: "2px 8px", borderRadius: 6,
                display: "inline-flex", alignItems: "center", gap: 3,
              }}>
                {+trend > 0 ? "▲" : "▼"} {Math.abs(+trend)}%
              </span>
            )}
            {sub && (
              <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>{sub}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
