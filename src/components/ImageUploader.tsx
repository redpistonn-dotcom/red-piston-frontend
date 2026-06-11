/**
 * ImageUploader — drag-and-drop / click-to-upload component.
 *
 * Usage (ERP inventory, catalog, shop profile, workshop job cards):
 *
 *   <ImageUploader
 *     folder="products"
 *     currentUrl={part.imageUrl}
 *     onUploaded={(url, publicId) => setPart(p => ({ ...p, imageUrl: url }))}
 *   />
 *
 * The component handles the full upload cycle and only surfaces the final
 * secure_url + public_id to the parent via onUploaded. The parent is
 * responsible for saving those values to the backend.
 */
import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';

interface Props {
  folder?: string;
  currentUrl?: string | null;
  onUploaded: (secureUrl: string, publicId: string) => void;
  onError?: (msg: string) => void;
  /** Max file size in MB — default 10 */
  maxMb?: number;
  /** Accepted MIME types — default images only */
  accept?: string;
  label?: string;
  className?: string;
}

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_MB_DEFAULT = 10;

export function ImageUploader({
  folder = 'redpiston',
  currentUrl,
  onUploaded,
  onError,
  maxMb = MAX_MB_DEFAULT,
  accept = ACCEPTED,
  label = 'Upload Image',
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress } = useCloudinaryUpload();
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      const msg = 'Please select an image file (JPEG, PNG, WebP)';
      setError(msg); onError?.(msg); return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      const msg = `File is too large — maximum ${maxMb} MB`;
      setError(msg); onError?.(msg); return;
    }
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const result = await upload(file, folder);
      onUploaded(result.secureUrl, result.publicId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg); onError?.(msg);
      setPreview(currentUrl ?? null); // revert preview
    }
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ''; // allow re-selecting same file
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Drop zone / preview */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3',
          maxHeight: 220,
          border: `2px dashed ${dragging ? '#8b1e1e' : error ? '#ba1a1a' : '#d1c4c3'}`,
          borderRadius: 10,
          backgroundColor: dragging ? 'rgba(139,30,30,0.04)' : '#faf8f8',
          cursor: uploading ? 'default' : 'pointer',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.15s, background-color 0.15s',
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 12px', color: '#8b716e' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 6 }}>
              cloud_upload
            </span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
            <br />
            <span style={{ fontSize: 11 }}>Drag & drop or click to browse</span>
            <br />
            <span style={{ fontSize: 10 }}>JPEG, PNG, WebP · max {maxMb} MB</span>
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(255,255,255,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <div style={{ width: 120, height: 4, backgroundColor: '#e5e0df', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#8b1e1e', transition: 'width 0.1s' }} />
            </div>
            <span style={{ fontSize: 12, color: '#58413f', fontWeight: 600 }}>Uploading… {progress}%</span>
          </div>
        )}

        {/* Change overlay on hover when preview exists */}
        {preview && !uploading && (
          <div className="img-uploader-hover" style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'rgba(0,0,0,0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background-color 0.15s',
          }}>
            <span className="material-symbols-outlined img-uploader-icon"
              style={{ fontSize: 28, color: 'transparent', transition: 'color 0.15s' }}>
              edit
            </span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p style={{ fontSize: 12, color: '#ba1a1a', margin: 0 }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={onInputChange}
      />

      <style>{`
        .img-uploader-hover:hover { background-color: rgba(0,0,0,0.28) !important; }
        .img-uploader-hover:hover .img-uploader-icon { color: #fff !important; }
      `}</style>
    </div>
  );
}

export default ImageUploader;
