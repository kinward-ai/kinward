import { useState, useEffect } from "react";
import KinwardWizard from "./KinwardWizard";
import KinwardChat from "./KinwardChat";
import KinwardSettings from "./KinwardSettings";
import KinwardDashboard from "./KinwardDashboard";
import { ProfileGate } from "./components/ProfileGate";
import { AdminReauthGate } from "./components/AdminReauthGate";
import { logout as apiLogout, clearToken, getMe } from "./api";

/* ─────────────────────────────────────────────
   KINWARD APP ROUTER

   Boot sequence:
   1. Hit /api/system/status
   2. If setup_complete === false → Wizard
   3. Otherwise → ProfileGate → Dashboard → Chat/Settings

   Navigation model:
   - ProfileGate: pick profile + PIN
   - Dashboard: family board, memory highlights, start chat, recent sessions
   - Chat: active conversation (with back-to-home button)
   - Settings: admin-only, from dashboard or chat sidebar
   ───────────────────────────────────────────── */

const API = "/api";

export default function KinwardApp() {
  const [status, setStatus] = useState(null);          // null = loading, object = loaded
  const [error, setError] = useState(null);
  const [view, setView] = useState("loading");        // loading | wizard | error | gate | dashboard | chat | settings
  const [user, setUser] = useState(null);              // authenticated profile
  const [settingsUser, setSettingsUser] = useState(null);
  const [navIntent, setNavIntent] = useState(null);   // carries intent into chat view

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

  // ── Global auth-expired listener (session timeout, revoked, etc.) ──
  useEffect(() => {
    const handler = (e) => {
      // Admin re-auth required is handled inline by the Settings view; don't blow away the session.
      if (e.detail === "admin_reauth_required") return;
      // Session expired entirely — clear user, bounce to gate.
      setUser(null);
      setNavIntent(null);
      setView("gate");
    };
    window.addEventListener("kinward:auth-expired", handler);
    return () => window.removeEventListener("kinward:auth-expired", handler);
  }, []);

  async function checkStatus() {
    setView("loading");
    setError(null);
    try {
      const res = await fetch(`${API}/system/status`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setStatus(data);
      setView(data.setupComplete ? "gate" : "wizard");
    } catch (err) {
      setError(err.message);
      setView("error");
    }
  }

  // ── Wizard completed → flip to profile gate ──
  function handleSetupComplete() {
    setView("gate");
  }

  // ── Profile authenticated → land on dashboard ──
  function handleLogin(profile) {
    setUser(profile);
    setView("dashboard");
  }

  // ── Lock (from any logged-in view) → revoke session, back to gate ──
  async function handleLock() {
    try {
      await apiLogout();
    } catch {
      // Even if server logout fails, clear client state
      clearToken();
    }
    setUser(null);
    setNavIntent(null);
    setView("gate");
  }

  // ── Start a new chat with a specific category ──
  function handleStartChat(category) {
    setNavIntent({ type: "new", category, stamp: Date.now() });
    setView("chat");
  }

  // ── Resume an existing chat session ──
  function handleOpenSession(session) {
    setNavIntent({ type: "resume", session, stamp: Date.now() });
    setView("chat");
  }

  // ── Back to dashboard from chat ──
  function handleBackToDashboard() {
    setNavIntent(null);
    setView("dashboard");
  }

  // ── Admin requests settings (from dashboard or chat sidebar) ──
  // Route via the re-auth gate first. Freshness is checked against the server
  // so expiry of the 5-minute window bumps the user back to the gate automatically.
  async function handleOpenSettings(profile) {
    const target = profile || user;
    setSettingsUser(target);
    try {
      const me = await getMe();
      if (me.adminFresh) {
        setView("settings");
      } else {
        setView("settings_reauth");
      }
    } catch {
      // If we can't check, assume we need to re-auth
      setView("settings_reauth");
    }
  }

  // ── Re-auth succeeded → enter settings ──
  function handleReauthSuccess() {
    setView("settings");
  }

  // ── Return from settings (back to dashboard) ──
  function handleCloseSettings() {
    setSettingsUser(null);
    setView("dashboard");
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

  // ── Profile Gate (pick profile + PIN) ──
  if (view === "gate") {
    return <ProfileGate onLogin={handleLogin} />;
  }

  // ── Dashboard (family home screen) ──
  if (view === "dashboard" && user) {
    return (
      <KinwardDashboard
        user={user}
        onStartChat={handleStartChat}
        onOpenSession={handleOpenSession}
        onLock={handleLock}
        onOpenSettings={handleOpenSettings}
      />
    );
  }

  // ── Settings re-auth gate (admin PIN required before entering Settings) ──
  if (view === "settings_reauth" && settingsUser) {
    return (
      <AdminReauthGate
        profile={settingsUser}
        onSuccess={handleReauthSuccess}
        onCancel={handleCloseSettings}
        title="Enter Settings"
        subtitle={`For everyone's safety, enter your PIN to unlock the admin area, ${settingsUser.name}.`}
      />
    );
  }

  // ── Settings (admin-only, requires fresh PIN verify) ──
  if (view === "settings") {
    return (
      <KinwardSettings user={settingsUser} onBack={handleCloseSettings} />
    );
  }

  // ── Chat (active conversation) ──
  if (view === "chat" && user) {
    return (
      <KinwardChat
        user={user}
        navIntent={navIntent}
        onOpenSettings={handleOpenSettings}
        onBackToDashboard={handleBackToDashboard}
        onLock={handleLock}
      />
    );
  }

  // ── Fallback: shouldn't reach here ──
  return null;
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
