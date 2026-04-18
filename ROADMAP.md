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
- Gemma 4 9B/27B, Mistral Small 24B, DeepSeek R1, Phi-4 Mini added
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

### 2.5 Simple Update Mechanism
- Version check against GitHub releases on settings page
- "Update available" banner with one-click pull + restart
- Changelog summary shown before update

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

## Suggested Starting Order

**Phase 1 is complete.** The on-ramp is solid — install-to-chat in under 5 minutes is shipping. Now the priority is making Kinward a daily habit.

1. **2.1 Family Dashboard** — gives users a reason to open the app beyond chat; surfaces memory highlights and recent activity
2. **2.3 Shared Family Memory** — the first truly collaborative feature; turns Kinward from "my AI" into "our AI"
3. **2.5 Simple Update Mechanism** — essential infrastructure so shipped families stay current without manual steps

Then continue with the rest of Phase 2 (Bookmarks, Export/Backup). Phases 3 and 4 can be interleaved based on what users ask for most.
