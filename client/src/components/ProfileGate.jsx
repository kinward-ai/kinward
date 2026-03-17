import { useState, useEffect } from "react";
import { ShieldIcon, avatarColor, api } from "./shared";
import { PinModal } from "./PinModal";

export function ProfileGate({ onLogin }) {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/profiles")
      .then((data) => setProfiles(data.profiles || data))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="kw-gate">
        <div className="kw-gate-brand">
          <ShieldIcon size={40} />
          <div className="kw-gate-title">KINWARD</div>
          <div className="kw-gate-sub">Loading profiles...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="kw-gate">
      <div className="kw-gate-brand">
        <ShieldIcon size={40} />
        <div className="kw-gate-title">KINWARD</div>
        <div className="kw-gate-sub">Who's here?</div>
      </div>

      <div className="kw-profiles-grid">
        {profiles.map((p) => (
          <div key={p.id} className="kw-profile-card" onClick={() => setSelected(p)}>
            <div className="kw-avatar" style={{ background: avatarColor(p) }}>
              {p.name[0].toUpperCase()}
            </div>
            <div className="kw-profile-name">{p.name}</div>
            <div className="kw-profile-role">{p.role}</div>
          </div>
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
  );
}
