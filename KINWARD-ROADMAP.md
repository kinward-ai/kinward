# Kinward — Product Roadmap

**Last updated:** March 11, 2026

---

## Phase 0 — Immediate Fixes (This Week)

- [x] **FIX: Model category mapping** — All four categories (General, Kids, Research, Creative) fall back to available model with category-specific system prompts. No more empty bubbles. ✅ Done March 11
- [x] **FIX: Knowledge freshness — World Context** — Admin-editable facts block injected into system prompts. Auto-seeds with current facts (president, year). Fixes the Biden bug. ✅ Done March 11
- [ ] **FIX: LAN IP detection** — Filter VPN adapters (NordLynx) from server startup banner so correct LAN IP is displayed.

## Phase 1 — Core Experience (Next 1–2 Weeks)

- [ ] **Lumina identity — System prompt integration** — Bake "Lumina" as the assistant's name into all system prompts. Document the Lumina voice spec: tone, personality traits, vocabulary, behavioral patterns observed during family playtesting. Store as `kinward_personality` in system_config. This is what makes Kinward feel like *your* family's AI, not a generic chatbot.
- [ ] **PWA manifest** — manifest.json + service worker for "Add to Home Screen" on family devices.
- [ ] **Shield logo integration** — Unify app UI branding with Minimal Shield from landing page.
- [ ] **Settings panel** — Wire up stubbed settings cards: profile management, model selection, privacy mode toggle, activity overview, world context editor.
- [ ] **Full timed run** — Fresh reset → wizard → chat → family test. Target: under 5 minutes.
- [ ] **Deploy landing page** — Push index.html + CNAME to GitHub Pages, configure DNS for kinward.ai.

## Phase 2 — Depth & Polish (Weeks 3–6)

- [ ] **Lumina memory — Per-person facts** — Structured key-value memory per profile. "Pippin likes dinosaurs, struggles with fractions." Stored in a `profile_memory` table, selectively injected into context per session. Lumina remembers your family.
- [ ] **Lumina memory — Session summaries** — After each session, auto-generate a compressed summary. Store summaries for retrieval in future conversations. Enables continuity without feeding full transcripts back into the context window.
- [ ] **Knowledge freshness — SearXNG** — Self-hosted meta-search engine on same node. Keyword heuristics detect queries needing fresh info, inject search results into system prompt before Ollama call. Privacy-preserving.
- [ ] **Passphrase encryption spec** — v0.2 access control upgrade beyond 4-digit PINs.
- [ ] **Recipe SDK specification (v0.1)** — Define sandboxing boundaries, YAML format, sideloading flow.
- [ ] **Dashboard wireframes** — Admin views beyond chat: usage patterns, model health, storage.
- [ ] **Hardware compatibility matrix** — Document tested configs, minimum specs, recommended builds.
- [ ] **Multi-node household support** — Architecture for multiple Kinward nodes in one home.

## Phase 3 — Expansion (Months 2–3)

- [ ] **🔥 BitNet integration** — Microsoft's 1.58-bit ternary model framework enables 100B parameter models on CPU-only hardware at 5–7 tokens/sec. Massive for Kinward: unlocks a "CPU-only mode" that removes the GPU requirement entirely. Monitor ecosystem maturity (Ollama support, server mode, larger models). Could power lighter categories (Kids Assistant) on CPU while GPU handles heavier workloads. **This could redefine Kinward's minimum hardware floor from "needs a GPU" to "any modern PC."**
- [ ] **Lumina memory — Lightweight RAG** — Full retrieval-augmented generation pipeline for personality continuity. Combines per-person facts, session summaries, and personality journal into a smart retrieval layer. Lumina recalls relevant context across sessions without bloating the context window. The goal: model upgrades (8B → 13B → BitNet) preserve Lumina's personality because the voice spec and memory layer carry forward independently of the weights.
- [ ] **Knowledge freshness — Phase 3** — Full RAG pipeline with daily RSS feed indexing and dynamic per-query context augmentation.
- [ ] **Marketplace content governance** — Design review/approval flow for community Recipes.
- [ ] **Funding model finalization** — $10 one-time license + 70/30 Recipe marketplace revenue share.

## Phase 4 — Scale (Months 3+)

- [ ] **Recipe marketplace launch** — Community-contributed Recipes with governance review.
- [ ] **kinward.ai domain purchase** — When financially viable.
- [ ] **One-click installer** — Single executable for Windows/Mac. No terminal required.
- [ ] **Bluetooth-to-WiFi pairing** — Mobile setup flow for non-technical users.

---

## Strategic Context

- **Validated whitespace:** No existing product combines family-first governance, local AI inference, and consumer-grade setup.
- **Regulatory tailwind:** COPPA expanded 2025, FTC investigating AI chatbot safety for children.
- **BitNet tailwind:** Industry moving toward efficient local inference on consumer hardware. Kinward is the consumer layer on top of this trend.
- **Lumina as differentiator:** A named, persistent AI personality that grows with your family is a moat. Generic chatbots reset every session. Lumina remembers your kids' interests, adapts to their learning level, and carries forward across model upgrades. This is the emotional hook that turns a tool into a household member.
- **Revenue model:** $10 one-time charge (no subscription) + marketplace revenue share.

---

*This roadmap is a living document. Priorities shift as we learn from family playtesting and the local AI ecosystem evolves.*
