/**
 * API client — thin wrapper around fetch with auth token handling.
 * Rule: access token in MEMORY only, refresh token in httpOnly cookie + localStorage fallback.
 */
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let accessToken: string | null = null;

export const setTokens = (access: string | null, refresh: string | null): void => {
  if (access) accessToken = access;
  if (refresh) {
    try { localStorage.setItem('as_refresh_token', refresh); } catch {}
  }
};

export const clearTokens = (): void => {
  accessToken = null;
  try { localStorage.removeItem('as_refresh_token'); } catch {}
};

export const getAccessToken = (): string | null => accessToken;

// ─── Singleton refresh promise ────────────────────────────────────────────────
let _refreshPromise: Promise<string | null> | null = null;

async function _doRefresh(): Promise<string> {
  // Impersonation sessions have NO refresh token of their own. If we tried to
  // refresh here we'd use the ADMIN's refresh token and silently swap into the
  // admin's (shop-less) context — every shop-scoped endpoint then returns empty
  // while the UI still shows the impersonated user. Treat an expired impersonation
  // token as session-expired so the app prompts a re-enter instead of blanks.
  let isImpersonating = false;
  try { isImpersonating = !!sessionStorage.getItem('as_imp_token'); } catch {}
  if (isImpersonating) {
    clearTokens();
    throw Object.assign(new Error('Impersonation session expired — re-enter from the admin console.'), { code: 'SESSION_EXPIRED' });
  }

  const fallbackToken = (() => {
    try { return localStorage.getItem('as_refresh_token'); } catch { return null; }
  })();

  if (!fallbackToken) {
    clearTokens();
    throw Object.assign(new Error('Session expired. Please login again.'), { code: 'SESSION_EXPIRED' });
  }

  // 65s timeout: the Render free-tier backend spins down after ~15min idle and
  // takes 30-60s to cold-start. The previous 8s abort made every cold start
  // look like a dead session and force-logged users out.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 65000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken: fallbackToken }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeoutId);
    throw Object.assign(new Error('Network error. Could not reach auth server.'), { code: 'NETWORK_ERROR' });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    // Only a genuine auth rejection (401/403 — the refresh token was actually
    // invalid/expired) should end the session. A 5xx or other transient response
    // happens when the backend is restarting during a deploy or cold-starting;
    // logging the user out there is the "refresh → logout after deploy" bug.
    // Keep the tokens and let the caller retry once the backend is back.
    if (res.status === 401 || res.status === 403) {
      clearTokens();
      throw Object.assign(new Error('Session expired. Please login again.'), { code: 'SESSION_EXPIRED' });
    }
    throw Object.assign(new Error('Server is restarting — please try again in a moment.'), { code: 'NETWORK_ERROR' });
  }

  const data = await res.json();
  accessToken = data.accessToken || data.data?.accessToken;
  // Persist the ROTATED refresh token. The httpOnly cookie is a third-party
  // cookie in production (Vercel ↔ Render are different sites) and gets blocked
  // by Safari/modern-Chrome, so it can't be relied on for the next refresh.
  // Keeping the localStorage fallback fresh is what makes the session survive
  // past the first refresh — previously we deleted it, so the 2nd refresh found
  // no token and silently killed the session (app looked logged-in, data empty).
  const newRefresh = data.refreshToken || data.data?.refreshToken;
  if (newRefresh) {
    try { localStorage.setItem('as_refresh_token', newRefresh); } catch {}
  }
  return accessToken as string;
}

function refreshAccessToken(): Promise<string | null> {
  if (!_refreshPromise) {
    _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null; });
  }
  return _refreshPromise;
}

export async function silentRefresh(): Promise<string | null> {
  try { return await refreshAccessToken(); } catch { return null; }
}

// ─── GET request deduplication ───────────────────────────────────────────────
// If InventoryPage mounts while syncFromAPI is already fetching /api/shop/inventory,
// both would fire separately. This map collapses concurrent identical GETs into
// one inflight promise — the second caller gets the same result, zero extra RTT.
const _inflight = new Map<string, Promise<unknown>>();

// ─── Core request function ────────────────────────────────────────────────────
interface RequestOptions extends RequestInit {
  _isRetry?: boolean;
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const method = (options.method || 'GET').toUpperCase();

  if (method === 'GET' && !options._isRetry) {
    const cached = _inflight.get(url);
    if (cached) return cached as Promise<T>;
    const promise = _doRequest<T>(url, options);
    _inflight.set(url, promise);
    promise.finally(() => _inflight.delete(url));
    return promise;
  }
  return _doRequest<T>(url, options);
}

// Regular requests have no timeout by default, which is the other half of
// the "dashboard stuck on skeletons forever" bug: if the backend hangs on a
// dead pooled DB/Redis connection (see backend prisma.js/cache.js fixes),
// a plain fetch() just sits there — no error ever fires, so a loading
// spinner/skeleton never resolves either way. 30s comfortably covers a
// Render cold start (the refresh call already succeeded by the time these
// fire in practice) while still giving the UI a bounded failure to react to.
const REQUEST_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function _doRequest<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(url, { ...options, headers, credentials: 'include' }, REQUEST_TIMEOUT_MS);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw Object.assign(new Error('Request timed out. Please try again.'), {
        status: 0, code: 'TIMEOUT',
      });
    }
    throw Object.assign(new Error('Network error. Please check your connection.'), {
      status: 0, code: 'NETWORK_ERROR',
    });
  }

  if (res.status === 401 && !options._isRetry) {
    const body = await res.json().catch(() => ({}));
    const code = body?.error?.code || body?.code || '';
    if (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' || code === 'NO_TOKEN') {
      try {
        const newToken = await refreshAccessToken();
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetchWithTimeout(url, { ...options, headers, credentials: 'include', _isRetry: true } as RequestOptions, REQUEST_TIMEOUT_MS);
      } catch (refreshErr: any) {
        // Only end the session when the refresh token was actually REJECTED.
        // A network error / cold-start timeout is transient — the user is still
        // authenticated; let the request fail and be retried by the caller.
        if (refreshErr?.code === 'SESSION_EXPIRED') {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
          throw Object.assign(new Error('Session expired. Please login again.'), {
            status: 401, code: 'SESSION_EXPIRED',
          });
        }
        throw Object.assign(new Error('Server is waking up — please try again in a moment.'), {
          status: 0, code: 'NETWORK_ERROR',
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
  return data as T;
}

// ─── Typed convenience methods ────────────────────────────────────────────────
export const api = {
  get:    <T = unknown>(path: string, params?: Record<string, string>) =>
            apiRequest<T>(params ? `${path}?${new URLSearchParams(params)}` : path),
  post:   <T = unknown>(path: string, body?: unknown) =>
            apiRequest<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T = unknown>(path: string, body?: unknown) =>
            apiRequest<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T = unknown>(path: string, body?: unknown) =>
            apiRequest<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string) =>
            apiRequest<T>(path, { method: 'DELETE' }),
};
