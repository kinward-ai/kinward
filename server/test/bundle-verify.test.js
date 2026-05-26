/**
 * Tests for server/lib/bundle-verify.js
 *
 * This is the most security-critical code in Kinward — it's the gate that
 * decides whether an incoming bundle has actually been signed by the
 * Kinward maintainers. If verifyBundle ever returns valid:true for input
 * the maintainer didn't sign, the entire trust model collapses.
 *
 * These tests exercise:
 *   - Valid signed bundle verifies
 *   - Tampering anywhere in the payload invalidates the signature
 *   - Missing required fields rejected
 *   - Unknown signers rejected
 *   - Malformed signatures rejected
 *   - Canonicalization is deterministic across re-orderings
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");

// Generate a fresh keypair for this test run so we don't depend on a key
// file on the dev machine. We monkeypatch trusted-keys to accept it.
const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const rawPub = publicKey.export({ type: "spki", format: "der" }).slice(-32);
const pubB64 = rawPub.toString("base64");

// Stub the trusted-keys module before bundle-verify loads it.
const trustedKeysPath = require.resolve("../lib/trusted-keys");
require.cache[trustedKeysPath] = {
  id: trustedKeysPath,
  filename: trustedKeysPath,
  loaded: true,
  exports: {
    lookup: (signer) => (signer === "test-signer" ? pubB64 : null),
    listSigners: () => ["test-signer"],
    TRUSTED_KEYS: { "test-signer": pubB64 },
  },
};

const { verifyBundle, canonicalize } = require("../lib/bundle-verify");

// ─── Helper: sign a payload the same way scripts/sign-bundle.js does ───────
function signPayload(payload) {
  const canonical = canonicalize(payload);
  const sig = crypto.sign(null, Buffer.from(canonical, "utf-8"), privateKey);
  return sig.toString("base64");
}

function makeBundle(overrides = {}) {
  const payload = overrides.payload ?? {
    summary: "test bundle",
    world_context: { facts: { current_year: "2026" } },
  };
  return {
    version: overrides.version ?? "2026-01-01",
    released_at: overrides.released_at ?? "2026-01-01T00:00:00Z",
    signed_by: overrides.signed_by ?? "test-signer",
    signature: overrides.signature ?? signPayload(payload),
    payload,
  };
}

// ─── Happy path ────────────────────────────────────────────────────────────

test("valid signed bundle verifies", () => {
  const bundle = makeBundle();
  const result = verifyBundle(bundle);
  assert.equal(result.valid, true);
});

test("bundle with reordered payload keys still verifies (canonicalization)", () => {
  // Sign with one key order
  const payload = { a: 1, z: 2, m: 3 };
  const signature = signPayload(payload);

  // Submit with different key order
  const bundle = {
    version: "1",
    signed_by: "test-signer",
    signature,
    payload: { m: 3, a: 1, z: 2 },
  };

  assert.equal(verifyBundle(bundle).valid, true);
});

// ─── Tampering ─────────────────────────────────────────────────────────────

test("tampering with payload invalidates signature", () => {
  const bundle = makeBundle();
  bundle.payload.summary = "tampered";

  const result = verifyBundle(bundle);
  assert.equal(result.valid, false);
  assert.match(result.reason, /does not match/i);
});

test("tampering with nested payload invalidates signature", () => {
  const bundle = makeBundle();
  bundle.payload.world_context.facts.current_year = "9999";

  assert.equal(verifyBundle(bundle).valid, false);
});

test("adding a new field to payload invalidates signature", () => {
  const bundle = makeBundle();
  bundle.payload.evil = "extra field";

  assert.equal(verifyBundle(bundle).valid, false);
});

test("modifying signature itself invalidates", () => {
  const bundle = makeBundle();
  // Flip the first base64 character — keep it valid base64 but wrong content
  const ch = bundle.signature[0];
  const swap = ch === "A" ? "B" : "A";
  bundle.signature = swap + bundle.signature.slice(1);

  assert.equal(verifyBundle(bundle).valid, false);
});

// ─── Structural validation ─────────────────────────────────────────────────

test("missing signature field rejected", () => {
  const bundle = makeBundle();
  delete bundle.signature;
  const result = verifyBundle(bundle);
  assert.equal(result.valid, false);
  assert.match(result.reason, /signature/i);
});

test("missing payload field rejected", () => {
  const bundle = makeBundle();
  delete bundle.payload;
  const result = verifyBundle(bundle);
  assert.equal(result.valid, false);
  assert.match(result.reason, /payload/i);
});

test("missing version field rejected", () => {
  const bundle = makeBundle();
  delete bundle.version;
  const result = verifyBundle(bundle);
  assert.equal(result.valid, false);
  assert.match(result.reason, /version/i);
});

test("missing signed_by field rejected", () => {
  const bundle = makeBundle();
  delete bundle.signed_by;
  const result = verifyBundle(bundle);
  assert.equal(result.valid, false);
  assert.match(result.reason, /signed_by/i);
});

test("non-object input rejected", () => {
  assert.equal(verifyBundle(null).valid, false);
  assert.equal(verifyBundle(undefined).valid, false);
  assert.equal(verifyBundle("not a bundle").valid, false);
  assert.equal(verifyBundle(42).valid, false);
});

// ─── Signer trust ──────────────────────────────────────────────────────────

test("unknown signer rejected even with valid signature", () => {
  const bundle = makeBundle({ signed_by: "evil-corp" });
  const result = verifyBundle(bundle);
  assert.equal(result.valid, false);
  assert.match(result.reason, /unknown signer/i);
});

test("changing signed_by AFTER signing invalidates (looks up wrong key)", () => {
  const bundle = makeBundle();
  bundle.signed_by = "evil-corp";
  const result = verifyBundle(bundle);
  assert.equal(result.valid, false);
});

// ─── Malformed signature ──────────────────────────────────────────────────

test("signature that is not base64 rejected", () => {
  const bundle = makeBundle({ signature: "%%%not-base64$$$" });
  // Base64 decoders are tolerant but the resulting bytes won't be a valid sig
  const result = verifyBundle(bundle);
  assert.equal(result.valid, false);
});

test("empty signature string rejected", () => {
  const bundle = makeBundle();
  bundle.signature = "";
  const result = verifyBundle(bundle);
  assert.equal(result.valid, false);
});

// ─── Canonicalization properties ───────────────────────────────────────────

test("canonicalize is deterministic for the same logical object", () => {
  const a = { z: 1, a: { y: 2, b: 3 } };
  const b = { a: { b: 3, y: 2 }, z: 1 };
  assert.equal(canonicalize(a), canonicalize(b));
});

test("canonicalize handles nested arrays as opaque values", () => {
  const a = { arr: [3, 1, 2] };
  const b = { arr: [1, 2, 3] };
  // Arrays preserve order intentionally — different order = different value
  assert.notEqual(canonicalize(a), canonicalize(b));
});

test("canonicalize handles primitives", () => {
  assert.equal(canonicalize(null), "null");
  assert.equal(canonicalize(true), "true");
  assert.equal(canonicalize(42), "42");
  assert.equal(canonicalize("hello"), '"hello"');
});

test("canonicalize handles deeply nested objects", () => {
  const deep = { a: { b: { c: { d: { e: 1 } } } } };
  const expected = '{"a":{"b":{"c":{"d":{"e":1}}}}}';
  assert.equal(canonicalize(deep), expected);
});
