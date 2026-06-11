import { useState, useEffect } from "react";
import { BRAND as B } from "./components/shared";
import FamilyBoard from "./components/FamilyBoard";
import AdminReview from "./components/AdminReview";
import { getDashboard, getChatModes } from "./api";

/**
 * KinwardDashboard — the family home screen shown after login.
 *
 * Layout (top to bottom):
 *   - Greeting header + avatar + settings access
 *   - Family Board (posts feed with admin review banner)
 *   - Memory highlights (what Lumina learned recently)
 *   - Start a conversation (mode tiles)
 *   - Recent conversations
 *   - (Admin only) Family activity summary
 */

// Fallback tiles if the modes endpoint is unreachable — the live list comes
// from GET /api/chat/modes, already filtered for this profile's role
const FALLBACK_MODES = [
  { id: "general",  label: "General",  icon: "💬" },
  { id: "kids",     label: "Kids",     icon: "🌟" },
  { id: "research", label: "Research", icon: "🔍" },
  { id: "creative", label: "Creative", icon: "✨" },
];

// Fallback dot colors for recent-conversation rows; fetched modes carry
// their own color from the chat_modes table
const MODE_COLORS = {
  general: "#5A8BAD",
  kids: "#6BAF7D",
  research: B.orange,
  creative: "#C4853A",
  coding: "#7C6FA8",
  tutor: "#4A8C5C",
};

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function KinwardDashboard({
  user,
  onStartChat,
  onOpenSession,
  onLock,
  onOpenSettings,
}) {
  const [data, setData] = useState(null);
  const [view, setView] = useState("dashboard"); // "dashboard" | "review"
  const [loading, setLoading] = useState(true);

  const [modes, setModes] = useState(FALLBACK_MODES);

  const loadDashboard = async () => {
    try {
      const d = await getDashboard(user.id);
      setData(d);
    } catch (err) {
      console.error("Dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    getChatModes()
      .then(setModes)
      .catch(() => {}); // keep fallback tiles
  }, [user.id]);

  const modeColor = (categoryId) =>
    modes.find((m) => m.id === categoryId)?.color || MODE_COLORS[categoryId] || B.slate;

  const isAdmin = user.role === "admin" || user.role === "co-admin";

  if (loading || !data) {
    return (
      <div style={s.loadingRoot}>
        <div style={s.spinner} />
        <p style={s.loadingText}>Loading your dashboard...</p>
      </div>
    );
  }

  if (view === "review") {
    return (
      <AdminReview
        currentUser={user}
        onBack={() => {
          setView("dashboard");
          loadDashboard();
        }}
      />
    );
  }

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div
          style={{
            ...s.avatar,
            background: user.avatar_color || B.orange,
          }}
        >
          {user.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div style={s.headerText}>
          <div style={s.greeting}>
            {data.greeting.phrase}, {data.greeting.name}
          </div>
          <div style={s.date}>{data.greeting.date}</div>
        </div>
        <div style={s.headerActions}>
          {onOpenSettings && isAdmin && (
            <button style={s.iconBtn} onClick={() => onOpenSettings(user)} title="Settings">
              ⚙
            </button>
          )}
          <button style={s.iconBtn} onClick={onLock} title="Lock / Switch profile">
            🔒
          </button>
        </div>
      </div>

      <div style={s.content}>
        {/* Family Board */}
        <div style={s.section}>
          <FamilyBoard currentUser={user} onReviewClick={() => setView("review")} />
        </div>

        {/* Memory highlights */}
        {data.memoryHighlights.count > 0 && (
          <div style={s.section}>
            <div style={s.memoryCard}>
              <div style={s.memoryHeader}>
                <div style={s.memoryIcon}>🧠</div>
                <div>
                  <div style={s.memoryTitle}>
                    Lumina learned {data.memoryHighlights.count} new{" "}
                    {data.memoryHighlights.count === 1 ? "thing" : "things"}
                  </div>
                  <div style={s.memoryCount}>THIS WEEK</div>
                </div>
              </div>
              <ul style={s.memoryList}>
                {data.memoryHighlights.items.slice(0, 3).map((m, i) => (
                  <li key={i} style={s.memoryItem}>
                    <span style={s.memoryBullet}>•</span>
                    <span>
                      <span style={s.memoryCategory}>{m.category}:</span>{" "}
                      {m.key} — {m.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Mode tiles */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <div style={s.sectionTitle}>Start a conversation</div>
          </div>
          <div style={s.modeGrid}>
            {modes.map((mode) => (
              <button
                key={mode.id}
                style={s.modeTile}
                onClick={() => onStartChat(mode.id)}
              >
                <div style={s.modeEmoji}>{mode.icon}</div>
                <div style={s.modeLabel}>{mode.name || mode.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent conversations */}
        {data.recentSessions.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <div style={s.sectionTitle}>Recent conversations</div>
            </div>
            <div style={s.convoList}>
              {data.recentSessions.map((session) => (
                <button
                  key={session.id}
                  style={s.convo}
                  onClick={() => onOpenSession(session)}
                >
                  <div
                    style={{
                      ...s.convoDot,
                      background: modeColor(session.category),
                    }}
                  />
                  <div style={s.convoTitle}>{session.title}</div>
                  <div style={s.convoMeta}>
                    {timeAgo(session.updatedAt)} · {(session.category || "chat").toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Admin family activity */}
        {isAdmin && data.familyActivity && data.familyActivity.sessionsThisWeek > 0 && (
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <div style={s.sectionTitle}>Family this week</div>
            </div>
            <div style={s.activityCard}>
              <div style={s.activityRow}>
                <div style={s.activityStat}>
                  <div style={s.activityNum}>{data.familyActivity.sessionsThisWeek}</div>
                  <div style={s.activityLabel}>Conversations</div>
                </div>
                <div style={s.activityStat}>
                  <div style={s.activityNum}>{data.familyActivity.activeMembers}</div>
                  <div style={s.activityLabel}>Active members</div>
                </div>
                <div style={s.activityStat}>
                  <div style={s.activityNum}>{data.familyActivity.postsThisWeek}</div>
                  <div style={s.activityLabel}>Board posts</div>
                </div>
              </div>
              {data.familyActivity.topCategory && (
                <div style={s.activityNote}>
                  Most active mode:{" "}
                  <strong style={{ color: B.orange }}>
                    {data.familyActivity.topCategory.category}
                  </strong>{" "}
                  ({data.familyActivity.topCategory.count} conversations)
                </div>
              )}
            </div>
          </div>
        )}

        <div style={s.footer}>
          Kinward · Everything you see here lives on your own machine
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100dvh",
    background: B.cream,
    fontFamily: "'Lora', Georgia, serif",
    color: B.charcoal,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "20px 24px",
    borderBottom: `1px solid ${B.mist}`,
    background: B.warmWhite,
    position: "sticky",
    top: 0,
    zIndex: 5,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Mono', monospace",
    fontSize: 15,
    fontWeight: 500,
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 17,
    fontWeight: 500,
    color: B.charcoal,
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 12,
    color: B.slate,
    marginTop: 2,
  },
  headerActions: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "transparent",
    border: `1px solid ${B.mist}`,
    color: B.slate,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    transition: "all 0.2s",
  },

  content: {
    maxWidth: 780,
    margin: "0 auto",
    padding: "24px 24px 40px",
  },

  section: {
    marginBottom: 36,
  },
  sectionHeader: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: `1px solid ${B.mist}`,
  },
  sectionTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: B.slate,
  },

  // Memory card
  memoryCard: {
    background: `linear-gradient(135deg, ${B.orangeFaint} 0%, ${B.cream} 100%)`,
    border: `1px solid rgba(212,98,43,0.15)`,
    borderRadius: 14,
    padding: 20,
  },
  memoryHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  memoryIcon: {
    width: 32,
    height: 32,
    background: B.orange,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
  },
  memoryTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    fontWeight: 500,
    color: B.charcoal,
    letterSpacing: 0.5,
  },
  memoryCount: {
    fontSize: 10,
    color: B.slate,
    fontFamily: "'DM Mono', monospace",
    marginTop: 1,
    letterSpacing: 1,
  },
  memoryList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  memoryItem: {
    fontSize: 13,
    color: B.charcoal,
    padding: "5px 0",
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    lineHeight: 1.5,
  },
  memoryBullet: {
    color: B.orange,
    fontWeight: "bold",
  },
  memoryCategory: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.slate,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Mode tiles
  modeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },
  modeTile: {
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 12,
    padding: "22px 12px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'Lora', Georgia, serif",
  },
  modeEmoji: {
    fontSize: 26,
    marginBottom: 8,
  },
  modeLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    fontWeight: 500,
    color: B.charcoal,
    letterSpacing: 0.5,
  },

  // Recent conversations
  convoList: {
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 12,
    overflow: "hidden",
  },
  convo: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "12px 18px",
    borderBottom: `1px solid ${B.mist}`,
    cursor: "pointer",
    transition: "background 0.15s",
    background: "transparent",
    border: "none",
    borderBottomColor: B.mist,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    fontFamily: "'Lora', Georgia, serif",
    textAlign: "left",
  },
  convoDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  convoTitle: {
    flex: 1,
    fontSize: 14,
    color: B.charcoal,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  convoMeta: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    color: B.slate,
    letterSpacing: 0.5,
    flexShrink: 0,
  },

  // Admin activity card
  activityCard: {
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 12,
    padding: 20,
  },
  activityRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 14,
  },
  activityStat: {
    textAlign: "center",
  },
  activityNum: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 28,
    fontWeight: 500,
    color: B.orange,
    lineHeight: 1,
  },
  activityLabel: {
    fontSize: 11,
    color: B.slate,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  activityNote: {
    fontSize: 13,
    color: B.slate,
    textAlign: "center",
    paddingTop: 14,
    borderTop: `1px solid ${B.mist}`,
  },

  footer: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    color: B.slate,
    textAlign: "center",
    letterSpacing: 1,
    padding: "24px 0 40px",
  },

  // Loading
  loadingRoot: {
    minHeight: "100dvh",
    background: B.cream,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  spinner: {
    width: 32,
    height: 32,
    border: `3px solid ${B.mist}`,
    borderTop: `3px solid ${B.orange}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 13,
    color: B.slate,
    fontFamily: "'DM Mono', monospace",
  },
};
