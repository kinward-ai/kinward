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
  console.log("  🛡️  KINWARD v0.1.0 — Lumina is waking up...");
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

  // Adapter names to skip — VPN tunnels and virtual interfaces
  const SKIP_ADAPTERS = [
    "nordlynx", "wg", "tun", "tap", "tailscale",
    "docker", "veth", "br-", "vmnet", "vboxnet", "virbr", "lo",
  ];

  // IP ranges to skip — known VPN/virtual ranges
  const SKIP_IP_PREFIXES = [
    "10.5.", "10.2.", "100.64.", "172.17.", "172.18.", "169.254.", "127.",
  ];

  const candidates = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    const nameLower = name.toLowerCase();
    if (SKIP_ADAPTERS.some((s) => nameLower.startsWith(s))) continue;

    for (const addr of addrs) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      if (SKIP_IP_PREFIXES.some((p) => addr.address.startsWith(p))) continue;

      // Priority: Ethernet (1) > Wi-Fi (2) > Other (5)
      let priority = 5;
      if (nameLower.startsWith("eth") || nameLower.startsWith("en") || nameLower.includes("ethernet") || nameLower.includes("local area connection")) priority = 1;
      else if (nameLower.startsWith("wl") || nameLower.includes("wi-fi") || nameLower.includes("wifi") || nameLower.includes("wireless")) priority = 2;

      candidates.push({ address: addr.address, priority });
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  if (candidates.length > 0) return candidates[0].address;

  console.warn("[kinward] Could not detect LAN IP — no suitable network interface found.");
  return "0.0.0.0";
}
