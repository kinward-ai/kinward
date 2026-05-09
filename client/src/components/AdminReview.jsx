import { useState, useEffect } from "react";
import { BRAND as B } from "./shared";
import { getPendingPosts, approvePost, declinePost, editPost } from "../api";

/**
 * AdminReview — shows pending family board posts with approve/edit/decline actions.
 * Only accessible to admin and co-admin roles.
 */

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PendingPost({ post, onApprove, onEdit, onDecline }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body || "");
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await onEdit(post.id, { title, body });
    } finally {
      setSaving(false);
    }
  };

  const typeIcon = post.type === "event" ? "📅" : post.type === "win" ? "🎉" : "📝";

  return (
    <div style={s.post}>
      <div style={s.typeBadge}>⏱ Pending review · {post.type}</div>

      {editing ? (
        <>
          <input
            style={s.editInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <textarea
            style={s.editTextarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Details"
          />
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button
              style={s.btnSmall}
              onClick={() => {
                setTitle(post.title);
                setBody(post.body || "");
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              style={s.btnApprove}
              disabled={saving}
              onClick={handleSaveEdit}
            >
              {saving ? "Saving..." : "Save & approve"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={s.postTitle}>
            {typeIcon} {post.title}
          </div>
          {post.body && <div style={s.postBody}>{post.body}</div>}
          {post.event_date && (
            <div style={s.metaRow}>
              📅 {new Date(post.event_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {post.event_time && ` · ${post.event_time}`}
            </div>
          )}
        </>
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
          <span>
            From {post.author?.name} · {timeAgo(post.created_at)}
          </span>
        </div>
      </div>

      {!editing && (
        <div style={s.actions}>
          <button style={s.btnApprove} onClick={() => onApprove(post.id)}>
            ✓ Approve
          </button>
          <button style={s.btnEdit} onClick={() => setEditing(true)}>
            Edit & approve
          </button>
          <button
            style={s.btnDecline}
            onClick={() => {
              if (window.confirm("Decline this post?")) onDecline(post.id);
            }}
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminReview({ currentUser, onBack }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await getPendingPosts();
      setPosts(data.posts || []);
    } catch (err) {
      console.error("Load pending failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (postId) => {
    try {
      await approvePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert("Approve failed: " + err.message);
    }
  };

  const handleEdit = async (postId, updates) => {
    try {
      await editPost(postId, updates);
      await approvePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  };

  const handleDecline = async (postId) => {
    try {
      await declinePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      alert("Decline failed: " + err.message);
    }
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>
          ←
        </button>
        <div>
          <div style={s.title}>Review posts</div>
          <div style={s.sub}>
            {posts.length} {posts.length === 1 ? "post" : "posts"} waiting for your review
          </div>
        </div>
      </div>

      <div style={s.body}>
        {loading ? (
          <div style={s.empty}>Loading...</div>
        ) : posts.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✨</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: B.charcoal }}>
              All caught up
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              No posts waiting for review.
            </div>
            <button style={{ ...s.btnBack, marginTop: 20 }} onClick={onBack}>
              Back to Dashboard
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <PendingPost
              key={post.id}
              post={post}
              onApprove={handleApprove}
              onEdit={handleEdit}
              onDecline={handleDecline}
            />
          ))
        )}
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100dvh",
    background: B.cream,
    fontFamily: "'Lora', Georgia, serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "20px 24px",
    borderBottom: `1px solid ${B.mist}`,
    background: B.warmWhite,
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: B.cream,
    border: `1px solid ${B.mist}`,
    color: B.slate,
    cursor: "pointer",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: 1,
    color: B.charcoal,
  },
  sub: {
    fontSize: 12,
    color: B.slate,
    marginTop: 2,
  },
  body: {
    maxWidth: 780,
    margin: "0 auto",
    padding: "24px",
  },
  post: {
    background: `linear-gradient(to right, #FDF4E3 0%, ${B.warmWhite} 60%)`,
    border: "1.5px solid #C4853A",
    borderRadius: 14,
    padding: "18px 20px",
    marginBottom: 14,
  },
  typeBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 12,
    background: "#FDF4E3",
    color: "#C4853A",
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
    marginBottom: 10,
  },
  metaRow: {
    display: "inline-block",
    fontSize: 11,
    color: B.slate,
    marginBottom: 10,
    fontFamily: "'DM Mono', monospace",
  },
  postFooter: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTop: `1px solid ${B.mist}`,
    fontSize: 12,
    color: B.slate,
  },
  author: {
    display: "flex",
    alignItems: "center",
    gap: 8,
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
  },
  actions: {
    display: "flex",
    gap: 8,
    paddingTop: 12,
    borderTop: `1px solid ${B.mist}`,
    marginTop: 12,
    flexWrap: "wrap",
  },
  btnApprove: {
    padding: "7px 14px",
    borderRadius: 16,
    background: B.green,
    color: "white",
    border: "none",
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  btnEdit: {
    padding: "7px 14px",
    borderRadius: 16,
    background: B.warmWhite,
    color: B.slate,
    border: `1px solid ${B.mist}`,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    cursor: "pointer",
  },
  btnDecline: {
    padding: "7px 14px",
    borderRadius: 16,
    background: "transparent",
    color: B.red,
    border: `1px solid ${B.red}66`,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    cursor: "pointer",
  },
  btnSmall: {
    padding: "6px 12px",
    borderRadius: 14,
    background: "transparent",
    color: B.slate,
    border: `1px solid ${B.mist}`,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    cursor: "pointer",
  },
  editInput: {
    width: "100%",
    padding: "8px 12px",
    border: `1.5px solid ${B.mist}`,
    borderRadius: 8,
    fontFamily: "'Lora', serif",
    fontSize: 16,
    marginBottom: 8,
    background: "white",
    outline: "none",
    boxSizing: "border-box",
  },
  editTextarea: {
    width: "100%",
    padding: "8px 12px",
    border: `1.5px solid ${B.mist}`,
    borderRadius: 8,
    fontFamily: "'Lora', serif",
    fontSize: 16,
    marginBottom: 10,
    background: "white",
    outline: "none",
    resize: "vertical",
    minHeight: 60,
    boxSizing: "border-box",
  },
  empty: {
    textAlign: "center",
    padding: "60px 20px",
    color: B.slate,
    fontSize: 13,
  },
  btnBack: {
    padding: "9px 22px",
    background: B.orange,
    color: "white",
    border: "none",
    borderRadius: 8,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    cursor: "pointer",
  },
};
