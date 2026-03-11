#!/usr/bin/env node

/**
 * Kinward Reset Script
 *
 * Resets the system for a fresh setup test.
 *
 *   npm run reset          → wipe DB, keep models (fast re-test)
 *   npm run reset:hard     → wipe DB + delete all Ollama models (full clean slate)
 */

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "kinward.db");
const WIPE_MODELS = process.argv.includes("--wipe-models");

async function reset() {
  console.log("");
  console.log("  ⚔️  KINWARD RESET");
  console.log("  ─────────────────");

  // 1. Wipe database
  const filesToDelete = [DB_PATH, DB_PATH + "-wal", DB_PATH + "-shm"];
  for (const f of filesToDelete) {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log(`  ✓ Deleted ${path.basename(f)}`);
    }
  }
  console.log("  ✓ Database wiped — profiles, sessions, config all cleared");

  // 2. Optionally wipe Ollama models
  if (WIPE_MODELS) {
    console.log("  → Removing Ollama models...");
    try {
      const res = await fetch("http://127.0.0.1:11434/api/tags");
      const data = await res.json();
      for (const model of data.models || []) {
        console.log(`    Deleting ${model.name}...`);
        await fetch("http://127.0.0.1:11434/api/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: model.name }),
        });
        console.log(`    ✓ ${model.name} removed`);
      }
      console.log("  ✓ All Ollama models removed");
    } catch (err) {
      console.log(`  ⚠ Couldn't reach Ollama: ${err.message}`);
      console.log("    (Models will persist — start Ollama and run again to clean them)");
    }
  } else {
    console.log("  ℹ Models kept (use --wipe-models for full reset)");
  }

  console.log("");
  console.log("  Ready for fresh setup. Run: npm run dev");
  console.log("");
}

reset().catch(console.error);
