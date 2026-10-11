import { useState, useContext, Children, cloneElement, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { GLOBAL_CSS } from "../theme";
import { AppCtx } from "../AppCtx";
import { Toast } from "../components/ui";
import { Avatar } from "../components/Avatar";

// ── Icon SVGs (no external dependency) ──────────────────────────────────────
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);
const IconPackage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconRefresh = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <polyline points="23 20 23 14 17 14"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
);
const IconActivity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconLogOut = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "users",          label: "All Users",       Icon: IconUsers    },
  { key: "verifications",  label: "Verifications",   Icon: IconShield   },
  { key: "catalog",        label: "Parts Catalog",   Icon: IconPackage  },
  { key: "autodukan",      label: "Autodukan",       Icon: IconRefresh  },
  { key: "system-monitor", label: "System Monitor",  Icon: IconActivity },
];

// ── Design tokens (admin-specific) ────────────────────────────────────────────
const AC = {
  // Sidebar
  sidebarBg:     "#111318",
  sidebarBorder: "#1F2229",
  sidebarHover:  "#1A1D24",
  sidebarActive: "#1E2230",
  // Text on sidebar
  navText:       "#8B95A8",
  navActive:     "#FFFFFF",
  // Brand accent
  accent:        "#C0392B",
  accentGlow:    "rgba(192,57,43,0.3)",
  accentSoft:    "rgba(192,57,43,0.12)",
  // Content area
  bg:            "#F4F6FA",
  surface:       "#FFFFFF",
  border:        "#E2E7EF",
  borderLight:   "#EDF0F5",
  // Text
  t1:            "#0D1117",
  t2:            "#3D4A5C",
  t3:            "#7A8699",
  t4:            "#B0BAC8",
};

const SIDEBAR_W = 228;

