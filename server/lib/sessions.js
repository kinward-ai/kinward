/**
 * Kinward Sessions — opaque-token authentication.
 *
 * Tokens are 32-byte random values, base64-url encoded.
 * The DB stores sha256(token) — never the token itself.
 * A database dump cannot be replayed against a live server.
 *
 * Sessions have a sliding TTL with an absolute hard cap (see security-policy).
 * Each verifyToken() call extends expires_at, but never beyond hard_cap.
 */

const crypto = require("crypto");
const { v4: uuid } = require("uuid");
const { getDb } = require("./db");
const policy = require("./security-policy");

// ─── Token helpers ─────────────────────────────────────────────────────────

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── Session creation / verification / revocation ──────────────────────────

/**
 * Create a new authenticated session for a profile.
 * Caller is responsible for verifying credentials (PIN, etc.) before calling.
 * @returns {{ token: string, sessionId: string, expiresAt: string }}
 */
function createSession(profileId, { sourceIp = null, userAgent = null } = {}) {
  const token = generateToken();
  const sessionId = uuid();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + policy.SESSION_TTL_HOURS * 60 * 60 * 1000);

  getDb()
    .prepare(
      `INSERT INTO auth_sessions
       (id, profile_id, token_hash, created_at, expires_at, last_used_at, admin_verified_at, source_ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      sessionId,
      profileId,
      tokenHash,
      now.toISOString(),
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString(),  // freshly authenticated — admin verify window starts now
      sourceIp,
      userAgent
    );

  return { token, sessionId, expiresAt: expiresAt.toISOString() };
}

/**
 * Verify a token and return the session + profile.
 * Returns null if invalid, expired, revoked, or past hard-cap.
 * Sliding-updates last_used_at + expires_at on each successful verify.
 */
function verifyToken(token) {
  if (!token) return null;

  const tokenHash = hashToken(token);
  const db = getDb();

  const session = db
    .prepare(
      `SELECT s.id as s_id, s.profile_id as s_profile_id,
              s.token_hash, s.created_at, s.expires_at,
              s.last_used_at, s.admin_verified_at, s.revoked,
              p.id AS p_id, p.name, p.role, p.avatar_color
       FROM auth_sessions s
       JOIN profiles p ON p.id = s.profile_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash);

  if (!session) return null;
  if (session.revoked) return null;

  const now = new Date();
  if (new Date(session.expires_at) <= now) return null;

  // Hard cap: reject tokens past the absolute lifetime.
  const createdAt = new Date(session.created_at);
  if (now - createdAt > policy.SESSION_HARD_CAP_DAYS * 24 * 60 * 60 * 1000) return null;

  // Sliding window — extend expires_at, but never past hard cap.
  const newExpiry = new Date(
    Math.min(
      now.getTime() + policy.SESSION_TTL_HOURS * 60 * 60 * 1000,
      createdAt.getTime() + policy.SESSION_HARD_CAP_DAYS * 24 * 60 * 60 * 1000
    )
  );

  db.prepare(
    `UPDATE auth_sessions
     SET last_used_at = ?, expires_at = ?
     WHERE id = ?`
  ).run(now.toISOString(), newExpiry.toISOString(), session.s_id);

  return {
    sessionId: session.s_id,
    profileId: session.s_profile_id,
    profile: {
      id: session.p_id,
      name: session.name,
      role: session.role,
      avatar_color: session.avatar_color,
    },
    createdAt: session.created_at,
    adminVerifiedAt: session.admin_verified_at,
  };
}

function revokeSession(sessionId) {
  getDb()
    .prepare("UPDATE auth_sessions SET revoked = 1 WHERE id = ?")
    .run(sessionId);
}

function revokeAllForProfile(profileId) {
  getDb()
    .prepare("UPDATE auth_sessions SET revoked = 1 WHERE profile_id = ?")
    .run(profileId);
}

// ─── Admin freshness (for Settings re-auth) ────────────────────────────────

function refreshAdminVerification(sessionId) {
  getDb()
    .prepare("UPDATE auth_sessions SET admin_verified_at = datetime('now') WHERE id = ?")
    .run(sessionId);
}

function isAdminVerificationFresh(session) {
  if (!session?.adminVerifiedAt) return false;
  const verifiedAt = new Date(session.adminVerifiedAt);
  const ageMs = Date.now() - verifiedAt.getTime();
  return ageMs <= policy.ADMIN_FRESHNESS_MINUTES * 60 * 1000;
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

/** Delete expired or revoked sessions. Returns count deleted. */
function pruneExpiredSessions() {
  const result = getDb()
    .prepare(
      "DELETE FROM auth_sessions WHERE expires_at < datetime('now') OR revoked = 1"
    )
    .run();
  return result.changes;
}

module.exports = {
  createSession,
  verifyToken,
  revokeSession,
  revokeAllForProfile,
  refreshAdminVerification,
  isAdminVerificationFresh,
  pruneExpiredSessions,
};
