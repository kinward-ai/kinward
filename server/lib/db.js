const path = require("path");
const DB_PATH = path.join(__dirname, "..", "..", "data", "kinward.db");

let db;

function getDb() {
  if (!db) {
    const Database = require("better-sqlite3");
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000"); // wait up to 5s on concurrent writes
  }
  return db;
}

function initSchema() {
  const db = getDb();

  db.exec(`
    -- System configuration (env mode, hardware info, setup state)
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Family profiles
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'co-admin', 'teen', 'child', 'guest')),
      pin_hash TEXT,
      guardrail_level TEXT NOT NULL DEFAULT 'open' CHECK (guardrail_level IN ('strict', 'moderate', 'open', 'custom')),
      passphrase_salt TEXT,
      encryption_key_hash TEXT,
      avatar_color TEXT DEFAULT '#C75B2A',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Installed models (what's been pulled via Ollama)
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      ollama_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('general', 'kids', 'research', 'creative')),
      size_bytes INTEGER,
      is_default INTEGER DEFAULT 0,
      config JSON DEFAULT '{}',
      installed_at TEXT DEFAULT (datetime('now'))
    );

    -- Model category configs (system prompts, temperature, etc.)
    CREATE TABLE IF NOT EXISTS model_configs (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL REFERENCES models(id),
      category TEXT NOT NULL,
      system_prompt TEXT,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 2048,
      config JSON DEFAULT '{}',
      UNIQUE(model_id, category)
    );

    -- Chat sessions
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      model_id TEXT REFERENCES models(id),
      category TEXT,
      title TEXT,
      encrypted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Chat messages (encrypted at rest for passphrase-backed profiles)
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Activity log (patterns, not content — governance without surveillance)
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL REFERENCES profiles(id),
      event_type TEXT NOT NULL,
      category TEXT,
      duration_seconds INTEGER,
      metadata JSON DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Core Memory: Protected facts per profile (Tier 1 — survives model swaps & updates)
    CREATE TABLE IF NOT EXISTS core_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'general',
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(profile_id, category, key)
    );

    CREATE INDEX IF NOT EXISTS idx_core_memory_profile
      ON core_memory(profile_id);
    CREATE INDEX IF NOT EXISTS idx_core_memory_profile_category
      ON core_memory(profile_id, category);

    -- AI Identity: The AI's self — name, personality traits, chosen by the family
    CREATE TABLE IF NOT EXISTS ai_identity (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Documents: uploaded files attached to chat sessions
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      session_id TEXT REFERENCES sessions(id),
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      total_chunks INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Document chunks: text segments for injection into prompts
    CREATE TABLE IF NOT EXISTS document_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      token_estimate INTEGER DEFAULT 0,
      UNIQUE(document_id, chunk_index)
    );

    CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc
      ON document_chunks(document_id);
  `);

  console.log("[db] Schema initialized");

  // Seed default world context if not present (idempotent)
  const existing = db.prepare("SELECT value FROM system_config WHERE key = 'world_context'").get();
  if (!existing) {
    const defaultWorldContext = [
      "Current Facts (updated by household admin):",
      "- The current President of the United States is Donald Trump (took office January 2025)",
      "- The current Vice President is JD Vance",
      "- The current year is 2026",
      "- You are Lumina, the family's AI assistant, running locally on their home network via Kinward",
      "",
      "Instructions:",
      "- When answering questions about current events or leadership, prefer the facts above over your training data",
      "- If asked about something not covered here, say you're not sure about the very latest and suggest the family check online",
      "- Never make up current events or claim knowledge about things that happened after your training data",
    ].join("\n");

    db.prepare(
      "INSERT INTO system_config (key, value, updated_at) VALUES ('world_context', ?, datetime('now'))"
    ).run(JSON.stringify(defaultWorldContext));

    console.log("[db] World context seeded with defaults");
  }

  // Seed default AI identity if not present (idempotent)
  const existingIdentity = db.prepare("SELECT value FROM ai_identity WHERE key = 'name'").get();
  if (!existingIdentity) {
    const defaults = [
      ["name", "Lumina"],
      ["tagline", "Your family's AI"],
      ["chosen_by", "default"],
      ["personality_style", "warm"],
    ];
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO ai_identity (key, value, updated_at) VALUES (?, ?, datetime('now'))"
    );
    for (const [k, v] of defaults) {
      stmt.run(k, v);
    }
    console.log("[db] AI identity seeded with defaults (Lumina)");
  }

  // Migration: clear stale baked-in system prompts from model_configs
  // System prompts are now always built dynamically from ai_identity + category
  const stalePrompts = db.prepare(
    "SELECT COUNT(*) as count FROM model_configs WHERE system_prompt IS NOT NULL"
  ).get();
  if (stalePrompts.count > 0) {
    db.prepare("UPDATE model_configs SET system_prompt = NULL").run();
    console.log(`[db] Cleared ${stalePrompts.count} stale system prompts from model_configs (now dynamic)`);
  }
}

// --- Helpers ---

function getConfig(key) {
  const row = getDb().prepare("SELECT value FROM system_config WHERE key = ?").get(key);
  return row ? JSON.parse(row.value) : null;
}

