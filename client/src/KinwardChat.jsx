import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────
   KINWARD CHAT INTERFACE
   Profile gate → Sidebar → Streaming chat
   Connects to backend on :3210
   ───────────────────────────────────────────── */

// ── API Layer ──────────────────────────────────
const API = "/api";

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Brand Tokens ───────────────────────────────
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
  red: "#C44B4B",
  shadow: "rgba(44,44,44,0.06)",
};

// ── Pixel Sword Icon (AI Avatar) ───────────────
function SwordIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="7" y="0" width="2" height="2" fill={BRAND.slate} />
      <rect x="6" y="2" width="4" height="2" fill="#B0B0B0" />
      <rect x="7" y="4" width="2" height="6" fill="#C0C0C0" />
      <rect x="5" y="10" width="6" height="2" fill={BRAND.orange} />
      <rect x="7" y="12" width="2" height="4" fill={BRAND.charcoal} />
    </svg>
  );
}

// ── Shield Icon (Brand) ────────────────────────
function ShieldIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 20" style={{ imageRendering: "pixelated" }}>
      <rect x="2" y="0" width="12" height="2" fill={BRAND.orange} />
      <rect x="0" y="2" width="16" height="2" fill={BRAND.orange} />
      <rect x="0" y="4" width="16" height="6" fill={BRAND.orange} />
      <rect x="1" y="10" width="14" height="2" fill={BRAND.orange} />
      <rect x="2" y="12" width="12" height="2" fill={BRAND.orange} />
      <rect x="3" y="14" width="10" height="2" fill={BRAND.orange} />
      <rect x="5" y="16" width="6" height="2" fill={BRAND.orange} />
      <rect x="6" y="18" width="4" height="2" fill={BRAND.orange} />
      <rect x="7" y="6" width="2" height="6" fill={BRAND.cream} />
      <rect x="5" y="8" width="6" height="2" fill={BRAND.cream} />
    </svg>
  );
}

// ── Styles (injected once) ─────────────────────
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Lora:ital,wght@0,400;0,600;1,400&display=swap";

