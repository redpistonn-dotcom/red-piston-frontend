import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { T, FONT, GLOBAL_CSS } from "../theme";
import { AppCtx } from "../AppCtx";
import { Toast } from "../components/ui";
import { CartDrawer } from "../marketplace/components/CartDrawer";

const MP_NAV = [
  { key: "home",   path: "/marketplace",         icon: "🏠", label: "Home",    color: "#10B981" },
  { key: "orders", path: "/marketplace/orders",  icon: "📦", label: "Orders",  color: "#0EA5E9" },
  { key: "pricing",path: "/marketplace/pricing", icon: "💎", label: "Pricing", color: "#D97706" },
];

interface MPShellProps { children: import('react').ReactNode; }
export function MPShell({ children }: MPShellProps) {
  const { toasts, removeToast } = useContext(AppCtx);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="mp-content" style={{ paddingLeft: 68 }}>{children}</div>
      <CartDrawer onCheckout={() => navigate("/marketplace/checkout")} />

      <div className="mp-sidebar" style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 68, zIndex: 400,
        background: `${T.surface}f0`, backdropFilter: "blur(16px)",
        borderRight: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: 14, gap: 3,
      }}>
        <div className="sidebar-brand" style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${T.amber}, ${T.amberDim})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, boxShadow: `0 2px 12px ${T.amber}44`, marginBottom: 6,
        }}>
          ⚙️
        </div>
        <div className="sidebar-brand" style={{ fontSize: 7, color: T.amber, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Market
        </div>

        {MP_NAV.map((a) => {
          const isActive = currentPath === a.path || currentPath.startsWith(a.path + "/");
          return (
            <button
              key={a.key}
              onClick={() => navigate(a.path)}
              title={a.label}
              style={{
                width: 64, height: 56, borderRadius: 10, border: "none", cursor: "pointer",
                background: isActive ? `${a.color}18` : "transparent",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4, transition: "background 0.15s", padding: "4px 0",
                position: "relative", outline: "none",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${a.color}0d`; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              {isActive && (
                <span style={{
                  position: "absolute", left: -5, top: "50%", transform: "translateY(-50%)",
                  width: 3, height: 20, borderRadius: 3, background: a.color,
                }} />
              )}
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: isActive ? a.color : T.t3,
                fontFamily: FONT.ui, letterSpacing: "0.02em", transition: "color 0.15s",
              }}>
                {a.label}
              </span>
            </button>
          );
        })}
        <div className="sidebar-spacer" style={{ flex: 1 }} />
      </div>

      <Toast items={toasts} onRemove={removeToast} />
    </>
  );
}
