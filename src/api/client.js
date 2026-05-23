// API client — thin wrapper around fetch with auth token handling
// Rule: access token in MEMORY only, refresh token in httpOnly cookie + localStorage fallback
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── In-memory token store (NOT localStorage — prevents XSS token theft) ────
let accessToken = null;

export const setTokens = (access, refresh) => {
  if (access) accessToken = access;
  if (refresh) {
    try { localStorage.setItem('as_refresh_token', refresh); } catch {}
  }
};

export const clearTokens = () => {
  accessToken = null;
  try { localStorage.removeItem('as_refresh_token'); } catch {}
};

export const getAccessToken = () => accessToken;

// ─── Singleton refresh promise ────────────────────────────────────────────────
// Prevents multiple simultaneous refresh calls (token rotation means only one
// can succeed — subsequent ones get INVALID_REFRESH).
// All concurrent 401 retries share the same in-flight promise.
let _refreshPromise = null;

async function _doRefresh() {
  const fallbackToken = (() => {
    try { return localStorage.getItem('as_refresh_token'); } catch { return null; }
  })();

  if (!fallbackToken) {
    clearTokens();
    throw Object.assign(new Error('Session expired. Please login again.'), { code: 'SESSION_EXPIRED' });
  }

  // 8-second abort controller so a slow/unreachable backend never hangs the app.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let res;
  try {
    res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // sends httpOnly cookie automatically
      body: JSON.stringify({ refreshToken: fallbackToken }),
      signal: controller.signal,
    });
  } catch {
    // Network error or timeout — do NOT clear tokens; the backend may be temporarily
    // unavailable. The stored refresh token is still potentially valid.
    clearTimeout(timeoutId);
    throw Object.assign(new Error('Network error. Could not reach auth server.'), { code: 'NETWORK_ERROR' });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    // Server explicitly rejected the token (401/403) — it is genuinely invalid.
    clearTokens();
    throw Object.assign(new Error('Session expired. Please login again.'), { code: 'SESSION_EXPIRED' });
  }

  const data = await res.json();
  accessToken = data.accessToken || data.data?.accessToken;
  // Rotate the stored refresh token
  if (data.refreshToken) {
    try { localStorage.setItem('as_refresh_token', data.refreshToken); } catch {}
  }
  return accessToken;
}

function refreshAccessToken() {
  // Return the in-flight promise if one is already running.
  // This is the key fix: 10 simultaneous 401s all wait on ONE refresh call.
  if (!_refreshPromise) {
    _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null; });
  }
  return _refreshPromise;
}

/**
 * Silent session restore — call once on app startup when a user is in
 * localStorage but accessToken is null (page reload).
 * Returns the new access token on success, null on failure.
 */
export async function silentRefresh() {
  try {
    return await refreshAccessToken();
  } catch {
    return null;
  }
}

// ─── Core request function ────────────────────────────────────────────────────
export async function apiRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(url, { ...options, headers, credentials: 'include' });
  } catch {
    throw Object.assign(new Error('Network error. Please check your connection.'), {
      status: 0, code: 'NETWORK_ERROR',
    });
  }

  // ── Auto-refresh on 401 (one retry per request) ───────────────────────────
  if (res.status === 401 && !options._isRetry) {
    const body = await res.json().catch(() => ({}));
    const code = body?.error?.code || body?.code || '';

    if (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' || code === 'NO_TOKEN') {
      try {
        const newToken = await refreshAccessToken(); // deduped singleton
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, { ...options, headers, credentials: 'include', _isRetry: true });
      } catch {
        // Refresh failed — fire event so App.jsx can force logout
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        throw Object.assign(new Error('Session expired. Please login again.'), {
          status: 401, code: 'SESSION_EXPIRED',
        });
      }
    }
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const errMsg = data?.error?.message || data?.error || data?.message || 'Request failed';
    const errCode = data?.error?.code || data?.code || `HTTP_${res.status}`;
    throw Object.assign(new Error(errMsg), { status: res.status, code: errCode, data });
  }
  return data;
}

// ─── Convenience methods ──────────────────────────────────────────────────────
export const api = {
  get:    (path, params) => apiRequest(params ? `${path}?${new URLSearchParams(params)}` : path),
  post:   (path, body)   => apiRequest(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => apiRequest(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body)   => apiRequest(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)         => apiRequest(path, { method: 'DELETE' }),
};