const CSS = `
@import url('${FONTS_URL}');

* { box-sizing: border-box; margin: 0; padding: 0; }

.kw-root {
  font-family: 'Lora', Georgia, serif;
  background: ${BRAND.cream};
  color: ${BRAND.charcoal};
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
}

/* ── Profile Gate ─── */
.kw-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 40px;
  animation: kw-fadeIn 0.5s ease;
}
.kw-gate-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.kw-gate-title {
  font-family: 'DM Mono', monospace;
  font-size: 28px;
  font-weight: 500;
  letter-spacing: 6px;
  color: ${BRAND.charcoal};
}
.kw-gate-sub {
  font-size: 15px;
  color: ${BRAND.slate};
  font-style: italic;
}
.kw-profiles-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  max-width: 480px;
}
.kw-profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.kw-profile-card:hover { transform: translateY(-4px); }
.kw-profile-card:active { transform: translateY(0); }
.kw-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'DM Mono', monospace;
  font-size: 28px;
  font-weight: 500;
  color: white;
  box-shadow: 0 4px 12px ${BRAND.shadow};
  transition: box-shadow 0.2s ease;
}
.kw-profile-card:hover .kw-avatar {
  box-shadow: 0 6px 20px rgba(212,98,43,0.2);
}
.kw-profile-name {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  color: ${BRAND.charcoal};
}
.kw-profile-role {
  font-size: 11px;
  color: ${BRAND.slate};
  font-family: 'DM Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ── PIN Modal ─── */
.kw-pin-overlay {
  position: fixed;
  inset: 0;
  background: rgba(44,44,44,0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: kw-fadeIn 0.2s ease;
}
.kw-pin-modal {
  background: ${BRAND.warmWhite};
  border-radius: 20px;
  padding: 40px;
  width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  box-shadow: 0 20px 60px rgba(44,44,44,0.15);
  animation: kw-slideUp 0.3s ease;
}
.kw-pin-label {
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  color: ${BRAND.slate};
}
.kw-pin-dots {
  display: flex;
  gap: 12px;
}
.kw-pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid ${BRAND.mist};
  transition: all 0.15s ease;
}
.kw-pin-dot.filled {
  background: ${BRAND.orange};
  border-color: ${BRAND.orange};
}
.kw-pin-dot.error {
  border-color: ${BRAND.red};
  background: ${BRAND.red};
  animation: kw-shake 0.4s ease;
}
.kw-pin-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.kw-pin-key {
  width: 64px;
  height: 56px;
  border: 1px solid ${BRAND.mist};
  border-radius: 12px;
  background: white;
  font-family: 'DM Mono', monospace;
  font-size: 22px;
  color: ${BRAND.charcoal};
  cursor: pointer;
  transition: all 0.12s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.kw-pin-key:hover { background: ${BRAND.orangeFaint}; border-color: ${BRAND.orangeLight}; }
.kw-pin-key:active { transform: scale(0.95); }
.kw-pin-key.action {
  font-size: 13px;
  color: ${BRAND.slate};
  border: none;
  background: transparent;
}
.kw-pin-key.action:hover { color: ${BRAND.orange}; background: transparent; }
.kw-pin-error {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: ${BRAND.red};
  min-height: 18px;
}

/* ── Main Layout ─── */
.kw-main {
  display: flex;
  width: 100%;
  height: 100%;
  animation: kw-fadeIn 0.4s ease;
}

/* ── Sidebar ─── */
.kw-sidebar {
  width: 280px;
  min-width: 280px;
  background: ${BRAND.warmWhite};
  border-right: 1px solid ${BRAND.mist};
  display: flex;
  flex-direction: column;
  height: 100%;
}
.kw-sidebar-header {
  padding: 20px;
  border-bottom: 1px solid ${BRAND.mist};
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kw-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.kw-sidebar-title {
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 3px;
}
.kw-user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  background: ${BRAND.orangeFaint};
  cursor: pointer;
  transition: background 0.2s;
}
.kw-user-chip:hover { background: ${BRAND.orangeLight}20; }
.kw-user-chip-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  color: white;
}
.kw-user-chip-name {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: ${BRAND.charcoal};
}
.kw-new-chat-btn {
  margin: 16px 16px 8px;
  padding: 12px;
  border: 1px dashed ${BRAND.mist};
  border-radius: 12px;
  background: transparent;
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  color: ${BRAND.slate};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.kw-new-chat-btn:hover {
  border-color: ${BRAND.orange};
  color: ${BRAND.orange};
  background: ${BRAND.orangeFaint};
}
.kw-sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.kw-session-item {
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kw-session-item:hover { background: ${BRAND.orangeFaint}; }
.kw-session-item.active { background: ${BRAND.orangeFaint}; }
.kw-session-title {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  color: ${BRAND.charcoal};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kw-session-meta {
  font-size: 11px;
  color: ${BRAND.slate};
  font-family: 'DM Mono', monospace;
  display: flex;
  gap: 8px;
}
.kw-category-tag {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${BRAND.mist};
  color: ${BRAND.slate};
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.kw-sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid ${BRAND.mist};
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kw-lock-btn {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: ${BRAND.slate};
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all 0.2s;
}
.kw-lock-btn:hover { background: ${BRAND.mist}; color: ${BRAND.charcoal}; }

/* ── Chat Area ─── */
.kw-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${BRAND.cream};
}
.kw-chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid ${BRAND.mist};
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kw-chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.kw-chat-model-name {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  color: ${BRAND.charcoal};
}
.kw-chat-category {
  font-size: 12px;
  color: ${BRAND.slate};
  font-style: italic;
}
.kw-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  scroll-behavior: smooth;
}
.kw-msg {
  display: flex;
  gap: 12px;
  max-width: 75%;
  animation: kw-msgIn 0.3s ease;
}
.kw-msg.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.kw-msg-avatar {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  color: white;
  margin-top: 2px;
}
.kw-msg-avatar.ai {
  background: ${BRAND.charcoal};
}
.kw-msg-bubble {
  padding: 14px 18px;
  border-radius: 18px;
  line-height: 1.6;
  font-size: 15px;
}
.kw-msg.assistant .kw-msg-bubble {
  background: white;
  border: 1px solid ${BRAND.mist};
  border-radius: 18px 18px 18px 4px;
}
.kw-msg.user .kw-msg-bubble {
  background: ${BRAND.orange};
  color: white;
  border-radius: 18px 18px 4px 18px;
}
.kw-msg-time {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: ${BRAND.slate};
  margin-top: 4px;
  padding: 0 4px;
}
.kw-msg.user .kw-msg-time { text-align: right; }

/* Streaming cursor */
.kw-cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: ${BRAND.orange};
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: kw-blink 0.8s ease infinite;
}

/* ── Input Area ─── */
.kw-input-area {
  padding: 16px 24px;
  border-top: 1px solid ${BRAND.mist};
  background: ${BRAND.warmWhite};
}
.kw-input-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto;
}
.kw-input-wrap {
  flex: 1;
  background: white;
  border: 1px solid ${BRAND.mist};
  border-radius: 16px;
  padding: 4px;
  transition: border-color 0.2s;
  display: flex;
  align-items: flex-end;
}
.kw-input-wrap:focus-within { border-color: ${BRAND.orangeLight}; }
.kw-input-wrap textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  padding: 10px 14px;
  font-family: 'Lora', Georgia, serif;
  font-size: 15px;
  color: ${BRAND.charcoal};
  background: transparent;
  line-height: 1.5;
  max-height: 120px;
}
.kw-input-wrap textarea::placeholder { color: ${BRAND.slate}; opacity: 0.6; }
.kw-send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: ${BRAND.orange};
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.kw-send-btn:hover { background: ${BRAND.orangeLight}; transform: scale(1.05); }
.kw-send-btn:active { transform: scale(0.95); }
.kw-send-btn:disabled { background: ${BRAND.mist}; cursor: not-allowed; transform: none; }

/* ── Empty State ─── */
.kw-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  opacity: 0.6;
}
.kw-empty-text {
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  color: ${BRAND.slate};
}
.kw-empty-hint {
  font-size: 13px;
  color: ${BRAND.slate};
  font-style: italic;
}

/* ── Category Picker (New Chat) ─── */
.kw-category-picker {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kw-category-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: ${BRAND.slate};
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 4px;
}
.kw-category-option {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid ${BRAND.mist};
  background: white;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.kw-category-option:hover {
  border-color: ${BRAND.orangeLight};
  background: ${BRAND.orangeFaint};
}
.kw-category-option-name {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  color: ${BRAND.charcoal};
}
.kw-category-option-desc {
  font-size: 11px;
  color: ${BRAND.slate};
}

/* ── Mobile ─── */
@media (max-width: 640px) {
  .kw-sidebar { width: 100%; min-width: 100%; }
  .kw-main { flex-direction: column; }
  .kw-msg { max-width: 90%; }
  .kw-sidebar.collapsed { display: none; }
}

/* ── Animations ─── */
@keyframes kw-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes kw-slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes kw-msgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes kw-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes kw-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}
`;

