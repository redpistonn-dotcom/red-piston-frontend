/**
 * ERPShell — Stitch "Premium Industrial" exact match.
 *
 * DESIGN SPEC (from Stitch export):
 *   Sidebar  → 256px (w-64), white, fixed left-0 top-0, py-xl (24px)
 *   Brand    → /logo.png (96px wide) + "RED"(maroon) "PISTON"(black) + "Industrial Ops"
 *   Nav      → Material Symbols Outlined, active = solid #8B1E1E bg + white text, rounded-lg
 *   Topbar   → Fixed h-20 (80px), left-64, editable shop name, period pills, icon buttons
 *   Content  → ml-256px + pt-80px + px-24px + pb-24px
 *   Mobile   → bottom tab bar (CSS only via GLOBAL_CSS @media)
 */
import { useState, useContext, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { T, FONT, GLOBAL_CSS, SP, SHADOWS } from "../theme";
import { fmt } from "../utils";
import { useStore } from "../store";
import { AppCtx } from "../AppCtx";
import { api } from "../api/client.js";
import { Toast } from "../components/ui";
import { ProfileDropdown } from "../components/ProfileDropdown";
import { ProductModal } from "../components/ProductModal";
import { BulkStockInModal } from "../components/BulkStockInModal";
import { CatalogStockInModal } from "../components/CatalogStockInModal";
import { ProfileNudge } from "../components/ProfileNudge";
import { BrandHeader } from "../components/BrandHeader";
import { ImageUploader } from "../components/ImageUploader";

// ── Sidebar width constants ─────────────────────────────────────────────────
// Desktop default is a collapsed 68px icon rail; hovering expands it to 236px
// OVER the content (no layout shift) — see the .erp-sidebar rules in GLOBAL_CSS.
const SIDEBAR_W = 68;    // collapsed rail width — content/topbar offset
const TOPBAR_H  = 64;    // topbar height

// ── Nav definition — Material Symbols Outlined icon names ──────────────────
const NAV_ITEMS = [
  { key: "dashboard",   path: "/dashboard",          icon: "dashboard",      label: "Dashboard"      },
  { key: "inventory",   path: "/inventory",          icon: "inventory_2",    label: "Inventory"      },
  { key: "pos",         path: "/billing",            icon: "point_of_sale",  label: "POS Billing"    },
  { key: "parties",     path: "/parties",            icon: "groups",         label: "Parties"        },
  { key: "workshop",    path: "/workshop",           icon: "build",          label: "Job Cards"      },
  { key: "workshop-mp", path: "/workshop/marketplace", icon: "storefront",   label: "Parts Listing"  },
  { key: "history",     path: "/history",            icon: "history",        label: "History"        },
  { key: "reports",     path: "/reports",            icon: "analytics",      label: "Reports"        },
  { key: "orders",      path: "/orders",             icon: "shopping_cart",  label: "Orders"         },
] as const;

// Resolve a single active nav key: the item whose path is the LONGEST match for
// the current path. This stops a parent route (/workshop) from highlighting at
// the same time as its child (/workshop/marketplace).
function resolveActiveNavKey(currentPath: string): string | null {
  let best: { key: string; path: string } | null = null;
  for (const n of NAV_ITEMS) {
    if (currentPath === n.path || currentPath.startsWith(n.path + "/")) {
      if (!best || n.path.length > best.path.length) best = n;
    }
  }
  return best?.key ?? null;
}


// ── Helper: Material Symbols span ──────────────────────────────────────────
function MSIcon({ name, filled = false, size = 22 }: { name: string; filled?: boolean; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        fontVariationSettings: filled ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        lineHeight: 1,
        display: "inline-block",
        userSelect: "none",
      }}
    >
      {name}
    </span>
  );
}

interface ERPShellProps { children: import("react").ReactNode; }