interface AdminShellProps { children: import('react').ReactNode; }
export function AdminShell({ children }: AdminShellProps) {
  const { toasts, removeToast, currentUser, handleLogout } = useContext(AppCtx);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile overlay

  const displayName = currentUser?.name || currentUser?.email?.split("@")[0] || "Admin";
  const displayEmail = currentUser?.email || "";

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <style>{`
        /* ── Sidebar nav item ── */
        .adn-item {
          display: flex; align-items: center; gap: 11px;
          padding: 10px 14px 10px 18px;
          border-radius: 10px; margin: 1px 10px;
          cursor: pointer; font-size: 13px; font-weight: 500;
          color: ${AC.navText}; background: transparent;
          border: none; text-align: left; width: calc(100% - 20px);
          transition: color 0.15s, background 0.15s;
          font-family: 'Inter', sans-serif;
          text-decoration: none; white-space: nowrap;
        }
        .adn-item:hover { background: ${AC.sidebarHover}; color: #E0E5EE; }
        .adn-item.active {
          background: ${AC.sidebarActive};
          color: ${AC.navActive};
          box-shadow: inset 3px 0 0 ${AC.accent};
        }
        .adn-item.active svg { stroke: ${AC.accent}; }
        .adn-badge {
          margin-left: auto; min-width: 18px; height: 18px;
          background: ${AC.accent}; color: #fff;
          border-radius: 20px; font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          padding: 0 5px; line-height: 1;
        }

        /* ── Mobile hamburger + overlay ── */
        .adn-hamburger {
          display: none;
          position: fixed; top: 14px; left: 14px; z-index: 600;
          width: 38px; height: 38px;
          background: ${AC.surface}; border: 1px solid ${AC.border};
          border-radius: 9px; cursor: pointer;
          align-items: center; justify-content: center;
          flex-direction: column; gap: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .adn-hamburger span {
          display: block; width: 18px; height: 2px;
          background: ${AC.t1}; border-radius: 2px; transition: all 0.2s;
        }
        .adn-overlay {
          display: none; position: fixed; inset: 0; z-index: 500;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(2px);
        }

        /* ── Sidebar scroll ── */
        .adn-sidebar {
          scrollbar-width: thin;
          scrollbar-color: ${AC.sidebarHover} transparent;
        }
        .adn-sidebar::-webkit-scrollbar { width: 4px; }
        .adn-sidebar::-webkit-scrollbar-track { background: transparent; }
        .adn-sidebar::-webkit-scrollbar-thumb { background: ${AC.sidebarHover}; border-radius: 4px; }

        /* ── Content scroll restoration ── */
        .adn-content { min-height: 100vh; background: ${AC.bg}; }

        /* ── Signout button hover ── */
        .adn-signout:hover { background: rgba(192,57,43,0.12) !important; color: ${AC.accent} !important; }

        /* ── Mobile breakpoint ── */
        @media (max-width: 860px) {
          .adn-hamburger { display: flex !important; }
          .adn-sidebar-fixed {
            transform: translateX(-${SIDEBAR_W}px) !important;
            transition: transform 0.25s ease !important;
            box-shadow: none !important;
          }
          .adn-sidebar-fixed.open {
            transform: translateX(0) !important;
            box-shadow: 4px 0 40px rgba(0,0,0,0.25) !important;
          }
          .adn-overlay.open { display: block !important; }
          .adn-content { margin-left: 0 !important; }
          .adn-content-inner { padding: 64px 16px 40px !important; }
        }
      `}</style>

      {/* ── Mobile hamburger ── */}
      <button className="adn-hamburger" onClick={() => setSidebarOpen(v => !v)}>
        <span />
        <span />
        <span />
      </button>

      {/* ── Mobile overlay ── */}
      <div
        className={`adn-overlay${sidebarOpen ? " open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      <aside
        className={`adn-sidebar adn-sidebar-fixed${sidebarOpen ? " open" : ""}`}
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0,
          width: SIDEBAR_W,
          background: AC.sidebarBg,
          borderRight: `1px solid ${AC.sidebarBorder}`,
          display: "flex", flexDirection: "column",
          zIndex: 550, overflow: "hidden",
        }}
      >
        {/* ── Brand ── */}
        <div style={{
          padding: "22px 20px 18px",
          borderBottom: `1px solid ${AC.sidebarBorder}`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: `linear-gradient(135deg, ${AC.accent} 0%, #8B1A1A 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: 18,
              boxShadow: `0 0 20px ${AC.accentGlow}`,
            }}>
              🔧
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em", fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
                Red Piston
              </div>
              <div style={{ fontSize: 9, color: AC.navText, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Inter',sans-serif", marginTop: 1 }}>
                Admin Console
              </div>
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: AC.navText, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 20px 10px", fontFamily: "'Inter',sans-serif", opacity: 0.6 }}>
            Management
          </div>
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`adn-item${activeTab === key ? " active" : ""}`}
              onClick={() => { setActiveTab(key); setSidebarOpen(false); }}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* ── User block ── */}
        <div style={{
          borderTop: `1px solid ${AC.sidebarBorder}`,
          padding: "16px 14px 20px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Avatar user={currentUser} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Inter',sans-serif" }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10, color: AC.navText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Inter',sans-serif" }}>
                {displayEmail}
              </div>
            </div>
          </div>
          <button
            className="adn-signout"
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: 7, padding: "9px 14px", borderRadius: 9,
              border: `1px solid ${AC.sidebarBorder}`,
              background: "transparent", color: AC.navText,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Inter',sans-serif", letterSpacing: "0.02em",
              transition: "all 0.15s",
            }}
          >
            <IconLogOut />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ══ CONTENT ══════════════════════════════════════════════════════════ */}
      <div className="adn-content" style={{ marginLeft: SIDEBAR_W }}>
        <div className="adn-content-inner" style={{ padding: "32px 32px 48px", maxWidth: 1380, margin: "0 auto" }}>
          {Children.map(children, child =>
            cloneElement(child as ReactElement<any>, { activeTab, setActiveTab })
          )}
        </div>
      </div>

      {/* ══ LOGOUT MODAL ═════════════════════════════════════════════════════ */}
      {showLogoutConfirm && createPortal(
        <div style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: AC.surface,
            border: `1px solid ${AC.border}`,
            borderRadius: 18, padding: "36px 32px", maxWidth: 360, width: "90%",
            boxShadow: "0 32px 80px rgba(0,0,0,0.2)",
            textAlign: "center",
            fontFamily: "'Inter', sans-serif",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 22,
            }}>
              <IconLogOut />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: AC.t1, marginBottom: 10, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
              Sign out?
            </div>
            <div style={{ fontSize: 13, color: AC.t3, lineHeight: 1.65, marginBottom: 28 }}>
              You'll be logged out of the Admin Console.<br />Your session will be securely terminated.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: "12px", background: AC.surface,
                  border: `1.5px solid ${AC.border}`, borderRadius: 10,
                  color: AC.t2, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Inter',sans-serif", transition: "all 0.15s",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                style={{
                  flex: 1, padding: "12px",
                  background: AC.accent,
                  border: "none", borderRadius: 10,
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Inter',sans-serif",
                  boxShadow: `0 6px 20px ${AC.accentGlow}`,
                  transition: "all 0.15s",
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <Toast items={toasts} onRemove={removeToast} />
    </>
  );
}
