/**
 * Kinward API Client
 * Uses relative URLs — Vite proxies /api to the backend in dev.
 */

async function api(endpoint, options = {}) {
  const res = await fetch(endpoint, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

// --- System ---
export const getStatus = () => api("/api/system/status");
export const getHardware = () => api("/api/system/hardware");
export const setConfig = (key, value) =>
  api("/api/system/config", { method: "POST", body: { key, value } });
export const completeSetup = () =>
  api("/api/system/setup-complete", { method: "POST" });

// --- Profiles ---
export const getProfiles = () => api("/api/profiles");
export const createProfile = (data) =>
  api("/api/profiles", { method: "POST", body: data });
export const batchCreateProfiles = (admin, familyMembers) =>
  api("/api/profiles/setup-batch", {
    method: "POST",
    body: { admin, familyMembers },
  });
export const authProfile = (id, pin) =>
  api(`/api/profiles/${id}/auth`, { method: "POST", body: { pin } });

// --- Models ---
export const getModels = () => api("/api/models");
export const getRecommendation = () => api("/api/models/recommend");
export const installModel = (ollamaName, displayName, category) =>
  api("/api/models/install", {
    method: "POST",
    body: { ollamaName, displayName, category },
  });
export const deleteModel = (id) =>
  api(`/api/models/${id}`, { method: "DELETE" });

// --- Chat ---
export const getSessions = (profileId) =>
  api(`/api/chat/sessions?profileId=${profileId}`);
export const createSession = (profileId, category) =>
  api("/api/chat/sessions", { method: "POST", body: { profileId, category } });

export async function sendMessage(sessionId, content, onToken) {
  const res = await fetch("/api/chat/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, content }),
  });

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

// --- WebSocket ---
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
