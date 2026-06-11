/**
 * BrandHeader — the single source of truth for the RedPiston brand lockup.
 *
 * Every header in the app (ERP sidebar, mobile drawer, admin console, auth
 * screens) renders this component so the logo size, wordmark typography,
 * spacing and colors are identical everywhere. Do not hand-roll brand
 * headers in pages — change it here once instead.
 */
import { FONT } from "../theme";

interface BrandHeaderProps {
  /** Context line under the wordmark, e.g. "Industrial Ops", "Admin Console" */
  subtitle?: string;
  /** Logo square size in px (wordmark scales with it) */
  logoSize?: number;
  /** Extra class on the text block — used by the collapsible sidebar to fade it */
  textClassName?: string;
}

export function BrandHeader({ subtitle = "Industrial Ops", logoSize = 40, textClassName = "" }: BrandHeaderProps) {
  const wordmarkSize = logoSize >= 40 ? 16 : 14;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <img
        src="/logo.png"
        alt="RedPiston"
        style={{ width: logoSize, height: logoSize, objectFit: "contain", flexShrink: 0, display: "block" }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      <div className={textClassName} style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <div style={{
          display: "flex",
          fontSize: wordmarkSize, fontWeight: 700,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          fontFamily: FONT.display,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
        }}>
          <span style={{ color: "#8B1E1E" }}>RED</span>
          <span style={{ color: "#000000", marginLeft: 3 }}>PISTON</span>
        </div>
        <p style={{
          fontSize: 10, color: "#8b716e",
          fontFamily: FONT.ui, fontWeight: 600,
          margin: 0, letterSpacing: "0.08em", textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}>{subtitle}</p>
      </div>
    </div>
  );
}
