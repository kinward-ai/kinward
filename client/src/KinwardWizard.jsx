import { useState, useEffect, useRef, useCallback } from "react";
import * as API from "./api";

// ============================================================
// PIXEL ART SWORD & SHIELD (64px base, canvas-drawn)
// ============================================================
function SwordAndShield({ size = 128, animate = false, state = "idle" }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const scale = size / 64;

    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.scale(scale, scale);

      const bounce = animate ? Math.sin(frameRef.current * 0.06) * 1.5 : 0;
      const shieldGlow =
        state === "shield" ? Math.abs(Math.sin(frameRef.current * 0.08)) * 0.4 : 0;

      ctx.fillStyle = "rgba(0,0,0,0.10)";
      ctx.beginPath();
      ctx.ellipse(32, 60 - bounce * 0.3, 18, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      const sy = 18 + bounce;
      if (shieldGlow > 0) {
        ctx.fillStyle = `rgba(199, 91, 42, ${shieldGlow * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(24, sy + 14, 16, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#A0754A";
      ctx.fillRect(14, sy, 20, 28);
      ctx.beginPath();
      ctx.arc(24, sy + 2, 10, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, sy + 26);
      ctx.lineTo(24, sy + 34);
      ctx.lineTo(34, sy + 26);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#C4955E";
      ctx.fillRect(16, sy + 2, 7, 24);
      ctx.fillRect(25, sy + 2, 7, 24);

      ctx.fillStyle = "#8B7355";
      ctx.fillRect(14, sy + 10, 20, 3);
      ctx.fillRect(22, sy, 4, 28);

      ctx.fillStyle = "#C75B2A";
      ctx.beginPath();
      ctx.arc(24, sy + 14, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#E8824A";
      ctx.beginPath();
      ctx.arc(24, sy + 13, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#5C3D1E";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(14, sy + 2);
      ctx.arc(24, sy + 2, 10, Math.PI, 0);
      ctx.lineTo(34, sy + 26);
      ctx.lineTo(24, sy + 34);
      ctx.lineTo(14, sy + 26);
      ctx.closePath();
      ctx.stroke();

      const sx = 34;
      const swy = 8 + bounce;
      ctx.save();
      ctx.translate(sx + 6, swy + 24);
      ctx.rotate(-0.35);
      ctx.translate(-(sx + 6), -(swy + 24));

      ctx.fillStyle = "#D4D0C8";
      ctx.fillRect(sx + 4, swy, 4, 22);
      ctx.fillStyle = "#EEEAE2";
      ctx.fillRect(sx + 5, swy, 2, 22);
      ctx.beginPath();
      ctx.moveTo(sx + 4, swy);
      ctx.lineTo(sx + 6, swy - 5);
      ctx.lineTo(sx + 8, swy);
      ctx.closePath();
      ctx.fillStyle = "#D4D0C8";
      ctx.fill();
      ctx.fillStyle = "#EEEAE2";
      ctx.beginPath();
      ctx.moveTo(sx + 5, swy);
      ctx.lineTo(sx + 6, swy - 4);
      ctx.lineTo(sx + 7, swy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#A0754A";
      ctx.fillRect(sx, swy + 22, 12, 3);
      ctx.fillStyle = "#8B7355";
      ctx.fillRect(sx + 1, swy + 23, 10, 1);

      ctx.fillStyle = "#7A5C3A";
      ctx.fillRect(sx + 4, swy + 25, 4, 10);
      ctx.fillStyle = "#5C3D1E";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(sx + 4, swy + 26 + i * 3, 4, 1);
      }

      ctx.fillStyle = "#C75B2A";
      ctx.beginPath();
      ctx.arc(sx + 6, swy + 37, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#E8824A";
      ctx.beginPath();
      ctx.arc(sx + 6, swy + 36, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#888";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sx + 4, swy + 22);
      ctx.lineTo(sx + 4, swy);
      ctx.lineTo(sx + 6, swy - 5);
      ctx.lineTo(sx + 8, swy);
      ctx.lineTo(sx + 8, swy + 22);
      ctx.stroke();

      ctx.restore();
      ctx.restore();
      frameRef.current++;
      if (animate) animId = requestAnimationFrame(draw);
    };

    draw();
    if (animate) animId = requestAnimationFrame(draw);
    return () => { if (animId) cancelAnimationFrame(animId); };
  }, [size, animate, state]);

  return (
    <canvas ref={canvasRef} width={size} height={size}
      style={{ imageRendering: "pixelated", width: size, height: size }} />
  );
}

// ============================================================
// SHARED UI
// ============================================================
function LoadingDots() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontFamily: "monospace", minWidth: 24, display: "inline-block" }}>{dots}</span>;
}

const COLORS = {
  cream: "#F5E6D0", creamLight: "#FBF4EB", orange: "#C75B2A", orangeLight: "#E8824A",
  orangeFaint: "rgba(199,91,42,0.08)", wood: "#A0754A", woodDark: "#5C3D1E", woodMid: "#7A5C3A",
  text: "#3D2E1F", textMuted: "#8B7355", border: "#DDD0C0", white: "#FBF8F3",
  green: "#4A8B3F", red: "#B5442E",
};

const STEPS = ["Welcome", "Setup Check", "Environment", "Your Profile", "Family", "AI Models", "Ready"];

const baseBtn = {
  fontFamily: "'Courier New', Courier, monospace", fontSize: 15, fontWeight: 700,
  border: "none", borderRadius: 8, cursor: "pointer", padding: "14px 32px",
  transition: "all 0.18s ease", letterSpacing: 0.5,
  minHeight: 48, // 48px minimum for mobile tap targets
};
const primaryBtn = { ...baseBtn, background: COLORS.orange, color: COLORS.white };
const secondaryBtn = { ...baseBtn, background: "transparent", color: COLORS.orange, border: `2px solid ${COLORS.orange}` };
const inputStyle = {
  fontFamily: "'Courier New', Courier, monospace", fontSize: 16, // 16px prevents iOS zoom on focus
  padding: "12px 14px",
  border: `2px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.white,
  color: COLORS.text, outline: "none", width: "100%", boxSizing: "border-box",
  transition: "border-color 0.15s",
  minHeight: 48, // mobile tap target
};

function BtnPrimary({ children, onClick, disabled, style = {} }) {
  return (
    <button style={{ ...primaryBtn, opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? "none" : "auto", ...style }}
      onClick={onClick}
      onMouseOver={(e) => !disabled && (e.target.style.background = COLORS.orangeLight)}
      onMouseOut={(e) => !disabled && (e.target.style.background = COLORS.orange)}>
      {children}
    </button>
  );
}

// ============================================================
// STEP 0: WELCOME
// ============================================================
function StepWelcome({ onNext }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: 420, opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(24px)",
      transition: "all 0.6s cubic-bezier(.4,0,.2,1)",
    }}>
      <SwordAndShield size={128} animate state="idle" />
      <h1 style={{ fontFamily: "'Courier New', monospace", fontSize: 36, color: COLORS.text, margin: "18px 0 4px", letterSpacing: 2 }}>KINWARD</h1>
      <p style={{ fontFamily: "'Courier New', monospace", fontSize: 13, color: COLORS.orange, letterSpacing: 3, margin: "0 0 18px", textTransform: "uppercase" }}>Your Family's AI Guardian</p>
      <p style={{ fontFamily: "'Georgia', serif", fontSize: 17, color: COLORS.textMuted, maxWidth: 380, textAlign: "center", lineHeight: 1.6, margin: "0 0 32px" }}>
        Let's set up your home AI — private, protected, and built around your family. This takes about 5 minutes.
      </p>
      <BtnPrimary onClick={onNext}>Get Started</BtnPrimary>
    </div>
  );
}

