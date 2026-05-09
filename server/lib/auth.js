/**
 * Kinward Auth — convenience re-export of the security primitives.
 *
 * The actual logic lives in three focused modules:
 *   - lib/sessions.js     — token issuance, verification, freshness
 *   - lib/rate-limit.js   — PIN attempt tracking + lockout
 *   - lib/audit.js        — append-only governance log
 *   - lib/security-policy.js — central knobs (TTLs, lockout thresholds)
 *
 * This file re-exports the public API surface those three present so existing
 * `require("./lib/auth")` imports keep working. New code should import from
 * the specific module that owns the concept.
 */

const sessions = require("./sessions");
const rateLimit = require("./rate-limit");
const audit = require("./audit");
const policy = require("./security-policy");
const log = require("./log");

/**
 * Run all periodic cleanup tasks. Called from server startup and on a
 * recurring interval. Wraps individual prune steps for a single log line.
 */
function cleanupExpiredSessions() {
  const sessionsPruned = sessions.pruneExpiredSessions();
  const attemptsPruned = rateLimit.pruneOldAttempts();
  if (sessionsPruned > 0 || attemptsPruned > 0) {
    log.debug(
      `[auth] Pruned ${sessionsPruned} expired sessions, ${attemptsPruned} old PIN attempts`
    );
  }
}

module.exports = {
  // sessions
  createSession: sessions.createSession,
  verifyToken: sessions.verifyToken,
  revokeSession: sessions.revokeSession,
  revokeAllForProfile: sessions.revokeAllForProfile,

  // admin freshness
  refreshAdminVerification: sessions.refreshAdminVerification,
  isAdminVerificationFresh: sessions.isAdminVerificationFresh,

  // PIN rate limiting
  getLockoutStatus: rateLimit.getLockoutStatus,
  recordPinAttempt: rateLimit.recordPinAttempt,

  // audit
  auditLog: audit.auditLog,
  listAuditEvents: audit.listAuditEvents,

  // housekeeping
  cleanupExpiredSessions,

  // policy (read-only — for admin display)
  policy,
};
