import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";
import { T, FONT } from "../../theme";

function useSpeechInput(setter: React.Dispatch<React.SetStateAction<string>>) {
  const ref = useRef<any>(null);
  const [active, setActive] = useState(false);
  function toggle() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported. Use Chrome on Android."); return; }
    if (active) { ref.current?.stop(); setActive(false); return; }
    const r = new SR();
    r.lang = "en-IN";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e: any) => {
      const text = Array.from(e.results).map((res: any) => res[0].transcript).join(" ");
      setter(prev => (prev ? prev + " " : "") + text);
    };
    r.onerror = () => setActive(false);
    r.onend = () => setActive(false);
    r.start();
    ref.current = r;
    setActive(true);
  }
  return { active, toggle };
}

const PRIORITIES = [
  { value: "LOW",    label: "Low",    color: T.t3 },
  { value: "NORMAL", label: "Normal", color: T.t2 },
  { value: "HIGH",   label: "High",   color: "#F59E0B" },
  { value: "URGENT", label: "Urgent", color: T.crimson },
];

const FUELS = ["Petrol", "Diesel", "Electric", "CNG", "Hybrid"];

function MSIcon({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }}>{name}</span>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required && <span style={{ color: T.crimson }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  border: `1.5px solid ${T.border}`, background: T.surface,
  fontSize: 15, color: T.t1, fontFamily: FONT.ui,
  outline: "none", boxSizing: "border-box",
};

