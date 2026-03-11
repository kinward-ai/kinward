#!/usr/bin/env node

/**
 * Kinward Timed Run
 *
 * Resets the system, starts the server, and opens the browser.
 * Prints a timestamp at start so you can measure real setup time.
 *
 * Usage: npm run test:timed
 */

const { execSync, spawn } = require("child_process");
const path = require("path");

async function timedRun() {
  console.log("");
  console.log("  ⚔️  KINWARD TIMED SETUP TEST");
  console.log("  ════════════════════════════════");
  console.log("");

  // Step 1: Reset
  console.log("  [1/3] Resetting...");
  execSync("node scripts/reset.js", {
    cwd: path.join(__dirname, ".."),
    stdio: "pipe",
  });
  console.log("  ✓ Clean slate\n");

  // Step 2: Start server
  console.log("  [2/3] Starting Kinward server...");
  const server = spawn("node", ["server/index.js"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });

  // Give server a moment to boot
  await new Promise((r) => setTimeout(r, 1500));

  // Step 3: Open browser
  console.log("  [3/3] Opening browser...\n");
  const url = "http://localhost:3210";
  try {
    // Cross-platform open
    const platform = process.platform;
    if (platform === "win32") execSync(`start ${url}`);
    else if (platform === "darwin") execSync(`open ${url}`);
    else execSync(`xdg-open ${url}`);
  } catch {
    console.log(`  → Open manually: ${url}`);
  }

  console.log("  ═══════════════════════════════════════════");
  console.log(`  ⏱  TIMER STARTED: ${new Date().toLocaleTimeString()}`);
  console.log("  Hand the device to your tester NOW.");
  console.log("  Press Ctrl+C when they finish setup.");
  console.log("  ═══════════════════════════════════════════\n");

  const startTime = Date.now();

  process.on("SIGINT", () => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const minutes = Math.floor(elapsed / 60);
    const seconds = (elapsed % 60).toFixed(1);
    console.log(`\n  ⏱  SETUP TIME: ${minutes}m ${seconds}s`);
    console.log("");
    server.kill();
    process.exit(0);
  });
}

timedRun().catch(console.error);
