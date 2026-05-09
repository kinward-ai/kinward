/**
 * Kinward Rate Limiting — PIN attempt tracking and lockout.
 *
 * Every PIN attempt (success or failure) is recorded in pin_attempts.
 * After PIN_LOCKOUT_FAILURES failures within PIN_LOCKOUT_WINDOW_MIN minutes,
 * the profile is locked for PIN_LOCKOUT_DURATION_MIN minutes.
 *
 * Note: SQLite's datetime('now') returns 'YYYY-MM-DD HH:MM:SS' (naive UTC).
 * We use SQLite's own date arithmetic to compute window boundaries so the
 * comparison is always lexicographically valid against stored values.
 */

const { getDb } = require("./db");
const policy = require("./security-policy");

/**
 * Check if a profile is currently locked out from PIN attempts.
 * @returns {{ lockedUntil: Date | null, failureCount: number }}
 */
function getLockoutStatus(profileId) {
  const db = getDb();

  const recentFailures = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM pin_attempts
       WHERE profile_id = ?
         AND success = 0
         AND attempted_at >= datetime('now', ?)`
    )
    .get(profileId, `-${policy.PIN_LOCKOUT_WINDOW_MIN} minutes`);

  if (recentFailures.count < policy.PIN_LOCKOUT_FAILURES) {
    return { lockedUntil: null, failureCount: recentFailures.count };
  }

  const lastFailure = db
    .prepare(
      `SELECT attempted_at FROM pin_attempts
       WHERE profile_id = ? AND success = 0
       ORDER BY attempted_at DESC LIMIT 1`
    )
    .get(profileId);

  if (!lastFailure) {
    return { lockedUntil: null, failureCount: recentFailures.count };
  }

  // SQLite naive timestamp — parse as UTC by appending Z.
  const lastFailureMs = new Date(lastFailure.attempted_at + "Z").getTime();
  const lockedUntil = new Date(
    lastFailureMs + policy.PIN_LOCKOUT_DURATION_MIN * 60 * 1000
  );

  return {
    lockedUntil: lockedUntil > new Date() ? lockedUntil : null,
    failureCount: recentFailures.count,
  };
}

function recordPinAttempt(profileId, success, sourceIp = null) {
  getDb()
    .prepare(
      "INSERT INTO pin_attempts (profile_id, success, source_ip) VALUES (?, ?, ?)"
    )
    .run(profileId, success ? 1 : 0, sourceIp);
}

/** Delete pin_attempts older than the configured retention window. */
function pruneOldAttempts() {
  const result = getDb()
    .prepare(
      "DELETE FROM pin_attempts WHERE attempted_at < datetime('now', ?)"
    )
    .run(`-${policy.PIN_ATTEMPTS_RETENTION_DAYS} days`);
  return result.changes;
}

module.exports = {
  getLockoutStatus,
  recordPinAttempt,
  pruneOldAttempts,
};
