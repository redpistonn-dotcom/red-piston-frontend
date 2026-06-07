// ─────────────────────────────────────────────────────────────────────────────
// RedPiston Design System — "Premium Industrial" (Google Stitch Exact Match)
//
// Font Strategy (Automobile / Industrial ERP):
//   Poppins    → Headings, brand, section titles  (geometric; used by Audi, VW)
//   Inter      → All UI labels, body, table data  (systematic; used by Notion, Linear)
//   JetBrains Mono → Prices, qty, codes, IDs      (monospaced alignment)
//   Material Symbols Outlined → Icon set           (matches Stitch design)
//
// Color Palette: "Balanced Maroon" rooted in warm neutrals + authoritative maroon
// Source: DESIGN.md from Stitch export (harshadsk25@gmail.com project)
// ─────────────────────────────────────────────────────────────────────────────

export const T = {
  // ── Background & Page Surface ────────────────────────────────────────────
  bg:          "#F5F5F0",   // Heritage Beige — global canvas (warm cream)
  surface:     "#FFFFFF",   // Pure white — cards, sidebar, topbar
  card:        "#FFFFFF",
  cardHover:   "#F6F3F2",   // surface-container-low — hover tint

  // ── Borders (warm, not cold blue-grey) ──────────────────────────────────
  border:      "#DFBFBC",   // outline-variant — warm pinkish-beige
  borderHi:    "#8B716E",   // outline — focused / hovered state

  // ── Surface containers (tonal layers from Stitch) ───────────────────────
  surfaceDim:             "#DCD9D9",
  surfaceBright:          "#FCF9F8",
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow:    "#F6F3F2",
  surfaceContainer:       "#F0EDED",
  surfaceContainerHigh:   "#EAE7E7",
  surfaceContainerHighest:"#E5E2E1",
  inverseSurface:         "#313030",   // dark card (Dead Stock panel)
  inverseOnSurface:       "#F3F0EF",

  // ── RedPiston Brand — Maroon ─────────────────────────────────────────────
  amber:       "#8B1E1E",   // primary-container / maroon-brand — THE correct maroon
  amberDim:    "#6A020A",   // primary — deeper maroon for hover/pressed
  amberGlow:   "rgba(139,30,30,0.08)",
  amberSoft:   "rgba(139,30,30,0.05)",

  // ── Status — Emerald / success ───────────────────────────────────────────
  emerald:     "#16A34A",   // ≈ emerald-600 (Tailwind)
  emeraldDim:  "#15803D",
  emeraldBg:   "rgba(22,163,74,0.07)",

  // ── Status — Error / danger (Stitch error: #BA1A1A) ─────────────────────
  crimson:     "#BA1A1A",   // error — slightly desaturated vs pure red
  crimsonDim:  "#93000A",   // on-error-container
  crimsonBg:   "#FFDAD6",   // error-container background

  // ── Status — Sky / info ──────────────────────────────────────────────────
  sky:         "#0284C7",
  skyDim:      "#0369A1",
  skyBg:       "rgba(2,132,199,0.08)",

  // ── Accent — Violet ──────────────────────────────────────────────────────
  violet:      "#7C3AED",
  violetBg:    "rgba(124,58,237,0.08)",

  // ── Text Hierarchy ───────────────────────────────────────────────────────
  t1:          "#1C1B1B",   // on-surface — near-black (warm, not cold)
  t2:          "#58413F",   // on-surface-variant — warm secondary
  t3:          "#8B716E",   // outline — muted labels
  t4:          "#DFBFBC",   // outline-variant — very muted / dividers
};

// ── Typography Scale ────────────────────────────────────────────────────────
export const FONT = {
  // Poppins: geometric modern → headings, brand identity, section titles
  display:  "'Poppins', system-ui, sans-serif",

  // Inter: systematic, neutral → all UI labels, body, table data, inputs
  ui:       "'Inter', system-ui, -apple-system, sans-serif",
  body:     "'Inter', system-ui, -apple-system, sans-serif",

  // Monospaced: prices, codes, stock numbers
  mono:     "'JetBrains Mono', 'Fira Code', monospace",
};

