/**
 * App.jsx — root orchestrator.
 *
 * WHAT LIVES HERE:
 *   - Auth state + token lifecycle (login, logout, impersonation, refresh)
 *   - Business handlers (handleSale, handlePurchase, etc.)
 *   - AppCtx.Provider — shells and pages consume this via useContext(AppCtx)
 *   - Route tree — clean, no prop drilling; pages pull data via useStore()
 *
 * WHAT MOVED OUT:
 *   - ERPShell   → src/shells/ERPShell.jsx
 *   - MPShell    → src/shells/MPShell.jsx
 *   - AdminShell → src/shells/AdminShell.jsx
 *
 * WHY: App.jsx was 1,330 lines. Shell components are 400+ lines of layout code
 * that had nothing to do with auth or routing. Splitting them makes each file
 * single-purpose and independently navigable.
 */
import { useState, useCallback, useEffect, Component, useMemo, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { LoadingBar } from "./components/LoadingBar";
import { T, FONT, GLOBAL_CSS } from "./theme";
import { fmt, uid } from "./utils";
import { useStore } from "./store";
import { useToast } from "./components/ui";
import { setTokens, clearTokens, getAccessToken, silentRefresh, api } from "./api/client.js";
import { syncInvoice, syncPurchase, syncAdjustment } from "./api/sync.js";
import { ShortcutOverlay } from "./components/ShortcutOverlay";
import { CommandPalette } from "./components/CommandPalette";
import { getDefaultRoute, getUserRole } from "./components/routes";
import { Avatar } from "./components/Avatar";
import { AppCtx } from "./AppCtx.js";

// Shells — each manages its own chrome (sidebar, topbar, modals)
import { ERPShell } from "./shells/ERPShell";
import { MPShell }  from "./shells/MPShell";
import { AdminShell } from "./shells/AdminShell";

// ── Lazy-loaded pages (each becomes its own JS chunk) ─────────────────────────
const LandingPage       = lazy(() => import("./pages/LandingPage").then(m => ({ default: m.LandingPage })));
const LoginPage         = lazy(() => import("./pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ProfilePage       = lazy(() => import("./pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const SettingsPage      = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));

const DashboardPage  = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const InventoryPage  = lazy(() => import("./pages/InventoryPage").then(m => ({ default: m.InventoryPage })));
const POSBillingPage = lazy(() => import("./pages/POSBillingPage").then(m => ({ default: m.POSBillingPage })));
const HistoryPage    = lazy(() => import("./pages/HistoryPage").then(m => ({ default: m.HistoryPage })));
const ReportsPage    = lazy(() => import("./pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const OrdersPage     = lazy(() => import("./pages/OrdersPage").then(m => ({ default: m.OrdersPage })));
const PartiesPage    = lazy(() => import("./pages/PartiesPage").then(m => ({ default: m.PartiesPage })));
const WorkshopPage   = lazy(() => import("./pages/WorkshopPage").then(m => ({ default: m.WorkshopPage })));
const PricingPage    = lazy(() => import("./pages/PricingPage").then(m => ({ default: m.PricingPage })));

const MarketplaceHome    = lazy(() => import("./marketplace/pages/MarketplaceHome").then(m => ({ default: m.MarketplaceHome })));
// New marketplace + cart pages (Stitch design)
const MarketplacePage    = lazy(() => import("./pages/MarketplacePage").then(m => ({ default: m.MarketplacePage })));
const CartPage           = lazy(() => import("./pages/CartPage").then(m => ({ default: m.CartPage })));
const SavedItemsPage     = lazy(() => import("./pages/SavedItemsPage").then(m => ({ default: m.SavedItemsPage })));
const SuppliersPage      = lazy(() => import("./pages/SuppliersPage").then(m => ({ default: m.SuppliersPage })));
const ProductDetailsPage = lazy(() => import("./marketplace/pages/ProductDetailsPage").then(m => ({ default: m.ProductDetailsPage })));
const CheckoutPage       = lazy(() => import("./marketplace/pages/CheckoutPage").then(m => ({ default: m.CheckoutPage })));
const OrderTrackingPage  = lazy(() => import("./marketplace/pages/OrderTrackingPage").then(m => ({ default: m.OrderTrackingPage })));
const AdminPage          = lazy(() => import("./marketplace/pages/AdminPage").then(m => ({ default: m.AdminPage })));
const SuperAdminPage     = lazy(() => import("./pages/SuperAdminPage").then(m => ({ default: m.SuperAdminPage })));

// ── Page skeleton shown while a lazy chunk downloads ──────────────────────────
const PageLoader = () => (
  <div style={{ padding: "28px 32px", fontFamily: FONT.ui }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
      <div className="skeleton-shimmer" style={{ width: 40, height: 40, borderRadius: 10 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton-shimmer" style={{ height: 16, width: "30%", borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ height: 11, width: "18%", borderRadius: 6 }} />
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
      {[1,2,3,4].map(i => <div key={i} className="skeleton-shimmer" style={{ height: 80, borderRadius: 12 }} />)}
    </div>
    <div className="skeleton-shimmer" style={{ height: 220, borderRadius: 12, marginBottom: 14 }} />
    <div className="skeleton-shimmer" style={{ height: 120, borderRadius: 12 }} />
  </div>
);

// ── Error boundary — catches render errors in the subtree ─────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("[ErrorBoundary]", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.ui }}>
          <div style={{ textAlign: "center", maxWidth: 420, padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.t1, marginBottom: 8 }}>Something went wrong</div>
            <div style={{ fontSize: 14, color: T.t3, marginBottom: 24, lineHeight: 1.6 }}>{this.state.error?.message || "An unexpected error occurred."}</div>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{ background: T.amber, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Routes /profile and /settings need a shell that matches the user's role ───
function AuthenticatedShell({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  const r = getUserRole(user);
  if (r === "SHOP_OWNER" || r === "SHOP_STAFF") return <ERPShell>{children}</ERPShell>;
  if (r === "CUSTOMER") return <MPShell>{children}</MPShell>;
  return <>{children}</>;
}

// ── Role gate helper — used inline in routes ──────────────────────────────────
function requireRole(user, role, element) {
  if (getUserRole(user) === role) return element;
  return <Navigate to={user ? getDefaultRoute(user) : "/login"} replace />;
}

// ========== MAIN APP COMPONENT ==========
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Auth state ───────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("as_user");
      if (stored) {
        const user = JSON.parse(stored);
        const rt = localStorage.getItem("as_refresh_token");
        if (rt) setTokens(null, rt);
        return user;
      }
    } catch {}
    return null;
  });

  // tokenReady: true once silentRefresh has resolved (or is skipped).
  // The UI no longer waits for this — localStorage data shows immediately.
  // tokenReady gates syncFromAPI so we don't fire it before we have a token.
  const [tokenReady, setTokenReady] = useState(() => {
    // If there's already an access token in memory (e.g. login just happened)
    // or no stored user at all, we're ready right away.
    try { return !localStorage.getItem("as_user") || !!getAccessToken(); } catch { return true; }
  });

  // ── Startup: restore access token from refresh token (page reload) ───────────
  useEffect(() => {
    if (!localStorage.getItem("as_user")) return;
    if (getAccessToken()) { setTokenReady(true); return; } // already have token
    const restore = async () => {
      try {
        const impToken = sessionStorage.getItem('as_imp_token');
        if (impToken) { setTokens(impToken, null); return; }
        // Race against 6s so a cold-start backend doesn't block sync forever.
        // The first 401 from any API call will trigger a retry via the interceptor.
        await Promise.race([
          silentRefresh(),
          new Promise(resolve => setTimeout(() => resolve(null), 6000)),
        ]);
      } catch (err) {
        if (err?.code === 'SESSION_EXPIRED') {
          clearTokens();
          try { localStorage.removeItem("as_user"); localStorage.removeItem("as_refresh_token"); } catch {}
          setCurrentUser(null);
        }
      } finally {
        setTokenReady(true);
      }
    };
    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Global session-expired event (fired by api/client.js) ────────────────────
  useEffect(() => {
    const handler = () => {
      clearTokens();
      try { localStorage.removeItem("as_user"); localStorage.removeItem("as_refresh_token"); } catch {}
      setCurrentUser(null);
      window.location.replace("/login");
    };
    window.addEventListener("auth:session-expired", handler);
    return () => window.removeEventListener("auth:session-expired", handler);
  }, []);

  // ── Proactive token refresh every 7.5 hours ───────────────────────────────────
  // Only end the session if the refresh token was actually rejected — a transient
  // network failure (e.g. backend cold start) must never log the user out; the
  // request-level interceptor will retry the refresh on the next API call anyway.
  useEffect(() => {
    if (!currentUser) return;
    const id = setInterval(async () => {
      try {
        await silentRefresh();
      } catch {}
    }, 7.5 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [currentUser]);

  // ── Prevent stale BFCache after logout ────────────────────────────────────────
  useEffect(() => {
    const handlePageShow = (e) => {
      if (e.persisted && !localStorage.getItem("as_user")) window.location.reload();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // ── Store ────────────────────────────────────────────────────────────────────
  const {
    products, movements, orders, shops, parties, vehicles, jobCards,
    saveProducts, saveMovements, saveOrders, saveShops, saveParties, saveVehicles, saveJobCards,
    auditLog, receipts, saveReceipts,
    loaded, activeShopId, setActiveShopId, persistShopId, logAudit, resetAll, clearStore, syncFromAPI,
  } = useStore();

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [pModal,        setPModal]        = useState({ open: false, product: null });
  const [catalogModal,  setCatalogModal]  = useState(false);
  const [addProdOpen,   setAddProdOpen]   = useState(false);
  const [shortcutOverlay, setShortcutOverlay] = useState(false);
  const [cmdPaletteOpen,  setCmdPaletteOpen]  = useState(false);
  const [impersonating, setImpersonating] = useState(() => {
    try { const s = localStorage.getItem('as_impersonating'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const { items: toasts, add: toast, remove: removeToast } = useToast();

  // ── Route persistence — save & restore current path across page refreshes ────
  // WHY: On refresh, auth loading guards (authReady=false / loaded=false) temporarily
  // prevent routes from rendering. If requireRole fires a redirect during that window,
  // the user ends up on their default route instead of where they were.
  // Saving path to sessionStorage and restoring after auth+store are ready fixes this.
  // NOTE: must live AFTER useStore() so `loaded` is already declared (avoids TDZ error).

  // Save path on every navigation when user is logged in
  useEffect(() => {
    if (!currentUser) return;
    const SKIP = ['/', '/login', '/reset-password'];
    if (!SKIP.includes(location.pathname)) {
      try { sessionStorage.setItem('rp_last_path', location.pathname + location.search); } catch {}
    }
  }, [location.pathname, location.search, currentUser]);

  // After both token + store are ready, navigate to the saved path (once per page load)
  const [routeRestored, setRouteRestored] = useState(false);
  useEffect(() => {
    if (!tokenReady || !loaded || routeRestored) return;
    setRouteRestored(true);
    if (!currentUser) return;
    try {
      const saved = sessionStorage.getItem('rp_last_path');
      const SKIP = ['/', '/login', '/reset-password'];
      if (saved && !SKIP.includes(saved) && saved !== location.pathname) {
        navigate(saved, { replace: true });
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenReady, loaded]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "n": case "p": e.preventDefault(); navigate("/billing"); break;
          case "i": e.preventDefault(); navigate("/inventory"); break;
          case "h": e.preventDefault(); navigate("/history"); break;
          case "k": e.preventDefault(); setCmdPaletteOpen(true); break;
          case "b":
            e.preventDefault();
            document.querySelector('[data-barcode-input]')?.focus();
            break;
          default: break;
        }
        return;
      }
      if (e.key === "?" && !isInput) setShortcutOverlay(true);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigate]);

  // ── Auth handlers ─────────────────────────────────────────────────────────────
  const handleLogin = useCallback((user) => {
    // Clear stale inventory/movement data from any previous session so a fresh
    // shop owner never sees another shop's products or leftover dev seed data.
    // clearStore() wipes vl_products, vl_movements, vl_parties, etc. from both
    // state and localStorage. We then re-set the new user's shopId immediately.
    clearStore();
    setCurrentUser(user);
    try { localStorage.setItem("as_user", JSON.stringify(user)); } catch {}
    if (user?.shopId) {
      setActiveShopId(user.shopId);
      try { localStorage.setItem("vl_shopId", String(user.shopId)); } catch {}
    }
    navigate(getDefaultRoute(user), { replace: true });
  }, [navigate, setActiveShopId, clearStore]);

  useEffect(() => {
    if (!currentUser || !tokenReady) return;
    // setTimeout(50) lets the first paint finish before hitting the network.
    // Previously used requestIdleCallback({timeout:1200}) which could delay up to 1.2s.
    const t = setTimeout(
      () => syncFromAPI().catch((err) => console.warn("[App] Post-login sync failed:", err)),
      50,
    );
    return () => clearTimeout(t);
  }, [currentUser, tokenReady, syncFromAPI]);

  const handleLogout = useCallback(() => {
    const rt = localStorage.getItem("as_refresh_token");
    // Fire-and-forget: revoke the refresh token on the server (non-blocking)
    api.post("/api/auth/logout", { refreshToken: rt }).catch((err) => {
      console.warn("[Auth] Logout revoke failed (non-critical):", err?.message);
    });
    clearTokens();
    clearStore();
    localStorage.removeItem("as_user");
    localStorage.removeItem("as_refresh_token");
    localStorage.removeItem("as_impersonating");
    try {
      sessionStorage.removeItem("as_imp_token");
      sessionStorage.removeItem("vl_low_stock_dismissed");
    } catch {}
    setCurrentUser(null);
    window.location.replace("/login");
  }, [clearStore]);

  const handleImpersonate = useCallback((targetUser, impersonationToken) => {
    const adminBackup = { user: currentUser, refreshToken: localStorage.getItem('as_refresh_token') };
    setTokens(impersonationToken, null);
    setCurrentUser(targetUser);
    localStorage.setItem('as_user', JSON.stringify(targetUser));
    setImpersonating(adminBackup);
    localStorage.setItem('as_impersonating', JSON.stringify(adminBackup));
    try { sessionStorage.setItem('as_imp_token', impersonationToken); } catch {}
    if (targetUser.shopId) {
      setActiveShopId(targetUser.shopId);
      try { localStorage.setItem('vl_shopId', targetUser.shopId); } catch {}
    }
    navigate(getDefaultRoute(targetUser), { replace: true });
  }, [currentUser, navigate, setActiveShopId]);

  const handleExitImpersonation = useCallback(async () => {
    if (!impersonating) return;
    localStorage.removeItem('as_impersonating');
    try { sessionStorage.removeItem('as_imp_token'); } catch {}
    try {
      if (impersonating.refreshToken) localStorage.setItem('as_refresh_token', impersonating.refreshToken);
      const res = await api.post('/api/auth/refresh', { refreshToken: impersonating.refreshToken });
      setTokens(res.accessToken || res.data?.accessToken, res.refreshToken);
    } catch (err) {
      console.warn("[Auth] Could not restore admin token after impersonation:", err?.message);
    }
    setCurrentUser(impersonating.user);
    localStorage.setItem('as_user', JSON.stringify(impersonating.user));
    setImpersonating(null);
    navigate('/admin', { replace: true });
  }, [impersonating, navigate]);

  // ── Business handlers ─────────────────────────────────────────────────────────
  // WHY here: these write to the store AND sync to the backend. They need both
  // useStore() state and access to the toast notifier. Pages get them via AppCtx.

  const saveProduct = useCallback((p) => {
    if (!products) return false;
    if (p.sku) {
      const dup = products.find(x => x.id !== p.id && x.shopId === p.shopId && x.sku === p.sku);
      if (dup) { toast?.(`SKU "${p.sku}" already used by "${dup.name}". Please use a unique SKU.`, "warning"); return false; }
    }
    const exists = products.find((x) => x.id === p.id);
    saveProducts(exists ? products.map((x) => (x.id === p.id ? p : x)) : [...products, p]);
    logAudit(exists ? "PRODUCT_UPDATED" : "PRODUCT_CREATED", "product", p.id, `${p.name} (${p.sku})`);
    return true;
  }, [products, saveProducts, logAudit, toast]);

  const handleBulkStockIn = useCallback(({ products: newProds = [], movements: newMovs = [] }) => {
    if (!products) return;
    let updated = [...products];
    for (const p of newProds) {
      const fixed = { ...p, shopId: activeShopId };
      const idx = updated.findIndex((x) => x.id === fixed.id);
      if (idx >= 0) updated[idx] = { ...updated[idx], ...fixed }; else updated.push(fixed);
    }
    saveProducts(updated);
    const batchId = "STKIN-" + Date.now();
    let movRows;
    if (newMovs.length > 0) {
      movRows = newMovs.map((m) => ({
        id: "m" + (m.movementId || m.id || String(Date.now() + Math.random())),
        shopId: activeShopId, productId: m.inventoryId, productName: m.partName || "",
        type: m.type || "PURCHASE", qty: Number(m.qty) || 0, unitPrice: Number(m.unitPrice) || 0,
        sellingPrice: 0, total: Number(m.totalAmount) || 0, gstAmount: 0, profit: null,
        supplier: m.supplier || m.supplierName || null, supplierName: m.supplierName || m.supplier || null,
        invoiceNo: m.invoiceNo || null, batchId: m.invoiceNo ? null : batchId,
        payment: m.paymentMode || null, paymentMode: m.paymentMode || null, paymentStatus: "paid",
        note: m.notes || "Bulk stock-in",
        date: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
      }));
    } else {
      movRows = newProds.filter((p) => (p.stock || 0) > 0).map((p) => ({
        id: "m" + (p.id || String(Date.now() + Math.random())),
        shopId: activeShopId, productId: p.id || p.inventoryId, productName: p.name || "",
        type: "PURCHASE", qty: p.stock || 0, unitPrice: p.buyPrice || 0,
        sellingPrice: p.sellPrice || 0, total: (p.buyPrice || 0) * (p.stock || 0),
        gstAmount: 0, profit: null, supplier: null, supplierName: null, invoiceNo: null,
        batchId, payment: "Cash", paymentMode: "Cash", paymentStatus: "paid",
        note: "Bulk stock-in", date: Date.now(),
      }));
    }
    if (movRows.length > 0) saveMovements([...(movements || []), ...movRows]);
    logAudit("BULK_STOCK_IN", "inventory", activeShopId, `${newProds.length} product(s) stocked in`);
  }, [products, movements, saveProducts, saveMovements, activeShopId, logAudit]);

  const handleSale = useCallback((data) => {
    if (!products) return;
    const currentMovements = movements ?? [];
    const isQuote = data.type === "Quotation";
    if (!isQuote) {
      const productToSell = products.find(p => p.id === data.productId);
      if (productToSell && data.qty > productToSell.stock) {
        toast(`Not enough stock for ${productToSell.name}. Only ${productToSell.stock} available.`, "error");
        return;
      }
      saveProducts(products.map((p) => (p.id === data.productId ? { ...p, stock: Math.max(0, p.stock - data.qty) } : p)));
    }
    const sel = products.find((p) => p.id === data.productId);
    const isCredit = data.paymentMode === "Udhaar" || (data.payments && data.payments.Credit > 0);
    const paymentStr = data.payments
      ? Object.entries(data.payments).filter(([_, a]) => a > 0).map(([k, a]) => `${k}:${a}`).join(", ")
      : data.payment;
    saveMovements([...currentMovements, {
      id: "m" + uid(), shopId: activeShopId, productId: data.productId, productName: sel?.name || "",
      type: isQuote ? "ESTIMATE" : "SALE", qty: data.qty, unitPrice: data.sellPrice, sellingPrice: data.sellPrice,
      total: data.total, totalAmount: data.total, gstAmount: data.gstAmount, profit: isQuote ? 0 : data.profit,
      discount: data.discount, customerName: data.customerName, customerPhone: data.customerPhone,
      vehicleReg: data.vehicleReg, mechanic: data.mechanic, supplier: null, invoiceNo: data.invoiceNo,
      partyId: data.partyId || null, payment: paymentStr, paymentMode: data.paymentMode || null, creditDays: 0,
      paymentStatus: isCredit && !isQuote ? "pending" : "paid",
      note: [data.customerName && `Customer: ${data.customerName}`, data.vehicleReg && `Vehicle: ${data.vehicleReg}`, data.notes].filter(Boolean).join(" · ") || (isQuote ? "Quotation generated" : "Walk-in sale"),
      date: data.date, ...(data.priceOverride && { priceOverride: data.priceOverride }),
    }]);
    logAudit(isQuote ? "QUOTATION_CREATED" : "SALE_RECORDED", "movement", data.invoiceNo, `${data.qty}×${sel?.name?.slice(0, 20)} · ${fmt(data.total)}`);
    if (data.priceOverride) logAudit("PRICE_OVERRIDE", "movement", data.invoiceNo, `${sel?.name?.slice(0, 20)}: ${fmt(data.priceOverride.originalPrice)} → ${fmt(data.priceOverride.overriddenPrice)} (${data.priceOverride.reason || "no reason"})`);
    toast(isQuote ? `Quotation Generated: ${data.invoiceNo}` : `Sale recorded: ${data.qty}×${sel?.name?.slice(0, 20) || "product"} · ${fmt(data.total)}`, isQuote ? "info" : "success", isQuote ? "Estimate Saved" : "Sale Complete");
    if (!isQuote) {
      window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: 1 } }));
      syncInvoice({
        items: [{ inventoryId: data.productId, qty: data.qty, unitPrice: data.sellPrice, discount: data.discount || 0 }],
        partyName: data.customerName || undefined, partyPhone: data.customerPhone || undefined,
        partyId: data.partyId || undefined,
        paymentMode: data.paymentMode === "Udhaar" ? "CREDIT" : (data.paymentMode || "CASH"),
        cashAmount: data.payments?.Cash || undefined, upiAmount: data.payments?.UPI || undefined,
        creditAmount: data.payments?.Credit || undefined, notes: data.notes || undefined,
      }).then(() => {
        window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: -1 } }));
      }).catch((err) => {
        window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: -1, error: true } }));
        console.error("[Sync] Sale sync failed — saved locally, backend out of sync:", err?.message);
      });
    }
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  const handleMultiItemSale = useCallback((data) => {
    if (!products) return;
    const currentMovements = movements ?? [];
    const isQuote = data.type === "Quotation";
    if (!isQuote) {
      for (const item of data.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod && item.qty > prod.stock) {
          toast(`Not enough stock for "${prod.name}". Only ${prod.stock} available.`, "error");
          return;
        }
      }
    }
    const newMovements = [];
    let updatedProducts = [...products];
    let hasOverrides = false;
    data.items.forEach((item) => {
      if (!isQuote) updatedProducts = updatedProducts.map((p) => (p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p));
      const isCredit = data.paymentMode === "Udhaar" || (data.payments && data.payments.Credit > 0);
      const paymentStr = data.payments ? Object.entries(data.payments).filter(([_, a]) => a > 0).map(([k, a]) => `${k}:${a}`).join(", ") : "";
      newMovements.push({
        id: "m" + uid(), shopId: activeShopId, productId: item.productId, productName: item.name,
        type: isQuote ? "ESTIMATE" : "SALE", qty: item.qty, unitPrice: item.sellPrice, sellingPrice: item.sellPrice,
        total: item.total, totalAmount: item.total, gstAmount: item.gstAmount, profit: isQuote ? 0 : item.profit,
        discount: item.discount, customerName: data.customerName, customerPhone: data.customerPhone,
        vehicleReg: data.vehicleReg, mechanic: data.mechanic, supplier: null, invoiceNo: data.invoiceNo,
        partyId: data.partyId || null, payment: paymentStr, paymentMode: data.paymentMode || null, creditDays: 0,
        paymentStatus: isCredit && !isQuote ? "pending" : "paid",
        note: [data.customerName && `Customer: ${data.customerName}`, data.vehicleReg && `Vehicle: ${data.vehicleReg}`, data.notes].filter(Boolean).join(" · ") || (isQuote ? "Quotation" : "POS Sale"),
        date: data.date, multiItemInvoice: true, ...(item.priceOverride && { priceOverride: item.priceOverride }),
      });
      if (item.priceOverride) {
        hasOverrides = true;
        logAudit("PRICE_OVERRIDE", "movement", data.invoiceNo, `${item.name?.slice(0, 20)}: ${fmt(item.priceOverride.originalPrice)} → ${fmt(item.priceOverride.overriddenPrice)} (${item.priceOverride.reason || "no reason"})`);
      }
    });
    saveProducts(updatedProducts);
    saveMovements([...currentMovements, ...newMovements]);
    logAudit(isQuote ? "MULTI_QUOTATION_CREATED" : "MULTI_SALE_RECORDED", "movement", data.invoiceNo, `${data.items.length} items · ${fmt(data.total)}${hasOverrides ? " · price override(s)" : ""}`);
    toast(isQuote ? `Quotation: ${data.items.length} items · ${fmt(data.total)}` : `Sale recorded: ${data.items.length} items · ${fmt(data.total)}`, isQuote ? "info" : "success", isQuote ? "Estimate Saved" : `Invoice ${data.invoiceNo}`);
    if (!isQuote) {
      window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: 1 } }));
      syncInvoice({
        items: data.items.map(item => ({ inventoryId: item.productId, qty: item.qty, unitPrice: item.sellPrice, discount: item.discount || 0 })),
        partyName: data.customerName || undefined, partyPhone: data.customerPhone || undefined,
        partyId: data.partyId || undefined,
        paymentMode: data.paymentMode === "Udhaar" ? "CREDIT" : (data.paymentMode || "CASH"),
        cashAmount: data.payments?.Cash || undefined, upiAmount: data.payments?.UPI || undefined,
        creditAmount: data.payments?.Credit || undefined, notes: data.notes || undefined,
      }).then(() => {
        window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: -1 } }));
      }).catch((err) => {
        window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: -1, error: true } }));
        console.error("[Sync] Multi-sale sync failed — saved locally, backend out of sync:", err?.message);
      });
    }
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  const handlePurchase = useCallback((data) => {
    if (!products) return;
    const currentMovements = movements ?? [];
    const updated = products.map((p) => (p.id === data.productId ? { ...p, stock: p.stock + data.qty, buyPrice: data.buyPrice, sellPrice: data.newSellPrice || p.sellPrice, supplier: data.supplier || p.supplier } : p));
    saveProducts(updated);
    const sel = products.find((p) => p.id === data.productId);
    saveMovements([...currentMovements, {
      id: "m" + uid(), shopId: activeShopId, productId: data.productId, productName: sel?.name || "", type: "PURCHASE",
      qty: data.qty, unitPrice: data.buyPrice, sellingPrice: data.newSellPrice || sel?.sellPrice,
      total: data.total, gstAmount: data.gstAmount, profit: null,
      supplier: data.supplier, supplierName: data.supplier, invoiceNo: data.invoiceNo,
      payment: data.payment, paymentMode: data.payment, creditDays: data.creditDays,
      paymentStatus: data.payment === "Credit" ? "pending" : "paid",
      note: [data.supplier && `Supplier: ${data.supplier}`, data.payment === "Credit" && `Credit ${data.creditDays}d`, data.notes].filter(Boolean).join(" · ") || "Stock purchase",
      date: data.date,
    }]);
    logAudit("PURCHASE_RECORDED", "movement", data.invoiceNo, `+${data.qty} ${sel?.name?.slice(0, 20)} · ${fmt(data.total)}`);
    toast(`Stock added: +${data.qty} units · ${fmt(data.total)}`, "info", "Purchase Recorded");
    window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: 1 } }));
    syncPurchase({
      inventoryId: data.productId, qty: data.qty, buyingPrice: data.buyPrice,
      newSellingPrice: data.newSellPrice, supplier: data.supplier,
      invoiceNo: data.invoiceNo, payment: data.payment, creditDays: data.creditDays, notes: data.notes,
    }).then(() => {
      window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: -1 } }));
    }).catch((err) => {
      window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: -1, error: true } }));
      console.error("[Sync] Purchase sync failed — saved locally, backend out of sync:", err?.message);
    });
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  const handleAdjustment = useCallback((data) => {
    if (!products || !movements) return;
    const sel = products.find((p) => p.id === data.productId);
    const stockChange = data.stockDirection * data.qty;
    if (stockChange !== 0) saveProducts(products.map((p) => (p.id === data.productId ? { ...p, stock: Math.max(0, p.stock + stockChange) } : p)));
    const lossAmount = (data.adjustType === "DAMAGE" || data.adjustType === "THEFT") ? (sel?.buyPrice || 0) * data.qty : 0;
    saveMovements([...movements, {
      id: "m" + uid(), shopId: activeShopId, productId: data.productId, productName: sel?.name || "",
      type: data.adjustType, qty: data.qty, unitPrice: sel?.buyPrice || 0, sellingPrice: sel?.sellPrice || 0,
      total: data.refundAmount || lossAmount || 0, gstAmount: 0,
      profit: data.adjustType === "RETURN_IN" ? -(data.refundAmount || 0) : data.adjustType === "DAMAGE" || data.adjustType === "THEFT" ? -lossAmount : 0,
      customerName: data.adjustType === "RETURN_IN" ? "Customer Return" : null,
      supplier: data.supplierName || null, supplierName: data.supplierName || null,
      invoiceNo: data.originalInvoice || null, payment: data.refundMethod || data.adjustType, paymentStatus: "completed",
      note: [data.reason && `Reason: ${data.reason}`, data.reasonDetail, data.adjustType === "AUDIT" && `Audit: ${data.previousStock} → ${data.previousStock + stockChange}`, data.notes].filter(Boolean).join(" · ") || `Stock ${data.adjustType.toLowerCase()}`,
      date: data.date,
      adjustmentMeta: { type: data.adjustType, previousStock: data.previousStock, newStock: (data.previousStock || 0) + stockChange, reason: data.reason, refundMethod: data.refundMethod },
    }]);
    const labels = { RETURN_IN: "Customer return processed", RETURN_OUT: "Returned to vendor", CREDIT_NOTE: "Credit note issued", DEBIT_NOTE: "Debit note issued", DAMAGE: "Damage recorded", THEFT: "Shrinkage recorded", AUDIT: "Audit correction applied", OPENING: "Opening stock set" };
    logAudit("ADJUSTMENT_" + data.adjustType, "movement", data.productId, `${labels[data.adjustType] || data.adjustType}: ${stockChange > 0 ? "+" : ""}${stockChange} units`);
    toast(`${labels[data.adjustType] || data.adjustType}: ${stockChange !== 0 ? (stockChange > 0 ? "+" : "") + stockChange + " units of " : ""}${sel?.name?.slice(0, 20) || "product"}${data.refundAmount ? " · " + fmt(data.refundAmount) : ""}`, data.adjustType === "RETURN_IN" || data.adjustType === "OPENING" ? "info" : data.adjustType === "CREDIT_NOTE" || data.adjustType === "DEBIT_NOTE" ? "success" : "warning", labels[data.adjustType] || data.adjustType);
    window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: 1 } }));
    syncAdjustment({
      inventoryId: data.productId, type: data.adjustType,
      qty: data.adjustType === "AUDIT" ? stockChange : data.qty,
      reason: data.reason, refundMethod: data.refundMethod, refundAmount: data.refundAmount,
      supplierName: data.supplierName, originalInvoice: data.originalInvoice, notes: data.notes,
    }).then(() => {
      window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: -1 } }));
    }).catch((err) => {
      window.dispatchEvent(new CustomEvent("rp:sync", { detail: { delta: -1, error: true } }));
      console.error("[Sync] Adjustment sync failed — saved locally, backend out of sync:", err?.message);
    });
  }, [products, movements, saveProducts, saveMovements, toast, activeShopId, logAudit]);

  const handlePaymentReceipt = useCallback((data) => {
    if (!movements) return;
    const receiptMovement = {
      id: "m" + uid(), shopId: activeShopId, productId: null, productName: "",
      type: "RECEIPT", qty: 0, unitPrice: 0, sellingPrice: 0,
      total: data.amount, gstAmount: 0, profit: 0,
      customerName: data.partyName, customerPhone: data.partyPhone,
      payment: data.paymentMode, paymentMode: data.paymentMode, paymentStatus: "paid",
      note: `Payment received: ${fmt(data.amount)} from ${data.partyName} via ${data.paymentMode}. ${data.notes || ""}`.trim(),
      date: Date.now(),
    };
    let updatedMovements = movements.map((m) => {
      if (data.movementIds && data.movementIds.length > 0) {
        // Only mark paid if the movement actually belongs to this party — prevents
        // a stale/wrong movementId list from silently clearing another party's debt.
        if (data.movementIds.includes(m.id) && m.customerName === data.partyName) return { ...m, paymentStatus: "paid" };
      } else if (m.customerName === data.partyName && m.paymentStatus === "pending") {
        return { ...m, paymentStatus: "paid" };
      }
      return m;
    });
    saveMovements([...updatedMovements, receiptMovement]);
    logAudit("RECEIPT_RECORDED", "receipt", data.partyName, `${fmt(data.amount)} via ${data.paymentMode}`);
    toast(`Payment received: ${fmt(data.amount)} from ${data.partyName}`, "success", "Receipt Recorded");
  }, [movements, saveMovements, activeShopId, logAudit, toast]);

  // ── AppCtx value — everything shells and pages need, stable reference via useMemo
  // WHY expose handlers here instead of passing as props: routes stay to 1 line each.
  // Pages call useContext(AppCtx) to get handlers; useStore() for data.
  const appCtxValue = useMemo(() => ({
    // Modal state (consumed by ERPShell and pages)
    pModal, setPModal,
    catalogModal, setCatalogModal,
    addProdOpen, setAddProdOpen,
    // Toast (consumed by all shells and pages)
    toast, toasts, removeToast,
    // Auth (consumed by shells + LandingPage modal)
    currentUser, setCurrentUser, handleLogin, handleLogout,
    impersonating, handleExitImpersonation,
    // Business handlers (consumed by pages via useContext — no prop drilling)
    saveProduct,
    handleBulkStockIn,
    handleSale,
    handleMultiItemSale,
    handlePurchase,
    handleAdjustment,
    handlePaymentReceipt,
  }), [
    pModal, setPModal, catalogModal, setCatalogModal, addProdOpen, setAddProdOpen,
    toast, toasts, removeToast, currentUser, setCurrentUser, handleLogin, handleLogout,
    saveProduct, handleBulkStockIn, handleSale, handleMultiItemSale,
    handlePurchase, handleAdjustment, handlePaymentReceipt,
    impersonating, handleExitImpersonation,
  ]);

  const genInvoiceNo = useCallback(() => {
    const shopSuffix = (activeShopId || "0000").slice(-4).toUpperCase();
    return shopSuffix + "-" + Date.now().toString(36).toUpperCase();
  }, [activeShopId]);

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: FONT.ui }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ height: 56, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 12 }}>
          <div className="skeleton-shimmer" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
          <div className="skeleton-shimmer" style={{ width: 120, height: 14, borderRadius: 6 }} />
          <div style={{ flex: 1 }} />
          <div className="skeleton-shimmer" style={{ width: 80, height: 28, borderRadius: 8 }} />
          <div className="skeleton-shimmer" style={{ width: 32, height: 32, borderRadius: 8 }} />
        </div>
        <div style={{ padding: "32px 28px", maxWidth: 900 }}>
          <div className="skeleton-shimmer" style={{ height: 24, width: "22%", borderRadius: 8, marginBottom: 24 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton-shimmer" style={{ height: 90, borderRadius: 12 }} />)}
          </div>
          <div className="skeleton-shimmer" style={{ height: 260, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  // ── Route tree — clean, no prop drilling ─────────────────────────────────────
  // WHY no props on pages: pages call useStore() for data and useContext(AppCtx)
  // for handlers. Routes were previously 200+ chars per line; now they're readable.
  return (
    <AppCtx.Provider value={appCtxValue}>
      {/* Top loading bar — shows during route navigation */}
      <LoadingBar />
      {/* Impersonation banner */}
      {impersonating && (
        <div className="impersonation-bar" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: `${T.surface}f8`, borderTop: `2px solid ${T.violet}`,
          backdropFilter: 'blur(14px)', padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          fontFamily: FONT.ui, boxShadow: `0 -4px 28px ${T.violetBg}`,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.violet, boxShadow: `0 0 6px ${T.violet}`, flexShrink: 0 }} />
          <div className="impersonation-user-info" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <span style={{ color: T.t3, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>Viewing as</span>
            <div style={{ border: `1.5px solid ${T.violet}`, borderRadius: '50%', flexShrink: 0 }}>
              <Avatar user={currentUser} size={24} />
            </div>
            <strong style={{ color: T.t1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser?.name || currentUser?.email || 'Unknown User'}
            </strong>
            <span style={{ background: T.violetBg, border: `1px solid ${T.violet}`, color: T.violet, borderRadius: 6, padding: '1px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {currentUser?.userType?.name || currentUser?.role}
            </span>
            <span className="impersonation-admin-label" style={{ color: T.t4, fontSize: 11, whiteSpace: 'nowrap' }}>
              Admin: <span style={{ color: T.t3, fontWeight: 600 }}>{impersonating.user?.name || impersonating.user?.email}</span>
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            style={{
              background: `linear-gradient(135deg, ${T.violet}, #6D28D9)`,
              border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT.ui,
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap',
              boxShadow: `0 2px 10px ${T.violetBg}`, transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            🛡️ <span className="impersonation-btn-text">Back to Admin Console</span>
          </button>
        </div>
      )}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public — "/" shows LandingPage for unauthenticated users */}
          <Route path="/" element={currentUser ? <Navigate to={getDefaultRoute(currentUser)} replace /> : <LandingPage />} />
          {/* /login shows LandingPage with auth modal pre-opened */}
          <Route path="/login" element={currentUser ? <Navigate to={getDefaultRoute(currentUser)} replace /> : <LandingPage openAuth />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ERP routes — pages pull data via useStore(), handlers via useContext(AppCtx) */}
          <Route path="/dashboard" element={requireRole(currentUser, "SHOP_OWNER", <ERPShell><DashboardPage /></ERPShell>)} />
          <Route path="/inventory"  element={requireRole(currentUser, "SHOP_OWNER", <ERPShell><InventoryPage /></ERPShell>)} />
          <Route path="/billing"    element={requireRole(currentUser, "SHOP_OWNER", <ERPShell><POSBillingPage /></ERPShell>)} />
          <Route path="/parties"    element={requireRole(currentUser, "SHOP_OWNER", <ERPShell><PartiesPage /></ERPShell>)} />
          <Route path="/workshop"             element={requireRole(currentUser, "SHOP_OWNER", <ERPShell><WorkshopPage section="jobs" /></ERPShell>)} />
          <Route path="/workshop/marketplace" element={requireRole(currentUser, "SHOP_OWNER", <ERPShell><WorkshopPage section="marketplace" /></ERPShell>)} />
          <Route path="/history"    element={requireRole(currentUser, "SHOP_OWNER", <ERPShell><HistoryPage /></ERPShell>)} />
          <Route path="/reports"    element={requireRole(currentUser, "SHOP_OWNER", <ERPShell><ReportsPage /></ERPShell>)} />
          <Route path="/orders"     element={requireRole(currentUser, "SHOP_OWNER", <ERPShell><OrdersPage /></ERPShell>)} />

          {/* Marketplace routes */}
          {/* New marketplace — Stitch design (browse without login, cart requires login) */}
          <Route path="/marketplace"          element={<MarketplacePage />} />
          <Route path="/cart"                 element={<CartPage />} />
          <Route path="/saved"                element={<SavedItemsPage />} />
          <Route path="/suppliers"            element={<SuppliersPage />} />
          {/* /oem-parts removed — redirect to marketplace */}
          <Route path="/oem-parts"            element={<Navigate to="/marketplace" replace />} />
          <Route path="/marketplace/legacy"   element={<MarketplaceHome />} />
          <Route path="/marketplace/orders"   element={currentUser ? <MPShell><OrderTrackingPage /></MPShell> : <Navigate to="/login" replace />} />
          <Route path="/marketplace/pricing"  element={currentUser ? <MPShell><PricingPage /></MPShell>        : <Navigate to="/login" replace />} />
          <Route path="/marketplace/checkout" element={currentUser ? <MPShell><CheckoutPage /></MPShell>       : <Navigate to="/login" replace />} />

          {/* Shared pages — shell matches role */}
          <Route path="/profile"  element={<AuthenticatedShell user={currentUser}><ProfilePage user={currentUser} onUserUpdate={(u) => setCurrentUser(u)} onLogout={handleLogout} /></AuthenticatedShell>} />
          <Route path="/settings" element={<AuthenticatedShell user={currentUser}><SettingsPage onLogout={handleLogout} /></AuthenticatedShell>} />

          {/* Admin */}
          <Route path="/admin" element={requireRole(currentUser, "PLATFORM_ADMIN", <AdminShell><SuperAdminPage onImpersonate={handleImpersonate} /></AdminShell>)} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={currentUser ? getDefaultRoute(currentUser) : "/"} replace />} />
        </Routes>
      </Suspense>

      <ShortcutOverlay open={shortcutOverlay} onClose={() => setShortcutOverlay(false)} />
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} onNavigate={(path) => navigate(path)} />
    </AppCtx.Provider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
