# First Launch on Windows — One Extra Click

> Kinward isn't yet code-signed (we're working on it). The first time you run the installer, Windows SmartScreen will show a warning. Here's the one extra click you need.

---

## What you'll see the first time

After you download **Kinward.Setup.0.2.1.exe** and double-click it, Windows Defender SmartScreen pops up a blue window that says:

> **"Windows protected your PC"**
>
> *Microsoft Defender SmartScreen prevented an unrecognized app from starting. Running this app might put your PC at risk.*

That's SmartScreen being cautious about any app it hasn't seen signed by a paid certificate yet. It's not specific to Kinward — every new indie Windows app starts here until it builds up reputation (or gets code-signed).

## The fix (10 seconds)

1. On the "Windows protected your PC" dialog, click **More info** (the small link under the message).
2. A **Run anyway** button appears at the bottom — click it.
3. The installer runs and sets Kinward up. You won't see this warning again.

**If your browser also warns on the download** (Edge or Chrome may say *"Kinward.Setup.0.2.1.exe isn't commonly downloaded"*):
1. Click the **⋯** menu next to the download (or the warning).
2. Choose **Keep** / **Keep anyway**.
3. Then run the file as above.

## Why we haven't signed yet

A Windows code-signing certificate (and the Apple Developer ID for the Mac build) costs money and takes time to set up. We're a free, open-source alpha that just shipped, and we've been pouring every hour into the actual product. Signing is on our list for the next few weeks — once it's done, this whole page goes away.

## Is it safe?

Kinward is fully open source. Every line of code is at [github.com/kinward-ai/kinward](https://github.com/kinward-ai/kinward) — the same code that built the installer you just downloaded. The installer was built in the open on a GitHub Actions Windows runner straight from that source (see the **Build Windows Installer** workflow).

If you'd rather build it yourself, you can clone the repo and run `npm run electron:build` on Windows to produce an equivalent installer.

## What about Ollama?

When Kinward first launches, it'll check if Ollama is installed. If not, it pops up a friendly dialog with a button that takes you to [ollama.com](https://ollama.com). Install Ollama (it's signed, so no warning there), open it once, then come back to Kinward.

## Still stuck?

Open an issue at [github.com/kinward-ai/kinward/issues](https://github.com/kinward-ai/kinward/issues) or email **hello@kinward.ai**.
