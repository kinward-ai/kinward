const path = require("path");
const DB_PATH = path.join(__dirname, "..", "..", "data", "kinward.db");

let db;

function getDb() {
  if (!db) {
    const Database = require("better-sqlite3");
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
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
  `);

  console.log("[db] Schema initialized");
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

module.exports = { getDb, initSchema, getConfig, setConfig, isSetupComplete, close, DB_PATH };
