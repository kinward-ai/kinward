const express = require("express");
const router = express.Router();
const db = require("../lib/db");
const log = require("../lib/log");
const auth = require("../lib/auth");
const { requireAuth } = require("../middleware/auth");

/**
 * Memory authorization:
 *   - A profile can always access its own memories.
 *   - Admins and co-admins can access anyone's memories.
 *   - All other cross-profile access is denied.
 *
 * Cross-profile memory mutations (admin editing/deleting someone else's
 * memories) additionally require a fresh admin verification — caller checks
 * isAdminVerificationFresh on the session and returns 401 with
 * reason="admin_reauth_required" if stale, prompting the UI to re-prompt PIN.
 */
function canAccessMemory(session, targetProfileId) {
  if (session.profileId === targetProfileId) return true;
  const role = session.profile.role;
  return role === "admin" || role === "co-admin";
}

function isCrossProfile(session, targetProfileId) {
  return session.profileId !== targetProfileId;
}

function requireFreshIfCrossProfile(session, targetProfileId, res) {
  if (!isCrossProfile(session, targetProfileId)) return true;
  if (auth.isAdminVerificationFresh(session)) return true;
  res.status(401).json({
    error: "Admin re-authentication required to modify another profile's memory",
    reason: "admin_reauth_required",
  });
  return false;
}

// All memory endpoints require auth
router.use(requireAuth);

/**
 * GET /api/memory/:profileId
 * Retrieve all core memories for a profile
 * Optional query param: ?category=learning
 */
router.get("/:profileId", (req, res) => {
  try {
    const { profileId } = req.params;
    const { category } = req.query;

    if (!canAccessMemory(req.session, profileId)) {
      return res.status(403).json({ error: "Cannot access another profile's memories" });
    }

    let memories;
    if (category) {
      memories = db
        .getDb()
        .prepare(
          "SELECT id, category, key, value, source, created_at, updated_at FROM core_memory WHERE profile_id = ? AND category = ? ORDER BY category, key"
        )
        .all(profileId, category);
    } else {
      memories = db
        .getDb()
        .prepare(
          "SELECT id, category, key, value, source, created_at, updated_at FROM core_memory WHERE profile_id = ? ORDER BY category, key"
        )
        .all(profileId);
    }

    res.json({ profile_id: profileId, memories });
  } catch (err) {
    log.error("[core-memory] GET error:", err);
    res.status(500).json({ error: "Failed to retrieve memories" });
  }
});

/**
 * POST /api/memory/:profileId
 * Add or update a core memory (upsert on profile_id + category + key)
 * Body: { category, key, value, source? }
 */
router.post("/:profileId", (req, res) => {
  try {
    const { profileId } = req.params;
    const { category = "general", key, value, source = "manual" } = req.body;

    if (!canAccessMemory(req.session, profileId)) {
      return res.status(403).json({ error: "Cannot modify another profile's memories" });
    }
    if (!requireFreshIfCrossProfile(req.session, profileId, res)) return;

    if (!key || !value) {
      return res.status(400).json({ error: "key and value are required" });
    }

    const result = db
      .getDb()
      .prepare(
        `INSERT INTO core_memory (profile_id, category, key, value, source, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(profile_id, category, key)
         DO UPDATE SET value = excluded.value, source = excluded.source, updated_at = datetime('now')`
      )
      .run(profileId, category, key, value, source);

    // Audit cross-profile memory edits (admin editing someone else's memory)
    if (req.session.profileId !== profileId) {
      auth.auditLog(
        "memory.edited_cross_profile",
        `${req.session.profile.name} edited memory for another profile`,
        {
          actorProfileId: req.session.profileId,
          targetType: "memory",
          targetId: String(result.lastInsertRowid),
          sourceIp: req.sourceIp,
          metadata: { targetProfileId: profileId, category, key },
        }
      );
    }

    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: `Memory saved: ${key}`,
    });
  } catch (err) {
    log.error("[core-memory] POST error:", err);
    res.status(500).json({ error: "Failed to save memory" });
  }
});

/**
 * DELETE /api/memory/:profileId/:memoryId
 * Explicitly delete a core memory (admin action only)
 */
