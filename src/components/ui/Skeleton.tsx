/**
 * Skeleton — premium shimmer loading placeholder.
 *
 * Usage:
 *   <Skeleton width={200} height={16} />
 *   <Skeleton.Card />       — KPI card placeholder
 *   <Skeleton.Row />        — table row placeholder
 *   <Skeleton.Table rows={5} cols={4} /> — full table placeholder
 *   <Skeleton.Chart />      — chart area placeholder
 */
import type { CSSProperties } from "react";
import { T } from "../../theme";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
  className?: string;
}

// Base shimmer block
export function Skeleton({ width, height = 14, radius = 6, style, className }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer${className ? " " + className : ""}`}
      style={{
        width: width ?? "100%",
        height,
        borderRadius: radius,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

// ── KPI stat card skeleton ───────────────────────────────────────────────────
Skeleton.Card = function SkeletonCard({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "#FFFFFF",
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: 24,
            minHeight: 128,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Skeleton width="45%" height={10} />
            <Skeleton width={32} height={32} radius={10} />
          </div>
          <div>
            <Skeleton width="60%" height={28} radius={6} style={{ marginBottom: 10 }} />
            <Skeleton width="40%" height={10} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Table row skeleton ───────────────────────────────────────────────────────
Skeleton.Row = function SkeletonRow({ cols = 5 }: { cols?: number }) {
  const widths = ["70%", "50%", "40%", "30%", "55%", "35%", "45%"];
  return (
    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "14px 14px" }}>
          <Skeleton width={widths[i % widths.length]} height={13} />
        </td>
      ))}
    </tr>
  );
};

// ── Full table skeleton ───────────────────────────────────────────────────────
Skeleton.Table = function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header shimmer */}
      <div
        style={{
          background: T.bg,
          borderBottom: `1px solid ${T.border}`,
          padding: "10px 14px",
          display: "flex",
          gap: 32,
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={60 + (i % 3) * 20} height={9} />
        ))}
      </div>
      {/* Rows */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton.Row key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Chart area skeleton ───────────────────────────────────────────────────────
Skeleton.Chart = function SkeletonChart({ height = 260 }: { height?: number }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: 24,
        overflow: "hidden",
      }}
    >
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <Skeleton width={140} height={14} style={{ marginBottom: 8 }} />
          <Skeleton width={80} height={10} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} width={36} height={26} radius={8} />)}
        </div>
      </div>
      {/* Chart bars */}
      <div
        style={{
          height,
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          padding: "0 8px",
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => {
          const h = [40, 60, 80, 50, 70, 90, 65, 75, 55, 85, 45, 70][i];
          return (
            <Skeleton
              key={i}
              width="100%"
              height={`${h}%`}
              radius={4}
              style={{ flexShrink: 1 }}
            />
          );
        })}
      </div>
    </div>
  );
};

// ── Detail page header skeleton ───────────────────────────────────────────────
Skeleton.PageHeader = function SkeletonPageHeader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Skeleton width={40} height={40} radius={10} />
        <div>
          <Skeleton width={180} height={18} style={{ marginBottom: 8 }} />
          <Skeleton width={100} height={11} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Skeleton width={90} height={34} radius={8} />
        <Skeleton width={110} height={34} radius={8} />
      </div>
    </div>
  );
};
