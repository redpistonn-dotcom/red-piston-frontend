import { useState, useEffect } from "react";
import { T, FONT } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn, Field, Input } from "../components/ui";
import { ImagePicker } from "../components/ImagePicker";
import {
  getMyStorefront, saveMyStorefront, getMyVerification, submitVerification,
  type Storefront, type ShopVerification,
} from "../api/storefront";
import { getShopProfile, updateShopProfile } from "../api/shop";

const VERIFICATION_META: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Not submitted", color: T.t3 },
  SUBMITTED: { label: "Submitted — awaiting review", color: T.amber },
  UNDER_REVIEW: { label: "Under review", color: T.amber },
  APPROVED: { label: "Verified", color: T.emerald },
  REJECTED: { label: "Rejected — resubmit", color: T.crimson },
  SUSPENDED: { label: "Suspended", color: T.crimson },
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DayHours { day: number; open: string; close: string; closed: boolean; }

function defaultHours(): DayHours[] {
  return DAY_LABELS.map((_, day) => ({ day, open: "09:00", close: "18:00", closed: day === 0 }));
}

function normalizeHours(raw: unknown): DayHours[] {
  if (!Array.isArray(raw)) return defaultHours();
  const template = defaultHours();
  return template.map(t => {
    const found = raw.find((r: any) => r && Number(r.day) === t.day);
    if (!found) return t;
    return {
      day: t.day,
      open: typeof found.open === "string" ? found.open : t.open,
      close: typeof found.close === "string" ? found.close : t.close,
      closed: !!found.closed,
    };
  });
}

