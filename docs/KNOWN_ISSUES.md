# Known Issues — Alpha

> Kinward is in **free alpha**. It's real and we use it daily, but there are rough edges we already know about. This page lists them so you know what to expect (and don't file a duplicate). Hitting something not on this list? Please [open an issue](https://github.com/kinward-ai/kinward/issues) — that's exactly the feedback the alpha is for.

_Last updated: June 2026 · v0.2.1_

---

## Installation & first launch

- **The app isn't code-signed yet**, so your OS will warn you the first time:
  - **macOS** shows *"developer cannot be verified."* → [30-second walkthrough](FIRST_LAUNCH_MAC.md)
  - **Windows** shows a SmartScreen *"Windows protected your PC."* → [30-second walkthrough](FIRST_LAUNCH_WINDOWS.md)
  - This is the single biggest piece of friction in the alpha. Code signing (Apple Developer ID + a Windows certificate) is our next priority — once it's done, both warnings go away.

- **You need Ollama installed and at least one model downloaded.** Kinward runs open models locally via [Ollama](https://ollama.com); it doesn't bundle one. On first launch Kinward checks for Ollama and links you to it if it's missing. The model download is a few GB — plan for that on a slow connection.

- **Chat needs Ollama running.** If Ollama isn't open, you'll see a "Lumina is sleeping" state. Open Ollama and retry — everything else (profiles, memory, settings) works without it.

## Platform support

- **macOS** — universal build (Apple Silicon + Intel), macOS 10.12+.
- **Windows** — 10 / 11, 64-bit.
- **Linux** — no prebuilt installer yet. You can run from source (`npm run electron:dev`).

## Data & privacy

- **Everything stays on your machine.** No accounts, no cloud, no telemetry. Kinward has no servers.
- **The local database isn't encrypted at rest yet.** Your data never leaves your computer, but on-disk it's currently a plain SQLite file. Until we ship at-rest encryption (planned), we recommend turning on your OS's full-disk encryption — **FileVault** (Mac) or **BitLocker** (Windows).
- **LAN pairing is open on your network.** Phone/tablet access over your home Wi-Fi isn't gated yet. Privacy Modes (open / gated / fully private) are in progress.

## Good to know

- **Memory survives model and app updates.** Swapping models or updating Kinward never touches your data directory — "new brain, same memories."
- **Updates are opt-in.** Kinward only checks GitHub when you click the button in Settings → Updates. It never auto-downloads.
- **Coding mode uses Qwen 2.5 Coder**, which has known political-topic biases — we recommend it for coding only and say so in the model catalog.

---

## Reporting a problem

- **Bugs / feature requests:** [github.com/kinward-ai/kinward/issues](https://github.com/kinward-ai/kinward/issues)
- **Anything else:** **hello@kinward.ai**

When reporting, it helps to include your OS + version, what you expected, and what happened. Thank you for testing the alpha. 🛡️