// ── Automotive heading font (Rajdhani — precision/racing feel) ──────────────
export const FONT_AUTO = "'Rajdhani', 'Poppins', system-ui, sans-serif";

// ── Shadow System ────────────────────────────────────────────────────────────
export const SHADOWS = {
  none:        "none",
  xs:          "0 1px 3px rgba(28,27,27,0.06), 0 1px 2px rgba(28,27,27,0.04)",
  sm:          "0 4px 12px rgba(28,27,27,0.08), 0 2px 4px rgba(28,27,27,0.04)",
  md:          "0 8px 24px rgba(28,27,27,0.10), 0 4px 8px rgba(28,27,27,0.06)",
  lg:          "0 20px 48px rgba(28,27,27,0.14), 0 8px 16px rgba(28,27,27,0.08)",
  amber:       "0 4px 16px rgba(139,30,30,0.28)",
  amberHover:  "0 6px 22px rgba(139,30,30,0.38)",
  emerald:     "0 4px 16px rgba(22,163,74,0.22)",
};

// ── Motion Durations ─────────────────────────────────────────────────────────
export const MOTION = {
  fast:   "150ms",
  normal: "250ms",
  slow:   "350ms",
  ease:   "cubic-bezier(0.16, 1, 0.3, 1)",
};

// ── Z-index Scale ────────────────────────────────────────────────────────────
export const Z = {
  base:     1,
  above:    10,
  dropdown: 200,
  sticky:   300,
  sidebar:  400,
  topbar:   500,
  modal:    1000,
  toast:    9999,
};

// ── Spacing Scale (from DESIGN.md) ─────────────────────────────────────────
export const SP = {
  xs:   4,   // px
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  huge: 48,
  giant:64,
};

// ── Border Radii (Soft-Industrial from DESIGN.md) ──────────────────────────
export const RADIUS = {
  sm:   4,   // px
  md:   8,
  lg:   12,  // Standard UI — buttons, inputs, chips
  xl:   16,  // Structural — cards, modals, table containers
  full: 9999,
};

