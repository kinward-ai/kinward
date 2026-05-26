#!/usr/bin/env node
/**
 * Kinward keypair generator — one-time setup.
 *
 * Generates an Ed25519 keypair for signing context bundles.
 *
 * The PRIVATE key is written to ~/.kinward/signing.key with chmod 600.
 * It MUST stay on your machine, never committed, never shared.
 *
 * The PUBLIC key is printed to stdout — copy it into
 *   server/lib/trusted-keys.js
 * and commit that. The app will then accept any bundle signed with the
 * matching private key.
 *
 * Run once. If you ever lose the private key, generate a new pair and
 * roll the public key via an app version update; old bundles will need
 * to be re-signed with the new key.
 *
 * Usage:
 *   node scripts/keypair-gen.js
 *   npm run keypair:gen
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

const KEY_DIR = path.join(os.homedir(), ".kinward");
const PRIVATE_KEY_PATH = path.join(KEY_DIR, "signing.key");
const PUBLIC_KEY_PATH = path.join(KEY_DIR, "signing.pub");

function abort(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function main() {
  console.log("\nKinward keypair generator");
  console.log("─────────────────────────");

  // Refuse to clobber an existing keypair
  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    console.log(`\nA signing key already exists at ${PRIVATE_KEY_PATH}.`);
    console.log("If you want to rotate keys, move the existing one aside first:");
    console.log(`\n  mv ${PRIVATE_KEY_PATH} ${PRIVATE_KEY_PATH}.bak\n`);
    console.log("Then re-run this script.");
    process.exit(0);
  }

  // Make sure the key directory exists with proper permissions
  if (!fs.existsSync(KEY_DIR)) {
    fs.mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
    ok(`Created ${KEY_DIR} (chmod 700)`);
  }

  // Generate Ed25519 keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

  // Export both keys as PEM
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });
  const publicPem = publicKey.export({ type: "spki", format: "pem" });

  // Also export the raw 32-byte public key as base64 for easy embedding
  const publicRaw = publicKey.export({ type: "spki", format: "der" });
  // SPKI DER for Ed25519 is 44 bytes; last 32 are the raw public key
  const rawKey = publicRaw.slice(-32);
  const publicB64 = rawKey.toString("base64");

  // Write private key with restrictive permissions
  fs.writeFileSync(PRIVATE_KEY_PATH, privatePem, { mode: 0o600 });
  fs.chmodSync(PRIVATE_KEY_PATH, 0o600);
  ok(`Wrote private key to ${PRIVATE_KEY_PATH} (chmod 600)`);

  // Write public key too, for convenience
  fs.writeFileSync(PUBLIC_KEY_PATH, publicPem, { mode: 0o644 });
  ok(`Wrote public key (PEM) to ${PUBLIC_KEY_PATH}`);

  console.log("");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Public key (base64, raw Ed25519 — paste into trusted-keys.js):");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("");
  console.log(`  ${publicB64}`);
  console.log("");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Copy the base64 string above");
  console.log("  2. Open server/lib/trusted-keys.js");
  console.log("  3. Paste it into the KINWARD_AI_PUBLIC_KEY constant");
  console.log("  4. Commit and push");
  console.log("");
  console.log("Your private key stays on this machine ONLY. Never commit it.");
  console.log("If you lose it, you'll need to rotate via an app version update.");
  console.log("");
}

try {
  main();
} catch (err) {
  abort(`Keypair generation failed: ${err.message}`);
}
