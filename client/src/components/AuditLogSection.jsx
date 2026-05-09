import { useState, useEffect } from "react";
import { BRAND as B } from "./shared";
import { getAuditLog } from "../api";

/**
 * AuditLogSection — admin-only view of governance events.
 *
 * Shows the audit_log table with a filter by event type, formatted for
 * humans. No conversation content or memory values ever appear here —
 * just "who did what, when, and from where."
 */

const EVENT_TYPES = [
  { value: "", label: "All events" },
  { value: "profile.auth_success", label: "Sign-ins" },
  { value: "profile.auth_failed", label: "Failed PINs" },
  { value: "profile.auth_locked", label: "PIN lockouts" },
  { value: "profile.reverify_success", label: "Admin re-auth" },
  { value: "post.approved", label: "Posts approved" },
  { value: "post.declined", label: "Posts declined" },
  { value: "post.created", label: "Posts created" },
  { value: "post.submitted_for_review", label: "Posts submitted" },
  { value: "post.deleted", label: "Posts deleted" },
  { value: "memory.deleted", label: "Memories deleted" },
  { value: "memory.edited_cross_profile", label: "Cross-profile memory edits" },
  { value: "memory.exported", label: "Memory exports" },
  { value: "model.installed", label: "Models installed" },
  { value: "model.deleted", label: "Models removed" },
  { value: "profile.deleted", label: "Profile deletions" },
];

const EVENT_COLORS = {
  "profile.auth_success": B.green,
  "profile.auth_failed": "#C4853A",
  "profile.auth_locked": B.red,
  "profile.reverify_success": B.green,
  "profile.reverify_failed": "#C4853A",
  "profile.logout": B.slate,
  "profile.deleted": B.red,
  "post.approved": B.green,
  "post.declined": "#C4853A",
  "post.created": B.orange,
  "post.submitted_for_review": "#5A8BAD",
  "post.edited": B.orange,
  "post.deleted": B.red,
  "memory.deleted": B.red,
  "memory.edited_cross_profile": "#C4853A",
  "memory.exported": B.orange,
  "memory.imported": B.orange,
  "model.installed": B.green,
  "model.deleted": B.red,
};

function relativeTime(iso) {
  if (!iso) return "";
  const t = new Date(iso + "Z").getTime();  // treat naive db timestamps as UTC
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

function fullDate(iso) {
  if (!iso) return "";
  return new Date(iso + "Z").toLocaleString();
}

export default function AuditLogSection() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState("");
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLog({ limit: 200, eventType: eventType || undefined });
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [eventType]);

  return (
    <div>
      <div style={s.header}>
        <h2 style={s.title}>Audit Log</h2>
        <p style={s.desc}>
          Every governance event in Kinward — sign-ins, post approvals, profile changes, model installs.
          Conversation content and memory values are never logged here, only the fact that an action occurred.
        </p>
      </div>

      <div style={s.controls}>
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          style={s.select}
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button style={s.refreshBtn} onClick={load} title="Refresh">↻</button>
      </div>

      {loading && <div style={s.status}>Loading audit events...</div>}
      {error && <div style={{ ...s.status, color: B.red }}>Error: {error}</div>}
      {!loading && !error && events.length === 0 && (
        <div style={s.status}>No events matching this filter.</div>
      )}

      {!loading && !error && events.length > 0 && (
        <div style={s.list}>
          {events.map((e) => {
            const color = EVENT_COLORS[e.event_type] || B.slate;
            const actorName = e.actor_name || "System";
            const actorInitial = actorName[0]?.toUpperCase() || "?";
            return (
              <div key={e.id} style={s.row} title={fullDate(e.created_at)}>
                <div
                  style={{
                    ...s.actorAvatar,
                    background: e.actor_avatar_color || B.slate,
                  }}
                >
                  {actorInitial}
                </div>
                <div style={s.rowBody}>
                  <div style={s.rowSummary}>{e.summary}</div>
                  <div style={s.rowMeta}>
                    <span style={{ ...s.eventTag, background: color + "22", color }}>
                      {e.event_type}
                    </span>
                    <span>{relativeTime(e.created_at)}</span>
                    {e.source_ip && e.source_ip !== "127.0.0.1" && e.source_ip !== "::1" && (
                      <span style={s.ipTag}>from {e.source_ip}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  header: { marginBottom: 20 },
  title: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 18,
    fontWeight: 500,
    letterSpacing: 2,
    color: B.charcoal,
    margin: 0,
    marginBottom: 8,
  },
  desc: {
    fontSize: 13,
    color: B.slate,
    lineHeight: 1.6,
    fontFamily: "'Lora', Georgia, serif",
    margin: 0,
    maxWidth: 620,
  },
  controls: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  select: {
    padding: "8px 14px",
    border: `1.5px solid ${B.mist}`,
    borderRadius: 8,
    background: "white",
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.charcoal,
    outline: "none",
    cursor: "pointer",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    border: `1px solid ${B.mist}`,
    background: "transparent",
    color: B.slate,
    fontSize: 16,
    cursor: "pointer",
  },
  status: {
    padding: "24px 0",
    textAlign: "center",
    color: B.slate,
    fontSize: 13,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  row: {
    display: "flex",
    gap: 14,
    padding: "12px 14px",
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 10,
    alignItems: "flex-start",
  },
  actorAvatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    fontWeight: 500,
    flexShrink: 0,
    marginTop: 1,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowSummary: {
    fontSize: 14,
    color: B.charcoal,
    lineHeight: 1.45,
    marginBottom: 4,
  },
  rowMeta: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    color: B.slate,
    letterSpacing: 0.5,
  },
  eventTag: {
    padding: "2px 8px",
    borderRadius: 8,
    fontWeight: 500,
  },
  ipTag: {
    color: B.slate,
    fontStyle: "italic",
  },
};
