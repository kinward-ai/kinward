# Kinward — Install Guide

**This guide gets you from zero to a fully running family AI in about 10 minutes.** No technical experience required — just follow the steps in order.

---

## What You'll Need

- A Mac or Windows PC (8 GB RAM minimum, 16 GB+ recommended)
- An internet connection for the initial setup
- About 5–15 GB of free disk space (for AI models)

Everything after setup runs 100% offline on your home network.

---

## Step 1 — Install Ollama

Ollama is the engine that runs AI models locally on your machine. Kinward needs it running in the background.

### Mac

1. Go to **[ollama.com](https://ollama.com)** and click **Download for Mac**
2. Open the downloaded `.dmg` file and drag Ollama to your Applications folder
3. Open Ollama from Applications — you'll see a llama 🦙 icon appear in your menu bar

```
Menu bar:  🦙  ←  this means Ollama is running
```

That's it. Ollama runs silently in the background.

### Windows

1. Go to **[ollama.com](https://ollama.com)** and click **Download for Windows**
2. Run the installer — it sets everything up automatically
3. Ollama appears in your system tray (bottom-right of your taskbar)

```
System tray:  🦙  ←  this means Ollama is running
```

> **Note:** Ollama needs to be running whenever you use Kinward. It starts automatically on login by default.

---

## Step 2 — Get Kinward

### Option A — Git (recommended for developers)

```bash
git clone https://github.com/kinward-ai/kinward.git
cd kinward
npm install
```

> **Need Node.js?** Download it from [nodejs.org](https://nodejs.org) — choose the **LTS** version (v20 or v22). Avoid v23+ as it may cause compatibility issues.

### Option B — Download ZIP

1. Click the green **Code** button on this page → **Download ZIP**
2. Unzip it somewhere permanent (e.g., your Documents folder)
3. Open Terminal (Mac) or Command Prompt (Windows) and navigate to the folder:

```bash
# Mac example:
cd ~/Documents/kinward-main

# Windows example:
cd C:\Users\YourName\Documents\kinward-main
```

4. Install dependencies:

```bash
npm install
```

---

## Step 3 — Launch Kinward

```bash
npm run electron:dev
```

The Kinward window will open. You'll also see a **shield icon** in your system tray / menu bar — that's Kinward running.

```
                    ┌─────────────────────────────────┐
                    │                                 │
                    │    🛡  KINWARD                  │
                    │    Your Family's AI Guardian    │
                    │                                 │
                    │    Setting up your home...      │
                    │                                 │
                    └─────────────────────────────────┘
```

> **First launch only:** The app checks for native module compatibility and may take 30–60 seconds before the window appears. This is normal.

---

## Step 4 — The Setup Wizard

The wizard runs automatically on first launch. Here's what each step looks like:

### Step 1 of 4 — Name Your AI

Give your family AI a name and a tagline. This is how it introduces itself to your family.

```
  What should we call your family AI?

  Name:     [ Lumina                    ]
  Tagline:  [ Your family's AI guardian ]

  This is how your AI introduces itself. You can change it anytime in Settings.
```

### Step 2 of 4 — Your Family

Choose a preset that matches your household, then customize names and ages.

```
  Who's in your household?

  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  👤  Just Me │  │  💑  Couple  │  │ 👨‍👩‍👧‍👦 Family  │  │ 👨‍👩‍👧‍👦👶 Family │
  │              │  │              │  │    of 4      │  │    of 6      │
  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘

  Family members:
  ┌────────────────────────────────────────────────────┐
  │  Jamie (Admin)   ·  Taylor (Co-Admin)               │
  │  Emma (Teen)     ·  Jake (Child)                   │
  └────────────────────────────────────────────────────┘

  Tap any name to edit it.
```

**Profile roles:**
- **Admin** — full access to settings, memory, and all profiles
- **Co-Admin** — same as admin, for a second parent or partner
- **Teen** — access to most features, some filters applied
- **Child** — age-appropriate responses only, strict guardrails

### Step 3 of 4 — Choose Your First AI Model

Kinward detects your hardware and recommends the best model for your machine.

```
  Your machine: Mac with 32 GB memory — Excellent 💪

  ┌─────────────────────────────────────────────────────────────────┐
  │  ✨ Recommended                                                  │
  │                                                                 │
  │  Gemma 4 9B                        5.5 GB    [Install]          │
  │  Google DeepMind's latest — fast everyday AI                    │
  │                                                                 │
  │  Mistral Small 24B                 14 GB     [Install]          │
  │  Powerful reasoning — rivals models 3× its size                 │
  └─────────────────────────────────────────────────────────────────┘

  You can install more models anytime in Settings → AI Models.
```

Click **Install** next to your chosen model. A progress bar shows the download:

```
  Downloading Gemma 4 9B...

  ████████████████░░░░░░░░  68%   12.4 MB/s   45s left
```

### Step 4 of 4 — You're Ready

```
  ✓  AI identity: Lumina
  ✓  4 family profiles created
  ✓  Gemma 4 9B installed

                    [ Meet Lumina → ]
```

---

## Step 5 — Using Kinward

### Logging In

When Kinward opens, you'll see the profile selection screen. Tap your name to log in.

- Profiles without a PIN log straight in
- PIN-protected profiles show a keypad — enter your 4-digit PIN

### Switching Modes

In the top-right of the chat, you can switch between:

| Mode | Best for |
|------|----------|
| 💬 General | Everyday questions and conversation |
| 🌟 Kids | Age-appropriate help for younger members |
| 🔍 Research | Deep dives, school projects, analysis |
| ✨ Creative | Writing, brainstorming, storytelling |

### Uploading Documents

Click the **📎 paperclip** icon to upload:
- **PDF files** — reports, articles, manuals
- **Images** — receipts, forms, photos of documents
- **Text files** — notes, lists, anything plain text

Kinward reads them and can answer questions about the content. Key facts are automatically saved to that profile's memory.

### Mobile Access

Any device on your home Wi-Fi can use Kinward. Look for the network address in the app (shown in Settings → About) and open it in your phone's browser. Tap **Add to Home Screen** to pin it like an app.

---

## Managing AI Models

Go to **Settings → 📦 AI Models** to browse, install, and remove models at any time.

```
  AI Models                    🖥  Mac with 32 GB — Excellent

  [ All Models ] [ General ] [ Kids ] [ Research ] [ Creative ]  ↻

  Recommended ─────────────────────────────────────────────────

  ┌──────────────────────┐  ┌──────────────────────┐
  │ High-end  NEW  5.5GB │  │ High-end  NEW  17 GB │
  │                      │  │                      │
  │  Gemma 4 9B          │  │  Gemma 4 27B         │
  │  Google's latest...  │  │  State-of-the-art... │
  │                      │  │                      │
  │  general  google     │  │  reasoning  google   │
  │                      │  │                      │
  │  [    Install    ]   │  │  [    Install    ]   │
  └──────────────────────┘  └──────────────────────┘

  ┌──────────────────────┐
  │ High-end     14 GB   │
  │  ✓ Installed         │
  │                      │
  │  Mistral Small 24B   │
  │  Powerful reasoning  │
  │                      │
  │  general  reasoning  │
  │                      │
  │  [     Remove    ]   │
  └──────────────────────┘
```

**Grayed-out models** need more RAM than your machine has — they're shown so you know what's possible, but the Install button is disabled.

---

## Frequently Asked Questions

### Setup & Installation

**Q: Do I need an internet connection to use Kinward?**
Only for the initial setup (installing Ollama, cloning/downloading Kinward, and downloading AI models for the first time). Once everything is installed, Kinward runs 100% offline on your local network.

**Q: How much disk space do I need?**
The Kinward app itself is small (~50 MB). The space requirement is for AI models:
- A small model like Phi-4 Mini = ~2.5 GB
- A mid-range model like Gemma 4 9B = ~5.5 GB
- A large model like Mistral Small 24B = ~14 GB

You only need one model to start. You can add more later.

**Q: Can I run Kinward without Ollama open?**
No — Ollama needs to be running for the AI to work. Kinward will show a "Lumina is sleeping" banner if Ollama isn't detected, and will keep checking automatically. Starting Ollama clears the banner within a few seconds.

**Q: The first launch is taking a long time — is something wrong?**
Probably not. The first launch compiles native database modules for Electron's version of Node.js. This takes 30–90 seconds and only happens once. Subsequent launches are fast.

**Q: npm install failed. What do I do?**
Make sure you have Node.js 20 or 22 LTS installed. Check with `node --version`. Node 23+ is not currently supported. Download LTS from [nodejs.org](https://nodejs.org).

---

### Models

**Q: Which model should I start with?**
The wizard recommends one based on your hardware — that's a safe starting point. As a general rule:
- **8–12 GB RAM:** Start with Llama 3.1 8B or Phi-4 Mini
- **16 GB RAM:** Try Gemma 4 9B — it's fast and excellent quality
- **24 GB+ RAM:** Gemma 4 27B or Mistral Small 24B give the best results

**Q: Can I have multiple models installed?**
Yes. You can install as many models as your disk space allows. Switch between them in Settings → AI Models.

**Q: How do I get new models as they're released?**
Run `git pull` in the Kinward folder to update. The model catalog is updated with each release — new models like Gemma 4 appear in Settings → AI Models automatically after pulling.

**Q: A model download failed halfway. Now what?**
Go to Settings → AI Models and click Install again. Ollama resumes partial downloads automatically.

---

### Privacy & Data

**Q: Does Kinward send anything to the internet?**
No. After setup, Kinward makes no outbound connections. All AI inference runs locally via Ollama. Your conversations, memories, and documents never leave your machine.

**Q: Where is my family's data stored?**
- **Mac:** `~/Library/Application Support/kinward/data/kinward.db`
- **Windows:** `%APPDATA%\kinward\data\kinward.db`

The database is a standard SQLite file. You can back it up by copying it.

**Q: Can I back up my family's memories and settings?**
Yes. In Settings → Lumina's Memory, each profile has an **Export** button that saves a JSON backup of all memories for that profile.

**Q: How do I reset everything and start fresh?**
```bash
npm run reset
```
This wipes profiles, conversations, and memories but keeps your installed AI models.

---

### Multiple Devices

**Q: Can my family use Kinward from their phones?**
Yes. Open a browser on any device connected to your home Wi-Fi and navigate to Kinward's LAN address (shown in Settings → About, or in the server console). Tap Add to Home Screen for an app icon.

**Q: Can two people use Kinward at the same time?**
Yes — multiple devices can be connected and chatting simultaneously.

**Q: Can I access Kinward outside my home network?**
Not without additional setup (VPN or port forwarding). This is intentional — Kinward is designed to stay on your private network. A VPN into your home network is the recommended approach if you want remote access.

---

### Troubleshooting

**Q: "Lumina is sleeping" — Ollama isn't being detected**
1. Make sure Ollama is open (look for the 🦙 icon in your menu bar / system tray)
2. If the icon is there but the banner persists, try clicking Retry in the banner
3. If it still doesn't work, restart Ollama from its menu

**Q: The app window is blank / shows an error**
1. Wait 10–15 seconds — the server may still be starting up
2. Click the 🛡 Kinward icon in your system tray → Restart
3. If the problem persists, check the terminal window for error messages

**Q: Port 3210 is already in use**
Kinward runs on port 3210. If something else is using that port, Kinward will try to free it automatically. If you keep seeing this error:
```bash
# Mac/Linux — find and kill whatever is on port 3210:
lsof -ti:3210 | xargs kill -9
```

**Q: "Cannot find module better-sqlite3"**
This means the database module needs to be rebuilt for Electron. Run:
```bash
npm run electron:rebuild
```
Then launch Kinward again.

---

## Updating Kinward

```bash
git pull
npm install
npm run electron:dev
```

That's it. New models, bug fixes, and features appear automatically after pulling.

---

## Getting Help

- **GitHub Issues:** [github.com/kinward-ai/kinward/issues](https://github.com/kinward-ai/kinward/issues)
- **Discussions:** [github.com/kinward-ai/kinward/discussions](https://github.com/kinward-ai/kinward/discussions)

---

*Kinward is open source and built for families who believe their data belongs to them.*
