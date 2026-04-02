const { spawn, execSync } = require("child_process");
const http = require("http");

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

/**
 * Check if Ollama is currently running by hitting its API.
 * @returns {Promise<boolean>}
 */
function isOllamaRunning() {
  return new Promise((resolve) => {
    const url = new URL("/api/tags", OLLAMA_HOST);
    const req = http.get(url, { timeout: 3000 }, (res) => {
      // Any response means Ollama is running
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Check if the `ollama` binary is installed on the system.
 * @returns {boolean}
 */
function isOllamaInstalled() {
  try {
    const cmd = process.platform === "win32" ? "where ollama" : "which ollama";
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempt to start Ollama as a detached background process.
 * @returns {boolean} true if spawn succeeded (does not guarantee Ollama is ready)
 */
function startOllama() {
  try {
    const binary = process.platform === "win32" ? "ollama.exe" : "ollama";
    const child = spawn(binary, ["serve"], {
      detached: true,
      stdio: "ignore",
    });
    child.unref(); // Let it run independently of Electron
    return true;
  } catch (err) {
    console.warn("[ollama-manager] Failed to start Ollama:", err.message);
    return false;
  }
}

/**
 * Wait for Ollama to become responsive.
 * @param {number} maxWaitMs - maximum time to wait
 * @returns {Promise<boolean>}
 */
async function waitForOllama(maxWaitMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await isOllamaRunning()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/**
 * Ensure Ollama is available. Tries to start it if installed but not running.
 * @returns {Promise<{running: boolean, installed: boolean, started: boolean}>}
 */
async function ensureOllama() {
  // Already running? Great.
  if (await isOllamaRunning()) {
    return { running: true, installed: true, started: false };
  }

  // Not running — is it installed?
  const installed = isOllamaInstalled();
  if (!installed) {
    return { running: false, installed: false, started: false };
  }

  // Installed but not running — try to start it
  console.log("[ollama-manager] Ollama installed but not running, starting...");
  const spawned = startOllama();
  if (!spawned) {
    return { running: false, installed: true, started: false };
  }

  // Wait for it to become ready
  const ready = await waitForOllama(8000);
  console.log(`[ollama-manager] Ollama ${ready ? "started successfully" : "did not respond in time"}`);
  return { running: ready, installed: true, started: true };
}

module.exports = {
  isOllamaRunning,
  isOllamaInstalled,
  startOllama,
  ensureOllama,
};
