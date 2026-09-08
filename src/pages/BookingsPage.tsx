import { useState, useEffect, useCallback, useMemo } from "react";
import { T, FONT } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn, DataTable, TC, TCMono, type Column } from "../components/ui";
import { getShopBookings, updateBookingStatus, assignBooking, type Booking, type BookingStatus } from "../api/bookings";
import { getStaff, type StaffMember } from "../api/staff";

const STATUS_META: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  PENDING: { bg: "#FEF3C7", color: "#B45309", label: "Pending" },
  CONFIRMED: { bg: "#DCFCE7", color: "#16A34A", label: "Confirmed" },
  CUSTOMER_ARRIVED: { bg: "#DBEAFE", color: "#1D4ED8", label: "Arrived" },
  SERVICE_IN_PROGRESS: { bg: "#DBEAFE", color: "#1D4ED8", label: "In Progress" },
  DECLINED: { bg: "#FFDAD6", color: "#BA1A1A", label: "Declined" },
  CANCELLED: { bg: "#F3F4F6", color: "#6B7280", label: "Cancelled" },
  NO_SHOW: { bg: "#FFDAD6", color: "#BA1A1A", label: "No-show" },
  COMPLETED: { bg: "#DCFCE7", color: "#16A34A", label: "Completed" },
};

// Mirrors routes/bookings.js's VALID_TRANSITIONS — one primary action per status.
const NEXT_ACTION: Record<BookingStatus, { status: BookingStatus; label: string; variant: "emerald" | "crimson" | "sky" }[]> = {
  PENDING: [
    { status: "CONFIRMED", label: "Confirm", variant: "emerald" },
    { status: "DECLINED", label: "Decline", variant: "crimson" },
  ],
  CONFIRMED: [
    { status: "CUSTOMER_ARRIVED", label: "Customer Arrived", variant: "sky" },
    { status: "NO_SHOW", label: "No-show", variant: "crimson" },
    { status: "CANCELLED", label: "Cancel", variant: "crimson" },
  ],
  CUSTOMER_ARRIVED: [
    { status: "SERVICE_IN_PROGRESS", label: "Start Service", variant: "sky" },
  ],
  SERVICE_IN_PROGRESS: [
    { status: "COMPLETED", label: "Mark Completed", variant: "emerald" },
  ],
  DECLINED: [], CANCELLED: [], NO_SHOW: [], COMPLETED: [],
};

