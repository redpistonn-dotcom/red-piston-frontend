import { useState } from "react";
import { T, FONT } from "../../theme";

/**
 * PartImage
 *
 * Drop-in image renderer for auto parts with a graceful placeholder when:
 *   • src is null / undefined / empty
 *   • src is a 1-4 char emoji string  → renders it as a large emoji
 *   • the URL returns a 404 / fails   → onError swaps to placeholder
 *
 * Props:
 *   src       — image URL (or null/undefined)
 *   alt       — accessible alt text (used in placeholder too)
 *   style     — applied to the outer wrapper div
 *   size      — 'sm' | 'md' | 'lg'  (controls placeholder icon size)
 */
export function PartImage({ src, alt = "Part", style = {}, size = "md" }) {
  const [failed, setFailed] = useState(false);

  // Icon size per variant
  const iconSize = size === "sm" ? 22 : size === "lg" ? 56 : 36;
  const labelSize = size === "sm" ? 9 : size === "lg" ? 13 : 11;

  const showPlaceholder = !src || failed;

  // Case 1: emoji string (legacy mock-data pattern)
  const isEmoji = src && typeof src === "string" && src.length <= 4 && !src.startsWith("http");

  const wrapperStyle = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    background: T.surface,
    ...style,
  };

  if (isEmoji) {
    return (
      <div style={wrapperStyle}>
        <span style={{ fontSize: iconSize * 1.4, opacity: 0.85, lineHeight: 1 }}>{src}</span>
      </div>
    );
  }

  if (showPlaceholder) {
    return (
      <div style={wrapperStyle}>
        {/* Subtle grid pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle, ${T.border} 1px, transparent 1px)`,
          backgroundSize: "18px 18px",
          opacity: 0.35,
        }} />

        {/* Centred icon + label */}
        <div style={{
          position: "relative",
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 6,
        }}>
          {/* Wrench SVG */}
          <svg
            width={iconSize} height={iconSize}
            viewBox="0 0 24 24" fill="none"
            stroke={T.t4} strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <span style={{
            fontSize: labelSize,
            color: T.t4,
            fontFamily: FONT.ui,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textAlign: "center",
            maxWidth: "80%",
            lineHeight: 1.3,
          }}>
            No Image
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}