function setConfig(key, value) {
  getDb()
    .prepare(
      "INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    )
    .run(key, JSON.stringify(value));
}

function isSetupComplete() {
  return getConfig("setup_complete") === true;
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

// --- AI Identity helpers ---

function getAIIdentity() {
  const rows = getDb().prepare("SELECT key, value FROM ai_identity").all();
  const identity = {};
  for (const row of rows) {
    identity[row.key] = row.value;
  }
  // Always return at least a name
  if (!identity.name) identity.name = "Lumina";
  return identity;
}

function setAIIdentity(key, value) {
  getDb()
    .prepare(
      "INSERT INTO ai_identity (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    )
    .run(key, value);
}

function getMemoryContext(profileId) {
  const memories = getDb()
    .prepare(
      "SELECT category, key, value FROM core_memory WHERE profile_id = ? ORDER BY category, key"
    )
    .all(profileId);

  if (memories.length === 0) return "";

  const grouped = {};
  for (const mem of memories) {
    if (!grouped[mem.category]) grouped[mem.category] = [];
    grouped[mem.category].push(`${mem.key}: ${mem.value}`);
  }

  let context = "\n\nWhat you know about this person:\n";
  for (const [cat, items] of Object.entries(grouped)) {
    context += `[${cat}]\n`;
    for (const item of items) {
      context += `- ${item}\n`;
    }
  }
  context +=
    "\nUse this knowledge naturally in conversation. Don't recite it back or make it obvious you're reading from a list. Just let it inform how you respond — like a friend who remembers.";

  return context;
}

// --- Document helpers ---

function estimateTokens(text) {
  // ~4 characters per token for English text (conservative)
  return Math.ceil(text.length / 4);
}

function chunkText(text, targetTokens = 1500) {
  const targetChars = targetTokens * 4;
  const chunks = [];

  // Prefer splitting on paragraph breaks
  const paragraphs = text.split(/\n\s*\n/);
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length > targetChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

function storeDocument(id, profileId, sessionId, filename, fileType, textContent) {
  const d = getDb();
  const chunks = chunkText(textContent);
  const totalTokens = estimateTokens(textContent);

  d.prepare(
    `INSERT INTO documents (id, profile_id, session_id, filename, file_type, total_chunks, total_tokens)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, profileId, sessionId, filename, fileType, chunks.length, totalTokens);

  const stmt = d.prepare(
    `INSERT INTO document_chunks (document_id, chunk_index, content, token_estimate)
     VALUES (?, ?, ?, ?)`
  );

  for (let i = 0; i < chunks.length; i++) {
    stmt.run(id, i, chunks[i], estimateTokens(chunks[i]));
  }

  return {
    documentId: id,
    filename,
    fileType,
    totalChunks: chunks.length,
    totalTokens,
    previewText: textContent.slice(0, 200),
  };
}

function getDocument(documentId) {
  return getDb().prepare("SELECT * FROM documents WHERE id = ?").get(documentId);
}

function getDocumentChunks(documentId) {
  return getDb()
    .prepare("SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index")
    .all(documentId);
}

function getSessionDocuments(sessionId) {
  return getDb()
    .prepare("SELECT * FROM documents WHERE session_id = ? ORDER BY created_at")
    .all(sessionId);
}

// --- Database backup ---

const fs = require("fs");
const BACKUP_DIR = path.join(__dirname, "..", "..", "data", "backups");

function backupDatabase() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = path.join(BACKUP_DIR, `kinward-${timestamp}.db`);

  // Use SQLite's backup API via better-sqlite3 for a safe, consistent copy
  getDb().backup(backupPath)
    .then(() => {
      console.log(`[db] Backup saved: ${backupPath}`);
      // Keep only last 7 backups
      pruneBackups(7);
    })
    .catch((err) => {
      console.error("[db] Backup failed:", err.message);
    });
}

function pruneBackups(keep = 7) {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("kinward-") && f.endsWith(".db"))
      .sort()
      .reverse();

    for (const file of files.slice(keep)) {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
    }
  } catch {
    // Non-critical
  }
}

// --- Full database export (for migration / backup) ---

function exportFullDatabase() {
  const d = getDb();

  const profiles = d.prepare(
    "SELECT id, name, role, avatar_color, guardrail_level, created_at FROM profiles"
  ).all();

  const sessions = d.prepare(
    "SELECT id, profile_id, model_id, category, title, created_at, updated_at FROM sessions"
  ).all();

  const messages = d.prepare(
    "SELECT id, session_id, role, content, tokens_used, created_at FROM messages"
  ).all();

  const memories = d.prepare(
    "SELECT profile_id, category, key, value, source, created_at, updated_at FROM core_memory"
  ).all();

  const documents = d.prepare(
    "SELECT id, profile_id, session_id, filename, file_type, total_chunks, total_tokens, created_at FROM documents"
  ).all();

  const identity = getAIIdentity();
  const worldContext = getConfig("world_context");

  return {
    export_version: 2,
    exported_at: new Date().toISOString(),
    identity,
    world_context: worldContext,
    profiles,
    sessions,
    messages,
    memories,
    documents,
    stats: {
      profiles: profiles.length,
      sessions: sessions.length,
      messages: messages.length,
      memories: memories.length,
      documents: documents.length,
    },
  };
}

module.exports = {
  getDb, initSchema, getConfig, setConfig, isSetupComplete, close,
  getMemoryContext, getAIIdentity, setAIIdentity, DB_PATH,
  estimateTokens, chunkText, storeDocument, getDocument, getDocumentChunks, getSessionDocuments,
  backupDatabase, exportFullDatabase,
};
