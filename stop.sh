#!/bin/bash
# Kinward — Stop all running processes

echo ""
echo "  Stopping Kinward..."
echo "  ====================================="
echo ""

# Kill the backend server
pkill -f "node server/index.js" 2>/dev/null

# Kill the Vite dev server
pkill -f "vite" 2>/dev/null

echo "  Kinward has been stopped."
echo "  To restart, run ./start.sh"
echo ""
