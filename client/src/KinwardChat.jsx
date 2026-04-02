import { useState, useEffect } from "react";
import { api, BRAND } from "./components/shared";
import { ProfileGate } from "./components/ProfileGate";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { OllamaStatus } from "./components/OllamaStatus";

/* ─────────────────────────────────────────────
   KINWARD CHAT INTERFACE
   Profile gate → Sidebar → Streaming chat
   Connects to backend on :3210
   ───────────────────────────────────────────── */

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
  overflow: hidden;
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
  min-height: 0;
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

/* ── Attachment / Document Drop ─── */
.kw-attach-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${BRAND.mist};
  background: white;
  color: ${BRAND.slate};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.kw-attach-btn:hover { border-color: ${BRAND.orangeLight}; color: ${BRAND.orange}; }
.kw-attach-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.kw-attachment-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: ${BRAND.orangeFaint};
  border: 1px solid ${BRAND.orangeLight};
  border-radius: 10px;
  margin-bottom: 8px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  animation: kw-fadeIn 0.3s ease;
}
.kw-attachment-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${BRAND.orange};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  font-family: 'DM Mono', monospace;
}
.kw-attachment-info {
  flex: 1;
  min-width: 0;
}
.kw-attachment-name {
  font-size: 13px;
  font-weight: 600;
  color: ${BRAND.charcoal};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kw-attachment-meta {
  font-size: 11px;
  color: ${BRAND.slate};
  font-family: 'DM Mono', monospace;
}
.kw-attachment-remove {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${BRAND.slate};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
}
.kw-attachment-remove:hover { background: ${BRAND.mist}; color: ${BRAND.red}; }

.kw-attachment-uploading {
  font-size: 12px;
  color: ${BRAND.orange};
  font-family: 'DM Mono', monospace;
  animation: kw-blink 1s ease infinite;
}

.kw-drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(212, 98, 43, 0.08);
  border: 2px dashed ${BRAND.orange};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}
.kw-drop-overlay-text {
  font-family: 'DM Mono', monospace;
  font-size: 15px;
  color: ${BRAND.orange};
  background: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px ${BRAND.shadow};
}

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

// ════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════
export default function KinwardChat({ onOpenSettings }) {
  const [user, setUser] = useState(null); // authenticated profile
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [aiName, setAiName] = useState("Lumina"); // AI identity name

  // ── Load AI identity on mount ──
  useEffect(() => {
    api("/system/identity")
      .then((data) => { if (data.name) setAiName(data.name); })
      .catch(() => {}); // fallback to "Lumina"
  }, []);

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
  const handleSend = async (text, documentId = null) => {
    if (!activeSession) return;

    // Optimistically add user message (with attachment info if present)
    const userMsg = { role: "user", content: text, timestamp: new Date().toISOString() };
    if (documentId) userMsg.attachment = { documentId };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setStreamText("");

    try {
      const response = await fetch(`/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          profileId: user.id,
          content: text,
          ...(documentId && { documentId }),
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
      const msg = err.message || "";
      let friendlyError;
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ECONNREFUSED")) {
        friendlyError = "Lumina can't reach the server right now. Check that the app is running properly.";
      } else if (msg.includes("model") && msg.includes("not found")) {
        friendlyError = "The AI model for this conversation isn't installed. Try switching to General Assistant, or go to Settings to install a model.";
      } else if (msg.includes("500") || msg.includes("Ollama")) {
        friendlyError = "Lumina is having trouble thinking right now. Ollama might need a restart — check the status banner above.";
      } else {
        friendlyError = msg || "Something went wrong. Make sure Ollama is running and a model is loaded.";
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `💤 ${friendlyError}`,
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
            onOpenSettings={onOpenSettings ? () => onOpenSettings(user) : null}
            aiName={aiName}
          />
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <OllamaStatus />
            <ChatArea
              profile={user}
              session={activeSession}
              messages={messages}
              streaming={streaming}
              streamText={streamText}
              onSend={handleSend}
              aiName={aiName}
            />
          </div>
        </div>
      )}
    </div>
  );
}
