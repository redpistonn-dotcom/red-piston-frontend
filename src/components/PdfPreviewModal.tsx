/**
 * PdfPreviewModal — universal PDF preview overlay.
 *
 * Usage:
 *   <PdfPreviewModal
 *     url={blobUrl}          // blob: or https: URL — must be fetchable with auth header already done
 *     filename="invoice.pdf" // used for the <a download> filename
 *     title="Invoice Preview"
 *     onClose={() => ...}
 *   />
 *
 * The parent component is responsible for:
 *  1. Fetching the PDF with auth headers and creating a blob URL.
 *  2. Passing that blob URL as `url`.
 *  3. Revoking the blob URL after the modal closes (see cleanup prop or do it in onClose).
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ─── Theming ──────────────────────────────────────────────────────────────────
const T = {
  bg:     '#0F0F0F',
  panel:  '#1A1A1A',
  border: '#2A2A2A',
  amber:  '#D97706',
  t1:     '#F5F5F5',
  t2:     '#CCCCCC',
  t3:     '#888888',
};

interface PdfPreviewModalProps {
  /** blob: URL or a pre-fetched object URL pointing to the PDF */
  url: string | null;
  /** Loading state — shows a spinner when true */
  loading?: boolean;
  /** Display title shown in the modal header */
  title?: string;
  /** Filename used for the download button */
  filename?: string;
  /** Called when the user closes the modal */
  onClose: () => void;
  /** Optional error message to show instead of the iframe */
  error?: string | null;
}

export default function PdfPreviewModal({
  url,
  loading = false,
  title = 'Invoice Preview',
  filename = 'invoice.pdf',
  onClose,
  error = null,
}: PdfPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handlePrint = () => {
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      // Fallback: open in new tab and print from there
      if (url) {
        const w = window.open(url, '_blank');
        w?.addEventListener('load', () => w.print());
      }
    }
  };

  return createPortal(
    <div
      id="pdf-preview-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483647,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: '100%',
          maxWidth: 900,
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: `1px solid ${T.border}`,
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.t1 }}>
            📄 {title}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Download */}
            <button
              id="pdf-preview-download-btn"
              onClick={handleDownload}
              disabled={!url}
              style={{
                height: 34, padding: '0 14px', borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: url ? T.amber : '#333',
                color: url ? '#fff' : T.t3,
                fontSize: 12, fontWeight: 700, cursor: url ? 'pointer' : 'not-allowed',
                transition: 'opacity 0.15s',
              }}
            >
              ⬇ Download
            </button>
            {/* Print */}
            <button
              id="pdf-preview-print-btn"
              onClick={handlePrint}
              disabled={!url}
              style={{
                height: 34, padding: '0 14px', borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: url ? '#2563EB' : '#333',
                color: url ? '#fff' : T.t3,
                fontSize: 12, fontWeight: 700, cursor: url ? 'pointer' : 'not-allowed',
                transition: 'opacity 0.15s',
              }}
            >
              🖨 Print
            </button>
            {/* Close */}
            <button
              id="pdf-preview-close-btn"
              onClick={onClose}
              aria-label="Close PDF preview"
              style={{
                width: 34, height: 34, borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: 'transparent',
                color: T.t2, fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, position: 'relative', background: '#555' }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 12, color: T.t2,
            }}>
              <div style={{
                width: 36, height: 36, border: `3px solid ${T.border}`,
                borderTop: `3px solid ${T.amber}`,
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 13 }}>Loading PDF…</span>
            </div>
          )}
          {error && !loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 8, color: '#F87171',
              padding: 24,
            }}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              <span style={{ fontSize: 13, textAlign: 'center' }}>{error}</span>
            </div>
          )}
          {url && !error && (
            <iframe
              ref={iframeRef}
              id="pdf-preview-frame"
              title={title}
              src={url}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body,
  );
}
