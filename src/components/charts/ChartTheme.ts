/**
 * ChartTheme — shared Recharts configuration for RedPiston ERP.
 *
 * Import these constants in any chart component instead of
 * hardcoding colors, grid props, axis props, etc.
 *
 * Usage:
 *   import { CHART_COLORS, AXIS_PROPS, GRID_PROPS, CHART_TIP } from "../charts/ChartTheme";
 *
 *   <CartesianGrid {...GRID_PROPS} />
 *   <XAxis {...AXIS_PROPS} dataKey="date" />
 *   <Tooltip content={<ChartTip />} />
 *   <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS[0]} ... />
 */
import { T, FONT } from "../../theme";

// ── Ordered color palette for chart series ──────────────────────────────────
// Automotive-premium: maroon lead, then sky, emerald, violet, amber, muted tones
export const CHART_COLORS = [
  T.amber,    // 0 — maroon (primary brand)
  T.sky,      // 1 — sky blue
  T.emerald,  // 2 — emerald green
  T.violet,   // 3 — violet
  "#FB923C",  // 4 — warm orange
  "#F472B6",  // 5 — rose
  "#34D399",  // 6 — mint
  "#60A5FA",  // 7 — light blue
  "#A78BFA",  // 8 — lavender
  "#FCD34D",  // 9 — gold
] as const;

// ── Gradient definitions for area charts ────────────────────────────────────
// Use as: fill="url(#gradRevenue)" in <Area> components
export const CHART_GRADIENTS = {
  revenue: { id: "gradRevenue",  color: T.amber,   opacity: [0.18, 0] },
  profit:  { id: "gradProfit",   color: T.emerald, opacity: [0.18, 0] },
  expense: { id: "gradExpense",  color: T.crimson, opacity: [0.12, 0] },
  sky:     { id: "gradSky",      color: T.sky,     opacity: [0.15, 0] },
};

// ── CartesianGrid props ──────────────────────────────────────────────────────
export const GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: T.border,           // warm pinkish-beige — subtle, non-intrusive
  vertical: false,            // horizontal lines only — cleaner dashboard look
} as const;

// ── Shared XAxis/YAxis props ─────────────────────────────────────────────────
export const AXIS_PROPS = {
  tick: { fontSize: 10, fontFamily: FONT.ui, fill: T.t3 },
  axisLine: false,
  tickLine: false,
} as const;

export const YAXIS_PROPS = {
  tick: { fontSize: 10, fontFamily: FONT.mono, fill: T.t3 },
  axisLine: false,
  tickLine: false,
  width: 52,
} as const;

// ── Tooltip container style (glassmorphism-lite) ─────────────────────────────
export const TOOLTIP_STYLE = {
  background: "rgba(255, 255, 255, 0.95)",
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  boxShadow: "0 8px 30px rgba(28,27,27,0.12), 0 2px 8px rgba(28,27,27,0.06)",
  fontFamily: FONT.ui,
  fontSize: 12,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  padding: "10px 14px",
} as const;

// ── Cursor style for CartesianChart tooltip ──────────────────────────────────
export const CURSOR_STYLE = {
  fill: `${T.amber}08`,
  stroke: `${T.amber}20`,
  strokeWidth: 1,
} as const;

// ── Legend props ─────────────────────────────────────────────────────────────
export const LEGEND_PROPS = {
  wrapperStyle: {
    fontSize: 11,
    fontFamily: FONT.ui,
    color: T.t3,
    paddingTop: 12,
  },
} as const;

// ── Pie/Donut chart shared colors ────────────────────────────────────────────
export const PIE_COLORS = CHART_COLORS;

// ── Area chart animation ──────────────────────────────────────────────────────
export const AREA_ANIMATION = {
  animationDuration: 700,
  animationEasing: "ease-out",
} as const;

// ── Bar chart animation ───────────────────────────────────────────────────────
export const BAR_ANIMATION = {
  animationDuration: 600,
  animationEasing: "ease-out",
  isAnimationActive: true,
} as const;

// ── Donut/Pie animation ───────────────────────────────────────────────────────
export const PIE_ANIMATION = {
  animationDuration: 700,
  animationEasing: "ease-out",
  isAnimationActive: true,
} as const;

// ── Shared ResponsiveContainer height ─────────────────────────────────────────
export const CHART_HEIGHTS = {
  sm:  160,
  md:  220,
  lg:  280,
  xl:  340,
} as const;

// ── SVG gradient helper for JSX ───────────────────────────────────────────────
// Paste this <defs> block inside any <AreaChart> or <ComposedChart>:
// import { ChartGradientDefs } from "../charts/ChartTheme";
// <AreaChart><ChartGradientDefs /></AreaChart>
export const GRADIENT_DEFS_SVG = `
  <defs>
    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stop-color="#8B1E1E" stop-opacity="0.18"/>
      <stop offset="95%" stop-color="#8B1E1E" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stop-color="#16A34A" stop-opacity="0.18"/>
      <stop offset="95%" stop-color="#16A34A" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stop-color="#BA1A1A" stop-opacity="0.12"/>
      <stop offset="95%" stop-color="#BA1A1A" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="gradSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stop-color="#0284C7" stop-opacity="0.15"/>
      <stop offset="95%" stop-color="#0284C7" stop-opacity="0"/>
    </linearGradient>
  </defs>
`;
