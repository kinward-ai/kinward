# Kinward Roadmap

## Phase 1 — First Impressions (On-Ramp & Polish)
*Goal: A non-technical person can install and be chatting in under 5 minutes.*
*Status: ✅ Complete — shipped April 2026*

### 1.1 Auto-Detect Hardware on Wizard Launch ✅
- Scan CPU, GPU, RAM automatically via Ollama system info + Node `os` module
- Skip the technical questions — show a plain-English summary: "Your Mac can handle a mid-size brain. We recommend installing Llama 3.1 8B."
- Single "Install Recommended" button instead of model picker

### 1.2 Friendly Model Download Experience ✅
- Replace raw progress bar with conversational copy: "Teaching Lumina to understand language... this usually takes 3–5 minutes on your connection"
- Add animated pixel art states (sword & shield asset already exists) tied to download milestones
- Show estimated time remaining based on download speed

### 1.3 Family Profile Templates ✅
- Offer preset family shapes: "Just me", "Couple", "Family of 4", "Family of 6"
- Pre-scaffold profiles with sensible role/guardrail defaults
- Let users edit names and PINs inline rather than building each profile from scratch

### 1.4 Offline / Error State UI ✅
- Clear visual indicator when Ollama is unreachable (not just a failed fetch)
- "Lumina is sleeping" state with a retry button and troubleshooting hints
- Distinguish between "Ollama not installed", "Ollama not running", and "model not loaded"

### 1.5 Mobile-First Wizard ✅
- Audit and fix wizard flow for phone-width viewports
- Larger tap targets, swipe-friendly step transitions
- Camera-ready file picker already exists — make sure it's prominent

### 1.6 Model Catalog & Manager ✅
- Developer-maintained curated catalog of 15+ vetted open-weight models
- In-app model browser in Settings with category tabs, hardware suitability, NEW badges
- One-click install with live WebSocket progress (speed + ETA)
- Gemma 4 12B/26B, Mistral Small 24B, DeepSeek R1, Phi-4 Mini added
- Tier-aware recommendations: excellent/good/basic hardware detection

---

## Phase 2 — Daily Driver (Core Feature Gaps)
*Goal: Families come back every day because Kinward is genuinely useful.*

### 2.1 Family Dashboard (Home Screen)
- Replace the immediate-chat-launch with a home view showing:
  - Per-profile recent conversations
  - Memory highlights ("Lumina learned 3 new things this week")
  - Quick-launch tiles for each conversation mode
- Admin view includes family activity summary

### 2.2 Conversation Bookmarks & Search
- Star/save individual messages or full exchanges
- Searchable conversation history across sessions
- "Show me what we talked about last time" as a natural language query

### 2.3 Shared Family Memory (Opt-In)
- New memory scope: `family` alongside existing per-profile isolation
- Opt-in shared facts: grocery lists, family calendar, house rules, emergency contacts
- Any family member can add; admin can review/remove
- Clear UI distinction between "my memories" and "family memories"

### 2.4 Data Export & Backup UX
- One-click export: all conversations, memories, and profiles as a zip
- Human-readable format (JSON + markdown) so it's genuinely portable
- Scheduled auto-backup option (daily/weekly) to a user-chosen directory
- Restore from backup in settings

### 2.5 Simple Update Mechanism ✅
- Version check against GitHub releases on settings page
- "Update available" banner with one-click pull + restart
- Changelog summary shown before update

### 2.6 Signed Context Bundles ✅
- Separate `kinward-ai/kinward-context` public repo for curated knowledge bundles
- Ed25519 signing; public key baked into the app, private key kept by maintainer
- Settings → 🔄 Updates panel with check / preview / apply / rollback
- Append-only `context_bundles` history table with full audit trail
- Fresh-admin re-auth required before any apply or rollback
- See `docs/BUNDLE_AUTHORING.md` for the monthly publishing cadence

> 2.5 and 2.6 shipped together as the "Updates" feature, sharing one Settings panel.

### 2.7 Privacy Modes 🚧
*Publicly committed on kinward.ai — "rolling out in the next release."*

Three discrete privacy postures the family admin can choose from in Settings.
Each mode is a coherent bundle of network/auth defaults so families don't
have to reason about individual toggles.

- **Open** (current default)
  - LAN-accessible: any device on home Wi-Fi can connect with a valid PIN
  - All API endpoints listen on `0.0.0.0:3210`
  - No additional pairing required for new devices
  - Suitable for: families who trust everyone on their home network

