# First Launch on Mac — One Extra Click

> Kinward isn't yet code-signed by Apple (we're working on it). The first time you open it, macOS will show a warning. Here's the one extra click you need.

---

## What you'll see the first time

After you drag Kinward to your Applications folder and double-click it, macOS pops up a window that says:

> **"Kinward.app cannot be opened because the developer cannot be verified."**
>
> *macOS cannot verify that this app is free from malware.*

That's Apple's Gatekeeper being cautious about any app not signed by a paid Apple Developer account. It's not specific to Kinward — every indie Mac app starts here.

## The fix (10 seconds)

1. Click **Cancel** on that warning (don't click Move to Trash!)
2. Open **System Settings → Privacy & Security**
3. Scroll down to the **Security** section
4. You'll see: *"Kinward was blocked from use because it is not from an identified developer."*
5. Click **Open Anyway**
6. Confirm with your Mac password or Touch ID
7. Kinward opens. You'll never see this warning again.

**Alternative (older macOS, or if you can't find the Settings panel):**
1. Find Kinward.app in your Applications folder
2. **Right-click** (or Control-click) → **Open**
3. Click **Open** on the confirmation dialog
4. Done.

## Why we haven't signed yet

Apple charges $99/year for a Developer ID. We're a free, open-source alpha that just shipped, and we've been pouring every hour into the actual product. The Apple Dev account is on our list for the next few weeks. Once it's set up, this whole page goes away.

## Is it safe?

Kinward is fully open source. Every line of code is at [github.com/kinward-ai/kinward](https://github.com/kinward-ai/kinward) — the same code that built the .dmg you just downloaded. The binary you're opening was built from that source.

If you want to verify the build yourself, you can clone the repo and run `npm run electron:build` to produce an identical .dmg.

## What about Ollama?

When Kinward first launches, it'll check if Ollama is installed. If not, it pops up a friendly dialog with a button that takes you to [ollama.com](https://ollama.com). Install Ollama (it's signed by its team, so no warning there), open it once to grant macOS permissions, then come back to Kinward.

## Still stuck?

Open an issue at [github.com/kinward-ai/kinward/issues](https://github.com/kinward-ai/kinward/issues) or email **hello@kinward.ai**.
