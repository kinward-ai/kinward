const express = require("express");
const router = express.Router();
const auth = require("../lib/auth");
const { requireRole } = require("../middleware/auth");

/**
 * Audit log — admin-only view into governance events.
 *
 * Shows who did what, when, and from where. Never contains conversation
 * content or memory values — just events.
 */

router.get("/", requireRole(["admin", "co-admin"]), (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;
    const eventType = req.query.eventType || null;

    const events = auth.listAuditEvents({ limit, offset, eventType });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
