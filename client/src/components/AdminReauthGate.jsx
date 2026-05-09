import { useState, useCallback, useEffect } from "react";
import { BRAND as B, ShieldIcon, avatarColor } from "./shared";
import { PinKeypad } from "./PinKeypad";
import { reverifyPin } from "../api";

/**
 * AdminReauthGate — prompts the current admin for their PIN before entering
 * a sensitive area (Settings, profile delete, etc.).
 *
 * Unlike the initial ProfileGate, this does NOT create a new session — it
 * refreshes the admin_verified_at stamp on the existing session, which has
 * a 5-minute freshness window (set server-side).
 *
 * Props:
 *   profile   — the current admin profile
 *   onSuccess — called after reverify succeeds
 *   onCancel  — called when user backs out
 *   title     — override the default title if you want
 *   subtitle  — optional explanatory subtitle
 */

export function AdminReauthGate({ profile, onSuccess, onCancel, title, subtitle }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Inject minimal styles if the gate CSS isn't already on the page
    const id = "kw-gate-styles-reauth";
    if (!document.getElementById(id) && !document.getElementById("kw-gate-styles")) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        .kw-reauth-root {
          background: ${B.cream};
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Lora', Georgia, serif;
        }
        .kw-reauth-box {
          background: ${B.warmWhite};
          border: 1px solid ${B.mist};
          border-radius: 20px;
          padding: 40px 36px;
          width: 360px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          box-shadow: 0 12px 40px rgba(44,44,44,0.08);
        }
        .kw-reauth-title {
          font-family: 'DM Mono', monospace;
          font-size: 14px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: ${B.orange};
          text-align: center;
        }
        .kw-reauth-sub {
          font-size: 13px;
          color: ${B.slate};
          text-align: center;
          line-height: 1.5;
          max-width: 280px;
        }
        .kw-reauth-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: 'DM Mono', monospace;
          font-size: 22px;
          font-weight: 500;
        }
        .kw-pin-dots { display: flex; gap: 12px; }
        .kw-pin-dot {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid ${B.mist};
          transition: all 0.15s ease;
        }
        .kw-pin-dot.filled { background: ${B.orange}; border-color: ${B.orange}; }
        .kw-pin-dot.error { border-color: ${B.red}; background: ${B.red}; }
        .kw-pin-keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .kw-pin-key {
          width: 60px; height: 52px;
          border: 1px solid ${B.mist};
          border-radius: 10px;
          background: white;
          font-family: 'DM Mono', monospace;
          font-size: 20px;
          color: ${B.charcoal};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.12s ease;
        }
        .kw-pin-key:hover { background: ${B.orangeFaint}; border-color: ${B.orangeLight}; }
        .kw-pin-key.action { font-size: 12px; color: ${B.slate}; border: none; background: transparent; }
        .kw-pin-error { font-family: 'DM Mono', monospace; font-size: 11px; color: ${B.red}; min-height: 14px; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
    setErrorMsg("");
  };

  const handleKey = useCallback(
    async (digit) => {
      if (loading) return;
      setError(false);
      setErrorMsg("");
      const next = pin + digit;
      setPin(next);

      if (next.length === 4) {
        setLoading(true);
        try {
          await reverifyPin(profile.id, next);
          onSuccess();
        } catch (err) {
          const msg = String(err?.message || "");
          if (msg.toLowerCase().includes("too many")) {
            setError(true);
            setErrorMsg("Locked out — try again later");
            setTimeout(() => { setPin(""); setError(false); setErrorMsg(""); }, 1500);
          } else {
            setError(true);
            setErrorMsg("Wrong PIN — try again");
            setTimeout(() => { setPin(""); setError(false); setErrorMsg(""); }, 700);
          }
        } finally {
          setLoading(false);
        }
      }
    },
    [pin, loading, profile, onSuccess]
  );

  return (
    <div className="kw-reauth-root">
      <div className="kw-reauth-box">
        <ShieldIcon size={32} />
        <div className="kw-reauth-title">{title || "Admin verification"}</div>
        <div className="kw-reauth-avatar" style={{ background: avatarColor(profile) }}>
          {profile.name[0].toUpperCase()}
        </div>
        <div className="kw-reauth-sub">
          {subtitle ||
            `Enter your PIN to confirm it's you, ${profile.name}. You won't be asked again for a few minutes.`}
        </div>

        <PinKeypad
          pin={pin}
          error={error}
          onKey={handleKey}
          onBackspace={handleBackspace}
          onCancel={onCancel}
        />

        <div className="kw-pin-error">{errorMsg || "\u00A0"}</div>

        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "none",
            color: B.slate,
            fontFamily: "'DM Mono', monospace",
            fontSize: 12,
            letterSpacing: 1,
            cursor: "pointer",
            marginTop: -8,
          }}
        >
          ← Cancel
        </button>
      </div>
    </div>
  );
}
