/**
 * MechanicShell — Mobile-first shell for the mechanic app.
 * Desktop layout: top nav bar + content. Mobile: bottom tab bar.
 * Completely separate from ERPShell — mechanics have no ERP access.
 */
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { T, FONT } from "../theme";
import { useStore } from "../store";
import { ProfileDropdown } from "../components/ProfileDropdown";

const TABS = [
  { key: "dashboard", path: "/mechanic",           icon: "dashboard",     label: "Dashboard" },
  { key: "jobs",      path: "/mechanic/jobs",      icon: "build_circle",  label: "My Jobs"   },
  { key: "customers", path: "/mechanic/customers", icon: "people",        label: "Customers" },
  { key: "profile",   path: "/mechanic/profile",   icon: "person",        label: "Profile"   },
] as const;

function MSIcon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, lineHeight: 1, display: "inline-block", userSelect: "none" }}
    >
      {name}
    </span>
  );
}

export default function MechanicShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useStore();

  const activeKey = TABS.find(t =>
    t.path === "/mechanic"
      ? location.pathname === "/mechanic"
      : location.pathname.startsWith(t.path)
  )?.key ?? "dashboard";

  return (
    <>
      <style>{`
        .mech-shell { min-height: 100dvh; background: ${T.bg}; font-family: ${FONT.ui}; }

        /* ── Topbar ──────────────────────────────────────────── */
        .mech-topbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          height: 56px; background: ${T.surface}; border-bottom: 1px solid ${T.border};
          display: flex; align-items: center; padding: 0 16px; gap: 12px;
        }
        .mech-brand { font-family: ${FONT.display}; font-weight: 800; font-size: 15px; flex: 1; }
        .mech-brand span:first-child { color: ${T.amber}; }
        .mech-brand span:last-child  { color: ${T.t1}; }

        /* ── Content ─────────────────────────────────────────── */
        .mech-content {
          padding-top: 56px;
          padding-bottom: 72px; /* room for bottom tabs on mobile */
          min-height: 100dvh;
        }

        /* ── Bottom tab bar (mobile) ─────────────────────────── */
        .mech-tabs {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          height: 64px; background: ${T.surface}; border-top: 1px solid ${T.border};
          display: flex;
        }
        .mech-tab {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 3px; cursor: pointer;
          border: none; background: transparent; padding: 0;
          color: ${T.t3}; font-family: ${FONT.ui}; font-size: 10px; font-weight: 500;
          transition: color 0.15s;
        }
        .mech-tab.active { color: ${T.amber}; }

        /* ── Desktop: show sidebar instead of bottom tabs ──── */
        @media (min-width: 768px) {
          .mech-tabs { display: none; }
          .mech-content { padding-bottom: 24px; max-width: 900px; margin: 0 auto; }
        }
      `}</style>

      <div className="mech-shell">
        {/* Top bar */}
        <header className="mech-topbar">
          <div className="mech-brand">
            <span>RED</span><span>PISTON</span>
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

        {/* Bottom tab bar */}
        <nav className="mech-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`mech-tab${activeKey === tab.key ? " active" : ""}`}
              onClick={() => navigate(tab.path)}
            >
              <MSIcon name={tab.icon} size={22} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