// ── Avatar colors by role ──────────────────────
const ROLE_COLORS = {
  admin: "#D4622B",
  "co-admin": "#C4853A",
  teen: "#5A8BAD",
  child: "#6BAF7D",
};
const avatarColor = (profile) =>
  profile.avatar_color || ROLE_COLORS[profile.role] || BRAND.orange;

// ── Category definitions ───────────────────────
const CATEGORIES = [
  { id: "general", name: "General Assistant", desc: "Everyday questions and conversation", icon: "💬" },
  { id: "kids", name: "Kids Assistant", desc: "Age-appropriate help for younger minds", icon: "🌟" },
  { id: "research", name: "Research", desc: "Deep dives, analysis, and learning", icon: "🔍" },
  { id: "creative", name: "Creative", desc: "Writing, brainstorming, and imagination", icon: "✨" },
];

// ── Time formatting ────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ── Send Arrow SVG ─────────────────────────────
function SendArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ════════════════════════════════════════════════
//  PIN KEYPAD (shared between create & auth)
// ════════════════════════════════════════════════
function PinKeypad({ pin, error, onKey, onBackspace, onCancel }) {
  return (
    <>
      <div className="kw-pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`kw-pin-dot ${i < pin.length ? (error ? "error" : "filled") : ""}`}
          />
        ))}
      </div>

      <div className="kw-pin-keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d} className="kw-pin-key" onClick={() => onKey(String(d))}>
            {d}
          </button>
        ))}
        <button className="kw-pin-key action" onClick={onCancel}>
          Cancel
        </button>
        <button className="kw-pin-key" onClick={() => onKey("0")}>
          0
        </button>
        <button className="kw-pin-key action" onClick={onBackspace}>
          ←
        </button>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════
