#!/bin/bash
# Kinward — One-command startup with auto-install
# Usage: ./start.sh

echo ""
echo "  ╔═══════════════════════════════════╗"
echo "  ║     KINWARD — Family AI Setup     ║"
echo "  ╚═══════════════════════════════════╝"
echo ""

# Helper: ask yes/no
ask_yn() {
    while true; do
        read -p "         $1 (y/n): " yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "         Please answer y or n.";;
        esac
    done
}

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
fi

# ──────────────────────────────────────
# STEP 1: Check for Node.js
# ──────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo "  [1/4] Node.js not found."
    echo ""
    echo "         Kinward needs Node.js to run."
    echo ""
    if ask_yn "Install Node.js automatically?"; then
        echo ""
        if [[ "$OS" == "mac" ]]; then
            if command -v brew &> /dev/null; then
                echo "         Installing Node.js via Homebrew..."
                brew install node
            else
                echo "         Installing Homebrew first..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                echo "         Now installing Node.js..."
                brew install node
            fi
        elif [[ "$OS" == "linux" ]]; then
            if command -v apt-get &> /dev/null; then
                echo "         Installing Node.js via apt..."
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                sudo apt-get install -y nodejs
            elif command -v dnf &> /dev/null; then
                echo "         Installing Node.js via dnf..."
                sudo dnf install -y nodejs
            else
                echo "  [!] Could not detect package manager."
                echo "      Please install Node.js from: https://nodejs.org"
                exit 1
            fi
        fi
        # Verify
        if ! command -v node &> /dev/null; then
            echo ""
            echo "  [!] Node.js install may require a new terminal."
            echo "      Close this terminal, reopen, and run ./start.sh again."
            exit 1
        fi
        echo "         Node.js installed!"
        echo ""
    else
        echo ""
        echo "      To install manually, visit: https://nodejs.org"
        echo "      Then run ./start.sh again."
        exit 1
    fi
else
    NODEVER=$(node -v)
    echo "  [1/4] Node.js $NODEVER found"
fi

# ──────────────────────────────────────
# STEP 2: Check for Ollama
# ──────────────────────────────────────
if ! command -v ollama &> /dev/null; then
    echo "  [2/4] Ollama not found."
    echo ""
    echo "         Kinward uses Ollama to run AI models locally."
    echo ""
    if ask_yn "Install Ollama automatically?"; then
        echo ""
        if [[ "$OS" == "mac" ]]; then
            if command -v brew &> /dev/null; then
                echo "         Installing Ollama via Homebrew..."
                brew install ollama
            else
                echo "         Installing via curl..."
                curl -fsSL https://ollama.com/install.sh | sh
            fi
        elif [[ "$OS" == "linux" ]]; then
            echo "         Installing Ollama..."
            curl -fsSL https://ollama.com/install.sh | sh
        fi
        # Verify
        if ! command -v ollama &> /dev/null; then
            echo ""
            echo "  [!] Ollama install may require a new terminal."
            echo "      Close this terminal, reopen, and run ./start.sh again."
            exit 1
        fi
        echo "         Ollama installed!"
        echo ""
    else
        echo ""
        echo "      To install manually, visit: https://ollama.com"
        echo "      Then run ./start.sh again."
        exit 1
    fi
else
    echo "  [2/4] Ollama found"
fi

# ──────────────────────────────────────
# STEP 2b: Make sure Ollama is running
# ──────────────────────────────────────
if ! pgrep -x "ollama" > /dev/null 2>&1; then
    echo "         Starting Ollama..."
    ollama serve > /dev/null 2>&1 &
    sleep 3
else
    echo "         Ollama is running"
fi

# ──────────────────────────────────────
# STEP 3: Install dependencies
# ──────────────────────────────────────
if [ ! -d "node_modules" ]; then
    echo "  [3/4] Installing dependencies (first run, may take a minute)..."
    npm install --loglevel=error 2>/tmp/kinward-npm-err.log
    if [ $? -ne 0 ]; then
        # Check if it's a native build failure
        if grep -qi "node-gyp\|gyp ERR\|make: " /tmp/kinward-npm-err.log 2>/dev/null; then
            echo ""
            echo "  [!] A native module failed to build (better-sqlite3)."
            echo "      This usually means build tools are missing."
            echo ""
            if [[ "$OS" == "mac" ]]; then
                if ask_yn "Install Xcode Command Line Tools?"; then
                    echo ""
                    echo "         Installing Xcode Command Line Tools..."
                    xcode-select --install 2>/dev/null
                    echo ""
                    echo "         Follow the popup to complete installation,"
                    echo "         then run ./start.sh again."
                    exit 1
                else
                    echo "      Install manually: xcode-select --install"
                    exit 1
                fi
            elif [[ "$OS" == "linux" ]]; then
                if ask_yn "Install build tools (build-essential)?"; then
                    echo ""
                    if command -v apt-get &> /dev/null; then
                        echo "         Installing build-essential..."
                        sudo apt-get install -y build-essential python3
                    elif command -v dnf &> /dev/null; then
                        echo "         Installing build tools..."
                        sudo dnf groupinstall -y "Development Tools"
                    fi
                    echo ""
                    echo "         Build tools installed! Retrying npm install..."
                    rm -rf node_modules
                    npm install --loglevel=error
                    if [ $? -ne 0 ]; then
                        echo ""
                        echo "  [!] npm install still failed. Check the errors above."
                        exit 1
                    fi
                else
                    echo "      Install manually: sudo apt-get install build-essential"
                    exit 1
                fi
            fi
        else
            echo ""
            echo "  [!] npm install failed. Check your network connection and try again."
            cat /tmp/kinward-npm-err.log
            exit 1
        fi
    fi
    (cd client && npm install --loglevel=error)
else
    echo "  [3/4] Dependencies ready"
fi

# ──────────────────────────────────────
# STEP 4: Launch Kinward
# ──────────────────────────────────────
echo "  [4/4] Launching Kinward..."
echo ""
echo "  ─────────────────────────────────────"
echo "    Kinward is starting up!"
echo "    The browser will open automatically."
echo "    Press Ctrl+C to stop."
echo "  ─────────────────────────────────────"
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
