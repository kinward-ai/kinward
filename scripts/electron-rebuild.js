#!/usr/bin/env node

/**
 * Rebuild native Node modules (better-sqlite3, bcrypt) for Electron's Node version.
 *
 * Why this exists:
 *   System Node and Electron's bundled Node use different ABI versions.
 *   Native .node addons compiled for one won't load in the other.
 *   This script detects the mismatch and rebuilds only when necessary.
 *
 * Usage:
 *   node scripts/electron-rebuild.js          — rebuild for Electron
 *   node scripts/electron-rebuild.js --system  — rebuild for system Node (undo)
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
// Only modules that use node-gyp and need ABI-specific rebuilds.
// bcrypt uses N-API prebuilds and works across Node versions without rebuilding.
const NATIVE_MODULES = ["better-sqlite3"];
const MARKER_FILE = path.join(ROOT, "node_modules", ".electron-rebuilt");

const forSystem = process.argv.includes("--system");

// --- Pre-flight checks ---

/**
 * Verify that required build tools are available before attempting rebuild.
 * node-gyp needs: Python, make/msbuild, and a C++ compiler.
 */
function checkBuildTools() {
  // Check node-gyp is accessible
  try {
    execSync("npx node-gyp --version", { cwd: ROOT, encoding: "utf-8", timeout: 15000, stdio: "pipe" });
  } catch {
    console.error("[rebuild] node-gyp is not available.");
    console.error("[rebuild] Install it with: npm install -g node-gyp");
    console.error("[rebuild] You also need Python and a C++ compiler:");
    if (process.platform === "darwin") {
      console.error("[rebuild]   xcode-select --install");
    } else if (process.platform === "win32") {
      console.error("[rebuild]   npm install -g windows-build-tools");
    } else {
      console.error("[rebuild]   sudo apt-get install build-essential python3");
    }
    process.exit(1);
  }

  // Check node_modules exists
  if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
    console.error("[rebuild] node_modules not found. Run 'npm install' first.");
    process.exit(1);
  }
}

function getElectronVersion() {
  try {
    const out = execSync("npx electron --version", { cwd: ROOT, encoding: "utf-8", timeout: 15000 });
    return out.trim().replace(/^v/, "");
  } catch (err) {
    console.error("[rebuild] Could not determine Electron version:", err.message);
    process.exit(1);
  }
}

function getSystemNodeABI() {
  return process.versions.modules; // e.g. "141"
}

function getCurrentMarker() {
  try {
    return fs.readFileSync(MARKER_FILE, "utf-8").trim();
  } catch {
    return null;
  }
}

function setMarker(value) {
  fs.writeFileSync(MARKER_FILE, value, "utf-8");
}

function rebuildModule(moduleName, { runtime, target, distUrl }) {
  const modulePath = path.join(ROOT, "node_modules", moduleName);
  if (!fs.existsSync(modulePath)) {
    console.log(`[rebuild] Skipping ${moduleName} — not installed`);
    return;
  }

  const bindingGyp = path.join(modulePath, "binding.gyp");
  if (!fs.existsSync(bindingGyp)) {
    console.log(`[rebuild] Skipping ${moduleName} — no binding.gyp (not a native module)`);
    return;
  }

  console.log(`[rebuild] Rebuilding ${moduleName} for ${runtime} ${target}...`);

  const args = ["rebuild"];
  if (runtime !== "node") {
    args.push(`--runtime=${runtime}`, `--target=${target}`, `--dist-url=${distUrl}`);
  }

  try {
    execSync(`npx node-gyp ${args.join(" ")}`, {
      cwd: modulePath,
      stdio: "inherit",
      timeout: 120000,
    });
    console.log(`[rebuild] ✓ ${moduleName} rebuilt successfully`);
    return true;
  } catch (err) {
    console.error(`[rebuild] ✗ ${moduleName} rebuild failed: ${err.message}`);
    return false;
  }
}

// --- Main ---
checkBuildTools();

if (forSystem) {
  console.log("[rebuild] Rebuilding native modules for system Node...");
  const nodeABI = getSystemNodeABI();

  for (const mod of NATIVE_MODULES) {
    rebuildModule(mod, { runtime: "node", target: process.version });
  }

  setMarker(`system-node-abi-${nodeABI}`);
  console.log("[rebuild] Done — modules ready for system Node");
} else {
  const electronVersion = getElectronVersion();
  const expectedMarker = `electron-${electronVersion}`;
  const currentMarker = getCurrentMarker();

  if (currentMarker === expectedMarker) {
    console.log(`[rebuild] Native modules already built for Electron ${electronVersion} — skipping`);
    process.exit(0);
  }

  console.log(`[rebuild] Rebuilding native modules for Electron ${electronVersion}...`);

  let allSucceeded = true;
  for (const mod of NATIVE_MODULES) {
    const ok = rebuildModule(mod, {
      runtime: "electron",
      target: electronVersion,
      distUrl: "https://electronjs.org/headers",
    });
    if (!ok) allSucceeded = false;
  }

  if (allSucceeded) {
    setMarker(expectedMarker);
    console.log(`[rebuild] Done — modules ready for Electron ${electronVersion}`);
  } else {
    console.error("[rebuild] Some modules failed to rebuild. Electron may crash on launch.");
    process.exit(1);
  }
}