export default function CreateJobPage() {
  const navigate = useNavigate();
  const phoneRef = useRef<HTMLInputElement>(null);

  // Form state
  const [customerName, setCustomerName]   = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicleMake, setVehicleMake]     = useState("");
  const [vehicleModel, setVehicleModel]   = useState("");
  const [vehicleYear, setVehicleYear]     = useState("");
  const [vehicleReg, setVehicleReg]       = useState("");
  const [vehicleFuel, setVehicleFuel]     = useState("");
  const [odometerIn, setOdometerIn]       = useState("");
  const [complaint, setComplaint]         = useState("");
  const [priority, setPriority]           = useState("NORMAL");

  // Customer search
  const [suggestions, setSuggestions]   = useState<{ customer_name: string; customer_phone: string }[]>([]);
  const [searching, setSearching]       = useState(false);

  const complaintVoice = useSpeechInput(setComplaint);

  // Team members for assignment (independent mechanics only)
  const [teamMembers, setTeamMembers] = useState<{ user_id: number; name: string }[]>([]);
  const [assignedTo, setAssignedTo]   = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  // Load team members once
  React.useEffect(() => {
    api.get("/api/mechanic/team")
      .then((r: any) => setTeamMembers(r.data || []))
      .catch(() => {});
  }, []);

  async function searchCustomer(phone: string) {
    if (phone.length < 4) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const r = await api.get(`/api/mechanic/customers/search?phone=${encodeURIComponent(phone)}`) as any;
      setSuggestions(r.data || []);
    } catch { setSuggestions([]); }
    finally { setSearching(false); }
  }

  function pickSuggestion(s: { customer_name: string; customer_phone: string }) {
    setCustomerName(s.customer_name);
    setCustomerPhone(s.customer_phone);
    setSuggestions([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim() || !vehicleMake.trim() || !vehicleModel.trim()) {
      setError("Customer name, vehicle make and model are required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const r = await api.post("/api/mechanic/jobs", {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleYear: vehicleYear || undefined,
        vehicleReg: vehicleReg.trim() || undefined,
        vehicleFuel: vehicleFuel || undefined,
        odometerIn: odometerIn || undefined,
        complaint: complaint.trim() || undefined,
        priority,
        assignedTo: assignedTo || undefined,
      }) as any;
      navigate(`/mechanic/jobs/${r.data.jobId}`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to create job. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="page-in rp-page-pad" style={{ display: "flex", flexDirection: "column", gap: 0, paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: T.t2 }}
        >
          <MSIcon name="arrow_back" size={24} />
        </button>
        <div>
          <h1 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: T.t1, lineHeight: 1.2 }}>New Job Card</h1>
          <p style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>Self-assigned to you</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Customer ── */}
        <section style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <MSIcon name="person" size={18} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.t2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Customer</span>
          </div>

          <Field label="Phone" >
            <div style={{ position: "relative" }}>
              <input
                ref={phoneRef}
                type="tel"
                value={customerPhone}
                onChange={e => { setCustomerPhone(e.target.value); searchCustomer(e.target.value); }}
                placeholder="Search or enter phone..."
                style={INPUT_STYLE}
              />
              {searching && (
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: T.t3, fontSize: 12 }}>
                  searching…
                </span>
              )}
              {suggestions.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)", marginTop: 4, overflow: "hidden",
                }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickSuggestion(s)}
                      style={{
                        width: "100%", padding: "12px 14px", border: "none", background: "none",
                        textAlign: "left", cursor: "pointer", borderBottom: i < suggestions.length - 1 ? `1px solid ${T.border}` : "none",
                      }}
                    >
                      <div style={{ fontWeight: 600, color: T.t1, fontSize: 14 }}>{s.customer_name}</div>
                      <div style={{ color: T.t3, fontSize: 12 }}>{s.customer_phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="Name" required>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Customer full name"
              style={INPUT_STYLE}
              required
            />
          </Field>
        </section>

        {/* ── Vehicle ── */}
        <section style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <MSIcon name="directions_car" size={18} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.t2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Vehicle</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Make" required>
              <input type="text" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="e.g. Maruti" style={INPUT_STYLE} required />
            </Field>
            <Field label="Model" required>
              <input type="text" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="e.g. Swift" style={INPUT_STYLE} required />
            </Field>
            <Field label="Year">
              <input type="number" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="2020" min={1980} max={2030} style={INPUT_STYLE} />
            </Field>
            <Field label="Reg No.">
              <input type="text" value={vehicleReg} onChange={e => setVehicleReg(e.target.value.toUpperCase())} placeholder="KA01AB1234" style={{ ...INPUT_STYLE, fontFamily: FONT.mono }} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Fuel">
              <select value={vehicleFuel} onChange={e => setVehicleFuel(e.target.value)} style={{ ...INPUT_STYLE, appearance: "none" }}>
                <option value="">Select…</option>
                {FUELS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Odometer (km)">
              <input type="number" value={odometerIn} onChange={e => setOdometerIn(e.target.value)} placeholder="45000" min={0} style={INPUT_STYLE} />
            </Field>
          </div>
        </section>

        {/* ── Job ── */}
        <section style={{ background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <MSIcon name="build" size={18} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.t2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Job Details</span>
          </div>

          <Field label="Customer Complaint">
            <div style={{ position: "relative" }}>
              <textarea
                value={complaint}
                onChange={e => setComplaint(e.target.value)}
                placeholder="Describe the issue or tap mic to speak…"
                rows={3}
                style={{ ...INPUT_STYLE, resize: "none", lineHeight: 1.5, paddingRight: 44,
                  border: complaintVoice.active ? `1.5px solid ${T.sky}` : `1.5px solid ${T.border}` }}
              />
              <button
                type="button"
                onClick={complaintVoice.toggle}
                title={complaintVoice.active ? "Stop" : "Speak"}
                style={{
                  position: "absolute", top: 10, right: 10,
                  background: complaintVoice.active ? T.sky : "transparent",
                  border: `1px solid ${complaintVoice.active ? T.sky : T.border}`,
                  borderRadius: 6, padding: 5, cursor: "pointer",
                  color: complaintVoice.active ? "#fff" : T.t3, lineHeight: 1,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, lineHeight: 1 }}>
                  {complaintVoice.active ? "mic" : "mic_none"}
                </span>
              </button>
            </div>
          </Field>

          <Field label="Priority">
            <div style={{ display: "flex", gap: 8 }}>
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  style={{
                    flex: 1, padding: "10px 4px", borderRadius: 8, cursor: "pointer",
                    border: priority === p.value ? `2px solid ${p.color}` : `1.5px solid ${T.border}`,
                    background: priority === p.value ? p.color + "18" : T.surfaceContainerLow,
                    color: priority === p.value ? p.color : T.t3,
                    fontWeight: 700, fontSize: 12, fontFamily: FONT.ui,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          {teamMembers.length > 0 && (
            <Field label="Assign To">
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                style={{ ...INPUT_STYLE, appearance: "none" }}
              >
                <option value="">Myself</option>
                {teamMembers.map(m => (
                  <option key={m.user_id} value={String(m.user_id)}>{m.name}</option>
                ))}
              </select>
            </Field>
          )}
        </section>

        {/* Error */}
        {error && (
          <div style={{ background: "#FFDAD6", border: `1px solid ${T.crimson}`, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: T.crimson }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%", padding: 16, background: submitting ? T.surfaceContainerHigh : T.amber,
            color: submitting ? T.t3 : "#fff", border: "none", borderRadius: 12,
            fontWeight: 700, fontSize: 16, cursor: submitting ? "not-allowed" : "pointer",
            fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: submitting ? "none" : "0 4px 16px rgba(139,30,30,0.28)",
          }}
        >
          <MSIcon name={submitting ? "hourglass_empty" : "add_circle"} size={20} />
          {submitting ? "Creating…" : "Create Job Card"}
        </button>

      </form>
    </div>
  );
}
