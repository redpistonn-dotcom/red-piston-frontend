/**
 * ProfileNudge — shows pending profile-completion tasks for shop owners.
 *
 * Rules:
 * - Checks which profile fields are missing (currently: shop photo)
 * - Each nudge can be dismissed for the session (localStorage flag)
 * - Dismissed nudges reappear on the next login (intentional — soft reminder)
 * - Renders nothing if all tasks are complete or all dismissed
 */
import { useState } from "react";
import { useAppCtx } from "../AppCtx";
import { useCloudinaryUpload } from "../hooks/useCloudinaryUpload";
import { api } from "../api/client";

const DISMISS_KEY = "rp_nudge_dismissed";

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]"); } catch { return []; }
}
function dismiss(key: string) {
  const d = getDismissed();
  if (!d.includes(key)) localStorage.setItem(DISMISS_KEY, JSON.stringify([...d, key]));
}

export function ProfileNudge() {
  const { currentUser, handleLogin } = useAppCtx();
  const { upload, uploading, progress } = useCloudinaryUpload();
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const shop = currentUser?.shop;
  const isShopOwner = currentUser?.role === "SHOP_OWNER";

  // Build list of pending nudge tasks
  const tasks: { key: string; icon: string; title: string; action: string; onAction: () => void }[] = [];

  if (isShopOwner && shop && !shop.photoUrl) {
    tasks.push({
      key: "shop_photo",
      icon: "📷",
      title: "Add a shop photo so customers can recognise your shop",
      action: "Upload Photo",
      onAction: () => setUploaderOpen(true),
    });
  }

  const visible = tasks.filter(t => !dismissed.includes(t.key));
  if (visible.length === 0) return null;

  const handleDismiss = (key: string) => {
    dismiss(key);
    setDismissed(getDismissed());
    setUploaderOpen(false);
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { setUploadErr("Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadErr("Max 10 MB"); return; }
    setUploadErr("");
    try {
      const result = await upload(file, "shops");
      // Persist to backend
      await api.patch("/auth/me/shop", { photoUrl: result.secureUrl });
      // Update local context so nudge disappears immediately
      if (handleLogin && currentUser) {
        handleLogin({ ...currentUser, shop: { ...currentUser.shop!, photoUrl: result.secureUrl } });
      }
      setUploaderOpen(false);
      handleDismiss("shop_photo");
    } catch {
      setUploadErr("Upload failed — please try again");
    }
  };

  return (
    <>
      {/* Nudge banner */}
      <div style={{
        margin: "0 0 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        {visible.map(task => (
          <div key={task.key} style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "linear-gradient(90deg, rgba(190,43,26,0.08) 0%, rgba(190,43,26,0.03) 100%)",
            border: "1px solid rgba(190,43,26,0.25)",
            borderRadius: 10,
            padding: "10px 14px",
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{task.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1c1b1b" }}>{task.title}</div>
              <div style={{ fontSize: 11, color: "#8b716e", marginTop: 2 }}>
                Profile upgrade · Tap to complete or ignore
              </div>
            </div>
            <button
              onClick={task.onAction}
              style={{ background: "#BE2B1A", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {task.action}
            </button>
            <button
              onClick={() => handleDismiss(task.key)}
              title="Dismiss for this session"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#8b716e", fontSize: 16, padding: "4px", flexShrink: 0, lineHeight: 1 }}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Upload modal */}
      {uploaderOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }} onClick={e => e.target === e.currentTarget && setUploaderOpen(false)}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400,
            boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1c1b1b" }}>Upload Shop Photo</div>
              <button onClick={() => setUploaderOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#8b716e" }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: "#58413f", marginBottom: 16 }}>
              A clear photo of your shop front helps customers find and trust you on the marketplace.
            </p>

            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              border: "2px dashed #dfbfbc", borderRadius: 12, padding: "32px 16px",
              cursor: uploading ? "default" : "pointer", background: "#faf8f8",
              position: "relative", overflow: "hidden",
            }}>
              {uploading ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 140, height: 5, background: "#f0eded", borderRadius: 4, margin: "0 auto 8px" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: "#BE2B1A", borderRadius: 4, transition: "width 0.1s" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "#58413f" }}>Uploading… {progress}%</span>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: 40, marginBottom: 8 }}>📷</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1c1b1b" }}>Click to browse</span>
                  <span style={{ fontSize: 11, color: "#8b716e", marginTop: 4 }}>JPEG, PNG, WebP · max 10 MB</span>
                </>
              )}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
            </label>

            {uploadErr && <p style={{ fontSize: 12, color: "#ba1a1a", marginTop: 8 }}>{uploadErr}</p>}

            <button onClick={() => handleDismiss("shop_photo")}
              style={{ width: "100%", marginTop: 12, padding: "10px", background: "none", border: "1px solid #dfbfbc", borderRadius: 10, color: "#8b716e", fontSize: 13, cursor: "pointer" }}>
              Remind me later
            </button>
          </div>
        </div>
      )}
    </>
  );
}
