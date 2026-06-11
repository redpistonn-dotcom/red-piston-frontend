/**
 * useCloudinaryUpload — signed direct upload to Cloudinary.
 *
 * Flow:
 *   1. GET /api/upload/signature?folder=<folder>  (your Express backend)
 *   2. POST binary to https://api.cloudinary.com/v1_1/<cloud>/image/upload
 *   3. Returns { secureUrl, publicId } on success
 *
 * Usage:
 *   const { upload, uploading, progress } = useCloudinaryUpload();
 *   const { secureUrl } = await upload(file, 'products');
 */
import { useState } from 'react';
import { api } from '../api/client';

interface UploadResult {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

interface SignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File, folder = 'redpiston'): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);

    try {
      // Step 1: get signed params from our backend.
      // Path MUST include /api — the client prepends the bare host
      // (https://red-piston-backend.onrender.com), so "/upload/..." 404s in prod.
      const sig = await api.get<SignatureResponse>(
        `/api/upload/signature`,
        { folder }
      );

      // Step 2: upload directly to Cloudinary via XHR (for progress)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sig.apiKey);
      formData.append('timestamp', String(sig.timestamp));
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);

      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            const r = JSON.parse(xhr.responseText);
            resolve({
              secureUrl: r.secure_url,
              publicId:  r.public_id,
              width:     r.width,
              height:    r.height,
              format:    r.format,
            });
          } else {
            reject(new Error(`Cloudinary upload failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
        xhr.send(formData);
      });

      setProgress(100);
      return result;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress };
}