//  PIN MODAL — handles both CREATE and AUTH
// ════════════════════════════════════════════════
function PinModal({ profile, onSuccess, onCancel }) {
  // Phases: "check" → "create" → "confirm" → done  OR  "check" → "auth" → done
  const [phase, setPhase] = useState("check");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // On mount, determine if this profile has a PIN set
  useEffect(() => {
    // hasPin comes from backend as 0 or 1 (SQLite integer)
    if (!profile.hasPin) {
      setPhase("create");
    } else {
      setPhase("auth");
    }
  }, [profile]);

  const resetPin = (msg = "") => {
    setError(true);
    setErrorMsg(msg);
    setTimeout(() => { setPin(""); setError(false); setErrorMsg(""); }, 600);
  };

  // ── AUTH flow: enter existing PIN ──
  const handleAuthKey = useCallback(
    async (digit) => {
      if (loading) return;
      setError(false);
      setErrorMsg("");
      const next = pin + digit;
      setPin(next);

      if (next.length === 4) {
        setLoading(true);
        try {
          const res = await api(`/profiles/${profile.id}/auth`, {
            method: "POST",
            body: JSON.stringify({ pin: next }),
          });
          if (res.authenticated) {
            onSuccess(profile);
          } else {
            resetPin("Wrong PIN — try again");
          }
        } catch {
          resetPin("Wrong PIN — try again");
        }
        setLoading(false);
      }
    },
    [pin, loading, profile, onSuccess]
  );

  // ── CREATE flow: set new PIN ──
  const handleCreateKey = useCallback(
    (digit) => {
      if (loading) return;
      setError(false);
      setErrorMsg("");
      const next = pin + digit;
      setPin(next);

      if (next.length === 4) {
        // Save first PIN, move to confirm phase
        setFirstPin(next);
        setPin("");
        setPhase("confirm");
      }
    },
    [pin, loading]
  );

  // ── CONFIRM flow: re-enter PIN to confirm ──
  const handleConfirmKey = useCallback(
    async (digit) => {
      if (loading) return;
      setError(false);
      setErrorMsg("");
      const next = pin + digit;
      setPin(next);

      if (next.length === 4) {
        if (next !== firstPin) {
          resetPin("PINs don't match — starting over");
          setTimeout(() => { setFirstPin(""); setPhase("create"); }, 700);
          return;
        }

        // PINs match — save to backend
        setLoading(true);
        try {
          // Try setting PIN via profile update or dedicated endpoint
          await api(`/profiles/${profile.id}/pin`, {
            method: "POST",
            body: JSON.stringify({ pin: next }),
          });
          onSuccess(profile);
        } catch {
          // Fallback: try updating via general profile update
          try {
            await api(`/profiles/${profile.id}`, {
              method: "PUT",
              body: JSON.stringify({ pin: next }),
            });
            onSuccess(profile);
          } catch {
            resetPin("Couldn't save PIN — try again");
            setTimeout(() => { setFirstPin(""); setPhase("create"); }, 700);
          }
        }
        setLoading(false);
      }
    },
    [pin, loading, firstPin, profile, onSuccess]
  );

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
    setErrorMsg("");
  };

  // Determine which handler to use based on phase
  const onKey = phase === "auth" ? handleAuthKey : phase === "confirm" ? handleConfirmKey : handleCreateKey;

  // Label text
  const label =
    phase === "check" ? "Loading..." :
    phase === "create" ? `${profile.name}, create your PIN` :
    phase === "confirm" ? "Confirm your PIN" :
    `Enter PIN for ${profile.name}`;

  const subLabel =
    phase === "create" ? "Choose a 4-digit PIN that only you know" :
    phase === "confirm" ? "Enter the same PIN again" :
    null;

  if (phase === "check") return null;

  return (
    <div className="kw-pin-overlay" onClick={onCancel}>
      <div className="kw-pin-modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="kw-avatar"
          style={{ background: avatarColor(profile), width: 56, height: 56, fontSize: 22 }}
        >
          {profile.name[0].toUpperCase()}
        </div>
        <div className="kw-pin-label">{label}</div>
        {subLabel && (
          <div style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 13,
            color: BRAND.slate,
            fontStyle: "italic",
            marginTop: -12,
            textAlign: "center",
            maxWidth: 240,
          }}>{subLabel}</div>
        )}

        <PinKeypad
          pin={pin}
          error={error}
          onKey={onKey}
          onBackspace={handleBackspace}
          onCancel={onCancel}
        />

        <div className="kw-pin-error">{errorMsg || "\u00A0"}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
