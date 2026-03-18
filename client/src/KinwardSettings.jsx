import { useState, useEffect, useRef } from "react";
import { api, API, BRAND as B, ShieldIcon } from "./components/shared";

/* ─────────────────────────────────────────────
   KINWARD SETTINGS PANEL
   Admin-only interface for managing:
   - AI Memory (view/edit/delete per profile)
   - World Context (knowledge freshness)
   - Family Profiles (view)
   - About / System info
   ───────────────────────────────────────────── */

// ── Role colors ─────────────────────────────
const ROLE_COLORS = {
  admin: "#D4622B",
  "co-admin": "#C4853A",
  teen: "#5A8BAD",
  child: "#6BAF7D",
};
const avatarColor = (p) => p.avatar_color || ROLE_COLORS[p.role] || B.orange;

// ── Nav sections ────────────────────────────
const SECTIONS = [
  { id: "identity", label: "AI Identity", icon: "✨" },
  { id: "memory", label: "Lumina's Memory", icon: "🧠" },
  { id: "world", label: "World Context", icon: "🌍" },
  { id: "profiles", label: "Family", icon: "👥" },
  { id: "about", label: "About", icon: "🛡️" },
];


// ════════════════════════════════════════════════
//  MEMORY SECTION
// ════════════════════════════════════════════════
function MemorySection({ adminProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [addingCategory, setAddingCategory] = useState(null);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [toast, setToast] = useState(null);

  // Load profiles
  useEffect(() => {
    api("/profiles")
      .then((data) => {
        const list = data.profiles || data;
        setProfiles(list);
        // Auto-select admin profile or first profile
        const admin = list.find((p) => p.id === adminProfile.id);
        setSelectedProfile(admin || list[0] || null);
      })
      .catch(() => setProfiles([]));
  }, [adminProfile.id]);

  // Load memories when profile changes
  useEffect(() => {
    if (!selectedProfile) return;
    setLoading(true);
    api(`/memory/${selectedProfile.id}`)
      .then((data) => setMemories(data.memories || data || []))
      .catch(() => setMemories([]))
      .finally(() => setLoading(false));
  }, [selectedProfile]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Group memories by category
  const grouped = {};
  for (const mem of memories) {
    if (!grouped[mem.category]) grouped[mem.category] = [];
    grouped[mem.category].push(mem);
  }
  const categories = Object.keys(grouped).sort();

  // Delete a memory
  const handleDelete = async (memId) => {
    try {
      await fetch(`${API}/memory/${selectedProfile.id}/${memId}`, { method: "DELETE" });
      setMemories((prev) => prev.filter((m) => m.id !== memId));
      showToast("Memory deleted");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  // Save an edit
  const handleSaveEdit = async (mem) => {
    try {
      await fetch(`${API}/memory/${selectedProfile.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: mem.category,
          key: mem.key,
          value: editValue,
        }),
      });
      setMemories((prev) =>
        prev.map((m) => (m.id === mem.id ? { ...m, value: editValue } : m))
      );
      setEditingId(null);
      setEditValue("");
      showToast("Memory updated");
    } catch {
      showToast("Failed to update", "error");
    }
  };

  // Add a new memory
  const handleAdd = async (category) => {
    if (!newKey.trim() || !newValue.trim()) return;
    try {
      await fetch(`${API}/memory/${selectedProfile.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          key: newKey.trim().toLowerCase().replace(/\s+/g, "_"),
          value: newValue.trim(),
        }),
      });
      // Reload memories
      const data = await api(`/memory/${selectedProfile.id}`);
      setMemories(data.memories || data || []);
      setAddingCategory(null);
      setNewKey("");
      setNewValue("");
      showToast("Memory added");
    } catch {
      showToast("Failed to add", "error");
    }
  };

  // Export memories
  const handleExport = async () => {
    if (!selectedProfile) return;
    try {
      const data = await api(`/memory/${selectedProfile.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lumina-memory-${selectedProfile.name.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Memory exported");
    } catch {
      showToast("Export failed", "error");
    }
  };

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div style={{
          ...s.toast,
          background: toast.type === "error" ? B.red : B.green,
        }}>
          {toast.msg}
        </div>
      )}

      <div style={s.sectionHeader}>
        <h2 style={s.sectionTitle}>Lumina's Memory</h2>
        <p style={s.sectionDesc}>
          What Lumina knows about each family member. Auto-extracted from conversations
          or manually added. Parents see memories — never conversation content.
        </p>
      </div>

      {/* Profile chips */}
      <div style={s.profileChips}>
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProfile(p)}
            style={{
              ...s.profileChip,
              ...(selectedProfile?.id === p.id ? s.profileChipActive : {}),
            }}
          >
            <span
              style={{
                ...s.chipAvatar,
                background: avatarColor(p),
              }}
            >
              {p.name[0]}
            </span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      {selectedProfile && (
        <div style={s.memoryActions}>
          <button style={s.actionBtn} onClick={handleExport}>
            📦 Export Brain Backup
          </button>
          <span style={s.memoryCount}>
            {memories.length} {memories.length === 1 ? "memory" : "memories"}
          </span>
        </div>
      )}

      {/* Memory list by category */}
      {loading ? (
        <div style={s.loadingMsg}>Loading memories...</div>
      ) : categories.length === 0 && selectedProfile ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>💭</div>
          <div style={s.emptyText}>Lumina hasn't learned anything about {selectedProfile.name} yet.</div>
          <div style={s.emptyHint}>Memories are auto-extracted from conversations, or you can add them manually below.</div>
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat} style={s.categoryGroup}>
            <div style={s.categoryHeader}>
              <span style={s.categoryName}>{cat}</span>
              <span style={s.categoryCount}>{grouped[cat].length}</span>
              <button
                style={s.addMemBtn}
                onClick={() => setAddingCategory(addingCategory === cat ? null : cat)}
              >
                + Add
              </button>
            </div>

            {/* Add form for this category */}
            {addingCategory === cat && (
              <div style={s.addForm}>
                <input
                  style={s.addInput}
                  placeholder="Key (e.g. favorite_color)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                />
                <input
                  style={s.addInput}
                  placeholder="Value (e.g. Blue)"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                />
                <div style={s.addFormActions}>
                  <button style={s.saveBtn} onClick={() => handleAdd(cat)}>Save</button>
                  <button
                    style={s.cancelBtn}
                    onClick={() => { setAddingCategory(null); setNewKey(""); setNewValue(""); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {grouped[cat].map((mem) => (
              <div key={mem.id} style={s.memoryRow}>
                <div style={s.memoryKey}>{mem.key}</div>
                {editingId === mem.id ? (
                  <div style={s.editRow}>
                    <input
                      style={s.editInput}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(mem)}
                      autoFocus
                    />
                    <button style={s.saveBtn} onClick={() => handleSaveEdit(mem)}>Save</button>
                    <button style={s.cancelBtn} onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div style={s.memoryValueRow}>
                    <div style={s.memoryValue}>{mem.value}</div>
                    <div style={s.memoryMeta}>
                      <span style={s.sourceTag}>{mem.source || "auto"}</span>
                      <button
                        style={s.editBtn}
                        onClick={() => { setEditingId(mem.id); setEditValue(mem.value); }}
                      >
                        ✏️
                      </button>
                      <button style={s.deleteBtn} onClick={() => handleDelete(mem.id)}>
                        🗑
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}

      {/* Add new category */}
      {selectedProfile && categories.length > 0 && (
        <div style={s.newCategorySection}>
          <button
            style={s.addMemBtn}
            onClick={() => setAddingCategory(addingCategory === "__new__" ? null : "__new__")}
          >
            + Add to new category
          </button>
          {addingCategory === "__new__" && (
            <div style={s.addForm}>
              <input
                style={s.addInput}
                placeholder="Category (e.g. activities)"
                value={newKey ? "" : ""}
                onChange={(e) => {
                  // Temporarily store category name in a data attr approach
                  // Using a simple workaround: first field is category, managed via state
                }}
                id="new-cat-name"
              />
              <input
                style={s.addInput}
                placeholder="Key (e.g. soccer_schedule)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <input
                style={s.addInput}
                placeholder="Value (e.g. Tuesdays)"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
              <div style={s.addFormActions}>
                <button
                  style={s.saveBtn}
                  onClick={() => {
                    const catInput = document.getElementById("new-cat-name");
                    const catName = catInput?.value?.trim().toLowerCase().replace(/\s+/g, "_");
                    if (catName) handleAdd(catName);
                  }}
                >
                  Save
                </button>
                <button
                  style={s.cancelBtn}
                  onClick={() => { setAddingCategory(null); setNewKey(""); setNewValue(""); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════
//  WORLD CONTEXT SECTION
// ════════════════════════════════════════════════
function WorldContextSection() {
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/system/world-context`)
      .then((r) => r.json())
      .then((data) => {
        // The world context is stored JSON-stringified in system_config
        const raw = data.context || "";
        setContext(typeof raw === "string" ? raw : JSON.stringify(raw));
      })
      .catch(() => setContext(""))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/system/world-context`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Failed to save world context");
    }
    setSaving(false);
  };

  return (
    <div>
      <div style={s.sectionHeader}>
        <h2 style={s.sectionTitle}>World Context</h2>
        <p style={s.sectionDesc}>
          Facts injected into every conversation so Lumina stays current. Update these
          when real-world info changes — presidents, family events, the year, anything
          Lumina should know that her training data might have wrong.
        </p>
      </div>

      {loading ? (
        <div style={s.loadingMsg}>Loading...</div>
      ) : (
        <>
          <textarea
            style={s.worldTextarea}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={16}
            placeholder="Current Facts (updated by household admin):&#10;- The current President is...&#10;- The current year is..."
          />
          <div style={s.worldActions}>
            <button
              style={{
                ...s.primaryBtn,
                opacity: saving ? 0.6 : 1,
              }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save Changes"}
            </button>
            <span style={s.worldHint}>
              Changes apply to all new conversations immediately.
            </span>
          </div>
        </>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════
//  PROFILES SECTION
// ════════════════════════════════════════════════
function ProfilesSection() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/profiles")
      .then((data) => setProfiles(data.profiles || data))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={s.sectionHeader}>
        <h2 style={s.sectionTitle}>Family Profiles</h2>
        <p style={s.sectionDesc}>
          Everyone in the household. Each person gets their own chat history,
          memories, and guardrail level.
        </p>
      </div>

      {loading ? (
        <div style={s.loadingMsg}>Loading...</div>
      ) : (
        <div style={s.profilesGrid}>
          {profiles.map((p) => (
            <div key={p.id} style={s.profileCard}>
              <div style={{ ...s.profileCardAvatar, background: avatarColor(p) }}>
                {p.name[0].toUpperCase()}
              </div>
              <div style={s.profileCardInfo}>
                <div style={s.profileCardName}>{p.name}</div>
                <div style={s.profileCardRole}>{p.role}</div>
                <div style={s.profileCardGuardrail}>
                  Guardrail: <span style={s.guardrailValue}>{p.guardrail_level || "open"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={s.comingSoon}>
        Profile editing, adding new family members, and removing profiles coming in a future update.
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════
//  AI IDENTITY SECTION
// ════════════════════════════════════════════════
function IdentitySection() {
  const [identity, setIdentity] = useState({ name: "", tagline: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTagline, setEditTagline] = useState("");

  useEffect(() => {
    fetch(`${API}/system/identity`)
      .then((r) => r.json())
      .then((data) => {
        setIdentity(data);
        setEditName(data.name || "");
        setEditTagline(data.tagline || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/system/identity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          tagline: editTagline.trim(),
        }),
      });
      const data = await res.json();
      if (data.identity) setIdentity(data.identity);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Failed to save identity");
    }
    setSaving(false);
  };

  const hasChanges = editName !== identity.name || editTagline !== identity.tagline;

  return (
    <div>
      <div style={s.sectionHeader}>
        <h2 style={s.sectionTitle}>AI Identity</h2>
        <p style={s.sectionDesc}>
          Your family's AI gets to be its own character. Choose a name, or let it
          pick one itself. This name appears everywhere — in the sidebar, in chat,
          and in how the AI introduces itself.
        </p>
      </div>

      {loading ? (
        <div style={s.loadingMsg}>Loading...</div>
      ) : (
        <div style={s.identityCard}>
          <div style={s.identityShield}>
            <ShieldIcon size={56} />
          </div>

          <div style={s.identityField}>
            <label style={s.identityLabel}>Name</label>
            <input
              style={s.identityInput}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="What should your AI be called?"
              maxLength={30}
            />
            <div style={s.identityHint}>This is how the AI will refer to itself in conversations.</div>
          </div>

          <div style={s.identityField}>
            <label style={s.identityLabel}>Tagline</label>
            <input
              style={s.identityInput}
              value={editTagline}
              onChange={(e) => setEditTagline(e.target.value)}
              placeholder="e.g. Your family's AI"
              maxLength={60}
            />
          </div>

          <div style={s.identityField}>
            <label style={s.identityLabel}>Chosen by</label>
            <div style={s.identityReadonly}>{identity.chosen_by || "default"}</div>
          </div>

          <div style={s.identityActions}>
            <button
              style={{
                ...s.primaryBtn,
                opacity: !hasChanges || saving ? 0.5 : 1,
                cursor: !hasChanges || saving ? "default" : "pointer",
              }}
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save Changes"}
            </button>
            {saved && (
              <span style={s.savedHint}>
                Refresh the chat to see the new name in action.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════
//  ABOUT SECTION
// ════════════════════════════════════════════════
function AboutSection() {
  return (
    <div>
      <div style={s.sectionHeader}>
        <h2 style={s.sectionTitle}>About Kinward</h2>
      </div>

      <div style={s.aboutCard}>
        <div style={s.aboutLogo}>
          <ShieldIcon size={48} />
        </div>
        <div style={s.aboutTitle}>KINWARD</div>
        <div style={s.aboutTagline}>Your Family's AI Guardian</div>
        <div style={s.aboutVersion}>v0.1.0 — Phase 1</div>
        <div style={s.aboutDivider} />
        <div style={s.aboutDetail}>
          <span style={s.aboutLabel}>AI Personality</span>
          <span style={s.aboutValue}>Lumina</span>
        </div>
        <div style={s.aboutDetail}>
          <span style={s.aboutLabel}>Runtime</span>
          <span style={s.aboutValue}>Ollama (local inference)</span>
        </div>
        <div style={s.aboutDetail}>
          <span style={s.aboutLabel}>Data</span>
          <span style={s.aboutValue}>100% local — never leaves your network</span>
        </div>
        <div style={s.aboutDetail}>
          <span style={s.aboutLabel}>Privacy model</span>
          <span style={s.aboutValue}>Governance without surveillance</span>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════
//  MAIN SETTINGS COMPONENT
// ════════════════════════════════════════════════
export default function KinwardSettings({ user, onBack }) {
  const [activeSection, setActiveSection] = useState("identity");

  // Inject styles
  useEffect(() => {
    const id = "kw-settings-styles";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = SETTINGS_CSS;
      document.head.appendChild(style);
    }
    return () => document.getElementById(id)?.remove();
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case "identity":
        return <IdentitySection />;
      case "memory":
        return <MemorySection adminProfile={user} />;
      case "world":
        return <WorldContextSection />;
      case "profiles":
        return <ProfilesSection />;
      case "about":
        return <AboutSection />;
      default:
        return null;
    }
  };

  return (
    <div style={s.root}>
      {/* Left nav */}
      <div style={s.nav}>
        <div style={s.navHeader}>
          <button style={s.backBtn} onClick={onBack}>
            ← Back
          </button>
          <div style={s.navBrand}>
            <ShieldIcon size={16} />
            <span style={s.navTitle}>SETTINGS</span>
          </div>
        </div>

        <div style={s.navItems}>
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              style={{
                ...s.navItem,
                ...(activeSection === sec.id ? s.navItemActive : {}),
              }}
            >
              <span style={s.navIcon}>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </div>

        <div style={s.navFooter}>
          <div style={s.navUser}>
            <span
              style={{ ...s.chipAvatar, background: avatarColor(user), width: 28, height: 28, fontSize: 12 }}
            >
              {user.name[0]}
            </span>
            <div>
              <div style={s.navUserName}>{user.name}</div>
              <div style={s.navUserRole}>{user.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div style={s.content}>
        <div style={s.contentInner}>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════
const s = {
  root: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    background: B.cream,
    fontFamily: "'Lora', Georgia, serif",
    color: B.charcoal,
  },

  // ── Nav ──
  nav: {
    width: 240,
    minWidth: 240,
    background: B.warmWhite,
    borderRight: `1px solid ${B.mist}`,
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  navHeader: {
    padding: "16px 16px 12px",
    borderBottom: `1px solid ${B.mist}`,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  backBtn: {
    background: "none",
    border: "none",
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    color: B.orange,
    cursor: "pointer",
    padding: "4px 0",
    textAlign: "left",
  },
  navBrand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  navTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 3,
    color: B.charcoal,
  },
  navItems: {
    flex: 1,
    padding: "12px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    color: B.slate,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.15s ease",
    width: "100%",
  },
  navItemActive: {
    background: B.orangeFaint,
    color: B.orange,
  },
  navIcon: {
    fontSize: 16,
    width: 24,
    textAlign: "center",
  },
  navFooter: {
    padding: 16,
    borderTop: `1px solid ${B.mist}`,
  },
  navUser: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  navUserName: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.charcoal,
  },
  navUserRole: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    color: B.slate,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // ── Content ──
  content: {
    flex: 1,
    overflowY: "auto",
    padding: 0,
  },
  contentInner: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "32px 40px",
  },

  // ── Section header ──
  sectionHeader: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 20,
    fontWeight: 500,
    letterSpacing: 2,
    color: B.charcoal,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: B.slate,
    lineHeight: 1.6,
  },

  // ── Profile chips ──
  profileChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  profileChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 14px 6px 6px",
    borderRadius: 20,
    border: `1px solid ${B.mist}`,
    background: "white",
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.charcoal,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  profileChipActive: {
    borderColor: B.orange,
    background: B.orangeFaint,
    color: B.orange,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    fontWeight: 500,
    color: "white",
    flexShrink: 0,
  },

  // ── Memory actions bar ──
  memoryActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    padding: "10px 14px",
    background: B.warmWhite,
    borderRadius: 10,
    border: `1px solid ${B.mist}`,
  },
  actionBtn: {
    background: "none",
    border: "none",
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.orange,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 6,
    transition: "background 0.15s",
  },
  memoryCount: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.slate,
  },

  // ── Category group ──
  categoryGroup: {
    marginBottom: 24,
    background: B.warmWhite,
    borderRadius: 14,
    border: `1px solid ${B.mist}`,
    overflow: "hidden",
  },
  categoryHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    background: B.cream,
    borderBottom: `1px solid ${B.mist}`,
  },
  categoryName: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    fontWeight: 500,
    color: B.orange,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  categoryCount: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    color: B.slate,
    background: B.mist,
    padding: "2px 8px",
    borderRadius: 10,
  },
  addMemBtn: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.orange,
    cursor: "pointer",
    padding: "2px 8px",
    borderRadius: 6,
  },

  // ── Memory rows ──
  memoryRow: {
    padding: "10px 16px",
    borderBottom: `1px solid ${B.mist}`,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  memoryKey: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.slate,
    letterSpacing: 0.5,
  },
  memoryValueRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  memoryValue: {
    fontSize: 14,
    color: B.charcoal,
    flex: 1,
  },
  memoryMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  sourceTag: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 9,
    color: B.slate,
    background: B.mist,
    padding: "2px 6px",
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editBtn: {
    background: "none",
    border: "none",
    fontSize: 13,
    cursor: "pointer",
    padding: "2px 4px",
    borderRadius: 4,
    opacity: 0.5,
    transition: "opacity 0.15s",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    fontSize: 13,
    cursor: "pointer",
    padding: "2px 4px",
    borderRadius: 4,
    opacity: 0.5,
    transition: "opacity 0.15s",
  },

  // ── Edit row ──
  editRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  editInput: {
    flex: 1,
    padding: "6px 10px",
    border: `1px solid ${B.orangeLight}`,
    borderRadius: 8,
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 14,
    color: B.charcoal,
    background: "white",
    outline: "none",
  },
  saveBtn: {
    padding: "6px 14px",
    background: B.orange,
    color: "white",
    border: "none",
    borderRadius: 8,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "6px 14px",
    background: "transparent",
    color: B.slate,
    border: `1px solid ${B.mist}`,
    borderRadius: 8,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    cursor: "pointer",
  },

  // ── Add form ──
  addForm: {
    padding: "12px 16px",
    borderBottom: `1px solid ${B.mist}`,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: B.orangeFaint,
  },
  addInput: {
    padding: "8px 12px",
    border: `1px solid ${B.mist}`,
    borderRadius: 8,
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.charcoal,
    background: "white",
    outline: "none",
  },
  addFormActions: {
    display: "flex",
    gap: 8,
    marginTop: 4,
  },

  // ── New category ──
  newCategorySection: {
    marginTop: 16,
    marginBottom: 24,
  },

  // ── Empty state ──
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    background: B.warmWhite,
    borderRadius: 14,
    border: `1px solid ${B.mist}`,
  },
  emptyIcon: { fontSize: 32, marginBottom: 12 },
  emptyText: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
    color: B.charcoal,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: B.slate,
    fontStyle: "italic",
  },
  loadingMsg: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    color: B.slate,
    padding: 20,
    textAlign: "center",
  },

  // ── World context ──
  worldTextarea: {
    width: "100%",
    padding: 16,
    border: `1px solid ${B.mist}`,
    borderRadius: 12,
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    color: B.charcoal,
    background: B.warmWhite,
    outline: "none",
    resize: "vertical",
    lineHeight: 1.7,
  },
  worldActions: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginTop: 16,
  },
  primaryBtn: {
    padding: "10px 24px",
    background: B.orange,
    color: "white",
    border: "none",
    borderRadius: 10,
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  worldHint: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.slate,
    fontStyle: "italic",
  },

  // ── Profiles ──
  profilesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  profileCard: {
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 14,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  profileCardAvatar: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Mono', monospace",
    fontSize: 22,
    fontWeight: 500,
    color: "white",
  },
  profileCardInfo: {
    textAlign: "center",
  },
  profileCardName: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 14,
    fontWeight: 500,
    color: B.charcoal,
    marginBottom: 4,
  },
  profileCardRole: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.slate,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  profileCardGuardrail: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.slate,
  },
  guardrailValue: {
    color: B.green,
    fontWeight: 500,
  },
  comingSoon: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.slate,
    fontStyle: "italic",
    textAlign: "center",
    padding: "20px 0",
  },

  // ── About ──
  aboutCard: {
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 14,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  aboutLogo: { marginBottom: 8 },
  aboutTitle: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 22,
    fontWeight: 500,
    letterSpacing: 6,
    color: B.charcoal,
  },
  aboutTagline: {
    fontSize: 14,
    color: B.slate,
    fontStyle: "italic",
  },
  aboutVersion: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.orange,
    marginTop: 4,
  },
  aboutDivider: {
    width: 60,
    height: 1,
    background: B.mist,
    margin: "16px 0",
  },
  aboutDetail: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 360,
    padding: "6px 0",
  },
  aboutLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.slate,
  },
  aboutValue: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 12,
    color: B.charcoal,
    textAlign: "right",
  },

  // ── Identity ──
  identityCard: {
    background: B.warmWhite,
    border: `1px solid ${B.mist}`,
    borderRadius: 14,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },
  identityShield: {
    marginBottom: 4,
  },
  identityField: {
    width: "100%",
    maxWidth: 400,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  identityLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.slate,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  identityInput: {
    padding: "10px 14px",
    border: `1px solid ${B.mist}`,
    borderRadius: 10,
    fontFamily: "'Lora', Georgia, serif",
    fontSize: 16,
    color: B.charcoal,
    background: "white",
    outline: "none",
    textAlign: "center",
    transition: "border-color 0.2s",
  },
  identityHint: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.slate,
    fontStyle: "italic",
    textAlign: "center",
  },
  identityReadonly: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    color: B.slate,
    textAlign: "center",
    padding: "8px 0",
  },
  identityActions: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  savedHint: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    color: B.green,
    fontStyle: "italic",
  },

  // ── Toast ──
  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    padding: "10px 20px",
    borderRadius: 10,
    color: "white",
    fontFamily: "'DM Mono', monospace",
    fontSize: 13,
    zIndex: 200,
    animation: "kw-fadeIn 0.2s ease",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
};

// ── CSS for hover effects and scrollbar ─────
const SETTINGS_CSS = `
  .kw-settings-edit-btn:hover,
  .kw-settings-delete-btn:hover {
    opacity: 1 !important;
  }
  
  @media (max-width: 640px) {
    /* Stack nav above content on mobile */
  }
`;
