/**
 * DataTable — premium automotive dashboard table shell.
 *
 * Provides consistent structure for ALL tables in the ERP.
 * Pages supply columns + rows; DataTable handles:
 *   - Sticky header
 *   - Hover highlighting
 *   - Loading (Skeleton.Table)
 *   - Empty state
 *   - Error state
 *   - Consistent header/cell styling
 *
 * Usage:
 *   <DataTable
 *     columns={[{ key: "name", label: "Product", width: 200 }, ...]}
 *     rows={products}
 *     loading={isLoading}
 *     empty="No products found"
 *     renderRow={(row, i) => (
 *       <tr key={row.id} className="trow">
 *         <td style={TC}>{row.name}</td>
 *         ...
 *       </tr>
 *     )}
 *   />
 */
import type { ReactNode, CSSProperties } from "react";
import { T, FONT } from "../../theme";
import { Skeleton } from "./Skeleton";

// ── Standard table cell style — import and spread this in pages ──────────────
export const TC: CSSProperties = {
  padding: "12px 14px",
  fontSize: 13,
  color: "#1C1B1B",
  fontFamily: "'Inter', system-ui, sans-serif",
  verticalAlign: "middle",
  borderBottom: "1px solid #DFBFBC",
};

// ── Mono cell (prices, quantities, codes) ────────────────────────────────────
export const TCMono: CSSProperties = {
  ...TC,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  fontSize: 13,
};

export interface Column {
  key: string;
  label: string;
  width?: number | string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
}

interface DataTableProps {
  columns: Column[];
  rows?: unknown[];
  loading?: boolean;
  error?: string | null;
  empty?: string;
  emptyIcon?: string;
  renderRow: (row: unknown, index: number) => ReactNode;
  footer?: ReactNode;
  skeletonRows?: number;
  containerStyle?: CSSProperties;
}

export function DataTable({
  columns,
  rows = [],
  loading,
  error,
  empty = "No data found",
  emptyIcon = "📋",
  renderRow,
  footer,
  skeletonRows = 6,
  containerStyle,
}: DataTableProps) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(28,27,27,0.05)",
        ...containerStyle,
      }}
    >
      {loading ? (
        /* ── Loading skeleton ─────────────────────────────────────────────── */
        <>
          <div
            style={{
              background: T.bg,
              borderBottom: `1px solid ${T.border}`,
              padding: "10px 14px",
              display: "flex",
              gap: 32,
            }}
          >
            {columns.map(c => (
              <Skeleton key={c.key} width={Math.min(80, Number(c.width) || 80)} height={9} />
            ))}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {Array.from({ length: skeletonRows }).map((_, i) => (
                <Skeleton.Row key={i} cols={columns.length} />
              ))}
            </tbody>
          </table>
        </>
      ) : error ? (
        /* ── Error state ──────────────────────────────────────────────────── */
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.crimson, marginBottom: 6 }}>
            Failed to load data
          </div>
          <div style={{ fontSize: 12, color: T.t3 }}>{error}</div>
        </div>
      ) : (
        /* ── Table ────────────────────────────────────────────────────────── */
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {columns.map(c => (
                  <th
                    key={c.key}
                    className="th-cell"
                    style={{
                      width: c.width,
                      textAlign: c.align || "left",
                    }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ padding: "56px 24px", textAlign: "center" }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.2 }}>{emptyIcon}</div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: T.t2,
                        marginBottom: 6,
                        fontFamily: FONT.ui,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {empty}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => renderRow(row, i))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer slot ─────────────────────────────────────────────────────── */}
      {footer && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: `1px solid ${T.border}`,
            background: T.bg,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
