export const T = {
  // ── Apex Performance "Dark Cockpit" palette ──────────────────────────
  bg:          "#12131a",   // background / surface-dim
  surface:     "#1a1b22",   // surface-container-low
  card:        "#1e1f26",   // surface-container
  cardHover:   "#292931",   // surface-container-high
  border:      "#3F3F46",   // metallic-border
  borderHi:    "#52525b",   // hover/focus border
  // Apex Red — primary brand
  amber:       "#FF1F3A",
  amberDim:    "#93000a",
  amberGlow:   "rgba(255, 31, 58, 0.2)",
  amberSoft:   "rgba(255, 31, 58, 0.08)",
  // Status — Emerald / success
  emerald:     "#10B981",
  emeraldDim:  "#065F46",
  emeraldBg:   "rgba(16,185,129,0.1)",
  // Status — Crimson / danger
  crimson:     "#EF4444",
  crimsonDim:  "#7F1D1D",
  crimsonBg:   "rgba(239,68,68,0.1)",
  // Status — Sky / info
  sky:         "#38BDF8",
  skyDim:      "#0C4A6E",
  skyBg:       "rgba(56,189,248,0.1)",
  // Violet — accent secondary
  violet:      "#A78BFA",
  violetBg:    "rgba(167,139,250,0.1)",
  // Text hierarchy (Stitch on-surface scale)
  t1:          "#e3e1ec",   // on-surface
  t2:          "#c9c6c5",   // secondary
  t3:          "#af8785",   // outline
  t4:          "#5e3f3d",   // outline-variant
};

