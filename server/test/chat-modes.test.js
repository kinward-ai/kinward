/**
 * Tests for server/lib/chat-modes.js + the chat_modes schema migration.
 *
 * The chat_modes table is the first concrete application of the Modularity
 * Principle: conversation modes are rows, not hardcoded enums. These tests
 * pin down the contract:
 *   - initSchema creates the table and seeds the 4 built-in modes
 *   - syncBuiltInModes is idempotent and repairs drifted built-in rows
 *   - family-owned rows are never touched by sync
 *   - built-ins removed from code are disabled, not deleted
 *   - role visibility filtering matches the original CategoryPicker rules
 *   - the legacy CHECK constraint on models.category is removed by migration
 *     (so 'coding' and future categories don't need schema changes)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Isolate the DB in a temp dir BEFORE db.js computes DATA_DIR at load time.
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "kinward-chat-modes-test-"));
process.env.KINWARD_DATA_DIR = TMP_DIR;

// Simulate a pre-chat_modes database: old-style models table with the
// hardcoded category CHECK constraint, plus a row that must survive.
{
  const Database = require("better-sqlite3");
  const legacy = new Database(path.join(TMP_DIR, "kinward.db"));
  legacy.exec(`
    CREATE TABLE models (
      id TEXT PRIMARY KEY,
      ollama_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('general', 'kids', 'research', 'creative')),
      size_bytes INTEGER,
      is_default INTEGER DEFAULT 0,
      config JSON DEFAULT '{}',
      installed_at TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO models (id, ollama_name, display_name, category, size_bytes, is_default)
    VALUES ('m1', 'llama3.1:8b', 'Llama 3.1 8B', 'general', 4700000000, 1);
  `);
  legacy.close();
}

const { getDb, initSchema, close } = require("../lib/db");
const {
  BUILT_IN_MODES,
  syncBuiltInModes,
  getMode,
  getModeOrDefault,
  listModes,
  listModesForRole,
  roleCanUseMode,
} = require("../lib/chat-modes");

initSchema();

test.after(() => {
  close();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

test("initSchema seeds the built-in modes", () => {
  const modes = listModes();
  assert.deepEqual(
    modes.map((m) => m.id).sort(),
    ["coding", "creative", "general", "kids", "research", "tutor"]
  );
  for (const mode of modes) {
    assert.equal(mode.source, "built-in");
    assert.ok(mode.system_prompt.length > 50, `${mode.id} has a real prompt`);
    assert.ok(Array.isArray(mode.visible_roles));
  }
});

test("seeded modes carry the original category settings", () => {
  assert.equal(getMode("general").temperature, 0.7);
  assert.equal(getMode("kids").temperature, 0.5);
  assert.equal(getMode("research").temperature, 0.4);
  assert.equal(getMode("creative").temperature, 0.9);
  assert.equal(getMode("kids").model_category, "kids");
  assert.equal(getMode("coding").temperature, 0.3);
  assert.equal(getMode("coding").model_category, "coding");
});

test("sync is idempotent", () => {
  syncBuiltInModes();
  syncBuiltInModes();
  assert.equal(listModes().length, BUILT_IN_MODES.length);
});

test("sync repairs a drifted built-in row", () => {
  getDb()
    .prepare("UPDATE chat_modes SET system_prompt = 'tampered', temperature = 1.5 WHERE id = 'kids'")
    .run();
  syncBuiltInModes();
  const kids = getMode("kids");
  assert.notEqual(kids.system_prompt, "tampered");
  assert.equal(kids.temperature, 0.5);
});

test("sync never touches family-owned rows", () => {
  getDb()
    .prepare(
      `INSERT INTO chat_modes (id, name, system_prompt, source, visible_roles)
       VALUES ('family-recipes', 'Recipe Helper', 'You help with recipes.', 'family', '["admin"]')`
    )
    .run();
  syncBuiltInModes();
  const custom = getMode("family-recipes");
  assert.equal(custom.system_prompt, "You help with recipes.");
  assert.equal(custom.enabled, true);
  getDb().prepare("DELETE FROM chat_modes WHERE id = 'family-recipes'").run();
});

test("built-ins removed from code are disabled, not deleted", () => {
  BUILT_IN_MODES.push({
    id: "temp-mode",
    name: "Temp",
    description: "",
    icon: "🧪",
    color: "#000000",
    system_prompt: "Temporary test mode.",
    temperature: 0.7,
    max_tokens: 2048,
    model_category: "general",
    visible_roles: ["admin"],
    sort_order: 99,
  });
  syncBuiltInModes();
  assert.equal(getMode("temp-mode").enabled, true);

  BUILT_IN_MODES.pop();
  syncBuiltInModes();
  const removed = getMode("temp-mode");
  assert.ok(removed, "row still exists");
  assert.equal(removed.enabled, false);
  assert.ok(!listModes().some((m) => m.id === "temp-mode"), "not listed");
  getDb().prepare("DELETE FROM chat_modes WHERE id = 'temp-mode'").run();
});

test("role visibility matches original CategoryPicker rules + new modes", () => {
  const ids = (role) => listModesForRole(role).map((m) => m.id).sort();
  // Children get kid-appropriate modes only; Tutor is built for them
  assert.deepEqual(ids("child"), ["kids", "tutor"]);
  // Teens get everything except Kids mode
  assert.deepEqual(ids("teen"), ["coding", "creative", "general", "research", "tutor"]);
  assert.deepEqual(ids("admin"), ["coding", "creative", "general", "kids", "research", "tutor"]);
  assert.deepEqual(ids("guest"), ["coding", "creative", "general", "kids", "research", "tutor"]);
});

test("tutor mode is Socratic v1 only — no study-plan or activity machinery", () => {
  const tutor = getMode("tutor");
  assert.equal(tutor.model_category, "research");
  assert.ok(tutor.visible_roles.includes("child"), "tutor is for kids");
  assert.match(tutor.system_prompt, /upload/i, "encourages document upload");
  assert.match(tutor.system_prompt, /Never hand over the answer/);
});

test("roleCanUseMode: admins can use anything, children cannot use general", () => {
  const general = getMode("general");
  const kids = getMode("kids");
  assert.equal(roleCanUseMode("admin", kids), true);
  assert.equal(roleCanUseMode("co-admin", general), true);
  assert.equal(roleCanUseMode("child", general), false);
  assert.equal(roleCanUseMode("child", kids), true);
  assert.equal(roleCanUseMode("teen", kids), false);
});

test("getModeOrDefault falls back to general for unknown or disabled ids", () => {
  assert.equal(getModeOrDefault("no-such-mode").id, "general");
  assert.equal(getModeOrDefault(null).id, "general");
  assert.equal(getModeOrDefault("research").id, "research");
});

test("legacy models category CHECK constraint is removed, data preserved", () => {
  const db = getDb();

  const row = db.prepare("SELECT * FROM models WHERE id = 'm1'").get();
  assert.ok(row, "pre-migration model row survived the rebuild");
  assert.equal(row.display_name, "Llama 3.1 8B");
  assert.equal(row.is_default, 1);

  const sql = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'models'")
    .get().sql;
  assert.ok(!/CHECK\s*\(\s*category/i.test(sql), "CHECK constraint gone");

  // The point of the migration: new categories insert cleanly
  db.prepare(
    `INSERT INTO models (id, ollama_name, display_name, category)
     VALUES ('m2', 'qwen2.5-coder:7b', 'Qwen 2.5 Coder 7B', 'coding')`
  ).run();
  assert.equal(db.prepare("SELECT category FROM models WHERE id = 'm2'").get().category, "coding");
  db.prepare("DELETE FROM models WHERE id = 'm2'").run();
});

test("initSchema is idempotent on an already-migrated database", () => {
  initSchema();
  assert.equal(listModes().length, BUILT_IN_MODES.length);
  assert.ok(getDb().prepare("SELECT * FROM models WHERE id = 'm1'").get());
});
