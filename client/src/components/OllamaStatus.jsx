import { useState, useEffect, useRef } from "react";
import { BRAND } from "./shared";

/**
 * OllamaStatus — banner that shows when Ollama is offline or degraded.
 * Polls /api/system/ollama-status every 10s. Hides itself when healthy.
 *
 * Props:
 *   onRetry() — optional callback when user clicks retry
 */

const POLL_INTERVAL = 10000;

const STATES = {
  ready: null, // no banner
  offline: {
    icon: "💤",
    title: "Lumina is sleeping",
    detail: "Ollama isn't running. Start it or check that it's installed.",
    color: BRAND.orange,
    bg: "#FFF5EE",
  },
  "no-models": {
    icon: "📦",
    title: "No models installed",
    detail: "Ollama is running, but there are no AI models loaded. Go to Settings to install one.",
    color: "#5B8FB9",
    bg: "#EEF5FA",
  },
  error: {
    icon: "⚠️",
    title: "Something's wrong",
    detail: "Ollama is having trouble. Check the console for details.",
    color: BRAND.red,
    bg: "#FFF0F0",
  },
  checking: null, // no banner while checking
};

export function OllamaStatus({ onRetry }) {
  const [status, setStatus] = useState(null); // null = not yet checked
  const [retrying, setRetrying] = useState(false);
  const intervalRef = useRef(null);

  async function checkStatus() {
    try {
      const res = await fetch("/api/system/ollama-status");
      if (!res.ok) throw new Error("Server unreachable");
      const data = await res.json();
      setStatus(data.state);
    } catch {
      setStatus("offline");
    }
  }

  useEffect(() => {
    checkStatus();
    intervalRef.current = setInterval(checkStatus, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function handleRetry() {
    setRetrying(true);
    await checkStatus();
    if (onRetry) onRetry();
    setTimeout(() => setRetrying(false), 1000);
  }

  // Don't render anything when healthy or still checking
  if (!status || status === "ready" || status === "checking") return null;

  const state = STATES[status];
  if (!state) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: state.bg,
        borderLeft: `4px solid ${state.color}`,
        borderRadius: 8,
        margin: "0 16px 12px 16px",
        fontFamily: "'Lora', Georgia, serif",
        fontSize: 14,
        animation: "kw-fadeIn 0.3s ease",
      }}
    >
      <span style={{ fontSize: 24, flexShrink: 0 }}>{state.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: state.color, marginBottom: 2 }}>
          {state.title}
        </div>
        <div style={{ color: BRAND.slate, fontSize: 13 }}>{state.detail}</div>
      </div>
      <button
        onClick={handleRetry}
        disabled={retrying}
        style={{
          padding: "6px 14px",
          border: `1px solid ${state.color}`,
          borderRadius: 6,
          background: "white",
          color: state.color,
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          fontWeight: 500,
          cursor: retrying ? "default" : "pointer",
          opacity: retrying ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        {retrying ? "Checking..." : "Retry"}
      </button>
    </div>
  );
}
