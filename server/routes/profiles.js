const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const bcrypt = require("bcrypt");
const { getDb, setConfig } = require("../lib/db");
const auth = require("../lib/auth");
const { requireAuth, requireFreshAdmin, clientIp } = require("../middleware/auth");

const SALT_ROUNDS = 10;

// Role → default guardrail level mapping
const ROLE_GUARDRAILS = {
  admin: "open",
  "co-admin": "open",
  teen: "moderate",
  child: "strict",
  guest: "strict",
};

// Role → avatar color defaults
const ROLE_COLORS = {
  admin: "#C75B2A",
  "co-admin": "#C75B2A",
  teen: "#5B8FB9",
  child: "#4A8B3F",
  guest: "#8B7355",
};

// POST /api/profiles — create a profile
router.post("/", async (req, res) => {
  const { name, role, pin } = req.body;

  if (!name || !role) {
    return res.status(400).json({ error: "Name and role required" });
  }
  if (!ROLE_GUARDRAILS[role]) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const id = uuid();
  const pinHash = pin ? await bcrypt.hash(String(pin), SALT_ROUNDS) : null;
  const guardrail = ROLE_GUARDRAILS[role];
  const color = ROLE_COLORS[role];

  getDb()
    .prepare(
      `INSERT INTO profiles (id, name, role, pin_hash, guardrail_level, avatar_color)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, name, role, pinHash, guardrail, color);

  res.json({
    id,
    name,
    role,
    guardrailLevel: guardrail,
    avatarColor: color,
  });
});

// GET /api/profiles — list all profiles (no sensitive fields)
router.get("/", (req, res) => {
  const rows = getDb()
    .prepare(
      "SELECT id, name, role, guardrail_level, avatar_color, created_at, CASE WHEN pin_hash IS NOT NULL THEN 1 ELSE 0 END as hasPin FROM profiles ORDER BY created_at"
    )
    .all();
  res.json(rows);
});

// POST /api/profiles/:id/auth — authenticate with PIN, issue session token
router.post("/:id/auth", async (req, res) => {
  const { pin } = req.body;
  const sourceIp = clientIp(req);
  const userAgent = req.headers["user-agent"] || null;
  const profileId = req.params.id;

  const profile = getDb()
    .prepare("SELECT id, name, role, pin_hash, guardrail_level, avatar_color FROM profiles WHERE id = ?")
    .get(profileId);

  if (!profile) return res.status(404).json({ error: "Profile not found" });

  // Check rate limit BEFORE verifying PIN (don't leak whether PIN matched under lockout)
  const lockout = auth.getLockoutStatus(profileId);
  if (lockout.lockedUntil) {
    const waitMs = lockout.lockedUntil.getTime() - Date.now();
    auth.auditLog("profile.auth_locked", `PIN lockout active for ${profile.name}`, {
      actorProfileId: profileId,
      targetType: "profile",
      targetId: profileId,
      sourceIp,
      metadata: { waitMs, failureCount: lockout.failureCount },
    });
    return res.status(429).json({
      error: "Too many failed attempts. Try again later.",
      retryAfterSeconds: Math.ceil(waitMs / 1000),
    });
  }

  // Profiles without a PIN (young children) auto-auth
  let pinOk;
  if (!profile.pin_hash) {
    pinOk = true;
  } else {
    pinOk = await bcrypt.compare(String(pin || ""), profile.pin_hash);
  }

  auth.recordPinAttempt(profileId, pinOk, sourceIp);

  if (!pinOk) {
    const postLock = auth.getLockoutStatus(profileId);
    auth.auditLog("profile.auth_failed", `Failed PIN attempt for ${profile.name}`, {
      actorProfileId: profileId,
      targetType: "profile",
      targetId: profileId,
      sourceIp,
      metadata: { failureCount: postLock.failureCount },
    });
    return res.status(401).json({
      error: "Invalid PIN",
      failuresInWindow: postLock.failureCount,
    });
  }

  // Success — issue a session token
  const session = auth.createSession(profileId, { sourceIp, userAgent });
  auth.auditLog("profile.auth_success", `${profile.name} signed in`, {
    actorProfileId: profileId,
    targetType: "profile",
    targetId: profileId,
    sourceIp,
  });

  res.json({
    authenticated: true,
    token: session.token,
    expiresAt: session.expiresAt,
    profile: {
      id: profile.id,
      name: profile.name,
      role: profile.role,
      guardrailLevel: profile.guardrail_level,
      avatarColor: profile.avatar_color,
    },
  });
});

// POST /api/profiles/:id/reverify — refresh admin freshness stamp (Settings re-auth)
// Same PIN check as /auth, but reuses the existing session instead of making a new one.
router.post("/:id/reverify", requireAuth, async (req, res) => {
  const { pin } = req.body;
  const sourceIp = clientIp(req);
  const profileId = req.params.id;

  // Can only reverify your own profile
  if (req.session.profileId !== profileId) {
    return res.status(403).json({ error: "Cannot reverify another profile" });
  }

  const profile = getDb()
    .prepare("SELECT id, name, role, pin_hash FROM profiles WHERE id = ?")
    .get(profileId);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  // Rate-limit reverify attempts too
  const lockout = auth.getLockoutStatus(profileId);
  if (lockout.lockedUntil) {
    return res.status(429).json({
      error: "Too many failed attempts. Try again later.",
      retryAfterSeconds: Math.ceil((lockout.lockedUntil.getTime() - Date.now()) / 1000),
    });
  }

  const pinOk = profile.pin_hash
    ? await bcrypt.compare(String(pin || ""), profile.pin_hash)
    : true;
  auth.recordPinAttempt(profileId, pinOk, sourceIp);

  if (!pinOk) {
    auth.auditLog("profile.reverify_failed", `Failed admin re-auth for ${profile.name}`, {
      actorProfileId: profileId,
      targetType: "profile",
      targetId: profileId,
      sourceIp,
    });
    return res.status(401).json({ error: "Invalid PIN" });
  }

  auth.refreshAdminVerification(req.session.sessionId);
  auth.auditLog("profile.reverify_success", `${profile.name} re-authenticated for admin action`, {
    actorProfileId: profileId,
    targetType: "profile",
    targetId: profileId,
    sourceIp,
  });

  res.json({ ok: true, verifiedAt: new Date().toISOString() });
});

// POST /api/profiles/logout — revoke current session
router.post("/logout", requireAuth, (req, res) => {
  auth.revokeSession(req.session.sessionId);
  auth.auditLog("profile.logout", `${req.session.profile.name} signed out`, {
    actorProfileId: req.session.profileId,
    sourceIp: req.sourceIp,
  });
  res.json({ ok: true });
});

// GET /api/profiles/me — info about the current session
router.get("/me", requireAuth, (req, res) => {
  res.json({
    profile: req.session.profile,
    sessionId: req.session.sessionId,
    adminVerifiedAt: req.session.adminVerifiedAt,
    adminFresh: auth.isAdminVerificationFresh(req.session),
  });
});

// POST /api/profiles/:id/pin — set PIN for first time
router.post("/:id/pin", async (req, res) => {
  const { pin } = req.body;
  if (!pin || String(pin).length !== 4) {
    return res.status(400).json({ error: "PIN must be 4 digits" });
  }

  const profile = getDb()
    .prepare("SELECT id, pin_hash FROM profiles WHERE id = ?")
    .get(req.params.id);

  if (!profile) return res.status(404).json({ error: "Profile not found" });

  // Don't allow overwriting an existing PIN through this endpoint
  if (profile.pin_hash) {
    return res.status(400).json({ error: "PIN already set. Use admin reset to change." });
  }

  const hash = await bcrypt.hash(String(pin), SALT_ROUNDS);
  getDb()
    .prepare("UPDATE profiles SET pin_hash = ? WHERE id = ?")
    .run(hash, req.params.id);

  res.json({ success: true });
});

// DELETE /api/profiles/:id — remove a profile (admin w/ fresh verify only)
router.delete("/:id", requireFreshAdmin, (req, res) => {
  const target = getDb()
    .prepare("SELECT id, name FROM profiles WHERE id = ?")
    .get(req.params.id);
  if (!target) return res.status(404).json({ error: "Not found" });

  const result = getDb()
    .prepare("DELETE FROM profiles WHERE id = ?")
    .run(req.params.id);

  auth.auditLog("profile.deleted", `Profile ${target.name} deleted`, {
    actorProfileId: req.session.profileId,
    targetType: "profile",
    targetId: target.id,
    sourceIp: req.sourceIp,
    metadata: { deletedProfileName: target.name },
  });

  // Revoke any active sessions for that profile
  auth.revokeAllForProfile(req.params.id);

  res.json({ ok: true });
});

// POST /api/profiles/setup-batch — bulk create during wizard
router.post("/setup-batch", async (req, res) => {
  const { admin, familyMembers } = req.body;

  if (!admin?.name || !admin?.pin) {
    return res.status(400).json({ error: "Admin name and PIN required" });
  }

  const db = getDb();
  const created = [];

  // Create admin
  const adminId = uuid();
  const adminPinHash = await bcrypt.hash(String(admin.pin), SALT_ROUNDS);
  db.prepare(
    `INSERT INTO profiles (id, name, role, pin_hash, guardrail_level, avatar_color)
     VALUES (?, ?, 'admin', ?, 'open', '#C75B2A')`
  ).run(adminId, admin.name, adminPinHash);

  created.push({ id: adminId, name: admin.name, role: "admin" });
  setConfig("admin_profile_id", adminId);

  // Create family members
  if (familyMembers?.length) {
    for (const member of familyMembers) {
      const memberId = uuid();
      const guardrail = ROLE_GUARDRAILS[member.role] || "moderate";
      const color = ROLE_COLORS[member.role] || "#8B7355";
      db.prepare(
        `INSERT INTO profiles (id, name, role, guardrail_level, avatar_color)
         VALUES (?, ?, ?, ?, ?)`
      ).run(memberId, member.name, member.role, guardrail, color);
      created.push({ id: memberId, name: member.name, role: member.role });
    }
  }

  res.json({ profiles: created });
});

module.exports = router;
