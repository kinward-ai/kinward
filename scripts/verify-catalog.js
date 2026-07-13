#!/usr/bin/env node
/**
 * Verify every model in the Kinward catalog actually exists on the Ollama
 * registry — so a guessed/typo'd tag (e.g. the old `gemma4:27b`, which Ollama
 * never had) can't ship and break a user's very first "install a model" step.
 *
 * Checks each catalog `ollama` tag against the registry manifest endpoint:
 *   https://registry.ollama.ai/v2/library/<name>/manifests/<tag>   (200 = real)
 *
 * Usage:  node scripts/verify-catalog.js
 * Exits non-zero if any tag is missing (or, when offline, prints a warning and
 * exits 0 so it never blocks work with no network — the CI/pre-release run is
 * where it's authoritative).
 */
const { CATALOG } = require("../server/lib/model-catalog");

const REGISTRY = "https://registry.ollama.ai/v2/library";
const ACCEPT = "application/vnd.oci.image.index.v1+json";

async function tagExists(ref) {
  const [name, tag = "latest"] = ref.includes(":") ? ref.split(":") : [ref];
  const url = `${REGISTRY}/${name}/manifests/${tag}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { headers: { Accept: ACCEPT }, signal: ctrl.signal });
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  const refs = [...new Set(CATALOG.map((m) => m.ollama))].sort();

  // Canary: if the registry itself is unreachable, we're offline — don't fail.
  try {
    await tagExists("llama3.1:8b");
  } catch {
    console.warn("[verify-catalog] Ollama registry unreachable (offline?) — skipping. Re-run with network before release.");
    process.exit(0);
  }

  const missing = [];
  for (const ref of refs) {
    let status;
    try {
      status = await tagExists(ref);
    } catch {
      status = "ERR";
    }
    const ok = status === 200;
    if (!ok) missing.push(ref);
    console.log(`  ${ok ? "✓" : "✗"} ${ref.padEnd(22)} ${status}`);
  }

  if (missing.length) {
    console.error(`\n[verify-catalog] ${missing.length} catalog tag(s) do not exist on Ollama: ${missing.join(", ")}`);
    console.error("Fix the `ollama` field in server/lib/model-catalog.js — check https://ollama.com/library.");
    process.exit(1);
  }
  console.log(`\n[verify-catalog] All ${refs.length} catalog tags exist on Ollama. ✓`);
})();
