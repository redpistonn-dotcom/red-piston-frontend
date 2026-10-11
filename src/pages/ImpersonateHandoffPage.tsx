import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";

/**
 * Landing point for admin.app.redpiston's "Login as" — that app has no
 * ERP/marketplace routes of its own, so it redirects the browser here with a
 * one-time exchange code instead of navigating internally. We trade that
 * code for the real impersonation token (see backend's
 * lib/impersonationHandoff.js) and hand off to App.tsx's
 * handleExternalImpersonate, which signs the browser in and routes to the
 * target user's own default page.
 */
export default function ImpersonateHandoffPage({ onExternalImpersonate }) {
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) { setError("Missing handoff code."); return; }
    (async () => {
      try {
        const res: any = await api.post("/api/auth/exchange-impersonation", { code });
        onExternalImpersonate(res.data.user, res.data.accessToken);
      } catch (e: any) {
        setError(e?.message || "This link has expired. Please go back to the admin console and try again.");
      }
    })();
  }, [onExternalImpersonate]);

  const adminUrl = import.meta.env.VITE_ADMIN_URL || "https://admin.redpiston.in";

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "'Inter', sans-serif", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 15, color: "#BE2B1A", fontWeight: 700, maxWidth: 420 }}>{error}</div>
        <a href={`${adminUrl}/admin`} style={{ color: "#7C3AED", fontWeight: 600, textDecoration: "none" }}>Return to Admin Console</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", color: "#5C4F40" }}>
      Signing you in…
    </div>
  );
}
