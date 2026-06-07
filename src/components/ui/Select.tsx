import { useState } from "react";
import { T, FONT } from "../../theme";

interface SelectOption { value: string|number; label?: string; }
interface SelectProps {
  value: string|number; onChange: (v: string) => void;
  options: (SelectOption|string)[]; style?: import('react').CSSProperties;
}
export function Select({ value, onChange, options, style: sx = {} }: SelectProps) {
    const [focus, setF] = useState(false);
    return (
        <select value={value} onChange={e => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
            style={{ background: T.surface, border: `1px solid ${focus ? T.amber : T.border}`, color: T.t1, borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none", fontFamily: FONT.ui, cursor: "pointer", width: "100%", boxShadow: focus ? `0 0 0 3px ${T.amberGlow}` : "none", transition: "border-color 0.15s", ...sx }}>
            {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
    );
}
