import { useEffect } from "react";
import { createPortal } from "react-dom";
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

  return createPortal(
    // Full-screen login — no background header, footer at bottom.
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#FAF6F0", display: "flex",
    }}>
      {/* Close button — solid white, clearly visible, pinned to the screen corner */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "fixed", top: 14, right: 20, zIndex: 200,
          width: 36, height: 36, borderRadius: "50%",
          background: "#FFFFFF",
          border: "1.5px solid #E0D5C8",
          color: "#5C4F40",
          cursor: "pointer", fontSize: 16, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(26,18,5,0.10)",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#BE2B1A"; e.currentTarget.style.borderColor = "#BE2B1A"; e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.borderColor = "#E0D5C8"; e.currentTarget.style.color = "#5C4F40"; e.currentTarget.style.transform = "scale(1)"; }}
      >
        ✕
      </button>

      {/* LoginPage — fills the whole screen; scrolls internally on tall steps */}
      <LoginPage onLogin={handleLogin} isModal={true} />
    </div>,
    document.body
  );
}
