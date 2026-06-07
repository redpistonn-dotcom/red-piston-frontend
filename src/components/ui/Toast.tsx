import { useState, useCallback } from "react";
import { T, FONT } from "../../theme";
import { uid } from "../../utils";

interface ToastItem { id: string; type?: 'success'|'error'|'info'|'warn'|'emerald'; title?: string; msg: string; }
interface ToastProps { items: ToastItem[]; onRemove: (id: string) => void; }
export function Toast({ items, onRemove }: ToastProps) {
    return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(t => {
                const cfg = {
                    success: { icon: "✓", bg: T.emeraldBg,  border: "rgba(22,163,74,0.3)",  color: T.emerald },
                    emerald: { icon: "✓", bg: T.emeraldBg,  border: "rgba(22,163,74,0.3)",  color: T.emerald },
                    error:   { icon: "✕", bg: T.crimsonBg,  border: "rgba(186,26,26,0.3)",  color: T.crimson },
                    info:    { icon: "ℹ", bg: T.skyBg,      border: "rgba(2,132,199,0.3)",  color: T.sky     },
                    warn:    { icon: "⚠", bg: T.amberGlow,  border: "rgba(139,30,30,0.3)",  color: T.amber   },
                }[t.type] || { icon: "ℹ", bg: T.skyBg, border: "rgba(2,132,199,0.3)", color: T.sky };
                return (
                    <div key={t.id} className="toast-in" style={{ background: "#FFFFFF", border: `1px solid ${cfg.border}`, borderLeft: `3px solid ${cfg.color}`, borderRadius: 12, padding: "13px 16px", minWidth: 300, maxWidth: 400, display: "flex", gap: 10, alignItems: "flex-start", boxShadow: "0 8px 32px rgba(28,27,27,0.14), 0 2px 8px rgba(28,27,27,0.07)", fontFamily: FONT.ui }}>
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
