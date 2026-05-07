import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client.js";
import { T, FONT } from "../theme.js";
import { Avatar } from "../components/Avatar.jsx";

// Color map by slug — uses T.* theme tokens
const SLUG_COLORS = {
  PLATFORM_ADMIN: { bg: T.violetBg, border: T.violet, text: T.violet },
  SHOP_OWNER:     { bg: T.emeraldBg, border: T.emerald, text: T.emerald },
  CUSTOMER:       { bg: T.skyBg,     border: T.sky,     text: T.sky     },
  SHOP_STAFF:     { bg: "rgba(251,191,36,0.1)", border: "#D97706", text: "#FBBF24" },
};

// Only show these 3 roles in filters/dropdowns
const ALLOWED_ROLE_SLUGS = ["PLATFORM_ADMIN", "SHOP_OWNER", "CUSTOMER"];

function RoleBadge({ slug, name }) {
  const c = SLUG_COLORS[slug] || { bg: "#1a1a2e", border: "#444", text: "#aaa" };
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>
      {name || slug}
    </span>
  );
}

function VerificationBadge({ status }) {
  const base = { borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: FONT.ui };
  if (status === "PENDING") return (
    <span style={{ ...base, background: "rgba(251,191,36,0.1)", border: "1px solid #D97706", color: "#FBBF24" }}>⏳ Pending</span>
  );
  if (status === "REJECTED") return (
    <span style={{ ...base, background: T.crimsonBg, border: `1px solid ${T.crimson}`, color: T.crimson }}>✗ Rejected</span>
  );
  return (
    <span style={{ ...base, background: T.emeraldBg, border: `1px solid ${T.emerald}`, color: T.emerald }}>✓ Approved</span>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
function AddUserModal({ userTypes, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState("CUSTOMER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allowedTypes = userTypes.filter(ut => ALLOWED_ROLE_SLUGS.includes(ut.slug));

  const handleSubmit = async () => {
    if (!email.trim()) { setError("Email is required"); return; }
    if (!password || password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!role) { setError("Select a user type"); return; }
    setError(""); setLoading(true);
    try {
      const res = await api.post("/api/admin/users/create", { name: name.trim() || undefined, email: email.trim(), password, role });
      onSuccess(res.data);
    } catch (e) {
      setError(e.data?.error?.message || e.message || "Failed to create user");
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
        padding: 32, maxWidth: 440, width: "100%", margin: "0 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>Add User</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ background: "#1c0909", border: `1.5px solid ${T.crimson}`, borderRadius: 10, padding: "10px 14px", color: T.crimson, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 6, display: "block" }}>Name <span style={{ color: T.t3, fontWeight: 400 }}>(optional)</span></label>
        <input
          style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", color: T.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box", marginBottom: 14 }}
          placeholder="e.g. Raju Sharma"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <label style={{ fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 6, display: "block" }}>Email *</label>
        <input
          style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", color: T.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box", marginBottom: 14 }}
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />

        <label style={{ fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 6, display: "block" }}>Password *</label>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <input
            style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "11px 44px 11px 14px", color: T.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box" }}
            type={showPw ? "text" : "password"}
            placeholder="Min 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          <button
            type="button"
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: T.t3, cursor: "pointer", fontSize: 16 }}
            onClick={() => setShowPw(v => !v)}
          >
            {showPw ? "🙈" : "👁"}
          </button>
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 6, display: "block" }}>User Type *</label>
        <select
          style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", color: T.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box", marginBottom: 24, cursor: "pointer" }}
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          {allowedTypes.map(ut => (
            <option key={ut.slug} value={ut.slug}>{ut.name}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, color: T.t3, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{ flex: 2, padding: "12px", background: loading ? T.amberDim : T.amber, border: "none", borderRadius: 10, color: loading ? "#aaa" : "#000", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT.ui }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SuperAdminPage({ onImpersonate, currentUser }) {
  const [activeTab, setActiveTab] = useState("users"); // "users" | "verifications"
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  // Verifications tab state
  const [verifications, setVerifications] = useState([]);
  const [verLoading, setVerLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null); // userId with reject textarea open
  const [rejectReason, setRejectReason] = useState("");
  const [verError, setVerError] = useState("");
  const [verSuccess, setVerSuccess] = useState("");

  // Add User modal
  const [showAddUser, setShowAddUser] = useState(false);

  const pendingCount = verifications.filter(v => v.verificationStatus === "PENDING").length;

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/stats");
      setStats(res.data);
    } catch {}
  }, []);

  const fetchUsers = useCallback(async (q, role, off) => {
    setLoading(true);
    try {
      const params = { limit: LIMIT, offset: off };
      if (q) params.q = q;
      if (role && role !== "ALL") params.role = role;
      const res = await api.get("/api/admin/users", params);
      setUsers(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e.message || "Failed to load users");
    }
    setLoading(false);
  }, []);

  const fetchVerifications = useCallback(async () => {
    setVerLoading(true);
    try {
      const res = await api.get("/api/admin/verifications");
      setVerifications(res.data || []);
    } catch (e) {
      setVerError(e.message || "Failed to load verifications");
    }
    setVerLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    api.get("/api/admin/usertypes")
      .then(res => setUserTypes(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); fetchUsers(search, roleFilter, 0); }, 300);
    return () => clearTimeout(t);
  }, [search, roleFilter, fetchUsers]);

  useEffect(() => {
    if (activeTab === "verifications") fetchVerifications();
  }, [activeTab, fetchVerifications]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleImpersonate = async (user) => {
    setImpersonatingId(user.userId);
    setError("");
    try {
      const res = await api.post(`/api/admin/impersonate/${user.userId}`);
      onImpersonate(res.data.user, res.data.accessToken);
    } catch (e) {
      setError(e.message || "Impersonation failed");
      setImpersonatingId(null);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await api.patch(`/api/admin/users/${user.userId}/toggle-active`);
      setUsers(prev => prev.map(u => u.userId === user.userId ? { ...u, isActive: res.data.isActive } : u));
    } catch (e) {
      setError(e.message || "Failed to update user");
    }
  };

  const handleChangeUserType = async (user, userTypeId) => {
    setError("");
    try {
      const res = await api.patch(`/api/admin/users/${user.userId}/usertype`, { userTypeId });
      setUsers(prev => prev.map(u =>
        u.userId === user.userId
          ? { ...u, role: res.data.role, userType: res.data.userType }
          : u
      ));
    } catch (e) {
      setError(e.message || "Failed to change user type");
    }
  };

  const handleVerify = async (userId, action, reason) => {
    setVerError(""); setVerSuccess("");
    try {
      await api.post(`/api/admin/users/${userId}/verify`, { action, reason });
      setVerifications(prev => prev.filter(v => v.userId !== userId));
      setRejectingId(null);
      setRejectReason("");
      setVerSuccess(action === "APPROVE" ? "Shop owner approved and notified by email." : "Application rejected and shop owner notified.");
      fetchStats();
      setTimeout(() => setVerSuccess(""), 5000);
    } catch (e) {
      setVerError(e.data?.error?.message || e.message || "Action failed");
    }
  };

  const handleAddUserSuccess = (newUser) => {
    setShowAddUser(false);
    showSuccess(`User "${newUser.email}" created successfully.`);
    fetchUsers(search, roleFilter, offset);
    fetchStats();
  };

  const S = {
    page: { minHeight: "100vh", background: T.bg, color: T.t1, fontFamily: FONT.ui },
    header: {
      background: T.surface, borderBottom: `1px solid ${T.border}`,
      padding: "14px 20px", position: "sticky", top: 0, zIndex: 99,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 8,
    },
    title: { display: "flex", alignItems: "center", gap: 10 },
    badge: {
      width: 36, height: 36, borderRadius: 10,
      background: `linear-gradient(135deg, ${T.violet}, #6D28D9)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, boxShadow: `0 4px 14px ${T.violetBg}`,
      flexShrink: 0,
    },
    titleText: { fontSize: 18, fontWeight: 800, color: T.t1, fontFamily: FONT.ui },
    titleSub: { fontSize: 10, color: T.violet, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" },
    body: { padding: "24px 28px", maxWidth: 1200, margin: "0 auto" },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 },
    statCard: {
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
      padding: "16px 18px", transition: "border-color 0.15s",
    },
    statVal: { fontSize: 26, fontWeight: 900, color: T.t1, marginBottom: 3, fontFamily: FONT.ui },
    statLabel: { fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" },
    controls: { display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" },
    searchInput: {
      flex: 1, minWidth: 200, background: T.card, border: `1.5px solid ${T.border}`,
      borderRadius: 10, padding: "10px 14px", color: T.t1, fontSize: 14,
      outline: "none", fontFamily: FONT.ui,
    },
    select: {
      background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 10,
      padding: "10px 14px", color: T.t1, fontSize: 13, outline: "none",
      fontFamily: FONT.ui, cursor: "pointer",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
      padding: "10px 14px", fontSize: 10, fontWeight: 700, color: T.t3,
      textTransform: "uppercase", letterSpacing: "0.08em",
      borderBottom: `1px solid ${T.border}`, textAlign: "left",
      background: T.surface,
    },
    td: {
      padding: "11px 14px", fontSize: 13, color: T.t2,
      borderBottom: `1px solid ${T.border}`,
      fontFamily: FONT.ui,
    },
    row: { transition: "background 0.1s", cursor: "default" },
    btnImpersonate: {
      background: `linear-gradient(135deg, ${T.violet}, #6D28D9)`,
      border: "none", borderRadius: 7, padding: "5px 11px",
      color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
      fontFamily: FONT.ui, transition: "opacity 0.15s", whiteSpace: "nowrap",
    },
    btnToggle: (isActive) => ({
      background: "transparent",
      border: `1px solid ${isActive ? T.crimson : T.emerald}`,
      borderRadius: 7, padding: "5px 10px",
      color: isActive ? T.crimson : T.emerald,
      fontSize: 11, fontWeight: 600,
      cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap",
    }),
    pagination: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, alignItems: "center", flexWrap: "wrap" },
    pageBtn: (active) => ({
      background: active ? T.amber : T.card, border: `1px solid ${active ? T.amber : T.border}`,
      borderRadius: 7, padding: "6px 14px", color: active ? "#000" : T.t2,
      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui,
    }),
    btnAddUser: {
      background: T.amber, border: "none", borderRadius: 9, padding: "9px 16px",
      color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui,
      display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
    },
    tab: (active) => ({
      padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
      border: "none", background: "none", fontFamily: FONT.ui,
      color: active ? T.amber : T.t3,
      borderBottom: active ? `2px solid ${T.amber}` : "2px solid transparent",
      transition: "all 0.15s",
    }),
    statusBadge: (isActive) => ({
      background: isActive ? T.emeraldBg : T.crimsonBg,
      border: `1px solid ${isActive ? T.emerald : T.crimson}`,
      color: isActive ? T.emerald : T.crimson,
      borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, fontFamily: FONT.ui,
    }),
  };

  const pages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT);
  const filteredUserTypes = userTypes.filter(ut => ALLOWED_ROLE_SLUGS.includes(ut.slug));

  const ADMIN_CSS = `
    /* ── Admin content area padding ── */
    .admin-content-wrap { padding-left: 68px; }

    /* ── Admin stat cards: 3-col on desktop, 2-col on mobile ── */
    .admin-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: 14px; margin-bottom: 28px; }

    /* ── Admin controls row: search + filter + button ── */
    .admin-controls-row { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
    .admin-search-input { flex: 1; min-width: 160px; }

    /* ── Table: horizontal scroll on mobile ── */
    .admin-table-wrap { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 14px; overflow: hidden; }
    .admin-table-wrap-inner { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table-wrap-inner table { min-width: 800px; width: 100%; border-collapse: collapse; }

    /* ── User card layout for mobile (hides table, shows cards) ── */
    .admin-user-card { display: none; }

    /* ── Pagination ── */
    .admin-pagination { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; align-items: center; flex-wrap: wrap; }

    @media (max-width: 768px) {
      /* Sidebar becomes topbar — content no longer needs left padding */
      .admin-content-wrap { padding-left: 0 !important; padding-top: 58px !important; }

      /* Admin sidebar → horizontal topbar */
      .admin-sidebar {
        top: 0 !important; bottom: auto !important;
        left: 0 !important; right: 0 !important;
        width: 100% !important; height: 54px !important;
        flex-direction: row !important;
        align-items: center !important;
        padding: 0 14px !important;
        border-right: none !important;
        border-bottom: 1px solid ${T.border} !important;
        gap: 10px !important;
      }
      .admin-sidebar-label { display: none !important; }
      .sidebar-spacer { flex: 1 !important; display: block !important; }
      .admin-sidebar-user { flex-direction: row !important; }
      .admin-sidebar-logout { margin: 0 !important; }
      .admin-sidebar-logo { margin-bottom: 0 !important; width: 32px !important; height: 32px !important; font-size: 14px !important; }

      /* Page body padding */
      .admin-page-body { padding: 16px 14px 40px !important; }

      /* Sticky header needs to be below the topbar */
      .admin-page-sticky-header { top: 54px !important; }

      /* Stats: 2-col on mobile, smaller values */
      .admin-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; margin-bottom: 18px !important; }
      .admin-stats-grid .stat-val { font-size: 22px !important; }
      .admin-stats-grid .stat-label { font-size: 10px !important; }

      /* Controls row: search full width, select+button in a row */
      .admin-controls-row { gap: 8px !important; }
      .admin-search-input { min-width: 0 !important; width: 100% !important; flex: none !important; order: 0 !important; }
      .admin-type-select { flex: 1 !important; min-width: 0 !important; }
      .admin-add-btn { flex-shrink: 0 !important; }

      /* Table → Cards on mobile */
      .admin-table-wrap-inner { overflow: visible !important; }
      .admin-table-wrap-inner table { display: none !important; }
      .admin-user-card { display: block !important; }
    }

    @media (max-width: 480px) {
      .admin-page-body { padding: 12px 10px 80px !important; }
      .admin-stats-grid { gap: 8px !important; }
    }
  `;

  return (
    <div style={S.page}>
      <style>{ADMIN_CSS}</style>
      {/* Header */}
      <div className="admin-page-sticky-header" style={S.header}>
        <div style={S.title}>
          <div style={S.badge}>🛡️</div>
          <div>
            <div style={S.titleText}>Admin Console</div>
            <div style={S.titleSub}>Platform Management</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: T.t3 }}>
          {total} user{total !== 1 ? "s" : ""} total
        </div>
      </div>

      <div className="admin-page-body" style={S.body}>
        {/* Global error / success */}
        {error && (
          <div style={{ background: T.crimsonBg, border: `1.5px solid ${T.crimson}`, borderRadius: 10, padding: "11px 14px", color: T.crimson, fontSize: 13, marginBottom: 16, fontFamily: FONT.ui }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ background: T.emeraldBg, border: `1.5px solid ${T.emerald}`, borderRadius: 10, padding: "11px 14px", color: T.emerald, fontSize: 13, marginBottom: 16, fontFamily: FONT.ui }}>
            {successMsg}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="admin-stats-grid" style={S.statsGrid}>
            {[
              { label: "Total Users",  val: stats.totalUsers,  color: T.t1,      icon: "👥" },
              { label: "Shop Owners",  val: stats.shopOwners,  color: T.emerald, icon: "🏪" },
              { label: "Customers",    val: stats.customers,   color: T.sky,     icon: "🛒" },
              { label: "Total Shops",  val: stats.totalShops,  color: T.amber,   icon: "📦" },
              { label: "Active Users", val: stats.activeUsers, color: T.emerald, icon: "✅" },
              { label: "Admins",       val: stats.admins,      color: T.violet,  icon: "🛡️" },
            ].map((s) => (
              <div key={s.label} style={S.statCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div className="stat-val" style={{ ...S.statVal, color: s.color }}>{s.val ?? "—"}</div>
                  <span style={{ fontSize: 18, opacity: 0.6 }}>{s.icon}</span>
                </div>
                <div className="stat-label" style={S.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
          <button style={S.tab(activeTab === "users")} onClick={() => setActiveTab("users")}>
            Users
          </button>
          <button style={S.tab(activeTab === "verifications")} onClick={() => setActiveTab("verifications")}>
            Verifications{pendingCount > 0 ? ` ⏳ ${pendingCount}` : ""}
          </button>
        </div>

        {/* ─── USERS TAB ─── */}
        {activeTab === "users" && (
          <>
            {/* Controls */}
            <div className="admin-controls-row" style={S.controls}>
              <input
                className="admin-search-input"
                style={S.searchInput}
                placeholder="🔍  Search by name, email or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                className="admin-type-select"
                style={S.select}
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="ALL">All Types</option>
                {filteredUserTypes.map(ut => (
                  <option key={ut.slug} value={ut.slug}>{ut.name}</option>
                ))}
              </select>
              <button className="admin-add-btn" style={S.btnAddUser} onClick={() => setShowAddUser(true)}>
                + Add User
              </button>
            </div>

            {/* Table */}
            <div className="admin-table-wrap">
              {/* Desktop table */}
              <div className="admin-table-wrap-inner">
                <table style={S.table}>
                  <thead>
                    <tr>
                      {["User", "Role", "User Type", "Shop", "Last Login", "Logins", "Status", "Actions"].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: 40, color: T.t3 }}>Loading users...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: 40, color: T.t3 }}>No users found</td></tr>
                    ) : users.map(u => (
                      <tr
                        key={u.userId}
                        style={S.row}
                        onMouseEnter={e => e.currentTarget.style.background = `${T.amber}08`}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={S.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar user={u} size={32} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{u.name || <span style={{ color: T.t4, fontStyle: "italic" }}>No name</span>}</div>
                              <div style={{ fontSize: 11, color: T.t3 }}>{u.email || u.phone || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={S.td}><RoleBadge slug={u.userType?.slug || u.role} name={u.userType?.name} /></td>
                        <td style={S.td}>
                          <select
                            style={{
                              background: T.card, color: T.t1, border: `1px solid ${T.border}`,
                              borderRadius: 7, padding: "4px 8px", fontSize: 12, fontFamily: FONT.ui,
                              cursor: currentUser?.userId === u.userId ? "not-allowed" : "pointer",
                              opacity: currentUser?.userId === u.userId ? 0.5 : 1, outline: "none",
                            }}
                            value={u.userType?.id || ""}
                            disabled={currentUser?.userId === u.userId}
                            onChange={e => handleChangeUserType(u, e.target.value)}
                          >
                            <option value="">— Select —</option>
                            {userTypes.map(ut => (
                              <option key={ut.id} value={ut.id}>{ut.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={S.td}>
                          {u.shop ? (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{u.shop.name}</div>
                              <div style={{ fontSize: 11, color: T.t3 }}>{u.shop.city}</div>
                            </div>
                          ) : <span style={{ color: T.t4 }}>—</span>}
                        </td>
                        <td style={{ ...S.td, color: T.t3 }}>
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : <span style={{ color: T.t4 }}>Never</span>}
                        </td>
                        <td style={{ ...S.td, textAlign: "center", color: T.t2, fontWeight: 700 }}>{u.loginCount ?? 0}</td>
                        <td style={S.td}>
                          <span style={S.statusBadge(u.isActive)}>
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                          {(u.userType?.slug || u.role) !== "PLATFORM_ADMIN" && (
                            <button
                              style={{ ...S.btnImpersonate, opacity: impersonatingId === u.userId ? 0.6 : 1, marginRight: 6 }}
                              onClick={() => handleImpersonate(u)}
                              disabled={!!impersonatingId}
                              title={`Login as ${u.name || u.email}`}
                            >
                              {impersonatingId === u.userId ? "…" : "⚡ Imp."}
                            </button>
                          )}
                          <button
                            style={S.btnToggle(u.isActive)}
                            onClick={() => handleToggleActive(u)}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards (shown via CSS when table is hidden) */}
              <div className="admin-user-card">
                {loading ? (
                  <div style={{ textAlign: "center", padding: 40, color: T.t3 }}>Loading users...</div>
                ) : users.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: T.t3 }}>No users found</div>
                ) : users.map(u => (
                  <div key={u.userId} style={{
                    borderBottom: `1px solid ${T.border}`,
                    padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,
                    background: "transparent", transition: "background 0.12s",
                  }}>
                    {/* Row 1: Avatar + name + status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar user={u} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, fontFamily: FONT.ui }}>{u.name || <span style={{ color: T.t4, fontStyle: "italic" }}>No name</span>}</div>
                        <div style={{ fontSize: 12, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email || u.phone || "—"}</div>
                      </div>
                      <span style={{ ...S.statusBadge(u.isActive), flexShrink: 0 }}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {/* Row 2: Role badge + type select + shop */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <RoleBadge slug={u.userType?.slug || u.role} name={u.userType?.name} />
                      <select
                        style={{
                          background: T.card, color: T.t1, border: `1px solid ${T.border}`,
                          borderRadius: 7, padding: "5px 8px", fontSize: 12, fontFamily: FONT.ui,
                          cursor: currentUser?.userId === u.userId ? "not-allowed" : "pointer",
                          opacity: currentUser?.userId === u.userId ? 0.5 : 1, outline: "none",
                        }}
                        value={u.userType?.id || ""}
                        disabled={currentUser?.userId === u.userId}
                        onChange={e => handleChangeUserType(u, e.target.value)}
                      >
                        <option value="">— Type —</option>
                        {userTypes.map(ut => (
                          <option key={ut.id} value={ut.id}>{ut.name}</option>
                        ))}
                      </select>
                      {u.shop && (
                        <span style={{ fontSize: 12, color: T.t3, fontFamily: FONT.ui }}>🏪 {u.shop.name}, {u.shop.city}</span>
                      )}
                    </div>
                    {/* Row 3: Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {(u.userType?.slug || u.role) !== "PLATFORM_ADMIN" && (
                        <button
                          style={{ ...S.btnImpersonate, opacity: impersonatingId === u.userId ? 0.6 : 1, flex: 1, padding: "9px 12px", fontSize: 12 }}
                          onClick={() => handleImpersonate(u)}
                          disabled={!!impersonatingId}
                        >
                          {impersonatingId === u.userId ? "Loading…" : "⚡ Impersonate"}
                        </button>
                      )}
                      <button
                        style={{ ...S.btnToggle(u.isActive), flex: 1, padding: "9px 12px", fontSize: 12 }}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="admin-pagination" style={S.pagination}>
                <span style={{ fontSize: 12, color: T.t3 }}>
                  Page {currentPage + 1} of {pages} · {total} users
                </span>
                <button
                  style={S.pageBtn(false)}
                  disabled={currentPage === 0}
                  onClick={() => { const o = offset - LIMIT; setOffset(o); fetchUsers(search, roleFilter, o); }}
                >← Prev</button>
                <button
                  style={S.pageBtn(false)}
                  disabled={currentPage >= pages - 1}
                  onClick={() => { const o = offset + LIMIT; setOffset(o); fetchUsers(search, roleFilter, o); }}
                >Next →</button>
              </div>
            )}
          </>
        )}

        {/* ─── VERIFICATIONS TAB ─── */}
        {activeTab === "verifications" && (
          <>
            {verError && (
              <div style={{ background: T.crimsonBg, border: `1.5px solid ${T.crimson}`, borderRadius: 10, padding: "11px 14px", color: T.crimson, fontSize: 13, marginBottom: 16, fontFamily: FONT.ui }}>
                {verError}
              </div>
            )}
            {verSuccess && (
              <div style={{ background: T.emeraldBg, border: `1.5px solid ${T.emerald}`, borderRadius: 10, padding: "11px 14px", color: T.emerald, fontSize: 13, marginBottom: 16, fontFamily: FONT.ui }}>
                {verSuccess}
              </div>
            )}

            {verLoading ? (
              <div style={{ textAlign: "center", padding: 60, color: T.t3, fontFamily: FONT.ui }}>Loading verifications…</div>
            ) : verifications.length === 0 ? (
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.t1, marginBottom: 6, fontFamily: FONT.ui }}>All clear!</div>
                <div style={{ fontSize: 13, color: T.t3, fontFamily: FONT.ui }}>No pending or rejected shop owner applications.</div>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <div className="admin-table-wrap-inner">
                <table style={S.table}>
                  <thead>
                    <tr>
                      {["User", "Email / Phone", "Status", "Registered", "Actions"].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {verifications.map(v => (
                      <>
                        <tr
                          key={v.userId}
                          style={S.row}
                          onMouseEnter={e => e.currentTarget.style.background = `${T.amber}08`}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={S.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Avatar user={v} size={32} />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: T.t1, fontFamily: FONT.ui }}>{v.name || <span style={{ color: T.t4, fontStyle: "italic" }}>No name</span>}</div>
                                {v.verificationStatus === "REJECTED" && v.verificationNote && (
                                  <div style={{ fontSize: 11, color: T.crimson, marginTop: 2 }}>{v.verificationNote}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={S.td}>
                            <div style={{ fontSize: 13, color: T.t2, fontFamily: FONT.ui }}>{v.email || "—"}</div>
                            {v.phone && <div style={{ fontSize: 11, color: T.t3 }}>{v.phone}</div>}
                          </td>
                          <td style={S.td}><VerificationBadge status={v.verificationStatus} /></td>
                          <td style={{ ...S.td, color: T.t3 }}>
                            {v.createdAt ? new Date(v.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <button
                                style={{ background: T.emeraldBg, border: `1px solid ${T.emerald}`, color: T.emerald, borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}
                                onClick={() => handleVerify(v.userId, "APPROVE")}
                              >
                                ✓ Approve
                              </button>
                              <button
                                style={{ background: T.crimsonBg, border: `1px solid ${T.crimson}`, color: T.crimson, borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}
                                onClick={() => { setRejectingId(rejectingId === v.userId ? null : v.userId); setRejectReason(""); setVerError(""); }}
                              >
                                ✗ Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                        {rejectingId === v.userId && (
                          <tr key={`reject-${v.userId}`}>
                            <td colSpan={5} style={{ ...S.td, background: T.crimsonBg, padding: "14px 20px" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: T.crimson, marginBottom: 8, fontFamily: FONT.ui }}>Rejection reason (required)</div>
                              <textarea
                                style={{ width: "100%", background: T.card, border: `1.5px solid ${T.crimson}`, borderRadius: 10, padding: "10px 14px", color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", resize: "vertical", minHeight: 72, boxSizing: "border-box", marginBottom: 10 }}
                                placeholder="Explain why this application is being rejected..."
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                autoFocus
                              />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  style={{ background: T.crimson, border: "none", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}
                                  onClick={() => {
                                    if (!rejectReason.trim()) { setVerError("A rejection reason is required"); return; }
                                    handleVerify(v.userId, "REJECT", rejectReason);
                                  }}
                                >
                                  Confirm Reject
                                </button>
                                <button
                                  style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.t3, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui }}
                                  onClick={() => { setRejectingId(null); setRejectReason(""); }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal
          userTypes={userTypes}
          onClose={() => setShowAddUser(false)}
          onSuccess={handleAddUserSuccess}
        />
      )}
    </div>
  );
}

export default SuperAdminPage;
