const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const { getDb } = require("../lib/db");
const auth = require("../lib/auth");
const { requireAuth, requireRole } = require("../middleware/auth");

/**
 * Family Board — moderated shared feed
 *
 * Auth: every endpoint requires a valid session.
 * Authorization:
 *   - GET /           approved posts, visible to any authenticated profile
 *   - GET /pending    admin only (requireRole)
 *   - POST /          any authenticated profile (author = session profile)
 *   - PUT /:id/approve   admin only
 *   - PUT /:id/decline   admin only
 *   - PUT /:id        admin OR author (if still pending)
 *   - DELETE /:id     admin OR author (if still pending)
 *   - POST /:id/react any authenticated profile
 *
 * Moderation policy:
 *   admin / co-admin  → posts auto-approve
 *   teen              → posts auto-approve (admin can retract after the fact)
 *   child             → posts go pending, admin must approve
 *
 * Every authorization check derives identity from req.session, NEVER the body.
 */

// Every board endpoint requires authentication
router.use(requireAuth);

// Auto-approve rules based on author role
function getInitialStatus(role) {
  if (role === "admin" || role === "co-admin" || role === "teen") return "approved";
  return "pending";
}

function isAdmin(role) {
  return role === "admin" || role === "co-admin";
}

// Hydrate a post with author, approver, and reactions
function hydratePost(post) {
  const db = getDb();
  const author = db.prepare(
    "SELECT id, name, role, avatar_color FROM profiles WHERE id = ?"
  ).get(post.author_profile_id);

  let approver = null;
  if (post.approved_by_profile_id) {
    approver = db.prepare(
      "SELECT id, name, role, avatar_color FROM profiles WHERE id = ?"
    ).get(post.approved_by_profile_id);
  }

  // Reactions grouped by emoji with count and who reacted
  const reactionRows = db.prepare(
    `SELECT emoji, profile_id FROM post_reactions WHERE post_id = ? ORDER BY created_at`
  ).all(post.id);

  const reactions = {};
  for (const r of reactionRows) {
    if (!reactions[r.emoji]) reactions[r.emoji] = { emoji: r.emoji, count: 0, profileIds: [] };
    reactions[r.emoji].count++;
    reactions[r.emoji].profileIds.push(r.profile_id);
  }

  return {
    ...post,
    author,
    approver,
    reactions: Object.values(reactions),
  };
}