// ============================================================
// STEP 1: AUTO-DETECT (combined Ollama check + hardware scan)
// ============================================================
function StepAutoDetect({ data, setData, onNext }) {
  const [phase, setPhase] = useState("scanning"); // scanning | ready | ollama-missing | error
  const [hardware, setHardware] = useState(null);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  const hasAdvanced = useRef(false);

  const runDetect = useCallback(async () => {
    setPhase("scanning");
    setError(null);
    try {
      const result = await API.autoDetect();
      if (!result.ollamaRunning) {
        setPhase("ollama-missing");
        return;
      }
      if (result.hardware) {
        setHardware(result.hardware);
        setData((d) => ({ ...d, hardware: result.hardware }));
        setPhase("ready");
        if (!hasAdvanced.current) {
          hasAdvanced.current = true;
          setTimeout(() => onNextRef.current(), 2000);
        }
      } else {
        setError(result.error || "Could not detect hardware.");
        setPhase("error");
      }
    } catch (err) {
      setPhase("ollama-missing");
    }
  }, [setData]);

  useEffect(() => { runDetect(); }, []);

  const retry = async () => {
    setRetrying(true);
    await new Promise((r) => setTimeout(r, 1500));
    await runDetect();
    setRetrying(false);
  };

  const tierColors = { excellent: COLORS.green, good: "#5B8FB9", basic: COLORS.orange };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 420, paddingTop: 32 }}>
      <SwordAndShield size={96} animate={phase === "scanning"} state={phase === "ready" ? "shield" : "idle"} />

      {phase === "scanning" && (
        <>
          <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.text, margin: "16px 0 8px" }}>
            Checking your setup<LoadingDots />
          </h2>
          <p style={{ fontFamily: "'Georgia', serif", fontSize: 15, color: COLORS.textMuted, textAlign: "center", maxWidth: 340, lineHeight: 1.5 }}>
            Looking for your AI engine and scanning hardware.
          </p>
        </>
      )}

      {phase === "ready" && hardware && (
        <>
          <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.green, margin: "16px 0 8px" }}>
            Looking good!
          </h2>
          <div style={{
            background: COLORS.orangeFaint, border: `1.5px solid ${COLORS.border}`, borderRadius: 10,
            padding: "20px 24px", maxWidth: 380, width: "100%", marginTop: 8, textAlign: "center",
          }}>
            <div style={{
              fontFamily: "'Courier New', monospace", fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 8,
            }}>
              {hardware.friendlySummary || `${hardware.ram} memory`}
            </div>
            <div style={{
              display: "inline-block", fontFamily: "'Courier New', monospace", fontSize: 11,
              color: tierColors[hardware.tier] || COLORS.text, background: `${tierColors[hardware.tier] || COLORS.border}18`,
              padding: "3px 10px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700,
            }}>
              {hardware.tier}
            </div>
            <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, margin: "12px 0 0" }}>
              {hardware.message}
            </p>
          </div>
          <p style={{ fontFamily: "'Georgia', serif", fontSize: 13, color: COLORS.textMuted, marginTop: 12 }}>
            Moving on...
          </p>
        </>
      )}

      {phase === "error" && (
        <>
          <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.text, margin: "16px 0 8px" }}>
            Couldn't detect hardware
          </h2>
          <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: COLORS.red, marginBottom: 16, textAlign: "center", maxWidth: 360 }}>
            {error}
          </p>
          <BtnPrimary onClick={onNext}>Continue Anyway</BtnPrimary>
        </>
      )}

      {phase === "ollama-missing" && (
        <>
          <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.text, margin: "16px 0 8px" }}>
            One more thing needed
          </h2>
          <p style={{ fontFamily: "'Georgia', serif", fontSize: 15, color: COLORS.textMuted, textAlign: "center", maxWidth: 380, lineHeight: 1.6, margin: "0 0 20px" }}>
            Kinward needs Ollama to run AI models on your hardware. It's free, open-source, and takes about a minute to install.
          </p>

          <div style={{
            background: COLORS.orangeFaint, border: `1.5px solid ${COLORS.border}`, borderRadius: 10,
            padding: "20px 24px", maxWidth: 380, width: "100%", marginBottom: 20,
          }}>
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 700, color: COLORS.text, margin: "0 0 12px" }}>
              Three quick steps:
            </p>
            <div style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: COLORS.text, lineHeight: 1.8 }}>
              <div><span style={{ color: COLORS.orange, fontWeight: 700 }}>1.</span> Click the download button below</div>
              <div><span style={{ color: COLORS.orange, fontWeight: 700 }}>2.</span> Run the installer (just click Next a few times)</div>
              <div><span style={{ color: COLORS.orange, fontWeight: 700 }}>3.</span> Come back here and click "Check Again"</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer"
              style={{ ...primaryBtn, textDecoration: "none", display: "inline-block", textAlign: "center" }}>
              Download Ollama
            </a>
            <button style={{ ...secondaryBtn, opacity: retrying ? 0.5 : 1 }} onClick={retry} disabled={retrying}>
              {retrying ? "Checking..." : "Check Again"}
            </button>
          </div>

          <p style={{ fontFamily: "'Georgia', serif", fontSize: 12, color: COLORS.textMuted, marginTop: 16, textAlign: "center" }}>
            Already installed? Make sure Ollama is running — look for the llama icon in your system tray.
          </p>
        </>
      )}
    </div>
  );
}

