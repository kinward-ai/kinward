// ── API Layer ──────────────────────────────────
export const API = "/api";

export async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Brand Tokens ───────────────────────────────
export const BRAND = {
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

// ── Minimal Shield Icon (Brand) ──────────────
export function ShieldIcon({ size = 20, color = BRAND.orange }) {
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

// ── AI Avatar Shield (for chat messages) ─────
export function AIShieldAvatar({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 28" fill="none">
      <path
        d="M12 1L2 5.5V12.5C2 19.5 6.5 25.5 12 27C17.5 25.5 22 19.5 22 12.5V5.5L12 1Z"
        stroke={BRAND.cream}
        strokeWidth="2"
        fill="none"
      />
      <circle cx="12" cy="13" r="2" fill={BRAND.cream} />
    </svg>
  );
}

// ── Role-based color mapping ───────────────────
export const ROLE_COLORS = {
  admin: "#D4622B",
  "co-admin": "#C4853A",
  teen: "#5A8BAD",
  child: "#6BAF7D",
};

export const avatarColor = (profile) =>
  profile.avatar_color || ROLE_COLORS[profile.role] || BRAND.orange;

// ── Category definitions ───────────────────────
export const CATEGORIES = [
  { id: "general", name: "General Assistant", desc: "Everyday questions and conversation", icon: "💬" },
  { id: "kids", name: "Kids Assistant", desc: "Age-appropriate help for younger minds", icon: "🌟" },
  { id: "research", name: "Research", desc: "Deep dives, analysis, and learning", icon: "🔍" },
  { id: "creative", name: "Creative", desc: "Writing, brainstorming, and imagination", icon: "✨" },
];

// ── Time formatting ────────────────────────────
export function timeAgo(dateStr) {
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

export function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ── Send Arrow SVG ─────────────────────────────
export function SendArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