- **Gated**
  - LAN-accessible but new devices require admin pairing
  - First connection from a new IP triggers a 6-digit pairing code on the admin device
  - Admin approves → that device gets its own session token
  - Suitable for: families with frequent guests, shared Wi-Fi with neighbors

- **Fully private**
  - Listens on `127.0.0.1` only — no LAN exposure at all
  - PWA / phone access disabled (or requires manual ngrok-style tunnel)
  - Suitable for: maximum-privacy households, sensitive use cases

Implementation notes:
- New `system_config` row: `privacy_mode` (open / gated / private)
- New `paired_devices` table for Gated mode (device_id, profile_id, approved_at, last_seen)
- Settings → 🔒 Privacy panel with mode picker + explainer of each
- Mode change is a destructive action — requires fresh admin re-auth
- Audit log entry on every mode change

---

## Phase 3 — Superpowers (Differentiation Features)
*Goal: Things Kinward can do that cloud assistants can't or won't.*

### 3.1 Voice I/O
- Browser Web Speech API for speech-to-text input
- Text-to-speech for responses (browser built-in or local TTS model)
- Per-profile voice preferences (speed, pitch)
- "Hey Lumina" hands-free mode for kitchen/homework table use

### 3.2 Scheduled Routines
- Configurable time-based prompts per profile:
  - Morning briefing (weather, calendar, reminders)
  - Homework check-in for kids
  - Meal planning suggestions
  - Bedtime wind-down (story, reflection prompt)
- Push notification via PWA service worker
- Admin manages schedule; family members can opt in/out

### 3.3 Parental Insights Dashboard
- Summary view of kids' usage patterns (topics, frequency, time of day)
- No exact message content exposed — category-level and topic-level summaries only
- Flagging system for concerning patterns (configurable sensitivity)
- Conversation starters: "Your daughter asked about volcanoes 3 times this week — she might love a volcano book"

### 3.4 Explain Mode ("Why did you say that?")
- Button on any AI response that shows:
  - Which core memories were injected
  - Which conversation mode was active
  - Which model generated the response
- Builds trust and helps families understand how their AI works

### 3.5 Meeting AI (Real-Time Session Assistant)
- Whisper.cpp integration for local speech-to-text transcription
- Timestamped transcript buffer stored in SQLite
- Periodic summarizer (same Ollama model, summarization prompt every 5 minutes)
- On-demand analyst: "What did we agree on?" queries against transcript + memory
- Meeting end: key facts and action items flow into Kinward's memory system
- "Meeting mode" UI: start/stop recording, live transcript, rolling summary panel

---

## Phase 4 — Scale & Robustness
*Goal: Works reliably for larger families and multi-device households.*

### 4.1 Multi-Device LAN Access
- mDNS discovery already partially exists — make it reliable
- QR code on admin device to connect family phones/tablets
- Consistent experience across devices (session state in SQLite already handles this)

### 4.2 Concurrent User Handling
- Request queuing for single-GPU inference (one generation at a time, others wait with "Lumina is helping someone else, one moment...")
- Priority system: active conversation > new conversation
- WAL mode already supports concurrent reads — verify write contention under load

### 4.3 Model Hot-Swap & Multi-Model
- Run different models for different categories simultaneously (if hardware allows)
- Seamless model switching without losing conversation context
- "Try a bigger model" upgrade path from settings

### 4.4 Plugin / Extension System
- Allow community-built extensions (recipe helper, homework tutor, etc.)
- Sandboxed execution with defined API surface
- Extension marketplace (future)

---

## Current Priorities (as of June 2026)

### Just shipped (early June)
- **chat_modes refactor + Coding + Tutor v1** (2026-06-09) — conversation
  modes are now `chat_modes` table rows (`source` = built-in / family /
  bundle), not hardcoded enums. Built-ins re-sync from code on boot;
  role visibility enforced server-side (`GET /api/chat/modes`). Shipped on
  the abstraction: 💻 Coding mode + Qwen 2.5 Coder 7B/14B in the catalog
  (coding-category-only per CONCEPTS §5), 📚 Homework Tutor v1 (Socratic,
  doc-upload encouragement — v2/v3 stay parked per CONCEPTS §2),
  syntax-highlighted code blocks, source-file uploads
  (`.py .js .ts .tsx .rs .go`), and conversation-history loading when
  reopening a session. 12 new tests (51 total).
