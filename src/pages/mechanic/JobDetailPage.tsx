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
  { key: "VEHICLE_RECEIVED",  label: "Vehicle Received",  icon: "directions_car" },
  { key: "DIAGNOSIS_DONE",    label: "Diagnosis Done",    icon: "search" },
  { key: "PARTS_ISSUED",      label: "Parts Issued",      icon: "inventory_2" },
  { key: "REPAIR_STARTED",    label: "Repair Started",    icon: "build" },
  { key: "REPAIR_COMPLETED",  label: "Repair Completed",  icon: "verified" },
  { key: "CLEANING",          label: "Cleaning",          icon: "cleaning_services" },
  { key: "READY_FOR_QC",      label: "Ready for QC",      icon: "rule" },
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

const STATUS_META: Record<string, { color: string; bg: string; border: string }> = {
  RECEIVED:      { color: "#5D5F5B", bg: "#F0EDE9",             border: "rgba(93,95,91,.3)" },
  IN_PROGRESS:   { color: T.sky,     bg: "#EEF3FF",             border: "rgba(21,101,192,.3)" },
  WAITING_PARTS: { color: "#B45309", bg: "#FEF3C7",             border: "rgba(180,83,9,.3)" },
  READY:         { color: T.violet,  bg: "#EDE7F6",             border: "rgba(69,39,160,.3)" },
  QC_REWORK:     { color: T.crimson, bg: "#FFEBEE",             border: "rgba(183,28,28,.3)" },
  QC_PASSED:     { color: T.emerald, bg: "rgba(22,163,74,.08)", border: "rgba(27,94,32,.3)" },
  DELIVERED:     { color: "#00695C", bg: "#E0F2F1",             border: "rgba(0,105,92,.3)" },
  CANCELLED:     { color: T.crimson, bg: "#FFEBEE",             border: "rgba(183,28,28,.3)" },
};

type TabId = "overview" | "progress" | "parts" | "customer" | "media" | "activity";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview",  label: "Overview",  icon: "home" },
  { id: "progress",  label: "Progress",  icon: "checklist" },
  { id: "parts",     label: "Parts",     icon: "build_circle" },
  { id: "customer",  label: "Customer",  icon: "person" },
  { id: "media",     label: "Media",     icon: "photo_library" },
  { id: "activity",  label: "Activity",  icon: "history" },
];

function MSIcon({ name, size = 20, filled = false }: { name: string; size?: number; filled?: boolean }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size, lineHeight: 1,
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
      }}
    >
      {name}
    </span>
  );
}