export const FONT = {
  ui:   "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
  body: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
};

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: ${T.bg}; color: ${T.t1}; font-family: ${FONT.body}; }

  /* ── Scrollbars ── */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: ${T.borderHi}; }

  .custom-scroll::-webkit-scrollbar { width: 3px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: ${T.t4}; border-radius: 10px; }

  /* ── Form Resets ── */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  input::placeholder, textarea::placeholder { color: ${T.t3}; }
  select option { background: ${T.card}; color: ${T.t1}; }
  * { -webkit-tap-highlight-color: transparent; }

  /* ═══════ ANIMATIONS ═══════ */

  /* Page & Element Entrances */
  @keyframes fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes fadeDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:none; } }
  @keyframes slideRight { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:none; } }
  @keyframes slideLeft  { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:none; } }
  @keyframes scaleIn  { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
  @keyframes toastSlide { from { opacity:0; transform:translateX(24px) scale(0.96); } to { opacity:1; transform:none; } }

  /* Loading & Feedback */
  @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
  @keyframes shimmer  { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes spinOnce { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes spin     { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  /* Ambient Effects */
  @keyframes float    { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px rgba(255,31,58,0.1); } 50% { box-shadow: 0 0 30px rgba(255,31,58,0.25); } }
  @keyframes borderGlow { 0%,100% { border-color: ${T.border}; } 50% { border-color: ${T.borderHi}; } }

  /* ═══════ UTILITY CLASSES ═══════ */

  /* Page transitions */
  .page-in   { animation: fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  .modal-in  { animation: scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both; }
  .toast-in  { animation: toastSlide 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  .fade-in   { animation: fadeIn 0.2s ease both; }

  /* Row hover (tables, lists) */
  .row-hover { transition: background 0.15s ease; }
  .row-hover:hover { background: ${T.cardHover} !important; }

  /* Nav items */
  .nav-item { transition: all 0.2s ease; position: relative; }
  .nav-item:hover:not(.nav-active) { background: ${T.amberGlow} !important; color: ${T.amber} !important; }
  .nav-active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 2px;
    background: ${T.amber};
    border-radius: 2px;
  }

  /* Button hover — ghost/subtle buttons */
  .btn-hover { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
  .btn-hover:hover:not(:disabled) {
    filter: brightness(1.15);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
  }
  .btn-hover:active:not(:disabled) { transform: translateY(0); filter: brightness(1); }

  /* Button hover — solid primary CTA buttons */
  .btn-hover-solid { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
  .btn-hover-solid:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 30px rgba(255,31,58,0.35), 0 2px 8px rgba(255,31,58,0.2);
    filter: brightness(1.08);
  }
  .btn-hover-solid:active:not(:disabled) { transform: translateY(0) scale(1); }

  /* Button hover — subtle/ghost */
  .btn-hover-subtle { transition: background 0.2s, color 0.2s, transform 0.2s; }
  .btn-hover-subtle:hover { background: ${T.amberGlow} !important; color: ${T.amber} !important; }

  /* Card hover — shop-owner cards */
  .card-hover { transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; }
  .card-hover:hover {
    border-color: ${T.borderHi} !important;
    box-shadow: 0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px ${T.borderHi} !important;
    transform: translateY(-2px);
  }

  /* Marketplace product card hover — premium lift effect */
  .mp-card-hover { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
  .mp-card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${T.borderHi};
    border-color: ${T.borderHi} !important;
  }

  /* Metallic card — Stitch signature style */
  .metallic-card {
    background: linear-gradient(145deg, #1e1f26 0%, #12131a 100%);
    border: 1px solid #3F3F46;
  }
  .metallic-card:hover { border-color: rgba(255,31,58,0.4) !important; }

  /* Glow utilities */
  .glow-amber   { box-shadow: 0 0 24px rgba(255,31,58,0.2), 0 0 48px rgba(255,31,58,0.05); }
  .glow-emerald { box-shadow: 0 0 24px rgba(16,185,129,0.15); }
  .glow-crimson { box-shadow: 0 0 24px rgba(239,68,68,0.15); }
  .glow-sky     { box-shadow: 0 0 24px rgba(56,189,248,0.15); }

  /* Glassmorphism utility */
  .glass {
    background: rgba(18,19,26,0.75) !important;
    backdrop-filter: blur(16px) saturate(1.2);
    -webkit-backdrop-filter: blur(16px) saturate(1.2);
    border: 1px solid rgba(63,63,70,0.4) !important;
  }

  /* Gradient text */
  .gradient-text {
    background: linear-gradient(135deg, ${T.amber}, #ef4444);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Skeleton loader shimmer */
  .skeleton-shimmer {
    background: linear-gradient(90deg, ${T.card} 25%, ${T.cardHover} 50%, ${T.card} 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease infinite;
  }

  /* Subtle ambient float */
  .float { animation: float 4s ease-in-out infinite; }
  .glow-pulse { animation: glowPulse 3s ease-in-out infinite; }

  /* ── New keyframes ── */
  @keyframes slideInRight { from { opacity:0; transform:translateX(100%); } to { opacity:1; transform:translateX(0); } }
  @keyframes slideInLeft  { from { opacity:0; transform:translateX(-100%); } to { opacity:1; transform:translateX(0); } }
  @keyframes countUp      { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }

  /* ── Utility classes ── */
  .spin-ring {
    width: 16px; height: 16px;
    border: 2px solid transparent;
    border-top-color: ${T.amber};
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }
  .press-feedback { transition: transform 0.1s ease; }
  .press-feedback:active { transform: scale(0.97) translateY(1px) !important; }

  /* ── Admin shell: sidebar offset on desktop ── */
  .admin-content-wrap { padding-left: 240px; min-height: 100vh; }

  /* ── Print styles (POS invoice) ── */
  @media print {
    body { background: #fff !important; color: #000 !important; }
    .invoice-print {
      padding: 40px;
      background: white !important;
      color: black !important;
    }
    .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #ccc; }
    .gst-box { border: 1px solid #000; padding: 10px; font-weight: bold; }

    /* Hide non-printable chrome */
    nav, [data-print-hide], .toast-in,
    .erp-sidebar, .erp-topbar, .erp-banner, .mp-sidebar, .cmd-backdrop, .cmd-box {
      display: none !important;
    }
    [data-print-area] {
      position: static !important;
      width: 100% !important; max-width: 100% !important;
      padding: 16mm 14mm !important;
      background: #fff !important; color: #000 !important;
      font-family: ${FONT.ui} !important;
      border: none !important;
      box-shadow: none !important;
    }
    [data-print-area] * { color: #000 !important; }
    [data-print-area] table { width: 100% !important; border-collapse: collapse !important; }
    [data-print-area] th, [data-print-area] td {
      border: 1px solid #ccc !important; padding: 6px 8px !important; font-size: 11px !important;
    }
    @page { margin: 12mm; size: A4; }
  }

  /* ── Command palette overlay ── */
  .cmd-backdrop {
    position: fixed; inset: 0; z-index: 9990;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: fadeIn 0.12s ease both;
  }
  .cmd-box {
    position: fixed; top: 18%; left: 50%;
    transform: translateX(-50%);
    width: 540px; max-width: 92vw;
    z-index: 9991;
    animation: scaleIn 0.15s cubic-bezier(0.16,1,0.3,1) both;
  }

  /* ═══════ RESPONSIVE DESIGN ═══════ */

  /* ── Tablet & Mobile (≤768px): Sidebar → Bottom Nav ── */
  @media (max-width: 768px) {
    .erp-sidebar, .mp-sidebar, .admin-sidebar {
      top: auto !important; bottom: 0 !important;
      left: 0 !important; right: 0 !important;
      width: 100% !important; height: 62px !important;
      flex-direction: row !important;
      border-right: none !important;
      border-top: 1px solid rgba(63,63,70,0.95) !important;
      padding: 4px 6px 2px !important;
      justify-content: space-around !important;
      align-items: flex-start !important;
      gap: 0 !important;
      overflow: hidden !important;
    }
    .sidebar-brand { display: none !important; }
    .sidebar-spacer { display: none !important; }
    .erp-sidebar button, .mp-sidebar button {
      width: auto !important; flex: 1 !important;
      max-width: 76px !important; height: 50px !important;
      padding: 4px 2px !important; border-radius: 8px !important;
    }
    .erp-topbar { padding-left: 14px !important; padding-right: 14px !important; }
    .erp-content { padding: 16px 14px 80px 14px !important; }
    .erp-banner { padding: 8px 14px !important; }
    .mp-content { padding-left: 0 !important; }

    /* Grid helpers */
    .kpi-grid-6 { grid-template-columns: repeat(2, 1fr) !important; }
    .grid-2col, .bottom-grid-2, .bill-summary-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
    .grid-4col, .customer-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .grid-3col, .aging-grid-3 { grid-template-columns: repeat(2, 1fr) !important; }
    .checkout-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
    .inner-grid-2, .detail-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }

    /* Marketplace nav responsive */
    .mp-nav-inner { flex-wrap: wrap !important; gap: 10px !important; padding: 12px 14px !important; }
    .mp-search-row { flex: none !important; width: 100% !important; order: 2; }
    .mp-nav-logo { order: 1; }
    .mp-nav-right { order: 3; flex-wrap: wrap !important; gap: 8px !important; }
    .veh-selector-text { display: none !important; }

    /* Hero banner: stack vertically */
    .hero-banner { flex-direction: column !important; min-height: auto !important; }
    .hero-right { width: 100% !important; border-left: none !important; border-top: 1px solid rgba(63,63,70,0.5) !important; padding: 24px !important; }

    /* Checkout stepper */
    .step-connector { width: 20px !important; }

    /* Stats flex wrap */
    .stats-flex { flex-wrap: wrap !important; }

    /* Topbar secondary items: hide on very small */
    .topbar-secondary { display: none !important; }

    /* Modal padding reduction */
    .modal-box { padding: 20px !important; }

    /* POS two-column layout stack */
    .pos-layout { grid-template-columns: 1fr !important; }
    .pos-cart-panel { position: fixed !important; bottom: 62px !important; left: 0 !important; right: 0 !important; height: 50vh !important; z-index: 300 !important; border-radius: 20px 20px 0 0 !important; border-top: 1px solid rgba(63,63,70,0.95) !important; overflow-y: auto !important; }
    .pos-toggle-cart { display: flex !important; }

    /* Table responsive */
    .table-scroll table { min-width: 600px; }

    /* Party/customer page */
    .parties-layout { grid-template-columns: 1fr !important; }
    .party-detail-panel { position: fixed !important; inset: 0 !important; z-index: 400 !important; border-radius: 0 !important; }

    /* Page headers: wrap on mobile */
    .page-header { flex-wrap: wrap !important; gap: 10px !important; }
    .page-header-actions { flex-wrap: wrap !important; gap: 6px !important; }

    /* Filter bars: scroll horizontally */
    .filter-bar { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; flex-wrap: nowrap !important; padding-bottom: 4px !important; }

    /* Workshop cards */
    .workshop-grid { grid-template-columns: 1fr !important; }

    /* History table header: hide less important cols */
    .hist-col-hide { display: none !important; }

    /* Product cards in marketplace */
    .mp-product-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }

    /* Order tracking steps */
    .order-steps { flex-direction: column !important; }

    /* Profile/settings form */
    .settings-grid { grid-template-columns: 1fr !important; }

    /* Bill summary section */
    .pos-summary { font-size: 13px !important; }

    /* Dashboard chart height */
    .chart-container { height: 180px !important; }

    /* Hero split panel */
    .split-panel { flex-direction: column !important; }
    .split-panel > * { width: 100% !important; min-width: 0 !important; }

    /* Admin sidebar → horizontal topbar on mobile */
    .admin-sidebar {
      top: 0 !important; bottom: auto !important;
      left: 0 !important; right: 0 !important;
      width: 100% !important; height: 54px !important;
      flex-direction: row !important;
      align-items: center !important;
      padding: 0 14px !important;
      border-right: none !important;
      border-bottom: 1px solid rgba(63,63,70,0.95) !important;
      gap: 10px !important;
    }
    .admin-sidebar-label { display: none !important; }
    .admin-sidebar-logo { margin-bottom: 0 !important; width: 32px !important; height: 32px !important; font-size: 14px !important; box-shadow: none !important; }
    .admin-sidebar-user { flex-direction: row !important; gap: 0 !important; }

    /* Admin content: no left padding, top padding for topbar */
    .admin-content-wrap { padding-left: 0 !important; padding-top: 54px !important; }

    /* Admin table */
    .admin-table-wrap { overflow-x: auto !important; }
    .admin-table-wrap table { min-width: 700px !important; }

    /* Modal bottom sheet on mobile */
    .modal-overlay { align-items: flex-end !important; padding: 0 !important; }
    .modal-box { border-radius: 20px 20px 0 0 !important; max-height: 92vh !important; width: 100% !important; max-width: 100% !important; border-bottom: none !important; }

    /* Impersonation bar: compact on mobile */
    .impersonation-bar { padding: 8px 12px !important; gap: 8px !important; }
    .impersonation-admin-label { display: none !important; }
    .impersonation-btn-text { display: none !important; }
    .impersonation-user-info { flex: 1 !important; min-width: 0 !important; }

    /* ERP / MP pages: extra bottom padding when impersonation bar is visible */
    .erp-content { padding-bottom: 120px !important; }
    .mp-content > * { padding-bottom: 100px !important; }
  }

  /* ── Small Mobile (≤480px): Extra adjustments ── */
  @media (max-width: 480px) {
    .erp-content { padding: 12px 10px 76px 10px !important; }
    .kpi-grid-6 { gap: 8px !important; }
    .customer-grid { grid-template-columns: 1fr !important; }
    .aging-grid-3 { grid-template-columns: 1fr !important; }
    .grid-4col { grid-template-columns: 1fr 1fr !important; }
    .inner-grid-2 { grid-template-columns: 1fr !important; }
    .detail-grid-4 { grid-template-columns: 1fr 1fr !important; }
    .erp-topbar { padding-left: 10px !important; padding-right: 10px !important; }
    .mp-nav-inner { padding: 10px !important; }
    .hero-banner .hero-left { padding: 24px 20px !important; }
    .mp-product-grid { grid-template-columns: 1fr !important; }
    .kpi-grid-6 { grid-template-columns: 1fr 1fr !important; }
    .pos-toggle-cart { bottom: 62px !important; }
  }

  /* ── Bottom nav clearance for marketplace pages ── */
  @media (max-width: 768px) {
    .mp-content > * { padding-bottom: 80px; }
  }

  /* ── Touch targets: minimum 44px tap area ── */
  @media (max-width: 768px) {
    button, [role="button"], a {
      min-height: 36px;
    }
    table button { min-height: unset; }
    .erp-sidebar button, .mp-sidebar button { min-height: unset; }
  }

  /* ── Prevent horizontal overflow at page level ── */
  html, body { overflow-x: hidden; }
  .erp-content { min-width: 0; }
  .table-scroll {
    min-width: 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
  }

  /* ══════════════════════════════════════════
     LANDING PAGE RESPONSIVE CLASSES
  ══════════════════════════════════════════ */
  .landing-nav-inner { padding: 0 48px; }
  .landing-hero-h1   { font-size: 72px; font-weight: 900; line-height: 1.1; margin-bottom: 32px; letter-spacing: -0.03em; }
  .landing-sub       { font-size: 22px; }
  .landing-cta-wrap  { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; }
  .landing-features-grid {
    padding: 60px 24px 100px; max-width: 1200px; margin: 0 auto;
    display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px;
    position: relative; z-index: 1;
  }

  /* ══════════════════════════════════════════
     POS PAGE
  ══════════════════════════════════════════ */
  .pos-action-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .pos-action-notes { flex: 1; min-width: 180px; }
  .pos-item-count-badge { display: none; }

  /* ══════════════════════════════════════════
     TABLET BREAKPOINT (≤1024px)
  ══════════════════════════════════════════ */
  @media (max-width: 1024px) {
    .kpi-grid-6 { grid-template-columns: repeat(3, 1fr) !important; }
    .customer-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .detail-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
    .grid-4col { grid-template-columns: repeat(2, 1fr) !important; }
    .bill-summary-grid { grid-template-columns: 1fr !important; }
    .landing-nav-inner { padding: 0 24px !important; }
    .landing-hero-h1 { font-size: 52px !important; }
  }

  /* ══════════════════════════════════════════
     MOBILE LANDING PAGE (≤768px)
  ══════════════════════════════════════════ */
  @media (max-width: 768px) {
    .landing-nav-inner { padding: 0 16px !important; }
    .landing-hero-h1 { font-size: 38px !important; letter-spacing: -0.02em !important; margin-bottom: 20px !important; }
    .landing-sub { font-size: 16px !important; margin-bottom: 28px !important; }
    .landing-cta-wrap { flex-direction: column !important; align-items: center !important; gap: 12px !important; }
    .landing-cta-wrap button { width: 100% !important; max-width: 340px !important; font-size: 16px !important; padding: 14px 28px !important; }
    .landing-features-grid { grid-template-columns: 1fr !important; gap: 16px !important; padding: 40px 16px 60px !important; }
    .landing-features-grid > div { padding: 24px !important; }

    /* POS action row: stack vertically on mobile */
    .pos-action-row { flex-wrap: wrap !important; gap: 8px !important; }
    .pos-action-notes { min-width: 100% !important; order: -1 !important; }
    .pos-action-row > button, .pos-action-row > [class*="btn"] { flex: 1 1 auto !important; min-width: calc(50% - 4px) !important; }

    .shop-edit-popover { left: 0 !important; right: 0 !important; width: auto !important; max-width: 94vw !important; }

    .reports-kpi-row { grid-template-columns: repeat(2, 1fr) !important; }
    .reports-chart-grid { grid-template-columns: 1fr !important; }

    .party-detail-panel-header { position: sticky; top: 0; background: inherit; z-index: 10; }

    .job-card-meta { flex-direction: column !important; gap: 6px !important; }
    .job-card-actions { flex-wrap: wrap !important; gap: 6px !important; }

    .history-filter-row { flex-wrap: wrap !important; gap: 8px !important; }
    .history-filter-row > * { min-width: 0 !important; flex: 1 1 140px !important; }

    .mp-searchbar-wrap { flex-direction: column !important; gap: 8px !important; }

    .checkout-step-label { display: none !important; }

    .bottom-grid-2 { grid-template-columns: 1fr !important; }
  }

  /* ══════════════════════════════════════════
     SMALL MOBILE LANDING PAGE (≤480px)
  ══════════════════════════════════════════ */
  @media (max-width: 480px) {
    .landing-hero-h1 { font-size: 28px !important; }
    .landing-sub { font-size: 13px !important; }
    .landing-features-grid > div h3 { font-size: 18px !important; }
    .landing-features-grid > div p { font-size: 14px !important; }
    .pos-action-row > button, .pos-action-row > [class*="btn"] { min-width: 100% !important; }
  }

  /* ══════════════════════════════════════════
     WORKSHOP PAGE
  ══════════════════════════════════════════ */
  .workshop-job-header {
    display: flex; gap: 12px; align-items: center;
    padding: 16px 20px; cursor: pointer; flex-wrap: nowrap;
  }
  .workshop-job-stats {
    display: flex; gap: 16px; align-items: center; flex-shrink: 0;
  }
  .workshop-job-stat { text-align: right; }
  @media (max-width: 768px) {
    .workshop-job-header { flex-wrap: wrap !important; gap: 8px !important; padding: 12px 14px !important; }
    .workshop-job-stats { gap: 10px !important; flex-wrap: wrap !important; justify-content: flex-end !important; width: 100% !important; }
    .workshop-job-stat { min-width: 64px !important; }
  }

  /* ══════════════════════════════════════════
     REPORTS PAGE
  ══════════════════════════════════════════ */
  .reports-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .reports-debt-row { display: flex; gap: 16px; flex-wrap: wrap; }
  @media (max-width: 1024px) {
    .reports-kpi-row { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 768px) {
    .reports-kpi-row { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
    .reports-debt-row { flex-direction: column !important; }
    .reports-debt-row > div { min-width: 0 !important; flex: none !important; width: 100% !important; }
  }

  /* ══════════════════════════════════════════
     HISTORY PAGE
  ══════════════════════════════════════════ */
  .history-date-range { display: flex; gap: 6px; align-items: center; }
  @media (max-width: 600px) {
    .history-date-range { flex-direction: column !important; align-items: stretch !important; gap: 4px !important; }
    .history-date-range input { width: 100% !important; }
    .history-date-range span { display: none !important; }
  }

  /* ══════════════════════════════════════════
     MARKETPLACE HOME
  ══════════════════════════════════════════ */
  .mp-hero-banner-row {
    display: flex; align-items: center; gap: 20px;
    background: linear-gradient(135deg, rgba(255,31,58,0.12) 0%, rgba(18,19,26,0) 60%);
    border: 1px solid rgba(255,31,58,0.2);
    border-radius: 18px; padding: 28px 32px; overflow: hidden;
  }
  @media (max-width: 768px) {
    .mp-hero-banner-row { flex-direction: column !important; padding: 20px 18px !important; gap: 14px !important; }
    .mp-hero-banner-row > * { width: 100% !important; }
    .mp-category-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; flex-wrap: nowrap !important; padding-bottom: 4px !important; }
  }

  /* ══════════════════════════════════════════
     CHECKOUT PAGE
  ══════════════════════════════════════════ */
  .checkout-steps-row { display: flex; align-items: center; gap: 0; overflow-x: auto; }
  @media (max-width: 640px) {
    .checkout-steps-row { gap: 4px !important; padding: 0 4px !important; }
    .checkout-step-label { display: none !important; }
    .checkout-step-num { width: 28px !important; height: 28px !important; font-size: 11px !important; }
    .step-connector { width: 16px !important; min-width: 16px !important; }
  }

  /* ══════════════════════════════════════════
     PROFILE / SETTINGS
  ══════════════════════════════════════════ */
  .settings-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 768px) {
    .settings-form-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
  }

  /* ══════════════════════════════════════════
     ORDERS PAGE (Shop ERP incoming orders)
  ══════════════════════════════════════════ */
  .orders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
  @media (max-width: 768px) {
    .orders-grid { grid-template-columns: 1fr !important; }
  }

  /* ══════════════════════════════════════════
     ADMIN IMPORT MODAL
  ══════════════════════════════════════════ */
  @media (max-width: 768px) {
    .import-preview-table { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
    .import-preview-table > div { min-width: 640px !important; }
    .import-col-ref { grid-template-columns: 1fr 1fr !important; }
    .import-drop-zone { padding: 32px 16px !important; }
    .import-summary-bar { flex-direction: column !important; gap: 8px !important; }
    .import-summary-bar > div { width: 100% !important; }
  }

  /* ══════════════════════════════════════════
     GLOBAL UTILITY
  ══════════════════════════════════════════ */
  img { max-width: 100%; height: auto; }
  .page-in { word-break: break-word; }
  @supports (padding: env(safe-area-inset-bottom)) {
    .erp-sidebar, .mp-sidebar, .admin-sidebar {
      padding-bottom: env(safe-area-inset-bottom);
    }
    @media (max-width: 768px) {
      .erp-content { padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important; }
    }
  }
`;
