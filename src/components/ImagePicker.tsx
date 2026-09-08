import { useRef } from "react";
import { T } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn, Field } from "./ui";
import { useCloudinaryUpload } from "../hooks/useCloudinaryUpload";

interface ImagePickerProps {
  label: string;
  url: string;
  onChange: (url: string) => void;
  folder: string;
  size?: number;
}

/**
 * Single-slot signed image upload — thumbnail + Upload/Change/Remove.
 * For a gallery of independent slots (e.g. a portfolio's before/after pair),
 * render one ImagePicker per slot rather than reaching for a multi-image
 * uploader — there's no shared state between slots here.
 */
export function ImagePicker({ label, url, onChange, folder, size = 64 }: ImagePickerProps) {
  const { upload, uploading } = useCloudinaryUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useAppCtx();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const res = await upload(file, folder);
      onChange(res.secureUrl);
    } catch (e: any) {
      toast(e?.message || "Image upload failed", "error");
    }
  };

  return (
    <Field label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {url
          ? <img src={url} alt={label} style={{ width: size, height: size, borderRadius: 10, objectFit: "cover", border: `1px solid ${T.border}` }} />
          : <div style={{ width: size, height: size, borderRadius: 10, background: T.surface, border: `1px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: T.t3 }}>—</div>}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => pick(e.target.files?.[0])} />
        <Btn variant="subtle" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>{url ? "Change" : "Upload"}</Btn>
        {url && <Btn variant="ghost" size="sm" onClick={() => onChange("")}>Remove</Btn>}
      </div>
    </Field>
  );
}
