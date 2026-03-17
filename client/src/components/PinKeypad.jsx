import { BRAND } from "./shared";

export function PinKeypad({ pin, error, onKey, onBackspace, onCancel }) {
  return (
    <>
      <div className="kw-pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`kw-pin-dot ${i < pin.length ? (error ? "error" : "filled") : ""}`}
          />
        ))}
      </div>

      <div className="kw-pin-keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d} className="kw-pin-key" onClick={() => onKey(String(d))}>
            {d}
          </button>
        ))}
        <button className="kw-pin-key action" onClick={onCancel}>
          Cancel
        </button>
        <button className="kw-pin-key" onClick={() => onKey("0")}>
          0
        </button>
        <button className="kw-pin-key action" onClick={onBackspace}>
          ←
        </button>
      </div>
    </>
  );
}