const COLUMNS: Column[] = [
  { key: "booking", label: "Booking", width: 160 },
  { key: "customer", label: "Customer", width: 160 },
  { key: "when", label: "When", width: 160 },
  { key: "total", label: "Total", width: 100 },
  { key: "status", label: "Status", width: 120 },
  { key: "staff", label: "Assigned To", width: 150 },
  { key: "actions", label: "Actions", width: 220 },
];

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function toISODate(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function mondayOf(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Select instead of a bespoke picker — a real <select> gives free keyboard
// nav, screen-reader semantics, and a native ≥44px-tall touch target on
// mobile without any extra work.
function AssignDropdown({ booking, staff, assigning, onAssign }: { booking: Booking; staff: StaffMember[]; assigning: number | null; onAssign: (b: Booking, staffId: number | null) => void }) {
  return (
    <select
      aria-label={`Assign staff to booking ${booking.bookingNumber}`}
      value={booking.assignedStaff?.userId ?? ""}
      disabled={assigning === booking.id}
      onChange={e => onAssign(booking, e.target.value ? Number(e.target.value) : null)}
      style={{
        fontSize: 12, fontFamily: FONT.ui, color: booking.assignedStaff ? T.t1 : T.t3,
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7,
        padding: "6px 8px", minHeight: 32, cursor: "pointer", maxWidth: 150,
      }}
    >
      <option value="">Unassigned</option>
      {staff.filter(s => s.isActive).map(s => (
        <option key={s.user.userId} value={s.user.userId}>{s.user.name || s.user.phone || `Staff #${s.user.userId}`}</option>
      ))}
    </select>
  );
}

function ActionButtons({ booking, advancing, onAdvance }: { booking: Booking; advancing: number | null; onAdvance: (b: Booking, s: BookingStatus) => void }) {
  const actions = NEXT_ACTION[booking.status] || [];
  if (actions.length === 0) return <span style={{ fontSize: 11, color: T.t3 }}>—</span>;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {actions.map(a => (
        <Btn key={a.status} variant={a.variant} size="xs" loading={advancing === booking.id} onClick={() => onAdvance(booking, a.status)}>{a.label}</Btn>
      ))}
    </div>
  );
}

function WeekCalendar({ bookings, advancing, onAdvance, staff, assigning, onAssign }: {
  bookings: Booking[]; advancing: number | null; onAdvance: (b: Booking, s: BookingStatus) => void;
  staff: StaffMember[]; assigning: number | null; onAssign: (b: Booking, staffId: number | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Re-derived from the live `bookings` prop every render (not a snapshot) so
  // the panel reflects a status/assignment change immediately after reload,
  // instead of showing stale data from the moment it was clicked.
  const selected = selectedId != null ? bookings.find(b => b.id === selectedId) || null : null;

  // Display range derived from the week's actual bookings, clamped to a sane default.
  const { hourStart, hourEnd } = useMemo(() => {
    if (bookings.length === 0) return { hourStart: 9, hourEnd: 18 };
    const starts = bookings.map(b => new Date(b.scheduledStart).getHours());
    const ends = bookings.map(b => { const d = new Date(b.scheduledEnd); return d.getHours() + (d.getMinutes() > 0 ? 1 : 0); });
    return { hourStart: Math.min(9, ...starts), hourEnd: Math.max(18, ...ends) };
  }, [bookings]);
  const totalMinutes = (hourEnd - hourStart) * 60;
  const rowHeight = 48;

  const byDay: Booking[][] = Array.from({ length: 7 }, () => []);
  for (const b of bookings) {
    const d = new Date(b.scheduledStart);
    const idx = (d.getDay() + 6) % 7; // Mon=0..Sun=6
    byDay[idx].push(b);
  }

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ flex: 1, display: "flex", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", background: T.card }}>
        <div style={{ width: 48, flexShrink: 0, borderRight: `1px solid ${T.border}` }}>
          <div style={{ height: 32 }} />
          {Array.from({ length: hourEnd - hourStart }, (_, i) => (
            <div key={i} style={{ height: rowHeight, fontSize: 10, color: T.t3, textAlign: "right", paddingRight: 6, borderTop: `1px solid ${T.border}` }}>
              {String(hourStart + i).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {DAY_LABELS.map((label, dayIdx) => (
          <div key={label} style={{ flex: 1, borderRight: dayIdx < 6 ? `1px solid ${T.border}` : "none", position: "relative" }}>
            <div style={{ height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.t2, borderBottom: `1px solid ${T.border}` }}>{label}</div>
            <div style={{ position: "relative", height: (hourEnd - hourStart) * rowHeight }}>
              {Array.from({ length: hourEnd - hourStart }, (_, i) => (
                <div key={i} style={{ position: "absolute", top: i * rowHeight, left: 0, right: 0, height: 0, borderTop: `1px solid ${T.border}` }} />
              ))}
              {byDay[dayIdx].map(b => {
                const start = new Date(b.scheduledStart);
                const end = new Date(b.scheduledEnd);
                const startMin = (start.getHours() - hourStart) * 60 + start.getMinutes();
                const durMin = Math.max(20, (end.getTime() - start.getTime()) / 60000);
                const top = (startMin / totalMinutes) * (hourEnd - hourStart) * rowHeight;
                const height = (durMin / totalMinutes) * (hourEnd - hourStart) * rowHeight;
                const meta = STATUS_META[b.status];
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    style={{
                      position: "absolute", top, height: Math.max(20, height), left: 3, right: 3,
                      background: meta.bg, borderLeft: `3px solid ${meta.color}`, borderRadius: 4,
                      padding: "2px 5px", cursor: "pointer", overflow: "hidden",
                      outline: selectedId === b.id ? `2px solid ${T.amber}` : "none",
                    }}
                    title={`${b.priceSnapshot.serviceName} — ${b.customer?.name || ""}`}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.priceSnapshot.serviceName}</div>
                    <div style={{ fontSize: 9, color: T.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.customer?.name || ""}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ width: 240, flexShrink: 0 }}>
        {selected ? (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, position: "sticky", top: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{selected.priceSnapshot.serviceName}</div>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>{selected.customer?.name} · {selected.customer?.phone}</div>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{formatWhen(selected.scheduledStart)}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginTop: 8 }}>₹{selected.priceSnapshot.total.toLocaleString("en-IN")}</div>
            <div style={{ marginTop: 4 }}>
              <span style={{ background: STATUS_META[selected.status].bg, color: STATUS_META[selected.status].color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>{STATUS_META[selected.status].label}</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Assigned to</div>
              <AssignDropdown booking={selected} staff={staff} assigning={assigning} onAssign={onAssign} />
            </div>
            <div style={{ marginTop: 12 }}>
              <ActionButtons booking={selected} advancing={advancing} onAdvance={(b, s) => { onAdvance(b, s); setSelectedId(null); }} />
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: T.t3, padding: 14 }}>Click a booking on the calendar to see details and actions.</div>
        )}
      </div>
    </div>
  );
}

export function BookingsPage() {
  const { toast } = useAppCtx();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<number | null>(null);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));

  const weekEnd = useMemo(() => { const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d; }, [weekStart]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = view === "calendar" ? { from: toISODate(weekStart), to: toISODate(weekEnd) } : {};
    getShopBookings(params)
      .then(res => setBookings(res.bookings || []))
      .catch((e: any) => setError(e?.message || "Could not load bookings"))
      .finally(() => setLoading(false));
  }, [view, weekStart, weekEnd]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getStaff().then(res => setStaff(res.data || [])).catch(() => {}); }, []);

  const advance = async (b: Booking, status: BookingStatus) => {
    setAdvancing(b.id);
    try {
      await updateBookingStatus(b.id, { status, version: b.version });
      toast(`Booking #${b.bookingNumber} updated`, "success");
      load();
    } catch (e: any) {
      toast(e?.message || "Could not update booking — it may have changed elsewhere", "error");
      load();
    } finally {
      setAdvancing(null);
    }
  };

  const assign = async (b: Booking, staffId: number | null) => {
    setAssigning(b.id);
    try {
      await assignBooking(b.id, staffId);
      toast(staffId ? "Booking assigned" : "Assignment cleared", "success");
      load();
    } catch (e: any) {
      toast(e?.message || "Could not update assignment", "error");
    } finally {
      setAssigning(null);
    }
  };

  const pendingCount = bookings.filter(b => b.status === "PENDING").length;

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>Bookings</h1>
          <p style={{ fontSize: 13, color: T.t3, margin: "4px 0 0" }}>{pendingCount} pending request{pendingCount !== 1 ? "s" : ""} awaiting your response.</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn variant={view === "list" ? "amber" : "ghost"} size="sm" onClick={() => setView("list")}>List</Btn>
          <Btn variant={view === "calendar" ? "amber" : "ghost"} size="sm" onClick={() => setView("calendar")}>Calendar</Btn>
        </div>
      </div>

      {view === "calendar" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Btn variant="ghost" size="sm" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}>← Prev week</Btn>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>
            {weekStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – {weekEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <Btn variant="ghost" size="sm" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}>Next week →</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setWeekStart(mondayOf(new Date()))}>This week</Btn>
        </div>
      )}

      {loading ? (
        <div style={{ color: T.t3, fontSize: 13, padding: "20px 0" }}>Loading…</div>
      ) : error ? (
        <div style={{ color: T.crimson, fontSize: 13, padding: "20px 0" }}>{error}</div>
      ) : view === "calendar" ? (
        <WeekCalendar bookings={bookings} advancing={advancing} onAdvance={advance} staff={staff} assigning={assigning} onAssign={assign} />
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={bookings}
          loading={false}
          error={null}
          empty="No bookings yet"
          emptyIcon="📅"
          renderRow={(row: any) => {
            const b = row as Booking;
            const meta = STATUS_META[b.status];
            return (
              <tr key={b.id} className="trow">
                <td style={TCMono}>{b.bookingNumber}<div style={{ fontSize: 11, color: T.t3 }}>{b.priceSnapshot.serviceName}</div></td>
                <td style={TC}>{b.customer?.name || "—"}<div style={{ fontSize: 11, color: T.t3 }}>{b.customer?.phone || ""}</div></td>
                <td style={TC}>{formatWhen(b.scheduledStart)}</td>
                <td style={TCMono}>₹{b.priceSnapshot.total.toLocaleString("en-IN")}</td>
                <td style={TC}>
                  <span style={{ background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>{meta.label}</span>
                </td>
                <td style={TC}><AssignDropdown booking={b} staff={staff} assigning={assigning} onAssign={assign} /></td>
                <td style={TC}><ActionButtons booking={b} advancing={advancing} onAdvance={advance} /></td>
              </tr>
            );
          }}
        />
      )}
    </div>
  );
}
