# Kinward — Project Memory

## Development Philosophy
- **"Write once, cry once"** — minimize tech debt for the sake of iteration
- We are building a dream home, not a prototype
- Make it strong at every phase: foundation through furnishings
- No shortcuts that create future pain — always harden as we go
- Quality and durability over speed of iteration

## Architecture
- Local-first family AI platform (Express + React + SQLite + Ollama)
- Electron desktop app with system tray (zero terminal commands for end users)
- PWA for LAN access from phones/tablets
- Target audience: non-technical families — UX simplicity is paramount

## Key Branches
- `main` on `robnettstories/kinward` (private) — canonical development branch
- `main` on `kinward-ai/kinward` (public) — alpha distribution, squash-pushed from private main
- Feature branches merge to private main via `--no-ff`, then squash-push to public when ready

---

## State of Play (as of June 2026)

**Shipped to public (kinward-ai/kinward):**
- v0.2.0 release with downloadable Mac installer (`Kinward-0.2.0-universal.dmg`)
- Phase 1 complete (Electron app, model manager, Gemma 4, on-ramp polish)
- Phase 2.1 Family Dashboard + Family Board
- Phase 2.5 + 2.6 Updates feature (app version + signed context bundles)
- Security hardening (session tokens, PIN lockout, audit log, fresh-admin gates)
- 39 tests covering security-critical paths

**Shipped to private main, not yet on public:**
- Settings → 📱 Add a Device (QR code mobile setup flow)
- chat_modes modular refactor (modes = DB rows, source: built-in/family/bundle)
  + 💻 Coding mode (Qwen 2.5 Coder in catalog) + 📚 Homework Tutor v1
  + syntax-highlighted code blocks + source-file uploads + history loading
  (shipped 2026-06-09; built-in modes live in `server/lib/chat-modes.js`)

**Queued for next sprint:**
- Apple Developer ID code signing (v0.2.1), Windows installer, then 2.7 Privacy Modes
- See `ROADMAP.md` Current Priorities section

---

## Where to Find What

When you need to know something, these are the files of record:

| Topic | File |
|---|---|
| What's built vs. queued vs. parked | `ROADMAP.md` (top section: "Current Priorities") |
| Security threat model + principles + changelog | `SECURITY.md` |
| Parked strategic ideas (not in build queue) | `docs/CONCEPTS.md` |
| How to publish a context bundle (monthly cadence) | `docs/BUNDLE_AUTHORING.md` |
| First-launch flow for new users | `docs/FIRST_LAUNCH_MAC.md` |
| Install walkthrough + FAQ | `INSTALL.md` |
| The README | `README.md` |
| Curated model catalog | `server/lib/model-catalog.js` |
| Auth library structure | `server/lib/sessions.js`, `rate-limit.js`, `audit.js`, `security-policy.js` |
| Signing primitives | `server/lib/bundle-verify.js`, `scripts/sign-bundle.js`, `scripts/verify-bundle.js` |
| Signing keys | `~/.kinward/signing.key` (private, never committed) + `server/lib/trusted-keys.js` (baked-in public) |

The signed context bundle distribution is a separate repo: `kinward-ai/kinward-context` at `~/Documents/Projects/kinward-context`.

The marketing site is a separate repo: `robnettstories/kinward-site` at `~/Documents/Projects/kinward-site` (deploys to kinward.ai via GitHub Pages).

---

## Principles to Honor (Earned in This Project's Conversations)

1. **Dispersion discipline.** Recurring ideas that "augment any platform" are usually the dispersion pattern in a strategy costume. Before building, ask: which family is the buyer, what's the frozen "done," does it fit a 2–4 week middle? See `docs/CONCEPTS.md` §1 flag #1.

2. **Kinward needs users, not harder problems.** The biggest risk to the project is making it more exciting before making it more finished. New features should make Kinward easier to actually use, not bigger to maintain.

3. **Modularity, not features.** Kinward is a platform for assembling family AI from compartmentalized modules (memory, modes, models, knowledge context). New features should ideally be data-driven rows in tables, not hardcoded enums. See `docs/CONCEPTS.md` §3 — the chat_modes refactor is the concrete first application.

4. **Memory is the soul.** The family's AI identity is not the model — it's the memory. Model swaps don't touch the DB. App updates don't touch the data dir. The "new body, new brain, same soul" invariant should be testable, not just claimed. See `docs/CONCEPTS.md` §4 → `ROADMAP.md` 2.8.

5. **Provenance everywhere, surveillance nowhere.** Every governance event audit-logged. Every signed artifact verifiable. But never store conversation content for parents to surveil. Family Board + Audit Log + Signed Bundles all embody this; future features should too.

6. **Honest about origin.** When a model has training-origin biases that affect end-user experience (e.g. Qwen + CCP), say so in the catalog. Don't hide it, don't fearmonger about it. See `docs/CONCEPTS.md` §5.

7. **Never trust client-supplied identity.** Backend derives `profileId` from session token, never from request body. This is the security pattern we lift across the codebase — applies to any new endpoint.

---

## Session Continuity Notes

This file should be the first thing a new development session reads. If you're picking up after a context break:

1. Read this file (CLAUDE.md) for orientation
2. Read `ROADMAP.md` "Current Priorities" for what's next
3. Read `docs/CONCEPTS.md` for parked strategic context
4. Check `git log --oneline -10` on the current branch to see recent work

The session that ran 2026-04-02 through 2026-06-06 covered: public repo PII scrub, Electron app, Phase 1 hardening, Phase 2 Dashboard + Family Board, security hardening, Updates feature, v0.2.0 Mac installer, mobile setup QR code, and the design discussions captured in CONCEPTS.md. A new session should not need to re-derive any of these decisions — they're in files.
