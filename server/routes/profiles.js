const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const bcrypt = require("bcrypt");
const { getDb, setConfig } = require("../lib/db");

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

// POST /api/profiles/:id/auth — authenticate with PIN
router.post("/:id/auth", async (req, res) => {
  const { pin } = req.body;
  const profile = getDb()
    .prepare("SELECT id, name, role, pin_hash, guardrail_level, avatar_color FROM profiles WHERE id = ?")
    .get(req.params.id);

  if (!profile) return res.status(404).json({ error: "Profile not found" });

  // Profiles without a PIN (young children) auto-auth
  if (!profile.pin_hash) {
    return res.json({ authenticated: true, profile: { id: profile.id, name: profile.name, role: profile.role, guardrailLevel: profile.guardrail_level } });
  }

  const match = await bcrypt.compare(String(pin), profile.pin_hash);
  if (!match) return res.status(401).json({ error: "Invalid PIN" });

  res.json({
    authenticated: true,
    profile: {
      id: profile.id,
      name: profile.name,
      role: profile.role,
      guardrailLevel: profile.guardrail_level,
      avatarColor: profile.avatar_color,
    },
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

// DELETE /api/profiles/:id — remove a profile (admin only in future)
router.delete("/:id", (req, res) => {
  const result = getDb()
    .prepare("DELETE FROM profiles WHERE id = ?")
    .run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
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
