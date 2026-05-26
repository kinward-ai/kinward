/**
 * Kinward context bundles — fetch, verify, apply, rollback.
 *
 * Bundles are signed JSON files published at kinward-ai/kinward-context.
 * This module is the runtime counterpart to the developer tooling in
 * scripts/sign-bundle.js + scripts/verify-bundle.js.
 *
 * Lifecycle:
 *   1. fetchManifest()           — lists what bundles are available remotely
 *   2. fetchBundle(version)      — downloads a specific bundle
 *   3. verifyBundle(bundle)      — checks Ed25519 signature against trusted key
 *   4. applyBundle(bundle, ...)  — writes payload to system_config + audit
 *   5. rollback(...)             — reverts to the previously active bundle
 *
 * Trust chain:
 *   maintainer signs bundle    (private key on dev machine)
 *   → committed to public repo (anyone can mirror; tampering invalidates sig)
 *   → fetched via HTTPS         (transport integrity)
 *   → verifyBundle()            (signature must match baked-in public key)
 *   → user sees diff + confirms (UI gate)
 *   → applyBundle() w/ fresh admin  (auth gate)
 *   → audit_log entry           (governance record)
 *
 * Network calls are user-initiated only. We never poll in the background.
 */

const { getDb, setConfig } = require("./db");
const bundleVerify = require("./bundle-verify");
const audit = require("./audit");
const log = require("./log");

// Where to fetch bundles from. Overridable for dev/testing.
const CONTEXT_REPO_BASE =
  process.env.KINWARD_CONTEXT_REPO_BASE ||
  "https://raw.githubusercontent.com/kinward-ai/kinward-context/main";

const MANIFEST_URL = `${CONTEXT_REPO_BASE}/manifest.json`;
const MANIFEST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let manifestCache = null; // { data, fetchedAt }

// ─── Remote fetch ──────────────────────────────────────────────────────────

/**
 * Fetch the bundle manifest. Cached for MANIFEST_CACHE_TTL_MS.
 * Returns { state, manifest? | message? }.
 */
async function fetchManifest({ force = false } = {}) {
  const now = Date.now();
  if (!force && manifestCache && now - manifestCache.fetchedAt < MANIFEST_CACHE_TTL_MS) {
    return { state: "ok", manifest: manifestCache.data, fromCache: true };
  }

  try {
    const res = await fetch(MANIFEST_URL, {
      headers: { Accept: "application/json", "User-Agent": "Kinward-Updates" },
    });
    if (res.status === 404) {
      return { state: "no-manifest", message: "Manifest not found at expected URL" };
    }
    if (!res.ok) {
      return { state: "error", message: `Fetching manifest returned ${res.status}` };
    }
    const data = await res.json();
    if (!Array.isArray(data.bundles)) {
      return { state: "error", message: "Manifest is malformed (no bundles array)" };
    }
    manifestCache = { data, fetchedAt: now };
    return { state: "ok", manifest: data, fromCache: false };
  } catch (err) {
    log.debug("[bundles] fetchManifest failed:", err.message);
    return { state: "offline", message: "Couldn't reach the context repo. Check your internet." };
  }
}

/**
 * Fetch a specific bundle by manifest entry. Does NOT verify — caller must.
 */
async function fetchBundle(manifestEntry) {
  if (!manifestEntry?.path) {
    return { state: "error", message: "Manifest entry missing path" };
  }
  const url = `${CONTEXT_REPO_BASE}/${manifestEntry.path}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Kinward-Updates" },
    });
    if (res.status === 404) {
      return { state: "not-found", message: `Bundle ${manifestEntry.version} not found at ${url}` };
    }
    if (!res.ok) {
      return { state: "error", message: `Fetching bundle returned ${res.status}` };
    }
    const bundle = await res.json();
    return { state: "ok", bundle };
  } catch (err) {
    return { state: "offline", message: "Couldn't reach the context repo." };
  }
}

// ─── Local state queries ───────────────────────────────────────────────────

function getActiveBundle() {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, version, signed_by, released_at, applied_at, applied_by_profile_id,
              rollback_of_id, payload
       FROM context_bundles
       WHERE active = 1
       ORDER BY applied_at DESC
       LIMIT 1`
    )
    .get();
  if (!row) return null;
  return { ...row, payload: JSON.parse(row.payload) };
}

