/**
 * Bundle signature verification.
 *
 * Imported by:
 *   - server route handler for POST /api/updates/bundles/apply (Phase C)
 *   - scripts/verify-bundle.js (developer CLI for testing)
 *
 * Uses the same canonical JSON serialization as scripts/sign-bundle.js.
 * Any mismatch in canonicalization between sign and verify breaks the
 * entire signature scheme, so keep these two implementations in lockstep.
 */

const crypto = require("crypto");
const trustedKeys = require("./trusted-keys");

/**
 * Canonical JSON — deterministic, sorted keys, no whitespace.
 * Same algorithm as scripts/sign-bundle.js — DO NOT diverge.
 */
function canonicalize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") +
    "}"
  );
}

/**
 * Verify a signed bundle against the trusted public key for its signer.
 *
 * @param {object} bundle - parsed bundle JSON, must include signature, signed_by, payload
 * @returns {{ valid: boolean, reason?: string }}
 */
function verifyBundle(bundle) {
  if (!bundle || typeof bundle !== "object") {
    return { valid: false, reason: "Bundle is not a JSON object" };
  }
  if (!bundle.version || typeof bundle.version !== "string") {
    return { valid: false, reason: "Bundle missing version" };
  }
  if (!bundle.signed_by || typeof bundle.signed_by !== "string") {
    return { valid: false, reason: "Bundle missing signed_by" };
  }
  if (!bundle.signature || typeof bundle.signature !== "string") {
    return { valid: false, reason: "Bundle missing signature" };
  }
  if (!bundle.payload || typeof bundle.payload !== "object") {
    return { valid: false, reason: "Bundle missing payload" };
  }

  // Look up the trusted key for this signer
  const trustedKeyB64 = trustedKeys.lookup(bundle.signed_by);
  if (!trustedKeyB64) {
    return {
      valid: false,
      reason: `Unknown signer: "${bundle.signed_by}". Not in trusted keys list.`,
    };
  }

  // Convert raw base64 public key into a Node KeyObject
  const rawKey = Buffer.from(trustedKeyB64, "base64");
  if (rawKey.length !== 32) {
    return {
      valid: false,
      reason: `Trusted key for ${bundle.signed_by} is not a valid Ed25519 public key (32 bytes expected, got ${rawKey.length})`,
    };
  }

  // Wrap raw key in SPKI DER envelope so Node accepts it
  // Ed25519 SPKI prefix: 30 2A 30 05 06 03 2B 65 70 03 21 00
  const spkiPrefix = Buffer.from([
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
  ]);
  const spkiDer = Buffer.concat([spkiPrefix, rawKey]);
  let publicKey;
  try {
    publicKey = crypto.createPublicKey({
      key: spkiDer,
      format: "der",
      type: "spki",
    });
  } catch (err) {
    return { valid: false, reason: `Could not build public key: ${err.message}` };
  }

  // Canonicalize payload + verify signature
  const canonical = canonicalize(bundle.payload);
  let sig;
  try {
    sig = Buffer.from(bundle.signature, "base64");
  } catch {
    return { valid: false, reason: "Signature is not valid base64" };
  }

  let valid;
  try {
    valid = crypto.verify(null, Buffer.from(canonical, "utf-8"), publicKey, sig);
  } catch (err) {
    return { valid: false, reason: `Verification error: ${err.message}` };
  }

  if (!valid) {
    return { valid: false, reason: "Signature does not match payload" };
  }
  return { valid: true };
}

module.exports = { verifyBundle, canonicalize };
