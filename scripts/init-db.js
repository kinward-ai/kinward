#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log("  ✓ Created data directory");
}

const db = require("../server/lib/db");
db.initSchema();
console.log("  ✓ Database initialized at:", db.DB_PATH);
db.close();
