const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const { fork, execSync } = require("child_process");
const fs = require("fs");
const net = require("net");

// --- Paths ---
const IS_DEV = process.env.ELECTRON_DEV === "1";
const SERVER_ENTRY = path.join(__dirname, "..", "server", "index.js");
const DATA_DIR = path.join(app.getPath("userData"), "data");
const PORT = 3210;

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;

// Tray (loaded in Phase 2)
let tray = null;

// Ollama manager (loaded in Phase 3)
let ollamaManager = null;

// --- Ensure data directories exist ---
function ensureDataDirs() {
  const dirs = [DATA_DIR, path.join(DATA_DIR, "uploads"), path.join(DATA_DIR, "backups")];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

// --- Pre-launch native module validation ---
/**
 * Try to require native modules before forking the server.
 * If they're compiled for the wrong ABI, we catch the error here
 * instead of getting a cryptic crash from the child process.
 */
function validateNativeModules() {
  const modules = ["better-sqlite3"];
  const failures = [];

  for (const mod of modules) {
    try {
      require(mod);
    } catch (err) {
      if (err.message && err.message.includes("NODE_MODULE_VERSION")) {
        failures.push({
          module: mod,
          error: "ABI mismatch — needs rebuild for Electron",
          detail: err.message,
        });
      } else if (err.code === "MODULE_NOT_FOUND") {
        failures.push({
          module: mod,
          error: "Not installed — run npm install",
          detail: err.message,
        });
      } else {
        failures.push({
          module: mod,
          error: err.message,
          detail: err.stack,
        });
      }
    }
  }

  if (failures.length > 0) {
    const summary = failures
      .map((f) => `• ${f.module}: ${f.error}`)
      .join("\n");

    console.error(`[electron] Native module validation failed:\n${summary}`);

    // Attempt auto-rebuild
    console.log("[electron] Attempting automatic rebuild...");
    try {
      execSync("node scripts/electron-rebuild.js", {
        cwd: path.join(__dirname, ".."),
        stdio: "inherit",
        timeout: 120000,
      });
      console.log("[electron] Rebuild succeeded — retrying validation...");

      // Verify the rebuild actually fixed it
      for (const f of failures) {
        try {
          // Clear the require cache so we load the freshly-built module
          const modPath = require.resolve(f.module);
          delete require.cache[modPath];
          require(f.module);
        } catch (retryErr) {
          dialog.showErrorBox(
            "Native Module Error",
            `Kinward could not load ${f.module} even after rebuilding.\n\n` +
            `Error: ${retryErr.message}\n\n` +
            `Try running: npm run electron:rebuild`
          );
          return false;
        }
      }
      return true; // Rebuild fixed everything
    } catch (rebuildErr) {
      dialog.showErrorBox(
        "Native Module Error",
        `Kinward's native modules need to be rebuilt for Electron.\n\n` +
        `Failed modules:\n${summary}\n\n` +
        `Auto-rebuild failed: ${rebuildErr.message}\n\n` +
        `Run manually: npm run electron:rebuild`
      );
      return false;
    }
  }
  return true;
}

// --- Port management ---

/**
 * Check if a port is currently in use.
 * @returns {Promise<boolean>}
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      resolve(err.code === "EADDRINUSE");
    });
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port, "0.0.0.0");
  });
}

/**
 * Kill whatever process is occupying the port.
 * Returns true if the port was freed, false if it couldn't be freed.
 */
async function freePort(port) {
  try {
    if (process.platform === "win32") {
      // Find PID on Windows: netstat → findstr → taskkill
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: "utf-8",
        timeout: 5000,
      });
      const pid = output.trim().split(/\s+/).pop();
      if (pid && pid !== "0") {
        execSync(`taskkill /PID ${pid} /F`, { timeout: 5000 });
      }
    } else {
      // Mac/Linux: lsof → kill
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, {
        timeout: 5000,
        shell: true,
      });
    }
    // Wait a moment for the port to actually free up
    await new Promise((r) => setTimeout(r, 500));
    return !(await isPortInUse(port));
  } catch {
    // Command failed — port may already be free or we can't kill the process
    return !(await isPortInUse(port));
  }
}

