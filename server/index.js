const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { WebSocketServer } = require("ws");
const db = require("./lib/db");

const PORT = process.env.PORT || 3210;
const HOST = process.env.HOST || "0.0.0.0"; // LAN accessible

// --- Init ---
db.initSchema();

const app = express();
app.use(cors());
app.use(express.json());

// --- API Routes ---
app.use("/api/system", require("./routes/system"));
app.use("/api/profiles", require("./routes/profiles"));
app.use("/api/models", require("./routes/models"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/memory", require("./routes/memory"));
app.use("/api/board", require("./routes/board"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/audit", require("./routes/audit"));
app.use("/api/updates", require("./routes/updates"));

// Periodic auth cleanup — prune expired sessions and old PIN attempts
const authLib = require("./lib/auth");
authLib.cleanupExpiredSessions();
setInterval(() => authLib.cleanupExpiredSessions(), 60 * 60 * 1000); // hourly

// --- Serve frontend (when built) ---
const clientPath = path.join(__dirname, "..", "client", "dist");

// Service worker must never be cached by the browser — ensures updates propagate
app.get("/sw.js", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.join(clientPath, "sw.js"));
});

// Static assets — short cache with revalidation (Vite hashes built assets anyway)
app.use(express.static(clientPath, { maxAge: "5m", etag: true }));

// SPA fallback — never cache index.html so identity/config changes appear immediately
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(clientPath, "index.html"));
  }
});

// --- HTTP + WebSocket server ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const log = require("./lib/log");

wss.on("connection", (ws) => {
  log.debug("[ws] Client connected");
  ws.on("close", () => log.debug("[ws] Client disconnected"));
});

// Make WSS available to routes (for model pull progress)
app.set("wss", wss);

// --- Start ---
server.listen(PORT, HOST, async () => {
  const ollama = require("./lib/ollama");
  const ollamaUp = await ollama.isOllamaRunning();

  console.log("");
  const identity = db.getAIIdentity();
  const aiName = identity.name || "Lumina";
  console.log(`  🛡️  KINWARD v${require("../package.json").version} — ${aiName} is waking up...`);
  console.log("  ─────────────────────────────");
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Network:  http://${getLocalIP()}:${PORT}`);
  console.log(`  Ollama:   ${ollamaUp ? "✓ Running" : "✗ Not detected — start with: ollama serve"}`);
  console.log(`  Database: ${db.isSetupComplete() ? "✓ Setup complete" : "→ Wizard ready"}`);
  console.log("  ─────────────────────────────");
  console.log("");

  // Auto-backup on startup (keeps last 7, non-blocking)
  if (db.isSetupComplete()) {
    db.backupDatabase();
  }

  // Signal Electron that server is ready (no-op outside Electron)
  if (process.send) process.send({ type: "server-ready", port: PORT });
});

// --- Cleanup ---
process.on("SIGINT", () => {
  console.log("\n[kinward] Shutting down...");
  db.close();
  server.close();
  process.exit(0);
});

// --- Helpers ---
// getLocalIP() now lives in lib/network so it can also power the Mobile Setup
// QR endpoint without code duplication.
const { getLocalIP } = require("./lib/network");
