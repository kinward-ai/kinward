import { useState, useEffect } from "react";
import { BRAND as B } from "./shared";
import {
  getUpdateStatus,
  getAppliedBundles,
  previewBundle,
  applyBundle,
  rollbackBundle,
} from "../api";

/**
 * UpdatesSection — Settings → 🔄 Updates panel.
 *
 * Phase A: shows app version status only. Context bundle card is rendered
 * as a "coming soon" placeholder so the eventual two-card layout is visible.
 *
 * User initiates every check (no background polling). Cache lives server-side
 * for 5 min to avoid hammering the GitHub API.
 */

function relativeTime(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ── App version card states ────────────────────────────────────────────────

function AppVersionCard({ app }) {
  if (!app) return null;

  // Pick visual treatment based on state
  let icon, headline, sub, color;
  if (app.state === "ok" && app.behind) {
    icon = "🆕";
    headline = `New version available — ${app.latestVersion}`;
    sub = `You're on ${app.current}. Released ${formatDate(app.publishedAt)}.`;
    color = B.orange;
  } else if (app.state === "ok") {
    icon = "✓";
    headline = "You're up to date";
    sub = `Current: ${app.current}`;
    color = B.green;
  } else if (app.state === "no-releases") {
    icon = "📭";
    headline = "No releases yet";
    sub = `You're on ${app.current}. We haven't published any tagged releases yet — you're running the latest code.`;
    color = B.slate;
  } else if (app.state === "offline") {
    icon = "📡";
    headline = "Couldn't reach GitHub";
    sub = "Check your internet connection and try again.";
    color = "#C4853A";
  } else if (app.state === "rate-limited") {
    icon = "⏳";
    headline = "Rate limited by GitHub";
    sub = "Try again in a few minutes.";
    color = "#C4853A";
  } else {
    icon = "⚠";
    headline = "Update check failed";
    sub = app.message || "Unknown error.";
    color = B.red;
  }

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={s.cardEmoji}>📦</div>
        <div style={s.cardTitle}>Kinward App</div>
      </div>

      <div style={{ ...s.statusRow, borderLeftColor: color }}>
        <div style={{ ...s.statusIcon, color }}>{icon}</div>
        <div style={s.statusBody}>
          <div style={s.statusHeadline}>{headline}</div>
          <div style={s.statusSub}>{sub}</div>
        </div>
      </div>

      {/* Release notes preview when behind */}
      {app.state === "ok" && app.behind && app.body && (
        <details style={s.releaseNotes}>
          <summary style={s.releaseNotesSummary}>
            View release notes
          </summary>
          <pre style={s.releaseNotesBody}>{app.body.slice(0, 800)}{app.body.length > 800 ? "\n…" : ""}</pre>
        </details>
      )}

      {/* Upgrade instructions when behind */}
      {app.state === "ok" && app.behind && (
        <div style={s.upgradeBlock}>
          <div style={s.upgradeLabel}>How to upgrade</div>
          <pre style={s.upgradeCmd}>{`cd kinward
git pull
npm install
npm run electron:dev`}</pre>
          <div style={s.upgradeHint}>
            Kinward never auto-installs updates. Run those commands in your Kinward folder when you're ready.
          </div>
        </div>
      )}

      {/* Link to GitHub release */}
      {app.state === "ok" && app.htmlUrl && (
        <a
          href={app.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={s.releaseLink}
        >
          View on GitHub →
        </a>
      )}
    </div>
  );
}

// ── Context bundle card ────────────────────────────────────────────────────

function ContextBundleCard({ context, onPreview }) {
  if (!context) return null;

  let icon, headline, sub, color;
  if (context.state === "ok" && context.behind) {
    icon = "🆕";
    headline = `New bundle available — ${context.latest.version}`;
    sub = context.latest.summary || "Fresh world context awaiting your review.";
    color = B.orange;
  } else if (context.state === "ok") {
    icon = "✓";
    headline = "Context is up to date";
    sub = context.currentVersion
      ? `Current bundle: ${context.currentVersion}`
      : `Latest: ${context.latest.version}`;
    color = B.green;
  } else if (context.state === "no-bundles" || context.state === "no-manifest") {
    icon = "📭";
    headline = "No bundles published yet";
    sub = "When new context bundles are published they'll appear here.";
    color = B.slate;
  } else if (context.state === "offline") {
    icon = "📡";
    headline = "Couldn't reach context repo";
    sub = "Check your internet and try again.";
    color = "#C4853A";
  } else {
    icon = "⚠";
    headline = "Context check failed";
    sub = context.message || "Unknown error.";
    color = B.red;
  }

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={s.cardEmoji}>🌍</div>
        <div style={s.cardTitle}>Knowledge Context</div>
        {context.state === "ok" && (
          <div style={s.verifiedBadge}>verified ✓</div>
        )}
      </div>

      <div style={{ ...s.statusRow, borderLeftColor: color }}>
        <div style={{ ...s.statusIcon, color }}>{icon}</div>
        <div style={s.statusBody}>
          <div style={s.statusHeadline}>{headline}</div>
          <div style={s.statusSub}>{sub}</div>
          {context.state === "ok" && context.latest && (
            <div style={s.contextMeta}>
              Released {formatDate(context.latest.released_at)} · Signed by {context.latest.signed_by}
            </div>
          )}
        </div>
      </div>

      {context.state === "ok" && context.behind && (
        <div style={s.actionRow}>
          <button style={s.primaryBtn} onClick={() => onPreview(context.latest.version)}>
            Preview Changes →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Bundle history ─────────────────────────────────────────────────────────

function BundleHistory({ bundles, activeVersion, onRollback, rolling }) {
  if (!bundles || bundles.length === 0) return null;

  const canRollback = bundles.filter((b) => b.active === 0).length > 0;

  return (
    <div style={{ ...s.card, marginTop: 16 }}>
      <div style={s.cardHeader}>
        <div style={s.cardEmoji}>📜</div>
        <div style={s.cardTitle}>Bundle History</div>
      </div>

      <div style={s.historyList}>
        {bundles.map((b) => (
          <div key={b.id} style={s.historyRow}>
            <div style={{ flex: 1 }}>
              <div style={s.historyVersion}>
                {b.version}
                {b.active ? <span style={s.activePill}>active</span> : null}
                {b.rollback_of_id ? <span style={s.rollbackPill}>via rollback</span> : null}
              </div>
              <div style={s.historyMeta}>
                Applied {relativeTime(b.applied_at)}
                {b.applied_by_name ? ` by ${b.applied_by_name}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      {canRollback && (
        <div style={{ ...s.actionRow, marginTop: 8 }}>
          <button
            style={{ ...s.ghostBtn, opacity: rolling ? 0.5 : 1 }}
            onClick={onRollback}
            disabled={rolling}
          >
            {rolling ? "Rolling back..." : "⟲ Roll back to previous"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Preview modal ──────────────────────────────────────────────────────────

function PreviewModal({ version, onClose, onApplied }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await previewBundle(version);
        if (!cancelled) {
          if (result.state === "ok") setPreview(result);
          else setError(result.message || `State: ${result.state}`);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [version]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyBundle(version);
      onApplied();
    } catch (err) {
      if (err.reason === "admin_reauth_required") {
        alert("Your admin session expired. Lock and sign back in to apply this bundle.");
      } else {
        alert(`Apply failed: ${err.message}`);
      }
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>Preview bundle {version}</div>
          <button style={s.modalClose} onClick={onClose}>×</button>
        </div>

        <div style={s.modalBody}>
          {loading && <div style={s.modalLoading}>Verifying signature + loading diff...</div>}
          {error && <div style={{ ...s.modalLoading, color: B.red }}>Error: {error}</div>}
          {preview && (
            <>
              <div style={s.previewSummary}>{preview.bundle.payload.summary || "Bundle changes:"}</div>
              <div style={s.previewSummaryMeta}>
                Signed by {preview.bundle.signed_by} · Released {formatDate(preview.bundle.released_at)}
              </div>

              {preview.diff.length === 0 ? (
                <div style={s.noDiff}>No changes — this bundle matches what you have.</div>
              ) : (
                <div style={s.diffList}>
                  {preview.diff.map((d, i) => (
                    <div key={i} style={{ ...s.diffRow, borderLeftColor: diffColor(d.kind) }}>
                      <div style={s.diffKind}>{diffLabel(d.kind)}</div>
                      <div style={s.diffPath}>{d.path}</div>
                      {d.before !== undefined && (
                        <pre style={{ ...s.diffValue, color: B.red }}>− {JSON.stringify(d.before, null, 2)}</pre>
                      )}
                      {d.after !== undefined && (
                        <pre style={{ ...s.diffValue, color: B.green }}>+ {JSON.stringify(d.after, null, 2)}</pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={s.modalFooter}>
          <button style={s.ghostBtn} onClick={onClose} disabled={applying}>
            Cancel
          </button>
          {preview && preview.diff.length > 0 && (
            <button
              style={{ ...s.primaryBtn, opacity: applying ? 0.5 : 1 }}
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? "Applying..." : "Apply Bundle"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function diffColor(kind) {
  if (kind === "add") return B.green;
  if (kind === "remove") return B.red;
  return B.orange;
}
function diffLabel(kind) {
  if (kind === "add") return "ADD";
  if (kind === "remove") return "REMOVE";
  return "CHANGE";
}

// ── Main section ───────────────────────────────────────────────────────────

export default function UpdatesSection() {
  const [data, setData] = useState(null);
  const [bundles, setBundles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [rolling, setRolling] = useState(false);

  const load = async (force = false) => {
    if (force) setChecking(true);
    else setLoading(true);
    setError(null);
    try {
      const [status, history] = await Promise.all([
        getUpdateStatus(force),
        getAppliedBundles().catch(() => ({ bundles: [], activeVersion: null })),
      ]);
      setData(status);
      setBundles(history);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    load(false);
  }, []);

  const handleApplied = async () => {
    setPreviewVersion(null);
    await load(true);
  };

  const handleRollback = async () => {
    if (!window.confirm("Roll back to the previous bundle? This is logged and can be re-applied.")) return;
    setRolling(true);
    try {
      await rollbackBundle();
      await load(true);
    } catch (err) {
      if (err.reason === "admin_reauth_required") {
        alert("Your admin session expired. Lock and sign back in to roll back.");
      } else {
        alert(`Rollback failed: ${err.message}`);
      }
    } finally {
      setRolling(false);
    }
  };

  return (
    <div>
      <div style={s.header}>
        <h2 style={s.title}>Updates</h2>
        <button
          style={{
            ...s.checkBtn,
            opacity: checking ? 0.6 : 1,
            cursor: checking ? "default" : "pointer",
          }}
          onClick={() => load(true)}
          disabled={checking}
        >
          {checking ? "Checking..." : "↻ Check now"}
        </button>
      </div>

      <p style={s.desc}>
        Updates are always opt-in. Kinward only checks GitHub when you click the button —
        and never downloads or installs anything on its own.
      </p>

      {loading && <div style={s.status}>Checking for updates...</div>}
      {error && <div style={{ ...s.status, color: B.red }}>Error: {error}</div>}

      {!loading && !error && data && (
        <>
          <AppVersionCard app={data.app} />
          <ContextBundleCard
            context={data.context}
            onPreview={(v) => setPreviewVersion(v)}
          />

          <BundleHistory
            bundles={bundles?.bundles || []}
            activeVersion={bundles?.activeVersion}
            onRollback={handleRollback}
            rolling={rolling}
          />

          <div style={s.footer}>
            Last checked {relativeTime(data.checkedAt)}
            {data.app?.fromCache && data.context?.fromCache && (
              <span style={s.cachedBadge}>cached</span>
            )}
          </div>
        </>
      )}

      {previewVersion && (
        <PreviewModal
          version={previewVersion}
          onClose={() => setPreviewVersion(null)}
          onApplied={handleApplied}
        />
      )}
    </div>
  );
}

const s = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 16,
  },
  title: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 18,
    fontWeight: 500,
    letterSpacing: 2,
    color: B.charcoal,
    margin: 0,
  },
  checkBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: B.orange,
    color: "white",
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    letterSpacing: 0.5,
    transition: "all 0.15s",
  },
  desc: {
    fontSize: 13,
    color: B.slate,
    lineHeight: 1.6,
    fontFamily: "'Lora', Georgia, serif",
    marginBottom: 20,
    maxWidth: 620,
  },
  status: {
    padding: "24px 0",
    color: B.slate,
    fontSize: 13,
  },

  // Cards
  card: {
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cardEmoji: {
    fontSize: 20,
  },
  cardTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 1,
    color: B.charcoal,
  },

  // Status row
  statusRow: {
    display: "flex",
    gap: 14,
    padding: "12px 14px",
    background: B.cream,
    borderRadius: 8,
    borderLeft: `3px solid ${B.slate}`,
    alignItems: "flex-start",
  },
  statusIcon: {
    fontSize: 22,
    lineHeight: 1,
    flexShrink: 0,
  },
  statusBody: {
    flex: 1,
    minWidth: 0,
  },
  statusHeadline: {
    fontSize: 14,
    color: B.charcoal,
    fontWeight: 600,
    marginBottom: 4,
  },
  statusSub: {
    fontSize: 13,
    color: B.slate,
    lineHeight: 1.5,
    fontFamily: "'Lora', Georgia, serif",
  },

  // Release notes (expandable)
  releaseNotes: {
    marginTop: 12,
  },
  releaseNotesSummary: {
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.orange,
    letterSpacing: 0.5,
    padding: "6px 0",
  },
  releaseNotesBody: {
    background: B.cream,
    border: `1px solid ${B.mist}`,
    borderRadius: 8,
    padding: 12,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.charcoal,
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    maxHeight: 240,
    overflowY: "auto",
    marginTop: 6,
  },

  // Upgrade instructions
  upgradeBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: `1px solid ${B.mist}`,
  },
  upgradeLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: 1,
    color: B.slate,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  upgradeCmd: {
    background: B.cream,
    border: `1px solid ${B.mist}`,
    borderRadius: 8,
    padding: 12,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.charcoal,
    margin: 0,
    overflowX: "auto",
  },
  upgradeHint: {
    fontSize: 12,
    color: B.slate,
    fontStyle: "italic",
    marginTop: 8,
    fontFamily: "'Lora', Georgia, serif",
  },

  releaseLink: {
    display: "inline-block",
    marginTop: 10,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.orange,
    textDecoration: "none",
    letterSpacing: 0.5,
  },

  footer: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.slate,
    letterSpacing: 0.5,
    marginTop: 16,
    paddingTop: 12,
    borderTop: `1px solid ${B.mist}`,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  cachedBadge: {
    background: B.cream,
    color: B.slate,
    border: `1px solid ${B.mist}`,
    borderRadius: 10,
    padding: "2px 8px",
    fontSize: 10,
  },

  // Verified badge in context card
  verifiedBadge: {
    marginLeft: "auto",
    fontSize: 10,
    fontFamily: "'DM Mono', monospace",
    color: B.green,
    background: "#EDFAF3",
    border: "1px solid rgba(74,140,92,0.3)",
    padding: "2px 8px",
    borderRadius: 10,
    letterSpacing: 0.5,
  },

  contextMeta: {
    marginTop: 8,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.slate,
    letterSpacing: 0.3,
  },

  actionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${B.mist}`,
    display: "flex",
    gap: 8,
  },
  primaryBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    background: B.orange,
    color: "white",
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    letterSpacing: 0.5,
    cursor: "pointer",
  },
  ghostBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: `1px solid ${B.mist}`,
    background: "transparent",
    color: B.slate,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    letterSpacing: 0.5,
    cursor: "pointer",
  },

  // History list
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  historyRow: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    background: B.cream,
    borderRadius: 8,
    border: `1px solid ${B.mist}`,
  },
  historyVersion: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    color: B.charcoal,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  historyMeta: {
    fontSize: 11,
    color: B.slate,
    marginTop: 4,
  },
  activePill: {
    fontSize: 10,
    fontFamily: "'DM Mono', monospace",
    background: "#EDFAF3",
    color: B.green,
    border: "1px solid rgba(74,140,92,0.3)",
    padding: "2px 8px",
    borderRadius: 10,
    letterSpacing: 0.5,
  },
  rollbackPill: {
    fontSize: 10,
    fontFamily: "'DM Mono', monospace",
    background: B.cream,
    color: B.slate,
    border: `1px solid ${B.mist}`,
    padding: "2px 8px",
    borderRadius: 10,
    letterSpacing: 0.5,
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(44,34,24,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: B.warmWhite,
    borderRadius: 12,
    width: "min(640px, 92vw)",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    border: `1px solid ${B.mist}`,
  },
  modalHeader: {
    padding: "16px 20px",
    borderBottom: `1px solid ${B.mist}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: 1,
    color: B.charcoal,
  },
  modalClose: {
    background: "transparent",
    border: "none",
    fontSize: 22,
    color: B.slate,
    cursor: "pointer",
    lineHeight: 1,
    padding: "0 4px",
  },
  modalBody: {
    padding: 20,
    flex: 1,
    overflowY: "auto",
  },
  modalLoading: {
    color: B.slate,
    fontSize: 13,
    textAlign: "center",
    padding: 24,
  },
  modalFooter: {
    padding: "12px 20px",
    borderTop: `1px solid ${B.mist}`,
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },

  previewSummary: {
    fontSize: 14,
    color: B.charcoal,
    lineHeight: 1.5,
    marginBottom: 4,
    fontFamily: "'Lora', Georgia, serif",
  },
  previewSummaryMeta: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.slate,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  noDiff: {
    padding: 16,
    background: B.cream,
    borderRadius: 8,
    color: B.slate,
    fontSize: 13,
    textAlign: "center",
  },
  diffList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  diffRow: {
    padding: 12,
    background: B.cream,
    borderRadius: 8,
    borderLeft: `3px solid ${B.slate}`,
  },
  diffKind: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 1,
    color: B.slate,
    marginBottom: 4,
  },
  diffPath: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.charcoal,
    marginBottom: 6,
  },
  diffValue: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    margin: 0,
    padding: 6,
    background: B.warmWhite,
    borderRadius: 4,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowX: "auto",
  },
};
