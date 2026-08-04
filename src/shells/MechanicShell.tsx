/**
 * MechanicShell — mobile-first shell for the mechanic app.
 * Mobile (<768px): fixed topbar + bottom tab bar.
 * Desktop (>=768px): collapsible icon-rail sidebar, same GLOBAL_CSS classes
 * and visual pattern as ERPShell's (.erp-sidebar / .sb-fade / .rp-bottom-nav)
 * so the two apps read as one product, not two.
 * Completely separate from ERPShell — mechanics have no ERP access.
 */
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { T, FONT, GLOBAL_CSS } from "../theme";
import { useStore } from "../store";
import { ProfileDropdown } from "../components/ProfileDropdown";
import { BrandHeader } from "../components/BrandHeader";

const SIDEBAR_W = 68; // collapsed rail width — matches ERPShell's SIDEBAR_W

const NAV_ITEMS = [
  { key: "dashboard", path: "/mechanic",           icon: "dashboard",     label: "Dashboard" },
  { key: "jobs",      path: "/mechanic/jobs",      icon: "build_circle",  label: "My Jobs"   },
  { key: "customers", path: "/mechanic/customers", icon: "people",        label: "Customers" },
  { key: "suppliers", path: "/mechanic/suppliers", icon: "local_shipping", label: "Suppliers" },
  { key: "profile",   path: "/mechanic/profile",   icon: "person",        label: "Profile"   },
] as const;

function MSIcon({ name, filled = false, size = 22 }: { name: string; filled?: boolean; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        fontVariationSettings: filled ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        lineHeight: 1, display: "inline-block", userSelect: "none",
      }}
    >
      {name}
    </span>
  );
}

export default function MechanicShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useStore();

  const activeKey = NAV_ITEMS.find(t =>
    t.path === "/mechanic"
      ? location.pathname === "/mechanic"
      : location.pathname.startsWith(t.path)
  )?.key ?? "dashboard";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: FONT.ui, color: T.t1 }}>
      <style>{GLOBAL_CSS}</style>
      <style>{`
        .mech-topbar {
          position: fixed; top: 0; right: 0; left: 0; z-index: 500;
          height: 56px; background: #FFFFFF; border-bottom: 1px solid ${T.border};
          box-shadow: 0 2px 12px rgba(28,27,27,0.05);
          display: flex; align-items: center; padding: 0 16px; gap: 12px;
        }
        .mech-content { padding-top: 56px; padding-bottom: 76px; min-height: 100vh; }
        @media (min-width: 768px) {
          .mech-topbar  { left: ${SIDEBAR_W}px; }
          .mech-content { margin-left: ${SIDEBAR_W}px; padding-bottom: 24px; max-width: 900px; }
        }
      `}</style>

      {/* Desktop sidebar — reuses ERPShell's collapsible-rail CSS (.erp-sidebar,
          .sb-fade) so it hovers open 68px -> 236px exactly like the shop-owner app. */}
      <aside className="erp-sidebar" style={{
        position: "fixed", left: 0, top: 0, bottom: 0,
        width: SIDEBAR_W, zIndex: 600,
        background: "#FFFFFF",
        borderRight: `1px solid ${T.border}`,
        boxShadow: "2px 0 16px rgba(28,27,27,0.06)",
        display: "flex", flexDirection: "column",
        padding: "24px 0", overflow: "hidden",
      }}>
        <div className="sidebar-brand" style={{ marginBottom: 28, paddingLeft: 14, paddingRight: 14, flexShrink: 0 }}>
          <BrandHeader subtitle="Mechanic" logoSize={40} textClassName="sb-fade" />
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "0 8px", display: "flex", flexDirection: "column", gap: 1 }}>
          {NAV_ITEMS.map(n => {
            const isActive = n.key === activeKey;
            return (
              <button
                key={n.key}
                onClick={() => navigate(n.path)}
                className={`nav-item${isActive ? " active" : ""}`}
                title={n.label}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "9px 14px", borderRadius: 8, border: "none",
                  background: isActive ? "#8B1E1E" : "transparent",
                  color: isActive ? "#FFFFFF" : T.t2,
                  cursor: "pointer", textAlign: "left", outline: "none",
                  transition: "background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease",
                  boxShadow: isActive ? "0 2px 8px rgba(139,30,30,0.30)" : "none",
                }}
              >
                <MSIcon name={n.icon} filled={isActive} size={20} />
                <span className="sb-fade" style={{
                  fontSize: 13, fontWeight: isActive ? 600 : 400, fontFamily: FONT.ui,
                  flex: 1, letterSpacing: "0.01em", whiteSpace: "nowrap",
                }}>{n.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Topbar */}
      <header className="mech-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 15 }}>
            <span style={{ color: T.amber }}>RED</span><span style={{ color: T.t1 }}>PISTON</span>
          </span>
        </div>
        <span style={{ fontSize: 13, color: T.t3, fontWeight: 500 }}>
          {currentUser?.name || "Mechanic"}
        </span>
        <ProfileDropdown />
      </header>

      {/* Page content */}
      <main className="mech-content">
        <Outlet />
      </main>

      {/* Mobile bottom nav — same .rp-bottom-nav class + active-pill pattern as ERPShell */}
      <nav className="rp-bottom-nav rp-safe-bottom">
        {NAV_ITEMS.map(n => {
          const isActive = n.key === activeKey;
          return (
            <button
              key={n.key}
              onClick={() => navigate(n.path)}
              aria-label={n.label}
              aria-current={isActive ? "page" : undefined}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 3,
                border: "none", background: "transparent", cursor: "pointer",
                color: isActive ? "#8B1E1E" : T.t3,
                fontFamily: FONT.ui, transition: "color 0.15s",
                padding: "6px 4px", position: "relative",
              }}
            >
              {isActive && (
                <span style={{
                  position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)",
                  width: 16, height: 3, borderRadius: 2, background: "#8B1E1E",
                }} />
              )}
              <MSIcon name={n.icon} filled={isActive} size={22} />
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, lineHeight: 1 }}>{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
