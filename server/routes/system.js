const express = require("express");
const router = express.Router();
const db = require("../lib/db");
const ollama = require("../lib/ollama");

// ── Default world context (seeded on first read) ─────────────
const DEFAULT_WORLD_CONTEXT = `# World Context — Last updated: March 2026

These are current facts. Use them when answering questions about the present.

- The current President of the United States is Donald Trump (took office January 2025).
- The current Vice President is JD Vance.
- The current year is 2026.
- The current month is March 2026.
- AI models like yourself may have outdated training data. When a user asks about current events, leaders, or recent news, prefer the facts listed here over your training data.
- If you don't know something current and it's not listed here, say so honestly rather than guessing.`;

// GET /api/system/status — health check + setup state
router.get("/status", async (req, res) => {
  const ollamaUp = await ollama.isOllamaRunning();
  res.json({
    kinward: true,
    version: "0.1.0",
    setupComplete: db.isSetupComplete(),
    ollamaRunning: ollamaUp,
    envMode: db.getConfig("env_mode") || null,
  });
});

// GET /api/system/hardware — auto-detect hardware
router.get("/hardware", async (req, res) => {
  try {
    const info = await ollama.getHardwareInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/system/config — save setup config
router.post("/config", (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: "Key required" });
  db.setConfig(key, value);
  res.json({ ok: true });
});

// GET /api/system/config/:key
router.get("/config/:key", (req, res) => {
  const value = db.getConfig(req.params.key);
  res.json({ key: req.params.key, value });
});

// POST /api/system/setup-complete — finalize setup
router.post("/setup-complete", (req, res) => {
  db.setConfig("setup_complete", true);
  db.setConfig("setup_completed_at", new Date().toISOString());
  res.json({ ok: true });
});

// ── World Context endpoints ──────────────────────────────────

// GET /api/system/world-context — get current world context
router.get("/world-context", (req, res) => {
  let context = db.getConfig("world_context");

  // Seed default on first access
  if (context === null || context === undefined) {
    db.setConfig("world_context", DEFAULT_WORLD_CONTEXT);
    context = DEFAULT_WORLD_CONTEXT;
  }

  res.json({
    context,
    updatedAt: db.getConfig("world_context_updated_at") || null,
  });
});

// PUT /api/system/world-context — update world context (admin only)
router.put("/world-context", (req, res) => {
  const { context } = req.body;

  if (typeof context !== "string") {
    return res.status(400).json({ error: "context must be a string" });
  }

  if (context.length > 10000) {
    return res.status(400).json({ error: "World context must be under 10,000 characters" });
  }

  db.setConfig("world_context", context);
  db.setConfig("world_context_updated_at", new Date().toISOString());

  res.json({ ok: true, updatedAt: new Date().toISOString() });
});

module.exports = router;