function listAppliedBundles({ limit = 50 } = {}) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT cb.id, cb.version, cb.signed_by, cb.released_at,
              cb.applied_at, cb.applied_by_profile_id, cb.active, cb.rollback_of_id,
              p.name AS applied_by_name, p.avatar_color AS applied_by_avatar_color
       FROM context_bundles cb
       LEFT JOIN profiles p ON p.id = cb.applied_by_profile_id
       ORDER BY cb.applied_at DESC
       LIMIT ?`
    )
    .all(limit);
  return rows;
}

function getBundleByVersion(version) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM context_bundles WHERE version = ? ORDER BY applied_at DESC LIMIT 1")
    .get(version);
  if (!row) return null;
  return { ...row, payload: JSON.parse(row.payload) };
}

// ─── Diff helpers (for preview UI) ─────────────────────────────────────────

/**
 * Produce a shallow human-readable diff between two payload objects.
 * Returns an array of { kind: "add" | "change" | "remove", path, before?, after? }.
 *
 * Walks objects recursively, treats arrays as opaque values (whole-array diff).
 */
function diffPayloads(before, after, basePath = "") {
  const diffs = [];

  const beforeIsObj = before && typeof before === "object" && !Array.isArray(before);
  const afterIsObj = after && typeof after === "object" && !Array.isArray(after);

  if (beforeIsObj && afterIsObj) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const childPath = basePath ? `${basePath}.${key}` : key;
      if (!(key in before)) {
        diffs.push({ kind: "add", path: childPath, after: after[key] });
      } else if (!(key in after)) {
        diffs.push({ kind: "remove", path: childPath, before: before[key] });
      } else {
        diffs.push(...diffPayloads(before[key], after[key], childPath));
      }
    }
    return diffs;
  }

  // Leaf compare (also handles arrays)
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    diffs.push({ kind: "change", path: basePath, before, after });
  }
  return diffs;
}

// ─── Apply ─────────────────────────────────────────────────────────────────

/**
 * Apply a verified bundle. Writes the world_context payload into
 * system_config (as JSON), marks the bundle active in context_bundles,
 * deactivates any previously-active bundle, audit-logs the apply.
 *
 * Caller MUST have already called verifyBundle and confirmed valid:true.
 *
 * @param {object} bundle - the parsed, verified bundle
 * @param {object} actor  - { profileId, profileName, sourceIp }
 * @returns {object} the inserted context_bundles row
 */
function applyBundle(bundle, actor) {
  const db = getDb();

  // Idempotency: refuse to re-apply the same version
  const existing = db
    .prepare("SELECT id FROM context_bundles WHERE version = ? AND active = 1")
    .get(bundle.version);
  if (existing) {
    throw new Error(`Bundle ${bundle.version} is already the active bundle`);
  }

  // Run the state mutations in a transaction
  const tx = db.transaction(() => {
    db.prepare("UPDATE context_bundles SET active = 0 WHERE active = 1").run();

    const result = db
      .prepare(
        `INSERT INTO context_bundles
         (version, signed_by, released_at, signature, payload, applied_by_profile_id, active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`
      )
      .run(
        bundle.version,
        bundle.signed_by,
        bundle.released_at || null,
        bundle.signature,
        JSON.stringify(bundle.payload),
        actor.profileId
      );

    // Mirror world_context to system_config so existing chat code finds it.
    // Stored as JSON-stringified structured payload.
    setConfig("world_context", bundle.payload.world_context);
    // Stash a pointer for chat.js to detect we're on the structured format
    setConfig("world_context_source", { type: "bundle", version: bundle.version });

    return result.lastInsertRowid;
  });

  const insertedId = tx();

  audit.auditLog(
    "updates.bundle_applied",
    `${actor.profileName} applied context bundle ${bundle.version}`,
    {
      actorProfileId: actor.profileId,
      targetType: "context_bundle",
      targetId: String(insertedId),
      sourceIp: actor.sourceIp,
      metadata: { version: bundle.version, signed_by: bundle.signed_by },
    }
  );

  return db
    .prepare("SELECT * FROM context_bundles WHERE id = ?")
    .get(insertedId);
}

/**
 * Roll back to the previously active bundle (the one applied before the
 * current active one). Records the rollback as a new row referencing the
 * bundle that was restored, so the history is complete and auditable.
 *
 * @param {object} actor - { profileId, profileName, sourceIp }
 */
function rollback(actor) {
  const db = getDb();

  // Current active bundle
  const current = db
    .prepare("SELECT id, version FROM context_bundles WHERE active = 1 ORDER BY applied_at DESC LIMIT 1")
    .get();
  if (!current) {
    throw new Error("No active bundle to roll back from");
  }

  // Previously active bundle (next-most-recent that isn't the current one)
  const previous = db
    .prepare(
      `SELECT id, version, signed_by, released_at, signature, payload
       FROM context_bundles
       WHERE id != ?
       ORDER BY applied_at DESC
       LIMIT 1`
    )
    .get(current.id);

  if (!previous) {
    throw new Error("No previous bundle to roll back to");
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE context_bundles SET active = 0 WHERE active = 1").run();

    const result = db
      .prepare(
        `INSERT INTO context_bundles
         (version, signed_by, released_at, signature, payload, applied_by_profile_id, active, rollback_of_id)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
      )
      .run(
        previous.version,
        previous.signed_by,
        previous.released_at,
        previous.signature,
        previous.payload,
        actor.profileId,
        previous.id
      );

    const payload = JSON.parse(previous.payload);
    setConfig("world_context", payload.world_context);
    setConfig("world_context_source", {
      type: "bundle",
      version: previous.version,
      restored_via_rollback: true,
    });

    return result.lastInsertRowid;
  });

  const insertedId = tx();

  audit.auditLog(
    "updates.bundle_rolled_back",
    `${actor.profileName} rolled back from ${current.version} to ${previous.version}`,
    {
      actorProfileId: actor.profileId,
      targetType: "context_bundle",
      targetId: String(insertedId),
      sourceIp: actor.sourceIp,
      metadata: { from: current.version, to: previous.version },
    }
  );

  return { rolledBackFrom: current.version, rolledBackTo: previous.version };
}

