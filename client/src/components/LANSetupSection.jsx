import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { BRAND as B } from "./shared";
import { getLanInfo } from "../api";

/**
 * LANSetupSection — Settings → 📱 Add a Device panel.
 *
 * Generates a QR code containing the LAN URL of this Kinward install so
 * family members can scan with their phone camera, land on the profile gate,
 * and add Kinward to their Home Screen as a PWA.
 *
 * QR is generated entirely client-side (no external service) using the
 * `qrcode` package. The /api/system/lan-info endpoint supplies the URL.
 */

export default function LANSetupSection() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [platformTab, setPlatformTab] = useState("ios");
  const canvasRef = useRef(null);

  // Load LAN info on mount
  useEffect(() => {
    let cancelled = false;
    getLanInfo()
      .then((data) => {
        if (cancelled) return;
        if (!data.detected) {
          setError("Couldn't detect a usable LAN address. Are you on Wi-Fi?");
        }
        setInfo(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => { cancelled = true; };
  }, []);

  // Render QR onto the canvas whenever the URL is available
  useEffect(() => {
    if (!info?.url || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, info.url, {
      width: 240,
      margin: 1,
      color: {
        dark: B.charcoal,
        light: B.warmWhite,
      },
      errorCorrectionLevel: "M",
    }).catch((err) => {
      console.error("QR render failed:", err);
      setError("Couldn't render QR code: " + err.message);
    });
  }, [info]);

  const handleCopy = async () => {
    if (!info?.url) return;
    try {
      await navigator.clipboard.writeText(info.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API blocked — fall back to selection
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.getElementById("kw-lan-url"));
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  return (
    <div>
      <div style={s.header}>
        <h2 style={s.title}>Add a Phone or Tablet</h2>
        <p style={s.desc}>
          Kinward lives on this computer, but anyone in your house can use it from their phone, tablet, or laptop — as long as they're on the same Wi-Fi network. Scan the code below with a phone camera to get started.
        </p>
      </div>

      {error && !info?.detected && (
        <div style={s.errorBox}>
          <div style={s.errorIcon}>📡</div>
          <div>
            <div style={s.errorTitle}>{error}</div>
            <div style={s.errorSub}>
              Make sure this computer is connected to your Wi-Fi network. If you're using a VPN, try turning it off temporarily.
            </div>
          </div>
        </div>
      )}

      {info?.detected && (
        <>
          {/* QR card */}
          <div style={s.qrCard}>
            <div style={s.qrFrame}>
              <canvas ref={canvasRef} style={s.qrCanvas} />
            </div>
            <div style={s.qrSide}>
              <div style={s.qrEyebrow}>Step 1</div>
              <div style={s.qrHeadline}>Scan with your phone camera</div>
              <div style={s.qrBody}>
                Open the Camera app on your phone, point it at the code, and tap the link that appears. Kinward opens in your browser — no app store, no download.
              </div>

              <div style={s.urlBlock}>
                <div style={s.urlLabel}>Or type this in your phone's browser:</div>
                <div style={s.urlRow}>
                  <code id="kw-lan-url" style={s.urlCode}>
                    {info.url}
                  </code>
                  <button style={s.copyBtn} onClick={handleCopy}>
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Add-to-home-screen instructions */}
          <div style={s.howCard}>
            <div style={s.qrEyebrow}>Step 2 (optional, but nice)</div>
            <div style={s.howHeadline}>Add Kinward to the Home Screen</div>
            <div style={s.howSub}>
              This puts a Kinward icon right on your phone — no more typing the address. Pick your phone type:
            </div>

            <div style={s.tabs}>
              <button
                style={{ ...s.tab, ...(platformTab === "ios" ? s.tabActive : {}) }}
                onClick={() => setPlatformTab("ios")}
              >
                iPhone / iPad
              </button>
              <button
                style={{ ...s.tab, ...(platformTab === "android" ? s.tabActive : {}) }}
                onClick={() => setPlatformTab("android")}
              >
                Android
              </button>
            </div>

            {platformTab === "ios" ? (
              <ol style={s.steps}>
                <li>Open Kinward in <strong>Safari</strong> (the blue compass app). Other browsers won't work for this trick.</li>
                <li>Tap the <strong>Share button</strong> at the bottom (square with an arrow pointing up).</li>
                <li>Scroll down in the share menu and tap <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong> in the top right. The Kinward icon now lives on your home screen.</li>
              </ol>
            ) : (
              <ol style={s.steps}>
                <li>Open Kinward in <strong>Chrome</strong>.</li>
                <li>Tap the <strong>three-dot menu</strong> in the top right.</li>
                <li>Tap <strong>Add to Home Screen</strong> (or <strong>Install app</strong> — same thing).</li>
                <li>Tap <strong>Install</strong>. The Kinward icon now lives on your home screen.</li>
              </ol>
            )}
          </div>

          {/* Privacy note */}
          <div style={s.privacyNote}>
            <strong>One thing to know:</strong> any device on your home Wi-Fi can reach Kinward right now — they'd still need a profile PIN to actually sign in. Stricter privacy modes (where new devices need your approval) are rolling out soon.
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 18,
    fontWeight: 500,
    letterSpacing: 2,
    color: B.charcoal,
    margin: 0,
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: B.slate,
    lineHeight: 1.65,
    fontFamily: "'Lora', Georgia, serif",
    margin: 0,
    maxWidth: 620,
  },

  // Error state
  errorBox: {
    display: "flex",
    gap: 14,
    padding: "16px 18px",
    background: "#FFF5EE",
    border: `1.5px solid ${B.orange}`,
    borderRadius: 12,
    marginTop: 16,
    alignItems: "flex-start",
  },
  errorIcon: { fontSize: 22, flexShrink: 0, marginTop: 2 },
  errorTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    color: B.charcoal,
    marginBottom: 4,
  },
  errorSub: {
    fontSize: 13,
    color: B.slate,
    lineHeight: 1.5,
  },

  // QR card
  qrCard: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: 32,
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 14,
    padding: 28,
    marginBottom: 16,
    alignItems: "center",
  },
  qrFrame: {
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 12,
    padding: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qrCanvas: {
    display: "block",
  },
  qrSide: {
    flex: 1,
    minWidth: 0,
  },
  qrEyebrow: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: B.orange,
    marginBottom: 6,
  },
  qrHeadline: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 17,
    fontWeight: 500,
    color: B.charcoal,
    marginBottom: 10,
  },
  qrBody: {
    fontSize: 13,
    color: B.slate,
    lineHeight: 1.6,
    fontFamily: "'Lora', Georgia, serif",
    marginBottom: 18,
  },

  urlBlock: {
    background: B.cream,
    borderRadius: 10,
    padding: "12px 14px",
  },
  urlLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    letterSpacing: 1,
    color: B.slate,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  urlRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  urlCode: {
    flex: 1,
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
    color: B.charcoal,
    overflowX: "auto",
    whiteSpace: "nowrap",
  },
  copyBtn: {
    flexShrink: 0,
    padding: "6px 12px",
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 8,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.charcoal,
    cursor: "pointer",
  },

  // How-to card
  howCard: {
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 14,
    padding: 24,
    marginBottom: 16,
  },
  howHeadline: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 16,
    fontWeight: 500,
    color: B.charcoal,
    marginBottom: 6,
  },
  howSub: {
    fontSize: 13,
    color: B.slate,
    lineHeight: 1.6,
    fontFamily: "'Lora', Georgia, serif",
    marginBottom: 14,
  },
  tabs: {
    display: "flex",
    gap: 6,
    marginBottom: 16,
  },
  tab: {
    padding: "8px 16px",
    background: "transparent",
    border: `1px solid ${B.mist}`,
    borderRadius: 20,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.slate,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tabActive: {
    background: B.orange,
    color: "white",
    borderColor: B.orange,
  },
  steps: {
    margin: 0,
    paddingLeft: 22,
    color: B.charcoal,
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 14,
    lineHeight: 1.75,
  },

  privacyNote: {
    background: B.cream,
    border: `1px solid ${B.mist}`,
    borderLeft: `3px solid ${B.amber || "#C4853A"}`,
    borderRadius: 10,
    padding: "14px 16px",
    fontSize: 13,
    color: B.charcoal,
    lineHeight: 1.6,
    fontFamily: "'Lora', Georgia, serif",
  },
};
