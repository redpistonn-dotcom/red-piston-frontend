/**
 * MobileCard — transforms table rows into cards on mobile viewports.
 *
 * Usage pattern:
 *   On desktop: render a traditional <table>
 *   On mobile: render <MobileCardList> with <MobileCard> items
 *
 * This gives a native-app feel on mobile without breaking desktop tables.
 */
import type { ReactNode } from "react";
import { T, FONT } from "../../theme";

// ── Field inside a card ────────────────────────────────────────────────────────
interface CardFieldProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
  color?: string;
  /** full = 100% width, half = 50%, auto = fit content */
  width?: "full" | "half" | "auto";
  bold?: boolean;
}

export function CardField({ label, value, mono, color, width = "half", bold }: CardFieldProps) {
  const flex = width === "full" ? "0 0 100%" : width === "half" ? "0 0 calc(50% - 6px)" : "0 0 auto";
  return (
    <div style={{ flex, minWidth: 0 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: T.t3,
        textTransform: "uppercase", letterSpacing: "0.09em",
        fontFamily: FONT.ui, marginBottom: 3,
      }}>{label}</div>
      <div style={{
        fontSize: 13, color: color || T.t1,
        fontFamily: mono ? FONT.mono : FONT.ui,
        fontWeight: bold ? 700 : 400,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{value ?? "—"}</div>
    </div>
  );
}

// ── Action row at bottom of card ───────────────────────────────────────────────
interface CardActionsProps { children: ReactNode; }
export function CardActions({ children }: CardActionsProps) {
  return (
    <div style={{
      width: "100%",
      display: "flex", gap: 8, flexWrap: "wrap",
      marginTop: 12, paddingTop: 12,
      borderTop: `1px solid ${T.border}`,
    }}>
      {children}
    </div>
  );
}

// ── Single mobile card ─────────────────────────────────────────────────────────
interface MobileCardProps {
  children: ReactNode;
  /** Colored left accent (status indicator) */
  accent?: string;
  onClick?: () => void;
}

export function MobileCard({ children, accent, onClick }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#FFFFFF",
        border: `1px solid ${T.border}`,
        borderLeft: accent ? `3px solid ${accent}` : `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex", flexWrap: "wrap", gap: 12,
        cursor: onClick ? "pointer" : "default",
        boxShadow: "0 1px 4px rgba(28,27,27,0.06)",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
    >
      {children}
    </div>
  );
}

// ── Container for a list of mobile cards ──────────────────────────────────────
interface MobileCardListProps {
  children: ReactNode;
  /** Optional empty state */
  empty?: ReactNode;
  loading?: boolean;
}

export function MobileCardList({ children, empty, loading }: MobileCardListProps) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: 100, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  const isEmpty = !children || (Array.isArray(children) && children.filter(Boolean).length === 0);
  if (isEmpty && empty) {
    return (
      <div style={{
        padding: "40px 20px", textAlign: "center",
        color: T.t3, fontFamily: FONT.ui, fontSize: 14,
      }}>
        {empty}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
      {children}
    </div>
  );
}

// ── Hook: detect if we're on mobile ──────────────────────────────────────────
import { useState, useEffect } from "react";
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ── ResponsiveTable: renders table on desktop, cards on mobile ────────────────
interface ResponsiveTableProps {
  /** Desktop view (a full <table>) */
  desktop: ReactNode;
  /** Mobile view (MobileCardList + MobileCard items) */
  mobile: ReactNode;
  /** Breakpoint to switch (default 768px) */
  breakpoint?: number;
}

export function ResponsiveTable({ desktop, mobile, breakpoint = 768 }: ResponsiveTableProps) {
  const isMobile = useIsMobile(breakpoint);
  return <>{isMobile ? mobile : desktop}</>;
}