// ── Global CSS injected into ERPShell ───────────────────────────────────────
export const GLOBAL_CSS = `
  /* Material Symbols variable font — axis settings */
  .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    vertical-align: middle;
    line-height: 1;
    display: inline-block;
    font-size: inherit;
  }
  .material-symbols-filled {
    font-family: 'Material Symbols Outlined';
    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    vertical-align: middle;
    line-height: 1;
    display: inline-block;
    font-size: inherit;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    background: #F5F5F0;
    color: #1C1B1B;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Scrollbars ── */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #F0EDED; }
  ::-webkit-scrollbar-thumb { background: #DFBFBC; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: #8B716E; }

  .custom-scroll::-webkit-scrollbar { width: 4px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #DFBFBC; border-radius: 10px; }

  /* ── Form Resets ── */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  input::placeholder, textarea::placeholder { color: #8B716E; }
  select option { background: #FFFFFF; color: #1C1B1B; }
  * { -webkit-tap-highlight-color: transparent; }

  /* ═══════ ANIMATIONS ═══════ */
  @keyframes fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes fadeDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:none; } }
  @keyframes slideRight { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:none; } }
  @keyframes slideLeft  { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:none; } }
  @keyframes scaleIn  { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
  @keyframes toastSlide { from { opacity:0; transform:translateX(24px) scale(0.96); } to { opacity:1; transform:none; } }
  @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
  @keyframes shimmer  { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes spin     { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px rgba(139,30,30,0.1); } 50% { box-shadow: 0 0 30px rgba(139,30,30,0.25); } }

  /* ═══════ SKELETON SHIMMER ═══════ */
  /* Used by Skeleton component and PageLoader in App.tsx */
  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      #EAE7E7 0%,
      #F0EDED 40%,
      #EAE7E7 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease infinite;
    border-radius: 6px;
  }

  /* ═══════ UTILITY CLASSES ═══════ */
  .page-in   { animation: fadeUp 0.32s cubic-bezier(0.16,1,0.3,1) both; }
  .modal-in  { animation: scaleIn 0.22s cubic-bezier(0.16,1,0.3,1) both; }
  .toast-in  { animation: toastSlide 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-in   { animation: fadeIn 0.2s ease both; }
  .slide-up  { animation: fadeUp 0.28s cubic-bezier(0.16,1,0.3,1) both; }

  /* ── ERP card hover — premium lift ── */
  .card-hover {
    transition: box-shadow 0.22s cubic-bezier(0.16,1,0.3,1),
                border-color 0.22s,
                transform 0.22s cubic-bezier(0.16,1,0.3,1);
  }
  .card-hover:hover {
    box-shadow: 0 4px 16px rgba(28,27,27,0.09), 0 2px 4px rgba(28,27,27,0.04);
    border-color: #8B1E1E !important;
    transform: translateY(-1px);
  }

  /* ── Stat card hover — more pronounced lift ── */
  .stat-card-hover {
    transition: box-shadow 0.22s cubic-bezier(0.16,1,0.3,1),
                border-color 0.22s,
                transform 0.22s cubic-bezier(0.16,1,0.3,1);
  }
  .stat-card-hover:hover {
    box-shadow: 0 8px 24px rgba(28,27,27,0.10), 0 2px 8px rgba(28,27,27,0.05);
    border-color: #8B1E1E !important;
    transform: translateY(-2px);
  }

  /* ── Primary button hover ── */
  .btn-primary-hover {
    transition: transform 0.18s cubic-bezier(0.16,1,0.3,1),
                box-shadow 0.18s cubic-bezier(0.16,1,0.3,1),
                filter 0.18s;
  }
  .btn-primary-hover:not(:disabled):hover {
    transform: scale(1.02) translateY(-1px);
    box-shadow: 0 6px 20px rgba(139,30,30,0.36);
  }
  .btn-primary-hover:not(:disabled):active {
    transform: scale(0.98) translateY(0);
    box-shadow: none;
  }

  /* ── Nav item hover ── */
  .nav-item { transition: background 0.15s, color 0.15s; }
  .nav-item:hover { background: #EAE7E7 !important; }
  .nav-item.active { background: #8B1E1E !important; color: #fff !important; }

  /* ── Table row hover — precision feel ── */
  .trow {
    transition: background 0.12s ease;
    cursor: default;
  }
  .trow:hover { background: #F6F3F2 !important; }

  /* ── Data table header ── */
  .th-cell {
    padding: 10px 14px;
    text-align: left;
    color: #8B716E;
    font-weight: 700;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    font-family: 'Inter', sans-serif;
    white-space: nowrap;
    background: #F5F5F0;
    border-bottom: 1px solid #DFBFBC;
    user-select: none;
  }
  .th-cell.sortable { cursor: pointer; }
  .th-cell.sortable:hover { color: #8B1E1E; background: #F0EDED; }

  /* ── Table container ── */
  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .table-scroll::-webkit-scrollbar { height: 4px; }
  .table-scroll::-webkit-scrollbar-track { background: transparent; }
  .table-scroll::-webkit-scrollbar-thumb { background: #DFBFBC; border-radius: 10px; }

  /* ── Focus ring — accessible ── */
  :focus-visible {
    outline: 2px solid #8B1E1E;
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* ── Text selection ── */
  ::selection { background: rgba(139,30,30,0.15); color: #1C1B1B; }
  ::-moz-selection { background: rgba(139,30,30,0.15); color: #1C1B1B; }

  /* ── Period tab ── */
  .period-btn { transition: all 0.15s; cursor: pointer; border: none; font-family: 'Inter', sans-serif; }
  .period-btn:hover { color: #8B1E1E; }

  /* ── Dashboard pending-actions row hover ── */
  .row-hover { transition: background 0.12s ease; cursor: pointer; border-radius: 8px; }
  .row-hover:hover { background: #F6F3F2 !important; }

  /* ════════════════════════════════════════════════════════════════════
     RESPONSIVE SYSTEM — Mobile First
     Breakpoints:
       xs:  320px  (small phones)
       sm:  480px  (large phones)
       md:  768px  (tablets)
       lg:  1024px (laptops)
       xl:  1280px (desktop)
       2xl: 1440px (large desktop)
       3xl: 1920px (ultrawide)
  ════════════════════════════════════════════════════════════════════ */

  /* ── Responsive KPI Grid ── */
  .kpi-grid-6 { grid-template-columns: repeat(2, minmax(0,1fr)) !important; gap: 10px !important; }
  @media (min-width: 480px) { .kpi-grid-6 { grid-template-columns: repeat(2, minmax(0,1fr)) !important; } }
  @media (min-width: 768px) { .kpi-grid-6 { grid-template-columns: repeat(3, minmax(0,1fr)) !important; gap: 12px !important; } }
  @media (min-width: 1024px) { .kpi-grid-6 { grid-template-columns: repeat(3, minmax(0,1fr)) !important; } }
  @media (min-width: 1280px) { .kpi-grid-6 { grid-template-columns: repeat(6, minmax(0,1fr)) !important; gap: 14px !important; } }

  /* ── KPI 4-col: 2col mobile → 4col desktop ── */
  .kpi-grid-4 { grid-template-columns: repeat(2, minmax(0,1fr)) !important; gap: 10px !important; }
  @media (min-width: 768px) { .kpi-grid-4 { grid-template-columns: repeat(4, minmax(0,1fr)) !important; gap: 14px !important; } }

  /* ── KPI 3-col: 1col mobile → 3col desktop ── */
  .kpi-grid-3 { grid-template-columns: 1fr !important; gap: 10px !important; }
  @media (min-width: 640px) { .kpi-grid-3 { grid-template-columns: repeat(3, minmax(0,1fr)) !important; gap: 12px !important; } }

  /* ── Responsive 3-Column Grid ── */
  .rp-grid-3 { display: grid; grid-template-columns: 1fr; gap: 14px; }
  @media (min-width: 768px) { .rp-grid-3 { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .rp-grid-3 { grid-template-columns: repeat(3, 1fr); } }

  /* ── Responsive 2-Column Grid ── */
  .rp-grid-2 { display: grid; grid-template-columns: 1fr; gap: 14px; }
  @media (min-width: 768px) { .rp-grid-2 { grid-template-columns: repeat(2, 1fr); } }

  /* ── Settings / Profile form 2-col grid (1-col on mobile) ── */
  .settings-grid { display: grid; grid-template-columns: 1fr; gap: 0 16px; }
  @media (min-width: 560px) { .settings-grid { grid-template-columns: repeat(2, 1fr); } }

  /* ── Stack on mobile ── */
  .rp-stack { display: flex; flex-direction: column; gap: 12px; }
  @media (min-width: 768px) { .rp-stack { flex-direction: row; align-items: center; } }

  /* ── Show/hide helpers ── */
  .rp-mobile-only { display: block; }
  .rp-desktop-only { display: none; }
  @media (min-width: 768px) {
    .rp-mobile-only { display: none !important; }
    .rp-desktop-only { display: block; }
  }
  .rp-mobile-flex { display: flex; }
  .rp-desktop-flex { display: none; }
  @media (min-width: 768px) {
    .rp-mobile-flex { display: none !important; }
    .rp-desktop-flex { display: flex; }
  }

  /* ── Responsive page padding ── */
  .rp-page-pad {
    padding: 12px 14px;
  }
  @media (min-width: 768px) { .rp-page-pad { padding: 16px 20px; } }
  @media (min-width: 1024px) { .rp-page-pad { padding: 20px 24px; } }
  @media (min-width: 1440px) { .rp-page-pad { padding: 24px 32px; } }

  /* ── Responsive card padding ── */
  .rp-card-pad { padding: 14px 16px; }
  @media (min-width: 768px) { .rp-card-pad { padding: 16px 20px; } }
  @media (min-width: 1024px) { .rp-card-pad { padding: 20px 24px; } }

  /* ── Mobile table → card transformation ── */
  /* On mobile, hide table structure and show as cards via .rp-table-card parent */
  .rp-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  @media (max-width: 767px) {
    .rp-table-wrap table { display: block; }
    .rp-table-wrap thead { display: none; }
    .rp-table-wrap tbody { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
    .rp-table-wrap tr {
      display: flex; flex-wrap: wrap; gap: 8px;
      background: #FFFFFF; border: 1px solid #DFBFBC;
      border-radius: 12px; padding: 14px 16px;
      box-shadow: 0 1px 3px rgba(28,27,27,0.06);
      position: relative;
    }
    .rp-table-wrap td {
      display: flex; flex-direction: column; gap: 2px;
      padding: 0; border: none; font-size: 13px;
    }
    .rp-table-wrap td[data-label]::before {
      content: attr(data-label);
      font-size: 9px; font-weight: 700; color: #8B716E;
      text-transform: uppercase; letter-spacing: 0.08em;
      font-family: 'Inter', sans-serif;
    }
    /* Full-width cells on mobile */
    .rp-table-wrap td.rp-td-full { width: 100%; }
    .rp-table-wrap td.rp-td-half { width: calc(50% - 4px); }
    .rp-table-wrap td.rp-td-actions { width: 100%; display: flex; flex-direction: row; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 4px; padding-top: 10px; border-top: 1px solid #F0EDED; }
  }

  /* ── Mobile filter drawer overlay ── */
  .rp-filter-overlay {
    display: none; position: fixed; inset: 0; background: rgba(28,27,27,0.4);
    z-index: 900; backdrop-filter: blur(2px); animation: fadeIn 0.2s ease;
  }
  .rp-filter-overlay.open { display: block; }
  .rp-filter-sheet {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 901;
    background: #FFFFFF; border-radius: 20px 20px 0 0;
    padding: 0; max-height: 85vh; overflow-y: auto;
    transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
    box-shadow: 0 -8px 32px rgba(28,27,27,0.15);
  }
  .rp-filter-sheet.open { transform: translateY(0); }
  .rp-filter-sheet-handle {
    width: 40px; height: 4px; background: #DFBFBC; border-radius: 2px;
    margin: 12px auto 0; flex-shrink: 0;
  }

  /* ── Drawer navigation ── */
  .rp-drawer-overlay {
    display: none; position: fixed; inset: 0; background: rgba(28,27,27,0.45);
    z-index: 700; backdrop-filter: blur(3px);
    animation: fadeIn 0.2s ease;
  }
  .rp-drawer-overlay.open { display: block; }
  .rp-drawer {
    position: fixed; top: 0; left: 0; bottom: 0; width: 280px; z-index: 710;
    background: #FFFFFF; box-shadow: 4px 0 32px rgba(28,27,27,0.18);
    transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
    display: flex; flex-direction: column; overflow: hidden;
  }
  .rp-drawer.open { transform: translateX(0); }

  /* ── Bottom sheet modal (mobile modals) ── */
  .rp-bottom-sheet-overlay {
    animation: fadeIn 0.22s ease;
  }
  .rp-bottom-sheet {
    position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important;
    width: 100% !important; max-width: 100% !important;
    border-radius: 20px 20px 0 0 !important;
    transform: translateY(0) !important;
    max-height: 92vh !important; overflow-y: auto !important;
    animation: slideUpSheet 0.3s cubic-bezier(0.16,1,0.3,1) both !important;
  }
  @keyframes slideUpSheet {
    from { transform: translateY(100%); opacity: 0.8; }
    to   { transform: translateY(0); opacity: 1; }
  }

  /* ── Mobile topbar adjustments ── */
  @media (max-width: 767px) {
    .erp-topbar {
      left: 0 !important;
      padding-left: 14px !important;
      padding-right: 14px !important;
      height: 56px !important;
    }
    .erp-content {
      margin-left: 0 !important;
      padding-top: 56px !important;
      padding-left: 14px !important;
      padding-right: 14px !important;
      padding-bottom: 72px !important;
    }
    /* When low-stock banner is visible, push content below the banner (56px topbar + 42px banner) */
    .erp-content.has-banner {
      padding-top: calc(56px + 42px) !important;
    }
    .erp-banner {
      left: 0 !important;
      top: 56px !important;
      padding-left: 14px !important;
    }
  }

  /* ── Tablet adjustments (768-1023px) ── */
  @media (min-width: 768px) and (max-width: 1023px) {
    .erp-topbar { left: 210px !important; }
    .erp-content {
      margin-left: 210px !important;
      padding-left: 18px !important;
      padding-right: 18px !important;
    }
  }

  /* ── Large desktop enhancements ── */
  @media (min-width: 1440px) {
    .erp-content { padding-left: 28px !important; padding-right: 28px !important; }
  }
  @media (min-width: 1920px) {
    .erp-content {
      max-width: 1800px;
      margin-right: auto;
      padding-left: 40px !important;
      padding-right: 40px !important;
    }
  }

  /* ── Bottom Navigation Bar (mobile) ── */
  .rp-bottom-nav {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 600;
    height: 60px; background: #FFFFFF;
    border-top: 1px solid #DFBFBC;
    box-shadow: 0 -4px 16px rgba(28,27,27,0.08);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    align-items: stretch;
  }
  @media (max-width: 767px) { .rp-bottom-nav { display: flex; } }

  /* Hide desktop sidebar on mobile */
  @media (max-width: 767px) {
    .erp-sidebar { display: none !important; }
  }

  /* ── Responsive chart container ── */
  .rp-chart-sm { height: 160px; }
  .rp-chart-md { height: 200px; }
  .rp-chart-lg { height: 240px; }
  @media (min-width: 768px) {
    .rp-chart-sm { height: 200px; }
    .rp-chart-md { height: 240px; }
    .rp-chart-lg { height: 300px; }
  }
  @media (min-width: 1280px) {
    .rp-chart-sm { height: 220px; }
    .rp-chart-md { height: 260px; }
    .rp-chart-lg { height: 340px; }
  }

  /* ── Touch-friendly min sizes ── */
  .rp-touch { min-height: 44px; min-width: 44px; }
  .rp-touch-48 { min-height: 48px; min-width: 48px; }

  /* ── Mobile-optimized forms ── */
  @media (max-width: 767px) {
    .rp-form-input, input.rp-form-input, select.rp-form-input {
      height: 48px !important; font-size: 16px !important; /* Prevent iOS zoom */
    }
    .rp-form-btn { height: 48px !important; font-size: 15px !important; }
    .rp-form-grid { grid-template-columns: 1fr !important; }
  }

  /* ── Safe area insets (iOS notch / home indicator) ── */
  .rp-safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
  .rp-safe-top    { padding-top:    env(safe-area-inset-top,    0px); }

  /* ── Responsive section gaps ── */
  .rp-gap { display: flex; flex-direction: column; gap: 12px; }
  @media (min-width: 768px) { .rp-gap { gap: 16px; } }
  @media (min-width: 1280px) { .rp-gap { gap: 20px; } }

  /* ── Mobile-friendly row actions ── */
  .rp-row-actions {
    display: flex; gap: 6px; align-items: center; flex-wrap: wrap;
  }
  @media (max-width: 767px) {
    .rp-row-actions { flex-direction: column; width: 100%; }
    .rp-row-actions button, .rp-row-actions a { width: 100%; justify-content: center; }
  }

  /* ── Stat card compact on mobile ── */
  @media (max-width: 479px) {
    .stat-card-hover { padding: 16px !important; min-height: 100px !important; }
  }

  /* ── Mobile typography ── */
  @media (max-width: 767px) {
    .rp-h1 { font-size: 20px !important; }
    .rp-h2 { font-size: 16px !important; }
    .rp-h3 { font-size: 14px !important; }
    .rp-caption { font-size: 11px !important; }
  }

  /* ── Horizontal scroll with snap for mobile cards ── */
  .rp-scroll-x {
    display: flex; overflow-x: auto; gap: 12px; padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .rp-scroll-x::-webkit-scrollbar { display: none; }
  .rp-scroll-x > * { scroll-snap-align: start; flex-shrink: 0; }

  /* ── Mobile search bar full-width ── */
  @media (max-width: 767px) {
    .rp-search-mobile { width: 100% !important; }
  }

  /* ── Tooltip prevent overflow on mobile ── */
  @media (max-width: 767px) {
    .recharts-tooltip-wrapper { max-width: calc(100vw - 32px) !important; }
  }

  /* ── Page-level responsive overrides ── */
  @media (max-width: 767px) {
    /* Dashboard chart on mobile */
    .chart-container { height: 200px !important; }
    /* Tables on mobile */
    .table-scroll { border-radius: 0 !important; }
    /* Section dividers */
    .rp-section-divider { margin: 8px 0 !important; }
  }
`;
