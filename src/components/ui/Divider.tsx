import { T, FONT } from "../../theme";

export function Divider({ label }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0" }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            {label && <span style={{ fontSize: 11, color: T.t3, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: FONT.ui, flexShrink: 0 }}>{label}</span>}
            <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>
    );
}
