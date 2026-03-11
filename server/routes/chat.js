const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const { getDb } = require("../lib/db");
const ollama = require("../lib/ollama");

// GET /api/chat/sessions — list sessions for a profile
router.get("/sessions", (req, res) => {
  const { profileId } = req.query;
  if (!profileId) return res.status(400).json({ error: "profileId required" });

  const sessions = getDb()
    .prepare(
      `SELECT s.*, m.display_name as model_name
       FROM sessions s
       LEFT JOIN models m ON s.model_id = m.id
       WHERE s.profile_id = ?
       ORDER BY s.updated_at DESC`
    )
    .all(profileId);
  res.json(sessions);
});

// POST /api/chat/sessions — create a new chat session
router.post("/sessions", (req, res) => {
  const { profileId, category } = req.body;
  if (!profileId) return res.status(400).json({ error: "profileId required" });

  // Find the default model for this category (or general)
  const model = getDb()
    .prepare(
      "SELECT * FROM models WHERE category = ? AND is_default = 1 LIMIT 1"
    )
    .get(category || "general");

  const id = uuid();
  getDb()
    .prepare(
      `INSERT INTO sessions (id, profile_id, model_id, category, title)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, profileId, model?.id || null, category || "general", "New conversation");

  res.json({ id, modelId: model?.id, category: category || "general" });
});

// POST /api/chat/message — send a message and stream response
router.post("/message", async (req, res) => {
  const { sessionId, content } = req.body;
  if (!sessionId || !content) {
    return res.status(400).json({ error: "sessionId and content required" });
  }

  // Load session + profile + model
  const session = getDb()
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const profile = getDb()
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(session.profile_id);

  const model = session.model_id
    ? getDb().prepare("SELECT * FROM models WHERE id = ?").get(session.model_id)
    : null;

  if (!model) {
    return res.status(400).json({ error: "No model configured for this session" });
  }

  // Get model config (system prompt, temperature)
  const config = getDb()
    .prepare("SELECT * FROM model_configs WHERE model_id = ? AND category = ?")
    .get(model.id, session.category || "general");

  // Build message history
  const history = getDb()
    .prepare(
      "SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at"
    )
    .all(sessionId);

  const messages = [];

  // System prompt from config
  if (config?.system_prompt) {
    messages.push({ role: "system", content: config.system_prompt });
  }

  // Guardrail injection based on profile
  if (profile.guardrail_level === "strict") {
    messages.push({
      role: "system",
      content:
        "IMPORTANT: This user is a child. Keep all responses age-appropriate for ages 5-12. Never discuss violence, adult content, drugs, or anything inappropriate for children. If asked about these topics, gently redirect. Use simple language.",
    });
  } else if (profile.guardrail_level === "moderate") {
    messages.push({
      role: "system",
      content:
        "This user is a teenager. Keep responses appropriate for ages 13-17. Be helpful and informative but avoid explicit adult content. You can discuss more complex topics at an appropriate level.",
    });
  }

  // Chat history
  messages.push(...history);

  // New user message
  messages.push({ role: "user", content });

  // Save user message to DB
  const userMsgId = uuid();
  getDb()
    .prepare(
      "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, 'user', ?)"
    )
    .run(userMsgId, sessionId, content);

  // Log activity (pattern, not content)
  getDb()
    .prepare(
      `INSERT INTO activity_log (profile_id, event_type, category, metadata)
       VALUES (?, 'message_sent', ?, ?)`
    )
    .run(profile.id, session.category, JSON.stringify({ sessionId }));

  // Stream response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await ollama.chat(
      model.ollama_name,
      messages,
      {
        temperature: config?.temperature ?? 0.7,
        maxTokens: config?.max_tokens ?? 2048,
      }
    );

    const reader = stream.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            fullResponse += data.message.content;
            res.write(`data: ${JSON.stringify({ token: data.message.content })}\n\n`);
          }
          if (data.done) {
            // Save assistant response
            const asstMsgId = uuid();
            getDb()
              .prepare(
                "INSERT INTO messages (id, session_id, role, content, tokens_used) VALUES (?, ?, 'assistant', ?, ?)"
              )
              .run(asstMsgId, sessionId, fullResponse, data.eval_count || 0);

            // Update session timestamp and title if first message
            if (history.length === 0) {
              const title = content.slice(0, 60) + (content.length > 60 ? "..." : "");
              getDb()
                .prepare("UPDATE sessions SET title = ?, updated_at = datetime('now') WHERE id = ?")
                .run(title, sessionId);
            } else {
              getDb()
                .prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?")
                .run(sessionId);
            }

            res.write(`data: ${JSON.stringify({ done: true, tokensUsed: data.eval_count })}\n\n`);
          }
        } catch {
          // skip
        }
      }
    }

    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