// ============================================================
// STEP 3: ENVIRONMENT MODE
// ============================================================
function StepEnvironment({ data, setData, onNext }) {
  const modes = [
    { id: "open", label: "Open", desc: "Standard mode. Marketplace access, updates, and online features enabled.", icon: "\u{1F310}" },
    { id: "secured", label: "Secured", desc: "Internet limited to approved functions only. You control what connects.", icon: "\u{1F6E1}\u{FE0F}" },
    { id: "lockdown", label: "Lockdown", desc: "Zero internet access. Everything runs locally. Models and Recipes are sideloaded.", icon: "\u{1F512}" },
  ];

  const handleNext = async () => {
    try {
      await API.setConfig("env_mode", data.envMode);
    } catch {}
    onNext();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 420, paddingTop: 24 }}>
      <SwordAndShield size={80} animate={false} state="shield" />
      <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.text, margin: "14px 0 4px" }}>Choose your privacy level</h2>
      <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: COLORS.textMuted, textAlign: "center", maxWidth: 360, lineHeight: 1.5, margin: "0 0 20px" }}>
        This controls how your Kinward node connects to the outside world. You can change this anytime.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 400, marginBottom: 24 }}>
        {modes.map((m) => {
          const selected = data.envMode === m.id;
          return (
            <button key={m.id} onClick={() => setData((d) => ({ ...d, envMode: m.id }))} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              background: selected ? COLORS.orangeFaint : COLORS.white,
              border: `2px solid ${selected ? COLORS.orange : COLORS.border}`,
              borderRadius: 10, padding: "14px 16px", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 22, marginTop: 2 }}>{m.icon}</span>
              <div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 16, fontWeight: 700, color: selected ? COLORS.orange : COLORS.text }}>{m.label}</div>
                <div style={{ fontFamily: "'Georgia', serif", fontSize: 13, color: COLORS.textMuted, marginTop: 3, lineHeight: 1.4 }}>{m.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
      <BtnPrimary onClick={handleNext} disabled={!data.envMode}>Continue</BtnPrimary>
    </div>
  );
}

