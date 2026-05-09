/**
 * Single source of truth for client-side session state.
 *
 * Owns the token storage key, getters/setters, and the auth-aware
 * fetch wrappers used across the app. Components and API helpers
 * MUST import from here instead of reading sessionStorage directly
 * or calling raw fetch() against /api routes.
 *
 * This consolidates what used to be duplicated between api.js and
 * components/shared.jsx — both now delegate here.
 */

const TOKEN_KEY = "kinward_session";

// ─── Token storage ─────────────────────────────────────────────────────────

export function getToken() {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw);
    if (!token) return null;
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function setToken(token, expiresAt = null) {
  if (!token) return clearToken();
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiresAt }));
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// ─── Auth-expired event bus ────────────────────────────────────────────────
// Components can listen via `window.addEventListener("kinward:auth-expired", ...)`
// to bounce back to the gate when the session dies.

export function notifyAuthExpired(reason = "session_expired") {
  try {
    window.dispatchEvent(new CustomEvent("kinward:auth-expired", { detail: reason }));
  } catch {}
}

// ─── authFetch — drop-in fetch() replacement that attaches the token ───────
// Returns the raw Response so callers can stream or inspect status. Throws
// only on network failure, not on HTTP error codes (matches fetch semantics).
//
// On 401 with reason="admin_reauth_required", does NOT clear the token.
// On any other 401, clears token + dispatches auth-expired so the app
// can return to the gate.

export async function authFetch(input, init = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    // Peek at the body without consuming it — clone first
    let body = {};
    try {
      body = await res.clone().json();
    } catch {}
    if (body.reason !== "admin_reauth_required") {
      clearToken();
      notifyAuthExpired("session_expired");
    }
  }

  return res;
}

// ─── apiJson — convenience wrapper for JSON request/response ───────────────
// Auto-stringifies body, parses response JSON, throws on non-2xx with the
// server's error message. For the common case of simple JSON endpoints.
//
// Use authFetch directly when you need streaming, FormData uploads, or
// custom response handling.

export async function apiJson(path, options = {}) {
  // Allow paths with or without /api prefix — normalize to always use it
  const url = path.startsWith("/api") ? path : `/api${path.startsWith("/") ? path : "/" + path}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const res = await authFetch(url, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    const body = await res.json().catch(() => ({}));
    if (body.reason === "admin_reauth_required") {
      const err = new Error(body.error || "Admin re-authentication required");
      err.reason = "admin_reauth_required";
      throw err;
    }
    throw new Error(body.error || "Session expired. Please sign in again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json();
}
