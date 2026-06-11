import { useState, useContext, Children, cloneElement } from "react";
import { createPortal } from "react-dom";
import { GLOBAL_CSS } from "../theme";
import { AppCtx } from "../AppCtx";
import { Toast } from "../components/ui";
import { Avatar } from "../components/Avatar";
import { BrandHeader } from "../components/BrandHeader";

const ADMIN_TABS = [
  { key: "users",         label: "All Users",    icon: "👥" },
  { key: "verifications", label: "Verifications", icon: "✅" },
  { key: "catalog",       label: "Parts Catalog", icon: "📦" },
];

// Cream palette specific to admin UI — kept local, not in global theme
const AC = {
  bg:      "#FAF6F0",
  surface: "#FFFFFF",
  border:  "#E0D5C8",
  t1:      "#1A1205",
  t2:      "#5C4F40",
  t3:      "#9C8C7C",
  red:     "#BE2B1A",
};

interface AdminShellProps { children: import('react').ReactNode; }
export function AdminShell({ children }: AdminShellProps) {
  const { toasts, removeToast, currentUser, handleLogout } = useContext(AppCtx);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <style>{`
        .admin-header-tab {
          padding: 0 4px; height: 100%; display: flex; align-items: center;
          font-size: 13px; font-weight: 600; cursor: pointer;
          background: none; border: none; border-bottom: 2px solid transparent;
          color: ${AC.t3}; font-family: 'Inter', sans-serif;
          transition: color 0.15s, border-color 0.15s; white-space: nowrap;
          text-decoration: none;
        }
        .admin-header-tab:hover { color: ${AC.t1}; }
        .admin-header-tab.active { color: ${AC.red}; border-bottom-color: ${AC.red}; }
        .admin-signout-btn:hover { background: #FEF2F2 !important; color: ${AC.red} !important; border-color: #FECACA !important; }

        .admin-shell-content { padding-top: 60px; }

        /* ── Mobile: header collapses to 2 rows — brand+user on top, scrollable tabs below ── */
        @media (max-width: 820px) {
          .admin-topbar {
            flex-wrap: wrap !important;
            height: 100px !important;
            padding: 0 14px !important;
            align-items: flex-start !important;
          }
          .admin-brand-row { height: 56px; margin-right: auto !important; }
          .admin-brand-divider { display: none !important; }
          .admin-tabs {
            order: 3;
            flex: 0 0 100% !important;
            height: 44px !important;
            gap: 20px !important;
            overflow-x: auto;
            scrollbar-width: none;
          }
          .admin-tabs::-webkit-scrollbar { display: none; }
          .admin-user-block { height: 56px; }
          .admin-user-meta { display: none !important; }
          .admin-signout-text { display: none !important; }
          .admin-signout-btn { padding: 7px 10px !important; min-height: 36px; }
          .admin-shell-content { padding-top: 100px !important; }
        }
      `}</style>

      {/* Top header */}
      <div className="admin-topbar" style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 60, zIndex: 400,
        background: AC.surface, borderBottom: `1px solid ${AC.border}`,
        display: "flex", alignItems: "center", padding: "0 24px", gap: 0,
        fontFamily: "'Inter', sans-serif", boxShadow: "0 1px 4px rgba(26,18,5,0.06)",
      }}>
        <div className="admin-brand-row" style={{ display: "flex", alignItems: "center", marginRight: 32, flexShrink: 0 }}>
          <BrandHeader subtitle="Admin Console" logoSize={36} />
        </div>

        <div className="admin-brand-divider" style={{ width: 1, height: 28, background: AC.border, marginRight: 28, flexShrink: 0 }} />

        <nav className="admin-tabs" style={{ display: "flex", alignItems: "stretch", height: "100%", gap: 24, flex: 1 }}>
          {ADMIN_TABS.map(t => (
            <button
              key={t.key}
              className={`admin-header-tab${activeTab === t.key ? " active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>

        <div className="admin-user-block" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar user={currentUser} size={30} />
            <div className="admin-user-meta" style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: AC.t1, whiteSpace: "nowrap" }}>
                {currentUser?.name || currentUser?.email?.split("@")[0] || "Admin"}
              </div>
              <div style={{ fontSize: 10, color: AC.t3, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>Platform Admin</div>
            </div>
          </div>
          <button
            className="admin-signout-btn"
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              padding: "7px 14px", borderRadius: 7,
              border: `1.5px solid ${AC.border}`, background: AC.surface,
              cursor: "pointer", color: AC.t2, fontSize: 12, fontWeight: 700,
              fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em",
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span>⏏</span> <span className="admin-signout-text">Sign Out</span>
          </button>
        </div>
      </div>

      <div className="admin-shell-content" style={{ minHeight: "100vh", background: AC.bg }}>
        {Children.map(children, child => cloneElement(child, { activeTab, setActiveTab }))}
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && createPortal(
        <div style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(26,18,5,0.5)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: AC.surface, border: `1px solid ${AC.border}`,
            borderRadius: 14, padding: "32px 28px", maxWidth: 360, width: "90%",
            boxShadow: "0 24px 64px rgba(26,18,5,0.18)", textAlign: "center",
            fontFamily: "'Inter', sans-serif",
          }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⏏</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: AC.t1, marginBottom: 8, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>Sign out?</div>
            <div style={{ fontSize: 13, color: AC.t3, lineHeight: 1.6, marginBottom: 28 }}>
              You'll be logged out of the Admin Console.<br />Your session will be securely terminated.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: "11px", background: AC.surface, border: `1.5px solid ${AC.border}`, borderRadius: 8, color: AC.t2, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); handleLogout(); }}
                style={{ flex: 1, padding: "11px", background: AC.red, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 4px 14px rgba(190,43,26,0.3)" }}
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
