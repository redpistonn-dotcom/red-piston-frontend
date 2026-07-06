import { T, FONT } from "../../theme";

interface QtyStepperProps {
  value: number;
  min: number;
  max?: number;
  onChange: (v: number) => void;
}

// +/- buttons + select-on-focus. Plain number inputs made adjusting a
// pre-filled qty (which starts at the max returnable amount) fiddly — no
// visible way to nudge it without selecting the text first.
export function QtyStepper({ value, min, max, onChange }: QtyStepperProps) {
  const clamp = (v: number) => Math.max(min, max != null ? Math.min(max, v) : v);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min}
        style={{ width: 26, height: 30, background: T.surface, border: `1px solid ${T.border}`, borderRadius: "8px 0 0 8px", color: T.t1, fontSize: 14, fontWeight: 700, cursor: value <= min ? "not-allowed" : "pointer", opacity: value <= min ? 0.4 : 1 }}>−</button>
      <input type="number" min={min} max={max} value={value}
        onFocus={e => e.target.select()}
        onChange={e => onChange(clamp(parseInt(e.target.value) || min))}
        style={{ width: 44, height: 30, background: T.surface, border: `1px solid ${T.border}`, borderLeft: "none", borderRight: "none", padding: "0 4px", color: T.t1, fontFamily: FONT.mono, fontSize: 13, textAlign: "center", outline: "none" }} />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={max != null && value >= max}
        style={{ width: 26, height: 30, background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0 8px 8px 0", color: T.t1, fontSize: 14, fontWeight: 700, cursor: max != null && value >= max ? "not-allowed" : "pointer", opacity: max != null && value >= max ? 0.4 : 1 }}>+</button>
    </div>
  );
}
