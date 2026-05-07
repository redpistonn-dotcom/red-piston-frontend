import { STATUS } from "../../utils";
import { FONT } from "../../theme";

export function Badge({ status, label, bg, color }) {
    const m = status ? STATUS[status] : { bg, color, label };
    if (!m) return null;
    return (
        <span style={{ background: m.bg, color: m.color, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, letterSpacing: "0.03em", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: FONT.ui }}>
            {status && STATUS[status] && <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, display: "inline-block", flexShrink: 0 }} />}
            {m.label}
        </span>
    );
}
