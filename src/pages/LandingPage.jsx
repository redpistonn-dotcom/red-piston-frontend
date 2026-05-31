import { useNavigate } from "react-router-dom";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@600&display=swap');
  * { box-sizing: border-box; }
  .lp-root { background: #121416; color: #e2e2e5; font-family: 'Inter', sans-serif; overflow-x: hidden; }

  /* ── Nav ── */
  .lp-nav {
    position: sticky; top: 0; z-index: 100;
    background: rgba(18,20,22,0.85); backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(91,64,60,0.3);
    padding: 0 24px; height: 72px;
  }
  .lp-nav-inner {
    max-width: 1280px; margin: 0 auto; height: 100%;
    display: flex; align-items: center; justify-content: space-between;
  }
  .lp-logo { font-family: 'Plus Jakarta Sans',sans-serif; font-size: 22px; font-weight: 800; color: #e2e2e5; letter-spacing: -0.03em; cursor: pointer; }
  .lp-nav-links { display: flex; gap: 32px; }
  .lp-nav-link { background: none; border: none; font-family: 'Inter',sans-serif; font-size: 15px; color: #e3beb8; cursor: pointer; transition: color 0.2s; padding: 0; }
  .lp-nav-link:hover, .lp-nav-link.active { color: #ffb4a7; }
  .lp-nav-link.active { border-bottom: 2px solid #ffb4a7; padding-bottom: 2px; }
  .lp-nav-right { display: flex; align-items: center; gap: 8px; }
  .lp-signin { background: none; border: none; font-family: 'Inter',sans-serif; font-size: 15px; color: #e2e2e5; cursor: pointer; padding: 8px 16px; transition: color 0.2s; }
  .lp-signin:hover { color: #ffb4a7; }
  .lp-nav-cta {
    background: #be2b1a; color: #ffd9d3; border: none;
    font-family: 'JetBrains Mono',monospace; font-size: 11px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 11px 22px; border-radius: 8px; cursor: pointer;
    box-shadow: 0 10px 30px rgba(190,43,26,0.25); transition: all 0.25s;
  }
  .lp-nav-cta:hover { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 14px 36px rgba(190,43,26,0.45); }

  /* ── Hero ── */
  .lp-hero { position: relative; min-height: 90vh; display: flex; align-items: center; overflow: hidden; }
  .lp-hero-bg { position: absolute; inset: 0; background: url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2083') center/cover no-repeat; }
  .lp-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(18,20,22,0.97) 38%, rgba(18,20,22,0.6) 100%); }
  .lp-hero-inner {
    position: relative; z-index: 10;
    max-width: 1280px; margin: 0 auto; padding: 80px 24px;
    width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center;
  }
  .lp-hero-left { display: flex; flex-direction: column; gap: 26px; }
  .lp-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 16px; border-radius: 9999px; align-self: flex-start;
    border: 1px solid rgba(190,43,26,0.35); background: rgba(190,43,26,0.12); backdrop-filter: blur(4px);
  }
  .lp-badge-dot { width: 7px; height: 7px; border-radius: 50%; background: #ffb4a7; animation: lp-pulse 2s ease-in-out infinite; }
  .lp-badge-text { font-family: 'JetBrains Mono',monospace; font-size: 11px; font-weight: 600; color: #ffb4a7; letter-spacing: 0.15em; text-transform: uppercase; }
  .lp-h1 { font-family: 'Plus Jakarta Sans',sans-serif; font-size: 64px; font-weight: 800; line-height: 1.08; letter-spacing: -0.04em; color: #e2e2e5; margin: 0; }
  .lp-h1-red { color: #be2b1a; }
  .lp-sub { font-size: 18px; color: #e3beb8; line-height: 1.65; max-width: 520px; margin: 0; }
  .lp-callout { border-left: 4px solid #be2b1a; padding: 8px 0 8px 20px; }
  .lp-callout-h { font-family: 'Plus Jakarta Sans',sans-serif; font-size: 18px; font-weight: 700; color: #ffd9d3; margin: 0 0 4px; line-height: 1; }
  .lp-callout-s { font-size: 14px; color: #e3beb8; margin: 0; }
  .lp-cta-row { display: flex; gap: 16px; flex-wrap: wrap; }
  .lp-btn-primary {
    background: #be2b1a; color: #ffd9d3; border: none;
    font-family: 'Plus Jakarta Sans',sans-serif; font-size: 17px; font-weight: 700;
    padding: 16px 32px; border-radius: 12px; cursor: pointer;
    box-shadow: 0 10px 30px rgba(190,43,26,0.3); transition: all 0.25s;
    display: flex; align-items: center; gap: 10px;
  }
  .lp-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 18px 44px rgba(190,43,26,0.5); filter: brightness(1.08); }
  .lp-btn-secondary {
    background: transparent; color: #c9c6c1; border: 2px solid rgba(201,198,193,0.3);
    font-family: 'Plus Jakarta Sans',sans-serif; font-size: 17px; font-weight: 700;
    padding: 16px 32px; border-radius: 12px; cursor: pointer; transition: all 0.25s;
    display: flex; align-items: center; gap: 10px;
  }
  .lp-btn-secondary:hover { background: rgba(201,198,193,0.07); border-color: rgba(201,198,193,0.6); transform: translateY(-2px); }
  .lp-chips { display: flex; gap: 10px; flex-wrap: wrap; }
  .lp-chip {
    padding: 6px 16px; border-radius: 9999px;
    border: 1px solid rgba(91,64,60,0.7); background: #1a1c1e;
    font-family: 'JetBrains Mono',monospace; font-size: 11px; font-weight: 600;
    color: #e3beb8; letter-spacing: 0.08em; text-transform: uppercase;
  }

  /* Dashboard mockup */
  .lp-mockup-wrap { position: relative; }
  .lp-mockup-glow { position: absolute; inset: -6px; background: linear-gradient(135deg, rgba(190,43,26,0.35), rgba(190,43,26,0.08)); border-radius: 22px; filter: blur(12px); opacity: 0.35; pointer-events: none; }
  .lp-mockup {
    position: relative; background: #282a2c; border: 1px solid rgba(91,64,60,0.4);
    border-radius: 20px; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.55);
    background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 20px 20px;
  }
  .lp-mbar { background: #1e2022; padding: 12px 18px; border-bottom: 1px solid rgba(91,64,60,0.3); display: flex; align-items: center; justify-content: space-between; }
  .lp-mdots { display: flex; gap: 6px; }
  .lp-mdot { width: 10px; height: 10px; border-radius: 50%; }
  .lp-mlabel { font-family: 'JetBrains Mono',monospace; font-size: 9px; color: #e3beb8; opacity: 0.45; letter-spacing: 0.12em; text-transform: uppercase; }
  .lp-mbody { padding: 20px; display: flex; flex-direction: column; gap: 18px; }
  .lp-stat-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  .lp-scard { background: #1a1c1e; border: 1px solid rgba(91,64,60,0.2); border-radius: 10px; padding: 12px; }
  .lp-scard-val { font-family: 'Plus Jakarta Sans',sans-serif; font-size: 19px; font-weight: 700; margin: 6px 0 2px; }
  .lp-scard-key { font-family: 'JetBrains Mono',monospace; font-size: 9px; font-weight: 600; color: #e3beb8; text-transform: uppercase; letter-spacing: 0.1em; }
  .lp-chart { display: flex; align-items: flex-end; gap: 6px; height: 52px; }
  .lp-bar { flex: 1; border-radius: 3px; transition: all 0.3s; }
  .lp-recent { display: flex; flex-direction: column; gap: 8px; }
  .lp-recent-item { background: #1a1c1e; border: 1px solid rgba(91,64,60,0.2); border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; }
  .lp-recent-name { font-size: 12px; color: #e2e2e5; }
  .lp-recent-right { display: flex; gap: 8px; align-items: center; }
  .lp-recent-price { font-family: 'JetBrains Mono',monospace; font-size: 12px; color: #c9c6c1; }
  .lp-badge-pill { font-family: 'JetBrains Mono',monospace; font-size: 9px; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.06em; }

  /* Features */
  .lp-features { padding: 100px 24px; max-width: 1280px; margin: 0 auto; }
  .lp-sec-label { font-family: 'JetBrains Mono',monospace; font-size: 11px; font-weight: 600; color: #ffb4a7; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 12px; display: block; }
  .lp-sec-h2 { font-family: 'Plus Jakarta Sans',sans-serif; font-size: 40px; font-weight: 700; color: #e2e2e5; margin: 0 0 60px; line-height: 1.2; }
  .lp-feat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
  .lp-feat-card {
    background: #1a1c1e; border: 1px solid rgba(91,64,60,0.4);
    border-radius: 16px; padding: 32px; position: relative; overflow: hidden;
    transition: all 0.3s; cursor: default;
  }
  .lp-feat-card::before { content: ''; position: absolute; top: 0; left: 0; width: 40px; height: 2px; background: #be2b1a; border-radius: 99px; }
  .lp-feat-card:hover { transform: translateY(-6px); border-color: rgba(190,43,26,0.4); box-shadow: 0 20px 40px rgba(190,43,26,0.12); }
  .lp-feat-icon { width: 52px; height: 52px; background: #be2b1a; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 20px; transform: rotate(45deg); }
  .lp-feat-icon > span { transform: rotate(-45deg); display: block; }
  .lp-feat-title { font-family: 'Plus Jakarta Sans',sans-serif; font-size: 20px; font-weight: 700; color: #e2e2e5; margin: 0 0 10px; }
  .lp-feat-desc { font-size: 15px; color: #e3beb8; line-height: 1.65; margin: 0 0 20px; }
  .lp-feat-list { list-style: none; padding: 0; margin: 0; border-top: 1px solid rgba(91,64,60,0.4); padding-top: 16px; display: flex; flex-direction: column; gap: 10px; }
  .lp-feat-li { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #e3beb8; }
  .lp-feat-check { width: 16px; height: 16px; border-radius: 50%; background: rgba(190,43,26,0.2); border: 1px solid rgba(190,43,26,0.6); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #ffb4a7; }

  /* Stats strip */
  .lp-stats { background: #0c0e10; border-top: 1px solid rgba(91,64,60,0.3); border-bottom: 1px solid rgba(91,64,60,0.3); padding: 56px 24px; }
  .lp-stats-inner { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: repeat(4,1fr); gap: 24px; text-align: center; }
  .lp-stat-big { font-family: 'Plus Jakarta Sans',sans-serif; font-size: 44px; font-weight: 800; color: #ffd9d3; }
  .lp-stat-lbl { font-size: 14px; color: #e3beb8; margin-top: 4px; }

  /* Footer */
  .lp-footer { background: #0c0e10; border-top: 1px solid rgba(91,64,60,0.3); padding: 72px 24px 32px; }
  .lp-footer-inner { max-width: 1280px; margin: 0 auto; }
  .lp-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 2fr; gap: 48px; margin-bottom: 48px; }
  .lp-footer-brand { font-family: 'Plus Jakarta Sans',sans-serif; font-size: 22px; font-weight: 800; color: #ffb4a7; margin-bottom: 14px; }
  .lp-footer-desc { font-size: 14px; color: #e3beb8; line-height: 1.7; max-width: 320px; margin: 0; }
  .lp-footer-col-title { font-family: 'JetBrains Mono',monospace; font-size: 11px; font-weight: 600; color: #e2e2e5; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px; }
  .lp-footer-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
  .lp-footer-links a { font-size: 14px; color: #e3beb8; text-decoration: none; transition: all 0.2s; display: block; }
  .lp-footer-links a:hover { color: #ffb4a7; padding-left: 4px; }
  .lp-fi-row { display: flex; gap: 8px; }
  .lp-fi { flex: 1; background: #1a1c1e; border: 1px solid rgba(91,64,60,0.5); border-radius: 8px; padding: 12px 14px; color: #e2e2e5; font-size: 14px; outline: none; font-family: 'Inter',sans-serif; transition: border 0.2s; }
  .lp-fi:focus { border-color: #be2b1a; }
  .lp-fi::placeholder { color: rgba(227,190,184,0.5); }
  .lp-fi-btn { background: #be2b1a; color: #ffd9d3; border: none; padding: 12px 20px; border-radius: 8px; font-family: 'JetBrains Mono',monospace; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; cursor: pointer; text-transform: uppercase; white-space: nowrap; }
  .lp-footer-bottom { border-top: 1px solid rgba(91,64,60,0.3); padding-top: 24px; display: flex; justify-content: space-between; align-items: center; }
  .lp-footer-copy { font-size: 13px; color: #e3beb8; }
  .lp-footer-badge { display: flex; align-items: center; gap: 8px; }
  .lp-footer-badge-check { width: 20px; height: 20px; border-radius: 50%; background: rgba(190,43,26,0.2); border: 1px solid rgba(190,43,26,0.6); display: flex; align-items: center; justify-content: center; font-size: 10px; color: #ffb4a7; }
  .lp-footer-badge-text { font-family: 'JetBrains Mono',monospace; font-size: 10px; color: #e3beb8; letter-spacing: 0.08em; text-transform: uppercase; }

  @keyframes lp-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

  /* Responsive */
  @media (max-width: 1024px) {
    .lp-h1 { font-size: 48px !important; }
    .lp-hero-inner { grid-template-columns: 1fr !important; }
    .lp-mockup-wrap { display: none !important; }
    .lp-feat-grid { grid-template-columns: 1fr 1fr !important; }
    .lp-stats-inner { grid-template-columns: repeat(2,1fr) !important; }
    .lp-footer-grid { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 768px) {
    .lp-nav-links { display: none !important; }
    .lp-h1 { font-size: 36px !important; }
    .lp-feat-grid { grid-template-columns: 1fr !important; }
    .lp-cta-row { flex-direction: column !important; }
    .lp-btn-primary, .lp-btn-secondary { width: 100% !important; justify-content: center !important; }
    .lp-sec-h2 { font-size: 28px !important; }
    .lp-stats-inner { grid-template-columns: 1fr 1fr !important; }
    .lp-footer-grid { grid-template-columns: 1fr !important; }
  }
`;

const FEATURES = [
  {
    icon: "🧾", title: "GST Billing in Seconds",
    desc: "Generate professional GST invoices instantly with multi-tender support — Cash + UPI + Credit — and WhatsApp delivery.",
    items: ["Instant invoice generation", "Multi-tender split billing"],
  },
  {
    icon: "📦", title: "Live Inventory Ledger",
    desc: "Every stock movement is recorded immutably. Track purchases, adjustments, and sales across all your shelves in real-time.",
    items: ["Real-time stock levels", "Automated low-stock alerts"],
  },
  {
    icon: "🤝", title: "Digital Udhaar (Credit)",
    desc: "Manage customer credit with a full party ledger. Automated WhatsApp reminders ensure you never lose track of outstanding dues.",
    items: ["Full debit/credit history", "WhatsApp payment reminders"],
  },
  {
    icon: "🔍", title: "Fitment-Guaranteed Search",
    desc: "Customers select their vehicle and see only compatible parts. Zero guesswork — fitment guaranteed by make, model & year.",
    items: ["Vehicle-specific results", "Make/model/year filter"],
  },
  {
    icon: "🏪", title: "B2C Marketplace",
    desc: "Your inventory auto-syncs to the customer marketplace. Customers compare prices across shops and order online, same day.",
    items: ["Auto-sync from ERP", "Order management panel"],
  },
  {
    icon: "🔧", title: "Workshop Job Cards",
    desc: "Create and manage vehicle service job cards, track repairs, assign staff, and bill directly from the workshop module.",
    items: ["Digital job card creation", "Staff task assignment"],
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-root" style={{ minHeight: "100vh" }}>
      <style>{CSS}</style>

      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <span className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            redpiston
          </span>
          <div className="lp-nav-links">
            <button className="lp-nav-link active">Features</button>
            <button className="lp-nav-link" onClick={() => document.getElementById("lp-stats")?.scrollIntoView({ behavior: "smooth" })}>Pricing</button>
            <button className="lp-nav-link" onClick={() => document.getElementById("lp-footer")?.scrollIntoView({ behavior: "smooth" })}>Contact</button>
          </div>
          <div className="lp-nav-right">
            <button className="lp-signin" onClick={() => navigate("/login")}>Sign In</button>
            <button className="lp-nav-cta" onClick={() => navigate("/login")}>GET STARTED FREE</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-overlay" />
        <div className="lp-hero-inner">
          {/* Left content */}
          <div className="lp-hero-left">
            <div className="lp-badge">
              <span className="lp-badge-dot" />
              <span className="lp-badge-text">REDPISTON — INDIA'S AUTO PARTS PLATFORM</span>
            </div>

            <h1 className="lp-h1">
              Run your shop.<br />
              <span className="lp-h1-red">Sell online.</span><br />
              Grow faster.
            </h1>

            <p className="lp-sub">
              The all-in-one platform for Indian auto parts shops — POS, inventory, GST, udhaar, workshop, and a B2C marketplace with fitment guarantee.
            </p>

            <div className="lp-callout">
              <p className="lp-callout-h">FIND PARTS. FAST.</p>
              <p className="lp-callout-s">Guaranteed fitment • Delivered same day</p>
            </div>

            <div className="lp-cta-row">
              <button className="lp-btn-primary" onClick={() => navigate("/login")}>
                START FOR FREE <span>→</span>
              </button>
              <button className="lp-btn-secondary" onClick={() => document.getElementById("lp-features")?.scrollIntoView({ behavior: "smooth" })}>
                See Features <span>↓</span>
              </button>
            </div>

            <div className="lp-chips">
              {["GST-READY", "FITMENT ENGINE", "UDHAAR LEDGER", "WHATSAPP ALERTS"].map(c => (
                <span key={c} className="lp-chip">{c}</span>
              ))}
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="lp-mockup-wrap">
            <div className="lp-mockup-glow" />
            <div className="lp-mockup">
              <div className="lp-mbar">
                <div className="lp-mdots">
                  <div className="lp-mdot" style={{ background: "rgba(255,180,171,0.45)" }} />
                  <div className="lp-mdot" style={{ background: "rgba(201,198,193,0.4)" }} />
                  <div className="lp-mdot" style={{ background: "rgba(190,43,26,0.55)" }} />
                </div>
                <span className="lp-mlabel">redpiston · ERP DASHBOARD</span>
              </div>
              <div className="lp-mbody">
                {/* Stats */}
                <div className="lp-stat-row">
                  {[
                    { icon: "📈", val: "₹18,450", key: "Today Revenue", color: "#ffb4a7" },
                    { icon: "📦", val: "342", key: "Stock Items", color: "#c9c6c1" },
                    { icon: "💸", val: "₹6,200", key: "Udhaar Due", color: "#ffb4ab" },
                  ].map(s => (
                    <div key={s.key} className="lp-scard">
                      <span style={{ fontSize: 14 }}>{s.icon}</span>
                      <div className="lp-scard-val" style={{ color: s.color }}>{s.val}</div>
                      <div className="lp-scard-key">{s.key}</div>
                    </div>
                  ))}
                </div>

                {/* Bar chart */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#e3beb8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Weekly Sales</span>
                    <span style={{ fontSize: 10, color: "#ffb4a7" }}>+12.5%</span>
                  </div>
                  <div className="lp-chart">
                    {[35, 55, 42, 70, 50, 82, 65].map((h, i) => (
                      <div key={i} className="lp-bar" style={{ height: `${h}%`, background: i === 5 ? "#be2b1a" : "rgba(190,43,26,0.28)" }} />
                    ))}
                  </div>
                </div>

                {/* Recent items */}
                <div className="lp-recent">
                  {[
                    { name: "Bosch Brake Pad Set", price: "₹850", badge: "SOLD", badgeBg: "rgba(190,43,26,0.2)", badgeColor: "#ffd9d3" },
                    { name: "NGK Spark Plug (x4)", price: "₹320", badge: "LOW STOCK", badgeBg: "rgba(255,180,171,0.1)", badgeColor: "#ffb4a7" },
                  ].map(item => (
                    <div key={item.name} className="lp-recent-item">
                      <span className="lp-recent-name">{item.name}</span>
                      <div className="lp-recent-right">
                        <span className="lp-recent-price">{item.price}</span>
                        <span className="lp-badge-pill" style={{ background: item.badgeBg, color: item.badgeColor }}>{item.badge}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="lp-features" className="lp-features">
        <span className="lp-sec-label">Built for Indian Shops</span>
        <h2 className="lp-sec-h2">Everything you need to run<br />your auto parts business</h2>
        <div className="lp-feat-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="lp-feat-card">
              <div className="lp-feat-icon"><span>{f.icon}</span></div>
              <h3 className="lp-feat-title">{f.title}</h3>
              <p className="lp-feat-desc">{f.desc}</p>
              <ul className="lp-feat-list">
                {f.items.map(item => (
                  <li key={item} className="lp-feat-li">
                    <span className="lp-feat-check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <div id="lp-stats" className="lp-stats">
        <div className="lp-stats-inner">
          {[
            { num: "500+", desc: "Shops on the platform" },
            { num: "₹2Cr+", desc: "Monthly transactions" },
            { num: "1.2L+", desc: "Parts in catalog" },
            { num: "99.9%", desc: "Platform uptime" },
          ].map(s => (
            <div key={s.desc}>
              <div className="lp-stat-big">{s.num}</div>
              <div className="lp-stat-lbl">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer id="lp-footer" className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-grid">
            <div>
              <div className="lp-footer-brand">RedPiston</div>
              <p className="lp-footer-desc">India's premier auto parts platform — connecting shop owners, mechanics, and customers with precision-engineered technology.</p>
            </div>
            <div>
              <div className="lp-footer-col-title">Quick Links</div>
              <ul className="lp-footer-links">
                <li><a href="#">Parts Catalog</a></li>
                <li><a href="#">Shop Dashboard</a></li>
                <li><a href="#">Workshop Module</a></li>
                <li><a href="#">About Us</a></li>
              </ul>
            </div>
            <div>
              <div className="lp-footer-col-title">Legal</div>
              <ul className="lp-footer-links">
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Shipping Policy</a></li>
              </ul>
            </div>
            <div>
              <div className="lp-footer-col-title">Stay Updated</div>
              <p style={{ fontSize: 14, color: "#e3beb8", marginBottom: 14 }}>Get early access and product news.</p>
              <div className="lp-fi-row">
                <input className="lp-fi" type="email" placeholder="your@email.com" />
                <button className="lp-fi-btn">JOIN</button>
              </div>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span className="lp-footer-copy">© 2024 RedPiston India. All rights reserved.</span>
            <div className="lp-footer-badge">
              <span className="lp-footer-badge-check">✓</span>
              <span className="lp-footer-badge-text">GST-Ready Platform</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
