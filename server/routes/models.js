const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const { getDb } = require("../lib/db");
const ollama = require("../lib/ollama");
const { getCatalog } = require("../lib/model-catalog");

// Note: System prompts are built dynamically in chat.js (buildSystemPrompt)
// using the AI identity from ai_identity table + category extensions.
// model_configs only stores temperature overrides per category.

// GET /api/models — list installed models (from Ollama + our metadata)
router.get("/", async (req, res) => {
  try {
    const ollamaModels = await ollama.listModels();
    const dbModels = getDb()
      .prepare("SELECT * FROM models")
      .all();

    // Merge: Ollama is source of truth for what's installed,
    // our DB adds category/config metadata
    const merged = ollamaModels.map((om) => {
      const dbMatch = dbModels.find((d) => d.ollama_name === om.name);
      return {
        ...om,
        id: dbMatch?.id || null,
        category: dbMatch?.category || null,
        displayName: dbMatch?.display_name || om.name,
        isDefault: dbMatch?.is_default === 1,
      };
    });

    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/models/catalog — curated catalog with installed status + hardware suitability
router.get("/catalog", async (req, res) => {
  try {
    const hardwareInfo = await ollama.getHardwareInfo();
    const catalog = getCatalog(hardwareInfo.tier);

    // Enrich each entry with installed status
    let installed = [];
    try {
      installed = await ollama.listModels();
    } catch {
      // Ollama might be offline — catalog still loads, just no installed status
    }

    const installedNames = new Set(installed.map((m) => m.name));

    const enriched = catalog.map((entry) => ({
      ...entry,
      installed: installedNames.has(entry.ollama),
    }));

    res.json({
      catalog: enriched,
      hardware: {
        tier: hardwareInfo.tier,
        friendlySummary: hardwareInfo.friendlySummary,
        ram: hardwareInfo.ram,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/models/recommend — smart recommendation based on family makeup
router.get("/recommend", async (req, res) => {
  try {
    const profiles = getDb()
      .prepare("SELECT role FROM profiles")
      .all();
    const hardwareInfo = await ollama.getHardwareInfo();
    const recs = ollama.getRecommendation(profiles, hardwareInfo.tier);
    res.json(recs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/models/install — pull a model from Ollama (returns immediately, progress via WS)
router.post("/install", async (req, res) => {
  const { ollamaName, displayName, category } = req.body;

  if (!ollamaName || !category) {
    return res.status(400).json({ error: "ollamaName and category required" });
  }

  // Register in DB first
  const id = uuid();
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO models (id, ollama_name, display_name, category, is_default)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, ollamaName, displayName || ollamaName, category, 0);

  // Store category config (temperature only — system prompts are always built
  // dynamically from ai_identity + category so name changes take effect immediately)
  const configId = uuid();
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO model_configs (id, model_id, category, temperature)
       VALUES (?, ?, ?, ?)`
    )
    .run(configId, id, category, category === "creative" ? 0.9 : 0.7);

  // Start pull — stream progress to any connected WebSocket clients
  const wss = req.app.get("wss");
  const pullStartTime = Date.now();

  try {
    await ollama.pullModel(ollamaName, (progress) => {
      // Calculate ETA based on download speed
      const elapsed = (Date.now() - pullStartTime) / 1000;
      const bytesPerSec = progress.completed > 0 ? progress.completed / elapsed : 0;
      const estimatedSecondsRemaining =
        progress.total > 0 && bytesPerSec > 0
          ? Math.round((progress.total - progress.completed) / bytesPerSec)
          : null;

      // Broadcast to all connected WS clients
      if (wss) {
        const msg = JSON.stringify({
          type: "model:progress",
          modelId: id,
          ollamaName,
          ...progress,
          estimatedSecondsRemaining,
          bytesPerSecond: Math.round(bytesPerSec),
        });
        wss.clients.forEach((client) => {
          if (client.readyState === 1) client.send(msg);
        });
      }
    });

    // Update size after install
    const models = await ollama.listModels();
    const installed = models.find((m) => m.name === ollamaName);
    if (installed) {
      getDb()
        .prepare("UPDATE models SET size_bytes = ? WHERE id = ?")
        .run(installed.size, id);
    }

    // Mark first model in a category as default
    const existingDefaults = getDb()
      .prepare("SELECT id FROM models WHERE category = ? AND is_default = 1")
      .all(category);
    if (existingDefaults.length === 0) {
      getDb().prepare("UPDATE models SET is_default = 1 WHERE id = ?").run(id);
    }

    // Notify completion
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: "model:complete", modelId: id, ollamaName }));
        }
      });
    }

    res.json({ id, ollamaName, category, status: "installed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/models/:id — remove a model
router.delete("/:id", async (req, res) => {
  const model = getDb()
    .prepare("SELECT * FROM models WHERE id = ?")
    .get(req.params.id);
  if (!model) return res.status(404).json({ error: "Not found" });

  try {
    await ollama.deleteModel(model.ollama_name);
    getDb().prepare("DELETE FROM model_configs WHERE model_id = ?").run(model.id);
    getDb().prepare("DELETE FROM models WHERE id = ?").run(model.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
