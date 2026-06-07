/**
 * ERP Design System — "Branded White Edition"
 *
 * Shared style factories for consistent industrial ERP UI across all pages.
 * Import these and spread/use them inline — no extra component files needed.
 */
import { T, FONT, SHADOWS, FONT_AUTO } from "../../theme";

// ── Section header (the "REVENUE · OVERVIEW" bar above a card group) ──────────
export const sectionLabel = (label: string, color = T.amber) =>
  ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    _label: label,
    _color: color,
  } as const);

// ── White card container with optional top accent border ─────────────────────
export const panel = (accentColor?: string) => ({
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 14,
  padding: "20px 24px",
  boxShadow: SHADOWS.xs,
  ...(accentColor ? { borderTop: `3px solid ${accentColor}` } : {}),
});

// ── Page-level hero header (title bar + maroon left indicator) ───────────────
export const pageHero = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 20,
  paddingBottom: 16,
  borderBottom: `1px solid ${T.border}`,
};

// ── Table header cell ────────────────────────────────────────────────────────
export const thCell: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left" as const,
  color: T.t3,
  fontWeight: 700,
  fontSize: 10,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  fontFamily: FONT.ui,
  whiteSpace: "nowrap" as const,
  background: T.bg,
  borderBottom: `1px solid ${T.border}`,
};

// ── Table row ────────────────────────────────────────────────────────────────
export const trCell: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 13,
  color: T.t1,
  verticalAlign: "middle" as const,
};

// ── Status badge ─────────────────────────────────────────────────────────────
export const badge = (
  color: string,
  bg: string,
  label: string,
  icon = ""
) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: bg,
  color,
  fontSize: 10,
  padding: "3px 10px",
  borderRadius: 99,
  fontWeight: 700,
  fontFamily: FONT.ui,
  _label: icon ? `${icon} ${label}` : label,
});

// ── Pill filter chip ─────────────────────────────────────────────────────────
export const chip = (active: boolean, activeColor = T.amber) => ({
  padding: "5px 14px",
  borderRadius: 99,
  border: `1px solid ${active ? activeColor : T.border}`,
  background: active ? `${activeColor}10` : "transparent",
  color: active ? activeColor : T.t2,
  fontSize: 12,
  fontWeight: active ? 700 : 500,
  cursor: "pointer",
  fontFamily: FONT.ui,
  transition: "all 0.15s ease",
  outline: "none",
});

// ── Section divider with label ───────────────────────────────────────────────
export const SectionDivider = ({ label, color = T.t3 }: { label: string; color?: string }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    margin: "8px 0 16px",
  }}>
    <div style={{ width: 3, height: 16, background: T.amber, borderRadius: 2, flexShrink: 0 }} />
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      textTransform: "uppercase", letterSpacing: "0.12em",
      fontFamily: FONT.ui,
    }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: T.border }} />
  </div>
);

// ── Stat mini card (inside page headers) ─────────────────────────────────────
export const MiniStat = ({
  label, value, color = T.t1, icon,
}: {
  label: string; value: string | number; color?: string; icon?: string;
}) => (
  <div style={{
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    padding: "10px 16px",
    minWidth: 110,
    flexShrink: 0,
  }}>
    <div style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, fontFamily: FONT.ui }}>
      {icon && `${icon} `}{label}
    </div>
    <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: FONT.mono, letterSpacing: "-0.02em" }}>
      {value}
    </div>
  </div>
);

// ── Page header bar (title + mini stats + actions) ──────────────────────────
export const PageHeader = ({
  title, subtitle, icon, children,
}: {
  title: string; subtitle?: string; icon?: string; children?: React.ReactNode;
}) => (
  <div style={{
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 14,
    padding: "20px 24px",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap" as const,
    borderLeft: `4px solid ${T.amber}`,
  }}>
    {icon && (
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: T.amberGlow,
        border: `1px solid ${T.amber}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>{icon}</div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, letterSpacing: "-0.02em" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: T.t3, marginTop: 2, fontFamily: FONT.ui }}>{subtitle}</div>}
    </div>
    {children && (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
        {children}
      </div>
    )}
  </div>
);
