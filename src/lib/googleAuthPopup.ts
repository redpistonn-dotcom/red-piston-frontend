// Plain OAuth2 popup flow against Google's classic authorization endpoint.
// Avoids @react-oauth/google / Google Identity Services' internal relay
// (postMessage + storage-access handshake), which Brave Shields and similar
// anti-fingerprinting blockers break mid-flow.

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const MESSAGE_TYPE = "google-oauth-result";

export function openGoogleAuthPopup(): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin;
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: "openid email profile",
      prompt: "select_account",
      state,
    });

    const width = 480, height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      `${GOOGLE_AUTH_URL}?${params}`,
      "google-oauth",
      `width=${width},height=${height},left=${left},top=${top}`
    );
    if (!popup) { reject(new Error("popup_blocked")); return; }

    let settled = false;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearInterval(pollTimer);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== MESSAGE_TYPE || event.data.state !== state) return;
      settled = true;
      cleanup();
      try { popup.close(); } catch { /* already closed */ }
      if (event.data.access_token) resolve(event.data.access_token);
      else reject(new Error(event.data.error || "oauth_failed"));
    };
    window.addEventListener("message", onMessage);

    const pollTimer = setInterval(() => {
      if (popup.closed) {
        cleanup();
        if (!settled) reject(new Error("popup_closed"));
      }
    }, 500);
  });
}

/**
 * Called on every page load. If this window is the OAuth popup returning
 * from Google (opener present, token/error in the hash), relay the result
 * to the opener and close self. Returns true when it handled a redirect
 * (caller should skip the normal app render in that case).
 */
export function handleGoogleAuthRedirect(): boolean {
  if (!window.opener || window.opener === window) return false;
  const hash = window.location.hash;
  if (!hash || (!hash.includes("access_token") && !hash.includes("error"))) return false;

  const params = new URLSearchParams(hash.slice(1));
  window.opener.postMessage(
    {
      type: MESSAGE_TYPE,
      access_token: params.get("access_token"),
      error: params.get("error"),
      state: params.get("state"),
    },
    window.location.origin
  );
  window.close();
  return true;
}
