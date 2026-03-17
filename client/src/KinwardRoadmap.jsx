import { useState } from "react";

const BRAND = {
  cream: "#FAF6F1",
  warmWhite: "#FFFDF9",
  orange: "#D4622B",
  orangeLight: "#E8956A",
  orangeFaint: "#FFF0E8",
  charcoal: "#2C2C2C",
  slate: "#6B6B6B",
  mist: "#E8E4DF",
  green: "#4A8C5C",
  greenLight: "#E8F5E8",
  red: "#C44B4B",
  shadow: "rgba(44,44,44,0.06)",
};

const phases = [
  {
    id: "phase0", label: "Phase 0", title: "Foundation",
    color: BRAND.green, complete: true,
    items: [
      { text: "Express + SQLite + Vite dev setup", done: true },
      { text: "Model category mapping (4 categories)", done: true },
      { text: "World context (knowledge freshness)", done: true },
      { text: "LAN IP detection (VPN filtering)", done: true },
      { text: "PWA manifest & service worker", done: true },
      { text: "Landing page live at kinward.ai", done: true },
    ],
  },
  {
    id: "phase1", label: "Phase 1", title: "Core Experience",
    color: BRAND.green, complete: true,
    items: [
      { text: "AI identity system (dynamic naming)", done: true },
      { text: "Clean shield branding throughout UI", done: true },
      { text: "Settings panel (Identity, Memory, World Context, Profiles)", done: true },
      { text: "Core memory — persistent per-profile facts", done: true },
      { text: "Auto-extraction — learns facts from conversations", done: true },
      { text: "Multi-fact extraction (spaghetti squash bug fix)", done: true },
      { text: "Category normalization for memory", done: true },
      { text: "Memory API — CRUD + export/import backups", done: true },
    ],
  },
  {
    id: "docdrop", label: "Document Drop", title: "The Big Build",
    color: BRAND.green, complete: true,
    items: [
      { text: "Backend upload pipeline (multer, pdf-parse, chunking)", done: true },
      { text: "Chat injection (4K token budget, honest truncation)", done: true },
      { text: "Frontend upload UI (paperclip button, drag-drop, attachment card)", done: true },
      { text: "Image OCR (llama3.2-vision, auto-pull)", done: true },
      { text: "Document memory (auto-extract facts from uploads)", done: true },
    ],
  },
  {
    id: "polish", label: "Testing & Polish", title: "Production Quality",
    color: BRAND.green, complete: true,
    items: [
      { text: "Multi-fact extraction live test", done: true },
      { text: "AI identity rename end-to-end test", done: true },
      { text: "Fix: dynamic system prompt (stale model_configs bug)", done: true },
      { text: "Fix: service worker cache-first → network-first", done: true },
      { text: "Fix: Express cache headers for sw.js and index.html", done: true },
      { text: "Configurable debug logging (DEBUG env var)", done: true },
      { text: "Component file splitting (KinwardChat → 7 modules)", done: true },
      { text: "Shared utils consolidation (api, BRAND, ShieldIcon)", done: true },
    ],
  },
  {
    id: "alpha", label: "Alpha Release", title: "Ship It",
    color: BRAND.orange, complete: false,
    items: [
      { text: "Full timed run (fresh reset → wizard → chat → doc, target <5 min)", done: false },
      { text: "Error boundary (graceful crash recovery in UI)", done: false },
      { text: "README with install instructions (git clone → npm install → go)", done: false },
      { text: "One-command startup script (start Ollama + server + dev)", done: false },
      { text: "r/LocalLLaMA post with screenshots + demo", done: false },
      { text: "GitHub repo public release", done: false },
    ],
  },
  {
    id: "phase2", label: "Phase 2", title: "Depth & Intelligence",
    color: BRAND.slate, complete: false,
    items: [
      { text: "Session memory (Tier 2) — auto conversation summaries", done: false },
      { text: "SearXNG — self-hosted search for knowledge freshness", done: false },
      { text: "Tailscale — remote access from anywhere", done: false },
      { text: "Recipe SDK specification (YAML, sandboxing)", done: false },
      { text: "Passphrase encryption (upgrade from PINs)", done: false },
      { text: "Dashboard wireframes (admin usage views)", done: false },
    ],
  },
  {
    id: "phase3", label: "Phase 3", title: "Expansion",
    color: BRAND.slate, complete: false,
    items: [
      { text: "BitNet integration (CPU-only mode)", done: false },
      { text: "Lightweight RAG (full retrieval pipeline)", done: false },
      { text: "RSS feed indexing for knowledge freshness", done: false },
      { text: "Marketplace content governance", done: false },
      { text: "Funding model ($10 license + marketplace)", done: false },
    ],
  },
  {
    id: "phase4", label: "Phase 4", title: "Scale",
    color: BRAND.slate, complete: false,
    items: [
      { text: "Recipe marketplace launch", done: false },
      { text: "One-click installer (Windows/Mac)", done: false },
      { text: "Bluetooth-to-WiFi pairing for mobile setup", done: false },
      { text: "Multi-node household support", done: false },
    ],
  },
];

