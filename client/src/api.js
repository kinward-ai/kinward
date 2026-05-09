/**
 * Kinward API Client — typed helpers for backend endpoints.
 *
 * Token storage and auth-aware fetch live in lib/session.js. This file
 * just defines the endpoint surface area.
 */

import {
  apiJson,
  authFetch,
  getToken,
  setToken,
  clearToken,
  notifyAuthExpired,
} from "./lib/session";

// Re-export session primitives so existing callers keep working
export { getToken, setToken, clearToken };

// onAuthExpired listener support (for any code that already uses this)
const reauthListeners = new Set();
export function onAuthExpired(listener) {
  reauthListeners.add(listener);
  return () => reauthListeners.delete(listener);
}
window.addEventListener("kinward:auth-expired", (e) => {
  for (const fn of reauthListeners) {
    try { fn(e.detail); } catch {}
  }
});

// Export the main JSON helper as `api` for callers that want it
export const api = apiJson;

// ─── System ────────────────────────────────────────────────────────────────
export const getStatus = () => apiJson("/api/system/status");
export const getHardware = () => apiJson("/api/system/hardware");
export const autoDetect = () => apiJson("/api/system/auto-detect");
export const getOllamaStatus = () => apiJson("/api/system/ollama-status");
export const setConfig = (key, value) =>
  apiJson("/api/system/config", { method: "POST", body: { key, value } });
export const completeSetup = () =>
  apiJson("/api/system/setup-complete", { method: "POST" });

// ─── Profiles / Auth ───────────────────────────────────────────────────────
export const getProfiles = () => apiJson("/api/profiles");
export const createProfile = (data) =>
  apiJson("/api/profiles", { method: "POST", body: data });
export const batchCreateProfiles = (admin, familyMembers) =>
  apiJson("/api/profiles/setup-batch", {
    method: "POST",
    body: { admin, familyMembers },
  });

/**
 * Authenticate with PIN. On success, stores the session token.
 * Returns { authenticated, token, expiresAt, profile }.
 */
export async function authProfile(id, pin) {
  const result = await apiJson(`/api/profiles/${id}/auth`, {
    method: "POST",
    body: { pin },
  });
  if (result.token) {
    setToken(result.token, result.expiresAt);
  }
  return result;
}

/** Re-verify PIN to refresh the admin freshness stamp. Reuses session token. */
export const reverifyPin = (profileId, pin) =>
  apiJson(`/api/profiles/${profileId}/reverify`, {
    method: "POST",
    body: { pin },
  });

export async function logout() {
  try {
    await apiJson("/api/profiles/logout", { method: "POST" });
  } catch {
    // even if server call fails, clear local state
  } finally {
    clearToken();
  }
}

export const getMe = () => apiJson("/api/profiles/me");

// ─── Models ────────────────────────────────────────────────────────────────
export const getModels = () => apiJson("/api/models");
export const getCatalog = () => apiJson("/api/models/catalog");
export const getRecommendation = () => apiJson("/api/models/recommend");
export const installModel = (ollamaName, displayName, category) =>
  apiJson("/api/models/install", {
    method: "POST",
    body: { ollamaName, displayName, category },
  });
export const deleteModel = (id) =>
  apiJson(`/api/models/${id}`, { method: "DELETE" });

// ─── Chat ──────────────────────────────────────────────────────────────────
export const getSessions = () => apiJson("/api/chat/sessions");
export const createSession = (category) =>
  apiJson("/api/chat/sessions", { method: "POST", body: { category } });

/**
 * Send a chat message and stream the response via SSE.
 * Uses authFetch so the session token is attached automatically.
 */
export async function sendMessage(sessionId, content, onToken) {
  const res = await authFetch("/api/chat/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, content }),
  });

  if (res.status === 401) {
    throw new Error("Session expired. Please sign in again.");
  }
  if (!res.ok) {
    throw new Error(`Chat error ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.token && onToken) onToken(data.token);
        if (data.done) return data;
      } catch {}
    }
  }
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export const getDashboard = (profileId) => apiJson(`/api/dashboard/${profileId}`);

// ─── Family Board ──────────────────────────────────────────────────────────
export const getBoardPosts = () => apiJson("/api/board");
export const getPendingPosts = () => apiJson("/api/board/pending");
export const getPendingCount = () => apiJson("/api/board/pending/count");
export const createPost = (data) =>
  apiJson("/api/board", { method: "POST", body: data });
export const approvePost = (postId) =>
  apiJson(`/api/board/${postId}/approve`, { method: "PUT" });
export const declinePost = (postId, reason) =>
  apiJson(`/api/board/${postId}/decline`, { method: "PUT", body: { reason } });
export const editPost = (postId, updates) =>
  apiJson(`/api/board/${postId}`, { method: "PUT", body: updates });
export const deletePost = (postId) =>
  apiJson(`/api/board/${postId}`, { method: "DELETE" });
export const reactToPost = (postId, emoji) =>
  apiJson(`/api/board/${postId}/react`, { method: "POST", body: { emoji } });

// ─── Audit log ─────────────────────────────────────────────────────────────
export const getAuditLog = (opts = {}) => {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", opts.limit);
  if (opts.offset) params.set("offset", opts.offset);
  if (opts.eventType) params.set("eventType", opts.eventType);
  const qs = params.toString();
  return apiJson(`/api/audit${qs ? "?" + qs : ""}`);
};

// ─── Re-export streaming primitives for components that need raw fetch ─────
// Components doing file uploads or custom streaming should use authFetch
// directly so the token gets attached without going through JSON parsing.
export { authFetch };

// ─── WebSocket ─────────────────────────────────────────────────────────────
export function connectWS(onMessage) {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {}
  };
  return ws;
}
