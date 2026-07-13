const { test } = require("node:test");
const assert = require("node:assert");
const { CATALOG } = require("../lib/model-catalog");

const VALID_TIERS = new Set(["basic", "good", "excellent"]);

// --- Offline, deterministic: every entry is well-formed ---
test("catalog entries are well-formed", () => {
  for (const m of CATALOG) {
    assert.ok(m.ollama && typeof m.ollama === "string", `missing ollama tag: ${JSON.stringify(m)}`);
    assert.ok(m.display, `missing display for ${m.ollama}`);
    assert.ok(VALID_TIERS.has(m.minTier), `bad minTier for ${m.ollama}: ${m.minTier}`);
    assert.ok(typeof m.sizeGb === "number" && m.sizeGb > 0, `bad sizeGb for ${m.ollama}`);
  }
});

// Guard against the class of bug where Gemma 4 sizes were guessed as Gemma 2's
// 9b/27b — regression pin on the exact tags we corrected to real Ollama tags.
test("no known-phantom Ollama tags remain", () => {
  const phantoms = ["gemma4:9b", "gemma4:27b", "phi4:mini"];
  const present = CATALOG.map((m) => m.ollama);
  for (const p of phantoms) {
    assert.ok(!present.includes(p), `catalog still references non-existent Ollama tag: ${p}`);
  }
});

// --- Live check against the Ollama registry; skips gracefully when offline ---
test("every catalog tag exists on the Ollama registry", async (t) => {
  const check = async (ref) => {
    const [name, tag = "latest"] = ref.includes(":") ? ref.split(":") : [ref];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`https://registry.ollama.ai/v2/library/${name}/manifests/${tag}`, {
        headers: { Accept: "application/vnd.oci.image.index.v1+json" },
        signal: ctrl.signal,
      });
      return res.status;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    await check("llama3.1:8b"); // canary
  } catch {
    t.skip("Ollama registry unreachable (offline) — run scripts/verify-catalog.js with network");
    return;
  }

  const refs = [...new Set(CATALOG.map((m) => m.ollama))];
  for (const ref of refs) {
    const status = await check(ref);
    assert.strictEqual(status, 200, `catalog tag "${ref}" is not pullable (HTTP ${status})`);
  }
});
