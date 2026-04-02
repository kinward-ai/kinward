/**
 * KINWARD MODEL CATALOG
 *
 * Developer-maintained list of vetted, openly-released Ollama models.
 * This file is the "on our end" model discovery system — we review new
 * open-weight model releases, test compatibility, and add them here.
 * Users receive new model options when they update the app.
 *
 * Hardware tiers:
 *   excellent  = 24GB+ unified/system RAM  (20B+ models run well)
 *   good       = 12–24GB RAM               (8B–14B sweet spot)
 *   basic      = <12GB RAM                 (compact models only)
 *
 * To add a new model:
 *   1. Confirm it's available on Ollama: https://ollama.com/library
 *   2. Add an entry below with accurate sizeGb, minTier, and addedDate
 *   3. Set isNew: true if within ~60 days of release
 *   4. Commit & push — users see it on next app update
 *
 * Last reviewed: 2026-04-02
 */

const CATALOG = [

  // ─── General Purpose ───────────────────────────────────────────────────────

  {
    ollama: "gemma4:9b",
    display: "Gemma 4 9B",
    category: "general",
    sizeGb: 5.5,
    sizeDisplay: "5.5 GB",
    minTier: "good",
    tags: ["general", "fast", "google"],
    description:
      "Google DeepMind's latest — exceptional instruction following, multilingual, and fast on everyday family tasks. The new everyday standard.",
    addedDate: "2026-03-28",
    featured: true,
    isNew: true,
  },
  {
    ollama: "gemma4:27b",
    display: "Gemma 4 27B",
    category: "general",
    sizeGb: 17,
    sizeDisplay: "17 GB",
    minTier: "excellent",
    tags: ["general", "reasoning", "google"],
    description:
      "Google's most capable open model. State-of-the-art reasoning, nuanced answers, and multilingual fluency. Best in class at this size.",
    addedDate: "2026-03-28",
    featured: true,
    isNew: true,
  },
  {
    ollama: "mistral-small:24b",
    display: "Mistral Small 24B",
    category: "general",
    sizeGb: 14,
    sizeDisplay: "14 GB",
    minTier: "excellent",
    tags: ["general", "reasoning", "conversation"],
    description:
      "Powerful reasoning and conversation — rivals models 3× its size. Excellent for adults and families who want the best local experience.",
    addedDate: "2025-09-01",
    featured: true,
  },
  {
    ollama: "llama3.1:8b",
    display: "Llama 3.1 8B",
    category: "general",
    sizeGb: 4.7,
    sizeDisplay: "4.7 GB",
    minTier: "basic",
    tags: ["general", "fast", "proven"],
    description:
      "Meta's proven workhorse. Reliable, fast, and runs on any machine. Great all-around for families with older hardware.",
    addedDate: "2024-07-01",
    featured: true,
  },
  {
    ollama: "llama3.3:70b",
    display: "Llama 3.3 70B",
    category: "general",
    sizeGb: 43,
    sizeDisplay: "43 GB",
    minTier: "excellent",
    tags: ["general", "large", "powerful"],
    description:
      "Meta's largest open model. Exceptional quality — only for machines with 48GB+ unified memory.",
    addedDate: "2024-12-01",
    featured: false,
  },
  {
    ollama: "qwen2.5:14b",
    display: "Qwen 2.5 14B",
    category: "general",
    sizeGb: 9,
    sizeDisplay: "9 GB",
    minTier: "good",
    tags: ["general", "multilingual", "reasoning"],
    description:
      "Alibaba's balanced 14B model with standout math, multilingual, and instruction-following abilities.",
    addedDate: "2024-09-01",
    featured: false,
  },

  // ─── Kids ──────────────────────────────────────────────────────────────────

  {
    ollama: "phi4:mini",
    display: "Phi-4 Mini",
    category: "kids",
    sizeGb: 2.5,
    sizeDisplay: "2.5 GB",
    minTier: "basic",
    tags: ["kids", "fast", "compact"],
    description:
      "Microsoft's newest compact model. Better reasoning than Phi-3 with the same tiny footprint. Perfect for younger family members.",
    addedDate: "2025-02-01",
    featured: true,
    isNew: true,
  },
  {
    ollama: "phi3:mini",
    display: "Phi-3 Mini",
    category: "kids",
    sizeGb: 2.3,
    sizeDisplay: "2.3 GB",
    minTier: "basic",
    tags: ["kids", "fast", "compact"],
    description:
      "Microsoft's compact model. Blazing fast for homework, age-appropriate answers, and interactive learning.",
    addedDate: "2024-05-01",
    featured: true,
  },
  {
    ollama: "gemma3:4b",
    display: "Gemma 3 4B",
    category: "kids",
    sizeGb: 3.3,
    sizeDisplay: "3.3 GB",
    minTier: "basic",
    tags: ["kids", "google", "fast"],
    description:
      "Google's compact Gemma 3 — friendly, capable, and runs on almost any hardware.",
    addedDate: "2025-03-01",
    featured: false,
  },

  // ─── Research ──────────────────────────────────────────────────────────────

  {
    ollama: "deepseek-r1:8b",
    display: "DeepSeek R1 8B",
    category: "research",
    sizeGb: 4.9,
    sizeDisplay: "4.9 GB",
    minTier: "basic",
    tags: ["research", "reasoning", "math"],
    description:
      "Chain-of-thought reasoning model. Exceptional at math, logic, and working through complex problems step-by-step.",
    addedDate: "2025-01-20",
    featured: true,
  },
  {
    ollama: "deepseek-r1:14b",
    display: "DeepSeek R1 14B",
    category: "research",
    sizeGb: 9,
    sizeDisplay: "9 GB",
    minTier: "good",
    tags: ["research", "reasoning", "math"],
    description:
      "Larger R1 for harder problems. Best reasoning-per-dollar at this size — great for serious homework and deep analysis.",
    addedDate: "2025-01-20",
    featured: false,
  },
  {
    ollama: "mistral-nemo:12b",
    display: "Mistral Nemo 12B",
    category: "research",
    sizeGb: 7.1,
    sizeDisplay: "7.1 GB",
    minTier: "good",
    tags: ["research", "reasoning", "teens"],
    description:
      "Strong analytical reasoning for school projects, deep-dive questions, and learning complex topics.",
    addedDate: "2024-07-01",
    featured: true,
  },

  // ─── Creative ──────────────────────────────────────────────────────────────

  {
    ollama: "llama3.1:8b",
    display: "Llama 3.1 8B (Creative)",
    category: "creative",
    sizeGb: 4.7,
    sizeDisplay: "4.7 GB",
    minTier: "basic",
    tags: ["creative", "writing", "storytelling"],
    description:
      "Excellent creative writing, storytelling, and brainstorming. Shares the same download as General — no extra space needed.",
    addedDate: "2024-07-01",
    featured: true,
  },
  {
    ollama: "command-r:35b",
    display: "Command R 35B",
    category: "creative",
    sizeGb: 21,
    sizeDisplay: "21 GB",
    minTier: "excellent",
    tags: ["creative", "writing", "large"],
    description:
      "Cohere's creative powerhouse. Exceptional long-form writing, nuanced prose, and imaginative storytelling.",
    addedDate: "2024-03-01",
    featured: false,
  },
];

// Tier ranking for comparison
const TIER_RANK = { basic: 0, good: 1, excellent: 2 };

// Days after addedDate before isNew badge expires
const NEW_BADGE_DAYS = 60;

/**
 * Get the full catalog, annotated with hardware suitability.
 * @param {string} hardwareTier - "excellent" | "good" | "basic"
 * @returns {Array} Catalog entries with `suitable` and `isNew` flags
 */
function getCatalog(hardwareTier = "basic") {
  const userRank = TIER_RANK[hardwareTier] ?? 0;
  const now = Date.now();

  return CATALOG.map((model) => {
    const modelRank = TIER_RANK[model.minTier] ?? 0;
    const addedMs = new Date(model.addedDate).getTime();
    const daysSinceAdded = (now - addedMs) / (1000 * 60 * 60 * 24);

    return {
      ...model,
      suitable: modelRank <= userRank,
      isNew: model.isNew === true || daysSinceAdded <= NEW_BADGE_DAYS,
    };
  });
}

module.exports = { getCatalog, CATALOG };