// ─── Combined remote-availability check ────────────────────────────────────

/**
 * Returns the state used by GET /api/updates/status to render the
 * "Knowledge Context" card. Compares the latest remote bundle (from
 * manifest) against the active bundle in this install.
 */
async function getContextUpdateStatus({ force = false } = {}) {
  const manifestRes = await fetchManifest({ force });
  if (manifestRes.state !== "ok") {
    return {
      state: manifestRes.state,
      message: manifestRes.message,
      fromCache: manifestRes.fromCache || false,
    };
  }

  const latest = manifestRes.manifest.bundles[0];
  if (!latest) {
    return { state: "no-bundles", message: "No bundles published yet" };
  }

  const active = getActiveBundle();
  const currentVersion = active?.version || null;
  const behind = !active || active.version !== latest.version;

  return {
    state: "ok",
    currentVersion,
    latest: {
      version: latest.version,
      released_at: latest.released_at,
      summary: latest.summary,
      signed_by: manifestRes.manifest.signed_by,
      path: latest.path,
    },
    behind,
    fromCache: manifestRes.fromCache,
  };
}

// ─── Convenience: verify + decode for preview ──────────────────────────────

/**
 * Fetch + verify a bundle by version, returning either the verified bundle
 * with a diff against the currently-active payload, or an error state for
 * the UI to surface.
 */
async function fetchVerifiedBundleForPreview(version) {
  const manifestRes = await fetchManifest();
  if (manifestRes.state !== "ok") {
    return { state: manifestRes.state, message: manifestRes.message };
  }

  const entry = manifestRes.manifest.bundles.find((b) => b.version === version);
  if (!entry) {
    return { state: "not-found", message: `Bundle ${version} not in manifest` };
  }

  const fetched = await fetchBundle(entry);
  if (fetched.state !== "ok") {
    return { state: fetched.state, message: fetched.message };
  }

  const verifyResult = bundleVerify.verifyBundle(fetched.bundle);
  if (!verifyResult.valid) {
    audit.auditLog(
      "updates.bundle_verification_failed",
      `Bundle ${version} failed verification: ${verifyResult.reason}`,
      {
        targetType: "context_bundle",
        targetId: version,
        metadata: { reason: verifyResult.reason, signed_by: fetched.bundle.signed_by },
      }
    );
    return {
      state: "verification-failed",
      message: verifyResult.reason,
      bundle: fetched.bundle,
    };
  }

  const active = getActiveBundle();
  const diff = active
    ? diffPayloads(active.payload, fetched.bundle.payload)
    : Object.entries(fetched.bundle.payload).map(([key, value]) => ({
        kind: "add",
        path: key,
        after: value,
      }));

  return {
    state: "ok",
    bundle: fetched.bundle,
    diff,
    currentVersion: active?.version || null,
  };
}

function clearManifestCache() {
  manifestCache = null;
}

module.exports = {
  // Fetch
  fetchManifest,
  fetchBundle,
  fetchVerifiedBundleForPreview,
  // Query
  getActiveBundle,
  listAppliedBundles,
  getBundleByVersion,
  getContextUpdateStatus,
  // Mutate
  applyBundle,
  rollback,
  // Util
  diffPayloads,
  clearManifestCache,
  CONTEXT_REPO_BASE,
};