function ShieldIcon({ size = 20, color = BRAND.orange }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 28" fill="none">
      <path
        d="M12 1L2 5.5V12.5C2 19.5 6.5 25.5 12 27C17.5 25.5 22 19.5 22 12.5V5.5L12 1Z"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <circle cx="12" cy="13" r="2" fill={color} />
    </svg>
  );
}

export default function KinwardRoadmap() {
  const [expandedPhase, setExpandedPhase] = useState("alpha");

  const totalItems = phases.reduce((s, p) => s + p.items.length, 0);
  const doneItems = phases.reduce((s, p) => s + p.items.filter((i) => i.done).length, 0);
  const progressPercent = Math.round((doneItems / totalItems) * 100);

  const currentPhaseIdx = phases.findIndex((p) => !p.complete);

  const alphaPhase = phases.find((p) => p.id === "alpha");
  const alphaRemaining = alphaPhase.items.filter((i) => !i.done).length;

  return (
    <div style={{
      fontFamily: "'Lora', Georgia, serif",
      background: BRAND.cream,
      color: BRAND.charcoal,
      minHeight: "100vh",
      padding: "40px 24px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <ShieldIcon size={48} />
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: "12px 0 4px" }}>
            Kinward Roadmap
          </h1>
          <p style={{ color: BRAND.slate, fontSize: 14, fontFamily: "'DM Mono', monospace" }}>
            {doneItems} of {totalItems} milestones complete
          </p>
          <div style={{
            width: "100%", maxWidth: 400, height: 8,
            background: BRAND.mist, borderRadius: 4, margin: "16px auto 0", overflow: "hidden",
          }}>
            <div style={{
              width: `${progressPercent}%`, height: "100%",
              background: `linear-gradient(90deg, ${BRAND.green}, ${BRAND.orange})`,
              borderRadius: 4, transition: "width 0.6s ease",
            }} />
          </div>
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: 13,
            color: BRAND.orange, marginTop: 8, fontWeight: 500,
          }}>
            {progressPercent}% complete
          </p>
        </div>

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: BRAND.mist,
          }} />

          {phases.map((phase, idx) => {
            const isExpanded = expandedPhase === phase.id;
            const isCurrent = idx === currentPhaseIdx;
            const donePct = phase.items.length > 0
              ? Math.round((phase.items.filter((i) => i.done).length / phase.items.length) * 100) : 0;

            return (
              <div key={phase.id} style={{ marginBottom: 8, position: "relative" }}>
                <div style={{
                  position: "absolute", left: 8, top: 16, width: 24, height: 24, borderRadius: "50%",
                  background: phase.complete ? BRAND.green : isCurrent ? BRAND.orange : BRAND.mist,
                  border: `3px solid ${phase.complete ? BRAND.green : isCurrent ? BRAND.orange : BRAND.slate}`,
                  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
                }}>
                  {phase.complete && (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="white">
                      <path d="M6.5 12L2 7.5L3.5 6L6.5 9L12.5 3L14 4.5L6.5 12Z" />
                    </svg>
                  )}
                  {isCurrent && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />
                  )}
                </div>

                <div
                  onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                  style={{
                    marginLeft: 48, padding: "16px 20px",
                    background: isCurrent ? BRAND.orangeFaint : phase.complete ? BRAND.greenLight : "white",
                    border: `1px solid ${isCurrent ? BRAND.orangeLight : phase.complete ? "#c8e6c8" : BRAND.mist}`,
                    borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
                    boxShadow: isCurrent ? `0 2px 12px ${BRAND.shadow}` : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 11,
                        color: phase.complete ? BRAND.green : isCurrent ? BRAND.orange : BRAND.slate,
                        fontWeight: 500, textTransform: "uppercase", letterSpacing: 1,
                      }}>
                        {phase.label}
                        {isCurrent && " — IN PROGRESS"}
                        {phase.complete && " — COMPLETE"}
                      </span>
                      <h3 style={{ fontSize: 18, fontWeight: 600, margin: "4px 0 0" }}>
                        {phase.title}
                      </h3>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 13,
                        color: phase.complete ? BRAND.green : BRAND.slate, fontWeight: 500,
                      }}>
                        {phase.items.filter((i) => i.done).length}/{phase.items.length}
                      </div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill={BRAND.slate}
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", marginTop: 4 }}>
                        <path d="M4 6L8 10L12 6" fill="none" stroke={BRAND.slate} strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>

                  <div style={{
                    width: "100%", height: 4,
                    background: phase.complete ? "#c8e6c8" : BRAND.mist,
                    borderRadius: 2, marginTop: 12, overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${donePct}%`, height: "100%",
                      background: phase.complete ? BRAND.green : BRAND.orange,
                      borderRadius: 2, transition: "width 0.4s ease",
                    }} />
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 16 }}>
                      {phase.items.map((item, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0",
                          borderTop: i > 0 ? `1px solid ${phase.complete ? "#d8eed8" : BRAND.mist}` : "none",
                        }}>
                          <span style={{ fontSize: 16, lineHeight: "22px", flexShrink: 0 }}>
                            {item.done ? "\u2705" : "\u2B1C"}
                          </span>
                          <span style={{
                            fontSize: 14,
                            color: item.done ? BRAND.slate : BRAND.charcoal,
                            textDecoration: item.done ? "line-through" : "none",
                            opacity: item.done ? 0.7 : 1,
                          }}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Alpha Callout */}
        <div style={{
          background: "linear-gradient(135deg, #FFF0E8, #FFFDF9)",
          border: "2px solid #D4622B", borderRadius: 14, padding: 24, margin: "32px 0", textAlign: "center",
        }}>
          <h3 style={{ fontSize: 16, color: BRAND.orange, fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 8 }}>
            DISTANCE TO ALPHA
          </h3>
          <div style={{ fontSize: 36, fontWeight: 700, color: BRAND.orange, fontFamily: "'DM Mono', monospace", margin: "8px 0" }}>
            {alphaRemaining} items
          </div>
          <p style={{ fontSize: 14, color: BRAND.slate, lineHeight: 1.6 }}>
            {alphaRemaining === 0
              ? "Alpha is ready to ship!"
              : `${alphaRemaining} of ${alphaPhase.items.length} items remain before the first public alpha. Everything before this phase is complete.`}
          </p>
        </div>

        <div style={{
          textAlign: "center", marginTop: 40, padding: "20px 0",
          borderTop: `1px solid ${BRAND.mist}`, color: BRAND.slate,
          fontSize: 13, fontFamily: "'DM Mono', monospace",
        }}>
          Last updated: March 16, 2026 — Session #7
        </div>
      </div>
    </div>
  );
}
