const { Tray, Menu, nativeImage, app } = require("electron");
const path = require("path");

let tray = null;
let ollamaRunning = false;
let statusPollInterval = null;

/**
 * Create the system tray icon with context menu.
 * @param {Object} opts
 * @param {Function} opts.showWindow - callback to show/focus main window
 * @param {Object} opts.ollamaManager - ollama-manager module (optional)
 */
function createTray({ showWindow, ollamaManager }) {
  // Use template image on Mac (auto-adapts to dark/light menu bar)
  const iconName = process.platform === "darwin" ? "tray-iconTemplate.png" : "tray-icon.png";
  const iconPath = path.join(__dirname, "icons", iconName);

  // Create a fallback icon if the file doesn't exist yet (Phase 5 generates proper icons)
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) throw new Error("empty");
  } catch {
    // Create a tiny 16x16 placeholder
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip("Kinward — Your Family's AI Guardian");

  // Left-click (Mac) / double-click (Win) opens the window
  tray.on("click", () => showWindow());
  tray.on("double-click", () => showWindow());

  // Build initial context menu
  rebuildMenu(showWindow);

  // Poll Ollama status every 30 seconds
  if (ollamaManager) {
    pollOllamaStatus(ollamaManager, showWindow);
    statusPollInterval = setInterval(() => {
      pollOllamaStatus(ollamaManager, showWindow);
    }, 30000);
    // Expose interval on tray so main process can clean it up on quit
    tray._pollInterval = statusPollInterval;
  }

  return tray;
}

/**
 * Rebuild the tray context menu with current status.
 */
function rebuildMenu(showWindow) {
  const statusLabel = ollamaRunning
    ? "Ollama: \u2713 Running"
    : "Ollama: \u2717 Offline";

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Kinward",
      click: () => showWindow(),
    },
    { type: "separator" },
    {
      label: statusLabel,
      enabled: false, // Display only
    },
    { type: "separator" },
    {
      label: "Quit Kinward",
      click: () => {
        if (statusPollInterval) clearInterval(statusPollInterval);
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Check Ollama status and update tray menu if it changed.
 */
async function pollOllamaStatus(ollamaManager, showWindow) {
  try {
    const running = await ollamaManager.isOllamaRunning();
    if (running !== ollamaRunning) {
      ollamaRunning = running;
      rebuildMenu(showWindow);
    }
  } catch {
    if (ollamaRunning) {
      ollamaRunning = false;
      rebuildMenu(showWindow);
    }
  }
}

module.exports = { createTray };
