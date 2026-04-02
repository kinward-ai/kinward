import { useState, useEffect, useRef } from "react";
import { api, BRAND as B } from "./shared";
import { connectWS } from "../api";

/**
 * ModelManager — in-app model browser, installer, and remover.
 *
 * Shows the curated Kinward model catalog with:
 *   - Hardware suitability (grayed out if too large for this machine)
 *   - "New" badges for recently added models
 *   - Install / Remove controls
 *   - Live download progress via WebSocket
 *   - Category filter tabs
 */

const CATEGORY_TABS = [
  { id: "all",      label: "All Models",  icon: "📦" },
  { id: "general",  label: "General",     icon: "💬" },
  { id: "kids",     label: "Kids",        icon: "🌟" },
  { id: "research", label: "Research",    icon: "🔍" },
  { id: "creative", label: "Creative",    icon: "✨" },
];

const TIER_LABELS = {
  excellent: { label: "High-end",  color: "#4A8C5C", bg: "#EDFAF3" },
  good:      { label: "Mid-range", color: "#5B8FB9", bg: "#EEF5FA" },
  basic:     { label: "Any Mac",   color: "#8B7355", bg: "#F5F0E8" },
};

function formatBytes(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec < 1) return "";
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
}

function formatEta(seconds) {
  if (!seconds || seconds <= 0) return "";
  if (seconds < 60) return `${seconds}s left`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s left` : `${m}m left`;
}

export function ModelManager() {
  const [catalog, setCatalog]         = useState([]);
  const [hardware, setHardware]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("all");
  const [progress, setProgress]       = useState({});   // { ollamaName: { percent, speed, eta } }
  const [installing, setInstalling]   = useState({});   // { ollamaName: true }
  const [removing, setRemoving]       = useState({});   // { id: true }
  const [error, setError]             = useState(null);
  const [toast, setToast]             = useState(null);
  const wsRef = useRef(null);

  // Load catalog on mount
  useEffect(() => {
    loadCatalog();
  }, []);

  // WebSocket for download progress
  useEffect(() => {
    wsRef.current = connectWS((msg) => {
      if (msg.type === "model:progress") {
        setProgress((prev) => ({
          ...prev,
          [msg.ollamaName]: {
            percent: msg.percent ?? 0,
            speed: msg.bytesPerSecond ?? 0,
            eta: msg.estimatedSecondsRemaining ?? null,
          },
        }));
      }
      if (msg.type === "model:complete") {
        // Clear progress, refresh catalog to show new installed state
        setProgress((prev) => {
          const next = { ...prev };
          delete next[msg.ollamaName];
          return next;
        });
        setInstalling((prev) => {
          const next = { ...prev };
          delete next[msg.ollamaName];
          return next;
        });
        showToast(`✓ ${msg.ollamaName} installed`);
        loadCatalog();
      }
    });
    return () => wsRef.current?.close();
  }, []);

  async function loadCatalog() {
    setLoading(true);
    setError(null);
    try {
      const data = await api("/models/catalog");
      setCatalog(data.catalog || []);
      setHardware(data.hardware || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleInstall(entry) {
    setInstalling((prev) => ({ ...prev, [entry.ollama]: true }));
    setProgress((prev) => ({ ...prev, [entry.ollama]: { percent: 0, speed: 0, eta: null } }));
    try {
      await api("/models/install", {
        method: "POST",
        body: JSON.stringify({
          ollamaName: entry.ollama,
          displayName: entry.display,
          category: entry.category,
        }),
      });
      // WS message:model:complete will handle the rest
    } catch (err) {
      showToast(`Failed: ${err.message}`, "error");
      setInstalling((prev) => { const n = { ...prev }; delete n[entry.ollama]; return n; });
      setProgress((prev) => { const n = { ...prev }; delete n[entry.ollama]; return n; });
    }
  }

  async function handleRemove(entry) {
    // Find the DB id via installed models list
    if (!window.confirm(`Remove ${entry.display}? You can reinstall it anytime.`)) return;
    setRemoving((prev) => ({ ...prev, [entry.ollama]: true }));
    try {
      // Use ollama name to delete (models route expects DB id, but we'll hit the ollama route directly)
      // First get the model list to find the id
      const models = await api("/models");
      const match = models.find((m) => m.name === entry.ollama);
      if (match?.id) {
        await api(`/models/${match.id}`, { method: "DELETE" });
      } else {
        throw new Error("Model not found in database");
      }
      showToast(`${entry.display} removed`);
      loadCatalog();
    } catch (err) {
      showToast(`Failed: ${err.message}`, "error");
    } finally {
      setRemoving((prev) => { const n = { ...prev }; delete n[entry.ollama]; return n; });
    }
  }

  const filtered = activeTab === "all"
    ? catalog
    : catalog.filter((m) => m.category === activeTab);

  const featured = filtered.filter((m) => m.featured);
  const more     = filtered.filter((m) => !m.featured);

  if (loading) {
    return (
      <div style={s.centered}>
        <div style={s.spinner} />
        <p style={{ color: B.slate, fontSize: 13, marginTop: 12 }}>Loading model catalog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.centered}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
        <p style={{ color: B.red, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{error}</p>
        <button style={s.retryBtn} onClick={loadCatalog}>Retry</button>
      </div>
    );
  }

  return (
    <div style={s.root}>
      {/* Section header */}
      <div style={s.sectionHeader}>
        <h2 style={s.sectionTitle}>AI Models</h2>
        {hardware && (
          <div style={s.hwBadge}>
            <span style={{ fontSize: 12 }}>🖥</span>
            <span>{hardware.friendlySummary}</span>
          </div>
        )}
      </div>

      <p style={s.intro}>
        Browse and manage the AI models installed on your home system. Grayed-out models
        require more memory than your machine has — your machine handles everything in white.
      </p>

      {/* Category tabs */}
      <div style={s.tabs}>
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...s.tab,
              ...(activeTab === tab.id ? s.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
        <button style={s.refreshBtn} onClick={loadCatalog} title="Refresh">
          ↻
        </button>
      </div>

      {/* Model cards */}
      {filtered.length === 0 ? (
        <p style={{ color: B.slate, fontSize: 13, padding: "24px 0" }}>No models in this category.</p>
      ) : (
        <>
          {featured.length > 0 && (
            <div style={s.group}>
              <div style={s.groupLabel}>Recommended</div>
              <div style={s.grid}>
                {featured.map((entry) => (
                  <ModelCard
                    key={`${entry.ollama}-${entry.category}`}
                    entry={entry}
                    progress={progress[entry.ollama]}
                    isInstalling={!!installing[entry.ollama]}
                    isRemoving={!!removing[entry.ollama]}
                    onInstall={handleInstall}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          )}
          {more.length > 0 && (
            <div style={s.group}>
              <div style={s.groupLabel}>More Models</div>
              <div style={s.grid}>
                {more.map((entry) => (
                  <ModelCard
                    key={`${entry.ollama}-${entry.category}`}
                    entry={entry}
                    progress={progress[entry.ollama]}
                    isInstalling={!!installing[entry.ollama]}
                    isRemoving={!!removing[entry.ollama]}
                    onInstall={handleInstall}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            ...s.toast,
            background: toast.type === "error" ? B.red : B.green,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Individual Model Card ────────────────────────────────────────────────────
function ModelCard({ entry, progress, isInstalling, isRemoving, onInstall, onRemove }) {
  const tierInfo = TIER_LABELS[entry.minTier] || TIER_LABELS.basic;
  const inProgress = isInstalling && progress;
  const dimmed = !entry.suitable;

  return (
    <div
      style={{
        ...s.card,
        opacity: dimmed ? 0.45 : 1,
        border: entry.installed ? `1.5px solid ${B.green}` : s.card.border,
      }}
    >
      {/* Badges row */}
      <div style={s.badgeRow}>
        <span style={{ ...s.tierBadge, color: tierInfo.color, background: tierInfo.bg }}>
          {tierInfo.label}
        </span>
        {entry.isNew && (
          <span style={s.newBadge}>NEW</span>
        )}
        {entry.installed && (
          <span style={s.installedBadge}>✓ Installed</span>
        )}
        <span style={s.sizePill}>{entry.sizeDisplay}</span>
      </div>

      {/* Title + description */}
      <div style={s.cardTitle}>{entry.display}</div>
      <div style={s.cardDesc}>{entry.description}</div>

      {/* Tags */}
      <div style={s.tagRow}>
        {(entry.tags || []).map((tag) => (
          <span key={tag} style={s.tag}>{tag}</span>
        ))}
      </div>

      {/* Progress bar (during download) */}
      {inProgress && (
        <div style={s.progressWrap}>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressBar, width: `${progress.percent}%` }} />
          </div>
          <div style={s.progressMeta}>
            <span>{progress.percent}%</span>
            {progress.speed > 0 && <span>{formatBytes(progress.speed)}</span>}
            {progress.eta && <span>{formatEta(progress.eta)}</span>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={s.actions}>
        {entry.installed ? (
          <button
            style={s.removeBtn}
            disabled={isRemoving || isInstalling}
            onClick={() => onRemove(entry)}
          >
            {isRemoving ? "Removing..." : "Remove"}
          </button>
        ) : (
          <button
            style={{
              ...s.installBtn,
              opacity: (dimmed || isInstalling) ? 0.6 : 1,
              cursor: (dimmed || isInstalling) ? "default" : "pointer",
            }}
            disabled={dimmed || isInstalling}
            onClick={() => !dimmed && !isInstalling && onInstall(entry)}
          >
            {isInstalling
              ? (inProgress ? `Downloading ${progress.percent}%` : "Starting...")
              : dimmed
              ? "Needs more RAM"
              : "Install"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root: {
    paddingBottom: 40,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 18,
    fontWeight: 500,
    color: B.charcoal,
    letterSpacing: 2,
    margin: 0,
  },
  hwBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#F0EDE8",
    border: "1px solid #DDD9D4",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 11,
    fontFamily: "'DM Mono', monospace",
    color: B.slate,
    letterSpacing: 0.5,
  },
  intro: {
    fontSize: 13,
    color: B.slate,
    fontFamily: "'Lora', Georgia, serif",
    lineHeight: 1.6,
    marginBottom: 20,
    maxWidth: 600,
  },
  tabs: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 20,
    alignItems: "center",
  },
  tab: {
    padding: "6px 14px",
    borderRadius: 20,
    border: `1px solid ${B.mist}`,
    background: B.warmWhite,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.slate,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tabActive: {
    background: B.orange,
    color: "white",
    border: `1px solid ${B.orange}`,
  },
  refreshBtn: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    fontSize: 18,
    color: B.slate,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 6,
    lineHeight: 1,
  },
  group: {
    marginBottom: 28,
  },
  groupLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: 2,
    color: B.slate,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 12,
  },
  card: {
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 12,
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    transition: "border-color 0.2s",
  },
  badgeRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
  },
  tierBadge: {
    fontSize: 10,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: 0.5,
    padding: "2px 8px",
    borderRadius: 10,
    fontWeight: 500,
  },
  newBadge: {
    fontSize: 9,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: 1,
    padding: "2px 7px",
    borderRadius: 10,
    background: "#FFF0E8",
    color: B.orange,
    fontWeight: 700,
  },
  installedBadge: {
    fontSize: 10,
    fontFamily: "'DM Mono', monospace",
    padding: "2px 8px",
    borderRadius: 10,
    background: "#EDFAF3",
    color: "#4A8C5C",
    fontWeight: 500,
  },
  sizePill: {
    marginLeft: "auto",
    fontSize: 10,
    fontFamily: "'DM Mono', monospace",
    color: B.slate,
    background: "#F0EDE8",
    padding: "2px 8px",
    borderRadius: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: B.charcoal,
    fontFamily: "'DM Mono', monospace",
  },
  cardDesc: {
    fontSize: 12,
    color: B.slate,
    fontFamily: "'Lora', Georgia, serif",
    lineHeight: 1.5,
    flex: 1,
  },
  tagRow: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
  },
  tag: {
    fontSize: 10,
    color: "#8B7355",
    background: "#F5F0E8",
    padding: "2px 7px",
    borderRadius: 8,
    fontFamily: "'DM Mono', monospace",
  },
  progressWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  progressTrack: {
    height: 6,
    background: B.mist,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: B.orange,
    borderRadius: 3,
    transition: "width 0.3s ease",
  },
  progressMeta: {
    display: "flex",
    gap: 8,
    fontSize: 10,
    fontFamily: "'DM Mono', monospace",
    color: B.slate,
  },
  actions: {
    marginTop: 4,
  },
  installBtn: {
    width: "100%",
    padding: "9px 0",
    background: B.orange,
    color: "white",
    border: "none",
    borderRadius: 8,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  removeBtn: {
    width: "100%",
    padding: "9px 0",
    background: "none",
    color: B.red,
    border: `1px solid ${B.red}`,
    borderRadius: 8,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    cursor: "pointer",
  },
  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 0",
  },
  spinner: {
    width: 28,
    height: 28,
    border: `3px solid ${B.mist}`,
    borderTop: `3px solid ${B.orange}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  retryBtn: {
    marginTop: 12,
    padding: "8px 20px",
    background: B.orange,
    color: "white",
    border: "none",
    borderRadius: 8,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    cursor: "pointer",
  },
  toast: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "10px 24px",
    borderRadius: 20,
    color: "white",
    fontSize: 13,
    fontFamily: "'DM Mono', monospace",
    zIndex: 999,
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
    animation: "kw-fadeIn 0.2s ease",
  },
};
