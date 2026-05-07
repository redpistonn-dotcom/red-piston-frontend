import { T, FONT } from "../../theme";
import { fmt, fmtN } from "../../utils";

export const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: T.card, border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.4)", fontFamily: FONT.ui }}>
            <div style={{ color: T.t3, marginBottom: 8, fontWeight: 600, borderBottom: `1px solid ${T.border}`, paddingBottom: 6 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 18, marginBottom: 4, alignItems: "center" }}>
                    <span style={{ color: p.color, display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: "inline-block" }} />{p.name}
                    </span>
                    <span style={{ color: T.t1, fontWeight: 700, fontFamily: FONT.mono }}>{typeof p.value === "number" && p.value > 200 ? fmt(p.value) : fmtN(p.value)}</span>
                </div>
            ))}
        </div>
    );
};
