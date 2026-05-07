import { useState, useCallback } from "react";
import { T, FONT } from "../../theme";
import { uid } from "../../utils";

export function Toast({ items, onRemove }) {
    return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(t => {
                const cfg = {
                    success: { icon: "HMROK", bg: T.emeraldBg, border: "rgba(16,185,129,0.3)", color: T.emerald },
                    error: { icon: "✕", bg: T.crimsonBg, border: "rgba(239,68,68,0.3)", color: T.crimson },
                    info: { icon: "ℹ", bg: T.skyBg, border: "rgba(56,189,248,0.3)", color: T.sky },
                    warn: { icon: "⚠", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", color: T.amber },
                }[t.type] || {};
                return (
                    <div key={t.id} className="toast-in" style={{ background: T.card, border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.color}`, borderRadius: 10, padding: "12px 16px", minWidth: 300, maxWidth: 380, display: "flex", gap: 10, alignItems: "flex-start", boxShadow: "0 8px 30px rgba(0,0,0,0.4)", fontFamily: FONT.ui }}>
                        <span style={{ fontSize: 16, color: cfg.color, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                        <div style={{ flex: 1 }}>
                            {t.title && <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginBottom: 2 }}>{t.title}</div>}
                            <div style={{ fontSize: 13, color: T.t2, lineHeight: 1.4 }}>{t.msg}</div>
                        </div>
                        <button onClick={() => onRemove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.t3, fontSize: 16, marginTop: -2, padding: "0 2px", fontFamily: FONT.ui }}>×</button>
                    </div>
                );
            })}
        </div>
    );
}
