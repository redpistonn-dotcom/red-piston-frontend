import { useState, useRef, useEffect } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { T, FONT } from "../../theme";

interface InputProps {
    value: string | number;
    onChange?: (v: string) => void;
    placeholder?: string;
    type?: string;
    prefix?: string;
    suffix?: string;
    icon?: string;
    autoFocus?: boolean;
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
    readOnly?: boolean;
    disabled?: boolean;
    /** Red border + glow — set true when a required field is empty on a failed submit attempt. */
    invalid?: boolean;
    style?: CSSProperties;
    [key: string]: unknown;
}

export function Input({
    value,
    onChange,
    placeholder,
    type = "text",
    prefix,
    suffix,
    icon,
    autoFocus,
    onKeyDown,
    readOnly,
    disabled,
    invalid,
    style: sx = {},
    ...rest
}: InputProps) {
    const [focus, setF] = useState(false);
    const ref = useRef(null);
    useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);

    return (
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            {(icon || prefix) && (
                <span style={{
                    position: "absolute",
                    left: 10,
                    fontSize: prefix ? 13 : 14,
                    color: T.t3,
                    fontFamily: prefix ? FONT.mono : undefined,
                    fontWeight: 600,
                    pointerEvents: "none",
                    zIndex: 1,
                }}>
                    {icon || prefix}
                </span>
            )}
            <input
                ref={ref}
                type={type}
                value={value}
                onChange={e => onChange && onChange(e.target.value)}
                placeholder={placeholder}
                readOnly={readOnly}
                disabled={disabled}
                autoFocus={autoFocus}
                onKeyDown={onKeyDown}
                onFocus={() => setF(true)}
                onBlur={() => setF(false)}
                style={{
                    width: "100%",
                    background: T.surface,
                    border: `1px solid ${invalid ? T.crimson : focus ? T.sky : T.border}`,
                    color: T.t1,
                    borderRadius: 10,
                    padding: `11px ${suffix ? "36px" : "14px"} 11px ${(icon || prefix) ? "34px" : "14px"}`,
                    fontSize: 14,
                    outline: "none",
                    fontFamily: type === "number" ? FONT.mono : FONT.ui,
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    boxShadow: invalid ? `0 0 0 3px ${T.crimson}22` : focus ? `0 0 0 3px ${T.sky}22` : "none",
                    cursor: disabled ? "not-allowed" : undefined,
                    opacity: disabled ? 0.55 : 1,
                    ...sx,
                }}
                {...rest}
            />
            {suffix && (
                <span style={{
                    position: "absolute",
                    right: 10,
                    fontSize: 12,
                    color: T.t3,
                    fontFamily: FONT.mono,
                    pointerEvents: "none",
                }}>
                    {suffix}
                </span>
            )}
        </div>
    );
}
