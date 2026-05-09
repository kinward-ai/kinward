import { useState, useEffect } from "react";
import { BRAND as B } from "./shared";
import {
  getBoardPosts,
  getPendingCount,
  createPost,
  reactToPost,
  deletePost,
} from "../api";

/**
 * FamilyBoard — the moderated feed of family events, updates, and wins.
 * Rendered at the top of the Dashboard.
 */

const POST_TYPES = [
  { id: "event", label: "Event", icon: "📅", color: B.blue || "#5A8BAD" },
  { id: "update", label: "Update", icon: "📝", color: B.green },
  { id: "win", label: "Win", icon: "🎉", color: B.orange },
];

const REACTION_EMOJIS = ["❤️", "🎉", "👍", "😂", "🔥"];

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

function formatEventDate(date, time) {
  if (!date) return null;
  const d = new Date(date);
  const datePart = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return time ? `${datePart} · ${time}` : datePart;
}

// ── Individual Post Card ───────────────────────────────────────────────────
function BoardPost({ post, currentUser, onReact, onDelete }) {
  const typeInfo = POST_TYPES.find((t) => t.id === post.type) || POST_TYPES[1];
  const isAuthor = post.author?.id === currentUser.id;
  const isAdmin = currentUser.role === "admin" || currentUser.role === "co-admin";
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  return (
    <div style={s.post}>
      <div style={{ ...s.typeBadge, background: typeInfo.color + "22", color: typeInfo.color }}>
        <span>{typeInfo.icon}</span>
        <span>{typeInfo.label}</span>
      </div>

      <div style={s.postTitle}>{post.title}</div>
      {post.body && <div style={s.postBody}>{post.body}</div>}

      {post.type === "event" && (
        <div style={s.metaRow}>
          {post.event_date && (
            <div style={s.metaItem}>
              📅 {formatEventDate(post.event_date, post.event_time)}
            </div>
          )}
          {post.location && <div style={s.metaItem}>📍 {post.location}</div>}
        </div>
      )}

      <div style={s.postFooter}>
        <div style={s.author}>
          <div
            style={{
              ...s.miniAvatar,
              background: post.author?.avatar_color || B.orange,
            }}
          >
            {post.author?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <span style={s.authorText}>
            Added by {post.author?.name} · {timeAgo(post.created_at)}
          </span>
          {post.approver && post.approver.id !== post.author?.id && (
            <span style={s.approvedTag}>✓ approved by {post.approver.name}</span>
          )}
        </div>

        <div style={s.reactions}>
          {post.reactions?.map((r) => {
            const mine = r.profileIds.includes(currentUser.id);
            return (
              <button
                key={r.emoji}
                style={{
                  ...s.reactionPill,
                  background: mine ? B.orangeFaint : B.cream,
                  borderColor: mine ? B.orange : B.mist,
                  color: mine ? B.orange : B.slate,
                }}
                onClick={() => onReact(post.id, r.emoji)}
                title={mine ? "Click to remove your reaction" : "React"}
              >
                {r.emoji} {r.count}
              </button>
            );
          })}
          <div style={{ position: "relative" }}>
            <button
              style={s.addReactionBtn}
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              title="Add reaction"
            >
              +
            </button>
            {showReactionPicker && (
              <div style={s.reactionPicker}>
                {REACTION_EMOJIS.map((e) => (
                  <button
                    key={e}
                    style={s.reactionPickerBtn}
                    onClick={() => {
                      onReact(post.id, e);
                      setShowReactionPicker(false);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          {(isAuthor || isAdmin) && (
            <button
              style={s.moreBtn}
              onClick={() => {
                if (window.confirm("Delete this post?")) onDelete(post.id);
              }}
              title="Delete"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Post Modal ─────────────────────────────────────────────────────────
function NewPostModal({ currentUser, onClose, onCreate }) {
  const [type, setType] = useState("update");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsApproval =
    currentUser.role !== "admin" &&
    currentUser.role !== "co-admin" &&
    currentUser.role !== "teen";

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      // Author derived from session token on the backend — no need to pass profileId
      const data = {
        type,
        title: title.trim(),
        body: body.trim() || undefined,
      };
      if (type === "event") {
        data.event_date = eventDate || undefined;
        data.event_time = eventTime || undefined;
        data.location = location || undefined;
      }
      await createPost(data);
      onCreate();
    } catch (err) {
      alert("Failed to post: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={s.modalBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>New Family Post</div>
        <div style={s.modalSub}>
          {needsApproval
            ? "Your post will be reviewed by a parent before going live."
            : "Share an event, update, or win with the family."}
        </div>

        <label style={s.formLabel}>Post type</label>
        <div style={s.typePicker}>
          {POST_TYPES.map((t) => (
            <button
              key={t.id}
              style={{
                ...s.typeOption,
                ...(type === t.id ? s.typeOptionSelected : {}),
              }}
              onClick={() => setType(t.id)}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
              <div style={s.typeOptionLabel}>{t.label}</div>
            </button>
          ))}
        </div>

        <label style={s.formLabel}>Title</label>
        <input
          style={s.formInput}
          placeholder={
            type === "event"
              ? "e.g. Emma's piano recital"
              : type === "win"
              ? "e.g. Jake got an A on his test!"
              : "e.g. Soccer practice moved"
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <label style={{ ...s.formLabel, marginTop: 14 }}>Details</label>
        <textarea
          style={s.formTextarea}
          placeholder="Anything else the family should know?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        {type === "event" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
              <div>
                <label style={s.formLabel}>Date</label>
                <input
                  type="date"
                  style={s.formInput}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div>
                <label style={s.formLabel}>Time</label>
                <input
                  style={s.formInput}
                  placeholder="e.g. 6:30 PM"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            </div>
            <label style={{ ...s.formLabel, marginTop: 14 }}>Location (optional)</label>
            <input
              style={s.formInput}
              placeholder="e.g. Community Music Hall"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </>
        )}

        <div style={s.modalActions}>
          <button style={s.btnGhost} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            style={{ ...s.btnPrimary, opacity: !title.trim() || submitting ? 0.5 : 1 }}
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
          >
            {submitting ? "Posting..." : needsApproval ? "Submit for Review" : "Post to Board"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main FamilyBoard Component ─────────────────────────────────────────────
export default function FamilyBoard({ currentUser, onReviewClick }) {
  const [posts, setPosts] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);

  const isAdmin = currentUser.role === "admin" || currentUser.role === "co-admin";

  const loadPosts = async () => {
    try {
      const data = await getBoardPosts();
      setPosts(data.posts || []);
      if (isAdmin) {
        const pending = await getPendingCount();
        setPendingCount(pending.count || 0);
      }
    } catch (err) {
      console.error("Failed to load board:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [currentUser.id]);

  const handleReact = async (postId, emoji) => {
    try {
      const result = await reactToPost(postId, emoji);
      setPosts(posts.map((p) => (p.id === postId ? result.post : p)));
    } catch (err) {
      console.error("React failed:", err);
    }
  };

  const handleDelete = async (postId) => {
    try {
      await deletePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  return (
    <div>
      <div style={s.sectionHeader}>
        <div style={s.sectionTitle}>Family Board</div>
        <button style={s.sectionAction} onClick={() => setShowNewPost(true)}>
          + New Post
        </button>
      </div>

      {isAdmin && pendingCount > 0 && (
        <div style={s.reviewBanner} onClick={onReviewClick}>
          <div style={s.pulse} />
          <div style={s.reviewBannerText}>
            <strong>
              {pendingCount} {pendingCount === 1 ? "post" : "posts"} waiting for review
            </strong>
          </div>
          <button style={s.reviewBannerBtn}>Review</button>
        </div>
      )}

      {loading ? (
        <div style={s.emptyState}>Loading...</div>
      ) : posts.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 500, color: B.charcoal, marginBottom: 4 }}>
            Your family board is empty
          </div>
          <div style={{ fontSize: 13 }}>
            Post an event, update, or celebrate a win — everyone in the family will see it.
          </div>
          <button
            style={{ ...s.btnPrimary, marginTop: 14 }}
            onClick={() => setShowNewPost(true)}
          >
            Create your first post
          </button>
        </div>
      ) : (
        posts.map((post) => (
          <BoardPost
            key={post.id}
            post={post}
            currentUser={currentUser}
            onReact={handleReact}
            onDelete={handleDelete}
          />
        ))
      )}

      {showNewPost && (
        <NewPostModal
          currentUser={currentUser}
          onClose={() => setShowNewPost(false)}
          onCreate={() => {
            setShowNewPost(false);
            loadPosts();
          }}
        />
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  sectionAction: {
    background: B.orange,
    color: "white",
    border: "none",
    padding: "7px 14px",
    borderRadius: 20,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: 0.5,
    cursor: "pointer",
  },

  reviewBanner: {
    background: "#FDF4E3",
    border: "1px solid rgba(196,133,58,0.25)",
    borderRadius: 10,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    cursor: "pointer",
  },
  pulse: {
    width: 8,
    height: 8,
    background: "#C4853A",
    borderRadius: "50%",
    flexShrink: 0,
    animation: "kw-pulse 2s infinite",
  },
  reviewBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "'DM Mono', monospace",
    color: B.charcoal,
  },
  reviewBannerBtn: {
    background: "#C4853A",
    color: "white",
    border: "none",
    padding: "6px 14px",
    borderRadius: 16,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    cursor: "pointer",
  },

  post: {
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 14,
    padding: "18px 20px",
    marginBottom: 12,
    transition: "border-color 0.2s",
  },
  typeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 10px",
    borderRadius: 12,
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: B.charcoal,
    marginBottom: 6,
    lineHeight: 1.4,
  },
  postBody: {
    fontSize: 14,
    color: B.slate,
    lineHeight: 1.65,
    marginBottom: 12,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    fontSize: 11,
    color: B.slate,
    marginBottom: 12,
    fontFamily: "'DM Mono', monospace",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  postFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTop: `1px solid ${B.mist}`,
    fontSize: 12,
    color: B.slate,
    gap: 8,
    flexWrap: "wrap",
  },
  author: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    fontWeight: 500,
    flexShrink: 0,
  },
  authorText: {
    fontSize: 12,
    color: B.slate,
  },
  approvedTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    color: B.green,
    letterSpacing: 0.5,
  },
  reactions: {
    display: "flex",
    gap: 4,
    alignItems: "center",
    flexWrap: "wrap",
  },
  reactionPill: {
    padding: "3px 9px",
    border: `1px solid ${B.mist}`,
    borderRadius: 12,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    transition: "all 0.15s",
  },
  addReactionBtn: {
    width: 22,
    height: 22,
    border: `1px dashed ${B.mist}`,
    borderRadius: "50%",
    background: "transparent",
    color: B.slate,
    cursor: "pointer",
    fontSize: 14,
    lineHeight: 1,
    padding: 0,
  },
  reactionPicker: {
    position: "absolute",
    bottom: "100%",
    right: 0,
    marginBottom: 6,
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 20,
    padding: 4,
    display: "flex",
    gap: 2,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 10,
  },
  reactionPickerBtn: {
    border: "none",
    background: "transparent",
    padding: "6px 8px",
    fontSize: 16,
    cursor: "pointer",
    borderRadius: 12,
  },
  moreBtn: {
    width: 22,
    height: 22,
    border: "none",
    background: "transparent",
    color: B.slate,
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    padding: 0,
  },

  emptyState: {
    background: B.warmWhite,
    border: `1px dashed ${B.mist}`,
    borderRadius: 14,
    padding: "40px 20px",
    textAlign: "center",
    color: B.slate,
    fontSize: 13,
  },

  // Modal
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(44,44,44,0.45)",
    backdropFilter: "blur(4px)",
    zIndex: 500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    background: B.warmWhite,
    borderRadius: 18,
    padding: 28,
    maxWidth: 440,
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
  },
  modalTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: B.orange,
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: B.slate,
    marginBottom: 22,
    lineHeight: 1.5,
  },
  formLabel: {
    display: "block",
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: B.slate,
    marginBottom: 6,
  },
  formInput: {
    width: "100%",
    padding: "10px 14px",
    border: `1.5px solid ${B.mist}`,
    borderRadius: 8,
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 16, // 16px prevents iOS zoom
    color: B.charcoal,
    background: "white",
    outline: "none",
    minHeight: 44,
    boxSizing: "border-box",
  },
  formTextarea: {
    width: "100%",
    padding: "10px 14px",
    border: `1.5px solid ${B.mist}`,
    borderRadius: 8,
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 16,
    color: B.charcoal,
    background: "white",
    outline: "none",
    resize: "vertical",
    minHeight: 70,
    boxSizing: "border-box",
  },
  typePicker: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginBottom: 18,
  },
  typeOption: {
    background: B.cream,
    border: `1.5px solid ${B.mist}`,
    borderRadius: 10,
    padding: "14px 8px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  typeOptionSelected: {
    borderColor: B.orange,
    background: B.orangeFaint,
  },
  typeOptionLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: 0.5,
    color: B.charcoal,
  },
  modalActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 22,
  },
  btnGhost: {
    background: "transparent",
    color: B.slate,
    border: "none",
    padding: "9px 18px",
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    cursor: "pointer",
  },
  btnPrimary: {
    background: B.orange,
    color: "white",
    border: "none",
    padding: "9px 22px",
    borderRadius: 8,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    letterSpacing: 0.5,
    cursor: "pointer",
    transition: "background 0.2s, opacity 0.2s",
  },
};
