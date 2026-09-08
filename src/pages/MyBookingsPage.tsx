import { useState, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn, Modal, Field } from "../components/ui";
import { getMyBookings, cancelMyBooking, type Booking, type BookingStatus } from "../api/bookings";
import { createReview, getMyReviewStatus, type ServiceReview } from "../api/reviews";

const STATUS_META: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  PENDING: { bg: "#FEF3C7", color: "#B45309", label: "Awaiting confirmation" },
  CONFIRMED: { bg: "#DCFCE7", color: "#16A34A", label: "Confirmed" },
  CUSTOMER_ARRIVED: { bg: "#DBEAFE", color: "#1D4ED8", label: "Vehicle checked in" },
  SERVICE_IN_PROGRESS: { bg: "#DBEAFE", color: "#1D4ED8", label: "Service in progress" },
  DECLINED: { bg: "#FFDAD6", color: "#BA1A1A", label: "Declined" },
  CANCELLED: { bg: "#F3F4F6", color: "#6B7280", label: "Cancelled" },
  NO_SHOW: { bg: "#FFDAD6", color: "#BA1A1A", label: "No-show" },
  COMPLETED: { bg: "#DCFCE7", color: "#16A34A", label: "Completed" },
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: n <= value ? T.amber : T.border, padding: 0, lineHeight: 1 }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const RATING_FIELDS: { key: "overallRating" | "qualityRating" | "valueRating" | "professionalismRating" | "timelinessRating"; label: string }[] = [
  { key: "overallRating", label: "Overall" },
  { key: "qualityRating", label: "Quality" },
  { key: "valueRating", label: "Value" },
  { key: "professionalismRating", label: "Professionalism" },
  { key: "timelinessRating", label: "Timeliness" },
];

function ReviewModal({ booking, onClose, onSaved, toast }: { booking: Booking | null; onClose: () => void; onSaved: () => void; toast: (m: string, t?: string) => void }) {
  const [ratings, setRatings] = useState({ overallRating: 5, qualityRating: 5, valueRating: 5, professionalismRating: 5, timelinessRating: 5 });
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setRatings({ overallRating: 5, qualityRating: 5, valueRating: 5, professionalismRating: 5, timelinessRating: 5 });
      setWouldRecommend(true);
      setComment("");
    }
  }, [booking]);

  if (!booking) return null;

  const save = async () => {
    setSaving(true);
    try {
      await createReview({ bookingId: booking.id, ...ratings, wouldRecommend, comment: comment.trim() || undefined });
      toast("Thanks for the review!", "success");
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e?.message || "Could not submit review", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Rate ${booking.priceSnapshot.serviceName}`} width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {RATING_FIELDS.map(f => (
          <Field key={f.key} label={f.label}>
            <StarPicker value={ratings[f.key]} onChange={n => setRatings(r => ({ ...r, [f.key]: n }))} />
          </Field>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.t2 }}>
          <input type="checkbox" checked={wouldRecommend} onChange={e => setWouldRecommend(e.target.checked)} />
          I'd recommend this shop
        </label>
        <Field label="Comment (optional)">
          <textarea
            value={comment} onChange={e => setComment(e.target.value)} rows={3}
            style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: FONT.ui, resize: "vertical" }}
          />
        </Field>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="amber" loading={saving} onClick={save}>Submit review</Btn>
        </div>
      </div>
    </Modal>
  );
}

export function MyBookingsPage() {
  const { toast } = useAppCtx();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviewableIds, setReviewableIds] = useState<Set<number>>(new Set());
  const [reviewsByBooking, setReviewsByBooking] = useState<Map<number, ServiceReview>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getMyBookings(), getMyReviewStatus()])
      .then(([bookingsRes, reviewRes]) => {
        setBookings(bookingsRes.bookings || []);
        setReviewableIds(new Set((reviewRes.reviewableBookings || []).map(b => b.id)));
        setReviewsByBooking(new Map((reviewRes.myReviews || []).map(r => [r.bookingId, r])));
      })
      .catch((e: any) => toast(e?.message || "Could not load bookings", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (b: Booking) => {
    if (!window.confirm(`Cancel booking #${b.bookingNumber}?`)) return;
    setBusyId(b.id);
    try {
      await cancelMyBooking(b.id);
      toast("Booking cancelled", "success");
      load();
    } catch (e: any) {
      toast(e?.message || "Could not cancel — it may have changed", "error");
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ fontFamily: FONT.ui, minHeight: "100vh", background: T.bg }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 60px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: "0 0 20px" }}>My Bookings</h1>

        {loading ? (
          <div style={{ color: T.t3, fontSize: 13 }}>Loading…</div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: T.t3 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.t2 }}>No bookings yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Your upcoming bookings will appear here.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bookings.map(b => {
              const meta = STATUS_META[b.status];
              const cancellable = b.status === "PENDING" || b.status === "CONFIRMED";
              const canReview = b.status === "COMPLETED" && reviewableIds.has(b.id);
              const submittedReview = reviewsByBooking.get(b.id);
              return (
                <div key={b.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{b.priceSnapshot.serviceName}</div>
                      <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{b.shop?.name} · {formatWhen(b.scheduledStart)}</div>
                      <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>#{b.bookingNumber}</div>
                    </div>
                    <span style={{ background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>{meta.label}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>₹{b.priceSnapshot.total.toLocaleString("en-IN")}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {submittedReview && <span style={{ fontSize: 12, color: T.amber, fontWeight: 700 }}>Your rating: {submittedReview.overallRating}★</span>}
                      {canReview && <Btn variant="subtle" size="xs" onClick={() => setReviewTarget(b)}>Leave a review</Btn>}
                      {cancellable && <Btn variant="ghost" size="xs" loading={busyId === b.id} onClick={() => cancel(b)}>Cancel</Btn>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReviewModal booking={reviewTarget} onClose={() => setReviewTarget(null)} onSaved={load} toast={toast} />
    </div>
  );
}
