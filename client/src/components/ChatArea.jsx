import { useState, useEffect, useRef } from "react";
import { ShieldIcon, AIShieldAvatar, avatarColor, formatTime, SendArrow, BRAND, API } from "./shared";

export function ChatArea({ profile, session, messages, streaming, streamText, onSend, aiName }) {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState(null); // { documentId, filename, fileType, totalChunks, totalTokens }
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const messagesEnd = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Clear attachment when session changes
  useEffect(() => { setAttachment(null); }, [session?.id]);

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

  // ── File upload handler ──
  const handleFileUpload = async (file) => {
    if (!file || !session) return;
    const allowed = [".pdf", ".txt", ".md", ".jpg", ".jpeg", ".png"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      alert(`Unsupported file type: ${ext}\nAccepted: ${allowed.join(", ")}`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large (max 10MB)");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("profileId", profile.id);
      formData.append("sessionId", session.id);

      const res = await fetch(`${API}/chat/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      const doc = await res.json();
      setAttachment(doc);
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Upload failed: ${err.message}`);
    }
    setUploading(false);
  };

  // ── Drag & drop handlers ──
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || streaming || uploading) return;
    const docId = attachment?.documentId || null;
    setInput("");
    setAttachment(null);
    onSend(text, docId);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const fileTypeLabel = (type) => {
    const labels = { pdf: "PDF", text: "TXT", markdown: "MD", image: "IMG" };
    return labels[type] || "FILE";
  };

  const formatFileSize = (tokens) => `~${Math.round(tokens / 250)} pages`;

  if (!session) {
    return (
      <div className="kw-chat">
        <div className="kw-empty">
          <ShieldIcon size={48} />
          <div className="kw-empty-text">Pick a conversation or start a new one</div>
          <div className="kw-empty-hint">Your messages stay on this device</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="kw-chat"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: "relative" }}
    >
      {dragOver && (
        <div className="kw-drop-overlay">
          <div className="kw-drop-overlay-text">Drop file to attach</div>
        </div>
      )}

      <div className="kw-chat-header">
        <div className="kw-chat-header-left">
          <ShieldIcon size={24} />
          <div>
            <div className="kw-chat-model-name">{aiName || session.model_name || "Kinward"}</div>
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
              {msg.role === "assistant" ? <AIShieldAvatar size={20} /> : profile.name[0]}
            </div>
            <div>
              <div className="kw-msg-bubble">
                {msg.attachment && (
                  <div className="kw-attachment-card" style={{ marginBottom: 6, border: "none", padding: "4px 8px", background: "rgba(212,98,43,0.08)" }}>
                    <div className="kw-attachment-icon" style={{ width: 24, height: 24, fontSize: 10 }}>{fileTypeLabel(msg.attachment.fileType)}</div>
                    <span style={{ fontSize: 12, color: BRAND.slate }}>{msg.attachment.filename}</span>
                  </div>
                )}
                {msg.content}
              </div>
              {msg.timestamp && (
                <div className="kw-msg-time">{formatTime(msg.timestamp)}</div>
              )}
            </div>
          </div>
        ))}

        {streaming && (
          <div className="kw-msg assistant">
            <div className="kw-msg-avatar ai">
              <AIShieldAvatar size={20} />
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
        {/* Attachment card */}
        {uploading && (
          <div className="kw-attachment-card">
            <div className="kw-attachment-icon">...</div>
            <div className="kw-attachment-uploading">Uploading and processing...</div>
          </div>
        )}
        {attachment && !uploading && (
          <div className="kw-attachment-card">
            <div className="kw-attachment-icon">{fileTypeLabel(attachment.fileType)}</div>
            <div className="kw-attachment-info">
              <div className="kw-attachment-name">{attachment.filename}</div>
              <div className="kw-attachment-meta">
                {attachment.totalChunks} chunk{attachment.totalChunks !== 1 ? "s" : ""} · {formatFileSize(attachment.totalTokens)}
              </div>
            </div>
            <button className="kw-attachment-remove" onClick={() => setAttachment(null)} title="Remove attachment">×</button>
          </div>
        )}

        <div className="kw-input-row">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.jpg,.jpeg,.png"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = "";
            }}
          />
          {/* Attach button */}
          <button
            className="kw-attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={streaming || uploading}
            title="Attach a file"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <div className="kw-input-wrap">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={attachment ? `Ask about ${attachment.filename}...` : "Type a message..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
            />
          </div>
          <button
            className="kw-send-btn"
            onClick={handleSubmit}
            disabled={!input.trim() || streaming || uploading}
          >
            <SendArrow />
          </button>
        </div>
      </div>
    </div>
  );
}
