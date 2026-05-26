/**
 * Updates routes — combined surface for app version checks and (eventually)
 * context bundle availability.
 *
 * Phase A scope: app version only. Context bundle endpoints are stubbed
 * so the UI can render the eventual layout against a stable shape.
 */

const express = require("express");
const router = express.Router();

const versionCheck = require("../lib/version-check");
const contextBundles = require("../lib/context-bundles");
const auth = require("../lib/auth");
const { requireAuth, requireFreshAdmin } = require("../middleware/auth");

// Every updates endpoint requires an authenticated session
router.use(requireAuth);

/**
 * GET /api/updates/status
 *
 * Combined snapshot of "what updates are available." Returns:
 *   {
 *     app:     { current, state, latestVersion?, behind?, ... },
 *     context: { state: "not-yet-implemented" }   ← Phase B/C will fill this in
 *     checkedAt
 *   }
 *
 * Query params:
 *   ?force=1   bypass the in-memory cache
 */
router.get("/status", async (req, res) => {
  const force = req.query.force === "1" || req.query.force === "true";

  try {
    // Both checks in parallel — they hit different hosts.
    const [app, context] = await Promise.all([
      versionCheck.getAppUpdateStatus({ force }),
      contextBundles.getContextUpdateStatus({ force }),
    ]);

    // Audit-log the check — only on real fetches, not cache hits, so the
    // log doesn't flood if the UI auto-refreshes.
    const wasRealFetch = !app.fromCache || !context.fromCache;
    if (wasRealFetch) {
      auth.auditLog(
        "updates.checked",
        `${req.session.profile.name} checked for updates`,
        {
          actorProfileId: req.session.profileId,
          sourceIp: req.sourceIp,
          metadata: {
            appState: app.state,
            appBehind: app.behind || false,
            contextState: context.state,
            contextBehind: context.behind || false,
          },
        }
      );
    }

    res.json({ app, context, checkedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/updates/current-version
 *
 * Lightweight endpoint — just returns the app's own version, no network call.
 * Useful for footers / About pages that don't need to ping GitHub.
 */
router.get("/current-version", (req, res) => {
  res.json({ version: versionCheck.getCurrentVersion() });
});

// ─── Context bundles ───────────────────────────────────────────────────────

/**
 * GET /api/updates/bundles
 *
 * History of bundles applied to this install (newest first), with the
 * currently active one marked.
 */
router.get("/bundles", (req, res) => {
  try {
    const bundles = contextBundles.listAppliedBundles({ limit: 50 });
    const active = contextBundles.getActiveBundle();
    res.json({
      bundles,
      activeVersion: active?.version || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/updates/bundles/preview/:version
 *
 * Fetches the bundle from the remote context repo, verifies its signature,
 * and returns it along with a diff against the currently-applied payload.
 * Does NOT apply anything. Read-only.
 */
router.get("/bundles/preview/:version", async (req, res) => {
  try {
    const result = await contextBundles.fetchVerifiedBundleForPreview(
      req.params.version
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/updates/bundles/apply
 *
 * Fetches + verifies + applies the requested bundle version. Requires
 * fresh admin authentication (Settings re-auth window).
 * Body: { version }
 */
router.post("/bundles/apply", requireFreshAdmin, async (req, res) => {
  try {
    const { version } = req.body;
    if (!version) return res.status(400).json({ error: "version required" });

    const result = await contextBundles.fetchVerifiedBundleForPreview(version);
    if (result.state !== "ok") {
      return res.status(400).json({
        error: result.message || `Bundle ${version} is not applicable`,
        state: result.state,
      });
    }

    const applied = contextBundles.applyBundle(result.bundle, {
      profileId: req.session.profileId,
      profileName: req.session.profile.name,
      sourceIp: req.sourceIp,
    });

    res.json({
      ok: true,
      applied: {
        id: applied.id,
        version: applied.version,
        signed_by: applied.signed_by,
        applied_at: applied.applied_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/updates/bundles/rollback
 *
 * Reverts to the previously active bundle. Requires fresh admin.
 */
router.post("/bundles/rollback", requireFreshAdmin, (req, res) => {
  try {
    const result = contextBundles.rollback({
      profileId: req.session.profileId,
      profileName: req.session.profile.name,
      sourceIp: req.sourceIp,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
