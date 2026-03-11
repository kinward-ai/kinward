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

// --- Serve frontend (when built) ---
const clientPath = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientPath));
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(clientPath, "index.html"));
  }
});

// --- HTTP + WebSocket server ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  console.log("[ws] Client connected");
  ws.on("close", () => console.log("[ws] Client disconnected"));
});

// Make WSS available to routes (for model pull progress)
app.set("wss", wss);

// --- Start ---
server.listen(PORT, HOST, async () => {
  const ollama = require("./lib/ollama");
  const ollamaUp = await ollama.isOllamaRunning();

  console.log("");
  console.log("  ⚔️  KINWARD v0.1.0");
  console.log("  ─────────────────────────────");
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Network:  http://${getLocalIP()}:${PORT}`);
  console.log(`  Ollama:   ${ollamaUp ? "✓ Running" : "✗ Not detected — start with: ollama serve"}`);
  console.log(`  Database: ${db.isSetupComplete() ? "✓ Setup complete" : "→ Wizard ready"}`);
  console.log("  ─────────────────────────────");
  console.log("");
});

// --- Cleanup ---
process.on("SIGINT", () => {
  console.log("\n[kinward] Shutting down...");
  db.close();
  server.close();
  process.exit(0);
});

// --- Helpers ---
function getLocalIP() {
  const os = require("os");
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "0.0.0.0";
}
