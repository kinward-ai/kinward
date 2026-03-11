# ⚔️ Kinward

**Your Family's AI Guardian** — a privacy-first, family-governed AI platform that turns your hardware into a household AI node.

## Quick Start

### Prerequisites

1. **Node.js 20+** — [nodejs.org](https://nodejs.org)
2. **Ollama** — [ollama.com](https://ollama.com)
   ```bash
   # After installing, make sure it's running:
   ollama serve
   ```

### Install & Run

```bash
# Clone / copy this directory, then:
npm run setup     # install deps + init database
npm run dev       # start Kinward on port 3210
```

Open **http://localhost:3210** — the setup wizard will launch automatically.

Other devices on your network can connect too (check the console for your LAN IP).

### AMD GPU Note (RX 9070 XT)

Your RDNA 4 card needs the HIP SDK for GPU acceleration:
- Install **HIP SDK** from AMD (deselect the bundled display driver!)
- Ollama should auto-detect the GPU after HIP is in place
- Verify with: `ollama run llama3.1:8b "hello"` — check GPU usage in Task Manager

## Project Structure

```
kinward/
├── server/
│   ├── index.js              # Express + WebSocket entry point
│   ├── lib/
│   │   ├── db.js             # SQLite schema, helpers, config store
│   │   └── ollama.js         # Ollama API adapter, hardware detection, recommendations
│   └── routes/
│       ├── system.js          # Health, hardware, config endpoints
│       ├── profiles.js        # Family profile CRUD, auth, batch setup
│       ├── models.js          # Model install/remove, recommendations
│       └── chat.js            # Streaming chat with guardrail enforcement
├── client/
│   └── src/                   # React frontend (wizard + dashboard)
├── scripts/
│   ├── init-db.js             # First-time DB setup
│   ├── reset.js               # Wipe DB for fresh test cycle
│   └── timed-run.js           # Reset → start → open browser → stopwatch
├── data/
│   └── kinward.db             # SQLite database (gitignored)
└── package.json
```

## Testing the Assembly Line

The whole point is to time the setup flow repeatedly:

```bash
# Quick reset (keep models, wipe profiles/config)
npm run reset

# Full reset (also delete all Ollama models)
npm run reset:hard

# Timed test (reset → start → open browser → stopwatch)
npm run test:timed
```

The `test:timed` command resets everything, starts the server, opens the browser, and starts a stopwatch. Hand the device to someone. Press `Ctrl+C` when they finish. It prints the elapsed time.

**Target: under 5 minutes** for a family of four (with models pre-downloaded).
**Target: under 10 minutes** including first model download on broadband.

## API Endpoints

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/status` | Health check, setup state, Ollama status |
| GET | `/api/system/hardware` | Auto-detect hardware capabilities |
| POST | `/api/system/config` | Save a config key/value |
| POST | `/api/system/setup-complete` | Mark wizard as finished |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profiles` | List all family profiles |
| POST | `/api/profiles` | Create a single profile |
| POST | `/api/profiles/setup-batch` | Bulk create admin + family (wizard) |
| POST | `/api/profiles/:id/auth` | Authenticate with PIN |
| DELETE | `/api/profiles/:id` | Remove a profile |

### Models
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List installed models |
| GET | `/api/models/recommend` | Smart recommendation from family makeup |
| POST | `/api/models/install` | Pull model from Ollama (progress via WebSocket) |
| DELETE | `/api/models/:id` | Remove a model |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/sessions` | List sessions for a profile |
| POST | `/api/chat/sessions` | Create new chat session |
| POST | `/api/chat/message` | Send message, stream response (SSE) |

### WebSocket

Connect to `ws://localhost:3210/ws` for real-time events:
- `model:progress` — download progress during model pull
- `model:complete` — model finished installing

## Environment Modes

| Mode | Description |
|------|-------------|
| **Open** | Full internet, marketplace, updates |
| **Secured** | Internet limited to allowlist |
| **Lockdown** | Zero internet, everything sideloaded |

## Guardrail Levels

| Level | For | Behavior |
|-------|-----|----------|
| **Strict** | Children (5–12) | Age-appropriate only, redirects unsafe topics |
| **Moderate** | Teens (13–17) | More access, still filtered |
| **Open** | Adults | Full model capability |

---

*Built with Express, SQLite, Ollama, and React. No cloud required.*
