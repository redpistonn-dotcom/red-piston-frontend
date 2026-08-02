import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { T, FONT } from "../../theme";

// Mechanic-side allowed transitions (mirrors server lib/mechanic-transitions.js)
const MECHANIC_TRANSITIONS: Record<string, string[]> = {
  RECEIVED:      ["IN_PROGRESS"],
  IN_PROGRESS:   ["WAITING_PARTS", "READY"],
  WAITING_PARTS: ["IN_PROGRESS"],
  QC_REWORK:     ["IN_PROGRESS"],
};

const PROGRESS_STAGES = [
  { key: "VEHICLE_RECEIVED",  label: "Vehicle Received",   icon: "directions_car" },
  { key: "DIAGNOSIS_DONE",    label: "Diagnosis Done",     icon: "search" },
  { key: "PARTS_ISSUED",      label: "Parts Issued",       icon: "inventory_2" },
  { key: "REPAIR_STARTED",    label: "Repair Started",     icon: "build" },
  { key: "REPAIR_COMPLETED",  label: "Repair Completed",   icon: "check" },
  { key: "CLEANING",          label: "Cleaning",           icon: "cleaning_services" },
  { key: "READY_FOR_QC",      label: "Ready for QC",       icon: "rule" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  RECEIVED:      "Received",
  IN_PROGRESS:   "In Progress",
  WAITING_PARTS: "Waiting for Parts",
  READY:         "Ready for QC",
  QC_REWORK:     "Rework Required",
  QC_PASSED:     "QC Passed",
  DELIVERED:     "Delivered",
  CANCELLED:     "Cancelled",
};

const STATUS_NEXT_LABEL: Record<string, string> = {
  RECEIVED:      "Start Job",
  IN_PROGRESS:   "",           // two options below
  WAITING_PARTS: "Resume — Parts Arrived",
  QC_REWORK:     "Start Rework",
};

function MSIcon({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }}>{name}</span>;
}