/**
 * Ensure port is available before starting the server.
 * If occupied, attempt to free it. If it can't be freed, show an error.
 */
async function ensurePortAvailable(port) {
  const inUse = await isPortInUse(port);
  if (!inUse) return true;

  console.log(`[electron] Port ${port} is in use, attempting to free it...`);
  const freed = await freePort(port);

  if (freed) {
    console.log(`[electron] Port ${port} freed successfully`);
    return true;
  }

  // Couldn't free it — ask the user
  const choice = dialog.showMessageBoxSync({
    type: "warning",
    title: "Port In Use",
    message: `Port ${port} is already in use by another application.`,
    detail: "Kinward needs this port to run. You can try again or quit and free the port manually.",
    buttons: ["Try Again", "Quit"],
    defaultId: 0,
  });

  if (choice === 0) {
    return ensurePortAvailable(port); // Recursive retry
  }
  return false;
}

// --- Fork the Express server as a child process ---
function startServer() {
  return new Promise((resolve, reject) => {
    console.log(`[electron] Starting server from: ${SERVER_ENTRY}`);
    console.log(`[electron] Data dir: ${DATA_DIR}`);

    const env = {
      ...process.env,
      KINWARD_DATA_DIR: DATA_DIR,
      PORT: String(PORT),
    };

    serverProcess = fork(SERVER_ENTRY, [], {
      env,
      cwd: path.join(__dirname, ".."),
      stdio: ["pipe", "pipe", "pipe", "ipc"],
    });

    // Wait for server-ready IPC message
    const timeout = setTimeout(() => {
      reject(new Error("Server did not start within 15 seconds"));
    }, 15000);

    serverProcess.on("message", (msg) => {
      if (msg && msg.type === "server-ready") {
        clearTimeout(timeout);
        console.log(`[electron] Server ready on port ${msg.port}`);
        resolve();
      }
    });

    serverProcess.stdout.on("data", (data) => {
      process.stdout.write(`[server] ${data}`);
    });

    serverProcess.stderr.on("data", (data) => {
      process.stderr.write(`[server:err] ${data}`);
    });

    serverProcess.on("exit", (code) => {
      console.log(`[electron] Server exited with code ${code}`);
      serverProcess = null;
      if (!isQuitting && code !== 0) {
        handleServerCrash(code);
      }
    });

    serverProcess.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// --- Handle unexpected server crashes ---
function handleServerCrash(exitCode) {
  const choice = dialog.showMessageBoxSync({
    type: "error",
    title: "Kinward Server Error",
    message: `The Kinward server stopped unexpectedly (code ${exitCode}).`,
    buttons: ["Restart", "Quit"],
    defaultId: 0,
  });

  if (choice === 0) {
    // Clean up port before restarting
    ensurePortAvailable(PORT)
      .then((available) => {
        if (!available) throw new Error("Port unavailable");
        return startServer();
      })
      .then(() => {
        if (mainWindow) mainWindow.reload();
      })
      .catch(() => app.quit());
  } else {
    app.quit();
  }
}

// --- Graceful server shutdown ---
/**
 * Kill the server child process and wait for it to exit.
 * Uses SIGTERM first, then SIGKILL after timeout.
 */
function killServer() {
  return new Promise((resolve) => {
    if (!serverProcess || serverProcess.killed) {
      resolve();
      return;
    }

    const forceKillTimeout = setTimeout(() => {
      // Server didn't exit gracefully — force kill
      try {
        serverProcess.kill("SIGKILL");
      } catch {
        // Already dead
      }
      serverProcess = null;
      resolve();
    }, 3000);

    serverProcess.once("exit", () => {
      clearTimeout(forceKillTimeout);
      serverProcess = null;
      resolve();
    });

    try {
      serverProcess.kill("SIGTERM");
    } catch {
      clearTimeout(forceKillTimeout);
      serverProcess = null;
      resolve();
    }
  });
}

// --- Create the main application window ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Kinward",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    icon: path.join(__dirname, "icons", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // Show when ready to prevent flash
  });

  const url = IS_DEV
    ? "http://localhost:5173"
    : `http://localhost:${PORT}`;

  mainWindow.loadURL(url);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Hide to tray instead of quitting
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      // On Mac, hide the dock icon when window is hidden
      if (process.platform === "darwin" && tray) {
        app.dock.hide();
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// --- Show the window (called from tray or dock click) ---
function showWindow() {
  if (mainWindow) {
    if (process.platform === "darwin") {
      app.dock.show();
    }
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

// --- App lifecycle ---
app.whenReady().then(async () => {
  ensureDataDirs();

  // Validate native modules before anything else
  const modulesOk = validateNativeModules();
  if (!modulesOk) {
    app.quit();
    return;
  }

  // Phase 3: Ensure Ollama is running before starting server
  try {
    ollamaManager = require("./ollama-manager");
    const ollamaStatus = await ollamaManager.ensureOllama();
    console.log(`[electron] Ollama: ${ollamaStatus.running ? "running" : "not available"}`);
  } catch (err) {
    console.warn("[electron] Ollama manager not available:", err.message);
  }

  // Ensure port is free before starting server
  const portAvailable = await ensurePortAvailable(PORT);
  if (!portAvailable) {
    app.quit();
    return;
  }

  // Start the Express server
  try {
    await startServer();
  } catch (err) {
    dialog.showErrorBox(
      "Kinward Failed to Start",
      `Could not start the Kinward server:\n\n${err.message}\n\nPlease try restarting the application.`
    );
    app.quit();
    return;
  }

  createWindow();

  // Initialize tray
  try {
    const { createTray } = require("./tray");
    tray = createTray({ showWindow, ollamaManager });
  } catch (err) {
    console.warn("[electron] Tray not available:", err.message);
  }

  // Mac: re-create window when dock icon is clicked
  app.on("activate", () => {
    showWindow();
  });

  // --- Auto-launch IPC ---
  ipcMain.handle("get-auto-launch", () => {
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle("set-auto-launch", (_event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    return app.getLoginItemSettings().openAtLogin;
  });
});

// --- Quit behavior ---

// Track whether we've already started the shutdown sequence
let isShuttingDown = false;

/**
 * Central shutdown handler — called from every quit/signal path.
 * Ensures server is killed, tray poll is cleared, and app exits cleanly.
 * Idempotent: safe to call multiple times.
 */
async function shutdownAndQuit() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  isQuitting = true;

  // Clean up tray polling
  if (tray && tray._pollInterval) {
    clearInterval(tray._pollInterval);
    tray._pollInterval = null;
  }

  // Kill server gracefully, then force-quit
  await killServer();
  app.exit(0); // app.exit() is synchronous — no re-entrant quit loop
}

app.on("before-quit", () => {
  isQuitting = true;
});

// will-quit: synchronous guard + kick off async shutdown
app.on("will-quit", (e) => {
  if (serverProcess && !serverProcess.killed) {
    e.preventDefault();
    shutdownAndQuit();
  }
});

// Catch-all: ensure server dies even on unexpected exits (synchronous)
process.on("exit", () => {
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill("SIGKILL");
    } catch {
      // Best-effort
    }
  }
});

// Handle uncaught exceptions — don't leave zombie server processes
process.on("uncaughtException", (err) => {
  console.error("[electron] Uncaught exception:", err);
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill("SIGKILL");
    } catch {
      // Best-effort
    }
  }
  app.exit(1);
});

// Handle unhandled promise rejections — same treatment
process.on("unhandledRejection", (reason) => {
  console.error("[electron] Unhandled rejection:", reason);
  // Don't quit — log it and keep running. Most rejections are recoverable.
});

// Handle system signals (Ctrl+C, terminal close, kill)
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    console.log(`[electron] Received ${signal}, shutting down...`);
    shutdownAndQuit();
  });
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showWindow();
  });
}

// Export for tray module
module.exports = { showWindow };
