import { useState } from "react";
import type { CSSProperties, ReactNode, MouseEvent } from "react";
import { T, FONT, SHADOWS } from "../../theme";

interface BtnProps {
  children?: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  variant?: 'amber'|'emerald'|'sky'|'crimson'|'danger'|'ghost'|'subtle'|'outline';
  size?: 'xs'|'sm'|'md'|'lg';
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: CSSProperties;
  className?: string;
  type?: 'button'|'submit'|'reset';
  title?: string;
  [key: string]: unknown;
}

const VARIANTS = {
    amber:   { bg: T.amber,       text: "#fff",  border: "none",                      shadow: SHADOWS.amber,   hoverShadow: SHADOWS.amberHover },
    emerald: { bg: T.emerald,     text: "#fff",  border: "none",                      shadow: SHADOWS.emerald, hoverShadow: "0 6px 22px rgba(22,163,74,0.32)" },
    sky:     { bg: T.sky,         text: "#fff",  border: "none",                      shadow: "0 4px 14px rgba(2,132,199,0.28)", hoverShadow: "0 6px 20px rgba(2,132,199,0.38)" },
    crimson: { bg: T.crimson,     text: "#fff",  border: "none",                      shadow: "0 4px 14px rgba(186,26,26,0.28)", hoverShadow: "0 6px 20px rgba(186,26,26,0.38)" },
    danger:  { bg: T.crimson,     text: "#fff",  border: "none",                      shadow: "0 4px 14px rgba(186,26,26,0.28)", hoverShadow: "0 6px 20px rgba(186,26,26,0.38)" },
    ghost:   { bg: "transparent", text: T.t2,    border: `1px solid ${T.border}`,     shadow: "none",          hoverShadow: SHADOWS.sm },
    subtle:  { bg: T.surface,     text: T.t2,    border: `1px solid ${T.border}`,     shadow: SHADOWS.xs,      hoverShadow: SHADOWS.sm },
    outline: { bg: "transparent", text: T.amber, border: `1.5px solid ${T.amber}44`,  shadow: "none",          hoverShadow: SHADOWS.sm },
};

const SIZES = {
    xs: { pad: "4px 10px",  fs: 11, radius: 6  },
    sm: { pad: "6px 14px",  fs: 12, radius: 7  },
    md: { pad: "9px 20px",  fs: 13, radius: 8  },
    lg: { pad: "12px 28px", fs: 15, radius: 10 },
};

export function Btn({ children, onClick, variant = "amber", size = "md", full, disabled, loading, style: sx = {}, className = "", type = "button", ...rest }) {
    const [hovered, setHovered] = useState(false);
    const [active, setActive] = useState(false);

    const v = VARIANTS[variant] || VARIANTS.ghost;
    const s = SIZES[size] || SIZES.md;
    const isGhostLike = variant === "ghost" || variant === "subtle" || variant === "outline";
    const isFilled = !isGhostLike;
    const isInteractive = !disabled && !loading;

    const textColor = isGhostLike && hovered && isInteractive ? T.amber : v.text;
    const borderVal = isGhostLike && hovered && isInteractive ? `1.5px solid ${T.amber}` : v.border || "none";
    const shadow = isFilled
        ? (hovered && isInteractive ? v.hoverShadow : v.shadow)
        : (hovered && isInteractive ? v.hoverShadow : "none");

    let transform = "none";
    if (isInteractive) {
        if (active) transform = "scale(0.97) translateY(0)";
        else if (hovered) transform = "scale(1.02) translateY(-1px)";
    }

    return (
        <button
            type={type}
            className={className}
            onClick={onClick}
            disabled={disabled || loading}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setActive(false); }}
            onMouseDown={() => setActive(true)}
            onMouseUp={() => setActive(false)}
            style={{
                background: v.bg,
                color: textColor,
                border: borderVal,
                borderRadius: s.radius,
                padding: s.pad,
                fontSize: s.fs,
                fontWeight: isFilled ? 700 : 600,
                cursor: disabled || loading ? "not-allowed" : "pointer",
                outline: "none",
                fontFamily: FONT.ui,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: full ? "100%" : "auto",
                opacity: disabled ? 0.45 : 1,
                letterSpacing: "0.01em",
                boxShadow: shadow,
                transform,
                transition: "transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.18s cubic-bezier(0.16,1,0.3,1), border-color 0.15s, color 0.15s",
                userSelect: "none",
                WebkitUserSelect: "none",
                ...sx,
            }}
            {...rest}
        >
            {loading && (
                <span style={{
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    border: "2px solid transparent",
                    borderTopColor: isFilled ? "#fff" : T.amber,
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                    flexShrink: 0,
                }} />
            )}
            {children}
        </button>
    );
}
