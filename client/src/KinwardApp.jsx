import { useState, useEffect } from "react";
import KinwardWizard from "./KinwardWizard";
import KinwardChat from "./KinwardChat";
import KinwardSettings from "./KinwardSettings";

/* ─────────────────────────────────────────────
   KINWARD APP ROUTER
   
   Boot sequence:
   1. Hit /api/system/status
   2. If setup_complete === false → Wizard
   3. If setup_complete === true  → Chat (profile gate)
   
   Admin escape hatch:
   - From the chat sidebar, admins can access Settings
   - Settings re-auth requires admin PIN
   - Settings panel can re-run parts of setup, manage
     profiles, models, environment mode, etc.
   ───────────────────────────────────────────── */

const API = "/api";

export default function KinwardApp() {
  const [status, setStatus] = useState(null);    // null = loading, object = loaded
  const [error, setError] = useState(null);
  const [view, setView] = useState("loading");   // loading | wizard | chat | settings
  const [settingsUser, setSettingsUser] = useState(null); // authenticated admin for settings

  // ── Check system status on boot ──
  useEffect(() => {
    checkStatus();
  }, []);

  // ── Auto-retry when in error state ──
  useEffect(() => {
    if (view !== "error") return;
    const retryTimer = setInterval(() => checkStatus(), 5000);
    return () => clearInterval(retryTimer);
  }, [view]);

  async function checkStatus() {
    setView("loading");
    setError(null);
    try {
      const res = await fetch(`${API}/system/status`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setStatus(data);
      setView(data.setupComplete ? "chat" : "wizard");
    } catch (err) {
      setError(err.message);
      setView("error");
    }
  }

  // ── Wizard completed → flip to chat ──
  function handleSetupComplete() {
    setView("chat");
  }

  // ── Admin requests settings (from chat sidebar) ──
  function handleOpenSettings(user) {
    setSettingsUser(user);
    setView("settings");
  }

  // ── Return to chat from settings ──
  function handleCloseSettings() {
    setSettingsUser(null);
    setView("chat");
  }

  // ── Loading state ──
  if (view === "loading") {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Starting Kinward...</p>
      </div>
    );
  }

  // ── Error state (server not reachable) ──
  if (view === "error") {
    const isNetwork = error && (error.includes("fetch") || error.includes("Failed") || error.includes("NetworkError"));
    return (
      <div style={styles.center}>
        <div style={styles.errorIcon}>💤</div>
        <h2 style={styles.errorTitle}>{isNetwork ? "Lumina is waking up..." : "Can't reach Kinward"}</h2>
        <p style={styles.errorBody}>
          {isNetwork
            ? "The server isn't responding yet. This page will reconnect automatically."
            : "Something went wrong connecting to the server."}
        </p>
        {error && <p style={styles.errorDetail}>{error}</p>}
        <button style={styles.retryBtn} onClick={checkStatus}>
          Try Again
        </button>
        <p style={{ fontSize: 11, color: "#999", fontFamily: "'DM Mono', monospace" }}>
          Retrying every 5 seconds...
        </p>
      </div>
    );
  }

  // ── Wizard (first-time setup) ──
  if (view === "wizard") {
    return <KinwardWizard onComplete={handleSetupComplete} />;
  }

  // ── Settings (admin-only, re-entered from chat) ──
  if (view === "settings") {
    return (
      <KinwardSettings user={settingsUser} onBack={handleCloseSettings} />
    );
  }

  // ── Chat (default post-setup experience) ──
  return <KinwardChat onOpenSettings={handleOpenSettings} />;
}


/* ── Inline styles (keeps this self-contained) ── */
const styles = {
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
    background: "#FAF6F1",
    fontFamily: "'DM Mono', monospace",
    gap: 16,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #E8E4DF",
    borderTop: "3px solid #D4622B",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 14,
    color: "#6B6B6B",
    fontFamily: "'DM Mono', monospace",
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  errorTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 20,
    fontWeight: 500,
    color: "#2C2C2C",
    letterSpacing: 2,
  },
  errorBody: {
    fontSize: 14,
    color: "#6B6B6B",
    textAlign: "center",
    lineHeight: 1.6,
  },
  code: {
    background: "#E8E4DF",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'DM Mono', monospace",
  },
  errorDetail: {
    fontSize: 12,
    color: "#C44B4B",
    fontFamily: "'DM Mono', monospace",
  },
  retryBtn: {
    marginTop: 12,
    padding: "10px 28px",
    background: "#D4622B",
    color: "white",
    border: "none",
    borderRadius: 10,
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
    cursor: "pointer",
  },
  settingsRoot: {
    height: "100vh",
    width: "100vw",
    background: "#FAF6F1",
    fontFamily: "'DM Mono', monospace",
    display: "flex",
    flexDirection: "column",
  },
  settingsHeader: {
    padding: "20px 32px",
    borderBottom: "1px solid #E8E4DF",
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  backBtn: {
    background: "none",
    border: "none",
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    color: "#D4622B",
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: 8,
  },
  settingsTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: 3,
    color: "#2C2C2C",
  },
  settingsBody: {
    flex: 1,
    padding: 32,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 20,
    alignContent: "start",
    overflowY: "auto",
  },
  card: {
    background: "#FFFDF9",
    border: "1px solid #E8E4DF",
    borderRadius: 14,
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    cursor: "pointer",
    transition: "border-color 0.2s",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "#2C2C2C",
  },
  cardDesc: {
    fontSize: 12,
    color: "#6B6B6B",
    fontFamily: "'Lora', Georgia, serif",
  },
  cardBadge: {
    marginTop: 8,
    fontSize: 10,
    color: "#D4622B",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
};
