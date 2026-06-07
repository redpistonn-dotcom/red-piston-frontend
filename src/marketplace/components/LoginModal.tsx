import { useEffect } from "react";
import LoginPage from "../../pages/LoginPage";

export function LoginModal({ onClose, onLogin }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleLogin = (user) => {
    localStorage.setItem("as_user", JSON.stringify(user));
    const role = user?.userType?.slug || user?.role;
    // Non-customer roles need App.jsx to reinitialise — do a full-page redirect
    // so the route guards and ERP state load correctly.
    if (role === "PLATFORM_ADMIN") {
      window.location.href = "/admin";
      return;
    }
    if (role === "SHOP_OWNER" || role === "SHOP_STAFF") {
      window.location.href = "/dashboard";
      return;
    }
    // Customer — stay on marketplace, just update local state
    onLogin?.(user);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(26,18,5,0.6)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />

      {/* Modal panel — fixed height so no outer scroll */}
      <div style={{
        position: "relative",
        width: "min(92vw, 960px)",
        height: "min(640px, 88vh)",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(26,18,5,0.3)",
        border: "1px solid #E0D5C8",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Close button — solid white, clearly visible */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 200,
            width: 34, height: 34, borderRadius: "50%",
            background: "#FFFFFF",
            border: "1.5px solid #E0D5C8",
            color: "#5C4F40",
            cursor: "pointer", fontSize: 14, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(26,18,5,0.15)",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#BE2B1A"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#BE2B1A"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.color = "#5C4F40"; e.currentTarget.style.borderColor = "#E0D5C8"; }}
        >
          ✕
        </button>

        {/* LoginPage — fills the fixed-height panel, right panel scrolls internally if needed */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <LoginPage onLogin={handleLogin} isModal={true} />
        </div>
      </div>
    </div>
  );
}
