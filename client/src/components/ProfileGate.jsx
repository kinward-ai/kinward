import { useState, useEffect } from "react";
import { ShieldIcon, avatarColor, api, BRAND as B } from "./shared";
import { PinModal } from "./PinModal";

/**
 * ProfileGate — self-contained login screen.
 *
 * Injects its own CSS on mount so it works whether it's rendered directly
 * by KinwardApp or embedded inside KinwardChat.
 */

const GATE_CSS = `
@keyframes kw-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes kw-slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes kw-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

.kw-gate-root {
  background: ${B.cream};
  color: ${B.charcoal};
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
}

.kw-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 40px;
  animation: kw-fadeIn 0.5s ease;
  padding: 20px;
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
  color: ${B.charcoal};
}
.kw-gate-sub {
  font-size: 15px;
  color: ${B.slate};
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
  background: transparent;
  border: none;
  padding: 0;
  font-family: inherit;
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
  box-shadow: 0 4px 12px ${B.shadow};
  transition: box-shadow 0.2s ease;
}
.kw-profile-card:hover .kw-avatar {
  box-shadow: 0 6px 20px rgba(212,98,43,0.2);
}
.kw-profile-name {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  color: ${B.charcoal};
}
.kw-profile-role {
  font-size: 11px;
  color: ${B.slate};
  font-family: 'DM Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* PIN Modal */
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
  background: ${B.warmWhite};
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
  color: ${B.slate};
}
.kw-pin-dots {
  display: flex;
  gap: 12px;
}
.kw-pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid ${B.mist};
  transition: all 0.15s ease;
}
.kw-pin-dot.filled {
  background: ${B.orange};
  border-color: ${B.orange};
}
.kw-pin-dot.error {
  border-color: ${B.red};
  background: ${B.red};
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
  border: 1px solid ${B.mist};
  border-radius: 12px;
  background: white;
  font-family: 'DM Mono', monospace;
  font-size: 22px;
  color: ${B.charcoal};
  cursor: pointer;
  transition: all 0.12s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.kw-pin-key:hover { background: ${B.orangeFaint}; border-color: ${B.orangeLight}; }
.kw-pin-key:active { transform: scale(0.95); }
.kw-pin-key.action {
  font-size: 13px;
  color: ${B.slate};
  border: none;
  background: transparent;
}
.kw-pin-key.action:hover { color: ${B.orange}; background: transparent; }
.kw-pin-error {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: ${B.red};
  min-height: 18px;
}
`;

export function ProfileGate({ onLogin }) {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // Inject gate styles (self-contained, idempotent)
  useEffect(() => {
    const id = "kw-gate-styles";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = GATE_CSS;
      document.head.appendChild(style);
    }
    return () => {
      // leave styles in place — Chat may still be using overlapping class names
    };
  }, []);

  useEffect(() => {
    api("/profiles")
      .then((data) => setProfiles(data.profiles || data))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="kw-gate-root">
        <div className="kw-gate">
          <div className="kw-gate-brand">
            <ShieldIcon size={40} />
            <div className="kw-gate-title">KINWARD</div>
            <div className="kw-gate-sub">Loading profiles...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kw-gate-root">
      <div className="kw-gate">
        <div className="kw-gate-brand">
          <ShieldIcon size={40} />
          <div className="kw-gate-title">KINWARD</div>
          <div className="kw-gate-sub">Who's here?</div>
        </div>

        <div className="kw-profiles-grid">
          {profiles.map((p) => (
            <button
              key={p.id}
              className="kw-profile-card"
              onClick={() => setSelected(p)}
              type="button"
            >
              <div className="kw-avatar" style={{ background: avatarColor(p) }}>
                {p.name[0].toUpperCase()}
              </div>
              <div className="kw-profile-name">{p.name}</div>
              <div className="kw-profile-role">{p.role}</div>
            </button>
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
    </div>
  );
}