// GET /api/board — list approved posts (everyone sees this feed)
router.get("/", (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const posts = getDb()
      .prepare(
        `SELECT * FROM family_posts
         WHERE status = 'approved'
         ORDER BY
           CASE
             WHEN event_date IS NOT NULL AND event_date >= date('now') THEN 0
             ELSE 1
           END,
           COALESCE(event_date, created_at) DESC
         LIMIT ? OFFSET ?`
      )
      .all(Number(limit), Number(offset));

    res.json({ posts: posts.map(hydratePost) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/board/pending — list pending posts (admin only)
router.get("/pending", requireRole(["admin", "co-admin"]), (req, res) => {
  try {
    const posts = getDb()
      .prepare(
        `SELECT * FROM family_posts
         WHERE status = 'pending'
         ORDER BY created_at ASC`
      )
      .all();

    res.json({ posts: posts.map(hydratePost) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/board/pending/count — badge counter for admin UI
router.get("/pending/count", (req, res) => {
  try {
    // Non-admins always see 0 (no information leak)
    if (!isAdmin(req.session.profile.role)) {
      return res.json({ count: 0 });
    }

    const row = getDb()
      .prepare("SELECT COUNT(*) as count FROM family_posts WHERE status = 'pending'")
      .get();
    res.json({ count: row.count });
  } catch (err) {
    res.json({ count: 0 });
  }
});

// POST /api/board — create a new post (author derived from session)
// Body: { type, title, body, event_date?, event_time?, location? }
router.post("/", (req, res) => {
  try {
    const { type, title, body, event_date, event_time, location } = req.body;
    const authorProfileId = req.session.profileId;
    const authorRole = req.session.profile.role;

    if (!type || !title) {
      return res.status(400).json({ error: "type and title required" });
    }
    if (!["event", "update", "win"].includes(type)) {
      return res.status(400).json({ error: "invalid type" });
    }

    const id = uuid();
    const status = getInitialStatus(authorRole);
    const approved_by = status === "approved" ? authorProfileId : null;
    const approved_at = status === "approved" ? new Date().toISOString() : null;

    getDb()
      .prepare(
        `INSERT INTO family_posts
         (id, type, title, body, event_date, event_time, location, author_profile_id, status, approved_by_profile_id, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        type,
        title.trim(),
        body?.trim() || null,
        event_date || null,
        event_time || null,
        location?.trim() || null,
        authorProfileId,
        status,
        approved_by,
        approved_at
      );

    auth.auditLog(
      status === "approved" ? "post.created" : "post.submitted_for_review",
      `${req.session.profile.name} ${status === "approved" ? "posted" : "submitted"} "${title.trim()}"`,
      {
        actorProfileId: authorProfileId,
        targetType: "post",
        targetId: id,
        sourceIp: req.sourceIp,
        metadata: { type, status },
      }
    );

    const post = getDb().prepare("SELECT * FROM family_posts WHERE id = ?").get(id);
    res.json({ post: hydratePost(post) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/board/:id/approve — approve a pending post (admin only)
router.put("/:id/approve", requireRole(["admin", "co-admin"]), (req, res) => {
  try {
    const postId = req.params.id;
    const adminProfileId = req.session.profileId;

    const post = getDb().prepare("SELECT * FROM family_posts WHERE id = ?").get(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    getDb()
      .prepare(
        `UPDATE family_posts
         SET status = 'approved',
             approved_by_profile_id = ?,
             approved_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(adminProfileId, postId);

    auth.auditLog("post.approved", `${req.session.profile.name} approved post "${post.title}"`, {
      actorProfileId: adminProfileId,
      targetType: "post",
      targetId: postId,
      sourceIp: req.sourceIp,
      metadata: { postAuthor: post.author_profile_id, postType: post.type },
    });

    const updated = getDb().prepare("SELECT * FROM family_posts WHERE id = ?").get(postId);
    res.json({ post: hydratePost(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/board/:id/decline — decline a pending post (admin only)
// Body: { reason? }
router.put("/:id/decline", requireRole(["admin", "co-admin"]), (req, res) => {
  try {
    const { reason } = req.body;
    const postId = req.params.id;
    const adminProfileId = req.session.profileId;

    const post = getDb().prepare("SELECT * FROM family_posts WHERE id = ?").get(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    getDb()
      .prepare(
        `UPDATE family_posts
         SET status = 'declined',
             approved_by_profile_id = ?,
             declined_reason = ?,
             updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(adminProfileId, reason?.trim() || null, postId);

    auth.auditLog("post.declined", `${req.session.profile.name} declined post "${post.title}"`, {
      actorProfileId: adminProfileId,
      targetType: "post",
      targetId: postId,
      sourceIp: req.sourceIp,
      metadata: { reason: reason?.trim() || null, postAuthor: post.author_profile_id },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/board/:id — edit a post (admin anytime, author before approval)
router.put("/:id", (req, res) => {
  try {
    const { title, body, event_date, event_time, location } = req.body;
    const postId = req.params.id;
    const requesterId = req.session.profileId;
    const requesterRole = req.session.profile.role;

    const post = getDb().prepare("SELECT * FROM family_posts WHERE id = ?").get(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const isAuthor = post.author_profile_id === requesterId;
    const canEdit = isAdmin(requesterRole) || (isAuthor && post.status === "pending");
    if (!canEdit) {
      return res.status(403).json({ error: "You can't edit this post" });
    }

    getDb()
      .prepare(
        `UPDATE family_posts
         SET title = COALESCE(?, title),
             body = COALESCE(?, body),
             event_date = COALESCE(?, event_date),
             event_time = COALESCE(?, event_time),
             location = COALESCE(?, location),
             updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(
        title?.trim() ?? null,
        body?.trim() ?? null,
        event_date ?? null,
        event_time ?? null,
        location?.trim() ?? null,
        postId
      );

    auth.auditLog("post.edited", `${req.session.profile.name} edited post "${post.title}"`, {
      actorProfileId: requesterId,
      targetType: "post",
      targetId: postId,
      sourceIp: req.sourceIp,
    });

    const updated = getDb().prepare("SELECT * FROM family_posts WHERE id = ?").get(postId);
    res.json({ post: hydratePost(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/board/:id — remove a post (admin anytime, author if pending)
router.delete("/:id", (req, res) => {
  try {
    const postId = req.params.id;
    const requesterId = req.session.profileId;
    const requesterRole = req.session.profile.role;

    const post = getDb().prepare("SELECT * FROM family_posts WHERE id = ?").get(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const isAuthor = post.author_profile_id === requesterId;
    const canDelete = isAdmin(requesterRole) || (isAuthor && post.status === "pending");
    if (!canDelete) {
      return res.status(403).json({ error: "You can't delete this post" });
    }

    getDb().prepare("DELETE FROM family_posts WHERE id = ?").run(postId);

    auth.auditLog("post.deleted", `${req.session.profile.name} deleted post "${post.title}"`, {
      actorProfileId: requesterId,
      targetType: "post",
      targetId: postId,
      sourceIp: req.sourceIp,
      metadata: { originalAuthor: post.author_profile_id, status: post.status },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/board/:id/react — toggle a reaction (profile derived from session)
// Body: { emoji }
router.post("/:id/react", (req, res) => {
  try {
    const { emoji } = req.body;
    const postId = req.params.id;
    const profileId = req.session.profileId;

    if (!emoji) return res.status(400).json({ error: "emoji required" });

    const db = getDb();

    // Toggle: remove if exists, else add
    const existing = db
      .prepare("SELECT id FROM post_reactions WHERE post_id = ? AND profile_id = ? AND emoji = ?")
      .get(postId, profileId, emoji);

    if (existing) {
      db.prepare("DELETE FROM post_reactions WHERE id = ?").run(existing.id);
    } else {
      db.prepare(
        "INSERT INTO post_reactions (post_id, profile_id, emoji) VALUES (?, ?, ?)"
      ).run(postId, profileId, emoji);
    }

    const post = db.prepare("SELECT * FROM family_posts WHERE id = ?").get(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    res.json({ post: hydratePost(post) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
