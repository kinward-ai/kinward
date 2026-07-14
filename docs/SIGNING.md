# Code Signing — setup checklist (maintainer)

Kinward's installers are currently **unsigned**, so users hit Gatekeeper (macOS)
and SmartScreen (Windows) on first launch. Signing removes that friction. This is
the one thing the maintainer has to do by hand — it needs accounts, payment, and
certificates that only the account owner can create. Once the secrets below exist
in the repo, the CI flips to signed builds with a small config change.

**Status:** not started. Builds pass `CSC_IDENTITY_AUTO_DISCOVERY=false` so they
stay cleanly unsigned until this is done.

---

## macOS — Developer ID + notarization

**What it costs:** Apple Developer Program, $99/year.

**You do (once):**
1. Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/) (individual is fine).
2. In Xcode or the developer portal, create a **"Developer ID Application"** certificate. Export it from Keychain as a **`.p12`** with a password.
3. Create an **app-specific password** at [appleid.apple.com](https://appleid.apple.com) (for notarization), or an App Store Connect API key.
4. Note your **Team ID** (developer portal → Membership).

**Add these GitHub repo secrets** (`kinward-ai/kinward` → Settings → Secrets → Actions):
- `CSC_LINK` — the `.p12`, base64-encoded (`base64 -i cert.p12 | pbcopy`)
- `CSC_KEY_PASSWORD` — the `.p12` password
- `APPLE_ID` — your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD` — the app-specific password
- `APPLE_TEAM_ID` — your Team ID

**Then I wire (small, testable change):** set `mac.hardenedRuntime: true` + an
entitlements file + `notarize: true` in `package.json` build config, pass the
secrets as env in `build-mac.yml`, and drop `CSC_IDENTITY_AUTO_DISCOVERY=false`.
electron-builder signs + notarizes automatically when those env vars are present.

## Windows — code-signing certificate

**Heads-up:** since 2023, Windows OV/EV certs require the private key on hardware
(USB token) or a cloud HSM — you can't just drop a `.pfx` in CI anymore. The
modern, CI-friendly path is **[Azure Trusted Signing](https://learn.microsoft.com/azure/trusted-signing/)**
(~$10/month, cloud-based, no token) once your org/identity is validated. Plain
`.pfx` still works only for older/self-signed certs (which don't clear SmartScreen).

**You do (once):** set up Azure Trusted Signing (or buy an OV cert + token from
DigiCert/Sectigo), get it validated.

**Then I wire:** electron-builder's `azureSignOptions` (or `win.certificateFile`
for a token-based setup) in the build config, plus the Azure credentials as repo
secrets.

**Note:** Windows SmartScreen reputation also builds over time/downloads even
before signing — signing mainly shortcuts that.

---

## Order of operations

1. **macOS first** — cheaper, simpler, and your highest-value audience (families
   on Macs, e.g. the first testers) is the one bouncing on Gatekeeper.
2. **Windows** — do when you're ready for the Azure Trusted Signing setup.
3. Ship the first signed build as **v0.2.3** and update the first-launch docs /
   Known Issues to drop the workaround steps for whichever platform is signed.

When you've added the macOS secrets, ping me and I'll wire the config + trigger a
signed test build.
