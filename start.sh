#!/bin/bash
# Kinward — One-command startup
# Usage: ./start.sh

echo ""
echo "  Starting Kinward..."
echo "  ─────────────────────────────"
echo ""

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null 2>&1; then
    echo "  [1/3] Starting Ollama..."
    ollama serve > /dev/null 2>&1 &
    sleep 3
else
    echo "  [1/3] Ollama already running"
fi

# Install deps if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "  [2/3] Installing dependencies..."
    npm install
    (cd client && npm install)
else
    echo "  [2/3] Dependencies ready"
fi

echo "  [3/3] Launching Kinward..."
echo ""

# Start backend server in background
node server/index.js &
SERVER_PID=$!

# Small pause for server to boot
sleep 2

# Start Vite dev server (opens browser)
cd client && npx vite --open

# When Vite exits (Ctrl+C), also stop the server
kill $SERVER_PID 2>/dev/null
