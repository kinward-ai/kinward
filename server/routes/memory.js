const express = require("express");
const router = express.Router();
const db = require("../lib/db");

/**
 * GET /api/memory/:profileId
 * Retrieve all core memories for a profile
 * Optional query param: ?category=learning
 */
router.get("/:profileId", (req, res) => {
  try {
    const { profileId } = req.params;
    const { category } = req.query;

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
    console.error("[core-memory] GET error:", err);
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

    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: `Memory saved: ${key}`,
    });
  } catch (err) {
    console.error("[core-memory] POST error:", err);
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

    const result = db
      .getDb()
      .prepare("DELETE FROM core_memory WHERE id = ? AND profile_id = ?")
      .run(memoryId, profileId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Memory not found" });
    }

    res.json({ success: true, message: "Memory deleted" });
  } catch (err) {
    console.error("[core-memory] DELETE error:", err);
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
    console.error("[core-memory] Export error:", err);
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
    res.json({ success: true, imported: count });
  } catch (err) {
    console.error("[core-memory] Import error:", err);
    res.status(500).json({ error: "Failed to import memories" });
  }
});

module.exports = router;
