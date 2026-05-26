# Kinward Security

Security is a first-class concern for Kinward, not a bolt-on. This document tracks our threat model, the principles we build against, an honest audit of current gaps, and a changelog of fixes shipped.

Kinward runs on family hardware, stores sensitive personal information, and is used by non-technical users including children. We take the responsibility seriously and document it openly.

---

## Threat Model

**Real threats we defend against:**

1. **Role boundary crossing within the family** — a child accessing admin settings, memory they shouldn't see, or another family member's conversations.
2. **Other users on the home LAN** — a guest on the Wi-Fi, a housemate on a separate device browsing `http://<your-lan-ip>:3210`.
3. **Device theft or loss** — someone walks off with the Mac Mini or the family laptop.
4. **Cloud backup bleed** — iCloud / Google Drive / Dropbox silently syncing the Kinward data directory to a cloud account.
5. **Shared computer users** — another OS account on the same physical machine reading Kinward's files.
6. **Supply chain attacks** — a malicious npm dependency, a poisoned model catalog, a fake "update" targeting Kinward users.
7. **Social engineering** — someone tricking a family member into installing a fake context bundle, plugin, or update.

**Not in scope** (don't over-engineer for):

- Nation-state attackers with physical access and resources.
- Encrypted network traffic between devices on the home LAN (home Wi-Fi is sufficient).
- Zero-trust between family members (parents and children trust each other — we enforce role boundaries, not adversarial isolation).
- Side-channel attacks (timing, power analysis, etc.).

---

## The Kinward Security Lens — Principles for every feature

Every feature we ship, current or future, must pass this checklist. If a feature can't answer each question positively, it isn't done.

### 1. Every API call is authenticated AND authorized.
- Never trust a `profileId` sent in a request body. Derive identity from a verified session token.
- Every mutation checks: "does this session have permission for this action?"
- No "admin-only" feature relies purely on frontend routing.

### 2. Everything sensitive is encrypted at rest.
- Database: SQLCipher with a key derived from the admin's passphrase.
- Uploads: encrypted before being written to disk.
- Backups: inherit encryption from the source.
- Keys are derived on unlock, never stored directly.

### 3. All external content is signed and user-verified.
- Context bundles: Ed25519 signed, verified against a baked-in public key.
- Model catalog updates: signed.
- Future community packs: signed.
- Future plugins / extensions: signed and sandboxed.
- Rule: if it came from outside the user's machine, it needs a signature we verify.

### 4. Sensitive actions require fresh authentication.
- Enter Settings → re-prompt PIN.
- Delete a profile → re-prompt PIN.
- Export all data → re-prompt PIN.
- Apply a context bundle → re-prompt PIN.
- "Fresh" = PIN entered within the last 5 minutes.

### 5. Audit trail for every governance event.
- Profile changes, role edits, memory edits, post approvals, context bundle applications, settings changes — all logged with timestamp, actor, action, target.
- Visible to admins in Settings → Audit Log.
- Never silently deleted; older entries archived.
- Helps families trust the system *and* helps debug.

### 6. Rate-limit every authentication attempt.
- PIN: exponential backoff, lockout after N failures, admin alert.
- Session creation: rate-limited per source.
- Admin alerts: "N failed PIN attempts on Jake's profile in the last hour."

### 7. Network access requires pairing.
- Access from a non-localhost IP requires an explicit pairing handshake.
- First-time a new device hits the API over LAN → generates pairing code → admin approves on primary device → new device gets its own session token.
- Prevents "neighbor on Wi-Fi" silent access.

### 8. No secrets in logs, errors, or exports.
- PINs, tokens, and passphrases never appear in log lines or error messages.
- Error messages never leak DB contents or paths containing user data.
- Exports are always encrypted bundles with signatures.

### 9. Every dependency is reviewed.
- Lock versions.
- Audit npm packages before adding them.
- Prefer fewer well-known dependencies over many small ones.
- Annual dependency review pass.

### 10. Families own their cryptographic identity.
- Each family has a keypair generated at install.
- Export / restore across machines uses the keypair.
- Future: share memories between family members' accounts using signed bundles.

---

## Pre-Shipment Security Review (per feature)

Before merging any new feature to main, author writes a short review block in the PR / commit description:

```markdown
## Security Review
- **Threat model additions:** who might misuse this feature, and how?
- **Auth:** which API calls this feature adds, and how they enforce identity + role.
- **Data sensitivity:** what is newly stored, where, and whether it is encrypted.
- **External inputs:** what untrusted data does this feature accept, and how it is validated / signed / sandboxed.
- **Audit trail:** what governance events are logged.
```

Three minutes of thinking, significant long-term payoff.

---

## Current State — Honest Audit (2026-04-21)

The items below reflect what Kinward ships with *right now*, before the current security hardening pass. They are being actively remediated.

### Critical (remediation in progress)

- **API authorization is absent.** Endpoints trust a client-supplied `profileId` without verifying that the requester is that profile. On a LAN-bound server, this means any device on the network can impersonate any profile by knowing its ID.
  - **Remediation:** session tokens issued on successful PIN auth; middleware verifies tokens on every protected route.
- **SQLite database stored unencrypted on disk.** All conversations, memories, documents, and family profile data is readable by anyone with filesystem access.
  - **Remediation:** SQLCipher migration planned (next security sprint).
- **No rate limiting on PIN entry.** A 4-digit PIN has only 10,000 possibilities; a brute-force attempt is feasible in seconds without backoff.
  - **Remediation:** `pin_attempts` table, exponential backoff, admin-visible failure alerts.

### High priority

- **Settings panel does not re-authenticate.** Once an admin is logged in, anyone at the keyboard can open Settings and change profiles, memory, or AI identity.
  - **Remediation:** fresh PIN prompt when entering Settings; sudo-style grace period.
- **No audit log for sensitive events.** Profile changes, memory edits, and approvals leave no trail.
  - **Remediation:** `audit_log` table; viewer in Settings.

### Medium priority

- **Document uploads stored in plaintext.** OCR-extracted contents and original files are readable on disk.
  - **Remediation:** encrypt uploads with the same family key (bundled with DB encryption work).
- **LAN server exposes API without pairing.** Any device on the LAN can reach the API surface.
  - **Remediation:** pairing handshake; new devices require admin approval.

### Resolved

- **Personal PII in public git history.** Initial commits included an unencrypted SQLite file with paycheck stubs and insurance forms. *Resolved 2026-04-02:* full history rewrite with `git-filter-repo`, old public repo deleted and recreated. See commit history on `kinward-ai/kinward`.
- **Personal author email / hostname exposed in git history.** *Resolved 2026-04-02:* mailmap rewrite, all commits re-attributed to `hello@kinward.ai`.

---

## Security Changelog

Newest first.

### 2026-05-24 — Signed context bundles (Phases A + B + C)

Shipped the signed-update system designed in the Updates scoping doc. The
trust chain is now end-to-end:

```
maintainer signs locally
    ↓ ( Ed25519 private key on dev machine only, ~/.kinward/signing.key )
bundle committed to kinward-ai/kinward-context (public repo)
    ↓ ( raw.githubusercontent.com HTTPS )
Kinward app fetches manifest + bundle
    ↓ ( bundle-verify.js — same canonicalization the signer used )
signature verified against baked-in public key
    ↓ ( server/lib/trusted-keys.js, replaceable only via app version update )
user previews diff in UI
    ↓ ( shows before/after for every changed key in payload )
user clicks Apply (requireFreshAdmin)
    ↓ ( 5-min admin freshness window, PIN re-auth if stale )
written to system_config + context_bundles row + audit_log entry
```

**New primitives shipped:**
- `server/lib/trusted-keys.js` — baked-in Ed25519 public keys per signer
- `server/lib/bundle-verify.js` — canonical-JSON Ed25519 verification
- `server/lib/context-bundles.js` — fetch/verify/apply/rollback runtime
- `scripts/keypair-gen.js`, `scripts/sign-bundle.js`, `scripts/verify-bundle.js`
  — developer tools for producing bundles
- `context_bundles` DB table with append-only history + active flag
- `requireFreshAdmin` gates on apply + rollback
- Audit events: `updates.checked`, `updates.bundle_applied`,
  `updates.bundle_rolled_back`, `updates.bundle_verification_failed`

**Threat model additions:**
- *kinward-ai/kinward-context repo compromise* — attacker pushes a malicious
  bundle. Mitigated: signature check against private key they don't have.
- *Maintainer private key compromise* — attacker can sign arbitrary bundles.
  Mitigation: rotate the baked-in public key via an app version update.
  Old installs continue verifying with the old key until users upgrade.
- *Transport tampering between GitHub and user* — HTTPS protects in transit,
  signature check defends against any successful tamper.
- *Replay of an old bundle* — currently no replay protection beyond
  "manifest publishes latest." Considered acceptable for v1; can add a
  `minimum_version` floor in the manifest if a buggy old bundle needs to
  be retired.

### 2026-04-28 — Auth sprint refactor + extended fresh-admin coverage

Organizational cleanup pass before merging the security branch to main.

**Server-side modularization** — split monolithic `server/lib/auth.js` into:
- `lib/sessions.js` — token issuance, verification, freshness
- `lib/rate-limit.js` — PIN attempts and lockout
- `lib/audit.js` — append-only governance log
- `lib/security-policy.js` — central policy knobs (env-overridable)

Old `lib/auth.js` retained as a thin re-export shim — existing imports keep working.

**Client-side consolidation** — eliminated duplicated token storage between `api.js` and `components/shared.jsx`. Both now delegate to a single `client/src/lib/session.js` that owns:
- Token storage (sessionStorage, with expiry checks)
- `authFetch` — drop-in fetch with Authorization header
- `apiJson` — convenience wrapper for JSON request/response
- Auth-expired event bus

**Bugfix during refactor** — chat send, file upload, and Settings memory/world-context/identity endpoints were using direct `fetch()` and bypassing the auth header, returning 401 silently. All now use `authFetch`. Bug never reached the public repo (caught during the soak window before merge).

**Extended `requireFreshAdmin` coverage** to destructive admin actions:
- `POST /api/models/install` — multi-GB downloads, disk-impacting
- `DELETE /api/models/:id` — removes installed model weights
- `POST /api/memory/:profileId` and `DELETE /api/memory/:profileId/:memoryId` when an admin edits/deletes another profile's memories
- `POST /api/memory/:profileId/import` — bulk import is destructive even on own profile

### 2026-04-21 — Auth sprint begins
- Branched `feature/security-hardening` off Phase 2 dashboard work.
- Adopted this SECURITY.md as the project's living security document.
- Began implementation of session tokens, PIN rate limiting, Settings re-auth, and audit log (in that order).

### 2026-04-02 — Public repo scrub
- Removed unencrypted SQLite files containing financial PII from all git history via `git-filter-repo`.
- Rewrote author emails / hostnames across all commits to a canonical project email.
- Deleted and recreated the public `kinward-ai/kinward` GitHub repository to ensure no cached git objects retained the old history.
- Set global git config to project identity going forward.

---

## Reporting Security Issues

If you believe you've found a security issue in Kinward, please email **hello@kinward.ai** with a description. Please do not open a public GitHub issue for security-sensitive reports.

We will acknowledge receipt within 72 hours and work with you on a coordinated disclosure timeline.

---

*This document is part of Kinward's commitment to governance without surveillance. Your family's data belongs to your family; our job is to make that true in practice, not just in marketing copy.*