export function ERPShell({ children }: ERPShellProps) {
  const {
    pModal, setPModal, catalogModal, setCatalogModal,
    addProdOpen, setAddProdOpen,
    toast, toasts, removeToast,
    currentUser, setCurrentUser, handleLogout,
    impersonating,
    saveProduct, handleBulkStockIn,
  } = useContext(AppCtx);

  const { products, movements, orders, shops, activeShopId, saveShops } = useStore();
  const navigate = useNavigate();
  const location = useLocation();


  // ── Mandatory shop profile completion (photo + contact number) ─────────
  const needsShopSetup = useMemo(() => {
    if (currentUser?.role !== "SHOP_OWNER") return false;
    const s = currentUser.shop;
    if (!s) return false;
    return !s.photoUrl || !s.whatsappNumber;
  }, [currentUser]);
  const [setupDone, setSetupDone] = useState(false);
  const [setupPhone, setSetupPhone] = useState("");
  const [setupPhoto, setSetupPhoto] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState("");
  // Pre-fill from existing data when modal first appears
  useEffect(() => {
    if (!needsShopSetup || setupDone) return;
    const s = currentUser?.shop;
    if (s?.whatsappNumber) setSetupPhone(s.whatsappNumber);
    if (s?.photoUrl) setSetupPhoto(s.photoUrl);
  }, [needsShopSetup, setupDone, currentUser]);

  const handleSetupSave = async () => {
    if (!setupPhone.trim()) { setSetupError("Shop contact number is required."); return; }
    if (!setupPhoto) { setSetupError("Please upload a shop photo."); return; }
    setSetupSaving(true); setSetupError("");
    try {
      await api.patch("/api/auth/me/shop", {
        whatsappNumber: setupPhone.trim(),
        photoUrl: setupPhoto.trim(),
      });
      setCurrentUser((prev: any) => ({
        ...prev,
        shop: {
          ...(prev?.shop || {}),
          photoUrl: setupPhoto.trim(),
          whatsappNumber: setupPhone.trim(),
        },
      }));
      const stored = JSON.parse(localStorage.getItem("as_user") || "{}");
      localStorage.setItem("as_user", JSON.stringify({
        ...stored,
        shop: { ...(stored.shop || {}), photoUrl: setupPhoto.trim(), whatsappNumber: setupPhone.trim() },
      }));
      setSetupDone(true);
    } catch (e: any) {
      setSetupError(e?.data?.error?.message || e?.message || "Failed to save. Please try again.");
    }
    setSetupSaving(false);
  };

  // ── Shop name (editable in topbar) ────────────────────────────────────
  const shop = useMemo(() => {
    const fromStore = (shops || []).find(s => s.id === activeShopId || s.shopId === activeShopId);
    if (fromStore) return fromStore;
    if (currentUser?.shop) return { name: currentUser.shop.name, city: currentUser.shop.city || "Location" };
    return { name: "My Shop", city: "Location" };
  }, [shops, activeShopId, currentUser]);

  const [shopNameEdit, setShopNameEdit] = useState<string | null>(null);

  const commitShopName = () => {
    if (shopNameEdit === null || shopNameEdit.trim() === "") { setShopNameEdit(null); return; }
    const updated = (shops || []).map(s =>
      (s.id === activeShopId || s.shopId === activeShopId) ? { ...s, name: shopNameEdit.trim() } : s
    );
    saveShops(updated);
    setShopNameEdit(null);
    toast("Shop name updated", "emerald");
  };

  // ── Derived counts ────────────────────────────────────────────────────
  const lowCount = useMemo(
    () => (products || []).filter(p => p.shopId === activeShopId && p.stock !== undefined && p.stock < (p.minStock || 0)).length,
    [products, activeShopId],
  );

  const pendingOrders = useMemo(
    () => (orders || []).filter(o => o.shopId === activeShopId && (o.status === "NEW" || o.status === "placed")).length,
    [orders, activeShopId],
  );

  const todayRev = useMemo(() => {
    const dayStart = Date.now() - 86400000;
    return (movements || [])
      .filter(m => m.shopId === activeShopId && m.type === "SALE" && m.date >= dayStart)
      .reduce((s, m) => s + (m.total || 0), 0);
  }, [movements, activeShopId]);

  // ── User display ──────────────────────────────────────────────────────
  const userName  = currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const currentPath = location.pathname;
  const navActiveKey = resolveActiveNavKey(currentPath);

  // ── Mobile drawer state ───────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const touchStartX = useRef(0);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [currentPath]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  // Primary nav (bottom bar): first 4 items + "More" button
  const PRIMARY_NAV = NAV_ITEMS.slice(0, 4);
  const SECONDARY_NAV = NAV_ITEMS.slice(4);

  // ── Low-stock banner dismiss ──────────────────────────────────────────
  const [lowBannerDismissed, setLowBannerDismissed] = useState(() => {
    try { return sessionStorage.getItem("vl_low_stock_dismissed") === "1"; } catch { return false; }
  });
  const dismissLowBanner = () => {
    setLowBannerDismissed(true);
    try { sessionStorage.setItem("vl_low_stock_dismissed", "1"); } catch {}
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: FONT.ui, color: T.t1 }}>
      <style>{GLOBAL_CSS}</style>

      {/* ══════════════════════════════════════════════════════════════
          SIDEBAR — white, 256px, fixed
          Stitch: aside.flex.flex-col.h-full.py-xl.bg-white.border-r.border-outline-variant.w-64.fixed.left-0.top-0.z-50
      ══════════════════════════════════════════════════════════════ */}
      <aside className="erp-sidebar" style={{
        position: "fixed", left: 0, top: 0, bottom: 0,
        width: SIDEBAR_W, zIndex: 600,
        background: "#FFFFFF",
        borderRight: `1px solid ${T.border}`,
        boxShadow: "2px 0 16px rgba(28,27,27,0.06)",
        display: "flex", flexDirection: "column",
        padding: `${SP.xl}px 0`,   // py-xl = 24px top+bottom
        overflow: "hidden",        // clip labels while collapsed
      }}>

        {/* ── BRAND (logo + wordmark) ───────────────────────────────────
            Stitch: flex items-center gap-md mb-huge px-md
            Logo: w-24 (96px) h-auto ml-md
            "RED" = maroon #8B1E1E, "PISTON" = #000000, bold 18px uppercase
            "Industrial Ops" = 12px, on-surface-variant, opacity-70
        ─────────────────────────────────────────────────────────── */}
        <div className="sidebar-brand" style={{
          marginBottom: 28,
          paddingLeft: 14,
          paddingRight: 14,
          flexShrink: 0,
        }}>
          <BrandHeader subtitle="Industrial Ops" logoSize={40} textClassName="sb-fade" />
        </div>

        {/* ── NAVIGATION ────────────────────────────────────────────────
            Stitch: active = bg-maroon-brand text-white rounded-lg p-md
                    inactive = text-on-surface-variant hover:bg-surface-container-high rounded-lg p-md
        ─────────────────────────────────────────────────────────── */}
        <nav style={{
          flex: 1, overflowY: "auto",
          padding: "0 8px",
          display: "flex", flexDirection: "column", gap: 1,
        }}>
          {NAV_ITEMS.map(n => {
            const isActive = n.key === navActiveKey;
            return (
              <button
                key={n.key}
                onClick={() => navigate(n.path)}
                className={`nav-item${isActive ? " active" : ""}`}
                title={n.label}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center",
                  gap: 12,
                  padding: "9px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: isActive ? "#8B1E1E" : "transparent",
                  color: isActive ? "#FFFFFF" : T.t2,
                  cursor: "pointer",
                  textAlign: "left",
                  outline: "none",
                  transition: "background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease",
                  boxShadow: isActive ? "0 2px 8px rgba(139,30,30,0.30)" : "none",
                  position: "relative",
                }}
              >
                {/* Material Symbol icon — FILL 1 when active */}
                <MSIcon name={n.icon} filled={isActive} size={20} />

                {/* Label — fades in when the rail expands */}
                <span className="sb-fade" style={{
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  fontFamily: FONT.ui, flex: 1,
                  letterSpacing: "0.01em", whiteSpace: "nowrap",
                }}>{n.label}</span>

                {/* Badge — orders pending */}
                {n.key === "orders" && pendingOrders > 0 && (
                  <span className="sb-fade" style={{
                    background: isActive ? "rgba(255,255,255,0.25)" : T.crimson,
                    color: "#fff",
                    fontSize: 10, borderRadius: 10, padding: "1px 6px",
                    fontWeight: 700, letterSpacing: "0.02em", flexShrink: 0,
                  }}>{pendingOrders}</span>
                )}
                {/* Badge — low stock */}
                {n.key === "inventory" && lowCount > 0 && (
                  <span className="sb-fade" style={{
                    background: isActive ? "rgba(255,255,255,0.25)" : "#8B1E1E",
                    color: "#fff",
                    fontSize: 10, borderRadius: 10, padding: "1px 6px",
                    fontWeight: 700, flexShrink: 0,
                  }}>{lowCount}</span>
                )}
                {/* Collapsed-state alert dot — visible only while the rail is closed */}
                {((n.key === "orders" && pendingOrders > 0) || (n.key === "inventory" && lowCount > 0)) && (
                  <span className="sb-dot" style={{
                    position: "absolute", top: 7, left: 26,
                    width: 7, height: 7, borderRadius: "50%",
                    background: T.crimson, border: "1.5px solid #fff",
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Today's Revenue mini card ────────────────────────────────── */}
        {todayRev > 0 && (
          <div className="sb-fade" style={{
            margin: `0 ${SP.sm}px ${SP.sm}px`,
            padding: `${SP.sm}px ${SP.md}px`,
            background: "rgba(22,163,74,0.06)",
            border: "1px solid rgba(22,163,74,0.15)",
            borderRadius: 10,
            display: "flex", alignItems: "center", gap: 8,
            flexShrink: 0,
          }}>
            <MSIcon name="trending_up" filled size={16} />
            <div>
              <div style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 1 }}>Today's Revenue</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.emerald, fontFamily: FONT.mono }}>{fmt(todayRev)}</div>
            </div>
          </div>
        )}

        {/* ── USER FOOTER ───────────────────────────────────────────────
            Stitch: avatar (initials circle) + name + SHOP OWNER role + Logout button
        ─────────────────────────────────────────────────────────── */}
        <div className="sidebar-user-section" style={{
          borderTop: `1px solid ${T.border}`,
          padding: `${SP.md}px ${SP.sm}px 0`,
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: SP.sm,
        }}>
          {/* Avatar circle — maroon initials */}
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "#8B1E1E",
            border: "2px solid rgba(139,30,30,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 13, fontWeight: 700,
            flexShrink: 0, overflow: "hidden",
          }}>
            {currentUser?.photoURL
              ? <img src={currentUser.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : userInitials}
          </div>

          {/* Name + role */}
          <div className="sb-fade" style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: T.t1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: FONT.ui,
            }}>{userName}</div>
            <div style={{ fontSize: 11, color: T.t3, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>SHOP OWNER</div>
          </div>

          {/* Logout button — maroon border (Stitch style) */}
          <button
            className="sb-fade"
            onClick={handleLogout}
            title="Logout"
            style={{
              background: "transparent",
              border: `1px solid #8B1E1E`,
              borderRadius: 8,
              padding: "5px 8px",
              cursor: "pointer",
              color: "#8B1E1E",
              display: "flex", alignItems: "center",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#8B1E1E"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#8B1E1E"; }}
          >
            <MSIcon name="logout" size={18} />
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE SLIDE-IN DRAWER
      ══════════════════════════════════════════════════════════════ */}
      {/* Overlay */}
      <div
        className={`rp-drawer-overlay${drawerOpen ? " open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />
      {/* Drawer panel */}
      <div className={`rp-drawer${drawerOpen ? " open" : ""}`}>
        {/* Drawer header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 20px 16px",
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <BrandHeader subtitle="Industrial Ops" logoSize={34} />
          <button onClick={() => setDrawerOpen(false)} style={{
            width: 36, height: 36, borderRadius: 8,
            background: T.bg, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: T.t2, flexShrink: 0,
          }}>
            <MSIcon name="close" size={20} />
          </button>
        </div>

        {/* Drawer nav — all 8 items */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
          {NAV_ITEMS.map(n => {
            const isActive = n.key === navActiveKey;
            return (
              <button
                key={n.key}
                onClick={() => { navigate(n.path); setDrawerOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14,
                  padding: "13px 16px", borderRadius: 10, border: "none",
                  background: isActive ? "#8B1E1E" : "transparent",
                  color: isActive ? "#FFFFFF" : T.t2,
                  cursor: "pointer", marginBottom: 2,
                  boxShadow: isActive ? "0 2px 8px rgba(139,30,30,0.28)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <MSIcon name={n.icon} filled={isActive} size={22} />
                <span style={{ fontSize: 15, fontWeight: isActive ? 600 : 400, fontFamily: FONT.ui }}>
                  {n.label}
                </span>
                {n.key === "orders" && pendingOrders > 0 && (
                  <span style={{ marginLeft: "auto", background: isActive ? "rgba(255,255,255,0.25)" : T.crimson, color: "#fff", fontSize: 10, borderRadius: 10, padding: "2px 7px", fontWeight: 700 }}>{pendingOrders}</span>
                )}
                {n.key === "inventory" && lowCount > 0 && (
                  <span style={{ marginLeft: "auto", background: isActive ? "rgba(255,255,255,0.25)" : "#8B1E1E", color: "#fff", fontSize: 10, borderRadius: 10, padding: "2px 7px", fontWeight: 700 }}>{lowCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Drawer user section */}
        <div style={{
          borderTop: `1px solid ${T.border}`,
          padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: "#8B1E1E",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}>
            {currentUser?.photoURL
              ? <img src={currentUser.photoURL} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              : userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
            <div style={{ fontSize: 11, color: T.t3 }}>Shop Owner</div>
          </div>
          <button onClick={handleLogout} style={{
            background: "transparent", border: `1px solid #8B1E1E`, borderRadius: 8,
            padding: "7px 10px", cursor: "pointer", color: "#8B1E1E",
            display: "flex", alignItems: "center",
          }}>
            <MSIcon name="logout" size={18} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TOPBAR — fixed, left: SIDEBAR_W on desktop, left:0 on mobile
      ══════════════════════════════════════════════════════════════ */}
      <header className="erp-topbar" style={{
        position: "fixed",
        top: 0, right: 0, left: SIDEBAR_W,
        height: TOPBAR_H,
        background: "#FFFFFF",
        borderBottom: `1px solid ${T.border}`,
        boxShadow: "0 2px 12px rgba(28,27,27,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
        zIndex: 500,
        gap: 12,
      }}>
        {/* ── LEFT: page title + contextual badges ────────────────────── */}
        {(() => {
          // Derive page title from current path
          const PAGE_TITLES: Record<string, string> = {
            "/dashboard":  "Dashboard",
            "/inventory":  "Inventory Management",
            "/pos":        "Point of Sale",
            "/billing":    "POS Billing",
            "/parties":    "Parties",
            "/workshop":   "Workshop",
            "/analytics":  "Analytics",
            "/purchases":  "Purchase Orders",
            "/history":    "History",
            "/reports":    "Reports Dashboard",
            "/orders":     "Orders Pipeline",
            "/settings":   "Settings",
          };
          const baseRoute = "/" + (currentPath.split("/")[1] || "dashboard");
          const pageTitle = PAGE_TITLES[baseRoute] || shop.name;
          return (
            <div style={{ display: "flex", alignItems: "center", gap: SP.sm, minWidth: 0, flex: 1 }}>
              {/* Hamburger — mobile only */}
              <button
                className="rp-mobile-flex"
                onClick={() => setDrawerOpen(true)}
                style={{
                  width: 40, height: 40, borderRadius: 10, border: "none",
                  background: "transparent", cursor: "pointer", color: T.t2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MSIcon name="menu" size={22} />
              </button>
              <h1 style={{
                fontSize: 17, fontWeight: 700, color: T.t1,
                fontFamily: FONT.display,
                margin: 0, letterSpacing: "-0.02em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 320,
              }}>{pageTitle}</h1>

              {/* Sync Status badge — inventory only */}
              {currentPath === "/inventory" && (
                <span style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: T.emeraldBg,
                  border: "1px solid rgba(22,163,74,0.2)",
                  borderRadius: 99, padding: "3px 10px",
                  fontSize: 11, fontWeight: 600, color: T.emerald,
                  fontFamily: FONT.ui, flexShrink: 0,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.emerald, display: "inline-block" }} />
                  Sync Status: Active
                </span>
              )}

              {/* Low stock warning chip */}
              {lowCount > 0 && currentPath !== "/inventory" && (
                <button
                  onClick={() => navigate("/inventory")}
                  style={{
                    background: "rgba(186,26,26,0.06)", border: `1px solid rgba(186,26,26,0.25)`,
                    borderRadius: 99, padding: "3px 12px",
                    fontSize: 11, color: T.crimson, fontWeight: 600,
                    cursor: "pointer", fontFamily: FONT.ui,
                    display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                  }}
                >
                  <MSIcon name="warning" filled size={13} />
                  {lowCount} low stock
                </button>
              )}
            </div>
          );
        })()}

        {/* ── RIGHT: action icons (period pills only on dashboard) ──── */}
        <div style={{ display: "flex", alignItems: "center", gap: SP.sm, flexShrink: 0 }}>
          {/* Period pills removed — DashboardPage owns its own period state */}

          {/* Add stock icon button */}
          <button
            onClick={() => setCatalogModal(true)}
            title="Add stock"
            aria-label="Add stock"
            className="topbar-icon-btn"
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: "#8B1E1E", border: "none",
              color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#6A020A"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#8B1E1E"; }}
          >
            <MSIcon name="add" size={20} />
          </button>

          {/* POS billing icon button */}
          <button
            onClick={() => navigate("/billing")}
            title="POS Billing"
            aria-label="POS Billing"
            className="topbar-icon-btn"
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: "transparent",
              border: `1px solid ${T.border}`,
              color: T.t2, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#8B1E1E"; (e.currentTarget as HTMLButtonElement).style.color = "#8B1E1E"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t2; }}
          >
            <MSIcon name="point_of_sale" size={20} />
          </button>

          {/* Avatar / ProfileDropdown */}
          <ProfileDropdown user={currentUser} onLogout={handleLogout} />
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════
          LOW STOCK ALERT BANNER (below topbar)
      ══════════════════════════════════════════════════════════════ */}
      {lowCount > 0 && !lowBannerDismissed && (
        <div
          data-print-hide
          className="erp-banner"
          style={{
            position: "fixed",
            top: TOPBAR_H, right: 0, left: SIDEBAR_W,
            background: "rgba(139,30,30,0.04)",
            borderBottom: `1px solid rgba(139,30,30,0.15)`,
            padding: `${SP.sm}px ${SP.xl}px`,
            display: "flex", alignItems: "center", gap: SP.md,
            zIndex: 490,
            animation: "fadeDown 0.25s ease both",
          }}
        >
          <MSIcon name="inventory" filled size={16} />
          <span style={{ fontSize: 13, color: "#8B1E1E", fontWeight: 600, flex: 1 }}>
            {lowCount} product{lowCount > 1 ? "s" : ""} below reorder level
          </span>
          <button
            onClick={() => navigate("/inventory")}
            style={{
              background: "#8B1E1E", color: "#fff", border: "none",
              borderRadius: 8, padding: "4px 14px",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui,
            }}
          >View Inventory</button>
          <button
            onClick={dismissLowBanner}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: T.t3, fontSize: 20, padding: "0 4px", lineHeight: 1,
              display: "flex", alignItems: "center",
            }}
          >×</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PAGE CONTENT — offset for fixed sidebar + topbar
      ══════════════════════════════════════════════════════════════ */}
      <main
        className={`erp-content page-in${lowCount > 0 && !lowBannerDismissed ? " has-banner" : ""}`}
        style={{
          marginLeft: SIDEBAR_W,
          paddingTop: TOPBAR_H + (lowCount > 0 && !lowBannerDismissed ? 40 : 0) + SP.xl,
          paddingBottom: SP.xl,
          paddingLeft: SP.xl,
          paddingRight: SP.xl,
          minHeight: "100vh",
        }}
      >
        <ProfileNudge />
        {children}
      </main>

      {/* ══════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════ */}
      <ProductModal
        open={pModal.open}
        product={pModal.product}
        products={products}
        activeShopId={activeShopId}
        onClose={() => setPModal({ open: false, product: null })}
        onSave={saveProduct}
        toast={toast}
      />
      <CatalogStockInModal
        open={addProdOpen}
        onClose={() => setAddProdOpen(false)}
        onSave={saveProduct}
        toast={toast}
        activeShopId={activeShopId}
      />
      <BulkStockInModal
        open={catalogModal}
        onClose={() => setCatalogModal(false)}
        onSave={handleBulkStockIn}
        toast={toast}
        activeShopId={activeShopId}
      />
      {/* ══════════════════════════════════════════════════════════════
          MOBILE BOTTOM NAVIGATION BAR
          Shows 4 primary items + "More" drawer trigger
      ══════════════════════════════════════════════════════════════ */}
      <nav className="rp-bottom-nav rp-safe-bottom">
        {PRIMARY_NAV.map(n => {
          const isActive = n.key === navActiveKey;
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
              {/* Active indicator pill — sits above the label, below the icon */}
              {isActive && (
                <span style={{
                  position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)",
                  width: 16, height: 3, borderRadius: 2, background: "#8B1E1E",
                }} />
              )}
              <MSIcon name={n.icon} filled={isActive} size={22} />
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, lineHeight: 1 }}>{n.label}</span>
              {/* Badge */}
              {n.key === "inventory" && lowCount > 0 && (
                <span style={{
                  position: "absolute", top: 4, right: "calc(50% - 18px)",
                  background: "#8B1E1E", color: "#fff",
                  fontSize: 9, borderRadius: 8, padding: "1px 5px", fontWeight: 700,
                }}>{lowCount}</span>
              )}
            </button>
          );
        })}
        {/* "More" button to open drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="More navigation items"
          style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 3,
            border: "none", background: "transparent", cursor: "pointer",
            color: SECONDARY_NAV.some(n => n.key === navActiveKey) ? "#8B1E1E" : T.t3,
            fontFamily: FONT.ui, transition: "color 0.15s",
            padding: "6px 4px", position: "relative",
          }}
        >
          <MSIcon name="more_horiz" size={22} />
          <span style={{ fontSize: 10, fontWeight: 400, lineHeight: 1 }}>More</span>
          {(pendingOrders > 0 || SECONDARY_NAV.some(n => n.key === "orders" && pendingOrders > 0)) && (
            <span style={{
              position: "absolute", top: 4, right: "calc(50% - 18px)",
              background: T.crimson, color: "#fff",
              fontSize: 9, borderRadius: 8, padding: "1px 5px", fontWeight: 700,
            }}>{pendingOrders}</span>
          )}
        </button>
      </nav>

      <Toast items={toasts} onRemove={removeToast} />

      {/* ── Shop setup nudge modal ────────────────────────────────────────
          Prompts shop owners to add photo + contact; dismissible via X.
          Hidden during admin impersonation so admins can browse freely. */}
      {needsShopSetup && !setupDone && !impersonating && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, padding: "36px 32px",
            width: "100%", maxWidth: 480, fontFamily: FONT.ui,
            boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "#8B1E1E18", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 22 }}>🏪</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.3px" }}>
                  Complete Your Shop Profile
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  Customers need these to reach and recognise your shop
                </div>
              </div>
              <button
                onClick={() => setSetupDone(true)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "1.5px solid #E5E7EB",
                  background: "#F9FAFB", cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 18,
                  color: "#6b7280", flexShrink: 0, lineHeight: 1,
                }}
                title="Close"
              >×</button>
            </div>

            <div style={{
              background: "#FEF3C7", border: "1px solid #F59E0B40", borderRadius: 10,
              padding: "10px 14px", fontSize: 13, color: "#92400E", marginBottom: 24, marginTop: 16,
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <span>⚠️</span>
              <span>Your shop is missing a <strong>contact number</strong> and/or <strong>shop photo</strong>. Add them so customers can reach and recognise your shop.</span>
            </div>

            {setupError && (
              <div style={{
                background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8,
                padding: "9px 12px", fontSize: 13, color: "#991B1B", marginBottom: 16,
              }}>{setupError}</div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                Shop Photo <span style={{ color: "#8B1E1E" }}>*</span>
              </label>
              <ImageUploader
                folder="shops"
                currentUrl={setupPhoto || null}
                onUploaded={(url) => { setSetupPhoto(url); setSetupError(""); }}
                onError={(msg) => setSetupError(msg)}
                label="Upload Shop Photo"
                maxMb={5}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                Shop Contact Number <span style={{ color: "#8B1E1E" }}>*</span>
              </label>
              <input
                style={{
                  width: "100%", background: "#F9FAFB", border: "1.5px solid #E5E7EB",
                  borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#111827",
                  outline: "none", boxSizing: "border-box", fontFamily: FONT.ui,
                }}
                placeholder="+91 XXXXX XXXXX"
                value={setupPhone}
                onChange={e => setSetupPhone(e.target.value)}
              />
            </div>

            <button
              onClick={handleSetupSave}
              disabled={setupSaving}
              style={{
                width: "100%", padding: "13px 0", background: setupSaving ? "#9ca3af" : "#8B1E1E",
                color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
                cursor: setupSaving ? "not-allowed" : "pointer", fontFamily: FONT.ui,
                transition: "background 0.15s",
              }}
            >
              {setupSaving ? "Saving…" : "Complete Setup & Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
