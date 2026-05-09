const express = require("express");
const router = express.Router();
const { getDb } = require("../lib/db");
const { requireAuth } = require("../middleware/auth");

// All dashboard routes require auth
router.use(requireAuth);

/**
 * Dashboard — aggregated home-screen data for a logged-in profile.
 *
 * Returns:
 *   - greeting (time-of-day aware)
 *   - recent memory highlights (last 7 days, per-profile)
 *   - recent chat sessions (last 5 for this profile)
 *   - family activity summary (admin only)
 */

function getGreeting(hour) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function isAdmin(role) {
  return role === "admin" || role === "co-admin";
}

router.get("/:profileId", (req, res) => {
  try {
    const { profileId } = req.params;
    const db = getDb();

    // Authorization: you can only view your own dashboard, unless admin
    const sessionProfileId = req.session.profileId;
    const sessionRole = req.session.profile.role;
    if (sessionProfileId !== profileId && !isAdmin(sessionRole)) {
      return res.status(403).json({ error: "Cannot view another profile's dashboard" });
    }

    const profile = db
      .prepare("SELECT id, name, role, avatar_color FROM profiles WHERE id = ?")
      .get(profileId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // ─── Greeting ────────────────────────────────────────
    const now = new Date();
    const greeting = {
      phrase: getGreeting(now.getHours()),
      name: profile.name,
      date: now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    };

    // ─── Memory highlights (last 7 days, this profile) ───
    const memoryRows = db
      .prepare(
        `SELECT category, key, value, updated_at
         FROM core_memory
         WHERE profile_id = ?
           AND datetime(updated_at) >= datetime('now', '-7 days')
         ORDER BY updated_at DESC
         LIMIT 5`
      )
      .all(profileId);

    const memoryHighlights = {
      count: memoryRows.length,
      items: memoryRows.map((m) => ({
        category: m.category,
        key: m.key,
        value: m.value,
        updatedAt: m.updated_at,
      })),
    };

    // ─── Recent sessions (last 5 for this profile) ───────
    const sessionRows = db
      .prepare(
        `SELECT s.id, s.title, s.category, s.updated_at,
                (SELECT COUNT(*) FROM messages WHERE session_id = s.id) as message_count
         FROM sessions s
         WHERE s.profile_id = ?
         ORDER BY s.updated_at DESC
         LIMIT 5`
      )
      .all(profileId);

    const recentSessions = sessionRows.map((s) => ({
      id: s.id,
      title: s.title || "Untitled conversation",
      category: s.category,
      updatedAt: s.updated_at,
      messageCount: s.message_count,
    }));

    // ─── Pending post count (admin only) ─────────────────
    let pendingPostCount = 0;
    let familyActivity = null;

    if (isAdmin(profile.role)) {
      const pending = db
        .prepare("SELECT COUNT(*) as count FROM family_posts WHERE status = 'pending'")
        .get();
      pendingPostCount = pending.count;

      // Family activity summary — this week
      const activity = db
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM sessions
              WHERE datetime(created_at) >= datetime('now', '-7 days')) as sessionsThisWeek,
             (SELECT COUNT(DISTINCT profile_id) FROM sessions
              WHERE datetime(created_at) >= datetime('now', '-7 days')) as activeMembers,
             (SELECT COUNT(*) FROM family_posts
              WHERE status = 'approved'
              AND datetime(created_at) >= datetime('now', '-7 days')) as postsThisWeek`
        )
        .get();

      // Most active category this week
      const topCategory = db
        .prepare(
          `SELECT category, COUNT(*) as count
           FROM sessions
           WHERE datetime(created_at) >= datetime('now', '-7 days')
             AND category IS NOT NULL
           GROUP BY category
           ORDER BY count DESC
           LIMIT 1`
        )
        .get();

      familyActivity = {
        sessionsThisWeek: activity.sessionsThisWeek,
        activeMembers: activity.activeMembers,
        postsThisWeek: activity.postsThisWeek,
        topCategory: topCategory
          ? { category: topCategory.category, count: topCategory.count }
          : null,
      };
    }

    res.json({
      profile,
      greeting,
      memoryHighlights,
      recentSessions,
      pendingPostCount,
      familyActivity,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
