/**
 * Kinward Version Check — talks to GitHub API to see if a newer app
 * version is available on kinward-ai/kinward.
 *
 * Design notes:
 *   - Outbound calls are user-initiated only (not on a timer). This is the
 *     first network request Kinward makes outside of Ollama; keeping it
 *     manual aligns with the local-first principle.
 *   - We cache results for 5 minutes to avoid hammering the GitHub API
 *     if the user mashes the button.
 *   - Anonymous GitHub API limit is 60 req/hour per IP. With the 5-min
 *     cache that's plenty for any reasonable use.
 *   - We never auto-pull, auto-install, or write to disk. This is a
 *     read-only check that produces a status object for the UI to render.
 *   - If GitHub is unreachable (offline, rate limited, repo deleted),
 *     we return a clear status the UI can show rather than throwing.
 */

const path = require("path");
const log = require("./log");

// Pull current version from package.json at module load
let CURRENT_VERSION = "0.0.0";
try {
  const pkgPath = path.join(__dirname, "..", "..", "package.json");
  CURRENT_VERSION = require(pkgPath).version || "0.0.0";
} catch (err) {
  log.debug("[version-check] Could not read package.json version:", err.message);
}

const REPO = "kinward-ai/kinward";
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cache = null; // { status, fetchedAt }

/**
 * Compare semver-ish versions. Returns:
 *   > 0 if a is newer than b
 *   < 0 if a is older than b
 *   = 0 if equal or non-comparable
 *
 * Tolerant of "v" prefixes and pre-release suffixes (ignored).
 */
function compareVersions(a, b) {
  const clean = (v) => String(v || "").replace(/^v/, "").split("-")[0];
  const partsA = clean(a).split(".").map((n) => parseInt(n, 10) || 0);
  const partsB = clean(b).split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Fetch latest release info from GitHub. Returns a status object.
 * Never throws — returns { state: "error", reason } on failure.
 */
async function fetchLatestRelease() {
  try {
    const res = await fetch(RELEASES_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `Kinward/${CURRENT_VERSION}`,
      },
    });

    if (res.status === 404) {
      // No releases published yet. Common during alpha — repo exists but
      // no version tag cut.
      return { state: "no-releases", message: "No releases published yet" };
    }
    if (res.status === 403) {
      return { state: "rate-limited", message: "GitHub rate limit hit. Try again later." };
    }
    if (!res.ok) {
      return { state: "error", message: `GitHub API returned ${res.status}` };
    }

    const data = await res.json();
    return {
      state: "ok",
      latestVersion: data.tag_name || data.name || "unknown",
      publishedAt: data.published_at,
      htmlUrl: data.html_url,
      body: data.body || "",
      name: data.name || data.tag_name,
    };
  } catch (err) {
    // Network failure, DNS, offline, etc.
    log.debug("[version-check] Fetch failed:", err.message);
    return { state: "offline", message: "Couldn't reach GitHub. Check your internet connection." };
  }
}

/**
 * Get the current update status. Uses the in-memory cache if fresh.
 * @param {object} opts
 * @param {boolean} opts.force - bypass cache
 * @returns {Promise<{
 *   current: string,
 *   state: "ok" | "no-releases" | "rate-limited" | "offline" | "error",
 *   latestVersion?: string,
 *   behind?: boolean,
 *   versionsBehind?: number,
 *   publishedAt?: string,
 *   htmlUrl?: string,
 *   body?: string,
 *   message?: string,
 *   fetchedAt: string,
 *   fromCache: boolean,
 * }>}
 */
async function getAppUpdateStatus({ force = false } = {}) {
  const now = Date.now();

  if (!force && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { ...cache.status, fetchedAt: new Date(cache.fetchedAt).toISOString(), fromCache: true };
  }

  const latest = await fetchLatestRelease();
  const status = {
    current: CURRENT_VERSION,
    state: latest.state,
    message: latest.message,
  };

  if (latest.state === "ok") {
    const cmp = compareVersions(CURRENT_VERSION, latest.latestVersion);
    status.latestVersion = latest.latestVersion;
    status.publishedAt = latest.publishedAt;
    status.htmlUrl = latest.htmlUrl;
    status.body = latest.body;
    status.name = latest.name;
    status.behind = cmp < 0;
    status.versionsBehind = cmp < 0 ? Math.abs(cmp) : 0;
  }

  cache = { status, fetchedAt: now };
  return { ...status, fetchedAt: new Date(now).toISOString(), fromCache: false };
}

function getCurrentVersion() {
  return CURRENT_VERSION;
}

function clearCache() {
  cache = null;
}

module.exports = {
  getAppUpdateStatus,
  getCurrentVersion,
  compareVersions,
  clearCache,
};
