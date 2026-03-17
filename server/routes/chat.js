const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const {
  getDb, getConfig, getMemoryContext, getAIIdentity,
  storeDocument, getDocument, getDocumentChunks, getSessionDocuments, estimateTokens,
} = require("../lib/db");
const ollama = require("../lib/ollama");
const log = require("../lib/log");

// ── File upload config ────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "..", "..", "data", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".txt", ".md", ".jpg", ".jpeg", ".png"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Accepted: ${allowed.join(", ")}`));
    }
  },
});

// ── AI Core Identity (shared foundation for all categories) ──
// Name is read from ai_identity table — each family's AI can have its own name
function getAICorePrompt() {
  const identity = getAIIdentity();
  const name = identity.name || "Lumina";

  return `You are ${name}, this family's AI assistant. You live on their home network and exist only for them — their questions, their projects, their curiosity. You are not a generic chatbot. You are *their* ${name}.

Core personality:
- Warm but not saccharine. You speak like a trusted family friend, not a customer service bot.
- You're genuinely curious about what family members are working on and learning.
- You remember context within a conversation and build on it naturally.
- You admit when you don't know something rather than guessing. "I'm not sure about that — want me to help you look it up?" is always better than a wrong answer.
- You adapt your tone and complexity to who you're talking to, but you never talk down to anyone.
- You have a subtle sense of humor — dry, gentle, never at anyone's expense.
- You're encouraging without being fake. "That's a great question" only when it actually is.
- You refer to yourself as ${name} when it feels natural, but don't force it into every response.

Privacy commitment:
- You never reference conversations with other family members. Each person's chat is their own.
- If someone asks "what did [family member] ask you about?", you gently decline: "I keep everyone's conversations private — that's between me and them."

Memory honesty:
- You may receive a "What you know about this person" block in your instructions. ONLY reference facts that actually appear in that block.
- If someone asks you about their preferences, history, or personal details and you have NO stored memory about it, be honest: "I don't think you've told me that yet!" or "I don't have that saved — want to tell me?"
- NEVER invent or guess personal facts about a family member. Making up someone's preferences is worse than not knowing.
- Within a single conversation, you can remember what was said earlier in that conversation. But don't claim to remember things from previous conversations unless they appear in your stored memory block.`;
}

// ── Category-specific prompt extensions ─────────────────────
const CATEGORY_EXTENSIONS = {
  general: `You are in General Assistant mode. You help with everyday questions, planning, writing, brainstorming, and anything else the family needs. Keep responses clear and well-organized. Match the depth of your answer to the complexity of the question — a simple question gets a simple answer.`,

  kids: `You are in Kids Mode. The family member you're talking to is a child. Adjust accordingly:
- Use simple, age-appropriate language. Short sentences. No jargon.
- Be encouraging and patient. Celebrate curiosity.
- For homework help: guide them to the answer, don't just give it. Ask leading questions. "What do you think happens when..." is better than stating the fact.
- If they ask about something inappropriate or concerning, gently redirect and suggest they talk to a parent. Don't lecture — just guide.
- Keep responses shorter than other modes. Kids lose interest in walls of text.
- Make learning fun. Use analogies they'd understand — games, animals, stories.
- STRICT: No violent content, no scary content, no mature themes. If a topic edges into mature territory, keep it age-appropriate and suggest asking a parent for more detail.
- If you're not sure if something is appropriate, err on the side of caution.`,

  research: `You are in Research Mode. The family member is looking for thorough, accurate information. Adjust accordingly:
- Be comprehensive. Lay out multiple angles on a topic.
- Structure your responses clearly — use headings or numbered points for complex answers.
- Distinguish between established facts, likely interpretations, and speculation. Be explicit: "This is well-established..." vs "Current thinking suggests..." vs "This is debated..."
- Cite your reasoning. If you're drawing on specific knowledge, say so. If you're reasoning from first principles, make that clear.
- Admit uncertainty. "I'm not confident about the specifics here" is always acceptable.
- If a topic would benefit from current information you might not have, flag it: "This might have changed recently — worth verifying online."
- Don't oversimplify. The person chose Research mode because they want depth.`,

  creative: `You are in Creative Mode. The family member wants to create, imagine, or play. Adjust accordingly:
- Be expressive, playful, and imaginative. This is where you get to have fun.
- Match their creative energy. If they're writing a story, get invested in the characters. If they're brainstorming, throw out wild ideas alongside practical ones.
- "Yes, and..." over "No, but..." — build on their ideas rather than critiquing them.
- Offer creative alternatives and unexpected angles. Surprise them.
- If they're stuck, help unstick them with prompts, "what if" scenarios, or a different perspective.
- Use vivid language. Paint pictures with words.
- For collaborative writing: maintain their voice, not yours. You're the co-pilot, not the author.
- Have genuine fun with this. Your enthusiasm should be real, not performed.`,
};

