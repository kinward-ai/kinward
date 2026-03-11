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

const STEPS = ["Welcome", "Ollama", "Hardware", "Environment", "Your Profile", "Family", "AI Models", "Ready"];

const baseBtn = {
  fontFamily: "'Courier New', Courier, monospace", fontSize: 15, fontWeight: 700,
  border: "none", borderRadius: 8, cursor: "pointer", padding: "12px 32px",
  transition: "all 0.18s ease", letterSpacing: 0.5,
};
const primaryBtn = { ...baseBtn, background: COLORS.orange, color: COLORS.white };
const secondaryBtn = { ...baseBtn, background: "transparent", color: COLORS.orange, border: `2px solid ${COLORS.orange}` };
const inputStyle = {
  fontFamily: "'Courier New', Courier, monospace", fontSize: 15, padding: "10px 14px",
  border: `2px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.white,
  color: COLORS.text, outline: "none", width: "100%", boxSizing: "border-box",
  transition: "border-color 0.15s",
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
// STEP 1: OLLAMA CHECK
// ============================================================
const OLLAMA_URLS = {
  win32: "https://ollama.com/download/OllamaSetup.exe",
  darwin: "https://ollama.com/download/Ollama-darwin.zip",
  linux: "https://ollama.com/download",
};

function StepOllama({ onNext }) {
  const [phase, setPhase] = useState("checking"); // checking | missing | found
  const [retrying, setRetrying] = useState(false);

  const checkOllama = useCallback(async () => {
    try {
      const status = await API.getStatus();
      if (status.ollamaRunning) {
        setPhase("found");
        setTimeout(onNext, 1200); // auto-advance after brief confirmation
      } else {
        setPhase("missing");
      }
    } catch {
      setPhase("missing");
    }
  }, [onNext]);

  useEffect(() => { checkOllama(); }, [checkOllama]);

  const retry = async () => {
    setRetrying(true);
    setPhase("checking");
    await new Promise((r) => setTimeout(r, 1500));
    await checkOllama();
    setRetrying(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 420, paddingTop: 32 }}>
      <SwordAndShield size={96} animate={phase === "checking"} state={phase === "found" ? "shield" : "idle"} />

      {phase === "checking" && (
        <>
          <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.text, margin: "16px 0 8px" }}>
            Checking for AI engine<LoadingDots />
          </h2>
          <p style={{ fontFamily: "'Georgia', serif", fontSize: 15, color: COLORS.textMuted, textAlign: "center", maxWidth: 340, lineHeight: 1.5 }}>
            Looking for Ollama on your system.
          </p>
        </>
      )}

      {phase === "found" && (
        <>
          <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.green, margin: "16px 0 8px" }}>
            AI engine detected!
          </h2>
          <p style={{ fontFamily: "'Georgia', serif", fontSize: 15, color: COLORS.textMuted, textAlign: "center", maxWidth: 340, lineHeight: 1.5 }}>
            Ollama is running. Moving on...
          </p>
        </>
      )}

      {phase === "missing" && (
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
// STEP 2: HARDWARE CHECK (real)
// ============================================================
function StepHardware({ data, setData, onNext }) {
  const [phase, setPhase] = useState("scanning");
  const [hw, setHw] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    API.getHardware()
      .then((info) => {
        setHw(info);
        setData((d) => ({ ...d, hardware: info }));
        setPhase("done");
      })
      .catch((err) => {
        setError(err.message);
        setPhase("done");
      });
  }, [setData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 420, paddingTop: 24 }}>
      <SwordAndShield size={96} animate={phase === "scanning"} state={phase === "done" ? "shield" : "idle"} />
      <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.text, margin: "16px 0 8px" }}>
        {phase === "scanning" ? (<>Checking your hardware<LoadingDots /></>) : error ? "Couldn't detect hardware" : "Hardware looks great!"}
      </h2>

      {phase === "scanning" && (
        <p style={{ fontFamily: "'Georgia', serif", fontSize: 15, color: COLORS.textMuted, textAlign: "center", maxWidth: 340, lineHeight: 1.5 }}>
          Scanning your system to see what AI models you can run.
        </p>
      )}

      {phase === "done" && error && (
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: COLORS.red, marginBottom: 16 }}>{error}</p>
          <BtnPrimary onClick={onNext}>Continue Anyway</BtnPrimary>
        </div>
      )}

      {phase === "done" && hw && (
        <div style={{ width: "100%", maxWidth: 400, marginTop: 12 }}>
          <div style={{ background: COLORS.orangeFaint, border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
            <p style={{ fontFamily: "'Georgia', serif", fontSize: 15, color: COLORS.text, lineHeight: 1.6, margin: 0 }}>
              {hw.message}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
            {[
              ["System", hw.os || "—"],
              ["Processor", (hw.cpu || "—").split("@")[0].trim()],
              ["Memory", hw.ram || "—"],
              ["Cores", hw.cores || "—"],
              ["Platform", hw.platform || "—"],
              ["Architecture", hw.arch || "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 13, color: COLORS.text, fontWeight: 700, marginTop: 2 }}>{String(val)}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center" }}><BtnPrimary onClick={onNext}>Continue</BtnPrimary></div>
        </div>
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
function StepFamily({ data, setData, onNext }) {
  const [members, setMembers] = useState(data.familyMembers || []);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("teen");
  const [saving, setSaving] = useState(false);

  const roles = [
    { id: "co-admin", label: "Co-Admin", desc: "Full access, shares admin privileges" },
    { id: "teen", label: "Teen (13\u201317)", desc: "Moderate guardrails, age-appropriate access" },
    { id: "child", label: "Child (5\u201312)", desc: "Strict guardrails, curated Recipes only" },
  ];

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
        Everyone gets their own profile with the right level of access. You can always add more later.
      </p>

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
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 15, fontWeight: 700, color: COLORS.text }}>{m.name}</div>
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
// STEP 6: AI MODELS (real Ollama pulls + smart recommendations)
// ============================================================
const OLLAMA_MODELS = {
  general: { ollama: "llama3.1:8b", display: "Llama 3.1 8B", size: "4.7 GB" },
  kids: { ollama: "phi3:mini", display: "Phi-3 Mini", size: "2.3 GB" },
  research: { ollama: "mistral-nemo", display: "Mistral Nemo 12B", size: "7.1 GB" },
  creative: { ollama: "llama3.1:8b", display: "Llama 3.1 8B (Creative)", size: "4.7 GB" },
};

function StepModels({ data, setData, onNext }) {
  const [recommendation, setRecommendation] = useState(null);
  const [installing, setInstalling] = useState(null);
  const [installed, setInstalled] = useState({});
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [allDone, setAllDone] = useState(false);
  const isLockdown = data.envMode === "lockdown";

  // Fetch recommendation based on family profiles
  useEffect(() => {
    API.getRecommendation()
      .then(setRecommendation)
      .catch(() => {
        // Fallback recommendation
        setRecommendation({
          primary: OLLAMA_MODELS.general,
          optional: [],
          setupLabel: "Quick Setup",
          description: "One model that covers most everyday tasks.",
        });
      });
  }, []);

  const [selectedPrimary, setSelectedPrimary] = useState(true);
  const [selectedOptional, setSelectedOptional] = useState({});

  const getInstallQueue = () => {
    if (!recommendation) return [];
    const queue = [];
    if (selectedPrimary) {
      queue.push({ ...recommendation.primary, category: recommendation.primary.category || "general" });
    }
    for (const opt of recommendation.optional) {
      if (selectedOptional[opt.category]) queue.push(opt);
    }
    return queue;
  };

  const startInstall = async () => {
    const queue = getInstallQueue().filter((m) => !installed[m.category]);
    if (queue.length === 0) return;

    for (const model of queue) {
      setInstalling(model.category);
      setProgress(0);
      setError(null);

      // Fake progress while waiting (real progress comes via WS but this gives immediate feedback)
      const fakeTimer = setInterval(() => {
        setProgress((p) => Math.min(p + 0.005 + Math.random() * 0.01, 0.85));
      }, 500);

      try {
        const ollamaName = model.ollama || OLLAMA_MODELS[model.category]?.ollama;
        const displayName = model.display || OLLAMA_MODELS[model.category]?.display;
        await API.installModel(ollamaName, displayName, model.category);
        clearInterval(fakeTimer);
        setProgress(1);
        setInstalled((prev) => ({ ...prev, [model.category]: true }));
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        clearInterval(fakeTimer);
        setError(`Failed to install ${model.display}: ${err.message}`);
        break;
      }
    }

    setInstalling(null);
    const finalInstalled = { ...installed };
    getInstallQueue().forEach((m) => { finalInstalled[m.category] = true; });
    setInstalled(finalInstalled);
    setData((d) => ({ ...d, installedModels: finalInstalled }));
    setAllDone(true);
  };

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

  const queue = getInstallQueue();
  const pendingCount = queue.filter((m) => !installed[m.category]).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 420, paddingTop: 24 }}>
      <SwordAndShield size={72} animate={!!installing} state={installing ? "shield" : allDone ? "shield" : "idle"} />
      <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: 22, color: COLORS.text, margin: "14px 0 4px" }}>
        {allDone ? "Models installed!" : installing ? "Installing..." : recommendation.setupLabel}
      </h2>
      <p style={{ fontFamily: "'Georgia', serif", fontSize: 14, color: COLORS.textMuted, textAlign: "center", maxWidth: 380, lineHeight: 1.5, margin: "0 0 16px" }}>
        {allDone ? "Your AI is ready. You can always add more from the dashboard."
          : installing ? `Setting up ${OLLAMA_MODELS[installing]?.display || installing}... This may take a few minutes.`
            : recommendation.description}
      </p>

      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Primary recommendation */}
        <ModelCard
          label="Recommended"
          name={recommendation.primary.display || recommendation.primary.ollama}
          size={recommendation.primary.size || OLLAMA_MODELS[recommendation.primary.category]?.size}
          reason={recommendation.primary.reason || "Handles everyday tasks, writing, and questions well"}
          selected={selectedPrimary}
          onToggle={() => !installing && setSelectedPrimary(!selectedPrimary)}
          isInstalling={installing === (recommendation.primary.category || "general")}
          isDone={installed[recommendation.primary.category || "general"]}
          progress={installing === (recommendation.primary.category || "general") ? progress : 0}
          disabled={!!installing}
        />

        {/* Optional recommendations */}
        {recommendation.optional.map((opt) => (
          <ModelCard
            key={opt.category}
            label="Optional"
            name={opt.display || opt.ollama}
            size={opt.size || OLLAMA_MODELS[opt.category]?.size}
            reason={opt.reason}
            selected={!!selectedOptional[opt.category]}
            onToggle={() => !installing && setSelectedOptional((s) => ({ ...s, [opt.category]: !s[opt.category] }))}
            isInstalling={installing === opt.category}
            isDone={installed[opt.category]}
            progress={installing === opt.category ? progress : 0}
            disabled={!!installing}
          />
        ))}
      </div>

      {error && (
        <p style={{ fontFamily: "'Courier New', monospace", fontSize: 13, color: COLORS.red, marginTop: 12, textAlign: "center" }}>{error}</p>
      )}

      <div style={{ marginTop: 20, textAlign: "center" }}>
        {allDone ? (
          <BtnPrimary onClick={onNext}>Continue</BtnPrimary>
        ) : installing ? (
          <p style={{ fontFamily: "'Georgia', serif", fontSize: 13, color: COLORS.textMuted, fontStyle: "italic" }}>
            {isLockdown ? "Preparing sideload packages" : "Downloading from Ollama"}<LoadingDots />
          </p>
        ) : (
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <BtnPrimary onClick={startInstall} disabled={pendingCount === 0}>
              Install{pendingCount > 0 ? ` (${pendingCount})` : ""}
            </BtnPrimary>
            {queue.length === 0 && (
              <button style={{ ...secondaryBtn, fontSize: 13, padding: "10px 20px" }} onClick={onNext}>Skip for Now</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ModelCard({ label, name, size, reason, selected, onToggle, isInstalling, isDone, progress, disabled }) {
  return (
    <div>
      <button onClick={onToggle} disabled={disabled} style={{
        display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
        background: isDone ? `${COLORS.green}10` : selected ? COLORS.orangeFaint : COLORS.white,
        border: `2px solid ${isDone ? COLORS.green : selected ? COLORS.orange : COLORS.border}`,
        borderRadius: isInstalling ? "10px 10px 0 0" : 10,
        padding: "12px 14px", cursor: disabled ? "default" : "pointer", textAlign: "left",
        transition: "all 0.15s", opacity: disabled && !isInstalling && !isDone ? 0.5 : 1,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 15, fontWeight: 700, color: isDone ? COLORS.green : selected ? COLORS.orange : COLORS.text }}>{name}</span>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: COLORS.textMuted, background: COLORS.orangeFaint, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
            {isDone && <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: COLORS.green, background: `${COLORS.green}18`, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 1 }}>Installed</span>}
          </div>
          <div style={{ fontFamily: "'Georgia', serif", fontSize: 13, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.4 }}>{reason}</div>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{size}</div>
        </div>
        {!disabled && (
          <div style={{
            width: 22, height: 22, borderRadius: 4, flexShrink: 0, marginTop: 4,
            border: `2px solid ${selected ? COLORS.orange : COLORS.border}`,
            background: selected ? COLORS.orange : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
          }}>
            {selected && <span style={{ color: "white", fontSize: 14, lineHeight: 1 }}>{"\u2713"}</span>}
          </div>
        )}
      </button>
      {isInstalling && (
        <div style={{ background: COLORS.white, border: `2px solid ${COLORS.orange}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px 14px" }}>
          <div style={{ width: "100%", height: 6, background: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${progress * 100}%`, height: "100%", background: `linear-gradient(90deg, ${COLORS.orange}, ${COLORS.orangeLight})`, borderRadius: 3, transition: "width 0.3s ease" }} />
          </div>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: COLORS.textMuted, marginTop: 4, textAlign: "right" }}>
            {Math.round(progress * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STEP 7: READY
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
      minHeight: "100vh",
      background: `linear-gradient(180deg, ${COLORS.cream} 0%, ${COLORS.creamLight} 50%, ${COLORS.white} 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Georgia', serif",
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
          {step === 1 && <StepOllama onNext={next} />}
          {step === 2 && <StepHardware data={data} setData={setData} onNext={next} />}
          {step === 3 && <StepEnvironment data={data} setData={setData} onNext={next} />}
          {step === 4 && <StepAdminProfile data={data} setData={setData} onNext={next} />}
          {step === 5 && <StepFamily data={data} setData={setData} onNext={next} />}
          {step === 6 && <StepModels data={data} setData={setData} onNext={next} />}
          {step === 7 && <StepReady data={data} onComplete={onComplete} />}
        </div>
      </div>
    </div>
  );
}