//  PROFILE GATE
// ════════════════════════════════════════════════
function ProfileGate({ onLogin }) {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/profiles")
      .then((data) => setProfiles(data.profiles || data))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="kw-gate">
        <div className="kw-gate-brand">
          <ShieldIcon size={40} />
          <div className="kw-gate-title">KINWARD</div>
          <div className="kw-gate-sub">Loading profiles...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="kw-gate">
      <div className="kw-gate-brand">
        <ShieldIcon size={40} />
        <div className="kw-gate-title">KINWARD</div>
        <div className="kw-gate-sub">Who's here?</div>
      </div>

      <div className="kw-profiles-grid">
        {profiles.map((p) => (
          <div key={p.id} className="kw-profile-card" onClick={() => setSelected(p)}>
            <div className="kw-avatar" style={{ background: avatarColor(p) }}>
              {p.name[0].toUpperCase()}
            </div>
            <div className="kw-profile-name">{p.name}</div>
            <div className="kw-profile-role">{p.role}</div>
          </div>
        ))}
      </div>

      {selected && (
        <PinModal
          profile={selected}
          onSuccess={onLogin}
          onCancel={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
//  CATEGORY PICKER (for new chat)
// ════════════════════════════════════════════════
function CategoryPicker({ profile, onSelect }) {
  // Filter categories based on profile role
  const available = CATEGORIES.filter((c) => {
    if (profile.role === "child") return c.id === "kids";
    if (profile.role === "teen") return c.id !== "kids";
    return true; // adults see all
  });

  return (
    <div className="kw-category-picker">
      <div className="kw-category-label">Start a conversation</div>
      {available.map((cat) => (
        <div key={cat.id} className="kw-category-option" onClick={() => onSelect(cat.id)}>
          <div className="kw-category-option-name">
            {cat.icon} {cat.name}
          </div>
          <div className="kw-category-option-desc">{cat.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════════
function Sidebar({ profile, sessions, activeSession, onSelectSession, onNewChat, onLock }) {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  return (
    <div className="kw-sidebar">
      <div className="kw-sidebar-header">
        <div className="kw-sidebar-brand">
          <ShieldIcon size={18} />
          <div className="kw-sidebar-title">KINWARD</div>
        </div>
        <div className="kw-user-chip" title="Switch profile">
          <div
            className="kw-user-chip-avatar"
            style={{ background: avatarColor(profile) }}
          >
            {profile.name[0]}
          </div>
          <div className="kw-user-chip-name">{profile.name}</div>
        </div>
      </div>

      <button
        className="kw-new-chat-btn"
        onClick={() => setShowCategoryPicker(!showCategoryPicker)}
      >
        + New Chat
      </button>

      {showCategoryPicker && (
        <CategoryPicker
          profile={profile}
          onSelect={(cat) => {
            setShowCategoryPicker(false);
            onNewChat(cat);
          }}
        />
      )}

      <div className="kw-sessions-list">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`kw-session-item ${activeSession?.id === s.id ? "active" : ""}`}
            onClick={() => onSelectSession(s)}
          >
            <div className="kw-session-title">{s.title || "New conversation"}</div>
            <div className="kw-session-meta">
              <span className="kw-category-tag">{s.category || "general"}</span>
              <span>{timeAgo(s.updated_at || s.created_at)}</span>
            </div>
          </div>
        ))}
        {sessions.length === 0 && !showCategoryPicker && (
          <div style={{ padding: "20px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: BRAND.slate, fontStyle: "italic" }}>
              No conversations yet
            </div>
          </div>
        )}
      </div>

      <div className="kw-sidebar-footer">
        <button className="kw-lock-btn" onClick={onLock}>
          🔒 Lock
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
//  CHAT AREA
// ════════════════════════════════════════════════
function ChatArea({ profile, session, messages, streaming, streamText, onSend }) {
  const [input, setInput] = useState("");
  const messagesEnd = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    onSend(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!session) {
    return (
      <div className="kw-chat">
        <div className="kw-empty">
          <SwordIcon size={48} />
          <div className="kw-empty-text">Pick a conversation or start a new one</div>
          <div className="kw-empty-hint">Your messages stay on this device</div>
        </div>
      </div>
    );
  }

  return (
    <div className="kw-chat">
      <div className="kw-chat-header">
        <div className="kw-chat-header-left">
          <SwordIcon size={24} />
          <div>
            <div className="kw-chat-model-name">{session.model_name || "Kinward"}</div>
            <div className="kw-chat-category">{session.category || "General Assistant"}</div>
          </div>
        </div>
        <span className="kw-category-tag">{session.category || "general"}</span>
      </div>

      <div className="kw-messages">
        {messages.length === 0 && !streaming && (
          <div className="kw-empty" style={{ opacity: 0.4 }}>
            <div className="kw-empty-hint">Say something to get started</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`kw-msg ${msg.role}`}>
            <div
              className={`kw-msg-avatar ${msg.role === "assistant" ? "ai" : ""}`}
              style={
                msg.role === "user"
                  ? { background: avatarColor(profile) }
                  : undefined
              }
            >
              {msg.role === "assistant" ? <SwordIcon size={20} /> : profile.name[0]}
            </div>
            <div>
              <div className="kw-msg-bubble">{msg.content}</div>
              {msg.timestamp && (
                <div className="kw-msg-time">{formatTime(msg.timestamp)}</div>
              )}
            </div>
          </div>
        ))}

        {streaming && (
          <div className="kw-msg assistant">
            <div className="kw-msg-avatar ai">
              <SwordIcon size={20} />
            </div>
            <div>
              <div className="kw-msg-bubble">
                {streamText}
                <span className="kw-cursor" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEnd} />
      </div>

      <div className="kw-input-area">
        <div className="kw-input-row">
          <div className="kw-input-wrap">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
            />
          </div>
          <button
            className="kw-send-btn"
            onClick={handleSubmit}
            disabled={!input.trim() || streaming}
          >
            <SendArrow />
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════
export default function KinwardChat() {
  const [user, setUser] = useState(null); // authenticated profile
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");

  // ── Load sessions when user logs in ──
  useEffect(() => {
    if (!user) return;
    api(`/chat/sessions?profileId=${user.id}`)
      .then((data) => setSessions(data.sessions || data || []))
      .catch(() => setSessions([]));
  }, [user]);

  // ── Load messages when session changes ──
  useEffect(() => {
    if (!activeSession) {
      setMessages([]);
      return;
    }
    // If sessions store messages inline, use those; otherwise fetch
    if (activeSession.messages) {
      setMessages(activeSession.messages);
    }
    // Could also fetch: api(`/chat/sessions/${activeSession.id}/messages`)
  }, [activeSession]);

  // ── Create new chat session ──
  const handleNewChat = async (category) => {
    try {
      const session = await api("/chat/sessions", {
        method: "POST",
        body: JSON.stringify({
          profileId: user.id,
          category,
        }),
      });
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  // ── Send message with SSE streaming ──
  const handleSend = async (text) => {
    if (!activeSession) return;

    // Optimistically add user message
    const userMsg = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamText("");

    try {
      const response = await fetch(`${API}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          profileId: user.id,
          content: text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server error ${response.status}: ${errText}`);
      }

      const contentType = response.headers.get("content-type") || "";

      // Handle non-streaming JSON response
      if (contentType.includes("application/json")) {
        const data = await response.json();
        const content = data.content || data.response || data.message || data.text || JSON.stringify(data);
        const assistantMsg = {
          role: "assistant",
          content,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Handle SSE / streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]" || data === "") continue;
              try {
                const parsed = JSON.parse(data);
                // Handle various Ollama/backend response shapes
                const token = parsed.token || parsed.response || parsed.content || parsed.message?.content || "";
                if (token) {
                  accumulated += token;
                  setStreamText(accumulated);
                }
                if (parsed.error) {
                  accumulated += `\n\n⚠️ ${parsed.error}`;
                  setStreamText(accumulated);
                }
              } catch {
                // Plain text token
                if (data.trim()) {
                  accumulated += data;
                  setStreamText(accumulated);
                }
              }
            }
          }
        }

        // Only add assistant message if we got actual content
        if (accumulated.trim()) {
          const assistantMsg = {
            role: "assistant",
            content: accumulated,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "⚠️ No response received. The model might not be loaded for this category. Try General Assistant.",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      }

      // Update session title from first message
      if (messages.length === 0) {
        const title = text.length > 40 ? text.slice(0, 40) + "…" : text;
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSession.id ? { ...s, title, updated_at: new Date().toISOString() } : s))
        );
        setActiveSession((prev) => ({ ...prev, title }));
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${err.message || "Couldn't get a response. Make sure Ollama is running and the model is loaded."}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setStreaming(false);
    setStreamText("");
  };

  // ── Lock (return to profile gate) ──
  const handleLock = () => {
    setUser(null);
    setSessions([]);
    setActiveSession(null);
    setMessages([]);
  };

  // ── Inject styles ──
  useEffect(() => {
    const id = "kw-chat-styles";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    return () => document.getElementById(id)?.remove();
  }, []);

  return (
    <div className="kw-root">
      {!user ? (
        <ProfileGate onLogin={setUser} />
      ) : (
        <div className="kw-main">
          <Sidebar
            profile={user}
            sessions={sessions}
            activeSession={activeSession}
            onSelectSession={setActiveSession}
            onNewChat={handleNewChat}
            onLock={handleLock}
          />
          <ChatArea
            profile={user}
            session={activeSession}
            messages={messages}
            streaming={streaming}
            streamText={streamText}
            onSend={handleSend}
          />
        </div>
      )}
    </div>
  );
}
