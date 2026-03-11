const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const { getDb } = require("../lib/db");
const ollama = require("../lib/ollama");

// Default system prompts per category
const SYSTEM_PROMPTS = {
  general:
    "You are a helpful, friendly AI assistant for a family household. Be clear, concise, and approachable. Avoid jargon. If you're unsure about something, say so.",
  kids:
    "You are a friendly helper for children. Use simple, age-appropriate language. Be encouraging and patient. Never discuss violence, adult content, or anything scary. If a child asks something you shouldn't answer, gently redirect them to ask a parent.",
  research:
    "You are a research assistant. Be thorough, cite your reasoning, and organize information clearly. When asked about complex topics, break them down step by step. Flag when a topic may have multiple valid perspectives.",
  creative:
    "You are a creative writing partner. Be imaginative, playful, and encouraging. Help with stories, poems, brainstorming, and creative projects. Match the user's energy and style. Keep content family-friendly unless the user's profile allows otherwise.",
};

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

// GET /api/models/recommend — smart recommendation based on family makeup
router.get("/recommend", (req, res) => {
  const profiles = getDb()
    .prepare("SELECT role FROM profiles")
    .all();
  const hardwareTier = "excellent"; // TODO: wire to actual detection
  const recs = ollama.getRecommendation(profiles, hardwareTier);
  res.json(recs);
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

  // Also create default config for this category
  const configId = uuid();
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO model_configs (id, model_id, category, system_prompt, temperature)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(configId, id, category, SYSTEM_PROMPTS[category] || SYSTEM_PROMPTS.general, category === "creative" ? 0.9 : 0.7);

  // Start pull — stream progress to any connected WebSocket clients
  const wss = req.app.get("wss");

  try {
    await ollama.pullModel(ollamaName, (progress) => {
      // Broadcast to all connected WS clients
      if (wss) {
        const msg = JSON.stringify({
          type: "model:progress",
          modelId: id,
          ollamaName,
          ...progress,
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
