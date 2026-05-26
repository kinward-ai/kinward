/**
 * Kinward trusted public keys.
 *
 * The base64-encoded raw Ed25519 public keys that this build of Kinward
 * will accept for signed-content verification (context bundles, future
 * community plugins, etc.).
 *
 * Each entry maps a `signed_by` identifier to its public key. When a bundle
 * arrives with signed_by="kinward-ai", we look up KINWARD_AI_PUBLIC_KEY here.
 *
 * SECURITY MODEL:
 *   - These keys are baked into the application binary at build time.
 *   - The matching private keys live only on the maintainer's machine
 *     (~/.kinward/signing.key) and are never committed to any repo.
 *   - To rotate a key, ship an app version update that replaces the
 *     public key here. Older app installs will continue verifying with
 *     the old key until users upgrade.
 *   - Compromise of the private key requires a key rotation via app
 *     version update + invalidating any bundles signed with the old key.
 *
 * To generate a new keypair:
 *   npm run keypair:gen
 * Then paste the printed base64 string into the constant below.
 */

// kinward-ai/kinward-context bundles are signed with this key.
// Generated 2026-05-24 via `npm run keypair:gen`.
// Matching private key lives at ~/.kinward/signing.key on the maintainer's machine.
const KINWARD_AI_PUBLIC_KEY = "9jhlDS8DIkKNbKem2Q/6L30rw/5aQxaydPKXDd5aJ7s=";

const TRUSTED_KEYS = {
  "kinward-ai": KINWARD_AI_PUBLIC_KEY,
};

/**
 * Look up the trusted public key for a given signer identifier.
 * @param {string} signer - e.g. "kinward-ai"
 * @returns {string | null} base64-encoded raw Ed25519 public key (32 bytes),
 *                           or null if signer is unknown / not yet provisioned.
 */
function lookup(signer) {
  const key = TRUSTED_KEYS[signer];
  if (!key || key.length === 0) return null;
  return key;
}

function listSigners() {
  return Object.keys(TRUSTED_KEYS).filter((k) => TRUSTED_KEYS[k]);
}

module.exports = { lookup, listSigners, TRUSTED_KEYS };