function priorityColor(p: string) {
  return p === "URGENT" ? T.crimson : p === "HIGH" ? "#B45309" : T.t3;
}
function priorityBg(p: string) {
  return p === "URGENT" ? "#FFEBEE" : p === "HIGH" ? "#FEF3C7" : T.surfaceContainerLow;
}

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAppCtx();

  // ── Core data ───────────────────────────────────────────────────────────────
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partRequests, setPartRequests] = useState<any[]>([]);

  // ── Tab navigation ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // ── Status & progress ───────────────────────────────────────────────────────
  const [transitioning, setTransitioning] = useState(false);

  // ── WhatsApp preview ────────────────────────────────────────────────────────
  const [waPreview, setWaPreview] = useState<{ text: string; link: string | null } | null>(null);
  const [waEditText, setWaEditText] = useState("");
  const [waSent, setWaSent] = useState(false);
  const [waError, setWaError] = useState("");

  useEffect(() => {
    setWaEditText(waPreview?.text ?? "");
    setWaSent(false);
    setWaError("");
  }, [waPreview]);

  // ── Call log ────────────────────────────────────────────────────────────────
  const [showCallForm, setShowCallForm] = useState(false);
  const [callPurpose, setCallPurpose] = useState<"STATUS_UPDATE" | "EXTRA_WORK_APPROVAL" | "GENERAL">("GENERAL");
  const [callPartRequestId, setCallPartRequestId] = useState("");
  const [callOutcome, setCallOutcome] = useState<"APPROVED" | "REJECTED" | "NO_ANSWER" | "DISCUSSED">("DISCUSSED");
  const [callNotes, setCallNotes] = useState("");
  const [savingCall, setSavingCall] = useState(false);

  // ── Part request form ───────────────────────────────────────────────────────
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [partDesc, setPartDesc] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partPrice, setPartPrice] = useState("");
  const [savingRequest, setSavingRequest] = useState(false);

  // ── Parts & items ───────────────────────────────────────────────────────────
  const [showAddPart, setShowAddPart] = useState(false);
  const [partSearch, setPartSearch] = useState("");
  const [partResults, setPartResults] = useState<any[]>([]);
  const [searchingParts, setSearchingParts] = useState(false);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [addQty, setAddQty] = useState("1");
  const [addingItem, setAddingItem] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customDesc, setCustomDesc] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  // ── Commission ──────────────────────────────────────────────────────────────
  const [myRole, setMyRole] = useState<string | null>(null);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionNote, setCommissionNote] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);

  // ── Team assignment ─────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assigningTo, setAssigningTo] = useState("");
  const [assigning, setAssigning] = useState(false);

  // ── Notes & voice ───────────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);

  // ── Photos ──────────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoStage, setPhotoStage] = useState<"BEFORE" | "DURING" | "AFTER">("DURING");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Invoice ─────────────────────────────────────────────────────────────────
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // ── Work timer ──────────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);

  const hasLoadedRef = useRef(false);

  const load = useCallback(() => {
    if (!id) return;
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

  useEffect(() => {
    api.get("/api/mechanic/team")
      .then((r: any) => setTeamMembers((r.data || []).filter((m: any) => m.member_user_id)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get("/api/mechanic/profile")
      .then((r: any) => setMyRole(r.data?.mechanic_role || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (job?.status !== "IN_PROGRESS") { setElapsed(0); return; }
    const startEvent = [...(job.timeline || [])].reverse().find((t: any) => t.to_status === "IN_PROGRESS");
    const startMs = startEvent ? new Date(startEvent.created_at).getTime() : Date.now();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const tid = setInterval(tick, 1000);
    return () => clearInterval(tid);
  }, [job?.status, job?.timeline]);

  // Debounced inventory search
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

  // ── API actions ─────────────────────────────────────────────────────────────

  async function transition(toStatus: string) {
    setTransitioning(true); setError("");
    try {
      const r: any = await api.patch(`/api/mechanic/jobs/${id}/status`, { status: toStatus });
      if (r?.data?.whatsapp) setWaPreview(r.data.whatsapp);
      setJob((prev: any) => (prev ? { ...prev, status: toStatus } : prev));
      load();
    } catch (e: any) {
      setError(e?.error?.message || "Status update failed");
    } finally {
      setTransitioning(false);
    }
  }

  async function setProgress(progress: string) {
    setTransitioning(true); setError("");
    try {
      const r: any = await api.patch(`/api/mechanic/jobs/${id}/progress`, { progress });
      setWaPreview(r?.data?.whatsapp ?? null);
      setJob((prev: any) => (prev ? { ...prev, mechanic_progress: progress } : prev));
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
    setSavingCall(true); setError("");
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
    setAddingItem(true); setError("");
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
      resetAddPart(); load();
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
    setAssigning(true); setError("");
    try {
      await api.patch(`/api/mechanic/jobs/${id}/assign`, { memberId: parseInt(assigningTo) });
      setAssigningTo(""); load();
    } catch (e: any) {
      setError(e?.error?.message || "Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  async function saveCommission() {
    const amount = parseFloat(commissionAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    setSavingCommission(true); setError("");
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

  function sendWhatsApp() {
    if (!waEditText.trim() || !job?.customer_phone) return;
    setWaError("");
    const digits = String(job.customer_phone).replace(/\D/g, "");
    const withCountry = digits.startsWith("91") ? digits : `91${digits}`;
    const link = `https://wa.me/${withCountry}?text=${encodeURIComponent(waEditText.trim())}`;
    const win = window.open(link, "_blank");
    if (!win) { setWaError("Popup blocked — allow popups for this site."); return; }
    setWaSent(true);
  }

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported. Use Chrome on Android."); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.lang = "en-IN"; r.continuous = true; r.interimResults = false;
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
    setUploadingPhoto(true); setError("");
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
      setNoteText(""); load();
    } catch (e: any) {
      setError(e?.error?.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  }

  async function generateInvoice() {
    setGeneratingInvoice(true); setError("");
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

  // ── Early returns ────────────────────────────────────────────────────────────

  if (loading) return <p style={{ padding: 24, color: T.t3, fontFamily: FONT.ui }}>Loading…</p>;
  if (error && !job) return (
    <div style={{ padding: 24 }}>
      <p style={{ color: T.crimson, fontFamily: FONT.ui }}>{error}</p>
      <button onClick={() => navigate(-1)} style={{ marginTop: 12, color: T.amber, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: FONT.ui }}>← Back</button>
    </div>
  );
  if (!job) return null;

  const allowedNext = MECHANIC_TRANSITIONS[job.status] ?? [];
  const canInvoice = job.status === "QC_PASSED" && !job.mechanic_invoice_id;
  const jobLocked = ["DELIVERED", "CANCELLED", "QC_PASSED"].includes(job.status);
  const sm = STATUS_META[job.status] || STATUS_META.RECEIVED;
  const canManageCommission = (job.shop_id && myRole === "HEAD") || (!job.shop_id && currentUser?.userId === job.created_by);

  // Current progress stage
  const stageKeys = PROGRESS_STAGES.map(s => s.key);
  const currentStageIdx = stageKeys.indexOf(job.mechanic_progress ?? "");
  const currentStage = PROGRESS_STAGES[currentStageIdx];
  const nextStage = PROGRESS_STAGES[currentStageIdx + 1];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* ── Mini header ─────────────────────────────────────────────────────── */}
      <div style={{ background: T.surface, borderBottom: `1.5px solid ${T.border}`, padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ width: 38, height: 38, borderRadius: 8, background: T.surfaceContainerLow, border: `1.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <MSIcon name="arrow_back" size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, color: T.amber, letterSpacing: "0.06em" }}>{job.job_number}</div>
            <div style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 800, color: T.t1, lineHeight: 1.2, marginTop: 2 }}>{job.customer_name}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
              {STATUS_LABEL[job.status] || job.status}
            </span>
            {job.status === "IN_PROGRESS" && (
              <div style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, color: T.sky, background: T.skyBg, borderRadius: 8, padding: "3px 10px", border: "1px solid rgba(21,101,192,.2)" }}>
                {elapsed >= 3600
                  ? `${Math.floor(elapsed / 3600)}h ${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}m`
                  : `${Math.floor(elapsed / 60)}m ${String(elapsed % 60).padStart(2, "0")}s`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar (sticky below shell topbar) ─────────────────────────────── */}
      <div style={{
        position: "sticky", top: 56, zIndex: 40,
        background: T.surface, borderBottom: `1.5px solid ${T.border}`,
        display: "flex", overflowX: "auto", scrollbarWidth: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,.06)",
      } as React.CSSProperties}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center",
              gap: 2, padding: "9px 16px 10px", background: "none", border: "none",
              cursor: "pointer", color: activeTab === tab.id ? T.amber : T.t3,
              fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
              fontFamily: FONT.ui, position: "relative", transition: "color 0.15s",
            }}
          >
            <MSIcon name={tab.icon} size={22} />
            {tab.label}
            {activeTab === tab.id && (
              <div style={{ position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2.5, background: T.amber, borderRadius: "2px 2px 0 0" }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div style={{ margin: "8px 16px 0", padding: "10px 14px", background: "#FFDAD6", borderRadius: 10, fontSize: 13, color: T.crimson, border: `1px solid ${T.crimson}44`, fontFamily: FONT.ui }}>
          {error}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: OVERVIEW
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div style={{ padding: "0 16px 16px" }}>
          {/* Priority + vehicle summary row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, color: priorityColor(job.priority), background: priorityBg(job.priority) }}>
              {job.priority}
            </span>
            <span style={{ fontSize: 12, color: T.t3, flex: 1, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {job.vehicle_make} {job.vehicle_model}{job.vehicle_reg ? ` · ${job.vehicle_reg}` : ""}
            </span>
          </div>

          {/* Current stage highlight card */}
          <div style={{ borderRadius: 14, padding: "14px 16px", marginBottom: 12, border: `1.5px solid ${T.amber}`, background: T.amberGlow }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: T.amber, marginBottom: 8 }}>Current Stage</div>
            {currentStage ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: T.amber, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MSIcon name={currentStage.icon} size={22} filled />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: T.t1 }}>{currentStage.label}</div>
                  <div style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>{nextStage ? `Next: ${nextStage.label}` : "All stages complete!"}</div>
                </div>
                <button
                  onClick={() => setActiveTab("progress")}
                  style={{ width: 38, height: 38, borderRadius: 8, background: "none", border: `1.5px solid ${T.amber}44`, color: T.amber, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <MSIcon name="chevron_right" size={20} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: T.amber, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MSIcon name="build" size={22} filled />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: T.t1 }}>Not started</div>
                  <div style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>Tap Progress tab to begin</div>
                </div>
                <button onClick={() => setActiveTab("progress")} style={{ width: 38, height: 38, borderRadius: 8, background: "none", border: `1.5px solid ${T.amber}44`, color: T.amber, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MSIcon name="chevron_right" size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Vehicle & complaint info card */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px 8px", marginBottom: 12 }}>
            <InfoRow icon="directions_car" label="Vehicle" value={`${job.vehicle_make} ${job.vehicle_model}${job.vehicle_year ? ` (${job.vehicle_year})` : ""}`} iconColor={T.amber} />
            {job.vehicle_reg && <InfoRow icon="pin" label="Reg No." value={job.vehicle_reg} />}
            {job.odometer_in && <InfoRow icon="speed" label="Odometer" value={`${job.odometer_in} km`} />}
            {job.complaint && <InfoRow icon="report_problem" label="Complaint" value={job.complaint} />}
            {job.estimated_at && <InfoRow icon="schedule" label="Due by" value={new Date(job.estimated_at).toLocaleString("en-IN")} iconColor={T.amber} />}
          </div>

          {/* Status action buttons */}
          {(allowedNext.length > 0 || canInvoice) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {job.status === "IN_PROGRESS" ? (
                <>
                  <ActionBtn label="Waiting for Parts" icon="inventory_2" onClick={() => transition("WAITING_PARTS")} disabled={transitioning} color="#B45309" bg="#FEF3C7" />
                  <ActionBtn label="Mark Ready for QC" icon="rule" onClick={() => transition("READY")} disabled={transitioning} color={T.emerald} />
                </>
              ) : allowedNext.length === 1 ? (
                <ActionBtn
                  label={job.status === "RECEIVED" ? "Start Job" : job.status === "WAITING_PARTS" ? "Parts Arrived — Resume" : job.status === "QC_REWORK" ? "Start Rework" : `Move to ${STATUS_LABEL[allowedNext[0]]}`}
                  icon="play_arrow"
                  onClick={() => transition(allowedNext[0])}
                  disabled={transitioning}
                />
              ) : null}
              {canInvoice && (
                <ActionBtn label="Generate Invoice" icon="receipt_long" onClick={generateInvoice} disabled={generatingInvoice} color={T.emerald} />
              )}
            </div>
          )}

          {job.mechanic_invoice_id && (
            <div style={{ marginBottom: 12, padding: "10px 14px", background: T.emeraldBg, borderRadius: 10, fontSize: 13, color: T.emerald, fontWeight: 600, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 6 }}>
              <MSIcon name="check_circle" size={16} filled /> Invoice generated
            </div>
          )}

          {/* Commission card */}
          {(job.mechanic_commission || canManageCommission) && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: T.emeraldBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MSIcon name="payments" size={20} filled />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Commission</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 800, color: T.emerald }}>
                      {job.mechanic_commission ? `₹${Number(job.mechanic_commission).toFixed(2)}` : "Not set"}
                    </div>
                  </div>
                </div>
                {canManageCommission && !showCommissionForm && (
                  <button
                    onClick={() => { setShowCommissionForm(true); setCommissionAmount(job.mechanic_commission ? String(job.mechanic_commission) : ""); setCommissionNote(job.commission_note || ""); }}
                    style={{ padding: "8px 16px", background: T.surfaceContainerLow, border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: T.t2, cursor: "pointer", fontFamily: FONT.ui }}
                  >
                    {job.mechanic_commission ? "Edit" : "Set"}
                  </button>
                )}
              </div>
              {job.commission_note && !showCommissionForm && (
                <div style={{ fontSize: 12, color: T.t3, marginTop: 6 }}>{job.commission_note}</div>
              )}
              {showCommissionForm && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <input type="number" placeholder="Amount ₹" value={commissionAmount} min={0} onChange={e => setCommissionAmount(e.target.value)}
                    style={inpStyle} />
                  <input type="text" placeholder="Note (optional)" value={commissionNote} onChange={e => setCommissionNote(e.target.value)}
                    style={inpStyle} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveCommission} disabled={savingCommission || commissionAmount === ""}
                      style={{ flex: 1, padding: "9px", background: T.amber, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", opacity: savingCommission || commissionAmount === "" ? 0.5 : 1, fontFamily: FONT.ui }}>
                      {savingCommission ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setShowCommissionForm(false)}
                      style={{ padding: "9px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", color: T.t2, fontFamily: FONT.ui }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Team assignment */}
          {!job.shop_id && teamMembers.length > 0 && !jobLocked && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: T.t3, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 3, height: 12, background: T.amber, borderRadius: 2 }} />
                Assign Mechanic
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={assigningTo} onChange={e => setAssigningTo(e.target.value)} style={{ ...inpStyle, flex: 1 }}>
                  <option value="">Me (default)</option>
                  {teamMembers.map((m: any) => (
                    <option key={m.member_user_id} value={String(m.member_user_id)}>{m.name}</option>
                  ))}
                </select>
                {assigningTo && (
                  <button onClick={assignJob} disabled={assigning}
                    style={{ padding: "9px 16px", background: T.amber, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, opacity: assigning ? 0.6 : 1 }}>
                    {assigning ? "…" : "Assign"}
                  </button>
                )}
              </div>
              {job.assigned_mechanic_name && (
                <div style={{ fontSize: 12, color: T.t3, marginTop: 8 }}>
                  Currently: <strong style={{ color: T.t1 }}>{job.assigned_mechanic_name}</strong>
                </div>
              )}
            </div>
          )}

          {/* Recent activity preview */}
          {job.timeline?.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 4 }}>
                <SectionHeader title="Recent Activity" />
                <button onClick={() => setActiveTab("activity")} style={{ background: "none", border: "none", color: T.amber, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>
                  View all
                </button>
              </div>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px" }}>
                {job.timeline.slice(0, 3).map((t: any, i: number) => (
                  <TimelineRow key={t.id} item={t} last={i === Math.min(2, job.timeline.length - 1)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: PROGRESS
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "progress" && (
        <div style={{ padding: "12px 16px 16px" }}>
          <p style={{ fontSize: 13, color: T.t2, marginBottom: 14, lineHeight: 1.6, fontFamily: FONT.ui }}>
            Tap the <strong style={{ color: T.amber }}>next stage</strong> to advance. Each step is timestamped and logged automatically.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PROGRESS_STAGES.map((stage, idx) => {
              const isDone = currentStageIdx >= idx && currentStageIdx >= 0;
              const isCurrent = job.mechanic_progress === stage.key;
              const isNext = currentStageIdx + 1 === idx || (currentStageIdx === -1 && idx === 0);
              const isLocked = !isDone && !isNext;

              return (
                <button
                  key={stage.key}
                  onClick={() => !transitioning && isNext && setProgress(stage.key)}
                  disabled={!isNext || transitioning}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                    borderRadius: 12, cursor: isNext && !transitioning ? "pointer" : "default",
                    border: `1.5px solid ${isDone ? "rgba(27,94,32,.35)" : isCurrent ? T.amber : isNext ? T.borderHi : T.border}`,
                    background: isDone ? T.emeraldBg : isCurrent ? T.amberGlow : isNext ? T.surfaceContainerLow : T.surface,
                    boxShadow: isCurrent ? `0 0 0 3px ${T.amberGlow}` : "none",
                    opacity: isLocked ? 0.4 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isDone ? T.emeraldBg : isCurrent ? T.amber : T.surfaceContainerHigh,
                  }}>
                    <MSIcon name={isDone ? "check_circle" : stage.icon} size={22} filled={isDone || isCurrent} />
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: isDone || isNext ? 700 : 600, color: isCurrent ? T.t1 : isDone ? T.t2 : T.t3 }}>
                      {stage.label}
                    </div>
                    <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>
                      {isDone ? "Done" : isCurrent ? "In progress now" : isNext ? "Tap to advance →" : "Pending"}
                    </div>
                  </div>
                  {isCurrent && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.amber, flexShrink: 0, animation: "pulse 1.8s ease-in-out infinite" }} />}
                  {isDone && <MSIcon name="check_circle" size={20} filled />}
                  {isNext && <MSIcon name="chevron_right" size={18} />}
                </button>
              );
            })}
          </div>

          {/* WhatsApp nudge after progress tap */}
          {waPreview && (
            <div style={{ marginTop: 16, background: "#E8F5E9", border: "1.5px solid rgba(18,140,126,.3)", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MSIcon name="chat" size={20} filled />
                <span style={{ fontWeight: 700, color: T.t1, fontSize: 14, fontFamily: FONT.ui }}>Send Update to Customer</span>
              </div>
              <textarea
                value={waEditText}
                onChange={e => setWaEditText(e.target.value)}
                rows={5}
                style={{ ...inpStyle, borderColor: "rgba(18,140,126,.3)", resize: "vertical" }}
              />
              {waError && <div style={{ fontSize: 12, color: T.crimson, marginBottom: 8 }}>{waError}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={sendWhatsApp}
                  disabled={!waEditText.trim() || !job?.customer_phone}
                  style={{ flex: 1, padding: "11px", background: "#25D366", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: FONT.ui, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: !waEditText.trim() || !job?.customer_phone ? 0.5 : 1 }}
                >
                  <MSIcon name="chat" size={18} filled /> Open WhatsApp
                </button>
                <button onClick={() => setWaPreview(null)}
                  style={{ padding: "11px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", color: T.t2, fontFamily: FONT.ui }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: PARTS
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "parts" && (
        <div style={{ padding: "12px 16px 16px" }}>
          {/* Items list */}
          {job.items?.length > 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "0 16px", marginBottom: 12 }}>
              {job.items.map((item: any) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: item.type === "PART" ? T.amberGlow : T.skyBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <MSIcon name={item.type === "PART" ? "settings" : "handyman"} size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{item.description}</div>
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{item.type} · x{item.qty} · <span style={{ fontFamily: FONT.mono }}>₹{Number(item.unit_price || 0).toFixed(2)}</span></div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: 800, color: T.t1 }}>₹{Number(item.total).toFixed(2)}</div>
                    {!jobLocked && (
                      <button onClick={() => removeItem(item.id)} disabled={removingItemId === item.id}
                        style={{ background: "none", border: "none", cursor: "pointer", color: T.t3, padding: 4, opacity: removingItemId === item.id ? 0.4 : 1 }}>
                        <MSIcon name="close" size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderTop: `2px solid ${T.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.t2, fontFamily: FONT.ui }}>Job Total</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 22, fontWeight: 900, color: T.t1 }}>₹{Number(job.total_amount).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Add part buttons */}
          {!jobLocked && !showAddPart && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <button onClick={() => { setShowAddPart(true); setCustomMode(false); }}
                style={{ padding: "12px 16px", background: "transparent", border: `1.5px dashed ${T.border}`, borderRadius: 10, cursor: "pointer", color: T.t2, fontSize: 13, fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <MSIcon name="search" size={18} /> Search Stock &amp; Add
              </button>
              <button onClick={() => { setShowAddPart(true); setCustomMode(true); }}
                style={{ padding: "12px 16px", background: "transparent", border: `1.5px dashed ${T.border}`, borderRadius: 10, cursor: "pointer", color: T.t2, fontSize: 13, fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <MSIcon name="add_circle" size={18} /> Add Custom Part / Labour
              </button>
            </div>
          )}

          {/* Add part form */}
          {!jobLocked && showAddPart && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={() => { setCustomMode(false); setSelectedPart(null); setPartResults([]); }}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1.5px solid ${!customMode ? T.amber : T.border}`, background: !customMode ? T.amberGlow : "transparent", color: !customMode ? T.amber : T.t3, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>
                  Search Stock
                </button>
                <button onClick={() => { setCustomMode(true); setSelectedPart(null); setPartResults([]); }}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1.5px solid ${customMode ? T.amber : T.border}`, background: customMode ? T.amberGlow : "transparent", color: customMode ? T.amber : T.t3, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>
                  Custom Part
                </button>
              </div>

              {!customMode ? (
                <>
                  <input type="text" placeholder="Search by name, brand, or OEM number" value={partSearch}
                    onChange={e => { setPartSearch(e.target.value); setSelectedPart(null); }} autoFocus style={inpStyle} />
                  {searchingParts && <div style={{ fontSize: 12, color: T.t3, margin: "6px 0" }}>Searching…</div>}
                  {!selectedPart && partResults.length > 0 && (
                    <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 8, marginTop: 8 }}>
                      {partResults.map((p: any) => (
                        <button key={p.inventory_id} onClick={() => { setSelectedPart(p); setPartResults([]); setPartSearch(p.part_name); }}
                          style={{ width: "100%", textAlign: "left", padding: "9px 12px", background: "transparent", border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer", fontFamily: FONT.ui }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{p.part_name}{p.brand ? ` · ${p.brand}` : ""}</div>
                          <div style={{ fontSize: 11, color: T.t3 }}>Stock: {p.stock_qty}{p.location ? ` · ${p.location}` : ""} · ₹{Number(p.selling_price).toFixed(2)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {!selectedPart && !searchingParts && partSearch.trim() && partResults.length === 0 && (
                    <div style={{ fontSize: 12, color: T.t3, margin: "8px 0", textAlign: "center", padding: "8px", background: T.surfaceContainerLow, borderRadius: 8 }}>
                      No parts found in shop stock
                    </div>
                  )}
                  {selectedPart && (
                    <div style={{ padding: "8px 12px", background: T.amberGlow, borderRadius: 8, fontSize: 12, color: T.t1, marginTop: 8, border: `1px solid ${T.amber}33` }}>
                      Selected: <strong>{selectedPart.part_name}</strong> — stock {selectedPart.stock_qty}, ₹{Number(selectedPart.selling_price).toFixed(2)} each
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input type="text" placeholder="Part / service description" value={customDesc} onChange={e => setCustomDesc(e.target.value)} style={{ ...inpStyle, marginBottom: 8 }} />
                  <input type="number" placeholder="Unit price (₹)" value={customPrice} min={0} onChange={e => setCustomPrice(e.target.value)} style={inpStyle} />
                  {(!customDesc.trim() || customPrice === "") && !addingItem && (
                    <div style={{ fontSize: 12, color: T.t3, marginTop: 6 }}>
                      {!customDesc.trim() && customPrice === "" ? "Enter a description and price to add" : !customDesc.trim() ? "Enter a description" : "Enter a price"}
                    </div>
                  )}
                </>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.t2, fontFamily: FONT.ui }}>Qty:</span>
                <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <button onClick={() => setAddQty(q => String(Math.max(1, parseInt(q || "1") - 1)))}
                    style={{ width: 36, height: 36, background: T.surfaceContainerLow, border: "none", fontSize: 18, cursor: "pointer", color: T.t1 }}>−</button>
                  <input type="number" value={addQty} min={1} onChange={e => setAddQty(e.target.value)}
                    style={{ width: 44, border: "none", background: T.surface, color: T.t1, fontWeight: 700, fontSize: 14, textAlign: "center", outline: "none", fontFamily: FONT.mono }} />
                  <button onClick={() => setAddQty(q => String(parseInt(q || "1") + 1))}
                    style={{ width: 36, height: 36, background: T.surfaceContainerLow, border: "none", fontSize: 18, cursor: "pointer", color: T.t1 }}>+</button>
                </div>
                <button onClick={addSelectedPart}
                  disabled={addingItem || (customMode ? (!customDesc.trim() || customPrice === "") : !selectedPart)}
                  style={{ flex: 1, padding: "9px", background: T.amber, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, opacity: addingItem || (customMode ? (!customDesc.trim() || customPrice === "") : !selectedPart) ? 0.5 : 1 }}>
                  {addingItem ? "Adding…" : "Add to Job"}
                </button>
                <button onClick={resetAddPart}
                  style={{ padding: "9px 12px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", color: T.t2, fontFamily: FONT.ui }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Part requests */}
          <SectionHeader title={`Shop Part Requests${partRequests.length > 0 ? ` (${partRequests.length})` : ""}`} />
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px", marginTop: 8 }}>
            {partRequests.length === 0 && (
              <div style={{ padding: "16px 0", textAlign: "center", color: T.t3, fontSize: 13, fontFamily: FONT.ui }}>No part requests yet</div>
            )}
            {partRequests.map((pr: any) => (
              <div key={pr.id} style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{pr.description}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: pr.status === "APPROVED" ? T.emeraldBg : pr.status === "REJECTED" ? "#FFEBEE" : T.amberGlow, color: pr.status === "APPROVED" ? T.emerald : pr.status === "REJECTED" ? T.crimson : T.amber }}>
                    {pr.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Qty: {pr.qty_requested}{pr.unit_price ? ` · ₹${Number(pr.unit_price).toFixed(2)}` : ""}</div>
              </div>
            ))}
            {!showRequestForm ? (
              <button onClick={() => setShowRequestForm(true)}
                style={{ width: "100%", padding: "12px 0", background: "transparent", border: "none", borderTop: partRequests.length > 0 ? `1px solid ${T.border}` : "none", cursor: "pointer", color: T.t2, fontSize: 13, fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <MSIcon name="add" size={16} /> Request a Part
              </button>
            ) : (
              <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <input type="text" placeholder="Part name / description" value={partDesc} onChange={e => setPartDesc(e.target.value)} style={inpStyle} />
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" placeholder="Qty" value={partQty} min={1} onChange={e => setPartQty(e.target.value)} style={{ ...inpStyle, width: 80 }} />
                  <input type="number" placeholder="Est. price ₹" value={partPrice} min={0} onChange={e => setPartPrice(e.target.value)} style={{ ...inpStyle, flex: 1 }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={submitPartRequest} disabled={savingRequest || !partDesc.trim()}
                    style={{ flex: 1, padding: "9px", background: T.amber, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, opacity: savingRequest || !partDesc.trim() ? 0.5 : 1 }}>
                    {savingRequest ? "Sending…" : "Send Request"}
                  </button>
                  <button onClick={() => { setShowRequestForm(false); setPartDesc(""); setPartQty("1"); setPartPrice(""); }}
                    style={{ padding: "9px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", color: T.t2, fontFamily: FONT.ui }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Invoice */}
          {(job.status === "QC_PASSED" || job.mechanic_invoice_id) && (
            <button onClick={generateInvoice} disabled={generatingInvoice || !!job.mechanic_invoice_id}
              style={{ width: "100%", marginTop: 16, padding: "13px", background: job.mechanic_invoice_id ? T.emeraldBg : T.emerald, color: job.mechanic_invoice_id ? T.emerald : "#fff", border: `1.5px solid ${T.emerald}`, borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: job.mechanic_invoice_id ? "not-allowed" : "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <MSIcon name="receipt_long" size={18} />
              {job.mechanic_invoice_id ? "Invoice Generated" : generatingInvoice ? "Generating…" : "Generate Invoice"}
            </button>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: CUSTOMER
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "customer" && (
        <div style={{ padding: "12px 16px 16px" }}>
          {/* Customer card */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: T.amberGlow, border: `2px solid ${T.amber}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: T.amber, fontFamily: FONT.display, flexShrink: 0 }}>
                {job.customer_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <div style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: T.t1 }}>{job.customer_name}</div>
                {job.customer_phone && <div style={{ fontFamily: FONT.mono, fontSize: 13, color: T.t3, marginTop: 3 }}>{job.customer_phone}</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {job.customer_phone && (
                <a href={`tel:${job.customer_phone}`} style={{ flex: 1, textDecoration: "none" }}>
                  <button style={{ width: "100%", padding: "11px", background: T.surfaceContainerLow, border: `1.5px solid ${T.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: FONT.ui, cursor: "pointer", color: T.t1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                    <MSIcon name="call" size={18} /> Call
                  </button>
                </a>
              )}
              <button
                onClick={() => {
                  const digits = String(job.customer_phone || "").replace(/\D/g, "");
                  const num = digits.startsWith("91") ? digits : `91${digits}`;
                  const msg = `Hi ${job.customer_name?.split(" ")[0] || "there"} 👋\n\nThis is an update regarding your ${job.vehicle_make} ${job.vehicle_model} (${job.vehicle_reg || ""}).\n\nCurrent status: *${STATUS_LABEL[job.status] || job.status}*\n\n- Redpiston Workshop 🔧`;
                  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
                }}
                style={{ flex: 2, padding: "11px", background: "#25D366", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: FONT.ui, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
              >
                <MSIcon name="chat" size={18} filled /> WhatsApp
              </button>
            </div>
          </div>

          {/* Call log */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <SectionHeader title={`Call Log${job.calls?.length > 0 ? ` (${job.calls.length})` : ""}`} />
            {!showCallForm && (
              <button onClick={() => setShowCallForm(true)}
                style={{ padding: "7px 14px", background: T.surfaceContainerLow, border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: FONT.ui, cursor: "pointer", color: T.t2, display: "flex", alignItems: "center", gap: 5 }}>
                <MSIcon name="add" size={15} /> Log Call
              </button>
            )}
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px", marginBottom: 16 }}>
            {!job.calls?.length && !showCallForm && (
              <div style={{ padding: "16px 0", textAlign: "center", color: T.t3, fontSize: 13, fontFamily: FONT.ui }}>No calls logged yet</div>
            )}
            {job.calls?.map((c: any, i: number) => (
              <div key={c.id} style={{ padding: "11px 0", borderBottom: i < job.calls.length - 1 ? `1px solid ${T.border}` : "none", display: "flex", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.outcome === "APPROVED" ? T.emerald : c.outcome === "REJECTED" ? T.crimson : "#B45309", flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{c.purpose.replace(/_/g, " ")}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: c.outcome === "APPROVED" ? T.emeraldBg : c.outcome === "REJECTED" ? "#FFEBEE" : T.amberGlow, color: c.outcome === "APPROVED" ? T.emerald : c.outcome === "REJECTED" ? T.crimson : T.amber }}>
                      {c.outcome}
                    </span>
                  </div>
                  {c.notes && <div style={{ fontSize: 12, color: T.t2, marginTop: 2, fontStyle: "italic" }}>{c.notes}</div>}
                  <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>{c.mechanic_name} · {new Date(c.created_at).toLocaleString("en-IN")}</div>
                </div>
              </div>
            ))}

            {showCallForm && (
              <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(["STATUS_UPDATE", "EXTRA_WORK_APPROVAL", "GENERAL"] as const).map(p => (
                    <button key={p} onClick={() => { setCallPurpose(p); setCallPartRequestId(""); }}
                      style={{ padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${callPurpose === p ? T.amber : T.border}`, background: callPurpose === p ? T.amberGlow : "transparent", color: callPurpose === p ? T.amber : T.t2, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, textAlign: "left" }}>
                      {p === "STATUS_UPDATE" ? "📢 Status Update" : p === "EXTRA_WORK_APPROVAL" ? "🔧 Extra Work Approval" : "💬 General"}
                    </button>
                  ))}
                </div>
                {callPurpose === "EXTRA_WORK_APPROVAL" && (
                  <select value={callPartRequestId} onChange={e => setCallPartRequestId(e.target.value)} style={inpStyle}>
                    <option value="">Which extra-work item?</option>
                    {partRequests.map((pr: any) => (
                      <option key={pr.id} value={pr.id}>{pr.description} x{pr.qty_requested}</option>
                    ))}
                  </select>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["APPROVED", "REJECTED", "NO_ANSWER", "DISCUSSED"] as const).map(o => (
                    <button key={o} onClick={() => setCallOutcome(o)}
                      style={{ flex: "1 1 auto", padding: "8px 10px", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${callOutcome === o ? T.amber : T.border}`, background: callOutcome === o ? T.amberGlow : "transparent", color: callOutcome === o ? T.amber : T.t3, fontSize: 11, fontWeight: 700, fontFamily: FONT.ui }}>
                      {o.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <textarea placeholder="Notes (optional)…" value={callNotes} onChange={e => setCallNotes(e.target.value)} rows={2}
                  style={{ ...inpStyle, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={logCall} disabled={savingCall || (callPurpose === "EXTRA_WORK_APPROVAL" && !callPartRequestId)}
                    style={{ flex: 1, padding: "9px", background: T.amber, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, opacity: savingCall || (callPurpose === "EXTRA_WORK_APPROVAL" && !callPartRequestId) ? 0.5 : 1 }}>
                    {savingCall ? "Saving…" : "Save & Prepare WhatsApp"}
                  </button>
                  <button onClick={() => { setShowCallForm(false); setCallNotes(""); setCallPartRequestId(""); }}
                    style={{ padding: "9px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", color: T.t2, fontFamily: FONT.ui }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp preview (after call log) */}
          {waPreview && (
            <div style={{ background: "#E8F5E9", border: "1.5px solid rgba(37,211,102,.35)", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MSIcon name="chat" size={18} filled />
                <span style={{ fontWeight: 700, fontSize: 13, color: "#075E54", fontFamily: FONT.ui }}>WhatsApp message ready</span>
              </div>
              <textarea value={waEditText} onChange={e => setWaEditText(e.target.value)} rows={4}
                style={{ ...inpStyle, borderColor: "rgba(37,211,102,.3)", resize: "vertical", marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={sendWhatsApp} disabled={!waEditText.trim() || !job?.customer_phone}
                  style={{ flex: 1, padding: "10px", background: "#25D366", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontFamily: FONT.ui, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: !waEditText.trim() || !job?.customer_phone ? 0.5 : 1 }}>
                  <MSIcon name="chat" size={16} filled /> Open WhatsApp
                </button>
                <button onClick={() => setWaPreview(null)}
                  style={{ padding: "10px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", color: T.t2, fontFamily: FONT.ui }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: MEDIA
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "media" && (
        <div style={{ padding: "12px 16px 16px" }}>
          {/* Stage selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {(["BEFORE", "DURING", "AFTER"] as const).map(s => (
              <button key={s} onClick={() => setPhotoStage(s)}
                style={{ flex: 1, padding: "8px", borderRadius: 10, border: `1.5px solid ${photoStage === s ? T.amber : T.border}`, background: photoStage === s ? T.amberGlow : "transparent", color: photoStage === s ? T.amber : T.t3, fontSize: 12, fontWeight: 700, fontFamily: FONT.ui, cursor: "pointer" }}>
                {s}
              </button>
            ))}
          </div>

          {/* Photo grid for selected stage */}
          {(() => {
            const stagePhotos = (job.photos || []).filter((p: any) => p.stage === photoStage);
            return (
              <>
                {stagePhotos.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 14 }}>
                    {stagePhotos.map((p: any) => (
                      <div key={p.id} style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden" }}>
                        <img src={p.url} alt={p.stage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "32px 0", textAlign: "center", color: T.t3, fontSize: 13, fontFamily: FONT.ui }}>
                    No {photoStage.toLowerCase()} photos yet
                  </div>
                )}
              </>
            );
          })()}

          {/* Upload button */}
          {!jobLocked && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhotoSelect} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
                style={{ width: "100%", padding: "13px", background: "transparent", border: `1.5px dashed ${T.border}`, borderRadius: 10, cursor: uploadingPhoto ? "not-allowed" : "pointer", color: T.t2, fontSize: 13, fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: uploadingPhoto ? 0.6 : 1 }}>
                <MSIcon name={uploadingPhoto ? "hourglass_empty" : "add_a_photo"} size={20} />
                {uploadingPhoto ? "Uploading…" : `Add ${photoStage.toLowerCase()} photo`}
              </button>
            </>
          )}

          {/* All stages summary */}
          {(["BEFORE", "DURING", "AFTER"] as const).filter(s => s !== photoStage).map(s => {
            const sp = (job.photos || []).filter((p: any) => p.stage === s);
            if (!sp.length) return null;
            return (
              <div key={s} style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>{s} ({sp.length})</div>
                <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
                  {sp.slice(0, 4).map((p: any) => (
                    <img key={p.id} src={p.url} alt={p.stage} style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: ACTIVITY
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "activity" && (
        <div style={{ padding: "12px 16px 16px" }}>
          {/* Timeline */}
          {job.timeline?.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              {job.timeline.map((t: any, i: number) => (
                <TimelineRow key={t.id} item={t} last={i === job.timeline.length - 1} />
              ))}
            </div>
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.t3, fontSize: 13, fontFamily: FONT.ui, marginBottom: 16 }}>No activity yet</div>
          )}

          {/* Add note */}
          <SectionHeader title="Add Note" />
          <div style={{ position: "relative", marginTop: 8 }}>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Type or speak a note visible to the workshop…"
              rows={3}
              style={{ ...inpStyle, paddingRight: 48, resize: "vertical", borderColor: listening ? T.sky : T.border }}
            />
            <button onClick={toggleVoice} title={listening ? "Stop listening" : "Speak note"}
              style={{ position: "absolute", top: 8, right: 8, background: listening ? T.amber : T.surfaceContainerLow, border: `1.5px solid ${listening ? T.amber : T.border}`, borderRadius: 8, padding: "6px", cursor: "pointer", color: listening ? "#fff" : T.t3 }}>
              <MSIcon name={listening ? "mic" : "mic_none"} size={18} />
            </button>
          </div>
          {!noteText.trim() && !savingNote && (
            <div style={{ fontSize: 12, color: T.t3, marginTop: 6, marginBottom: 4 }}>Type a note before saving</div>
          )}
          <button onClick={saveNote} disabled={savingNote || !noteText.trim()}
            style={{ marginTop: 6, width: "100%", padding: "12px", background: T.amber, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: savingNote || !noteText.trim() ? "not-allowed" : "pointer", opacity: savingNote || !noteText.trim() ? 0.5 : 1, fontSize: 14, fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <MSIcon name="save" size={18} />
            {savingNote ? "Saving…" : "Save Note"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Shared sub-components ───────────────────────────────────────────────────────

function InfoRow({ icon, label, value, iconColor = T.t3 }: { icon: string; label: string; value: string; iconColor?: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: `1px solid ${T.border}88`, alignItems: "flex-start" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 20, color: iconColor, marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontSize: 14, color: T.t1, marginTop: 2, fontWeight: 500, lineHeight: 1.4, wordBreak: "break-word", fontFamily: FONT.ui }}>{value}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 3, height: 12, background: T.amber, borderRadius: 2, flexShrink: 0 }} />
      {title}
    </div>
  );
}

function TimelineRow({ item, last }: { item: any; last: boolean }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: last ? "none" : `1px solid ${T.border}` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.amber, flexShrink: 0, marginTop: 4 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.t1, fontFamily: FONT.ui }}>
          {item.event?.replace(/_/g, " ")}
          {item.from_status && item.to_status && <span style={{ color: T.t3, fontWeight: 400 }}> {item.from_status} → {item.to_status}</span>}
        </div>
        {item.note && <div style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>{item.note}</div>}
        <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
          {item.actor_name} · {new Date(item.created_at).toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, icon, onClick, disabled = false, color = T.amber, bg }: {
  label: string; icon?: string; onClick: () => void; disabled?: boolean; color?: string; bg?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "14px 16px", borderRadius: 12,
        background: disabled ? T.surfaceContainerHigh : (bg || color),
        color: disabled ? T.t3 : bg ? color : "#fff",
        border: disabled ? `1.5px solid ${T.border}` : bg ? `1.5px solid ${color}44` : "none",
        fontWeight: 700, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        fontFamily: FONT.ui, minHeight: 52,
        boxShadow: !disabled && !bg ? `0 2px 10px ${color}44` : "none",
      } as React.CSSProperties}
    >
      {icon && <span className="material-symbols-outlined" style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>}
      {label}
    </button>
  );
}

const inpStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`,
  background: T.surface, color: T.t1, fontFamily: FONT.ui, fontSize: 13,
  outline: "none", boxSizing: "border-box",
};