- **v0.2.0 Mac installer** — `Kinward-0.2.0-universal.dmg` on GitHub Releases, universal binary
- **First-launch Ollama dialog** — native popup with "Get Ollama" if missing
- **Settings → 📱 Add a Device** — QR-code mobile setup flow, real-world tested

### Next sprint

1. ~~**v0.2.1 hotfix**~~ ✅ **Shipped 2026-06-11** — launch fix + the full
   chat_modes/Coding/Tutor batch, universal DMG on GitHub Releases,
   kinward.ai updated. Release notes recommit to signing in the next release.
2. **Apple Developer ID + code signing** — publicly recommitted in the
   v0.2.1 release notes for the NEXT release. Finish enrollment, sign + notarize.
3. **Windows installer** — add `electron/icons/icon.ico`, test electron-builder
   NSIS output, attach to v0.2.1 release.
4. **2.7 Privacy Modes** — open / gated / fully private. Public commitment
   on kinward.ai. The QR-code mobile setup just shipped is the natural
   front-end for Gated mode pairing.
5. **Dashboard home refresh** (from 2026-06-11 discussion):
   - **Family Board windowing** — main feed shows upcoming events (next 7
     days) + recent updates/wins (~last 2 weeks); older posts collapse
     behind a "Past posts" view. Computed filter only — nothing deleted,
     no schema change (provenance principle). ~Half a day; can ship alone.
   - **Mode carousel** — replace the tile grid with a horizontal
     scroll-snap carousel of rectangular mode cards (center card slightly
     enlarged). Renders straight from GET /api/chat/modes — role-filtered,
     colors/icons from the chat_modes table — so it scales as families add
     modes. CSS scroll-snap, no library, touch-friendly for the PWA.
   - Board strip stays on top but compact; carousel becomes the visual
     centerpiece; recent conversations below.

### Watching (build only if signal earns it)

- **Tutor mode v2 (study plans)** — parked in `docs/CONCEPTS.md` §2.
  Trigger: family uses Tutor weekly for 4+ weeks AND asks for progress tracking.
- **Tutor mode v3 (interactive activities)** — parked. Trigger: real demand
  from real users for "make me a quiz" type behavior.
- **2.8 Memory Architecture & Continuity** — drafted; the "new body, same
  memories" invariant. Build after Privacy Modes if no higher-leverage work
  has emerged from user signal.

**Phase 1 complete. Phase 2 majority shipped.** What's live in the public alpha as of v0.2.0:
- ✅ Electron desktop app + 6 on-ramp items
- ✅ 2.1 Family Dashboard + Family Board with moderation
- ✅ 2.5 + 2.6 Updates (app version + signed context bundles)
- ✅ Security hardening pass: session tokens, PIN lockout, audit log, fresh-admin gates, 39 tests

### Next up — confirmed direction

**Sprint focus (next 2–3 weeks):**

1. **2.7 Privacy Modes** 🚧 *— public commitment, must ship soon*
   - Open / Gated / Fully Private — see spec above
   - Closes the "LAN pairing" gap from SECURITY.md medium-priority audit
   - Small, well-scoped, visible to users
2. **2.3 Shared Family Memory** — extends the Family Board pattern that families already love. Highest user-value follow-on.
3. **DB Encryption at Rest** *(not in original roadmap — flagged in SECURITY.md as high-priority)*
   - SQLCipher migration so on-disk DB is unreadable without the admin passphrase
   - Document encryption rides on the same key derivation
   - Background work, mostly invisible to users, but real defensive value

**Then:**

4. **2.4 Data Export & Backup UX** — signed backup bundles, leveraging the Ed25519 infrastructure from 2.6
5. **2.2 Conversation Bookmarks & Search** — daily-driver quality-of-life

### Phase 3 — staged for after Phase 2 closeout

Once Phase 2 is fully done, the marquee Phase 3 candidate is **3.5 Meeting AI** — Whisper + transcript + analyst. Built from the local AI meetup conversation. Will pair well with a real product launch / press push.

Other Phase 3 items (Voice I/O, Routines, Parental Insights, Explain Mode) get prioritized by what families ask for once they're actually using Kinward daily.

### Phase 4 — distant-but-known

Concurrent inference, multi-model hot-swap, plugin system. None blocking; all important for scale beyond the alpha audience.
