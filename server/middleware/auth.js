/**
 * Kinward Auth Middleware
 *
 * Three middleware functions:
 *   - requireAuth        — any authenticated session
 *   - requireRole(roles) — authenticated AND role matches allow-list
 *   - requireFreshAdmin  — admin/co-admin AND admin verify within last 5 min
 *
 * Token expected in `Authorization: Bearer <token>` header.
 * Attaches `req.session` on success (shape matches auth.verifyToken return).
 *
 * SECURITY NOTES:
 * - Never trust req.body.profileId — always use req.session.profileId.
 * - If an API handler needs to act on another profile (e.g. admin editing
 *   a kid's memory), it checks role permissions explicitly.
 * - On any auth failure we return 401, never leak whether the token was
 *   expired vs invalid vs revoked.
 */

const auth = require("../lib/auth");

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

function clientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || null;
}

/**
 * Gate: requires any valid session.
 * Attaches req.session.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const session = auth.verifyToken(token);
  if (!session) {
    return res.status(401).json({ error: "Authentication required" });
  }

  req.session = session;
  req.sourceIp = clientIp(req);
  next();
}

/**
 * Gate: requires one of the allowed roles.
 * Must be used AFTER requireAuth (or will run it first if needed).
 *
 * Usage:
 *   router.get("/admin-thing", requireRole(["admin", "co-admin"]), handler);
 */
function requireRole(allowedRoles) {
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    // Chain requireAuth in case it wasn't called first
    const runCheck = () => {
      if (!req.session) return res.status(401).json({ error: "Authentication required" });
      if (!allowed.includes(req.session.profile.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      next();
    };

    if (req.session) return runCheck();
    requireAuth(req, res, (err) => {
      if (err) return;
      runCheck();
    });
  };
}

/**
 * Gate: admin / co-admin with a fresh PIN verification (within ADMIN_FRESHNESS_MINUTES).
 * Used for Settings entry, profile changes, destructive actions.
 *
 * On stale verification, returns 401 with { reason: "admin_reauth_required" } so
 * the client knows to prompt for PIN instead of redirecting to profile gate.
 */
function requireFreshAdmin(req, res, next) {
  const runCheck = () => {
    if (!req.session) return res.status(401).json({ error: "Authentication required" });

    const role = req.session.profile.role;
    if (role !== "admin" && role !== "co-admin") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    if (!auth.isAdminVerificationFresh(req.session)) {
      return res.status(401).json({
        error: "Admin re-authentication required",
        reason: "admin_reauth_required",
      });
    }

    next();
  };

  if (req.session) return runCheck();
  requireAuth(req, res, (err) => {
    if (err) return;
    runCheck();
  });
}

module.exports = { requireAuth, requireRole, requireFreshAdmin, clientIp };
