/**
 * Kinward Security Policy — central knobs for auth/lockout/freshness.
 *
 * One place to tune all policy. Update here, restart the server, the changes
 * take effect everywhere. No constants buried in implementation files.
 *
 * Each value can be overridden via env var for sysadmins who want to tune
 * without editing source.
 */

function envInt(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const parsed = parseInt(v, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const policy = {
  // Sessions
  SESSION_TTL_HOURS:        envInt("KINWARD_SESSION_TTL_HOURS", 12),
  SESSION_HARD_CAP_DAYS:    envInt("KINWARD_SESSION_HARD_CAP_DAYS", 7),

  // Admin freshness (re-auth window for Settings + destructive ops)
  ADMIN_FRESHNESS_MINUTES:  envInt("KINWARD_ADMIN_FRESHNESS_MINUTES", 5),

  // PIN rate limiting
  PIN_LOCKOUT_FAILURES:     envInt("KINWARD_PIN_LOCKOUT_FAILURES", 5),
  PIN_LOCKOUT_WINDOW_MIN:   envInt("KINWARD_PIN_LOCKOUT_WINDOW_MIN", 15),
  PIN_LOCKOUT_DURATION_MIN: envInt("KINWARD_PIN_LOCKOUT_DURATION_MIN", 15),

  // Cleanup
  PIN_ATTEMPTS_RETENTION_DAYS: envInt("KINWARD_PIN_ATTEMPTS_RETENTION_DAYS", 30),
};

module.exports = policy;
