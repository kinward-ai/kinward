const express = require("express");
const router = express.Router();
const db = require("../lib/db");
const ollama = require("../lib/ollama");

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

module.exports = router;
