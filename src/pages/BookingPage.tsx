import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { T, FONT } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn, Field, Input, Select } from "../components/ui";
import { getService, type Service } from "../api/services";
import { defaultCarPhoto, hideOnError } from "../utils/defaultImages";
import { getMyVehicles, addMyVehicle, type CustomerVehicle } from "../api/customerVehicles";
import { getAvailability, createBooking } from "../api/bookings";

const VEHICLE_CATEGORIES = ["HATCHBACK", "SEDAN", "SUV", "LUXURY"];

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function AddVehicleInline({ onAdded, toast }: { onAdded: (v: CustomerVehicle) => void; toast: (m: string, t?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [saving, setSaving] = useState(false);

  if (!open) return <Btn variant="subtle" size="sm" onClick={() => setOpen(true)}>+ Add a vehicle</Btn>;

  const save = async () => {
    if (!make.trim() || !model.trim() || !year) { toast("Make, model and year are required", "error"); return; }
    setSaving(true);
    try {
      const res = await addMyVehicle({ make: make.trim(), model: model.trim(), year: parseInt(year, 10) });
      onAdded(res.data);
      setOpen(false); setMake(""); setModel("");
    } catch (e: any) {
      toast(e?.message || "Could not add vehicle", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 8 }}>
      <Field label="Make"><Input value={make} onChange={setMake} placeholder="Honda" /></Field>
      <Field label="Model"><Input value={model} onChange={setModel} placeholder="City" /></Field>
      <Field label="Year"><Input type="number" value={year} onChange={setYear} style={{ maxWidth: 100 }} /></Field>
      <Btn variant="amber" size="sm" loading={saving} onClick={save}>Save</Btn>
      <Btn variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Btn>
    </div>
  );
}

export function BookingPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { toast, currentUser } = useAppCtx();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [vehicleCategory, setVehicleCategory] = useState<string>("");
  const [packageId, setPackageId] = useState<string>("");
  const [addonIds, setAddonIds] = useState<number[]>([]);

  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) return;
    Promise.all([getService(serviceId), getMyVehicles()])
      .then(([svcRes, vehRes]) => {
        setService(svcRes.service);
        const vs = vehRes.data || [];
        setVehicles(vs);
        const def = vs.find(v => v.isDefault) || vs[0];
        if (def) setVehicleId(String(def.id));
      })
      .catch((e: any) => setLoadError(e?.message || "Could not load this service"))
      .finally(() => setLoading(false));
  }, [serviceId]);

  const loadSlots = useCallback(() => {
    if (!service) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    getAvailability(service.shopId, service.id, date)
      .then(res => setSlots(res.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [service, date]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  if (loading) return <div style={{ padding: 40, color: T.t3, fontFamily: FONT.ui }}>Loading…</div>;
  if (loadError || !service) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: FONT.ui }}>
        <div style={{ fontSize: 14, color: T.crimson, fontWeight: 600 }}>{loadError || "Service not found"}</div>
        <Link to="/services" style={{ color: T.amber, fontSize: 13 }}>← Back to search</Link>
      </div>
    );
  }
  if (service.pricingType === "QUOTE_REQUIRED") {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: FONT.ui }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.t1 }}>This service needs a custom quote</div>
        <p style={{ fontSize: 13, color: T.t3, marginTop: 8 }}>Contact the shop directly to discuss pricing.</p>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: FONT.ui, textAlign: "center", padding: 20 }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>Booking requested</div>
        <div style={{ fontSize: 13, color: T.t3 }}>#{confirmed} — the shop will confirm shortly. Pay at the shop when the service is done.</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Btn variant="amber" onClick={() => navigate("/bookings")}>View my bookings</Btn>
          <Btn variant="ghost" onClick={() => navigate("/services")}>Browse more services</Btn>
        </div>
      </div>
    );
  }

  const selectedPackage = service.packages.find(p => String(p.id) === packageId) || null;
  const selectedVehiclePricing = service.pricingType === "VEHICLE_DEPENDENT"
    ? service.vehiclePricing.find(v => v.vehicleCategory === vehicleCategory) || null
    : null;
  const basePrice = selectedPackage ? selectedPackage.price : (selectedVehiclePricing ? selectedVehiclePricing.price : service.basePrice);
  const selectedAddons = service.addons.filter(a => addonIds.includes(a.id));
  const addonsTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
  const subtotal = (basePrice || 0) + addonsTotal;
  const gstAmount = Math.round(subtotal * service.gstPercent) / 100;
  const estimatedTotal = Math.round(subtotal + gstAmount);

  const toggleAddon = (id: number) => setAddonIds(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);

  const canSubmit = !!selectedSlot && (service.pricingType !== "VEHICLE_DEPENDENT" || !!vehicleCategory) && basePrice != null;

  const submit = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await createBooking({
        shopId: service.shopId, serviceId: service.id,
        packageId: selectedPackage?.id || undefined,
        addonIds: addonIds.length ? addonIds : undefined,
        vehicleId: vehicleId ? parseInt(vehicleId, 10) : undefined,
        vehicleCategory: service.pricingType === "VEHICLE_DEPENDENT" ? vehicleCategory : undefined,
        scheduledDate: date, scheduledStartTime: selectedSlot,
        notes: notes.trim() || undefined,
      });
      setConfirmed(res.booking.bookingNumber);
    } catch (e: any) {
      toast(e?.message || "Could not create booking — the slot may have just been taken", "error");
      loadSlots();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: FONT.ui, minHeight: "100vh", background: T.bg }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 60px" }}>
        <div style={{ width: "100%", height: 160, borderRadius: 14, overflow: "hidden", position: "relative", background: `linear-gradient(135deg, ${T.surface}, ${T.border})`, marginBottom: 16 }}>
          <img
            src={service.images?.[0] || defaultCarPhoto(service.id)}
            alt={service.name}
            onError={hideOnError}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: "0 0 4px" }}>Book {service.name}</h1>
        <p style={{ fontSize: 13, color: T.t3, margin: "0 0 24px" }}>{currentUser?.name ? `Booking as ${currentUser.name}` : ""}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {vehicles.length > 0 && (
            <Field label="Vehicle">
              <Select
                value={vehicleId}
                onChange={setVehicleId}
                options={[{ value: "", label: "No vehicle selected" }, ...vehicles.map(v => ({ value: String(v.id), label: `${v.make} ${v.model} (${v.year})${v.registrationNo ? ` — ${v.registrationNo}` : ""}` }))]}
              />
            </Field>
          )}
          <AddVehicleInline toast={toast} onAdded={v => { setVehicles(cur => [...cur, v]); setVehicleId(String(v.id)); }} />

          {service.pricingType === "VEHICLE_DEPENDENT" && (
            <Field label="Vehicle type" required>
              <Select value={vehicleCategory} onChange={setVehicleCategory} options={[{ value: "", label: "Select vehicle type" }, ...VEHICLE_CATEGORIES.map(c => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))]} />
            </Field>
          )}

          {service.packages.length > 0 && (
            <Field label="Package">
              <Select value={packageId} onChange={setPackageId} options={[{ value: "", label: `Standard — ₹${service.basePrice?.toLocaleString("en-IN")}` }, ...service.packages.map(p => ({ value: String(p.id), label: `${p.name} — ₹${p.price.toLocaleString("en-IN")}` }))]} />
            </Field>
          )}

          {service.addons.filter(a => a.active).length > 0 && (
            <Field label="Add-ons">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {service.addons.filter(a => a.active).map(a => (
                  <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.t2 }}>
                    <input type="checkbox" checked={addonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} />
                    {a.name} — ₹{a.price.toLocaleString("en-IN")}
                  </label>
                ))}
              </div>
            </Field>
          )}

          <Field label="Date" required>
            <Input type="date" value={date} min={todayISO()} onChange={setDate} />
          </Field>

          <Field label="Time slot" required>
            {slotsLoading ? (
              <div style={{ fontSize: 13, color: T.t3 }}>Loading slots…</div>
            ) : slots.length === 0 ? (
              <div style={{ fontSize: 13, color: T.t3 }}>No slots available this day — try another date.</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {slots.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSlot(s)}
                    style={{
                      fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${selectedSlot === s ? T.amber : T.border}`,
                      background: selectedSlot === s ? T.amber : "transparent",
                      color: selectedSlot === s ? "#fff" : T.t2,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: FONT.ui, resize: "vertical" }}
            />
          </Field>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.t2, marginBottom: 6 }}>
              <span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.t3, marginBottom: 10 }}>
              <span>GST ({service.gstPercent}%)</span><span>₹{gstAmount.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, color: T.t1, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
              <span>Estimated total</span><span>₹{estimatedTotal.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 6 }}>Pay at the shop after service — no online payment needed.</div>
          </div>

          <Btn variant="amber" full disabled={!canSubmit} loading={submitting} onClick={submit}>Confirm Booking</Btn>
        </div>
      </div>
    </div>
  );
}