router.delete("/:profileId/:memoryId", (req, res) => {
  try {
    const { profileId, memoryId } = req.params;

    if (!canAccessMemory(req.session, profileId)) {
      return res.status(403).json({ error: "Cannot delete another profile's memories" });
    }
    if (!requireFreshIfCrossProfile(req.session, profileId, res)) return;

    const result = db
      .getDb()
      .prepare("DELETE FROM core_memory WHERE id = ? AND profile_id = ?")
      .run(memoryId, profileId);

    if (result.changes > 0) {
      auth.auditLog("memory.deleted", `${req.session.profile.name} deleted a memory`, {
        actorProfileId: req.session.profileId,
        targetType: "memory",
        targetId: memoryId,
        sourceIp: req.sourceIp,
        metadata: { targetProfileId: profileId },
      });
    }

    if (result.changes === 0) {
      return res.status(404).json({ error: "Memory not found" });
    }

    res.json({ success: true, message: "Memory deleted" });
  } catch (err) {
    log.error("[core-memory] DELETE error:", err);
    res.status(500).json({ error: "Failed to delete memory" });
  }
});

/**
 * GET /api/memory/:profileId/export
 * Export all core memories as JSON (for backup / hardware migration)
 */
router.get("/:profileId/export", (req, res) => {
  try {
    const { profileId } = req.params;

    if (!canAccessMemory(req.session, profileId)) {
      return res.status(403).json({ error: "Cannot export another profile's memories" });
    }

    auth.auditLog("memory.exported", `${req.session.profile.name} exported memories`, {
      actorProfileId: req.session.profileId,
      targetType: "profile",
      targetId: profileId,
      sourceIp: req.sourceIp,
    });

    const memories = db
      .getDb()
      .prepare(
        "SELECT category, key, value, source, created_at, updated_at FROM core_memory WHERE profile_id = ? ORDER BY category, key"
      )
      .all(profileId);

    const profile = db
      .getDb()
      .prepare("SELECT name, role FROM profiles WHERE id = ?")
      .get(profileId);

    res.json({
      export_version: 1,
      exported_at: new Date().toISOString(),
      profile: { id: profileId, ...profile },
      memories,
    });
  } catch (err) {
    log.error("[core-memory] Export error:", err);
    res.status(500).json({ error: "Failed to export memories" });
  }
});

/**
 * POST /api/memory/:profileId/import
 * Import memories from a backup file (for hardware migration)
 * Body: { memories: [{ category, key, value, source? }] }
 */
router.post("/:profileId/import", (req, res) => {
  try {
    const { profileId } = req.params;
    const { memories } = req.body;

    if (!canAccessMemory(req.session, profileId)) {
      return res.status(403).json({ error: "Cannot import to another profile" });
    }
    // Bulk import is destructive even on own profile — always require fresh admin
    if (!auth.isAdminVerificationFresh(req.session)) {
      return res.status(401).json({
        error: "Admin re-authentication required for bulk memory import",
        reason: "admin_reauth_required",
      });
    }

    if (!Array.isArray(memories)) {
      return res.status(400).json({ error: "memories must be an array" });
    }

    const stmt = db
      .getDb()
      .prepare(
        `INSERT INTO core_memory (profile_id, category, key, value, source, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(profile_id, category, key)
         DO UPDATE SET value = excluded.value, source = excluded.source, updated_at = datetime('now')`
      );

    const insertMany = db.getDb().transaction((items) => {
      let count = 0;
      for (const item of items) {
        stmt.run(
          profileId,
          item.category || "general",
          item.key,
          item.value,
          item.source || "import"
        );
        count++;
      }
      return count;
    });

    const count = insertMany(memories);

    auth.auditLog("memory.imported", `${req.session.profile.name} imported ${count} memories`, {
      actorProfileId: req.session.profileId,
      targetType: "profile",
      targetId: profileId,
      sourceIp: req.sourceIp,
      metadata: { importedCount: count },
    });

    res.json({ success: true, imported: count });
  } catch (err) {
    log.error("[core-memory] Import error:", err);
    res.status(500).json({ error: "Failed to import memories" });
  }
});

module.exports = router;
