import { useState, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn } from "../components/ui";
import { getShopReviews, respondToReview, type ServiceReview } from "../api/reviews";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
}

function ReviewRow({ review, onResponded, toast }: { review: ServiceReview; onResponded: () => void; toast: (m: string, t?: string) => void }) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim()) { toast("Write a response first", "error"); return; }
    setSaving(true);
    try {
      await respondToReview(review.id, text.trim());
      toast("Response posted", "success");
      onResponded();
    } catch (e: any) {
      toast(e?.message || "Could not post response", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{review.customer?.name || "Customer"}</div>
          <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{review.service?.name} · {formatDate(review.createdAt)}</div>
        </div>
        <div style={{ fontSize: 14, color: T.amber, fontWeight: 700 }}>{"★".repeat(review.overallRating)}{"☆".repeat(5 - review.overallRating)}</div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 11, color: T.t3 }}>
        <span>Quality {review.qualityRating}★</span>
        <span>Value {review.valueRating}★</span>
        <span>Professionalism {review.professionalismRating}★</span>
        <span>Timeliness {review.timelinessRating}★</span>
        <span>{review.wouldRecommend ? "Would recommend" : "Would not recommend"}</span>
      </div>

      {review.comment && <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.5, margin: "10px 0 0" }}>{review.comment}</p>}

      {review.shopResponse ? (
        <div style={{ marginTop: 12, background: T.surface, borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.t2, marginBottom: 3 }}>Your response</div>
          <div style={{ fontSize: 12, color: T.t2 }}>{review.shopResponse}</div>
        </div>
      ) : replying ? (
        <div style={{ marginTop: 12 }}>
          <textarea
            value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Reply to this review…"
            style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: FONT.ui, resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Btn variant="amber" size="sm" loading={saving} onClick={submit}>Post response</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setReplying(false)}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <Btn variant="subtle" size="xs" onClick={() => setReplying(true)}>Reply</Btn>
        </div>
      )}
    </div>
  );
}

export function ReviewsPage() {
  const { toast, currentUser } = useAppCtx();
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shopId = (currentUser as any)?.shop?.shopId;

  const load = useCallback(() => {
    if (!shopId) { setLoading(false); setError("No shop associated with this account"); return; }
    setLoading(true);
    setError(null);
    getShopReviews(shopId)
      .then(res => setReviews(res.reviews || []))
      .catch((e: any) => setError(e?.message || "Could not load reviews"))
      .finally(() => setLoading(false));
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>Reviews</h1>
        <p style={{ fontSize: 13, color: T.t3, margin: "4px 0 0" }}>
          {avg ? `${avg}★ average across ${reviews.length} review${reviews.length !== 1 ? "s" : ""}.` : "No reviews yet."}
        </p>
      </div>

      {loading ? (
        <div style={{ color: T.t3, fontSize: 13, padding: "20px 0" }}>Loading…</div>
      ) : error ? (
        <div style={{ color: T.crimson, fontSize: 13, padding: "20px 0" }}>{error}</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: T.t3 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⭐</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t2 }}>No reviews yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Reviews appear here once customers rate a completed booking.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.map(r => <ReviewRow key={r.id} review={r} onResponded={load} toast={toast} />)}
        </div>
      )}
    </div>
  );
}
