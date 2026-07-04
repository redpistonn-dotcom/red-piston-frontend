import type { ReactNode } from "react";
import { T, FONT } from "../../theme";

interface FieldProps {
    label?: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: ReactNode;
    horizontal?: boolean;
}

export function Field({ label, required = false, hint, error, children, horizontal = false }: FieldProps) {
    return (
        <div style={{ display: "flex", flexDirection: horizontal ? "row" : "column", gap: horizontal ? 12 : 6, alignItems: horizontal ? "center" : "stretch" }}>
            {label && (
                <label style={{ fontSize: 12, fontWeight: 600, color: T.t3, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: FONT.ui, whiteSpace: "nowrap", flexShrink: 0, marginBottom: horizontal ? 0 : 0 }}>
                    {label}{required && <span style={{ color: T.crimson, marginLeft: 2 }}>*</span>}
                </label>
            )}
            <div style={{ flex: 1 }}>{children}</div>
            {hint && !error && <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui, marginTop: 2 }}>{hint}</div>}
            {error && <div style={{ fontSize: 11, color: T.crimson, fontWeight: 600, fontFamily: FONT.ui, marginTop: 2 }}>↑ {error}</div>}
        </div>
    );
}
