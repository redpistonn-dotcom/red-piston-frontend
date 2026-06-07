/**
 * API client — thin wrapper around fetch with auth token handling.
 * Rule: access token in MEMORY only, refresh token in httpOnly cookie + localStorage fallback.
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  const fallbackToken = (() => {
    try { return localStorage.getItem('as_refresh_token'); } catch { return null; }
  })();

  if (!fallbackToken) {
    clearTokens();
    throw Object.assign(new Error('Session expired. Please login again.'), { code: 'SESSION_EXPIRED' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

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
    clearTokens();
    throw Object.assign(new Error('Session expired. Please login again.'), { code: 'SESSION_EXPIRED' });
  }

  const data = await res.json();
  accessToken = data.accessToken || data.data?.accessToken;
  if (data.refreshToken) {
    try { localStorage.setItem('as_refresh_token', data.refreshToken); } catch {}
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

// ─── Core request function ────────────────────────────────────────────────────
interface RequestOptions extends RequestInit {
  _isRetry?: boolean;
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, credentials: 'include' });
  } catch {
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
        res = await fetch(url, { ...options, headers, credentials: 'include', _isRetry: true } as RequestOptions);
      } catch {
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
