/**
 * Kinward Audit Log — append-only governance record.
 *
 * Every governance event (sign-in, post approve/decline, profile change,
 * model install/delete, memory cross-profile edits) writes a row here.
 * Conversation content and memory values are NEVER written — only the
 * fact that the action occurred. "Governance without surveillance."
 *
 * The table is append-only by convention. The viewer in Settings → Audit Log
 * is admin-only.
 */

const { getDb } = require("./db");
const log = require("./log");

/**
 * Record a governance-relevant event.
 * @param {string} eventType - machine-readable event name (e.g. "post.approved")
 * @param {string} summary   - human-readable one-liner
 * @param {object} opts      - { actorProfileId, targetType, targetId, metadata, sourceIp }
 */
function auditLog(eventType, summary, opts = {}) {
  const {
    actorProfileId = null,
    targetType = null,
    targetId = null,
    metadata = {},
    sourceIp = null,
  } = opts;

  try {
    getDb()
      .prepare(
        `INSERT INTO audit_log (actor_profile_id, event_type, target_type, target_id, summary, metadata, source_ip)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        actorProfileId,
        eventType,
        targetType,
        targetId,
        summary,
        JSON.stringify(metadata || {}),
        sourceIp
      );
  } catch (err) {
    // Audit failures must never break the primary request path.
    log.debug(`[audit] Failed to log event ${eventType}: ${err.message}`);
  }
}

function listAuditEvents({ limit = 100, offset = 0, eventType = null } = {}) {
  const db = getDb();
  const params = [];
  let whereClause = "";

  if (eventType) {
    whereClause = "WHERE event_type = ?";
    params.push(eventType);
  }

  params.push(Number(limit), Number(offset));

  return db
    .prepare(
      `SELECT al.*,
              p.name AS actor_name, p.role AS actor_role, p.avatar_color AS actor_avatar_color
       FROM audit_log al
       LEFT JOIN profiles p ON p.id = al.actor_profile_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params);
}

module.exports = { auditLog, listAuditEvents };
