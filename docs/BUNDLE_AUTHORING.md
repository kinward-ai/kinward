# Authoring a Context Bundle

> Monthly cadence. ~15 minutes once you've done it twice.

A context bundle is a signed JSON file published at [`kinward-ai/kinward-context`](https://github.com/kinward-ai/kinward-context). When you publish one, every Kinward user worldwide can opt into it from their **Settings → 🔄 Updates** panel. This doc is the step-by-step.

---

## Prerequisites

- You have `~/.kinward/signing.key` on your machine (the Ed25519 private key).
- You can push to `kinward-ai/kinward-context` on GitHub.
- The `kinward-context` repo is cloned locally — typically at `~/Documents/Projects/kinward-context`.

If your key is missing (new laptop, lost machine), see "Key rotation" at the bottom.

---

## The flow

### 1. Author the unsigned bundle

```bash
cd ~/Documents/Projects/kinward-context
BUNDLE_DATE=$(date -u +%Y-%m-%d)
cp bundles/$(ls bundles | sort | tail -1) bundles/$BUNDLE_DATE.json
```

That copies the most recent bundle as a starting point. Open it in your editor and update:

- `version` → today's date (`YYYY-MM-DD`)
- `released_at` → today's UTC timestamp
- `signature` → blank it out (`""`) — will be filled by the signing step
- `payload.summary` → one-sentence description of what's new
- `payload.world_context.facts` → update any stale facts
- `payload.news_digest` → optional notes for the AI about recent events
- `payload.model_catalog_additions` → usually empty (app-version changes ship those)

Keep the file syntactically valid JSON. The signing tool will refuse to sign malformed input.

### 2. Sign it

```bash
cd ~/Documents/Projects/kinward
npm run bundle:sign -- ~/Documents/Projects/kinward-context/bundles/$BUNDLE_DATE.json
```

Output:

```
  ✓ Bundle signed
    Version:     2026-06-15
    Signed by:   kinward-ai
    Released:    2026-06-15T00:00:00Z
    Signature:   X7Yz3pQrR9abc...
    Output:      /Users/.../kinward-context/bundles/2026-06-15.json
```

The `signature` field is now populated. Your private key never leaves your machine.

### 3. Verify locally before publishing

```bash
npm run bundle:verify -- ~/Documents/Projects/kinward-context/bundles/$BUNDLE_DATE.json
```

You want:

```
  ✓ Signature valid
    Version:    2026-06-15
    Signed by:  kinward-ai
    ...
```

If verification fails here, **do not publish**. The most common cause is editing the file after signing (re-sign instead of edit-and-push).

### 4. Update the manifest

Open `~/Documents/Projects/kinward-context/manifest.json` and prepend an entry to `bundles`:

```json
{
  "version": "2026-06-15",
  "released_at": "2026-06-15T00:00:00Z",
  "path": "bundles/2026-06-15.json",
  "summary": "Same one-sentence summary as in the bundle.",
  "minimum_app_version": "0.1.0"
}
```

`minimum_app_version` defaults to `0.1.0` — bump it only if the bundle uses payload fields the older app doesn't know how to render.

### 5. Commit + push

```bash
cd ~/Documents/Projects/kinward-context
git add bundles/$BUNDLE_DATE.json manifest.json
git commit -m "bundle $BUNDLE_DATE: <short summary>"
git push origin main
```

That's it. Within seconds, every Kinward user who clicks "Check for Updates" sees the new bundle.

### 6. Smoke-test from a real install

In your running Kinward:
1. **Settings → 🔄 Updates → ↻ Check now**
2. The Knowledge Context card should flip to "🆕 New bundle available"
3. **Preview Changes** — diff should look right
4. **Apply Bundle** — fresh-PIN check, then it lands

If the diff is wrong or apply fails, fix it before announcing the release.

---

## Best practices

- **Write the `summary` for a tired parent at 9pm.** "Updated current events for May 2026" is good. "Refreshed payload schema" is not.
- **Don't include opinions or politics in `facts`.** Stick to verifiable, observable reality. "The current president is X" is fine; "X is doing a good job" is not.
- **Keep `news_digest` short.** Five items max, each one a single sentence. The AI uses these as soft anchors, not as homework reading.
- **Test on your local Kinward before pushing.** Apply the bundle locally, then ask Lumina a question about the new context. If she sounds off, it's wrong.

---

## Out-of-band releases

If a major event happens between monthly bundles (election outcome, notable model drop, etc.), publish out of band. The cadence is a guideline, not a contract.

For the release notes, mention in the `summary` field that this is an out-of-band bundle and what triggered it.

---

## Key rotation

If you lose the private key, or suspect it's compromised:

1. Generate a new keypair on the new machine:
   ```bash
   npm run keypair:gen
   ```
2. Update `server/lib/trusted-keys.js` in the main `kinward` repo with the new public key.
3. Cut a new app version release (e.g. `0.2.0`) and ship it via the normal app-update path.
4. Re-sign the latest bundle with the new private key and publish.
5. **Old app installs continue verifying with the old public key** until users upgrade — no immediate disruption, but they won't see new bundles until they upgrade the app.
6. Update `public-key.txt` in `kinward-context` to match.

If the OLD private key was actually compromised (rather than just lost):

- After steps 1–4, also retire the old bundles by deleting them from `kinward-context/bundles/` and removing them from the manifest. They'll still verify on installs with the old public key, but new installs won't have them in the manifest to fetch.

---

## Quick reference

| Task | Command |
|---|---|
| Generate keypair (once) | `npm run keypair:gen` |
| Sign a bundle | `npm run bundle:sign -- path/to/bundle.json` |
| Verify a bundle | `npm run bundle:verify -- path/to/bundle.json` |
| Where the private key lives | `~/.kinward/signing.key` (chmod 600) |
| Where the public key lives | `server/lib/trusted-keys.js` in main repo |
| Where bundles live | `kinward-ai/kinward-context` repo, `bundles/YYYY-MM-DD.json` |
