# Kinward

**Your family's private AI — running on your hardware, under your control.**

Kinward turns a home computer into a private AI assistant that knows your family. It remembers preferences, reads your documents, and keeps every conversation completely private — no cloud, no subscriptions, no data leaving your network.

> 🛡️ **Everything stays home.** Your conversations, your family's data, your memories — all stored locally on your machine. Kinward has no servers, no accounts, and no telemetry.

---

## What's New — April 2026

- **Electron desktop app** — launches from your dock or system tray. No terminal, no setup commands.
- **In-app model manager** — browse, install, and remove AI models without ever touching a command line
- **Gemma 4 support** — Google DeepMind's latest (9B and 27B) are in the catalog, ready to install
- **Family preset templates** — one-click household setup (Just Me, Couple, Family of 4, and more)
- **Mistral Small 24B** — recommended for machines with 24GB+ RAM

---

## What It Does

| Feature | Description |
|---------|-------------|
| 👨‍👩‍👧‍👦 **Multi-profile family access** | Each family member gets their own profile — kids, teens, and adults each with age-appropriate guardrails |
| 🧠 **Persistent memory** | Learns facts from conversations and documents. Tell it your kid's allergies once; it remembers forever |
| 📄 **Document Drop** | Upload PDFs, images, and text files. Ask questions. Key facts are extracted and stored automatically |
| 📷 **Image OCR** | Snap a photo of a receipt, form, or insurance card — Kinward reads it and remembers the details |
| 📱 **Works on your phone** | Progressive web app — any device on your home network can connect |
| ✏️ **Custom AI identity** | Name your AI whatever you want. It introduces itself accordingly |
| 🔒 **PIN-protected profiles** | Simple security so kids can't access adult conversations |
| 💬 **Four conversation modes** | General, Kids, Research, Creative — each tuned for its purpose |

---

## Quick Start

### 1. Install Ollama