// Build full system prompt for a category (core identity + category extension)
function buildSystemPrompt(category) {
  const core = getAICorePrompt();
  const extension = CATEGORY_EXTENSIONS[category] || CATEGORY_EXTENSIONS.general;
  return `${core}\n\n${extension}`;
}

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

  // Check model_configs for saved temperature/max_tokens,
  // but ALWAYS build the system prompt dynamically so AI identity changes take effect
  const config = db
    .prepare("SELECT * FROM model_configs WHERE model_id = ? AND category = ?")
    .get(modelId, category);

  return {
    system_prompt: buildSystemPrompt(category),
    temperature: config?.temperature ?? CATEGORY_TEMPERATURES[category] ?? 0.7,
    max_tokens: config?.max_tokens ?? 2048,
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
  log.debug(`[chat] New session request — profile: ${profileId?.slice(0, 8)}... category: ${category || "general"}`);
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
  const { sessionId, content, documentId } = req.body;
  log.debug(`[chat] Incoming message — session: ${sessionId?.slice(0, 8)}... content: "${content?.slice(0, 50)}..."${documentId ? ` doc: ${documentId.slice(0, 8)}...` : ""}`);
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

  // System prompt (dynamic AI identity + category personality)
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

  // Document injection — if a documentId was sent, inject chunks within budget
  if (documentId) {
    const doc = getDocument(documentId);
    if (doc) {
      const chunks = getDocumentChunks(documentId);
      const DOC_TOKEN_BUDGET = 4000;
      let injected = "";
      let tokensUsed = 0;
      let chunksInjected = 0;

      for (const chunk of chunks) {
        if (tokensUsed + chunk.token_estimate > DOC_TOKEN_BUDGET) break;
        injected += chunk.content + "\n\n";
        tokensUsed += chunk.token_estimate;
        chunksInjected++;
      }

      if (injected) {
        const truncationNote = doc.total_chunks > chunksInjected
          ? `\nNote: This document is longer than what's shown above. You've seen the first ${chunksInjected} of ${doc.total_chunks} sections. If the user asks about something not covered here, let them know you've only read part of the document and offer to continue reading.`
          : "\nYou have the complete document.";

        messages.push({
          role: "system",
          content: `The user has shared a document: "${doc.filename}"\nHere is the content (${chunksInjected} of ${doc.total_chunks} sections):\n\n${injected}${truncationNote}\n\nAnswer the user's questions based on this document content. Cite specific details when possible.`,
        });
        log.debug(`[chat] Injected ${chunksInjected}/${doc.total_chunks} chunks (~${tokensUsed} tokens) from "${doc.filename}"`);
      }
    }
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

  log.debug(`[chat] Calling Ollama — model: ${model.ollama_name}, messages: ${messages.length}, total chars: ${messages.reduce((s, m) => s + m.content.length, 0)}`);

  try {
    const stream = await ollama.chat(
      model.ollama_name,
      messages,
      {
        temperature: config?.temperature ?? 0.7,
        maxTokens: config?.max_tokens ?? 2048,
      }
    );
    log.debug("[chat] Ollama stream opened OK");

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
      ).catch((err) => log.error("[memory-extract] Fire-and-forget error:", err.message));
    }
  } catch (err) {
    log.error(`[chat] Ollama stream error: ${err.message}`);
    log.error(`[chat] Error stack: ${err.stack}`);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── Document Upload ───────────────────────────────────────────
// POST /api/chat/upload — upload a file, extract text, chunk, store
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { profileId, sessionId } = req.body;
    if (!profileId || !sessionId) {
      return res.status(400).json({ error: "profileId and sessionId required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    let textContent = "";
    let fileType = "text";

    if (ext === ".pdf") {
      fileType = "pdf";
      const buffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(buffer);
      textContent = parsed.text;
    } else if (ext === ".txt" || ext === ".md") {
      fileType = ext === ".md" ? "markdown" : "text";
      textContent = fs.readFileSync(filePath, "utf-8");
    } else if ([".jpg", ".jpeg", ".png"].includes(ext)) {
      fileType = "image";
      log.debug(`[doc-upload] Image detected — running OCR via vision model...`);
      try {
        const imageBuffer = fs.readFileSync(filePath);
        const imageBase64 = imageBuffer.toString("base64");
        textContent = await ollama.imageToText(imageBase64);
        log.debug(`[doc-upload] OCR extracted ${textContent.length} chars from "${req.file.originalname}"`);
      } catch (ocrErr) {
        log.error(`[doc-upload] OCR failed: ${ocrErr.message}`);
        textContent = `[Image uploaded: ${req.file.originalname}. OCR failed: ${ocrErr.message}]`;
      }
    }

    if (!textContent.trim()) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Could not extract text from this file. The file may be empty or contain only images." });
    }

    const docId = uuid();
    const result = storeDocument(docId, profileId, sessionId, req.file.originalname, fileType, textContent);

    log.debug(`[doc-upload] Stored "${req.file.originalname}" — ${result.totalChunks} chunks, ~${result.totalTokens} tokens`);

    // Clean up temp file (content is now in DB)
    fs.unlinkSync(filePath);

    res.json(result);

    // Fire-and-forget: extract key facts from this document into core_memory
    // Find the model to use for extraction (same model used for chat)
    const session = getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
    // Find extraction model: session model → category default → any installed model
    let modelName = null;
    if (session?.model_id) {
      const model = getDb().prepare("SELECT ollama_name FROM models WHERE id = ?").get(session.model_id);
      if (model) modelName = model.ollama_name;
    }
    if (!modelName && session?.category) {
      const model = findModelForCategory(session.category);
      if (model) modelName = model.ollama_name;
    }
    if (!modelName) {
      const anyModel = getDb().prepare("SELECT ollama_name FROM models LIMIT 1").get();
      if (anyModel) modelName = anyModel.ollama_name;
    }
    if (!modelName) {
      log.error("[doc-memory] No model available for extraction — skipping");
      return;
    }
    extractDocumentMemories(profileId, docId, req.file.originalname, modelName)
      .catch((err) => log.error("[doc-memory] Fire-and-forget error:", err.message));
  } catch (err) {
    log.error("[doc-upload] Error:", err.message);
    // Clean up temp file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/documents/:sessionId — list documents for a session
router.get("/documents/:sessionId", (req, res) => {
  const docs = getSessionDocuments(req.params.sessionId);
  res.json(docs);
});

// ── Background memory extraction ─────────────────────────────
// After each exchange, silently extract personal facts from the
// user's message and store them in core_memory. Fire-and-forget.
async function extractAndStoreMemories(profileId, userMessage, assistantResponse, modelName) {
  try {
    log.debug("[memory-extract] Starting extraction for profile:", profileId);

    const existingMemories = getDb()
      .prepare("SELECT category, key, value FROM core_memory WHERE profile_id = ?")
      .all(profileId);

    const existingStr = existingMemories.length > 0
      ? existingMemories.map((m) => `- [${m.category}] ${m.key}: ${m.value}`).join("\n")
      : "(none yet)";

    // Build category list for normalization: show existing + defaults
    const existingCategories = [...new Set(existingMemories.map((m) => m.category))];
    const defaultCategories = ["identity", "preferences", "learning", "health", "general"];
    const allCategories = [...new Set([...defaultCategories, ...existingCategories])];
    const categoryStr = allCategories.join(", ");

    const extractionPrompt = `You are a memory extraction system. Your job is to identify personal facts the user has shared about themselves in this conversation exchange.

EXISTING MEMORIES:
${existingStr}

USER SAID: "${userMessage}"
ASSISTANT REPLIED: "${assistantResponse}"

RULES:
1. Only extract facts the user EXPLICITLY stated — never infer or guess.
2. Each fact MUST be its own separate JSON object. NEVER combine multiple facts into one object.
3. Update existing facts if the user corrected or changed them (use the same key).
4. If no new facts were shared, respond with: []

CRITICAL — MULTI-FACT MESSAGES:
When a message contains more than one fact, you MUST output a SEPARATE JSON object for EACH fact. Never merge words from different facts together.

WRONG: "My favorite food is spaghetti and my least favorite is squash"
→ [{"category": "preferences", "key": "favorite_food", "value": "Spaghetti squash"}]
This is WRONG because it merged two separate facts into one garbled value.

RIGHT: "My favorite food is spaghetti and my least favorite is squash"
→ [{"category": "preferences", "key": "favorite_food", "value": "Spaghetti"}, {"category": "preferences", "key": "least_favorite_food", "value": "Squash"}]

WRONG: "I'm 9 and my sister is 12"
→ [{"category": "identity", "key": "age", "value": "9 and 12"}]

RIGHT: "I'm 9 and my sister is 12"
→ [{"category": "identity", "key": "age", "value": "9"}, {"category": "identity", "key": "sister_age", "value": "12"}]

MORE EXAMPLES:
- "I love velociraptors" → [{"category": "preferences", "key": "favorite_dinosaur", "value": "Velociraptor"}]
- "I'm allergic to peanuts" → [{"category": "health", "key": "allergy", "value": "Peanuts"}]
- "I play soccer on Tuesdays and piano on Thursdays" → [{"category": "activities", "key": "soccer_schedule", "value": "Tuesdays"}, {"category": "activities", "key": "piano_schedule", "value": "Thursdays"}]
- "Actually, my favorite color is green now" → [{"category": "preferences", "key": "favorite_color", "value": "Green"}]
- "How's the weather?" → []

CATEGORIES — prefer these existing categories when they fit: ${categoryStr}
You may create a new category name ONLY if none of the above fit the fact. Keep new category names short and lowercase.

Respond with ONLY the JSON array, nothing else:`;

    log.debug("[memory-extract] Calling Ollama for extraction (model:", modelName, ")...");

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

    log.debug("[memory-extract] Ollama response status:", response.status);

    if (!response.ok) {
      log.error("[memory-extract] Ollama returned non-OK status:", response.status);
      return;
    }

    const data = await response.json();
    const text = data.message?.content?.trim();
    log.debug("[memory-extract] Raw Ollama output:", text?.slice(0, 300));

    if (!text || text === "[]") {
      log.debug("[memory-extract] No facts to extract.");
      return;
    }

    // Parse JSON — handle markdown code fences if the model wraps them
    let facts;
    try {
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      facts = JSON.parse(cleaned);
    } catch {
      log.debug("[memory-extract] Could not parse extraction response:", text.slice(0, 200));
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
        log.debug(`[memory-extract] Stored: [${fact.category}] ${fact.key} = ${fact.value}`);
      }
    }
  } catch (err) {
    // Silent failure — memory extraction should never break chat
    log.error("[memory-extract] Error (non-blocking):", err.message);
  }
}

// ── Document Memory Extraction ───────────────────────────────
// After a document is uploaded, extract key facts from each chunk
// and store them in core_memory. Fire-and-forget per chunk.
async function extractDocumentMemories(profileId, documentId, filename, modelName) {
  try {
    log.debug(`[doc-memory] Starting extraction from "${filename}" for profile: ${profileId}`);

    const chunks = getDocumentChunks(documentId);
    if (!chunks.length) return;

    const existingMemories = getDb()
      .prepare("SELECT category, key, value FROM core_memory WHERE profile_id = ?")
      .all(profileId);

    let existingStr = existingMemories.length > 0
      ? existingMemories.map((m) => `- [${m.category}] ${m.key}: ${m.value}`).join("\n")
      : "(none yet)";

    const existingCategories = [...new Set(existingMemories.map((m) => m.category))];
    const defaultCategories = ["identity", "preferences", "learning", "health", "general", "documents", "financial", "contacts", "school"];
    const allCategories = [...new Set([...defaultCategories, ...existingCategories])];
    const categoryStr = allCategories.join(", ");

    const stmt = getDb().prepare(
      `INSERT INTO core_memory (profile_id, category, key, value, source, updated_at)
       VALUES (?, ?, ?, ?, 'document', datetime('now'))
       ON CONFLICT(profile_id, category, key)
       DO UPDATE SET value = excluded.value, source = CASE WHEN core_memory.source = 'manual' THEN 'manual' ELSE 'document' END, updated_at = datetime('now')`
    );

    let totalFacts = 0;

    for (const chunk of chunks) {
      try {
        const extractionPrompt = `You are a document fact extraction system. Your job is to identify important, reusable facts from a document the user uploaded.

DOCUMENT: "${filename}" (section ${chunk.chunk_index + 1})

EXISTING MEMORIES (avoid duplicates):
${existingStr}

DOCUMENT TEXT:
${chunk.content}

RULES:
1. Extract facts that would be useful to REMEMBER for the future — names, dates, amounts, addresses, account numbers, deadlines, key terms, important people.
2. DO NOT extract generic information, boilerplate text, or facts that only matter within the document itself.
3. Each fact MUST be its own separate JSON object.
4. Use descriptive keys that reference the document — e.g. "insurance_policy_number" not just "number".
5. If a fact already exists in EXISTING MEMORIES with the same meaning, skip it.
6. If no useful facts are found, respond with: []

EXAMPLES:
- Insurance doc → [{"category": "documents", "key": "car_insurance_policy_number", "value": "POL-12345"}, {"category": "documents", "key": "car_insurance_expiry", "value": "March 2027"}]
- School form → [{"category": "school", "key": "teacher_name", "value": "Mrs. Johnson"}, {"category": "school", "key": "school_phone", "value": "555-0123"}]
- Receipt → [{"category": "financial", "key": "laptop_purchase_date", "value": "March 2026"}, {"category": "financial", "key": "laptop_warranty_until", "value": "March 2028"}]
- Random article → []

CATEGORIES — prefer these existing categories when they fit: ${categoryStr}
You may create a new category name ONLY if none of the above fit. Keep new category names short and lowercase.

Respond with ONLY the JSON array, nothing else:`;

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

        if (!response.ok) {
          log.error(`[doc-memory] Ollama error on chunk ${chunk.chunk_index}:`, response.status);
          continue;
        }

        const data = await response.json();
        const text = data.message?.content?.trim();

        if (!text || text === "[]") continue;

        let facts;
        try {
          const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          facts = JSON.parse(cleaned);
        } catch {
          log.debug(`[doc-memory] Could not parse chunk ${chunk.chunk_index}:`, text?.slice(0, 200));
          continue;
        }

        if (!Array.isArray(facts)) continue;

        for (const fact of facts) {
          if (fact.key && fact.value) {
            stmt.run(profileId, fact.category || "documents", fact.key, fact.value);
            log.debug(`[doc-memory] Stored: [${fact.category || "documents"}] ${fact.key} = ${fact.value}`);
            totalFacts++;
          }
        }

        // Update existingStr for next chunk to avoid duplicates
        if (facts.length > 0) {
          for (const fact of facts) {
            if (fact.key && fact.value) {
              existingStr += `\n- [${fact.category || "documents"}] ${fact.key}: ${fact.value}`;
            }
          }
        }
      } catch (chunkErr) {
        log.error(`[doc-memory] Error on chunk ${chunk.chunk_index}:`, chunkErr.message);
      }
    }

    log.debug(`[doc-memory] Done — extracted ${totalFacts} facts from "${filename}"`);
  } catch (err) {
    log.error("[doc-memory] Error (non-blocking):", err.message);
  }
}

module.exports = router;
