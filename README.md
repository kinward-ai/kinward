# Kinward

**Your family's AI — running on your hardware, under your control.**

Kinward turns a home computer into a private AI assistant that knows your family. It remembers preferences, reads your documents, and keeps every conversation private — no cloud, no subscriptions, no data leaving your network.

Built for families who want the power of AI without handing their personal lives to a tech company.

## What It Does

- **Multi-profile family access** — each family member gets their own profile with age-appropriate guardrails (kids, teens, adults)
- **Persistent memory** — learns facts from conversations and documents. Tell it your kid's allergies once, it remembers forever.
- **Document Drop** — upload PDFs, text files, and images. Ask questions about them. Key facts are extracted and stored automatically.
- **Image OCR** — snap a photo of a form, receipt, or insurance card. Kinward reads it and remembers the important details.
- **Works on your phone** — progressive web app runs on any device on your home network
- **Dynamic AI identity** — name your AI whatever you want. It introduces itself accordingly.
- **PIN-protected profiles** — simple security so your kids can't access adult conversations
- **Four conversation modes** — General, Kids, Research, Creative — each with tuned behavior

## Quick Start

### Windows

```
start.bat
```

### Mac / Linux

```bash
chmod +x start.sh
./start.sh
```

The start script checks for everything Kinward needs (Node.js, Ollama) and offers to install anything that's missing — no manual setup required. On Windows it uses `winget`, on Mac it uses Homebrew, on Linux it uses your package manager.

> **Node.js version note:** Kinward requires Node.js v20 or v22 (LTS). Bleeding-edge versions (v23+) may fail to compile native modules like better-sqlite3. The start script will warn you if your Node version is unsupported.

Once running, the setup wizard walks you through creating family profiles and installing AI models. Open **http://localhost:5173** if the browser doesn't open automatically.

### Manual setup (advanced)

If you prefer to install prerequisites yourself:

1. **Node.js 20 or 22 LTS** — [nodejs.org](https://nodejs.org) (avoid v23+ — native modules may not compile)
2. **Ollama** — [ollama.com](https://ollama.com)

```bash
ollama serve          # Start Ollama
npm install           # Install server deps
cd client && npm install && cd ..  # Install client deps
npm run dev           # Start backend
cd client && npx vite --open       # Start frontend
```

Other devices on your network can connect too — check the server console for your LAN IP.

### Mobile Access

Open the LAN URL on your phone's browser (e.g., `http://192.168.1.50:5173`). Tap "Add to Home Screen" for an app-like experience. File uploads work via the standard file picker, which gives you camera access on mobile.

## Project Structure

```
kinward/
├── server/
│   ├── index.js                 # Express + WebSocket entry
│   ├── lib/
│   │   ├── db.js                # SQLite schema, helpers, migrations
│   │   ├── ollama.js            # Ollama API adapter, vision model support
│   │   └── log.js               # Configurable debug logging
│   └── routes/
│       ├── system.js            # Health, config, identity endpoints
│       ├── profiles.js          # Family profile CRUD + PIN auth
│       ├── models.js            # Model install/remove
│       ├── chat.js              # Streaming chat, document upload, memory extraction
│       └── memory.js            # Core memory CRUD, export/import
├── client/src/
│   ├── main.jsx                 # App entry with error boundary
│   ├── KinwardApp.jsx           # Router (wizard → chat → settings)
│   ├── KinwardChat.jsx          # Chat orchestrator
│   ├── KinwardSettings.jsx      # Admin settings panel
│   ├── KinwardWizard.jsx        # First-time setup wizard
│   └── components/
│       ├── shared.jsx           # API helper, brand tokens, icons
│       ├── ChatArea.jsx         # Messages, input, file upload
│       ├── Sidebar.jsx          # Session list, profile chip
│       ├── ProfileGate.jsx      # Login screen
│       ├── PinModal.jsx         # PIN create/verify flow
│       ├── PinKeypad.jsx        # Numeric keypad component
│       ├── CategoryPicker.jsx   # Conversation mode selector
│       └── ErrorBoundary.jsx    # Crash recovery screen
├── data/
│   ├── kinward.db               # SQLite database (auto-created)
│   └── uploads/                 # Temp upload storage
├── scripts/
│   ├── init-db.js               # First-time DB init
│   ├── reset.js                 # Wipe DB for fresh test
│   └── timed-run.js             # Timed test runner
├── start.bat                    # One-click Windows launcher
├── start.sh                     # One-click Mac/Linux launcher
└── package.json
```

## Configuration

### Debug Logging

By default, Kinward runs quietly. To see detailed request-level logging:

```bash
DEBUG=true npm run dev
```

### Environment Modes

| Mode | Description |
|------|-------------|
| **Open** | Full internet, marketplace, updates |
| **Secured** | Internet limited to allowlist |
| **Lockdown** | Zero internet, everything sideloaded |

### Guardrail Levels

| Level | For | Behavior |
|-------|-----|----------|
| **Strict** | Children (5-12) | Age-appropriate only, redirects unsafe topics |
| **Moderate** | Teens (13-17) | More access, still filtered |
| **Open** | Adults | Full model capability |

## Testing

```bash
# Quick reset (keep models, wipe profiles/config)
npm run reset

# Full reset (also delete all Ollama models)
npm run reset:hard

# Timed test (reset → start → open browser → stopwatch)
npm run test:timed
```

**Target:** Under 5 minutes for a family of four (with models pre-downloaded).

## Hardware Notes

Kinward runs on anything that can run Ollama. A basic setup:

- **Minimum:** Any modern CPU, 8GB RAM — runs 3B models slowly but works
- **Recommended:** 16GB RAM + any GPU with 6GB+ VRAM — runs 8B models smoothly
- **Ideal:** 32GB RAM + GPU with 12GB+ VRAM — runs 70B models, fast inference

### AMD GPU (RDNA 4 / RX 9070 XT)

Install the HIP SDK from AMD (deselect the bundled display driver). Ollama auto-detects the GPU after HIP is in place. Verify with `ollama run llama3.1:8b "hello"` and check GPU usage in Task Manager.

## API Reference

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/status` | Health check, setup state |
| GET | `/api/system/hardware` | Hardware detection |
| GET | `/api/system/identity` | Get AI name/tagline |
| PUT | `/api/system/identity` | Update AI identity |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profiles` | List all profiles |
| POST | `/api/profiles` | Create profile |
| POST | `/api/profiles/setup-batch` | Bulk create (wizard) |
| POST | `/api/profiles/:id/auth` | PIN authentication |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/sessions` | List sessions |
| POST | `/api/chat/sessions` | Create session |
| POST | `/api/chat/message` | Send message (SSE stream) |
| POST | `/api/chat/upload` | Upload document/image |
| GET | `/api/chat/documents/:id` | List session documents |

### Memory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memory/:profileId` | Get memories |
| POST | `/api/memory/:profileId` | Add/update memory |
| DELETE | `/api/memory/:profileId/:id` | Delete memory |
| GET | `/api/memory/:profileId/export` | Export backup |
| POST | `/api/memory/:profileId/import` | Import backup |

---

*Built with Express, better-sqlite3, Ollama, and React. No cloud required. Your data never leaves your home.*
