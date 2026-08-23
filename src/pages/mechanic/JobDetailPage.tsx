import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { T, FONT } from "../../theme";
import { useAppCtx } from "../../context/AppCtx.js";

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
        padding: "14px 16px", borderRadius: 12, border: outline ? `2px solid ${color}` : "none",
        background: outline ? "transparent" : disabled ? T.surfaceContainerHigh : color,
        color: outline ? color : disabled ? T.t3 : "#fff",
        fontWeight: 700, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 8, fontFamily: FONT.ui,
        flex: 1, justifyContent: "center", minHeight: 52,
        boxShadow: !outline && !disabled ? `0 2px 10px ${color}44` : "none",
        transition: "transform 0.1s, box-shadow 0.1s",
      }}
    >
      {icon && <MSIcon name={icon} size={20} />}
      {label}
    </button>
  );
}

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAppCtx();
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
  const [partPrice, setPartPrice] = useState("");
  const [savingRequest, setSavingRequest] = useState(false);

  // WhatsApp preview — every customer-facing action (status change, extra
  // work found, call outcome) returns the exact message text server-side.
  // The mechanic only ever taps "Send on WhatsApp"; they never type it.
  const [waPreview, setWaPreview] = useState<{ text: string; link: string | null } | null>(null);
  const [waEditText, setWaEditText] = useState("");
  const [waSent, setWaSent] = useState(false);
  const [waError, setWaError] = useState("");

  // Keep the editable textarea in sync whenever a new preview comes in —
  // the mechanic can edit it before sending, but each fresh action (status
  // change, progress tap, call log…) starts from that action's own message.
  useEffect(() => {
    setWaEditText(waPreview?.text ?? "");
    setWaSent(false);
    setWaError("");
  }, [waPreview]);

  // Customer call log
  const [showCallForm, setShowCallForm] = useState(false);
  const [callPurpose, setCallPurpose] = useState<"STATUS_UPDATE" | "EXTRA_WORK_APPROVAL" | "GENERAL">("GENERAL");
  const [callPartRequestId, setCallPartRequestId] = useState("");
  const [callOutcome, setCallOutcome] = useState<"APPROVED" | "REJECTED" | "NO_ANSWER" | "DISCUSSED">("DISCUSSED");
  const [callNotes, setCallNotes] = useState("");
  const [savingCall, setSavingCall] = useState(false);

  // Work timer
  const [elapsed, setElapsed] = useState(0);

  // Team assignment
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assigningTo, setAssigningTo] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Commission — only a HEAD mechanic (or, for an independent team, the job's
  // creator) can set what the assigned mechanic earns on this job.
  const [myRole, setMyRole] = useState<string | null>(null);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionNote, setCommissionNote] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);

  // Voice-to-text
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoStage, setPhotoStage] = useState<"BEFORE" | "DURING" | "AFTER">("DURING");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Basic inventory — search shop stock and add straight to the job (Section
  // 6.2 "Basic Inventory (search, view stock/location, add to job card)").
  const [showAddPart, setShowAddPart] = useState(false);
  const [partSearch, setPartSearch] = useState("");
  const [partResults, setPartResults] = useState<any[]>([]);
  const [searchingParts, setSearchingParts] = useState(false);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [addQty, setAddQty] = useState("1");
  const [addingItem, setAddingItem] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);
  // Custom (non-inventory) part — same "type: 'PART'" as a searched part so it
  // still counts toward parts_total/invoice subtotal (see jobs.js — both the
  // total recompute and the invoice generator filter on type === 'PART').
  const [customMode, setCustomMode] = useState(false);
  const [customDesc, setCustomDesc] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  // Whether we've ever successfully loaded this job — a ref (not state) so
  // it doesn't change `load`'s identity and re-trigger the mount effect.
  const hasLoadedRef = useRef(false);

  const load = useCallback(() => {
    if (!id) return;
    // Only blank the whole page for the very first load. Every action on
    // this page (status change, progress tap, add part, log call…) calls
    // load() again to refresh — without this guard each of those taps
    // wiped the entire component back to a bare "Loading…" screen instead
    // of updating in place.
    if (!hasLoadedRef.current) setLoading(true);
    Promise.all([
      api.get(`/api/mechanic/jobs/${id}`),
      api.get(`/api/mechanic/jobs/${id}/part-requests`).catch(() => ({ data: [] })),
    ])
      .then(([jobRes, prRes]: any[]) => {
        setJob(jobRes.data);
        setPartRequests(prRes.data || []);
        hasLoadedRef.current = true;
      })
      .catch(() => setError("Job not found or not assigned to you"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Load registered team members for assignment (independent mechanics only)
  useEffect(() => {
    api.get("/api/mechanic/team")
      .then((r: any) => setTeamMembers((r.data || []).filter((m: any) => m.member_user_id)))
      .catch(() => {});
  }, []);

  // Own role — determines whether the commission-set control is shown
  useEffect(() => {
    api.get("/api/mechanic/profile")
      .then((r: any) => setMyRole(r.data?.mechanic_role || null))
      .catch(() => {});
  }, []);

  // Live work clock — counts up while job is IN_PROGRESS
  useEffect(() => {
    if (job?.status !== "IN_PROGRESS") { setElapsed(0); return; }
    const startEvent = [...(job.timeline || [])].reverse().find((t: any) => t.to_status === "IN_PROGRESS");
    const startMs = startEvent ? new Date(startEvent.created_at).getTime() : Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [job?.status, job?.timeline]);

  // Debounced inventory search — fires 300ms after typing stops.
  useEffect(() => {
    if (!showAddPart || customMode || !partSearch.trim()) { setPartResults([]); return; }
    setSearchingParts(true);
    const t = setTimeout(() => {
      api.get(`/api/mechanic/jobs/${id}/parts?q=${encodeURIComponent(partSearch.trim())}`)
        .then((r: any) => setPartResults(r.data || []))
        .catch(() => setPartResults([]))
        .finally(() => setSearchingParts(false));
    }, 300);
    return () => clearTimeout(t);
  }, [partSearch, showAddPart, customMode, id]);

  async function transition(toStatus: string) {
    setTransitioning(true);
    setError("");
    try {
      const r: any = await api.patch(`/api/mechanic/jobs/${id}/status`, { status: toStatus });
      if (r?.data?.whatsapp) setWaPreview(r.data.whatsapp);
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
      const r: any = await api.patch(`/api/mechanic/jobs/${id}/progress`, { progress });
      // Whether or not the mechanic sent (or dismissed) the previous preview,
      // this tap always offers its own fresh one — each action independently
      // sets waPreview, so a dismissed banner never blocks the next prompt.
      setWaPreview(r?.data?.whatsapp ?? null);
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
      const r: any = await api.post(`/api/mechanic/jobs/${id}/part-requests`, {
        description: partDesc.trim(),
        qtyRequested: parseInt(partQty) || 1,
        unitPrice: partPrice ? parseFloat(partPrice) : undefined,
      });
      if (r?.data?.whatsapp) setWaPreview(r.data.whatsapp);
      setPartDesc(""); setPartQty("1"); setPartPrice(""); setShowRequestForm(false);
      load();
    } catch (e: any) {
      setError(e?.error?.message || "Failed to submit request");
    } finally {
      setSavingRequest(false);
    }
  }

  async function logCall() {
    setSavingCall(true);
    setError("");
    try {
      const r: any = await api.post(`/api/mechanic/jobs/${id}/calls`, {
        purpose: callPurpose,
        outcome: callOutcome,
        notes: callNotes.trim() || undefined,
        partRequestId: callPurpose === "EXTRA_WORK_APPROVAL" && callPartRequestId ? parseInt(callPartRequestId) : undefined,
      });
      if (r?.data?.whatsapp) setWaPreview(r.data.whatsapp);
      setShowCallForm(false); setCallPurpose("GENERAL"); setCallPartRequestId(""); setCallOutcome("DISCUSSED"); setCallNotes("");
      load();
    } catch (e: any) {
      setError(e?.error?.message || "Failed to log call");
    } finally {
      setSavingCall(false);
    }
  }

  function resetAddPart() {
    setShowAddPart(false); setPartSearch(""); setPartResults([]); setSelectedPart(null);
    setAddQty("1"); setCustomMode(false); setCustomDesc(""); setCustomPrice("");
  }

  async function addSelectedPart() {
    const qty = parseInt(addQty) || 1;
    if (qty <= 0) return;
    setAddingItem(true);
    setError("");
    try {
      if (customMode) {
        if (!customDesc.trim() || customPrice === "") return;
        await api.post(`/api/mechanic/jobs/${id}/items`, {
          description: customDesc.trim(), qty, unitPrice: parseFloat(customPrice), type: "PART",
        });
      } else if (selectedPart) {
        await api.post(`/api/mechanic/jobs/${id}/items`, {
          inventoryId: selectedPart.inventory_id, description: selectedPart.part_name,
          qty, unitPrice: Number(selectedPart.selling_price), type: "PART",
        });
      } else {
        return;
      }
      resetAddPart();
      load();
    } catch (e: any) {
      setError(e?.data?.error?.message || e?.error?.message || "Failed to add part");
    } finally {
      setAddingItem(false);
    }
  }

  async function removeItem(itemId: number) {
    setRemovingItemId(itemId);
    try {
      await api.delete(`/api/mechanic/jobs/${id}/items/${itemId}`);
      load();
    } catch (e: any) {
      setError(e?.data?.error?.message || e?.error?.message || "Failed to remove item");
    } finally {
      setRemovingItemId(null);
    }
  }

  async function assignJob() {
    if (!assigningTo) return;
    setAssigning(true);
    setError("");
    try {
      await api.patch(`/api/mechanic/jobs/${id}/assign`, { memberId: parseInt(assigningTo) });
      setAssigningTo("");
      load();
    } catch (e: any) {
      setError(e?.error?.message || "Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  async function saveCommission() {
    const amount = parseFloat(commissionAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    setSavingCommission(true);
    setError("");
    try {
      await api.patch(`/api/mechanic/jobs/${id}/commission`, { amount, note: commissionNote.trim() || undefined });
      setShowCommissionForm(false); setCommissionAmount(""); setCommissionNote("");
      load();
    } catch (e: any) {
      setError(e?.error?.message || "Failed to set commission");
    } finally {
      setSavingCommission(false);
    }
  }

  // Phase 1: open WhatsApp directly with the (possibly edited) text — no
  // WATI/Meta template dependency, works today with zero external setup.
  // Phase 2 (planned): swap this for a real server-side send once the
  // Meta Cloud API is wired up — the backend's POST /jobs/:id/notify
  // already exists and works, it's just not called from here yet.
  function sendWhatsApp() {
    if (!waEditText.trim() || !job?.customer_phone) return;
    setWaError("");
    const digits = String(job.customer_phone).replace(/\D/g, "");
    const withCountry = digits.startsWith("91") ? digits : `91${digits}`;
    const link = `https://wa.me/${withCountry}?text=${encodeURIComponent(waEditText.trim())}`;
    const win = window.open(link, "_blank");
    if (!win) { setWaError("Popup blocked — allow popups for this site, or open WhatsApp manually."); return; }
    setWaSent(true);
  }

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported on this browser. Use Chrome on Android."); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.lang = "en-IN";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e: any) => {
      const text = Array.from(e.results).map((res: any) => res[0].transcript).join(" ");
      setNoteText(prev => (prev ? prev + " " : "") + text);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await api.post(`/api/mechanic/jobs/${id}/photos/upload`, { imageBase64: base64, stage: photoStage });
      load();
    } catch {
      setError("Photo upload failed. Try again.");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function saveNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await api.post(`/api/mechanic/jobs/${id}/notes`, { note: noteText.trim() });
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
      const r = await api.post(`/api/mechanic/jobs/${id}/invoice`, {}) as any;
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
  // Mirrors the backend's own guard in jobs.js POST/DELETE /items.
  const jobLocked = ["DELIVERED", "CANCELLED", "QC_PASSED"].includes(job.status);

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, paddingBottom: 14 }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${T.amber}, ${T.crimson})`, borderRadius: "0 0 2px 2px" }} />
        <div style={{ padding: "14px 16px 0", display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => navigate(-1)} style={{
            background: T.bg, border: `1px solid ${T.border}`, cursor: "pointer",
            color: T.t2, padding: 8, borderRadius: 10, display: "flex", alignItems: "center",
            flexShrink: 0,
          }}>
            <MSIcon name="arrow_back" size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: T.amber, fontWeight: 700, letterSpacing: "0.04em" }}>{job.job_number}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.t1, lineHeight: 1.15, marginTop: 2 }}>{job.customer_name}</div>
          </div>
        </div>

        {/* Status + priority + timer row */}
        <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 20,
            background: T.amberGlow, color: T.amber, border: `1px solid ${T.amber}33`,
          }}>
            {STATUS_LABEL[job.status] || job.status}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 20,
            background: job.priority === "URGENT" ? "#FEE2E2" : job.priority === "HIGH" ? "#FEF3C7" : T.bg,
            color: PRIORITY_COLOR(job.priority),
            border: `1px solid ${PRIORITY_COLOR(job.priority)}55`,
          }}>
            {job.priority}
          </span>
          {job.status === "IN_PROGRESS" && (
            <div style={{
              marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", background: T.skyBg, borderRadius: 20, border: `1px solid ${T.sky}44`,
            }}>
              <MSIcon name="timer" size={14} />
              <span style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: T.sky }}>
                {elapsed >= 3600
                  ? `${Math.floor(elapsed / 3600)}h ${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}m`
                  : `${Math.floor(elapsed / 60)}m ${String(elapsed % 60).padStart(2, "0")}s`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle + complaint */}
      <div style={{ margin: "12px 16px 0", background: T.surface, borderRadius: 14, padding: "2px 16px 6px", border: `1px solid ${T.border}` }}>
        <Row icon="directions_car" label="Vehicle" value={`${job.vehicle_make} ${job.vehicle_model}${job.vehicle_year ? ` (${job.vehicle_year})` : ""}`} />
        {job.vehicle_reg && <Row icon="pin" label="Reg No." value={job.vehicle_reg} />}
        {job.odometer_in && <Row icon="speed" label="Odometer" value={`${job.odometer_in} km`} />}
        {job.complaint && <Row icon="report_problem" label="Complaint" value={job.complaint} />}
        {job.diagnosis && <Row icon="medical_information" label="Diagnosis" value={job.diagnosis} />}
        {job.estimated_at && <Row icon="schedule" label="Due by" value={new Date(job.estimated_at).toLocaleString("en-IN")} />}
      </div>

      {/* Commission — what the assigned mechanic earns on this job */}
      {(job.mechanic_commission || (job.shop_id && myRole === "HEAD") || (!job.shop_id && currentUser?.userId === job.created_by)) && (
        <div style={{ margin: "12px 16px 0", background: T.surface, borderRadius: 14, padding: "12px 14px", border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MSIcon name="payments" size={18} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>
                {job.mechanic_commission ? `Commission: ₹${Number(job.mechanic_commission).toFixed(2)}` : "No commission set"}
              </span>
            </div>
            {((job.shop_id && myRole === "HEAD") || (!job.shop_id && currentUser?.userId === job.created_by)) && !showCommissionForm && (
              <button
                onClick={() => { setShowCommissionForm(true); setCommissionAmount(job.mechanic_commission ? String(job.mechanic_commission) : ""); setCommissionNote(job.commission_note || ""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.amber, fontSize: 12, fontWeight: 700, fontFamily: FONT.ui }}
              >
                {job.mechanic_commission ? "Edit" : "Set"}
              </button>
            )}
          </div>
          {job.commission_note && !showCommissionForm && (
            <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>{job.commission_note}</div>
          )}

          {showCommissionForm && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="number"
                placeholder="Commission amount ₹"
                value={commissionAmount}
                min={0}
                onChange={e => setCommissionAmount(e.target.value)}
                style={{
                  padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
                  fontFamily: FONT.ui, fontSize: 13, color: T.t1, outline: "none",
                  background: T.surfaceContainerLowest,
                }}
              />
              <input
                type="text"
                placeholder="Note (optional)"
                value={commissionNote}
                onChange={e => setCommissionNote(e.target.value)}
                style={{
                  padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
                  fontFamily: FONT.ui, fontSize: 13, color: T.t1, outline: "none",
                  background: T.surfaceContainerLowest,
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={saveCommission}
                  disabled={savingCommission || commissionAmount === ""}
                  style={{
                    flex: 1, padding: "9px", background: T.amber, color: "#fff",
                    border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer",
                    opacity: savingCommission || commissionAmount === "" ? 0.5 : 1, fontFamily: FONT.ui,
                  }}
                >
                  {savingCommission ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setShowCommissionForm(false)}
                  style={{ padding: "9px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", color: T.t2, fontFamily: FONT.ui }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team assignment — only for independent mechanics with registered team members */}
      {!job.shop_id && teamMembers.length > 0 && !jobLocked && (
        <div style={{ margin: "12px 16px 0", background: T.surface, borderRadius: 14, padding: "12px 14px", border: `1px solid ${T.border}`, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <MSIcon name="group" size={16} />
          <span style={{ fontSize: 12, color: T.t2, fontWeight: 600 }}>Assign to:</span>
          <select
            value={assigningTo}
            onChange={e => setAssigningTo(e.target.value)}
            style={{
              flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 8,
              border: `1.5px solid ${T.border}`, background: T.surfaceContainerLowest,
              fontFamily: FONT.ui, fontSize: 13, color: T.t1, outline: "none",
            }}
          >
            <option value="">Me (default)</option>
            {teamMembers.map((m: any) => (
              <option key={m.member_user_id} value={String(m.member_user_id)}>{m.name}</option>
            ))}
          </select>
          {assigningTo && (
            <button
              onClick={assignJob}
              disabled={assigning}
              style={{
                padding: "7px 14px", background: T.amber, color: "#fff",
                border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer",
                fontSize: 13, fontFamily: FONT.ui, opacity: assigning ? 0.6 : 1,
              }}
            >
              {assigning ? "…" : "Assign"}
            </button>
          )}
          {job.assigned_mechanic_name && (
            <span style={{ fontSize: 12, color: T.t3, width: "100%" }}>
              Currently: <strong style={{ color: T.t1 }}>{job.assigned_mechanic_name}</strong>
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      {(allowedNext.length > 0 || canInvoice) && (
        <div style={{ margin: "12px 16px 0", display: "flex", gap: 10, flexWrap: "wrap" }}>
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
        <div style={{ margin: "8px 16px 0", padding: "10px 14px", background: "#D1FAE5", borderRadius: 10, fontSize: 13, color: T.emerald, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <MSIcon name="check_circle" size={16} /> Invoice generated
        </div>
      )}

      {error && (
        <div style={{ margin: "8px 16px 0", padding: "10px 14px", background: "#FFDAD6", borderRadius: 10, fontSize: 13, color: T.crimson, border: `1px solid ${T.crimson}44` }}>
          {error}
        </div>
      )}

      {/* WhatsApp preview — editable, sent server-side, no app-switch needed */}
      {waPreview && (
        <div style={{
          margin: "8px 16px 0", padding: "12px 14px", borderRadius: 12,
          background: waSent ? "#D1FAE5" : "#DCF8C6", border: `1px solid ${waSent ? T.emerald : "#25D36655"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <MSIcon name={waSent ? "check_circle" : "chat"} size={16} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#075E54", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {waSent ? "Opened in WhatsApp" : "Send to customer on WhatsApp"}
            </span>
          </div>

          {waSent ? (
            <>
              <div style={{ fontSize: 13, color: "#111", whiteSpace: "pre-wrap", lineHeight: 1.4, marginBottom: 6 }}>{waEditText}</div>
              <div style={{ fontSize: 11, color: "#075E54" }}>Tap Send inside WhatsApp to actually deliver it.</div>
            </>
          ) : (
            <textarea
              value={waEditText}
              onChange={e => setWaEditText(e.target.value)}
              rows={5}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #25D36655",
                fontFamily: FONT.ui, fontSize: 13, color: "#111", resize: "vertical", boxSizing: "border-box",
                background: "#fff", marginBottom: 10,
              }}
            />
          )}

          {waError && (
            <div style={{ fontSize: 12, color: T.crimson, marginBottom: 8 }}>{waError}</div>
          )}
          {!job?.customer_phone && !waSent && (
            <div style={{ fontSize: 12, color: T.crimson, marginBottom: 8 }}>No customer phone number on file</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {!waSent && (
              <button
                onClick={sendWhatsApp}
                disabled={!waEditText.trim() || !job?.customer_phone}
                style={{
                  flex: 1, padding: "9px", background: "#25D366", color: "#fff", border: "none",
                  borderRadius: 8, fontWeight: 700, fontSize: 13, fontFamily: FONT.ui, cursor: "pointer",
                  opacity: !waEditText.trim() || !job?.customer_phone ? 0.5 : 1,
                }}
              >
                Open WhatsApp & Send
              </button>
            )}
            <button
              onClick={() => setWaPreview(null)}
              style={{ padding: "9px 14px", background: "transparent", border: "1px solid #075E5455", borderRadius: 8, cursor: "pointer", color: "#075E54", fontFamily: FONT.ui }}
            >
              {waSent ? "Close" : "Dismiss"}
            </button>
          </div>
        </div>
      )}

      {/* Work progress sub-status — only visible while job is active */}
      {["RECEIVED", "IN_PROGRESS", "WAITING_PARTS", "QC_REWORK"].includes(job.status) && (
        <Section title="Work Progress">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {PROGRESS_STAGES.map((stage, idx) => {
              const stageKeys = PROGRESS_STAGES.map(s => s.key);
              const currentIdx = stageKeys.indexOf(job.mechanic_progress ?? "");
              const isDone = currentIdx >= idx && currentIdx >= 0;
              const isCurrent = job.mechanic_progress === stage.key;
              const isNext = currentIdx + 1 === idx || (currentIdx === -1 && idx === 0);
              const isLast = idx === PROGRESS_STAGES.length - 1;

              return (
                <div key={stage.key} style={{ display: "flex", alignItems: "stretch" }}>
                  {/* Left: circle + connector line */}
                  <div style={{ width: 36, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 11, flexShrink: 0 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                      background: isDone ? T.emerald : isNext ? T.amber : T.border,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: isCurrent ? `0 0 0 4px ${T.amber}22` : "none",
                      transition: "box-shadow 0.2s",
                    }}>
                      <MSIcon name={isDone ? "check" : stage.icon} size={13} />
                    </div>
                    {!isLast && (
                      <div style={{ width: 2, flex: 1, minHeight: 16, background: isDone ? T.emerald : T.border, opacity: isDone ? 0.5 : 0.25, marginTop: 3 }} />
                    )}
                  </div>
                  {/* Right: tappable row */}
                  <button
                    onClick={() => !transitioning && isNext && setProgress(stage.key)}
                    disabled={transitioning || !isNext}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", gap: 8,
                      padding: "9px 10px 9px 4px",
                      borderRadius: 8, border: "none",
                      background: isCurrent ? T.amberGlow : isDone ? T.surfaceContainerHigh : "transparent",
                      cursor: isNext && !transitioning ? "pointer" : "default",
                      opacity: !isDone && !isNext ? 0.4 : 1,
                      marginBottom: isLast ? 0 : 3,
                    }}
                  >
                    <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: isCurrent ? 700 : isDone ? 500 : 400, color: isCurrent ? T.amber : isDone ? T.t2 : T.t1 }}>
                      {stage.label}
                    </span>
                    {isNext && <span style={{ fontSize: 11, color: T.amber, fontWeight: 700 }}>TAP →</span>}
                    {isDone && !isCurrent && <span style={{ fontSize: 12, color: T.emerald }}>✓</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Vehicle service history link */}
      {job.vehicle_reg && (
        <div style={{ margin: "8px 16px 0" }}>
          <button
            onClick={() => navigate(`/api/mechanic/jobs?vehicleReg=${job.vehicle_reg}`)}
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
            <div style={{ fontSize: 12, color: T.t3 }}>
              Qty: {pr.qty_requested}{pr.unit_price ? ` · ₹${Number(pr.unit_price).toFixed(2)} each` : ""}
            </div>
            {pr.review_notes && <div style={{ fontSize: 12, color: T.t2, fontStyle: "italic" }}>Shop: {pr.review_notes}</div>}
            {pr.customer_decision && (
              <div style={{
                marginTop: 4, display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                background: pr.customer_decision === "APPROVED" ? "#D1FAE522" : "#FEE2E222",
                color: pr.customer_decision === "APPROVED" ? T.emerald : T.crimson,
              }}>
                Customer {pr.customer_decision.toLowerCase()} on call
              </div>
            )}
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
            <div style={{ display: "flex", gap: 8 }}>
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
              <input
                type="number"
                placeholder="Est. price ₹ (optional)"
                value={partPrice}
                min={0}
                onChange={e => setPartPrice(e.target.value)}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
                  fontFamily: FONT.ui, fontSize: 13, color: T.t1, outline: "none",
                  background: T.surfaceContainerLowest,
                }}
              />
            </div>
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
                onClick={() => { setShowRequestForm(false); setPartDesc(""); setPartQty("1"); setPartPrice(""); }}
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

      {/* Customer calls — log the phone call, then the exact outcome text
          goes to WhatsApp so the customer sees the same thing that was
          agreed on the call. */}
      <Section title={`Customer Calls${job.calls?.length > 0 ? ` (${job.calls.length})` : ""}`}>
        {job.customer_phone && (
          <a
            href={`tel:${job.customer_phone}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 14px", background: T.sky, color: "#fff", borderRadius: 8,
              fontWeight: 700, fontSize: 13, textDecoration: "none", fontFamily: FONT.ui, marginBottom: 8,
            }}
          >
            <MSIcon name="call" size={16} /> Call {job.customer_name} — {job.customer_phone}
          </a>
        )}

        {job.calls?.map((c: any) => (
          <div key={c.id} style={{ padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.t1 }}>{c.purpose.replace(/_/g, " ")}</div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                background: c.outcome === "APPROVED" ? "#D1FAE522" : c.outcome === "REJECTED" ? "#FEE2E222" : T.amberGlow,
                color: c.outcome === "APPROVED" ? T.emerald : c.outcome === "REJECTED" ? T.crimson : T.amber,
              }}>{c.outcome}</span>
            </div>
            {c.notes && <div style={{ fontSize: 12, color: T.t2, fontStyle: "italic" }}>{c.notes}</div>}
            <div style={{ fontSize: 11, color: T.t3 }}>{c.mechanic_name} · {new Date(c.created_at).toLocaleString("en-IN")}</div>
          </div>
        ))}

        {!showCallForm ? (
          <button
            onClick={() => setShowCallForm(true)}
            style={{
              marginTop: 8, padding: "8px 14px", background: "transparent",
              border: `1.5px dashed ${T.border}`, borderRadius: 8, cursor: "pointer",
              color: T.t2, fontSize: 13, fontFamily: FONT.ui, width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <MSIcon name="add" size={16} /> Log Call Outcome
          </button>
        ) : (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            <select
              value={callPurpose}
              onChange={e => { setCallPurpose(e.target.value as any); setCallPartRequestId(""); }}
              style={{ padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontFamily: FONT.ui, fontSize: 13, color: T.t1, background: T.surfaceContainerLowest }}
            >
              <option value="GENERAL">General update</option>
              <option value="STATUS_UPDATE">Status update</option>
              <option value="EXTRA_WORK_APPROVAL">Extra work approval</option>
            </select>

            {callPurpose === "EXTRA_WORK_APPROVAL" && (
              <select
                value={callPartRequestId}
                onChange={e => setCallPartRequestId(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontFamily: FONT.ui, fontSize: 13, color: T.t1, background: T.surfaceContainerLowest }}
              >
                <option value="">Which extra-work item?</option>
                {partRequests.map((pr: any) => (
                  <option key={pr.id} value={pr.id}>{pr.description} x{pr.qty_requested}</option>
                ))}
              </select>
            )}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["APPROVED", "REJECTED", "NO_ANSWER", "DISCUSSED"] as const).map(o => (
                <button
                  key={o}
                  onClick={() => setCallOutcome(o)}
                  style={{
                    flex: "1 1 auto", padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                    border: `1.5px solid ${callOutcome === o ? T.amber : T.border}`,
                    background: callOutcome === o ? T.amberGlow : "transparent",
                    color: callOutcome === o ? T.amber : T.t3,
                    fontSize: 11, fontWeight: 700, fontFamily: FONT.ui,
                  }}
                >{o.replace("_", " ")}</button>
              ))}
            </div>

            <textarea
              placeholder="What was discussed (optional)…"
              value={callNotes}
              onChange={e => setCallNotes(e.target.value)}
              rows={2}
              style={{
                padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
                fontFamily: FONT.ui, fontSize: 13, color: T.t1, resize: "vertical", boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={logCall}
                disabled={savingCall || (callPurpose === "EXTRA_WORK_APPROVAL" && !callPartRequestId)}
                style={{
                  flex: 1, padding: "9px", background: T.amber, color: "#fff",
                  border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer",
                  opacity: savingCall || (callPurpose === "EXTRA_WORK_APPROVAL" && !callPartRequestId) ? 0.5 : 1, fontFamily: FONT.ui,
                }}
              >
                {savingCall ? "Saving…" : "Save & Prepare WhatsApp"}
              </button>
              <button
                onClick={() => { setShowCallForm(false); setCallNotes(""); setCallPartRequestId(""); }}
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
      {(job.items?.length > 0 || !jobLocked) && (
        <Section title="Parts & Labour">
          {job.items?.map((item: any) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.t1 }}>{item.description}</div>
                <div style={{ fontSize: 12, color: T.t3 }}>x{item.qty} · {item.type}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: 700, color: T.t1 }}>
                  ₹{Number(item.total).toFixed(2)}
                </div>
                {!jobLocked && (
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={removingItemId === item.id}
                    title="Remove"
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.t3, padding: 2, opacity: removingItemId === item.id ? 0.4 : 1 }}
                  >
                    <MSIcon name="close" size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {job.items?.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 700 }}>
              <span style={{ fontSize: 14, color: T.t2 }}>Total</span>
              <span style={{ fontFamily: FONT.mono, fontSize: 15, color: T.t1 }}>₹{Number(job.total_amount).toFixed(2)}</span>
            </div>
          )}

          {/* Add Part — basic inventory search + custom part (Section 6.2) */}
          {!jobLocked && (
            !showAddPart ? (
              <button
                onClick={() => setShowAddPart(true)}
                style={{
                  marginTop: job.items?.length > 0 ? 10 : 0, padding: "8px 14px", background: "transparent",
                  border: `1.5px dashed ${T.border}`, borderRadius: 8, cursor: "pointer",
                  color: T.t2, fontSize: 13, fontFamily: FONT.ui, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <MSIcon name="add" size={16} /> Add Part
              </button>
            ) : (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setCustomMode(false)}
                    style={{
                      flex: 1, padding: "7px", borderRadius: 8, border: `1.5px solid ${!customMode ? T.amber : T.border}`,
                      background: !customMode ? T.amberGlow : "transparent", color: !customMode ? T.amber : T.t3,
                      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui,
                    }}
                  >
                    Search Stock
                  </button>
                  <button
                    onClick={() => { setCustomMode(true); setSelectedPart(null); setPartResults([]); }}
                    style={{
                      flex: 1, padding: "7px", borderRadius: 8, border: `1.5px solid ${customMode ? T.amber : T.border}`,
                      background: customMode ? T.amberGlow : "transparent", color: customMode ? T.amber : T.t3,
                      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui,
                    }}
                  >
                    Custom Part
                  </button>
                </div>

                {!customMode ? (
                  <>
                    <input
                      type="text"
                      placeholder="Search by name, brand, or OEM number"
                      value={partSearch}
                      onChange={e => { setPartSearch(e.target.value); setSelectedPart(null); }}
                      autoFocus
                      style={{
                        padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
                        fontFamily: FONT.ui, fontSize: 13, color: T.t1, outline: "none",
                        background: T.surfaceContainerLowest,
                      }}
                    />
                    {searchingParts && <div style={{ fontSize: 12, color: T.t3 }}>Searching…</div>}
                    {!selectedPart && partResults.length > 0 && (
                      <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 8 }}>
                        {partResults.map((p: any) => (
                          <button
                            key={p.inventory_id}
                            onClick={() => { setSelectedPart(p); setPartResults([]); setPartSearch(p.part_name); }}
                            style={{
                              width: "100%", textAlign: "left", padding: "9px 12px", background: "transparent",
                              border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer", fontFamily: FONT.ui,
                            }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{p.part_name} {p.brand ? `· ${p.brand}` : ""}</div>
                            <div style={{ fontSize: 11, color: T.t3 }}>
                              Stock: {p.stock_qty}{p.location ? ` · ${p.location}` : ""} · ₹{Number(p.selling_price).toFixed(2)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedPart && (
                      <div style={{ padding: "8px 12px", background: T.amberGlow, borderRadius: 8, fontSize: 12, color: T.t1 }}>
                        Selected: <strong>{selectedPart.part_name}</strong> — stock {selectedPart.stock_qty}, ₹{Number(selectedPart.selling_price).toFixed(2)} each
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Part / service description"
                      value={customDesc}
                      onChange={e => setCustomDesc(e.target.value)}
                      style={{
                        padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
                        fontFamily: FONT.ui, fontSize: 13, color: T.t1, outline: "none",
                        background: T.surfaceContainerLowest,
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Unit price (₹)"
                      value={customPrice}
                      min={0}
                      onChange={e => setCustomPrice(e.target.value)}
                      style={{
                        padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
                        fontFamily: FONT.ui, fontSize: 13, color: T.t1, outline: "none",
                        background: T.surfaceContainerLowest,
                      }}
                    />
                  </>
                )}

                <input
                  type="number"
                  placeholder="Qty"
                  value={addQty}
                  min={1}
                  onChange={e => setAddQty(e.target.value)}
                  style={{
                    padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
                    fontFamily: FONT.ui, fontSize: 13, color: T.t1, outline: "none",
                    background: T.surfaceContainerLowest, width: "100px",
                  }}
                />

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={addSelectedPart}
                    disabled={addingItem || (customMode ? (!customDesc.trim() || customPrice === "") : !selectedPart)}
                    style={{
                      flex: 1, padding: "9px", background: T.amber, color: "#fff",
                      border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer",
                      opacity: addingItem || (customMode ? (!customDesc.trim() || customPrice === "") : !selectedPart) ? 0.5 : 1,
                      fontFamily: FONT.ui,
                    }}
                  >
                    {addingItem ? "Adding…" : "Add to Job"}
                  </button>
                  <button
                    onClick={resetAddPart}
                    style={{
                      padding: "9px 14px", background: "transparent", border: `1px solid ${T.border}`,
                      borderRadius: 8, cursor: "pointer", color: T.t2, fontFamily: FONT.ui,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )
          )}
        </Section>
      )}

      {/* Photos — upload + stage-grouped display */}
      {(job.photos?.length > 0 || !jobLocked) && (
        <Section title={`Photos${job.photos?.length > 0 ? ` (${job.photos.length})` : ""}`}>
          {job.photos?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {(["BEFORE", "DURING", "AFTER"] as const).map(s => {
                const sp = job.photos.filter((p: any) => p.stage === s);
                if (!sp.length) return null;
                return (
                  <div key={s} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, marginBottom: 4, letterSpacing: "0.08em" }}>{s}</div>
                    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                      {sp.map((p: any) => (
                        <img key={p.id} src={p.url} alt={p.stage}
                          style={{ width: 76, height: 76, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!jobLocked && (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {(["BEFORE", "DURING", "AFTER"] as const).map(s => (
                  <button key={s} type="button" onClick={() => setPhotoStage(s)}
                    style={{
                      flex: 1, padding: "6px 4px", borderRadius: 8, cursor: "pointer",
                      border: `1.5px solid ${photoStage === s ? T.amber : T.border}`,
                      background: photoStage === s ? T.amberGlow : "transparent",
                      color: photoStage === s ? T.amber : T.t3,
                      fontSize: 11, fontWeight: 700, fontFamily: FONT.ui,
                    }}
                  >{s}</button>
                ))}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                style={{ display: "none" }} onChange={handlePhotoSelect} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                style={{
                  width: "100%", padding: "9px 14px", background: "transparent",
                  border: `1.5px dashed ${T.border}`, borderRadius: 8, cursor: uploadingPhoto ? "not-allowed" : "pointer",
                  color: T.t2, fontSize: 13, fontFamily: FONT.ui,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  opacity: uploadingPhoto ? 0.6 : 1,
                }}
              >
                <MSIcon name={uploadingPhoto ? "hourglass_empty" : "photo_camera"} size={16} />
                {uploadingPhoto ? "Uploading…" : `Add ${photoStage.toLowerCase()} photo`}
              </button>
            </>
          )}
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
        <div style={{ position: "relative" }}>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Type or speak a note visible to the workshop…"
            rows={3}
            style={{
              width: "100%", padding: "10px 40px 10px 10px", borderRadius: 8,
              border: `1px solid ${listening ? T.sky : T.border}`,
              fontFamily: FONT.ui, fontSize: 13, color: T.t1, resize: "vertical",
              boxSizing: "border-box", transition: "border-color 0.2s",
            }}
          />
          <button
            onClick={toggleVoice}
            title={listening ? "Stop listening" : "Speak note"}
            style={{
              position: "absolute", top: 8, right: 8,
              background: listening ? T.sky : "transparent",
              border: `1px solid ${listening ? T.sky : T.border}`,
              borderRadius: 6, padding: 4, cursor: "pointer",
              color: listening ? "#fff" : T.t3, lineHeight: 1,
            }}
          >
            <MSIcon name={listening ? "mic" : "mic_none"} size={18} />
          </button>
        </div>
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
    <div style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: `1px solid ${T.border}88` }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: T.amber, marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontSize: 14, color: T.t1, marginTop: 2, fontWeight: 500, lineHeight: 1.4, wordBreak: "break-word" }}>{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: "12px 16px 0", background: T.surface, borderRadius: 14, padding: "14px 16px", border: `1px solid ${T.border}` }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.t3,
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: 12,
        borderLeft: `3px solid ${T.amber}`, paddingLeft: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function PRIORITY_COLOR(p: string) {
  return p === "URGENT" ? T.crimson : p === "HIGH" ? "#F59E0B" : T.t3;
}
