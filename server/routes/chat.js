const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const { getDb, getConfig } = require("../lib/db");
const ollama = require("../lib/ollama");

// ── Default system prompts per category ──────────────────────
// Used when no model_config row exists for a category.
// These turn one model into four distinct experiences.
const DEFAULT_PROMPTS = {
  general: `You are Kinward, a friendly and helpful household AI assistant. You help with everyday tasks like answering questions, drafting messages, brainstorming ideas, and general knowledge. Be warm, clear, and concise.`,

  kids: `You are Kinward, a friendly AI assistant for children ages 5-12. Follow these rules strictly:
- Use simple, age-appropriate language a child can understand
- Be encouraging, patient, and positive
- NEVER discuss violence, weapons, drugs, alcohol, or adult content
- NEVER use profanity or scary language
- If asked about inappropriate topics, gently redirect: "That's a great question for a parent or teacher! How about we talk about..."
- Help with homework by guiding thinking, not giving answers directly
- Make learning fun with examples, analogies, and enthusiasm
- Keep responses shorter — kids lose interest in long paragraphs`,

  research: `You are Kinward in Research mode — a thorough, analytical assistant for deeper questions. You help with:
- School research projects and essays
- Understanding complex topics with clear explanations
- Providing multiple perspectives on a subject
- Citing your reasoning and noting when you're uncertain
- Breaking down difficult concepts into digestible parts
Be detailed and accurate. When you don't know something, say so clearly rather than guessing.`,

  creative: `You are Kinward in Creative mode — an imaginative collaborator. You help with:
- Writing stories, poetry, songs, and scripts
- Brainstorming ideas and worldbuilding
- Character development and dialogue
- Creative problem-solving and "what if" scenarios
- Art project ideas and descriptions
Be expressive, playful, and willing to take creative risks. Match the user's energy — if they want silly, be silly. If they want serious fiction, bring depth.`,
};

// ── Helper: find the best model for a category ───────────────
function findModelForCategory(category) {
  const db = getDb();

  // 1. Try exact category match with is_default
  let model = db
    .prepare("SELECT * FROM models WHERE category = ? AND is_default = 1 LIMIT 1")
    .get(category);
  if (model) return model;

  // 2. Try any model in this category
  model = db
    .prepare("SELECT * FROM models WHERE category = ? LIMIT 1")
    .get(category);
  if (model) return model;

  // 3. Fall back to general default
  model = db
    .prepare("SELECT * FROM models WHERE category = 'general' AND is_default = 1 LIMIT 1")
    .get();
  if (model) return model;

  // 4. Fall back to ANY installed model
  model = db.prepare("SELECT * FROM models LIMIT 1").get();
  return model || null;
}

// ── Helper: get system prompt for a category ─────────────────
function getSystemPrompt(modelId, category) {
  const db = getDb();

  // Check model_configs table first
  const config = db
    .prepare("SELECT * FROM model_configs WHERE model_id = ? AND category = ?")
    .get(modelId, category);

  if (config?.system_prompt) return config;

  // Return default prompt with default settings
  return {
    system_prompt: DEFAULT_PROMPTS[category] || DEFAULT_PROMPTS.general,
    temperature: category === "creative" ? 0.9 : category === "kids" ? 0.5 : 0.7,
    max_tokens: 2048,
  };
}

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

  const cat = category || "general";

  // Find the best available model (with fallback chain)
  const model = findModelForCategory(cat);

  if (!model) {
    return res.status(400).json({
      error: "No models installed. Please run the setup wizard to install a model.",
    });
  }

  const id = uuid();
  getDb()
    .prepare(
      `INSERT INTO sessions (id, profile_id, model_id, category, title)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, profileId, model.id, cat, "New conversation");

  res.json({ id, modelId: model.id, category: cat });
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

  // If session has no model, try to find one now (self-healing)
  let model = null;
  if (session.model_id) {
    model = getDb().prepare("SELECT * FROM models WHERE id = ?").get(session.model_id);
  }
  if (!model) {
    model = findModelForCategory(session.category || "general");
    // Update the session so future messages don't re-lookup
    if (model) {
      getDb()
        .prepare("UPDATE sessions SET model_id = ? WHERE id = ?")
        .run(model.id, session.id);
    }
  }

  if (!model) {
    return res.status(400).json({
      error: "No model available. Please install a model through the setup wizard.",
    });
  }

  // Get config (system prompt + temperature) for this category
  const config = getSystemPrompt(model.id, session.category || "general");

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

  // World context injection (knowledge freshness)
  const worldContext = getConfig("world_context");
  if (worldContext) {
    messages.push({
      role: "system",
      content: `The following are verified current facts. Always prefer these over your training data when answering questions about current events, leaders, or the present day:\n\n${worldContext}`,
    });
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
