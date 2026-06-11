import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { T, FONT } from "../../theme";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  width?: number;
  children: ReactNode;
}

/**
 * Modal — responsive accessible modal.
 *
 * Desktop/Tablet: centered overlay dialog.
 * Mobile (< 768px): bottom sheet that slides up from the bottom — native feel.
 *
 * Behaviour:
 *  - Escape key calls onClose.
 *  - Overlay click calls onClose.
 *  - Body scroll locked while open.
 *  - Auto-focuses first focusable element.
 *  - iOS safe-area insets respected.
 */
export function Modal({ open, onClose, title, subtitle, width = 560, children }: ModalProps) {
    const containerRef = useRef(null);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const update = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // Lock body scroll
    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    // Escape key → close
    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.preventDefault(); onClose?.(); }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open, onClose]);

    // Auto-focus first focusable element
    useEffect(() => {
        if (!open || !containerRef.current) return;
        const timer = setTimeout(() => {
            if (!containerRef.current) return;
            const focusable = (containerRef.current as HTMLElement).querySelector<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            focusable?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, [open]);

    if (!open) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: isMobile ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.72)",
                zIndex: 1000,
                display: "flex",
                alignItems: isMobile ? "flex-end" : "center",
                justifyContent: isMobile ? "stretch" : "center",
                padding: isMobile ? 0 : 16,
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                animation: "fadeIn 0.18s ease",
            }}
            onClick={e => e.target === e.currentTarget && onClose?.()}
        >
            <div
                ref={containerRef}
                role="dialog"
                aria-modal="true"
                aria-label={title || "Dialog"}
                style={{
                    background: T.card,
                    border: isMobile ? "none" : `1px solid ${T.borderHi}`,
                    borderRadius: isMobile ? "20px 20px 0 0" : 18,
                    padding: isMobile ? "8px 20px 20px" : 28,
                    width: "100%",
                    maxWidth: isMobile ? "100%" : width,
                    maxHeight: isMobile ? "94vh" : "92vh",
                    overflowY: "auto",
                    boxShadow: isMobile
                        ? "0 -8px 40px rgba(0,0,0,0.22)"
                        : "0 32px 80px rgba(0,0,0,0.55)",
                    fontFamily: FONT.ui,
                    animation: isMobile ? "slideUpSheet 0.32s cubic-bezier(0.16,1,0.3,1) both" : "scaleIn 0.22s cubic-bezier(0.16,1,0.3,1) both",
                    paddingBottom: isMobile
                        ? `max(20px, env(safe-area-inset-bottom, 0px))`
                        : 28,
                }}
            >
                {/* Bottom sheet drag handle (mobile only) */}
                {isMobile && (
                    <div style={{
                        width: 44, height: 4, background: "#DFBFBC",
                        borderRadius: 2, margin: "0 auto 18px",
                    }} />
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                        {title && (
                            <div style={{
                                fontSize: isMobile ? 18 : 20,
                                fontWeight: 800, color: T.t1, letterSpacing: "-0.02em",
                            }}>{title}</div>
                        )}
                        {subtitle && (
                            <div style={{ fontSize: 13, color: T.t3, marginTop: 3 }}>{subtitle}</div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: T.surface, border: `1px solid ${T.border}`,
                            cursor: "pointer", width: 36, height: 36,
                            borderRadius: 9, fontSize: 18, color: T.t3,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s", outline: "none", flexShrink: 0,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderHi; (e.currentTarget as HTMLButtonElement).style.color = T.t1; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t3; }}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