export function StorefrontSettingsPage() {
  const { toast } = useAppCtx();
  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [verification, setVerification] = useState<ShopVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [slug, setSlug] = useState("");
  const [accentColor, setAccentColor] = useState("#B3261E");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [slugInvalid, setSlugInvalid] = useState(false);

  const [hours, setHours] = useState<DayHours[]>(defaultHours());
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    Promise.all([getMyStorefront(), getMyVerification(), getShopProfile()])
      .then(([sfRes, verRes, shopRes]: any[]) => {
        const sf = sfRes?.storefront || null;
        setStorefront(sf);
        setVerification(verRes?.verification || null);
        if (sf) {
          setSlug(sf.slug);
          setAccentColor(sf.accentColor || "#B3261E");
          setCoverImageUrl(sf.coverImageUrl || "");
          setLogoUrl(sf.logoUrl || "");
          setAboutText(sf.aboutText || "");
        }
        setHours(normalizeHours(shopRes?.shop?.operatingHours));
      })
      .catch((e: any) => toast(e?.message || "Could not load storefront settings", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const publicUrl = `${window.location.origin}/shop/${slug || "your-shop"}`;

  const save = async () => {
    if (!slug.trim() || slug.trim().length < 3) { setSlugInvalid(true); return; }
    setSaving(true);
    try {
      const res = await saveMyStorefront({
        slug: slug.trim(), accentColor, coverImageUrl: coverImageUrl || null,
        logoUrl: logoUrl || null, aboutText: aboutText.trim() || null,
      });
      setStorefront(res.storefront);
      setSlug(res.storefront.slug);
      toast("Storefront saved", "success");
    } catch (e: any) {
      toast(e?.message || "Could not save storefront", "error");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast("Link copied", "success");
    } catch {
      toast("Could not copy — copy it manually", "error");
    }
  };

  const saveHours = async () => {
    setSavingHours(true);
    try {
      await updateShopProfile({ operatingHours: hours });
      toast("Business hours saved", "success");
    } catch (e: any) {
      toast(e?.message || "Could not save business hours", "error");
    } finally {
      setSavingHours(false);
    }
  };

  const submitForReview = async () => {
    setSubmitting(true);
    try {
      const res = await submitVerification();
      setVerification(res.verification);
      toast("Submitted for review", "success");
    } catch (e: any) {
      toast(e?.message || "Could not submit for review", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 32, color: T.t3, fontFamily: FONT.ui }}>Loading…</div>;

  const verMeta = VERIFICATION_META[verification?.status || "DRAFT"];

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>Storefront</h1>
        <p style={{ fontSize: 13, color: T.t3, margin: "4px 0 0" }}>Your public page — customers see this before they book.</p>
      </div>

      {storefront && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px" }}>
          <span style={{ fontSize: 13, color: T.t2, fontFamily: FONT.mono, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{publicUrl}</span>
          <Btn variant="subtle" size="sm" onClick={copyLink}>Copy Link</Btn>
        </div>
      )}

      <Field label="Storefront link" required error={slugInvalid ? "Choose a link at least 3 characters long" : undefined} hint="redpiston.in/shop/your-slug — letters, numbers and hyphens only">
        <Input value={slug} onChange={v => { setSlug(v); setSlugInvalid(false); }} placeholder="kumar-auto-care" invalid={slugInvalid} />
      </Field>

      <Field label="Accent color">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: 44, height: 38, border: `1px solid ${T.border}`, borderRadius: 8, background: "none", cursor: "pointer" }} />
          <Input value={accentColor} onChange={setAccentColor} style={{ maxWidth: 140 }} />
        </div>
      </Field>

      <ImagePicker label="Cover image" url={coverImageUrl} onChange={setCoverImageUrl} folder="storefront-covers" />
      <ImagePicker label="Logo" url={logoUrl} onChange={setLogoUrl} folder="storefront-logos" />

      <Field label="About your shop">
        <textarea
          value={aboutText}
          onChange={e => setAboutText(e.target.value)}
          rows={4}
          placeholder="Tell customers what makes your shop worth visiting"
          style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: FONT.ui, resize: "vertical" }}
        />
      </Field>

      <div>
        <Btn variant="amber" loading={saving} onClick={save}>Save storefront</Btn>
      </div>

      <div style={{ marginTop: 8, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: T.t1, fontFamily: FONT.display, margin: "0 0 4px" }}>Business Hours</h2>
        <p style={{ fontSize: 12, color: T.t3, margin: "0 0 12px" }}>Used to work out which time slots customers can book.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {hours.map((h, i) => (
            <div key={h.day} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.t2, width: 34 }}>{DAY_LABELS[h.day]}</span>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.t3, width: 68 }}>
                <input type="checkbox" checked={!h.closed} onChange={e => setHours(cur => cur.map((x, j) => j === i ? { ...x, closed: !e.target.checked } : x))} />
                Open
              </label>
              {!h.closed && (
                <>
                  <input type="time" value={h.open} onChange={e => setHours(cur => cur.map((x, j) => j === i ? { ...x, open: e.target.value } : x))} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 8, padding: "6px 8px", fontSize: 12 }} />
                  <span style={{ color: T.t3, fontSize: 12 }}>to</span>
                  <input type="time" value={h.close} onChange={e => setHours(cur => cur.map((x, j) => j === i ? { ...x, close: e.target.value } : x))} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 8, padding: "6px 8px", fontSize: 12 }} />
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <Btn variant="subtle" size="sm" loading={savingHours} onClick={saveHours}>Save hours</Btn>
        </div>
      </div>

      <div style={{ marginTop: 8, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: T.t1, fontFamily: FONT.display, margin: "0 0 4px" }}>Verification</h2>
        <p style={{ fontSize: 12, color: T.t3, margin: "0 0 12px" }}>A verified badge on your storefront builds customer trust.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: verMeta.color }}>{verMeta.label}</span>
          {(!verification || verification.status === "DRAFT" || verification.status === "REJECTED") && (
            <Btn variant="subtle" size="sm" loading={submitting} onClick={submitForReview}>Submit for review</Btn>
          )}
        </div>
        {verification?.status === "REJECTED" && verification.rejectionReason && (
          <p style={{ fontSize: 12, color: T.crimson, marginTop: 8 }}>Reason: {verification.rejectionReason}</p>
        )}
      </div>
    </div>
  );
}
