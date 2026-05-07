import { useState, useMemo } from "react";
import { T, FONT } from "../../theme";
import { MANUFACTURERS, getModelsForMfg, getYearsForModel, getVariantsForModel } from "../../vehicleData";
import { useStore } from "../../store";

export function VehicleSelectorModal({ open, onClose }) {
  const { saveVehicle, selectedVehicle: currentVehicle } = useStore();

  // Progressive Disclosure State: Brand → Model → Year → Variant
  const [step, setStep] = useState(1); // 1: Brand, 2: Model, 3: Year, 4: Variant
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [brandSearch, setBrandSearch] = useState("");

  // Data based on selection
  const filteredBrands = useMemo(() => {
    if (!brandSearch) return MANUFACTURERS;
    return MANUFACTURERS.filter(m => m.name.toLowerCase().includes(brandSearch.toLowerCase()));
  }, [brandSearch]);

  const availableModels = useMemo(() => {
    if (!selectedBrand) return [];
    return getModelsForMfg(selectedBrand.id);
  }, [selectedBrand]);

  const availableYears = useMemo(() => {
    if (!selectedModel) return [];
    return getYearsForModel(selectedModel.id);
  }, [selectedModel]);

  const availableVariants = useMemo(() => {
    if (!selectedModel) return [];
    return getVariantsForModel(selectedModel.id);
  }, [selectedModel]);

  // Early return AFTER all hooks
  if (!open) return null;

  // Handlers
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
    // If variants exist for this model, go to step 4; else finish
    const variants = getVariantsForModel(selectedModel.id);
    if (variants.length > 0) {
      setStep(4);
    } else {
      // No variants — save without variant
      const vehicle = {
        id: `${selectedBrand.id}_${selectedModel.id}_${year}`,
        brand: selectedBrand.name,
        model: selectedModel.name,
        year,
        type: "Car",
        variant: null,
      };
      saveVehicle(vehicle);
      resetAndClose();
    }
  };

  const handleSelectVariant = (variantName) => {
    const vehicle = {
      id: `${selectedBrand.id}_${selectedModel.id}_${selectedYear}_${variantName.replace(/\s+/g, '_')}`,
      brand: selectedBrand.name,
      model: selectedModel.name,
      year: selectedYear,
      type: "Car",
      variant: variantName,
    };
    saveVehicle(vehicle);
    resetAndClose();
  };

  const handleSkipVariant = () => {
    const vehicle = {
      id: `${selectedBrand.id}_${selectedModel.id}_${selectedYear}`,
      brand: selectedBrand.name,
      model: selectedModel.name,
      year: selectedYear,
      type: "Car",
      variant: null,
    };
    saveVehicle(vehicle);
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedYear(null);
    setBrandSearch("");
    onClose();
  };

  const removeVehicle = () => {
    saveVehicle(null);
    resetAndClose();
  };

  const goBack = () => {
    if (step === 2) { setSelectedBrand(null); setStep(1); }
    if (step === 3) { setSelectedModel(null); setStep(2); }
    if (step === 4) { setSelectedYear(null); setStep(3); }
  };

  const stepTitle = step === 1 ? "Select Brand"
    : step === 2 ? `Select Model — ${selectedBrand?.name}`
      : step === 3 ? `Select Year — ${selectedBrand?.name} ${selectedModel?.name}`
        : `Select Variant — ${selectedModel?.name} ${selectedYear}`;

  const stepSubtitle = step === 1 ? `${MANUFACTURERS.length} brands available`
    : step === 2 ? `${availableModels.length} models`
      : step === 3 ? `${availableYears.length} years`
        : `${availableVariants.length} variants`;

  const STEPS = ["Brand", "Model", "Year", "Variant"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,29,0.8)", backdropFilter: "blur(8px)" }} onClick={resetAndClose} />

      <div style={{ position: "relative", background: T.surface, width: 560, borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.6)", border: `1px solid ${T.borderHi}`, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh", animation: "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Header */}
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

        {/* Progress Steps */}
        <div style={{ display: "flex", gap: 0, padding: "12px 24px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
          {STEPS.map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            const val = stepNum === 1 ? selectedBrand?.name : stepNum === 2 ? selectedModel?.name : stepNum === 3 ? selectedYear : null;
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

        {/* Content Body */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }} className="custom-scroll">

          {/* Current Vehicle Banner */}
          {currentVehicle && step === 1 && (
            <div style={{ background: `${T.emerald}14`, border: `1px dashed ${T.emerald}55`, borderRadius: 12, padding: "16px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>🚙</span>
                <div>
                  <div style={{ fontSize: 11, color: T.emerald, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Vehicle</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{currentVehicle.brand} {currentVehicle.model}</div>
                  <div style={{ fontSize: 13, color: T.t3 }}>
                    {currentVehicle.year}
                    {currentVehicle.variant && ` · ${currentVehicle.variant}`}
                  </div>
                </div>
              </div>
              <button onClick={removeVehicle} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.t2, borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700 }} className="btn-hover">
                Clear
              </button>
            </div>
          )}

          {/* Step 1: BRAND Selection */}
          {step === 1 && (
            <div>
              <input
                value={brandSearch}
                onChange={e => setBrandSearch(e.target.value)}
                placeholder="Search brands..."
                style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", color: T.t1, fontSize: 14, fontFamily: FONT.ui, marginBottom: 16, outline: "none", boxSizing: "border-box" }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {filteredBrands.map(mfg => (
                  <button
                    key={mfg.id}
                    onClick={() => handleSelectBrand(mfg)}
                    style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "14px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
                    className="card-hover"
                  >
                    <span style={{ fontSize: 20 }}>{mfg.logo}</span>
                    <div>
                      <div style={{ fontWeight: 800 }}>{mfg.name}</div>
                      <div style={{ fontSize: 10, color: T.t4, marginTop: 2 }}>{mfg.country}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: MODEL Selection */}
          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {availableModels.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSelectModel(m)}
                  style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "14px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
                  className="card-hover"
                >
                  <div style={{ fontWeight: 800 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>{m.yearFrom}–{m.yearTo}</div>
                </button>
              ))}
              {availableModels.length === 0 && (
                <div style={{ gridColumn: "span 2", padding: 30, textAlign: "center", color: T.t3, fontSize: 14 }}>
                  No models available for this brand.
                </div>
              )}
            </div>
          )}

          {/* Step 3: YEAR Selection */}
          {step === 3 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => handleSelectYear(year)}
                  style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "14px", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: FONT.mono, transition: "all 0.15s" }}
                  className="card-hover"
                >
                  {year}
                </button>
              ))}
              {availableYears.length === 0 && (
                <div style={{ gridColumn: "span 4", padding: 30, textAlign: "center", color: T.t3, fontSize: 14 }}>
                  No years available.
                </div>
              )}
            </div>
          )}

          {/* Step 4: VARIANT Selection */}
          {step === 4 && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {availableVariants.map(v => (
                  <button
                    key={v}
                    onClick={() => handleSelectVariant(v)}
                    style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "14px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
                    className="card-hover"
                  >
                    <div style={{ fontWeight: 800 }}>{v}</div>
                  </button>
                ))}
              </div>
              {/* Skip variant option */}
              <button
                onClick={handleSkipVariant}
                style={{ width: "100%", marginTop: 16, background: "transparent", border: `1px dashed ${T.border}`, color: T.t3, borderRadius: 10, padding: "12px", fontSize: 13, cursor: "pointer", fontWeight: 700, transition: "all 0.15s" }}
                className="btn-hover"
              >
                Skip — I don't know the variant
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        {step === 1 && (
          <div style={{ padding: "16px 24px", background: T.bg, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.t3, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Have a VIN Number?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Enter 17-digit VIN"
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
