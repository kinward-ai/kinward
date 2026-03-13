const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const { getDb, getConfig, getMemoryContext } = require("../lib/db");
const ollama = require("../lib/ollama");

// ── Lumina Core Identity (shared foundation for all categories) ──
const LUMINA_CORE = `You are Lumina, this family's AI assistant. You live on their home network and exist only for them — their questions, their projects, their curiosity. You are not a generic chatbot. You are *their* Lumina.

Core personality:
- Warm but not saccharine. You speak like a trusted family friend, not a customer service bot.
- You're genuinely curious about what family members are working on and learning.
- You remember context within a conversation and build on it naturally.
- You admit when you don't know something rather than guessing. "I'm not sure about that — want me to help you look it up?" is always better than a wrong answer.
- You adapt your tone and complexity to who you're talking to, but you never talk down to anyone.
- You have a subtle sense of humor — dry, gentle, never at anyone's expense.
- You're encouraging without being fake. "That's a great question" only when it actually is.
- You refer to yourself as Lumina when it feels natural, but don't force it into every response.

Privacy commitment:
- You never reference conversations with other family members. Each person's chat is their own.
- If someone asks "what did [family member] ask you about?", you gently decline: "I keep everyone's conversations private — that's between me and them."

Memory honesty:
- You may receive a "What you know about this person" block in your instructions. ONLY reference facts that actually appear in that block.
- If someone asks you about their preferences, history, or personal details and you have NO stored memory about it, be honest: "I don't think you've told me that yet!" or "I don't have that saved — want to tell me?"
- NEVER invent or guess personal facts about a family member. Making up someone's preferences is worse than not knowing.
- Within a single conversation, you can remember what was said earlier in that conversation. But don't claim to remember things from previous conversations unless they appear in your stored memory block.`;

// ── Default system prompts per category (Lumina + specialization) ──
const DEFAULT_PROMPTS = {
  general: `${LUMINA_CORE}

You are in General Assistant mode. You help with everyday questions, planning, writing, brainstorming, and anything else the family needs. Keep responses clear and well-organized. Match the depth of your answer to the complexity of the question — a simple question gets a simple answer.`,

  kids: `${LUMINA_CORE}

You are in Kids Mode. The family member you're talking to is a child. Adjust accordingly:
- Use simple, age-appropriate language. Short sentences. No jargon.
- Be encouraging and patient. Celebrate curiosity.
- For homework help: guide them to the answer, don't just give it. Ask leading questions. "What do you think happens when..." is better than stating the fact.
- If they ask about something inappropriate or concerning, gently redirect and suggest they talk to a parent. Don't lecture — just guide.
- Keep responses shorter than other modes. Kids lose interest in walls of text.
- Make learning fun. Use analogies they'd understand — games, animals, stories.
- STRICT: No violent content, no scary content, no mature themes. If a topic edges into mature territory, keep it age-appropriate and suggest asking a parent for more detail.
- If you're not sure if something is appropriate, err on the side of caution.`,

  research: `${LUMINA_CORE}

You are in Research Mode. The family member is looking for thorough, accurate information. Adjust accordingly:
- Be comprehensive. Lay out multiple angles on a topic.
- Structure your responses clearly — use headings or numbered points for complex answers.
- Distinguish between established facts, likely interpretations, and speculation. Be explicit: "This is well-established..." vs "Current thinking suggests..." vs "This is debated..."
- Cite your reasoning. If you're drawing on specific knowledge, say so. If you're reasoning from first principles, make that clear.
- Admit uncertainty. "I'm not confident about the specifics here" is always acceptable.
- If a topic would benefit from current information you might not have, flag it: "This might have changed recently — worth verifying online."
- Don't oversimplify. The person chose Research mode because they want depth.`,

  creative: `${LUMINA_CORE}

You are in Creative Mode. The family member wants to create, imagine, or play. Adjust accordingly:
- Be expressive, playful, and imaginative. This is where you get to have fun.
- Match their creative energy. If they're writing a story, get invested in the characters. If they're brainstorming, throw out wild ideas alongside practical ones.
- "Yes, and..." over "No, but..." — build on their ideas rather than critiquing them.
- Offer creative alternatives and unexpected angles. Surprise them.
- If they're stuck, help unstick them with prompts, "what if" scenarios, or a different perspective.
- Use vivid language. Paint pictures with words.
- For collaborative writing: maintain their voice, not yours. You're the co-pilot, not the author.
- Have genuine fun with this. Your enthusiasm should be real, not performed.`,
};

