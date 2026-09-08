import { useState, useEffect, useCallback } from "react";
import { T, FONT } from "../theme";
import { useAppCtx } from "../AppCtx";
import { Btn, Modal, Field, Input, Select } from "../components/ui";
import { ImagePicker } from "../components/ImagePicker";
import {
  getMyPortfolio, createPortfolioItem, updatePortfolioItem, deletePortfolioItem,
  type PortfolioItem, type PortfolioItemPayload,
} from "../api/portfolio";
import { getMyServices, type Service } from "../api/services";

interface FormState {
  serviceId: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  vehicleLabel: string;
  description: string;
  priceRangeLabel: string;
  workDate: string;
}

const EMPTY_FORM: FormState = {
  serviceId: "", beforeImageUrl: "", afterImageUrl: "",
  vehicleLabel: "", description: "", priceRangeLabel: "", workDate: "",
};

function PortfolioFormModal({ open, onClose, editing, services, onSaved, toast }: {
  open: boolean; onClose: () => void; editing: PortfolioItem | null; services: Service[]; onSaved: () => void; toast: (m: string, t?: string) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [imagesInvalid, setImagesInvalid] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        serviceId: editing.serviceId != null ? String(editing.serviceId) : "",
        beforeImageUrl: editing.beforeImageUrl,
        afterImageUrl: editing.afterImageUrl,
        vehicleLabel: editing.vehicleLabel || "",
        description: editing.description || "",
        priceRangeLabel: editing.priceRangeLabel || "",
        workDate: editing.workDate ? editing.workDate.slice(0, 10) : "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setImagesInvalid(false);
  }, [open, editing]);

  const save = async () => {
    if (!form.beforeImageUrl || !form.afterImageUrl) { setImagesInvalid(true); return; }
    setSaving(true);
    try {
      const payload: PortfolioItemPayload = {
        serviceId: form.serviceId ? parseInt(form.serviceId, 10) : null,
        beforeImageUrl: form.beforeImageUrl,
        afterImageUrl: form.afterImageUrl,
        vehicleLabel: form.vehicleLabel.trim() || null,
        description: form.description.trim() || null,
        priceRangeLabel: form.priceRangeLabel.trim() || null,
        workDate: form.workDate || null,
      };
      if (editing) {
        await updatePortfolioItem(editing.id, payload);
        toast("Portfolio item updated", "success");
      } else {
        await createPortfolioItem(payload);
        toast("Added to portfolio", "success");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e?.message || "Could not save portfolio item", "error");
    } finally {
      setSaving(false);
    }
  };

  const serviceOptions = [{ value: "", label: "Not linked to a service" }, ...services.map(s => ({ value: String(s.id), label: s.name }))];

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Work Sample" : "Add Work Sample"} width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ImagePicker label="Before photo" url={form.beforeImageUrl} onChange={v => { setForm(f => ({ ...f, beforeImageUrl: v })); setImagesInvalid(false); }} folder="portfolio" size={88} />
          <ImagePicker label="After photo" url={form.afterImageUrl} onChange={v => { setForm(f => ({ ...f, afterImageUrl: v })); setImagesInvalid(false); }} folder="portfolio" size={88} />
        </div>
        {imagesInvalid && <div style={{ fontSize: 12, color: T.crimson, fontWeight: 600 }}>↑ Both before and after photos are required</div>}

        <Field label="Vehicle">
          <Input value={form.vehicleLabel} onChange={v => setForm(f => ({ ...f, vehicleLabel: v }))} placeholder="e.g. BMW 3 Series" />
        </Field>

        <Field label="Linked service">
          <Select value={form.serviceId} onChange={v => setForm(f => ({ ...f, serviceId: v }))} options={serviceOptions} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Starting price shown">
            <Input value={form.priceRangeLabel} onChange={v => setForm(f => ({ ...f, priceRangeLabel: v }))} placeholder="e.g. ₹18,000" />
          </Field>
          <Field label="Work date">
            <Input type="date" value={form.workDate} onChange={v => setForm(f => ({ ...f, workDate: v }))} />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="What was done, products used, duration..."
            style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "11px 14px", fontSize: 14, outline: "none", fontFamily: FONT.ui, resize: "vertical" }}
          />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="amber" loading={saving} onClick={save}>{editing ? "Save changes" : "Add to portfolio"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

export function PortfolioPage() {
  const { toast } = useAppCtx();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getMyPortfolio(), getMyServices()])
      .then(([itemsRes, servicesRes]) => {
        setItems(Array.isArray(itemsRes?.items) ? itemsRes.items : []);
        setServices(Array.isArray(servicesRes?.services) ? servicesRes.services.filter(s => s.active) : []);
      })
      .catch((e: any) => toast(e?.message || "Could not load portfolio", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (item: PortfolioItem) => { setEditing(item); setModalOpen(true); };

  const remove = async (item: PortfolioItem) => {
    if (!window.confirm("Remove this work sample from your storefront?")) return;
    setBusyId(item.id);
    try {
      await deletePortfolioItem(item.id);
      toast("Removed", "success");
      load();
    } catch (e: any) {
      toast(e?.message || "Could not remove item", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.t1, fontFamily: FONT.display, margin: 0 }}>Portfolio</h1>
          <p style={{ fontSize: 13, color: T.t3, margin: "4px 0 0" }}>Before/after photos shown on your public storefront.</p>
        </div>
        <Btn variant="amber" onClick={openCreate}>+ Add Work Sample</Btn>
      </div>

      {loading ? (
        <div style={{ color: T.t3, fontSize: 13, padding: "20px 0" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: T.t3 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📷</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t2 }}>No work samples yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Add before/after photos to build customer trust.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: 140 }}>
                <img src={item.beforeImageUrl} alt="Before" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <img src={item.afterImageUrl} alt="After" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{item.vehicleLabel || "Vehicle not specified"}</div>
                {item.service && <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{item.service.name}</div>}
                {item.priceRangeLabel && <div style={{ fontSize: 13, fontWeight: 600, color: T.amber, marginTop: 6 }}>Starting {item.priceRangeLabel}</div>}
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <Btn variant="ghost" size="xs" onClick={() => openEdit(item)}>Edit</Btn>
                  <Btn variant="ghost" size="xs" loading={busyId === item.id} onClick={() => remove(item)}>Remove</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PortfolioFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} services={services} onSaved={load} toast={toast} />
    </div>
  );
}
