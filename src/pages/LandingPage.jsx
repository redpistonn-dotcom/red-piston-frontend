import { useNavigate } from "react-router-dom";
import { T, FONT } from "../theme";

const LANDING_CSS = `
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
  .landing-page-root { overflow-x: hidden; }

  /* ── Navbar ── */
  .landing-nav {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 48px; height: 72px;
    border-bottom: 1px solid #1A1A1A;
    background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 100;
  }
  .landing-logo-mark {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, #FF1F3A, #B9001B);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; color: #fff; font-weight: 900;
    box-shadow: 0 4px 20px rgba(255,31,58,0.4); flex-shrink: 0;
  }
  .landing-logo-name { font-size: 24px; font-weight: 900; letter-spacing: 0.06em; color: #FFF; }
  .landing-nav-cta {
    background: #FF1F3A; color: #FFF; border: none;
    padding: 11px 26px; border-radius: 8px;
    font-size: 15px; font-weight: 700; cursor: pointer;
    box-shadow: 0 4px 16px rgba(255,31,58,0.3);
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    white-space: nowrap;
  }
  .landing-nav-cta:hover { transform: translateY(-2px) scale(1.04); box-shadow: 0 8px 24px rgba(255,31,58,0.5); }

  /* ── Hero ── */
  .landing-hero-section {
    padding: 110px 24px 72px; text-align: center;
    max-width: 1020px; margin: 0 auto; position: relative;
  }
  .landing-hero-glow {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 640px; height: 640px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,31,58,0.14) 0%, rgba(0,0,0,0) 70%);
    z-index: 0; pointer-events: none;
  }
  .landing-hero-inner { position: relative; z-index: 1; }
  .landing-hero-h1 {
    font-size: 72px; font-weight: 900; line-height: 1.1;
    margin-bottom: 28px; letter-spacing: -0.03em; color: #FFF;
  }
  .landing-hero-gradient {
    background: linear-gradient(135deg, #FF4D64, #FF1F3A);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .landing-hero-sub {
    font-size: 22px; color: #A3A3A3; line-height: 1.6;
    max-width: 760px; margin: 0 auto 44px; font-weight: 500;
  }
  .landing-cta-wrap { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; }
  .landing-btn-primary {
    background: #FF1F3A; color: #fff; border: none;
    padding: 18px 40px; border-radius: 12px;
    font-size: 18px; font-weight: 800; cursor: pointer;
    box-shadow: 0 8px 32px rgba(255,31,58,0.4);
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
  }
  .landing-btn-primary:hover { transform: translateY(-4px) scale(1.04); box-shadow: 0 16px 40px rgba(255,31,58,0.6); }
  .landing-btn-secondary {
    background: #111; color: #FFF; border: 2px solid #333;
    padding: 18px 40px; border-radius: 12px;
    font-size: 18px; font-weight: 800; cursor: pointer;
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
  }
  .landing-btn-secondary:hover { background: #222; border-color: #FF1F3A; transform: translateY(-4px); }

  /* ── Features Grid ── */
  .landing-features-grid {
    padding: 60px 24px 100px; max-width: 1200px; margin: 0 auto;
    display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 28px; position: relative; z-index: 1;
  }
  .landing-feature-card {
    background: #0A0A0A; padding: 40px; border-radius: 20px;
    border: 1px solid #1F1F1F; transition: all 0.3s ease; cursor: default;
  }
  .landing-feature-card:hover {
    transform: translateY(-8px);
    border-color: #FF1F3A;
    box-shadow: 0 12px 30px rgba(255,31,58,0.1);
  }
  .landing-feature-icon { font-size: 48px; margin-bottom: 24px; display: inline-block; padding: 16px; background: #111; border-radius: 16px; }
  .landing-feature-title { font-size: 24px; font-weight: 800; margin-bottom: 16px; color: #FFF; }
  .landing-feature-desc { color: #888; line-height: 1.6; font-size: 16px; }

  /* ══════════════════════════════════
     TABLET (≤1024px)
  ══════════════════════════════════ */
  @media (max-width: 1024px) {
    .landing-hero-h1 { font-size: 54px !important; }
    .landing-hero-sub { font-size: 18px !important; }
    .landing-nav { padding: 0 28px !important; }
    .landing-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }

  /* ══════════════════════════════════
     MOBILE (≤768px)
  ══════════════════════════════════ */
  @media (max-width: 768px) {
    .landing-nav { padding: 0 16px !important; height: 60px !important; }
    .landing-logo-name { font-size: 18px !important; letter-spacing: 0.03em !important; }
    .landing-logo-mark { width: 36px !important; height: 36px !important; font-size: 16px !important; }
    .landing-nav-cta { padding: 9px 18px !important; font-size: 13px !important; }

    .landing-hero-section { padding: 64px 20px 52px !important; }
    .landing-hero-h1 { font-size: 36px !important; margin-bottom: 18px !important; letter-spacing: -0.015em !important; }
    .landing-hero-sub { font-size: 16px !important; margin-bottom: 32px !important; }
    .landing-hero-glow { width: 320px !important; height: 320px !important; }

    .landing-cta-wrap { flex-direction: column !important; align-items: center !important; gap: 12px !important; width: 100% !important; }
    .landing-btn-primary, .landing-btn-secondary {
      width: 100% !important; max-width: 320px !important;
      padding: 15px 28px !important; font-size: 16px !important;
    }

    .landing-features-grid { grid-template-columns: 1fr !important; gap: 16px !important; padding: 36px 16px 56px !important; }
    .landing-feature-card { padding: 28px !important; }
    .landing-feature-icon { font-size: 36px !important; padding: 12px !important; margin-bottom: 16px !important; }
    .landing-feature-title { font-size: 20px !important; margin-bottom: 10px !important; }
    .landing-feature-desc { font-size: 14px !important; }
  }

  /* ══════════════════════════════════
     SMALL PHONE (≤480px)
  ══════════════════════════════════ */
  @media (max-width: 480px) {
    .landing-hero-h1 { font-size: 28px !important; }
    .landing-hero-sub { font-size: 14px !important; }
    .landing-logo-name { display: none !important; }
  }
`;

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page-root" style={{ minHeight: "100vh", background: "#000000", fontFamily: FONT.ui, color: T.t1 }}>
      <style>{LANDING_CSS}</style>

      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="landing-logo-mark">RP</div>
          <div className="landing-logo-name">RED PISTON</div>
        </div>
        <button className="landing-nav-cta" onClick={() => navigate("/login")}>
          Sign In
        </button>
      </nav>

      {/* ── Hero Section ── */}
      <div className="landing-hero-section">
        <div className="landing-hero-glow" />
        <div className="landing-hero-inner">
          <h1 className="landing-hero-h1">
            The Ultimate Platform for <br />
            <span className="landing-hero-gradient">Auto Parts Management</span>
          </h1>
          <p className="landing-hero-sub">
            Red Piston connects shop owners, mechanics, and customers.
            Manage inventory, handle POS billing, and guarantee vehicle-specific fitments with ease.
          </p>
          <div className="landing-cta-wrap">
            <button className="landing-btn-primary" onClick={() => navigate("/login")}>
              Get Started Now
            </button>
            <button className="landing-btn-secondary" onClick={() => navigate("/login")}>
              Explore Features
            </button>
          </div>
        </div>
      </div>

      {/* ── Features Grid ── */}
      <div className="landing-features-grid">
        {[
          { icon: "🧾", title: "Smart POS Billing", desc: "Generate professional GST invoices instantly with multi-tender support and WhatsApp integration." },
          { icon: "📦", title: "Live Inventory", desc: "Track stock levels across multiple locations in real-time with automated low-stock alerts." },
          { icon: "🤝", title: "Digital Khata", desc: "Manage customer credit seamlessly with automated payment reminders and ledger tracking." },
        ].map((f, i) => (
          <div key={i} className="landing-feature-card">
            <div className="landing-feature-icon">{f.icon}</div>
            <h3 className="landing-feature-title">{f.title}</h3>
            <p className="landing-feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
