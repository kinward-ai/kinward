# Kinward — Memory Engine Spec (Outline)

**Status:** Draft outline — to be fleshed out incrementally  
**Last updated:** March 15, 2026

---

## 1. Extraction Layer — How Facts Get In

### 1a. Auto-Extraction (built ✅)
- Background Ollama call after every chat exchange, fire-and-forget
- Temperature 0.1 for precision
- Explicit-only rule: never infer, only extract what the user stated
- Multi-fact separation enforced via WRONG/RIGHT few-shot examples ✅

### 1b. Manual Entry (settings panel — TODO)
- Parents can add/edit/delete facts for any family member
- Source field = 'manual' (distinguishable from 'auto')
- Manual entries are never overwritten by auto-extraction

### 1c. Corrections & Contradictions (TODO)
- "Actually, my favorite color is green now" → upsert on same key
- Need: staleness detection — if a fact hasn't been reinforced in N months, flag it
- Need: contradiction handling — if auto-extraction produces a value that conflicts with a manual entry, manual wins (never overwrite source='manual' with source='auto')
- Open question: should Lumina ask "I remember you said X — has that changed?" or silently update?

### 1d. Extraction Quality Controls (TODO)
- Validation pass: reject facts with empty keys, suspiciously long values, or garbled merges
- Max value length cap (e.g., 500 chars) — if extraction returns a novel, something went wrong
- Duplicate-key-different-category detection (e.g., "favorite_color" in both "preferences" and "general")
- Log extraction failures for debugging without exposing conversation content

---

## 2. Storage Layer — The Three Tiers

### Tier 1: Core Memory (built ✅)
- **What:** Key-value facts per profile. Protected. Explicit admin delete only.
- **Table:** `core_memory` — profile_id, category, key, value, source, timestamps
- **Lifecycle:** Created by auto-extraction or manual entry. Updated by upsert. Deleted only by parent action.
- **Survives:** Model swaps, system updates, session pruning, hardware migration (via export/import)

### Tier 2: Session Memory (TODO — Phase 2)
- **What:** Compressed summaries of past conversations. Auto-generated after each session.
- **Lifecycle:** Created automatically. Prunable by time or count (e.g., keep last 30 sessions). Parents can delete.
- **Use case:** "Last time we talked about dinosaurs, you were researching T-Rex" — continuity without full transcript replay
- **Storage:** New table `session_memory` — profile_id, session_id, summary, created_at
- **Generation:** Post-session Ollama call (like extraction, but summarization prompt)

### Tier 3: Working Memory (exists ✅)
- **What:** Current conversation context window. Ephemeral.
- **Lifecycle:** Lives only for the duration of a chat session. Gone when session ends.
- **No storage required** — this is just the message history array in the Ollama call.

---

## 3. Retrieval Layer — What Gets Injected

### 3a. Current Approach (built ✅)
- `getMemoryContext()` pulls ALL core memories for a profile
- Groups by category, formats as natural language block
- Injected as system message between Lumina prompt and world context

### 3b. Scaling Concerns (TODO)
- Current approach works fine for 10-50 facts. At 200+ facts, context window gets bloated.
- **Phase 1 fix:** Cap injection at N most-recently-updated facts (e.g., 50) + all manual entries
- **Phase 2 fix:** Relevance filtering — use conversation topic to select which memories to inject (lightweight keyword match before full RAG)
- **Phase 3 fix:** Full RAG with embeddings (Tier 2.5 on roadmap)

### 3c. Context Budget (TODO)
- Define a max token budget for memory injection (e.g., 800 tokens)
- Monitor actual token usage in extraction logs
- If approaching budget, prioritize: manual entries > recently updated > oldest

---

## 4. Category Governance — Organic Taxonomy

### Philosophy
Lumina builds her own category structure per family member. Categories are flexible, not hard-constrained. This is a feature — it makes Lumina feel alive rather than database-driven.

### 4a. Defaults
- Seed categories: identity, preferences, learning, health, general
- These are suggestions to the model, not constraints

### 4b. Normalization (built ✅)
- Extraction prompt includes existing categories for the profile
- Model instructed to "prefer these when they fit, create new only if needed"
- Natural convergence over time without rigid enforcement

### 4c. Parent Controls (TODO — settings panel)
- View all categories per family member
- Rename a category (e.g., "activities" → "sports & hobbies") — bulk update on core_memory rows
- Merge two categories (e.g., combine "hobbies" and "activities")
- Cannot delete a category directly — delete individual facts, category disappears when empty

### 4d. Drift Mitigation (TODO)
- Periodic normalization pass: surface categories that look like duplicates (fuzzy match on name)
- Suggest merges to parents in settings panel: "Lumina created both 'activities' and 'hobbies' — want to merge them?"

---

## 5. Privacy & Admin — Governance Without Surveillance

### Core Principle
Parents see what Lumina *knows* (stored facts) and usage *patterns* (activity log). Parents NEVER see conversation content.

### 5a. Visibility Rules
- Parents (admin/co-admin) can view/edit/delete core memories for any family member
- Teens can view their own memories, request edits (parent approves?)
- Children cannot access memory settings (parent manages)
- No profile can see another profile's conversation history

### 5b. Export/Import (built ✅)
- Full JSON export of a profile's core memories
- Import with upsert (merge, don't replace)
- Use case: hardware migration ("Lumina brain backup")

### 5c. Audit Trail (TODO)
- Log memory changes: who changed what, when, auto vs manual
- Not conversation content — just the memory operations themselves

---

## 6. Performance Guardrails

### 6a. Per-Profile Caps (TODO)
- Soft cap on core memories per profile (e.g., 200 facts) — warn parent in settings
- Hard cap (e.g., 500 facts) — extraction skips until pruned
- Session memory cap: keep last N summaries (e.g., 50)

### 6b. Extraction Throttling
- Current: extracts on every message exchange
- Future: skip extraction for very short exchanges (<10 words), system messages, or rapid-fire conversations
- Consider: batch extraction at session end instead of per-message (trade real-time for efficiency)

### 6c. Model Load
- Extraction call is a separate Ollama inference — adds latency and GPU load
- Current: acceptable on 8B model, fire-and-forget
- Monitor: if extraction queue backs up under heavy family use, add debouncing

---

## 7. Open Questions

- Should Lumina proactively surface what she remembers? ("I remember you love T-Rex — still your favorite?")
- Session memory (Tier 2): summarize at session end, or rolling summary during long sessions?
- Should memories have a confidence score? (auto-extracted = lower confidence than manual)
- Multi-profile facts: "Mom and Dad's anniversary is June 15" — store for both profiles or just the one who said it?
- Memory sharing: should some facts be household-level rather than per-profile? (e.g., "We have a dog named Max")

---

*This outline becomes the reference for every memory-related PR. Flesh out sections as we build them.*
