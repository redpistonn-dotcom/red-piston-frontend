import { useState, useEffect, useMemo } from "react";
import { T, FONT } from "../../theme";
import {
  fetchVehicleManufacturers,
  fetchVehicleModelsByManufacturer,
  fetchVehicleVariants,
} from "../../api/marketplace";
import { useStore } from "../../store";

// ─── Vehicle type filter tabs ─────────────────────────────────────────────────
const VEHICLE_TYPE_TABS = [
  { id: "all",        label: "All",         emoji: "🚗" },
  { id: "car",        label: "Cars",        emoji: "🚗" },
  { id: "2wheeler",   label: "Bikes",       emoji: "🏍️" },
  { id: "commercial", label: "Commercial",  emoji: "🚛" },
  { id: "tractor",    label: "Tractors",    emoji: "🚜" },
];

// Derive a display emoji from the manufacturer's vehicleTypes array
function getMfgEmoji(mfg) {
  const types = mfg.vehicleTypes || [];
  if (types.includes("2wheeler"))   return "🏍️";
  if (types.includes("commercial")) return "🚛";
  if (types.includes("tractor"))    return "🚜";
  return "🚗";
}

export function VehicleSelectorModal({ open, onClose }) {
  const { saveVehicle, selectedVehicle: currentVehicle } = useStore();
  const currentYear = new Date().getFullYear();

  // ── Step state ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1); // 1=Brand 2=Model 3=Year 4=Variant

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [brandSearch, setBrandSearch] = useState("");

  // ── Data ─────────────────────────────────────────────────────────────────────
  const [manufacturers, setManufacturers]     = useState([]);
  const [loadingMfg, setLoadingMfg]           = useState(false);
  const [models, setModels]                   = useState([]);
  const [loadingModels, setLoadingModels]     = useState(false);
  const [variants, setVariants]               = useState([]);   // named variants from Vehicle table

  // ── Selections ───────────────────────────────────────────────────────────────
  const [selectedBrand, setSelectedBrand]     = useState(null); // VehicleManufacturer
  const [selectedModel, setSelectedModel]     = useState(null); // VehicleModel
  const [selectedYear, setSelectedYear]       = useState(null);

  // ── Load manufacturers when modal opens or type filter changes ───────────────
  useEffect(() => {
    if (!open || step !== 1) return;
    setLoadingMfg(true);
    const vt = vehicleTypeFilter === "all" ? undefined : vehicleTypeFilter;
    fetchVehicleManufacturers(vt)
      .then(data => setManufacturers(Array.isArray(data) ? data : []))
      .catch(() => setManufacturers([]))
      .finally(() => setLoadingMfg(false));
  }, [open, vehicleTypeFilter, step]);

  // ── Load models when manufacturer is selected ─────────────────────────────
  useEffect(() => {
    if (!selectedBrand) return;
    setLoadingModels(true);
    setModels([]);
    fetchVehicleModelsByManufacturer(selectedBrand.manufacturerId)
      .then(data => setModels(Array.isArray(data) ? data : []))
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [selectedBrand]);

  // ── Pre-load named variants when model is chosen ──────────────────────────
  useEffect(() => {
    if (!selectedBrand || !selectedModel) return;
    setVariants([]);
    fetchVehicleVariants(selectedBrand.name, selectedModel.name)
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setVariants(arr.filter(v => v.variant)); // only rows with a named variant
      })
      .catch(() => setVariants([]));
  }, [selectedBrand, selectedModel]);

  // ── Generate year list from model's year range ────────────────────────────
  const availableYears = useMemo(() => {
    if (!selectedModel) return [];
    const from = selectedModel.yearFrom || 1990;
    const to   = selectedModel.yearTo   || currentYear;
    const years = [];
    for (let y = to; y >= from; y--) years.push(y); // newest first
    return years;
  }, [selectedModel, currentYear]);

  // ── Filtered brands (search) ──────────────────────────────────────────────
  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return manufacturers;
    const q = brandSearch.toLowerCase();
    return manufacturers.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.parentGroup || "").toLowerCase().includes(q)
    );
  }, [manufacturers, brandSearch]);

  // Early return AFTER all hooks
  if (!open) return null;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const buildVehicle = (year, variantRow) => ({
    id: `${selectedBrand.slug}_${selectedModel.slug}_${year}${variantRow ? "_" + variantRow.variant.replace(/\s+/g, "_") : ""}`,
    brand:          selectedBrand.name,
    model:          selectedModel.name,
    year,
    type:           selectedModel.vehicleType || "car",
    variant:        variantRow?.variant || null,
    manufacturerId: selectedBrand.manufacturerId,
    modelId:        selectedModel.modelId,
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectBrand = (mfg) => {
    setSelectedBrand(mfg);
    setBrandSearch("");
    setStep(2);
  };

  const handleSelectModel = (model) => {
    setSelectedModel(model);
    setStep(3);
  };

  const handleSelectYear = (year) => {
    setSelectedYear(year);
    if (variants.length > 0) {
      setStep(4); // show variant picker
    } else {
      saveVehicle(buildVehicle(year, null));
      resetAndClose();
    }
  };

  const handleSelectVariant = (v) => {
    saveVehicle(buildVehicle(selectedYear, v));
    resetAndClose();
  };

  const handleSkipVariant = () => {
    saveVehicle(buildVehicle(selectedYear, null));
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep(1);
    setVehicleTypeFilter("all");
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedYear(null);
    setBrandSearch("");
    setManufacturers([]);
    setModels([]);
    setVariants([]);
    onClose();
  };

  const removeVehicle = () => {
    saveVehicle(null);
    resetAndClose();
  };

  const goBack = () => {
    if (step === 2) { setSelectedBrand(null); setModels([]);          setStep(1); }
    if (step === 3) { setSelectedModel(null); setSelectedYear(null);  setStep(2); }
    if (step === 4) { setSelectedYear(null);                          setStep(3); }
  };

  // ── Titles ───────────────────────────────────────────────────────────────────
  const stepTitle = step === 1 ? "Select Vehicle Brand"
    : step === 2 ? `Select Model — ${selectedBrand?.name}`
      : step === 3 ? `Select Year — ${selectedBrand?.name} ${selectedModel?.name}`
        : `Select Variant — ${selectedModel?.name} ${selectedYear}`;

  const stepSubtitle = step === 1
    ? (loadingMfg ? "Loading…" : `${filteredBrands.length} brand${filteredBrands.length !== 1 ? "s" : ""}`)
    : step === 2
      ? (loadingModels ? "Loading…" : `${models.length} model${models.length !== 1 ? "s" : ""}`)
      : step === 3
        ? `${availableYears.length} year${availableYears.length !== 1 ? "s" : ""}`
        : `${variants.length} variant${variants.length !== 1 ? "s" : ""}`;

  const STEPS = ["Brand", "Model", "Year", "Variant"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,29,0.8)", backdropFilter: "blur(8px)" }} onClick={resetAndClose} />

      <div style={{ position: "relative", background: T.surface, width: 560, borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.6)", border: `1px solid ${T.borderHi}`, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh", animation: "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.card }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {step > 1 && (
              <button onClick={goBack} style={{ background: "transparent", border: "none", color: T.amber, fontSize: 18, cursor: "pointer", padding: "4px 8px", marginLeft: -8 }}>
                ←
              </button>
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: T.t1 }}>{stepTitle}</div>
              <div style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>{stepSubtitle}</div>
            </div>
          </div>
          <button onClick={resetAndClose} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 24, cursor: "pointer" }}>✕</button>
        </div>

        {/* ── Progress Steps ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 0, padding: "12px 24px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
          {STEPS.map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isDone   = step > stepNum;
            const val = stepNum === 1 ? selectedBrand?.name
                      : stepNum === 2 ? selectedModel?.name
                      : stepNum === 3 ? selectedYear
                      : null;
            return (
              <div key={label} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: isDone ? T.emerald : isActive ? T.amber : T.border, color: isDone || isActive ? "#000" : T.t3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                  {isDone ? "✓" : stepNum}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: isActive ? T.amber : isDone ? T.emerald : T.t4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                  {val && <div style={{ fontSize: 10, fontWeight: 800, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{val}</div>}
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: isDone ? T.emerald : T.border, margin: "0 4px" }} />}
              </div>
            );
          })}
        </div>

        {/* ── Content Body ──────────────────────────────────────────────────── */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }} className="custom-scroll">

          {/* Current Vehicle Banner */}
          {currentVehicle && step === 1 && (
            <div style={{ background: `${T.emerald}14`, border: `1px dashed ${T.emerald}55`, borderRadius: 12, padding: "16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>🚙</span>
                <div>
                  <div style={{ fontSize: 11, color: T.emerald, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Vehicle</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{currentVehicle.brand} {currentVehicle.model}</div>
                  <div style={{ fontSize: 13, color: T.t3 }}>
                    {currentVehicle.year}{currentVehicle.variant && ` · ${currentVehicle.variant}`}
                  </div>
                </div>
              </div>
              <button onClick={removeVehicle} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.t2, borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700 }} className="btn-hover">
                Clear
              </button>
            </div>
          )}

          {/* ── STEP 1: Brand ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              {/* Vehicle type tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
                {VEHICLE_TYPE_TABS.map(tab => (
                  <button key={tab.id} onClick={() => setVehicleTypeFilter(tab.id)}
                    style={{ background: vehicleTypeFilter === tab.id ? T.amber : T.bg, color: vehicleTypeFilter === tab.id ? "#000" : T.t2, border: `1px solid ${vehicleTypeFilter === tab.id ? T.amber : T.border}`, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0 }}>
                    {tab.emoji} {tab.label}
                  </button>
                ))}
              </div>

              {/* Brand search */}
              <input
                value={brandSearch}
                onChange={e => setBrandSearch(e.target.value)}
                placeholder="Search brands (e.g. Maruti, Hero, Tata)…"
                style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.t1, fontSize: 14, fontFamily: FONT.ui, marginBottom: 14, outline: "none", boxSizing: "border-box" }}
              />

              {loadingMfg ? (
                <div style={{ textAlign: "center", padding: 40, color: T.t3, fontSize: 14 }}>Loading brands…</div>
              ) : filteredBrands.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: T.t3, fontSize: 14 }}>
                  {brandSearch ? "No brands match your search." : "No brands found. Try a different type filter."}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {filteredBrands.map(mfg => (
                    <button key={mfg.manufacturerId} onClick={() => handleSelectBrand(mfg)}
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "14px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
                      className="card-hover">
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{getMfgEmoji(mfg)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800 }}>{mfg.name}</div>
                        <div style={{ fontSize: 10, color: T.t4, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {mfg.parentGroup ? `${mfg.parentGroup} · ` : ""}{mfg.country}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Model ─────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              {loadingModels ? (
                <div style={{ textAlign: "center", padding: 40, color: T.t3, fontSize: 14 }}>Loading models…</div>
              ) : models.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: T.t3, fontSize: 14 }}>No models found for this brand.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {models.map(m => (
                    <button key={m.modelId} onClick={() => handleSelectModel(m)}
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "14px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
                      className="card-hover">
                      <div style={{ fontWeight: 800 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
                        {m.yearFrom}–{m.yearTo ? m.yearTo : "Present"}
                        {m.bodyType && ` · ${m.bodyType}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Year ──────────────────────────────────────────────── */}
          {step === 3 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {availableYears.map(year => (
                <button key={year} onClick={() => handleSelectYear(year)}
                  style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "14px", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: FONT.mono, transition: "all 0.15s" }}
                  className="card-hover">
                  {year}
                </button>
              ))}
              {availableYears.length === 0 && (
                <div style={{ gridColumn: "span 4", padding: 30, textAlign: "center", color: T.t3, fontSize: 14 }}>
                  No year data available for this model.
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Variant ───────────────────────────────────────────── */}
          {step === 4 && (
            <div>
              {variants.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 12 }}>
                  {variants.map(v => (
                    <button key={v.vehicleId || v.variant} onClick={() => handleSelectVariant(v)}
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "14px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
                      className="card-hover">
                      <div style={{ fontWeight: 800 }}>{v.variant}</div>
                      {(v.fuelType || v.transmission) && (
                        <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>
                          {[v.fuelType, v.transmission].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 20, color: T.t3, fontSize: 14, marginBottom: 12 }}>
                  No variant data available for this model.
                </div>
              )}
              <button onClick={handleSkipVariant}
                style={{ width: "100%", background: "transparent", border: `1px dashed ${T.border}`, color: T.t3, borderRadius: 10, padding: "12px", fontSize: 13, cursor: "pointer", fontWeight: 700, transition: "all 0.15s" }}
                className="btn-hover">
                Skip — I don't know the variant
              </button>
            </div>
          )}

        </div>

        {/* ── Footer — VIN decoder ──────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ padding: "16px 24px", background: T.bg, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.t3, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Have a VIN Number?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" placeholder="Enter 17-digit VIN"
                style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.t1, fontFamily: FONT.mono, fontSize: 13, textTransform: "uppercase" }}
              />
              <button style={{ background: T.borderHi, color: T.t1, border: "none", borderRadius: 8, padding: "0 16px", fontSize: 13, fontWeight: 800, cursor: "pointer" }} className="btn-hover">
                Decode
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
