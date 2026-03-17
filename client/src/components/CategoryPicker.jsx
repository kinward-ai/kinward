import { CATEGORIES } from "./shared";

export function CategoryPicker({ profile, onSelect }) {
  // Filter categories based on profile role
  const available = CATEGORIES.filter((c) => {
    if (profile.role === "child") return c.id === "kids";
    if (profile.role === "teen") return c.id !== "kids";
    return true; // adults see all
  });

  return (
    <div className="kw-category-picker">
      <div className="kw-category-label">Start a conversation</div>
      {available.map((cat) => (
        <div key={cat.id} className="kw-category-option" onClick={() => onSelect(cat.id)}>
          <div className="kw-category-option-name">
            {cat.icon} {cat.name}
          </div>
          <div className="kw-category-option-desc">{cat.desc}</div>
        </div>
      ))}
    </div>
  );
}