function Btn({ label, icon, onClick, color = T.amber, disabled = false, outline = false }: {
  label: string; icon?: string; onClick: () => void; color?: string; disabled?: boolean; outline?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "12px 16px", borderRadius: 10, border: outline ? `2px solid ${color}` : "none",
        background: outline ? "transparent" : disabled ? T.surfaceContainerHigh : color,
        color: outline ? color : disabled ? T.t3 : "#fff",
        fontWeight: 700, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 6, fontFamily: FONT.ui,
        flex: 1, justifyContent: "center",
      }}
    >
      {icon && <MSIcon name={icon} size={18} />}
      {label}
    </button>
  );
}

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [error, setError] = useState("");
  const [partRequests, setPartRequests] = useState<any[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [partDesc, setPartDesc] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [savingRequest, setSavingRequest] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get(`/mechanic/jobs/${id}`),
      api.get(`/mechanic/jobs/${id}/part-requests`).catch(() => ({ data: [] })),
    ])
      .then(([jobRes, prRes]: any[]) => {
        setJob(jobRes.data);
        setPartRequests(prRes.data || []);
      })
      .catch(() => setError("Job not found or not assigned to you"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function transition(toStatus: string) {
    setTransitioning(true);
    setError("");
    try {
      await api.patch(`/mechanic/jobs/${id}/status`, { status: toStatus });
      load();
    } catch (e: any) {
      setError(e?.error?.message || "Status update failed");
    } finally {
      setTransitioning(false);
    }
  }

  async function setProgress(progress: string) {
    setTransitioning(true);
    setError("");
    try {
      await api.patch(`/mechanic/jobs/${id}/progress`, { progress });
      load();
    } catch (e: any) {
      setError(e?.error?.message || "Progress update failed");
    } finally {
      setTransitioning(false);
    }
  }

  async function submitPartRequest() {
    if (!partDesc.trim()) return;
    setSavingRequest(true);
    try {
      await api.post(`/mechanic/jobs/${id}/part-requests`, {
        description: partDesc.trim(),
        qtyRequested: parseInt(partQty) || 1,
      });
      setPartDesc(""); setPartQty("1"); setShowRequestForm(false);
      load();
    } catch (e: any) {
      setError(e?.error?.message || "Failed to submit request");
    } finally {
      setSavingRequest(false);
    }
  }

  async function saveNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await api.post(`/mechanic/jobs/${id}/notes`, { note: noteText.trim() });
      setNoteText("");
      load();
    } catch (e: any) {
      setError(e?.error?.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  }

  async function generateInvoice() {
    setGeneratingInvoice(true);
    setError("");
    try {
      const r = await api.post(`/mechanic/jobs/${id}/invoice`, {}) as any;
      load();
      alert(`Invoice ${r.data.invoiceNumber} generated (₹${Number(r.data.total).toFixed(2)})`);
    } catch (e: any) {
      setError(e?.error?.message || "Invoice generation failed");
    } finally {
      setGeneratingInvoice(false);
    }
  }

  if (loading) return <p style={{ padding: 24, color: T.t3 }}>Loading…</p>;
  if (error && !job) return (
    <div style={{ padding: 24 }}>
      <p style={{ color: T.crimson }}>{error}</p>
      <button onClick={() => navigate(-1)} style={{ marginTop: 12, color: T.amber, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>← Back</button>
    </div>
  );
  if (!job) return null;

  const allowedNext = MECHANIC_TRANSITIONS[job.status] ?? [];
  const canInvoice = job.status === "QC_PASSED" && !job.mechanic_invoice_id;

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 0", display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: T.t2, padding: 0 }}>
          <MSIcon name="arrow_back" size={22} />
        </button>
        <div>
          <div style={{ fontFamily: FONT.mono, fontSize: 12, color: T.amber, fontWeight: 700 }}>{job.job_number}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.t1 }}>{job.customer_name}</div>
        </div>
      </div>

      {/* Status chip */}
      <div style={{ padding: "12px 16px 0" }}>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
          background: T.amberGlow, color: T.amber,
        }}>
          {STATUS_LABEL[job.status] || job.status}
        </span>
        <span style={{ marginLeft: 10, fontSize: 12, color: PRIORITY_COLOR(job.priority) }}>
          {job.priority} PRIORITY
        </span>
      </div>

      {/* Vehicle + complaint */}
      <div style={{ margin: "16px 16px 0", background: T.surface, borderRadius: 12, padding: 14, border: `1px solid ${T.border}` }}>
        <Row icon="directions_car" label="Vehicle" value={`${job.vehicle_make} ${job.vehicle_model}${job.vehicle_year ? ` (${job.vehicle_year})` : ""}`} />
        {job.vehicle_reg && <Row icon="pin" label="Reg" value={job.vehicle_reg} />}
        {job.odometer_in && <Row icon="speed" label="Odometer" value={`${job.odometer_in} km`} />}
        {job.complaint && <Row icon="report_problem" label="Complaint" value={job.complaint} />}
        {job.diagnosis && <Row icon="medical_information" label="Diagnosis" value={job.diagnosis} />}
        {job.estimated_at && <Row icon="schedule" label="Due by" value={new Date(job.estimated_at).toLocaleString("en-IN")} />}
      </div>

      {/* Action buttons */}
      {(allowedNext.length > 0 || canInvoice) && (
        <div style={{ margin: "16px 16px 0", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Single-option status */}
          {allowedNext.length === 1 && (
            <Btn
              label={STATUS_NEXT_LABEL[job.status] || `Move to ${STATUS_LABEL[allowedNext[0]]}`}
              icon="play_arrow"
              onClick={() => transition(allowedNext[0])}
              disabled={transitioning}
            />
          )}
          {/* IN_PROGRESS has two options */}
          {job.status === "IN_PROGRESS" && (
            <>
              <Btn label="Waiting for Parts" icon="inventory_2" onClick={() => transition("WAITING_PARTS")} disabled={transitioning} color="#F59E0B" />
              <Btn label="Mark Ready for QC" icon="rule" onClick={() => transition("READY")} disabled={transitioning} color={T.emerald} />
            </>
          )}
          {/* Invoice */}
          {canInvoice && (
            <Btn label="Generate Invoice" icon="receipt" onClick={generateInvoice} disabled={generatingInvoice} color={T.emerald} />
          )}
        </div>
      )}
      {job.mechanic_invoice_id && (
        <div style={{ margin: "12px 16px 0", fontSize: 13, color: T.emerald, fontWeight: 600 }}>
          <MSIcon name="check_circle" size={16} /> Invoice generated
        </div>
      )}

      {error && <p style={{ margin: "8px 16px 0", fontSize: 13, color: T.crimson }}>{error}</p>}

      {/* Work progress sub-status — only visible while job is active */}
      {["RECEIVED", "IN_PROGRESS", "WAITING_PARTS", "QC_REWORK"].includes(job.status) && (
        <Section title="Work Progress">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PROGRESS_STAGES.map((stage, idx) => {
              const stageKeys = PROGRESS_STAGES.map(s => s.key);
              const currentIdx = stageKeys.indexOf(job.mechanic_progress ?? "");
              const isDone = currentIdx >= idx && currentIdx >= 0;
              const isCurrent = job.mechanic_progress === stage.key;
              const isNext = currentIdx + 1 === idx || (currentIdx === -1 && idx === 0);

              return (
                <button
                  key={stage.key}
                  onClick={() => !transitioning && isNext && setProgress(stage.key)}
                  disabled={transitioning || !isNext}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 8, border: "none",
                    background: isCurrent ? T.amberGlow : isDone ? T.surfaceContainerHigh : "transparent",
                    cursor: isNext && !transitioning ? "pointer" : "default",
                    opacity: !isDone && !isNext ? 0.4 : 1,
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: isDone ? T.emerald : isNext ? T.amber : T.border,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <MSIcon
                      name={isDone ? "check" : stage.icon}
                      size={13}
                    />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? T.amber : isDone ? T.t2 : T.t1 }}>
                    {stage.label}
                  </span>
                  {isNext && (
                    <span style={{ marginLeft: "auto", fontSize: 11, color: T.amber, fontWeight: 700 }}>TAP →</span>
                  )}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* Vehicle service history link */}
      {job.vehicle_reg && (
        <div style={{ margin: "12px 16px 0" }}>
          <button
            onClick={() => navigate(`/mechanic/jobs?vehicleReg=${job.vehicle_reg}`)}
            style={{
              width: "100%", padding: "10px 14px", background: T.surface,
              border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, fontFamily: FONT.ui,
            }}
          >
            <MSIcon name="history" size={16} />
            <span style={{ fontSize: 13, color: T.t1, fontWeight: 500 }}>View service history for {job.vehicle_reg}</span>
            <span style={{ marginLeft: "auto", color: T.t3 }}>→</span>
          </button>
        </div>
      )}

      {/* Part requests */}
      <Section title={`Part Requests${partRequests.length > 0 ? ` (${partRequests.length})` : ""}`}>
        {partRequests.map((pr: any) => (
          <div key={pr.id} style={{ padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.t1 }}>{pr.description}</div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                background: pr.status === "APPROVED" ? "#D1FAE522" : pr.status === "REJECTED" ? "#FEE2E222" : T.amberGlow,
                color: pr.status === "APPROVED" ? T.emerald : pr.status === "REJECTED" ? T.crimson : T.amber,
              }}>{pr.status}</span>
            </div>
            <div style={{ fontSize: 12, color: T.t3 }}>Qty: {pr.qty_requested}</div>
            {pr.review_notes && <div style={{ fontSize: 12, color: T.t2, fontStyle: "italic" }}>{pr.review_notes}</div>}
          </div>
        ))}

        {!showRequestForm ? (
          <button
            onClick={() => setShowRequestForm(true)}
            style={{
              marginTop: 8, padding: "8px 14px", background: "transparent",
              border: `1.5px dashed ${T.border}`, borderRadius: 8, cursor: "pointer",
              color: T.t2, fontSize: 13, fontFamily: FONT.ui, width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <MSIcon name="add" size={16} /> Request a Part
          </button>
        ) : (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="text"
              placeholder="Part name / description"
              value={partDesc}
              onChange={e => setPartDesc(e.target.value)}
              style={{
                padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
                fontFamily: FONT.ui, fontSize: 13, color: T.t1, outline: "none",
                background: T.surfaceContainerLowest,
              }}
            />
            <input
              type="number"
              placeholder="Qty"
              value={partQty}
              min={1}
              onChange={e => setPartQty(e.target.value)}
              style={{
                padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
                fontFamily: FONT.ui, fontSize: 13, color: T.t1, outline: "none",
                background: T.surfaceContainerLowest, width: "100px",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={submitPartRequest}
                disabled={savingRequest || !partDesc.trim()}
                style={{
                  flex: 1, padding: "9px", background: T.amber, color: "#fff",
                  border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer",
                  opacity: savingRequest || !partDesc.trim() ? 0.5 : 1, fontFamily: FONT.ui,
                }}
              >
                {savingRequest ? "Sending…" : "Send Request"}
              </button>
              <button
                onClick={() => { setShowRequestForm(false); setPartDesc(""); setPartQty("1"); }}
                style={{
                  padding: "9px 14px", background: "transparent", border: `1px solid ${T.border}`,
                  borderRadius: 8, cursor: "pointer", color: T.t2, fontFamily: FONT.ui,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Parts / items */}
      {job.items?.length > 0 && (
        <Section title="Parts & Labour">
          {job.items.map((item: any) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.t1 }}>{item.description}</div>
                <div style={{ fontSize: 12, color: T.t3 }}>x{item.qty} · {item.type}</div>
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: 700, color: T.t1 }}>
                ₹{Number(item.total).toFixed(2)}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 700 }}>
            <span style={{ fontSize: 14, color: T.t2 }}>Total</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 15, color: T.t1 }}>₹{Number(job.total_amount).toFixed(2)}</span>
          </div>
        </Section>
      )}

      {/* Photos */}
      {job.photos?.length > 0 && (
        <Section title={`Photos (${job.photos.length})`}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {job.photos.map((p: any) => (
              <img
                key={p.id}
                src={p.url}
                alt={p.stage}
                style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Timeline */}
      {job.timeline?.length > 0 && (
        <Section title="Activity">
          {job.timeline.map((t: any) => (
            <div key={t.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: T.amber, marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, color: T.t1, fontWeight: 500 }}>
                  {t.event.replace(/_/g, " ")}
                  {t.from_status && t.to_status && <span style={{ color: T.t3 }}> {t.from_status} → {t.to_status}</span>}
                </div>
                {t.note && <div style={{ fontSize: 12, color: T.t2 }}>{t.note}</div>}
                <div style={{ fontSize: 11, color: T.t3 }}>
                  {t.actor_name} · {new Date(t.created_at).toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Add note */}
      <Section title="Add Note">
        <textarea
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Type a note visible to the workshop…"
          rows={3}
          style={{
            width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${T.border}`,
            fontFamily: FONT.ui, fontSize: 13, color: T.t1, resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={saveNote}
          disabled={savingNote || !noteText.trim()}
          style={{
            marginTop: 8, padding: "10px 20px", background: T.amber, color: "#fff",
            border: "none", borderRadius: 8, fontWeight: 700, cursor: savingNote || !noteText.trim() ? "not-allowed" : "pointer",
            opacity: savingNote || !noteText.trim() ? 0.5 : 1, fontSize: 13,
          }}
        >
          {savingNote ? "Saving…" : "Save Note"}
        </button>
      </Section>
    </div>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: T.t3, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: T.t3 }}>{label}</div>
        <div style={{ fontSize: 14, color: T.t1 }}>{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: "16px 16px 0", background: T.surface, borderRadius: 12, padding: 14, border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function PRIORITY_COLOR(p: string) {
  return p === "URGENT" ? T.crimson : p === "HIGH" ? "#F59E0B" : T.t3;
}
