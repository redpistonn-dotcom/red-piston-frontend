import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T, FONT } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn, DataTable, TC, TCMono, Modal, Field, Input, Select, type Column } from "../components/ui";
import {
  getMyServices, createService, updateService, deactivateService,
  type Service, type PricingType, type VehicleCategory,
  type ServicePackage, type ServiceAddon, type ServiceVehiclePricing,
} from "../api/services";

const PRICING_TYPE_OPTIONS: { value: PricingType; label: string }[] = [
  { value: "FIXED", label: "Fixed price" },
  { value: "STARTING_FROM", label: "Starting from" },
  { value: "VEHICLE_DEPENDENT", label: "Price by vehicle type" },
  { value: "QUOTE_REQUIRED", label: "Quote on request" },
];
const VEHICLE_CATEGORIES: VehicleCategory[] = ["HATCHBACK", "SEDAN", "SUV", "LUXURY"];

const COLUMNS: Column[] = [
  { key: "name", label: "Service", width: 200 },
  { key: "category", label: "Category", width: 130 },
  { key: "pricing", label: "Pricing", width: 160 },
  { key: "duration", label: "Duration", width: 100 },
  { key: "status", label: "Status", width: 90 },
  { key: "actions", label: "Actions", width: 140 },
];

function formatPrice(s: Service): string {
  if (s.pricingType === "QUOTE_REQUIRED") return "Quote on request";
  if (s.pricingType === "VEHICLE_DEPENDENT") {
    if (!s.vehiclePricing.length) return "Not set";
    const min = Math.min(...s.vehiclePricing.map(v => v.price));
    return `From ₹${min.toLocaleString("en-IN")}`;
  }
  if (s.basePrice == null) return "Not set";
  return s.pricingType === "STARTING_FROM"
    ? `₹${s.basePrice.toLocaleString("en-IN")}+`
    : `₹${s.basePrice.toLocaleString("en-IN")}`;
}

interface FormState {
  name: string;
  category: string;
  description: string;
  pricingType: PricingType;
  basePrice: string;
  durationMinutes: string;
  gstPercent: string;
  packages: ServicePackage[];
  addons: ServiceAddon[];
  vehiclePricing: ServiceVehiclePricing[];
}

const EMPTY_FORM: FormState = {
  name: "", category: "", description: "", pricingType: "FIXED",
  basePrice: "", durationMinutes: "", gstPercent: "18",
  packages: [], addons: [],
  vehiclePricing: VEHICLE_CATEGORIES.map(vehicleCategory => ({ vehicleCategory, price: 0 })),
};

