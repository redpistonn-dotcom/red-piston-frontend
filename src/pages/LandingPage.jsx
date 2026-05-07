import { useNavigate } from "react-router-dom";
import { T, FONT } from "../theme";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#000000", fontFamily: FONT.ui, color: T.t1, overflowX: "hidden" }}>
      {/* Navbar */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 48px", borderBottom: `1px solid #1A1A1A`, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `linear-gradient(135deg, #FF1F3A, #B9001B)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            color: "#fff", fontWeight: 900, boxShadow: `0 4px 20px rgba(255, 31, 58, 0.4)`
          }}>RP</div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "0.06em", color: "#FFFFFF" }}>RED PISTON</div>
        </div>
        <button
          onClick={() => navigate("/login")}
          style={{ 
            background: "#FF1F3A", color: "#FFFFFF", border: "none", padding: "12px 28px", 
            borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui,
            boxShadow: "0 4px 16px rgba(255, 31, 58, 0.3)", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)"
          }}
          className="btn-landing-primary"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(255, 31, 58, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(255, 31, 58, 0.3)";
          }}
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <div style={{ padding: "120px 24px 80px", textAlign: "center", maxWidth: 1000, margin: "0 auto", position: "relative" }}>
        {/* Background glow effect */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(255,31,58,0.15) 0%, rgba(0,0,0,0) 70%)", zIndex: 0, pointerEvents: "none" }} />
        
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.1, marginBottom: 32, letterSpacing: "-0.03em", color: "#FFFFFF" }}>
            The Ultimate Platform for <br />
            <span style={{ 
              background: "linear-gradient(135deg, #FF4D64, #FF1F3A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>Auto Parts Management</span>
          </h1>
          <p style={{ fontSize: 22, color: "#A3A3A3", marginBottom: 48, lineHeight: 1.6, maxWidth: 760, margin: "0 auto 48px", fontWeight: 500 }}>
            Red Piston connects shop owners, mechanics, and customers. 
            Manage inventory, handle POS billing, and guarantee vehicle-specific fitments with ease.
          </p>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/login")}
              style={{ 
                background: "#FF1F3A", color: "#fff", border: "none", padding: "18px 40px", 
                borderRadius: 12, fontSize: 18, fontWeight: 800, cursor: "pointer", 
                boxShadow: "0 8px 32px rgba(255, 31, 58, 0.4)", fontFamily: FONT.ui,
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) scale(1.05)";
                e.currentTarget.style.boxShadow = "0 16px 40px rgba(255, 31, 58, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(255, 31, 58, 0.4)";
              }}
            >
              Get Started Now
            </button>
            <button
              onClick={() => navigate("/login")}
              style={{ 
                background: "#111", color: "#FFF", border: "2px solid #333", 
                padding: "18px 40px", borderRadius: 12, fontSize: 18, fontWeight: 800, 
                cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#222";
                e.currentTarget.style.borderColor = "#FF1F3A";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#111";
                e.currentTarget.style.borderColor = "#333";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Explore Features
            </button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ padding: "60px 24px 100px", maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32, position: "relative", zIndex: 1 }}>
        {[
          { icon: "🧾", title: "Smart POS Billing", desc: "Generate professional GST invoices instantly with multi-tender support and WhatsApp integration." },
          { icon: "📦", title: "Live Inventory", desc: "Track stock levels across multiple locations in real-time with automated low-stock alerts." },
          { icon: "🤝", title: "Digital Khata", desc: "Manage customer credit seamlessly with automated payment reminders and ledger tracking." },
        ].map((f, i) => (
          <div key={i} 
            style={{ 
              background: "#0A0A0A", padding: 40, borderRadius: 20, 
              border: "1px solid #1F1F1F", transition: "all 0.3s ease",
              cursor: "default"
            }} 
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.borderColor = "#FF1F3A";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(255, 31, 58, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "#1F1F1F";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 24, display: "inline-block", padding: 16, background: "#111", borderRadius: 16 }}>{f.icon}</div>
            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16, color: "#FFF" }}>{f.title}</h3>
            <p style={{ color: "#888", lineHeight: 1.6, fontSize: 16 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
