# First Launch on Mac — Getting Past the Warning

> Kinward isn't yet code-signed by Apple (we're working on it). The first time you open it, macOS will block it with a warning. Here's how to open it anyway — takes about 30 seconds.

---

## ⚠️ First, the one mistake to avoid

The warning's highlighted blue button is **"Move to Trash"** — and on newer macOS that's the *default*, so tapping Return deletes Kinward. **Don't click it.** Click **"Done"** (or "Cancel" on older macOS) and follow the steps below.

## What you'll see the first time

After you drag Kinward to your Applications folder and double-click it, macOS pops up a warning. Depending on your macOS version it says either:

> **""Kinward" Not Opened** — Apple could not verify "Kinward" is free of malware that may harm your Mac or compromise your privacy."  *(macOS 15 Sequoia and later)*

or

> **"Kinward.app cannot be opened because the developer cannot be verified."**  *(macOS 14 and earlier)*

That's Apple's Gatekeeper being cautious about any app not signed by a paid Apple Developer account. It's not specific to Kinward — every indie Mac app starts here.

## The fix (works on every macOS version)

1. On the warning, click **Done** (older macOS: **Cancel**). **Not** "Move to Trash."
2. Open the **Apple menu () → System Settings → Privacy & Security**.
3. Scroll down to the **Security** section.
4. You'll see a line like: *""Kinward" was blocked to protect your Mac"* (or *"…blocked from use because it is not from an identified developer"*), with an **Open Anyway** button next to it. Click it.
5. Confirm with Touch ID or your Mac password.
6. One more dialog appears — click **Open Anyway** (or **Open**) to confirm.
7. Kinward launches. You'll never see this warning again.

> The **Open Anyway** button only appears *after* you've tried to open Kinward at least once (step 1). If you don't see it, double-click Kinward once more, click Done, and go back to Privacy & Security.

**Older macOS only (14 Sonoma and earlier):** you can also right-click (or Control-click) Kinward in Applications → **Open** → **Open**. ⚠️ This shortcut was **removed in macOS 15 Sequoia** — on Sequoia you must use the System Settings steps above.

## Why we haven't signed yet

Apple charges $99/year for a Developer ID. We're a free, open-source alpha that just shipped, and we've been pouring every hour into the actual product. The Apple Dev account is on our list for the next few weeks. Once it's set up, this whole page goes away.

## Is it safe?

Kinward is fully open source. Every line of code is at [github.com/kinward-ai/kinward](https://github.com/kinward-ai/kinward) — the same code that built the .dmg you just downloaded. The binary you're opening was built from that source.

If you want to verify the build yourself, you can clone the repo and run `npm run electron:build` to produce an identical .dmg.

## What about Ollama?

When Kinward first launches, it'll check if Ollama is installed. If not, it pops up a friendly dialog with a button that takes you to [ollama.com](https://ollama.com). Install Ollama (it's signed by its team, so no warning there), open it once to grant macOS permissions, then come back to Kinward.

## Still stuck?

Open an issue at [github.com/kinward-ai/kinward/issues](https://github.com/kinward-ai/kinward/issues) or email **hello@kinward.ai**.
