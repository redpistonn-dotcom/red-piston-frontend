/**
 * ChartTip — premium glassmorphism chart tooltip.
 * Used as <Tooltip content={<ChartTip />} /> in all Recharts charts.
 */
import { T, FONT } from "../../theme";
import { fmt, fmtN } from "../../utils";

export const ChartTip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                background: "rgba(255, 255, 255, 0.96)",
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 12,
                fontFamily: FONT.ui,
                boxShadow: "0 8px 32px rgba(28,27,27,0.12), 0 2px 8px rgba(28,27,27,0.06)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                minWidth: 160,
                pointerEvents: "none",
            }}
        >
            {/* Label */}
            {label && (
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.t3,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 10,
                        paddingBottom: 8,
                        borderBottom: `1px solid ${T.border}`,
                    }}
                >
                    {label}
                </div>
            )}
            {/* Payload rows */}
            {payload.map((p, i) => (
                <div
                    key={i}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 20,
                        marginBottom: i < payload.length - 1 ? 6 : 0,
                    }}
                >
                    <span
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: T.t2,
                            fontSize: 11,
                        }}
                    >
                        <span
                            style={{
                                width: 9,
                                height: 9,
                                borderRadius: 3,
                                background: p.color,
                                display: "inline-block",
                                flexShrink: 0,
                            }}
                        />
                        {p.name}
                    </span>
                    <span
                        style={{
                            color: T.t1,
                            fontWeight: 700,
                            fontFamily: FONT.mono,
                            fontSize: 13,
                        }}
                    >
                        {typeof p.value === "number" && p.value > 200 ? fmt(p.value) : fmtN(p.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};
