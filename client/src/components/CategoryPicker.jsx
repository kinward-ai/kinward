import { useEffect, useState } from "react";
import { getChatModes } from "../api";
import { CATEGORIES } from "./shared";

// Fallback if the modes endpoint is unreachable: the four original modes
// with the pre-chat_modes role rules, so starting a chat always works.
function fallbackModes(profile) {
  return CATEGORIES.filter((c) => {
    if (profile.role === "child") return c.id === "kids";
    if (profile.role === "teen") return c.id !== "kids";
    return true;
  });
}

export function CategoryPicker({ profile, onSelect }) {
  // Modes come from the server, already filtered for this profile's role
  const [modes, setModes] = useState(null);

  useEffect(() => {
    let alive = true;
    getChatModes()
      .then((list) => { if (alive) setModes(list); })
      .catch(() => { if (alive) setModes(fallbackModes(profile)); });
    return () => { alive = false; };
  }, [profile.id]);

  if (!modes) return null;

  return (
    <div className="kw-category-picker">
      <div className="kw-category-label">Start a conversation</div>
      {modes.map((mode) => (
        <div key={mode.id} className="kw-category-option" onClick={() => onSelect(mode.id)}>
          <div className="kw-category-option-name">
            {mode.icon} {mode.name}
          </div>
          <div className="kw-category-option-desc">{mode.description || mode.desc}</div>
        </div>
      ))}
    </div>
  );
}