// ============================================================
// STEP 4: ADMIN PROFILE
// ============================================================
function StepAdminProfile({ data, setData, onNext }) {
  const [name, setName] = useState(data.adminName || "");
  const [pin, setPin] = useState(data.adminPin || "");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (!name.trim()) { setError("Enter your name to continue."); return; }
    if (pin.length < 4) { setError("PIN must be at least 4 digits."); return; }
    if (pin !== pinConfirm) { setError("PINs don't match."); return; }
    setData((d) => ({ ...d, adminName: name.trim(), adminPin: pin }));
    onNext();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 420, paddingTop: 24 }}>
      <SwordAndShield size={72} animate={false} state="idle" />
      <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.text, margin: "14px 0 4px" }}>Create your profile</h2>
      <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: COLORS.textMuted, textAlign: "center", maxWidth: 360, lineHeight: 1.5, margin: "0 0 20px" }}>
        You'll be the Admin — the one who manages the family node, controls access, and approves Recipes.
      </p>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <label style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, display: "block" }}>Your Name</label>
        <input style={inputStyle} value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="e.g. Alex"
          onFocus={(e) => (e.target.style.borderColor = COLORS.orange)} onBlur={(e) => (e.target.style.borderColor = COLORS.border)} />

        <label style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, marginTop: 16, display: "block" }}>4-Digit PIN</label>
        <input style={{ ...inputStyle, letterSpacing: 6 }} value={pin} type="password" inputMode="numeric" maxLength={8}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }} placeholder="••••"
          onFocus={(e) => (e.target.style.borderColor = COLORS.orange)} onBlur={(e) => (e.target.style.borderColor = COLORS.border)} />

        <label style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, marginTop: 16, display: "block" }}>Confirm PIN</label>
        <input style={{ ...inputStyle, letterSpacing: 6 }} value={pinConfirm} type="password" inputMode="numeric" maxLength={8}
          onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, "")); setError(""); }} placeholder="••••"
          onFocus={(e) => (e.target.style.borderColor = COLORS.orange)} onBlur={(e) => (e.target.style.borderColor = COLORS.border)} />

        {error && <p style={{ fontFamily: "'Courier New', monospace", fontSize: 13, color: COLORS.red, marginTop: 10 }}>{error}</p>}
        <p style={{ fontFamily: "'Georgia', serif", fontSize: 12, color: COLORS.textMuted, marginTop: 12, lineHeight: 1.5 }}>
          Your PIN keeps your conversations and settings private. Even other admins can't read your chats.
        </p>
        <div style={{ textAlign: "center", marginTop: 20 }}><BtnPrimary onClick={handleContinue}>Continue</BtnPrimary></div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 5: FAMILY MEMBERS
// ============================================================
// Family shape presets — one tap scaffolds a common household
const FAMILY_PRESETS = [
  { id: "just-me", label: "Just Me", icon: "🧑", members: [] },
  { id: "couple", label: "Couple", icon: "👫", members: [{ name: "Partner", role: "co-admin" }] },
  {
    id: "family-4",
    label: "Family of 4",
    icon: "👨‍👩‍👧‍👦",
    members: [
      { name: "Partner", role: "co-admin" },
      { name: "Child 1", role: "teen" },
      { name: "Child 2", role: "child" },
    ],
  },
  {
    id: "family-6",
    label: "Family of 6",
    icon: "👨‍👩‍👧‍👦",
    members: [
      { name: "Partner", role: "co-admin" },
      { name: "Child 1", role: "teen" },
      { name: "Child 2", role: "teen" },
      { name: "Child 3", role: "child" },
      { name: "Child 4", role: "child" },
    ],
  },
];

