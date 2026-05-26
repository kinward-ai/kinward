#!/usr/bin/env node
/**
 * Kinward bundle verifier — developer CLI.
 *
 * Verifies a signed bundle against the public key baked into the app.
 * Same code path the runtime uses; useful for sanity-checking a freshly
 * signed bundle before publishing it.
 *
 * Usage:
 *   node scripts/verify-bundle.js path/to/signed.json
 *   npm run bundle:verify -- path/to/signed.json
 */

const fs = require("fs");
const path = require("path");

const { verifyBundle } = require("../server/lib/bundle-verify");

function abort(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node scripts/verify-bundle.js <signed-bundle.json>");
    process.exit(1);
  }
  const inputPath = path.resolve(input);
  if (!fs.existsSync(inputPath)) abort(`Bundle not found: ${inputPath}`);

  let bundle;
  try {
    bundle = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  } catch (err) {
    abort(`Could not parse ${inputPath}: ${err.message}`);
  }

  const result = verifyBundle(bundle);

  console.log("");
  if (result.valid) {
    console.log("  ✓ Signature valid");
    console.log(`    Version:    ${bundle.version}`);
    console.log(`    Signed by:  ${bundle.signed_by}`);
    console.log(`    Released:   ${bundle.released_at}`);
    const payloadKeys = Object.keys(bundle.payload || {}).join(", ");
    console.log(`    Payload:    { ${payloadKeys} }`);
    console.log("");
    process.exit(0);
  } else {
    console.log("  ✗ Signature INVALID");
    console.log(`    Reason: ${result.reason}`);
    console.log("");
    process.exit(1);
  }
}

main();