function ServiceFormModal({ open, onClose, editing, onSaved, toast }: {
  open: boolean; onClose: () => void; editing: Service | null; onSaved: () => void; toast: (m: string, t?: string) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [nameInvalid, setNameInvalid] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        category: editing.category || "",
        description: editing.description || "",
        pricingType: editing.pricingType,
        basePrice: editing.basePrice != null ? String(editing.basePrice) : "",
        durationMinutes: editing.durationMinutes != null ? String(editing.durationMinutes) : "",
        gstPercent: String(editing.gstPercent ?? 18),
        packages: editing.packages.length ? editing.packages : [],
        addons: editing.addons.length ? editing.addons : [],
        vehiclePricing: VEHICLE_CATEGORIES.map(vehicleCategory => {
          const existing = editing.vehiclePricing.find(v => v.vehicleCategory === vehicleCategory);
          return { vehicleCategory, price: existing?.price ?? 0 };
        }),
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setNameInvalid(false);
  }, [open, editing]);

  const save = async () => {
    if (!form.name.trim()) { setNameInvalid(true); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        pricingType: form.pricingType,
        basePrice: form.basePrice ? Number(form.basePrice) : null,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : null,
        gstPercent: form.gstPercent ? Number(form.gstPercent) : 18,
        packages: form.packages.filter(p => p.name.trim() && p.price >= 0),
        addons: form.addons.filter(a => a.name.trim() && a.price >= 0),
        vehiclePricing: form.pricingType === "VEHICLE_DEPENDENT" ? form.vehiclePricing : [],
      };
      if (editing) {
        await updateService(editing.id, payload);
        toast(`${payload.name} updated`, "success");
      } else {
        await createService(payload);
        toast(`${payload.name} added`, "success");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e?.message || "Could not save service", "error");
    } finally {
      setSaving(false);
    }
  };

  const addPackage = () => setForm(f => ({ ...f, packages: [...f.packages, { name: "", price: 0, sortOrder: f.packages.length }] }));
  const addAddon = () => setForm(f => ({ ...f, addons: [...f.addons, { name: "", price: 0, active: true }] }));

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Service" : "New Service"} width={620}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="Name" required error={nameInvalid ? "Service name is required" : undefined}>
          <Input value={form.name} onChange={v => { setForm(f => ({ ...f, name: v })); setNameInvalid(false); }} placeholder="e.g. Ceramic Coating" invalid={nameInvalid} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Category">
            <Input value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} placeholder="e.g. Detailing" />
          </Field>
          <Field label="Duration (minutes)">
            <Input type="number" value={form.durationMinutes} onChange={v => setForm(f => ({ ...f, durationMinutes: v }))} placeholder="e.g. 480" />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: FONT.ui, resize: "vertical" }}
          />
        </Field>

        <Field label="Pricing type" required>
          <Select value={form.pricingType} onChange={v => setForm(f => ({ ...f, pricingType: v as PricingType }))} options={PRICING_TYPE_OPTIONS} />
        </Field>

        {(form.pricingType === "FIXED" || form.pricingType === "STARTING_FROM") && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={form.pricingType === "STARTING_FROM" ? "Starting price (₹)" : "Price (₹)"} required>
              <Input type="number" value={form.basePrice} onChange={v => setForm(f => ({ ...f, basePrice: v }))} placeholder="8999" />
            </Field>
            <Field label="GST %">
              <Input type="number" value={form.gstPercent} onChange={v => setForm(f => ({ ...f, gstPercent: v }))} />
            </Field>
          </div>
        )}

        {form.pricingType === "VEHICLE_DEPENDENT" && (
          <Field label="Price by vehicle type (₹)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {form.vehiclePricing.map((vp, i) => (
                <div key={vp.vehicleCategory} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: T.t3, width: 74, flexShrink: 0 }}>{vp.vehicleCategory}</span>
                  <Input type="number" value={vp.price} onChange={v => setForm(f => {
                    const next = [...f.vehiclePricing]; next[i] = { ...next[i], price: Number(v) || 0 };
                    return { ...f, vehiclePricing: next };
                  })} />
                </div>
              ))}
            </div>
          </Field>
        )}

        <Field label="Packages (optional tiers, e.g. Basic / Premium)">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {form.packages.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <Input value={p.name} onChange={v => setForm(f => { const next = [...f.packages]; next[i] = { ...next[i], name: v }; return { ...f, packages: next }; })} placeholder="Package name" />
                <Input type="number" value={p.price} onChange={v => setForm(f => { const next = [...f.packages]; next[i] = { ...next[i], price: Number(v) || 0 }; return { ...f, packages: next }; })} placeholder="Price" style={{ maxWidth: 120 }} />
                <Btn variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, packages: f.packages.filter((_, j) => j !== i) }))}>Remove</Btn>
              </div>
            ))}
            <Btn variant="subtle" size="sm" onClick={addPackage}>+ Add package</Btn>
          </div>
        </Field>

        <Field label="Add-ons (optional extras)">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {form.addons.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <Input value={a.name} onChange={v => setForm(f => { const next = [...f.addons]; next[i] = { ...next[i], name: v }; return { ...f, addons: next }; })} placeholder="Add-on name" />
                <Input type="number" value={a.price} onChange={v => setForm(f => { const next = [...f.addons]; next[i] = { ...next[i], price: Number(v) || 0 }; return { ...f, addons: next }; })} placeholder="Price" style={{ maxWidth: 120 }} />
                <Btn variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, addons: f.addons.filter((_, j) => j !== i) }))}>Remove</Btn>
              </div>
            ))}
            <Btn variant="subtle" size="sm" onClick={addAddon}>+ Add add-on</Btn>
          </div>
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="amber" loading={saving} onClick={save}>{editing ? "Save changes" : "Create service"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

export function ServicesPage() {
  const { toast } = useAppCtx();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getMyServices()
      .then(data => setServices(Array.isArray(data?.services) ? data.services : []))
      .catch((e: any) => setError(e?.message || "Could not load services"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setModalOpen(true); };

  const toggleActive = async (s: Service) => {
    setBusyId(s.id);
    try {
      if (s.active) {
        await deactivateService(s.id);
        toast(`${s.name} deactivated`, "success");
      } else {
        await updateService(s.id, { active: true });
        toast(`${s.name} reactivated`, "success");
      }
      load();
    } catch (e: any) {
      toast(e?.message || "Could not update service", "error");
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = services.filter(s => s.active).length;

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>Services</h1>
          <p style={{ fontSize: 13, color: T.t3, margin: "4px 0 0" }}>{activeCount} active service{activeCount !== 1 ? "s" : ""} listed on your storefront.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={() => navigate("/shop/storefront-settings")}>Storefront settings</Btn>
          <Btn variant="amber" onClick={openCreate}>+ New Service</Btn>
        </div>
      </div>

      <DataTable
        columns={COLUMNS}
        rows={services}
        loading={loading}
        error={error}
        empty="No services yet — add your first one to start showing up on your storefront"
        emptyIcon="🧰"
        renderRow={(row: any) => {
          const s = row as Service;
          return (
            <tr key={s.id} className="trow">
              <td style={TC}>{s.name}</td>
              <td style={TC}>{s.category || "—"}</td>
              <td style={TCMono}>{formatPrice(s)}</td>
              <td style={TC}>{s.durationMinutes ? `${Math.round(s.durationMinutes / 60)}h` : "—"}</td>
              <td style={TC}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
                  background: s.active ? T.emeraldBg : T.surfaceContainer,
                  color: s.active ? T.emerald : T.t3,
                }}>
                  {s.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td style={TC}>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="ghost" size="xs" onClick={() => openEdit(s)}>Edit</Btn>
                  <Btn variant={s.active ? "ghost" : "emerald"} size="xs" loading={busyId === s.id} onClick={() => toggleActive(s)}>
                    {s.active ? "Deactivate" : "Reactivate"}
                  </Btn>
                </div>
              </td>
            </tr>
          );
        }}
      />

      <ServiceFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} onSaved={load} toast={toast} />
    </div>
  );
}