function StepFamily({ data, setData, onNext }) {
  const [members, setMembers] = useState(data.familyMembers || []);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("teen");
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);

  const roles = [
    { id: "co-admin", label: "Co-Admin", desc: "Full access, shares admin privileges" },
    { id: "teen", label: "Teen (13\u201317)", desc: "Moderate guardrails, age-appropriate access" },
    { id: "child", label: "Child (5\u201312)", desc: "Strict guardrails, curated Recipes only" },
  ];

  const applyPreset = (preset) => {
    setSelectedPreset(preset.id);
    const presetMembers = preset.members.map((m) => ({ ...m }));
    setMembers(presetMembers);
    setData((d) => ({ ...d, familyMembers: presetMembers }));
    setAdding(false);
  };

  const addMember = () => {
    if (!newName.trim()) return;
    const updated = [...members, { name: newName.trim(), role: newRole }];
    setMembers(updated);
    setData((d) => ({ ...d, familyMembers: updated }));
    setNewName("");
    setNewRole("teen");
    setAdding(false);
  };

  const removeMember = (i) => {
    const updated = members.filter((_, idx) => idx !== i);
    setMembers(updated);
    setData((d) => ({ ...d, familyMembers: updated }));
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      const result = await API.batchCreateProfiles(
        { name: data.adminName, pin: data.adminPin },
        members
      );
      setData((d) => ({ ...d, profiles: result.profiles, familyMembers: members }));
    } catch (err) {
      console.error("Profile creation failed:", err);
    }
    setSaving(false);
    onNext();
  };

  const roleLabel = (id) => roles.find((r) => r.id === id)?.label || id;
  const roleColor = (id) => id === "co-admin" ? COLORS.orange : id === "teen" ? "#5B8FB9" : COLORS.green;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 420, paddingTop: 24 }}>
      <SwordAndShield size={72} animate={false} state="idle" />
      <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.text, margin: "14px 0 4px" }}>Add your family</h2>
      <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: COLORS.textMuted, textAlign: "center", maxWidth: 380, lineHeight: 1.5, margin: "0 0 16px" }}>
        Pick a household shape to get started, then customize the names. You can always add more later.
      </p>

      {/* Family shape presets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 400 }}>
        {FAMILY_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: "12px 10px", minWidth: 76, flex: "1 1 0",
              border: `2px solid ${selectedPreset === preset.id ? COLORS.orange : COLORS.border}`,
              borderRadius: 10,
              background: selectedPreset === preset.id ? COLORS.orangeFaint : COLORS.white,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: 22 }}>{preset.icon}</span>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 600, color: selectedPreset === preset.id ? COLORS.orange : COLORS.text }}>
              {preset.label}
            </span>
          </button>
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Admin card */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.orangeFaint, border: `1.5px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.orange, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", fontSize: 16, fontWeight: 700, color: COLORS.white }}>
            {(data.adminName || "A")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: 15, fontWeight: 700, color: COLORS.text }}>{data.adminName || "Admin"}</div>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: COLORS.orange, textTransform: "uppercase", letterSpacing: 1 }}>Admin</div>
          </div>
        </div>

        {members.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.white, border: `1.5px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: roleColor(m.role), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", fontSize: 16, fontWeight: 700, color: COLORS.white }}>
              {m.name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <input
                value={m.name}
                onChange={(e) => {
                  const updated = [...members];
                  updated[i] = { ...updated[i], name: e.target.value };
                  setMembers(updated);
                  setData((d) => ({ ...d, familyMembers: updated }));
                }}
                style={{
                  fontFamily: "'Courier New', monospace", fontSize: 15, fontWeight: 700, color: COLORS.text,
                  border: "none", borderBottom: `1px solid transparent`, background: "transparent",
                  outline: "none", width: "100%", padding: 0,
                }}
                onFocus={(e) => (e.target.style.borderBottomColor = COLORS.orange)}
                onBlur={(e) => (e.target.style.borderBottomColor = "transparent")}
                placeholder="Name"
              />
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: roleColor(m.role), textTransform: "uppercase", letterSpacing: 1 }}>{roleLabel(m.role)}</div>
            </div>
            <button onClick={() => removeMember(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: COLORS.textMuted, padding: 4 }}>&times;</button>
          </div>
        ))}

        {adding ? (
          <div style={{ background: COLORS.white, border: `2px solid ${COLORS.orange}`, borderRadius: 10, padding: 16, marginTop: 6 }}>
            <input style={{ ...inputStyle, marginBottom: 10 }} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" autoFocus
              onFocus={(e) => (e.target.style.borderColor = COLORS.orange)} onBlur={(e) => (e.target.style.borderColor = COLORS.border)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {roles.map((r) => (
                <button key={r.id} onClick={() => setNewRole(r.id)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                  border: `1.5px solid ${newRole === r.id ? roleColor(r.id) : COLORS.border}`,
                  borderRadius: 6, background: newRole === r.id ? `${roleColor(r.id)}10` : "transparent", cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${newRole === r.id ? roleColor(r.id) : COLORS.border}`, background: newRole === r.id ? roleColor(r.id) : "transparent" }} />
                  <div>
                    <div style={{ fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 700, color: COLORS.text }}>{r.label}</div>
                    <div style={{ fontFamily: "'Georgia', serif", fontSize: 11, color: COLORS.textMuted }}>{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...primaryBtn, padding: "8px 20px", fontSize: 13 }} onClick={addMember}>Add</button>
              <button style={{ ...secondaryBtn, padding: "8px 20px", fontSize: 13 }} onClick={() => { setAdding(false); setNewName(""); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ ...secondaryBtn, width: "100%", marginTop: 6, padding: "10px", fontSize: 13, borderStyle: "dashed" }}>+ Add Family Member</button>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <BtnPrimary onClick={handleContinue} disabled={saving}>
            {saving ? "Saving..." : members.length === 0 ? "Skip for Now" : "Continue"}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 5: AI MODELS (conversational download with real progress)
// ============================================================
const OLLAMA_MODELS = {
  general: { ollama: "llama3.1:8b", display: "Llama 3.1 8B", size: "4.7 GB" },
  kids: { ollama: "phi3:mini", display: "Phi-3 Mini", size: "2.3 GB" },
  research: { ollama: "mistral-nemo", display: "Mistral Nemo 12B", size: "7.1 GB" },
  creative: { ollama: "llama3.1:8b", display: "Llama 3.1 8B (Creative)", size: "4.7 GB" },
};

const DOWNLOAD_PHASES = [
  { maxPercent: 10, heading: "Waking up the brain...", subtext: "Connecting to the model library" },
  { maxPercent: 40, heading: "Downloading knowledge...", subtext: "This is the big part" },
  { maxPercent: 70, heading: "More than halfway there...", subtext: "Your AI is taking shape" },
  { maxPercent: 90, heading: "Putting the finishing touches on...", subtext: "Almost ready to think" },
  { maxPercent: 99, heading: "Nearly ready...", subtext: "Just a moment more" },
  { maxPercent: 100, heading: "All done!", subtext: "Your AI brain is installed" },
];

function getDownloadPhase(percent) {
  return DOWNLOAD_PHASES.find((p) => percent <= p.maxPercent) || DOWNLOAD_PHASES[DOWNLOAD_PHASES.length - 1];
}

function formatTimeRemaining(seconds) {
  if (seconds == null || seconds <= 0) return null;
  if (seconds < 15) return "Almost there...";
  if (seconds < 90) return "Less than a minute remaining";
  const mins = Math.ceil(seconds / 60);
  return `About ${mins} minute${mins !== 1 ? "s" : ""} remaining`;
}

function StepModels({ data, setData, onNext }) {
  const [recommendation, setRecommendation] = useState(null);
  const [installing, setInstalling] = useState(null); // category being installed
  const [installed, setInstalled] = useState({});
  const [progress, setProgress] = useState(0); // 0-1
  const [eta, setEta] = useState(null); // seconds remaining
  const [error, setError] = useState(null);
  const [allDone, setAllDone] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedOptional, setSelectedOptional] = useState({});
  const wsRef = useRef(null);

  // Fetch recommendation
  useEffect(() => {
    API.getRecommendation()
      .then(setRecommendation)
      .catch(() => {
        setRecommendation({
          primary: OLLAMA_MODELS.general,
          optional: [],
          setupLabel: "Quick Setup",
          description: "One model that covers most everyday tasks.",
        });
      });
  }, []);

  // WebSocket for real progress
  useEffect(() => {
    const ws = API.connectWS((msg) => {
      if (msg.type === "model:progress" && msg.percent != null) {
        setProgress(msg.percent / 100);
        setEta(msg.estimatedSecondsRemaining ?? null);
      }
      if (msg.type === "model:complete") {
        setProgress(1);
        setEta(null);
      }
    });
    wsRef.current = ws;
    return () => { if (ws) ws.close(); };
  }, []);

  const startInstall = async () => {
    if (!recommendation) return;
    const queue = [];
    queue.push({ ...recommendation.primary, category: recommendation.primary.category || "general" });
    for (const opt of recommendation.optional) {
      if (selectedOptional[opt.category]) queue.push(opt);
    }

    for (const model of queue) {
      if (installed[model.category]) continue;
      setInstalling(model.category);
      setProgress(0);
      setEta(null);
      setError(null);

      // Smooth interpolation fallback between real WS updates
      const smoothTimer = setInterval(() => {
        setProgress((p) => Math.min(p + 0.002, 0.95));
      }, 800);

      try {
        const ollamaName = model.ollama || OLLAMA_MODELS[model.category]?.ollama;
        const displayName = model.display || OLLAMA_MODELS[model.category]?.display;
        await API.installModel(ollamaName, displayName, model.category);
        clearInterval(smoothTimer);
        setProgress(1);
        setInstalled((prev) => ({ ...prev, [model.category]: true }));
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        clearInterval(smoothTimer);
        setError(`Failed to install ${model.display}: ${err.message}`);
        break;
      }
    }

    setInstalling(null);
    const finalInstalled = { ...installed };
    queue.forEach((m) => { finalInstalled[m.category] = true; });
    setInstalled(finalInstalled);
    setData((d) => ({ ...d, installedModels: finalInstalled }));
    setAllDone(true);
  };

  // Loading state
  if (!recommendation) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 420, paddingTop: 60 }}>
        <SwordAndShield size={80} animate state="idle" />
        <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 20, color: COLORS.text, marginTop: 16 }}>
          Preparing recommendations<LoadingDots />
        </h2>
      </div>
    );
  }

  const percent = Math.round(progress * 100);
  const phase = getDownloadPhase(percent);
  const tierNote = data.hardware?.tier === "basic"
    ? "We picked a compact model that works great on your machine."
    : null;

  // ── DOWNLOADING STATE ──
  if (installing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 420, paddingTop: 32 }}>
        <SwordAndShield size={96} animate state="shield" />
        <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.text, margin: "16px 0 4px" }}>
          {phase.heading}
        </h2>
        <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: COLORS.textMuted, textAlign: "center", maxWidth: 360, lineHeight: 1.5, margin: "0 0 24px" }}>
          {phase.subtext}
        </p>

        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ width: "100%", height: 8, background: COLORS.border, borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              width: `${percent}%`, height: "100%",
              background: `linear-gradient(90deg, ${COLORS.orange}, ${COLORS.orangeLight})`,
              borderRadius: 4, transition: "width 0.4s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: COLORS.textMuted }}>
              {formatTimeRemaining(eta) || "Estimating time..."}
            </span>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: COLORS.textMuted, fontWeight: 700 }}>
              {percent}%
            </span>
          </div>
        </div>

        {error && (
          <p style={{ fontFamily: "'Courier New', monospace", fontSize: 13, color: COLORS.red, marginTop: 16, textAlign: "center" }}>{error}</p>
        )}
      </div>
    );
  }

  // ── COMPLETE STATE ──
  if (allDone) {
    const modelCount = Object.keys(installed).length;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 420, paddingTop: 32 }}>
        <SwordAndShield size={96} animate state="shield" />
        <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.green, margin: "16px 0 4px" }}>
          Your AI is ready!
        </h2>
        <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: COLORS.textMuted, textAlign: "center", maxWidth: 360, lineHeight: 1.5, margin: "0 0 24px" }}>
          Installed {modelCount} model{modelCount !== 1 ? "s" : ""}. You can always add more from settings.
        </p>
        <BtnPrimary onClick={onNext}>Continue</BtnPrimary>
      </div>
    );
  }

  // ── PRE-INSTALL STATE (recommendation view) ──
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 420, paddingTop: 24 }}>
      <SwordAndShield size={72} animate={false} state="idle" />
      <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.text, margin: "14px 0 4px" }}>
        {recommendation.setupLabel}
      </h2>
      <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: COLORS.textMuted, textAlign: "center", maxWidth: 380, lineHeight: 1.5, margin: "0 0 16px" }}>
        {recommendation.description}
      </p>

      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Primary model — info card, no checkbox */}
        <ModelInfoCard
          name={recommendation.primary.display || recommendation.primary.ollama}
          size={recommendation.primary.size || OLLAMA_MODELS[recommendation.primary.category]?.size}
          reason={recommendation.primary.reason || "Handles everyday tasks, writing, and questions well"}
        />

        {tierNote && (
          <p style={{ fontFamily: "'Georgia', serif", fontSize: 12, color: COLORS.textMuted, textAlign: "center", margin: "8px 0 0", fontStyle: "italic" }}>
            {tierNote}
          </p>
        )}

        {/* Advanced options (optional models) */}
        {recommendation.optional.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
              background: "none", border: "none", cursor: "pointer", fontFamily: "'Courier New', monospace",
              fontSize: 12, color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 6, padding: 0,
            }}>
              <span style={{ transform: showAdvanced ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>{"\u25B6"}</span>
              Advanced Options ({recommendation.optional.length} more model{recommendation.optional.length !== 1 ? "s" : ""})
            </button>

            {showAdvanced && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {recommendation.optional.map((opt) => (
                  <button key={opt.category} onClick={() => setSelectedOptional((s) => ({ ...s, [opt.category]: !s[opt.category] }))} style={{
                    display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
                    background: selectedOptional[opt.category] ? COLORS.orangeFaint : COLORS.white,
                    border: `2px solid ${selectedOptional[opt.category] ? COLORS.orange : COLORS.border}`,
                    borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700, color: selectedOptional[opt.category] ? COLORS.orange : COLORS.text }}>
                          {opt.display || opt.ollama}
                        </span>
                        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: COLORS.textMuted, background: COLORS.orangeFaint, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: 1 }}>Optional</span>
                      </div>
                      <div style={{ fontFamily: "'Georgia', serif", fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.4 }}>{opt.reason}</div>
                      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: COLORS.textMuted, marginTop: 3 }}>{opt.size}</div>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2,
                      border: `2px solid ${selectedOptional[opt.category] ? COLORS.orange : COLORS.border}`,
                      background: selectedOptional[opt.category] ? COLORS.orange : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                    }}>
                      {selectedOptional[opt.category] && <span style={{ color: "white", fontSize: 12, lineHeight: 1 }}>{"\u2713"}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontFamily: "'Courier New', monospace", fontSize: 13, color: COLORS.red, marginTop: 12, textAlign: "center" }}>{error}</p>
      )}

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <BtnPrimary onClick={startInstall}>Install Recommended</BtnPrimary>
        <button onClick={onNext} style={{
          background: "none", border: "none", cursor: "pointer", fontFamily: "'Courier New', monospace",
          fontSize: 12, color: COLORS.textMuted, textDecoration: "underline", padding: 4,
        }}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

function ModelInfoCard({ name, size, reason }) {
  return (
    <div style={{
      background: COLORS.orangeFaint, border: `2px solid ${COLORS.orange}`, borderRadius: 10,
      padding: "16px 18px", textAlign: "left",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 16, fontWeight: 700, color: COLORS.orange }}>{name}</span>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: COLORS.green, background: `${COLORS.green}18`, padding: "2px 8px", borderRadius: 3, textTransform: "uppercase", letterSpacing: 1 }}>Recommended</span>
      </div>
      <div style={{ fontFamily: "'Georgia', serif", fontSize: 13, color: COLORS.textMuted, lineHeight: 1.4 }}>{reason}</div>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>{size}</div>
    </div>
  );
}

// ============================================================
// STEP 6: READY
// ============================================================
function StepReady({ data, onComplete }) {
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 200);
    API.completeSetup().then(() => setSaved(true)).catch(() => setSaved(true));
  }, []);

  const modeLabels = { open: "Open", secured: "Secured", lockdown: "Lockdown" };
  const memberCount = (data.familyMembers?.length || 0) + 1;
  const modelCount = Object.keys(data.installedModels || {}).length;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: 420, opacity: show ? 1 : 0, transform: show ? "scale(1)" : "scale(0.95)",
      transition: "all 0.5s cubic-bezier(.4,0,.2,1)",
    }}>
      <SwordAndShield size={128} animate state="shield" />
      <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 26, color: COLORS.text, margin: "16px 0 4px" }}>You're all set.</h2>
      <p style={{ fontFamily: "'Georgia', serif", fontSize: 16, color: COLORS.textMuted, textAlign: "center", maxWidth: 380, lineHeight: 1.6, margin: "0 0 24px" }}>
        Kinward is ready to guard your family's AI experience.
      </p>

      <div style={{ background: COLORS.orangeFaint, border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 24px", maxWidth: 320, width: "100%", marginBottom: 28 }}>
        {[
          ["Profiles", `${memberCount} ${memberCount === 1 ? "member" : "members"}`],
          ["Privacy Mode", modeLabels[data.envMode] || "\u2014"],
          ["AI Models", `${modelCount} installed`],
          ["Node Admin", data.adminName || "\u2014"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{k}</span>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700, color: COLORS.text }}>{v}</span>
          </div>
        ))}
      </div>

      <BtnPrimary onClick={() => onComplete?.()}>
        Open Dashboard
      </BtnPrimary>
    </div>
  );
}

// ============================================================
// PROGRESS BAR
// ============================================================
function ProgressBar({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", padding: "16px 0 8px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 3, width: i === step ? 32 : 16, borderRadius: 2,
          background: i <= step ? COLORS.orange : COLORS.border, transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}

// ============================================================
// MAIN WIZARD
// ============================================================
export default function KinwardWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    envMode: null,
    adminName: "",
    adminPin: "",
    familyMembers: [],
    hardware: null,
    profiles: [],
    selectedModels: {},
    installedModels: {},
  });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div style={{
      minHeight: "100dvh", // dvh accounts for mobile browser toolbars; falls back to vh in older browsers
      background: `linear-gradient(180deg, ${COLORS.cream} 0%, ${COLORS.creamLight} 50%, ${COLORS.white} 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Georgia', serif",
      overflowY: "auto", WebkitOverflowScrolling: "touch",
    }}>
      <div style={{ width: "100%", maxWidth: 480, padding: "0 20px", boxSizing: "border-box" }}>
        {step > 0 && step < STEPS.length - 1 && (
          <div style={{ paddingTop: 12 }}>
            <button onClick={back} style={{
              background: "none", border: "none", fontFamily: "'Courier New', monospace",
              fontSize: 13, color: COLORS.textMuted, cursor: "pointer", padding: "4px 0",
            }}>{"\u2190"} Back</button>
          </div>
        )}

        <ProgressBar step={step} total={STEPS.length} />

        {step > 0 && step < STEPS.length - 1 && (
          <div style={{
            textAlign: "center", fontFamily: "'Courier New', monospace", fontSize: 10,
            color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 2, paddingBottom: 4,
          }}>
            Step {step} of {STEPS.length - 2}
          </div>
        )}

        <div style={{ paddingBottom: 40 }}>
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && <StepAutoDetect data={data} setData={setData} onNext={next} />}
          {step === 2 && <StepEnvironment data={data} setData={setData} onNext={next} />}
          {step === 3 && <StepAdminProfile data={data} setData={setData} onNext={next} />}
          {step === 4 && <StepFamily data={data} setData={setData} onNext={next} />}
          {step === 5 && <StepModels data={data} setData={setData} onNext={next} />}
          {step === 6 && <StepReady data={data} onComplete={onComplete} />}
        </div>
      </div>
    </div>
  );
}
