import { useState } from "react";
import { ShieldIcon, avatarColor, timeAgo, BRAND } from "./shared";
import { CategoryPicker } from "./CategoryPicker";

export function Sidebar({ profile, sessions, activeSession, onSelectSession, onNewChat, onLock, onOpenSettings, aiName }) {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const isAdmin = profile.role === "admin" || profile.role === "co-admin";

  return (
    <div className="kw-sidebar">
      <div className="kw-sidebar-header">
        <div className="kw-sidebar-brand">
          <ShieldIcon size={18} />
          <div className="kw-sidebar-title">{aiName || "KINWARD"}</div>
        </div>
        <div className="kw-user-chip" title="Switch profile">
          <div
            className="kw-user-chip-avatar"
            style={{ background: avatarColor(profile) }}
          >
            {profile.name[0]}
          </div>
          <div className="kw-user-chip-name">{profile.name}</div>
        </div>
      </div>

      <button
        className="kw-new-chat-btn"
        onClick={() => setShowCategoryPicker(!showCategoryPicker)}
      >
        + New Chat
      </button>

      {showCategoryPicker && (
        <CategoryPicker
          profile={profile}
          onSelect={(cat) => {
            setShowCategoryPicker(false);
            onNewChat(cat);
          }}
        />
      )}

      <div className="kw-sessions-list">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`kw-session-item ${activeSession?.id === s.id ? "active" : ""}`}
            onClick={() => onSelectSession(s)}
          >
            <div className="kw-session-title">{s.title || "New conversation"}</div>
            <div className="kw-session-meta">
              <span className="kw-category-tag">{s.category || "general"}</span>
              <span>{timeAgo(s.updated_at || s.created_at)}</span>
            </div>
          </div>
        ))}
        {sessions.length === 0 && !showCategoryPicker && (
          <div style={{ padding: "20px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: BRAND.slate, fontStyle: "italic" }}>
              No conversations yet
            </div>
          </div>
        )}
      </div>

      <div className="kw-sidebar-footer">
        <button className="kw-lock-btn" onClick={onLock}>
          🔒 Lock
        </button>
        {isAdmin && onOpenSettings && (
          <button className="kw-lock-btn" onClick={onOpenSettings}>
            ⚙ Settings
          </button>
        )}
      </div>
    </div>
  );
}