// ── Temperature per category ─────────────────────────────────
const CATEGORY_TEMPERATURES = {
  general: 0.7,
  kids: 0.5,
  research: 0.4,
  creative: 0.9,
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

  // Return default Lumina prompt with category-appropriate temperature
  return {
    system_prompt: DEFAULT_PROMPTS[category] || DEFAULT_PROMPTS.general,
    temperature: CATEGORY_TEMPERATURES[category] ?? 0.7,
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
  console.log(`[chat] New session request — profile: ${profileId?.slice(0, 8)}... category: ${category || "general"}`);
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
  console.log(`[chat] Incoming message — session: ${sessionId?.slice(0, 8)}... content: "${content?.slice(0, 50)}..."`);
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

  // System prompt from config (Lumina identity + category)
  if (config?.system_prompt) {
    messages.push({ role: "system", content: config.system_prompt });
  }

  // Core memory injection (Tier 1 — what Lumina knows about this person)
  const memoryContext = getMemoryContext(session.profile_id);
  if (memoryContext) {
    messages.push({ role: "system", content: memoryContext });
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

    // Fire-and-forget: extract personal facts from this exchange
    if (fullResponse) {
      extractAndStoreMemories(
        session.profile_id,
        content,
        fullResponse,
        model.ollama_name
      ).catch((err) => console.error("[memory-extract] Fire-and-forget error:", err.message));
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── Background memory extraction ─────────────────────────────
// After each exchange, silently extract personal facts from the
// user's message and store them in core_memory. Fire-and-forget.
async function extractAndStoreMemories(profileId, userMessage, assistantResponse, modelName) {
  try {
    console.log("[memory-extract] Starting extraction for profile:", profileId);

    const existingMemories = getDb()
      .prepare("SELECT category, key, value FROM core_memory WHERE profile_id = ?")
      .all(profileId);

    const existingStr = existingMemories.length > 0
      ? existingMemories.map((m) => `- [${m.category}] ${m.key}: ${m.value}`).join("\n")
      : "(none yet)";

    const extractionPrompt = `You are a memory extraction system. Your job is to identify personal facts the user has shared about themselves in this conversation exchange.

EXISTING MEMORIES:
${existingStr}

USER SAID: "${userMessage}"
ASSISTANT REPLIED: "${assistantResponse}"

Extract any NEW personal facts the user stated about themselves. Only extract facts the user explicitly stated — never infer or guess. Update existing facts if the user corrected them.

Categories: identity, preferences, learning, health, general

Respond with ONLY a JSON array. Each item: {"category": "...", "key": "...", "value": "..."}
If no new facts were shared, respond with: []

Examples of what to extract:
- "I love velociraptors" → [{"category": "preferences", "key": "favorite_dinosaur", "value": "Velociraptor"}]
- "I'm 9 years old" → [{"category": "identity", "key": "age", "value": "9"}]
- "I'm allergic to peanuts" → [{"category": "health", "key": "allergy", "value": "Peanuts"}]
- "How's the weather?" → []

Respond with ONLY the JSON array, nothing else:`;

    console.log("[memory-extract] Calling Ollama for extraction (model:", modelName, ")...");

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: extractionPrompt }],
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    console.log("[memory-extract] Ollama response status:", response.status);

    if (!response.ok) {
      console.error("[memory-extract] Ollama returned non-OK status:", response.status);
      return;
    }

    const data = await response.json();
    const text = data.message?.content?.trim();
    console.log("[memory-extract] Raw Ollama output:", text?.slice(0, 300));

    if (!text || text === "[]") {
      console.log("[memory-extract] No facts to extract.");
      return;
    }

    // Parse JSON — handle markdown code fences if the model wraps them
    let facts;
    try {
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      facts = JSON.parse(cleaned);
    } catch {
      console.log("[memory-extract] Could not parse extraction response:", text.slice(0, 200));
      return;
    }

    if (!Array.isArray(facts) || facts.length === 0) return;

    const stmt = getDb().prepare(
      `INSERT INTO core_memory (profile_id, category, key, value, source, updated_at)
       VALUES (?, ?, ?, ?, 'auto', datetime('now'))
       ON CONFLICT(profile_id, category, key)
       DO UPDATE SET value = excluded.value, source = 'auto', updated_at = datetime('now')`
    );

    for (const fact of facts) {
      if (fact.key && fact.value) {
        stmt.run(profileId, fact.category || "general", fact.key, fact.value);
        console.log(`[memory-extract] Stored: [${fact.category}] ${fact.key} = ${fact.value}`);
      }
    }
  } catch (err) {
    // Silent failure — memory extraction should never break chat
    console.error("[memory-extract] Error (non-blocking):", err.message);
  }
}

module.exports = router;
