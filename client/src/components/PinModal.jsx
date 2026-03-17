import { useState, useEffect, useCallback } from "react";
import { BRAND, api, avatarColor } from "./shared";
import { PinKeypad } from "./PinKeypad";

export function PinModal({ profile, onSuccess, onCancel }) {
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
