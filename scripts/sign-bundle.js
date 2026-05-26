#!/usr/bin/env node
/**
 * Kinward bundle signer.
 *
 * Reads an unsigned bundle JSON, canonicalizes the payload (sorted keys,
 * deterministic serialization), signs it with the Ed25519 private key at
 * ~/.kinward/signing.key, and writes the bundle back with the `signature`
 * field populated.
 *
 * Bundle format:
 *   {
 *     "version": "2026-05-24",
 *     "released_at": "2026-05-24T00:00:00Z",
 *     "signed_by": "kinward-ai",
 *     "signature": "BASE64_ED25519",        ← this gets filled in
 *     "payload": {
 *       "summary": "...",
 *       "world_context": { ... },
 *       "news_digest": [ ... ],
 *       "model_catalog_additions": [ ... ]
 *     }
 *   }
 *
 * The signature is over the canonical JSON serialization of `payload`
 * — NOT the whole bundle. That way the metadata (version, signed_by,
 * etc.) is also verified separately during ingest, and any tampering
 * with the payload invalidates the signature.
 *
 * Usage:
 *   node scripts/sign-bundle.js path/to/bundle.json [--out signed.json]
 *   npm run bundle:sign -- path/to/bundle.json
 *
 * If --out is omitted, the bundle is signed in place.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PRIVATE_KEY_PATH = path.join(os.homedir(), ".kinward", "signing.key");

function abort(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { input: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") {
      args.out = argv[++i];
    } else if (a === "--key") {
      args.keyPath = argv[++i];
    } else if (!a.startsWith("--")) {
      args.input = a;
    }
  }
  return args;
}

/**
 * Canonical JSON serialization — deterministic across machines.
 * Sorts object keys recursively, no whitespace. Same input always
 * produces the same byte sequence.
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

function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error("\nUsage: node scripts/sign-bundle.js <bundle.json> [--out signed.json] [--key path/to/key]");
    process.exit(1);
  }

  const inputPath = path.resolve(args.input);
  const outputPath = args.out ? path.resolve(args.out) : inputPath;
  const keyPath = args.keyPath || PRIVATE_KEY_PATH;

  if (!fs.existsSync(inputPath)) abort(`Input bundle not found: ${inputPath}`);
  if (!fs.existsSync(keyPath))
    abort(`Private key not found at ${keyPath}\nRun: npm run keypair:gen`);

  // Read + parse bundle
  let bundle;
  try {
    bundle = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  } catch (err) {
    abort(`Could not parse ${inputPath}: ${err.message}`);
  }

  // Validate required structure
  if (!bundle.version || typeof bundle.version !== "string") {
    abort(`Bundle missing "version" field (string, e.g. "2026-05-24")`);
  }
  if (!bundle.signed_by) {
    abort(`Bundle missing "signed_by" field (e.g. "kinward-ai")`);
  }
  if (!bundle.payload || typeof bundle.payload !== "object") {
    abort(`Bundle missing "payload" object`);
  }

  // Read private key
  let privateKey;
  try {
    const pem = fs.readFileSync(keyPath, "utf-8");
    privateKey = crypto.createPrivateKey(pem);
  } catch (err) {
    abort(`Could not read private key: ${err.message}`);
  }
  if (privateKey.asymmetricKeyType !== "ed25519") {
    abort(`Key at ${keyPath} is not an Ed25519 key`);
  }

  // Canonicalize payload, sign it
  const canonical = canonicalize(bundle.payload);
  const signature = crypto.sign(null, Buffer.from(canonical, "utf-8"), privateKey);
  const sigB64 = signature.toString("base64");

  // Write signed bundle
  const signed = {
    version: bundle.version,
    released_at: bundle.released_at || new Date().toISOString(),
    signed_by: bundle.signed_by,
    signature: sigB64,
    payload: bundle.payload,
  };

  fs.writeFileSync(outputPath, JSON.stringify(signed, null, 2) + "\n", "utf-8");

  console.log("");
  console.log("  ✓ Bundle signed");
  console.log(`    Version:     ${signed.version}`);
  console.log(`    Signed by:   ${signed.signed_by}`);
  console.log(`    Released:    ${signed.released_at}`);
  console.log(`    Signature:   ${sigB64.slice(0, 24)}... (${signature.length} bytes)`);
  console.log(`    Output:      ${outputPath}`);
  console.log("");
}

try {
  main();
} catch (err) {
  abort(`Signing failed: ${err.message}`);
}