Kinward uses [Ollama](https://ollama.com) to run AI models locally. Download and install it first:

- **Mac:** [Download Ollama for Mac](https://ollama.com/download/mac)
- **Windows:** [Download Ollama for Windows](https://ollama.com/download/windows)

After installing, open Ollama — it runs quietly in your menu bar / system tray.

### 2. Run Kinward

```bash
git clone https://github.com/kinward-ai/kinward.git
cd kinward
npm install
npm run electron:dev
```

Kinward opens as a desktop app and appears in your system tray. The setup wizard walks you through everything from here — no more commands needed.

> **First launch:** Kinward will download Node dependencies (one time only, takes ~1 minute). The wizard then guides you through creating family profiles and installing your first AI model.

### 3. Mobile Access

Once Kinward is running, other devices on your home network can connect too. Check the app for your LAN address (e.g., `http://192.168.1.50:3210`) and open it on any phone or tablet. Tap **Add to Home Screen** for an app-like experience.

---

## AI Models

Kinward includes a built-in model browser (**Settings → 📦 AI Models**). Browse the full catalog, see what's compatible with your hardware, and install with one click — no terminal required.

### Supported Models

| Model | Size | Best For | Min RAM |
|-------|------|----------|---------|
| **Gemma 4 9B** ✨ NEW | 5.5 GB | Everyday family use | 16 GB |
| **Gemma 4 27B** ✨ NEW | 17 GB | Deep reasoning, best quality | 24 GB |
| **Mistral Small 24B** | 14 GB | Powerful all-rounder | 24 GB |
| **Llama 3.1 8B** | 4.7 GB | Fast, works on any machine | 8 GB |
| **DeepSeek R1 8B** | 4.9 GB | Math, logic, step-by-step problems | 8 GB |
| **Phi-4 Mini** ✨ NEW | 2.5 GB | Kids profiles, fast responses | 8 GB |
| **Mistral Nemo 12B** | 7.1 GB | Research and school projects | 16 GB |

Kinward detects your hardware and highlights which models will run well on your machine. Underpowered models are shown but grayed out so you always know what you're working with.

### Staying Current

The model catalog is updated with each Kinward release. When notable open-weight models drop (like Gemma 4 this week), they're vetted and added — `git pull` and your model browser is up to date.

---

## Hardware

Kinward runs on any machine that can run Ollama.

| Tier | RAM | What runs well |
|------|-----|----------------|
| **Basic** | 8 GB | Llama 3.1 8B, Phi-4 Mini, DeepSeek R1 8B |
| **Good** | 16 GB | + Gemma 4 9B, Mistral Nemo 12B, Qwen 2.5 14B |
| **Excellent** | 24 GB+ | + Gemma 4 27B, Mistral Small 24B, Command R 35B |

> **Apple Silicon:** Unified memory means GPU and CPU share the same pool. A Mac Mini with 24GB handles 14B models with ease. Kinward auto-detects your tier and recommends accordingly.

> **AMD GPU (RDNA 4 / RX 9070 XT):** Install the HIP SDK from AMD (deselect the bundled display driver). Ollama auto-detects the GPU after HIP is installed.

---

## Project Structure

```
kinward/
├── electron/
│   ├── main.js                  # Electron entry — tray, window, server lifecycle
│   ├── tray.js                  # System tray menu and Ollama status polling
│   ├── ollama-manager.js        # Ollama process detection and launch
│   ├── preload.js               # Context bridge (renderer ↔ main)
│   └── icons/                   # App and tray icons (Mac + Windows)
├── server/
│   ├── index.js                 # Express + WebSocket entry
│   ├── lib/
│   │   ├── db.js                # SQLite schema, helpers, migrations
│   │   ├── ollama.js            # Ollama API adapter, hardware detection
│   │   ├── model-catalog.js     # Curated model catalog (add new models here)
│   │   └── log.js               # Configurable debug logging
│   └── routes/
│       ├── system.js            # Health, config, identity, Ollama status
│       ├── profiles.js          # Family profile CRUD + PIN auth
│       ├── models.js            # Model catalog, install, remove
│       ├── chat.js              # Streaming chat, document upload, memory
│       └── memory.js            # Memory CRUD, export/import
├── client/src/
│   ├── KinwardApp.jsx           # Router (wizard → chat → settings)
│   ├── KinwardChat.jsx          # Chat orchestrator
│   ├── KinwardSettings.jsx      # Admin settings panel
│   ├── KinwardWizard.jsx        # First-time setup wizard
│   └── components/
│       ├── shared.jsx           # API helper, brand tokens, icons
│       ├── ModelManager.jsx     # In-app model browser and installer
│       ├── OllamaStatus.jsx     # Live Ollama health banner
│       ├── ChatArea.jsx         # Messages, input, file upload
│       ├── Sidebar.jsx          # Session list, profile chip
│       ├── ProfileGate.jsx      # Login screen
│       ├── PinModal.jsx         # PIN create/verify flow
│       ├── CategoryPicker.jsx   # Conversation mode selector
│       └── ErrorBoundary.jsx    # Crash recovery screen
├── scripts/
│   ├── electron-rebuild.js      # Native module rebuild for Electron ABI
│   ├── init-db.js               # First-time DB init
│   └── reset.js                 # Wipe DB for fresh test
├── INSTALL.md                   # Step-by-step setup guide with FAQ
├── ROADMAP.md                   # Phase-by-phase build plan
└── package.json
```

---

## Development Scripts

```bash
# Start the Electron desktop app (recommended)
npm run electron:dev

# Start just the backend API server on :3210
npm run dev

# Build the React client
npm run client:build

# Rebuild native modules for Electron's Node ABI
npm run electron:rebuild

# Reset the database (keeps models, wipes profiles and config)
npm run reset
```

### Debug Logging

```bash
DEBUG=true npm run dev
```

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full phase-by-phase plan.

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | On-Ramp — Electron app, install wizard, model manager | ✅ Complete |
| **Phase 2** | Daily Driver — smarter memory, world context, notifications | 🔜 Next |
| **Phase 3** | Superpowers — automation, calendar, home integrations | Planned |
| **Phase 4** | Scale — packaged installer, family sharing, auto-updates | Planned |

---

## API Reference

<details>
<summary>Click to expand</summary>

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/status` | Health check, setup state |
| GET | `/api/system/hardware` | Hardware detection and tier |
| GET | `/api/system/identity` | Get AI name / tagline |
| PUT | `/api/system/identity` | Update AI identity |
| GET | `/api/system/ollama-status` | Ollama state (ready / offline / no-models) |

### Models
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List installed models |
| GET | `/api/models/catalog` | Full curated catalog with hardware suitability |
| GET | `/api/models/recommend` | Smart recommendation for this family + hardware |
| POST | `/api/models/install` | Pull a model (streams progress via WebSocket) |
| DELETE | `/api/models/:id` | Remove a model |

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
| POST | `/api/chat/upload` | Upload document / image |

### Memory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memory/:profileId` | Get memories |
| POST | `/api/memory/:profileId` | Add / update memory |
| DELETE | `/api/memory/:profileId/:id` | Delete memory |
| GET | `/api/memory/:profileId/export` | Export backup |
| POST | `/api/memory/:profileId/import` | Import backup |

</details>

---

*Built with Electron, Express, SQLite, Ollama, and React. No cloud required. Your data never leaves your home.*
