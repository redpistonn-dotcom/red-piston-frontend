import { useState, useMemo, useEffect, useContext, useCallback } from "react";
import { T, FONT, SHADOWS } from "../theme";
import { fmt, fmtDate, uid, downloadCSV, generateCSV } from "../utils";
import { Btn, Input, Select, Modal, Field, Divider, MobileCard, MobileCardList, CardField, CardActions, useIsMobile, Skeleton } from "../components/ui";
import { fetchVehicleManufacturers, fetchVehicleModelsByManufacturer } from "../api/marketplace";
import { fetchPartyLedger, fetchParties, type LedgerEntry } from "../api/sync";
import { createParty, getOverdueParties, deleteParty } from "../api/parties";
import { fetchShopVehicles, createShopVehicle, updateShopVehicle } from "../api/shopVehicles";
import { api } from "../api/client";
import { useStore } from "../store";
import { AppCtx } from "../AppCtx";

// ── Small helpers ────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subColor = T.emerald, icon }: { label: string; value: string; sub: string; subColor?: string; icon: string }) {
    return (
        <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", position: "relative", overflow: "hidden", boxShadow: SHADOWS.xs }}>
            <div style={{ position: "absolute", top: 14, right: 16, width: 36, height: 36, background: T.bg, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 9, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: FONT.ui, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: "clamp(18px, 2.2vw, 26px)", fontWeight: 900, color: T.t1, fontFamily: FONT.mono, letterSpacing: "-0.03em", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
            <div style={{ fontSize: 11, color: subColor, fontWeight: 600, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>{sub}</div>
        </div>
    );
}

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
    const colors = ["#1C1B1B", "#374151", "#1e3a5f", "#3b1f5e", "#1f4e3b", "#7c2d12"];
    const bg = colors[(name || "").charCodeAt(0) % colors.length];
    const initials = (name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
    return (
        <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.35, fontWeight: 800, fontFamily: FONT.ui, flexShrink: 0 }}>
            {initials}
        </div>
    );
}

export function PartiesPage() {
    const { parties, movements, vehicles, activeShopId, saveParties, saveVehicles, logAudit } = useStore();
    const { toast } = useContext(AppCtx);
    const isMobile = useIsMobile();

    const onSaveParty = useCallback(async (p: any) => {
        const exists = (parties || []).find((x: any) => x.id === p.id);
        // Optimistic local update for instant UI.
        saveParties(exists ? parties.map((x: any) => (x.id === p.id ? p : x)) : [...(parties || []), p]);
        logAudit(exists ? "PARTY_UPDATED" : "PARTY_CREATED", "party", p.id, p.name);

        // Persist to the backend DB so the party survives logout. A DB-loaded
        // party has a numeric id (mapParty → partyId); a freshly-created one has
        // a local "cust_/sup_" string id → create it.
        const body = {
            name: p.name, phone: p.phone || null, email: p.email || null,
            gstin: p.gstin || null, address: p.address || null,
            type: String(p.type || "customer").toUpperCase(),
            creditLimit: p.creditLimit || 0, creditDays: p.creditDays || 30,
            notes: p.notes || null, openingBalance: p.openingBalance || 0,
        };
        const isDbId = typeof p.id === "number" || /^\d+$/.test(String(p.id));
        try {
            if (exists && isDbId) {
                await api.put(`/api/shop/parties/${p.id}`, body);
                // Sync outstanding via ledger adjustment when it changed
                const prevOutstanding = Number(exists.outstanding || 0);
                const newOutstanding = Number(p.outstanding || 0);
                const diff = Math.round((newOutstanding - prevOutstanding) * 100) / 100;
                if (Math.abs(diff) > 0.009) {
                    await api.post(`/api/shop/parties/${p.id}/ledger`, {
                        entryType: "ADJUSTMENT",
                        debitAmount:  diff > 0 ? diff : 0,
                        creditAmount: diff < 0 ? Math.abs(diff) : 0,
                        notes: "Manual outstanding adjustment",
                    });
                }
            } else {
                await createParty(body);
            }
            // Re-sync from the DB so local ids reconcile to real partyIds
            // (prevents a later edit from creating a duplicate).
            const fresh = await fetchParties();
            if (Array.isArray(fresh)) saveParties(fresh);
        } catch (err) {
            console.error("[onSaveParty] DB sync failed — kept locally:", err);
        }
    }, [parties, saveParties, logAudit]);

    const onSaveVehicle = useCallback(async (v: any) => {
        const exists = (vehicles || []).find((x: any) => x.id === v.id);
        // Optimistic local update for instant UI.
        saveVehicles(exists ? vehicles.map((x: any) => (x.id === v.id ? v : x)) : [...(vehicles || []), v]);

        // Persist to the DB so vehicles survive logout and are usable for job cards.
        const body = {
            make: v.make, model: v.model, variant: v.variant || null,
            year: v.year, fuelType: v.fuelType, registrationNumber: v.registrationNumber,
            engineType: v.engineType, odometer: v.odometer, vin: v.vin || null,
            ownerId: v.ownerId || undefined, notes: v.notes || null,
        };
        const isDbId = typeof v.id === "number" || /^\d+$/.test(String(v.id));
        try {
            if (exists && isDbId) await updateShopVehicle(v.id, body);
            else await createShopVehicle(body);
            const fresh = await fetchShopVehicles();
            if (Array.isArray(fresh)) saveVehicles(fresh);
        } catch (err) {
            console.error("[onSaveVehicle] DB sync failed — kept locally:", err);
        }
    }, [vehicles, saveVehicles]);

    const handleDeleteParty = useCallback(async (party: any) => {
        if (!window.confirm(`Delete ${party.name}? This cannot be undone.`)) return;
        const isDbId = typeof party.id === "number" || /^\d+$/.test(String(party.id));
        if (isDbId) {
            try {
                await deleteParty(party.id);
            } catch (err) {
                console.error("[deleteParty]", err);
                toast?.("Failed to delete party", "error"); return;
            }
        }
        saveParties((parties || []).filter((p: any) => p.id !== party.id));
        logAudit("PARTY_DELETED", "party", party.id, party.name);
        toast?.(`${party.name} deleted`, "success");
    }, [parties, saveParties, logAudit, toast]);

    // Always pull this shop's parties fresh on mount (resilient to a missed
    // initial store sync) — mirrors how Inventory loads. The backend scopes
    // parties to req.shopId, so this returns exactly the active shop's parties.
    const [partiesLoaded, setPartiesLoaded] = useState(false);
    useEffect(() => {
        fetchParties()
            .then(data => { if (Array.isArray(data)) saveParties(data); })
            .catch(() => {})
            .finally(() => setPartiesLoaded(true));
        // Vehicles are DB-backed too — pull this shop's vehicles fresh on mount.
        fetchShopVehicles()
            .then(data => { if (Array.isArray(data)) saveVehicles(data); })
            .catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const [view, setView]           = useState("customers");
    const [search, setSearch]       = useState("");
    const [editParty, setEditParty] = useState<any>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [expandedId, setExpandedId]    = useState<string | null>(null);
    const [sortField, setSortField]      = useState<"name" | "balance" | "txns">("name");
    const [sortAsc, setSortAsc]          = useState(true);
    const [ledgerCache, setLedgerCache]  = useState<Record<string, LedgerEntry[]>>({});
    const [ledgerLoading, setLedgerLoading] = useState<string | null>(null);
    const [overdueParties, setOverdueParties] = useState<any[]>([]);
    const [overdueAtRisk, setOverdueAtRisk] = useState<any[]>([]);
    const [overdueLoaded, setOverdueLoaded] = useState(false);

    // Vehicle form state
    const [showVehForm, setShowVehForm] = useState(false);
    const blankVeh = { makeId: "", make: "", modelId: "", model: "", year: "", fuelType: "Petrol", registrationNumber: "", ownerId: "", engineType: "", odometer: "" };
    const [vehForm, setVehForm] = useState(blankVeh);
    const [editVehId, setEditVehId] = useState<string | null>(null);   // null = creating
    const setVF = (k: string) => (v: any) => setVehForm(p => ({ ...p, [k]: v }));
    const currentYear = new Date().getFullYear();
    const yearOpts = Array.from({ length: 30 }, (_, i) => currentYear - i);

    const [manufacturers, setManufacturers] = useState<any[]>([]);
    const [vehModels, setVehModels]         = useState<any[]>([]);

    useEffect(() => {
        fetchVehicleManufacturers().then((d: any) => setManufacturers(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (!vehForm.makeId) { setVehModels([]); return; }
        fetchVehicleModelsByManufacturer(parseInt(vehForm.makeId, 10))
            .then((d: any) => setVehModels(Array.isArray(d) ? d : []))
            .catch(() => setVehModels([]));
    }, [vehForm.makeId]);

    // Open the form pre-filled to edit an existing vehicle. Make/model are stored
    // as free-text names; resolve the makeId from the manufacturer list so the
    // make dropdown reflects the selection (model name is retained as-is).
    const openEditVehicle = (v: any) => {
        const mfg = manufacturers.find((m: any) => m.name === v.make);
        setVehForm({
            makeId: mfg ? String(mfg.manufacturerId) : "",
            make: v.make || "",
            modelId: "",
            model: v.model || "",
            year: v.year ? String(v.year) : "",
            fuelType: v.fuelType || "Petrol",
            registrationNumber: v.registrationNumber || "",
            ownerId: v.ownerId || "",
            engineType: v.engineType || "",
            odometer: v.odometer != null ? String(v.odometer) : "",
        });
        setEditVehId(v.id);
        setShowVehForm(true);
    };

    const resetVehForm = () => { setVehForm(blankVeh); setEditVehId(null); setShowVehForm(false); };

    const handleSaveVehicle = () => {
        if (!vehForm.make || !vehForm.model || !vehForm.registrationNumber) {
            toast?.("Make, model and registration number are required", "error"); return;
        }
        const existing = editVehId ? (vehicles || []).find((x: any) => x.id === editVehId) : null;
        onSaveVehicle?.({
            ...(existing || {}),
            id: editVehId || ("veh_" + uid()),
            shopId: activeShopId, make: vehForm.make, model: vehForm.model, variant: existing?.variant || "",
            year: +vehForm.year || currentYear, fuelType: vehForm.fuelType || "Petrol",
            engineType: vehForm.engineType || "", registrationNumber: vehForm.registrationNumber.toUpperCase(),
            odometer: +vehForm.odometer || 0, vin: existing?.vin || "", ownerId: vehForm.ownerId || "", notes: existing?.notes || "",
            createdAt: existing?.createdAt || Date.now(),
        });
        toast?.(`Vehicle ${vehForm.registrationNumber.toUpperCase()} ${editVehId ? "updated" : "added"}!`, "success", "🚗");
        resetVehForm();
    };

    // Fetch overdue summary once on mount — shows accounts past their credit days.
    useEffect(() => {
        getOverdueParties()
            .then((res: any) => {
                setOverdueParties(res?.overdue || []);
                setOverdueAtRisk(res?.atRisk || []);
            })
            .catch(() => {})
            .finally(() => setOverdueLoaded(true));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Tolerant shopId match — activeShopId can be a number (from products) or a
    // string (cookie/impersonation), and party.shopId comes from the DB as a
    // number; a strict === silently hid saved parties when the types differed.
    const sameShop = (a: any, b: any) => String(a ?? "") === String(b ?? "");
    const shopParties   = useMemo(() => (parties  || []).filter((p: any) => sameShop(p.shopId, activeShopId)), [parties, activeShopId]);
    const shopVehicles  = useMemo(() => (vehicles || []).filter((v: any) => sameShop(v.shopId, activeShopId)), [vehicles, activeShopId]);
    const shopMovements = useMemo(() => (movements || []).filter((m: any) => m.shopId === activeShopId), [movements, activeShopId]);

    // Fetch real PartyLedger entries from the API whenever a row is expanded.
    useEffect(() => {
        if (!expandedId || ledgerCache[expandedId]) return;
        setLedgerLoading(expandedId);
        fetchPartyLedger(expandedId, { limit: 30 })
            .then(res => {
                setLedgerCache(prev => ({ ...prev, [expandedId]: res?.entries ?? [] }));
            })
            .finally(() => setLedgerLoading(null));
    }, [expandedId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Balance comes directly from the DB-maintained Party.outstanding field (pre-computed
    // by billing.js writeLedgerDebit on every credit sale/payment). Falls back to
    // movement-scan for locally-created parties that haven't synced yet.
    const getBalance = (party: any): number => {
        if (typeof party.outstanding === 'number') return party.outstanding;
        // Fallback: scan local movements for offline/pre-API parties
        let bal = party.openingBalance || 0;
        const matchesParty = (m: any) => {
            const byId = m.partyId && (m.partyId === party.id || m.partyId === String(party.id));
            const byName = m.customerName === party.name || m.supplierName === party.name || m.supplier === party.name;
            return byId || byName;
        };
        shopMovements.forEach((m: any) => {
            if (!matchesParty(m)) return;
            if (party.type === "customer" || party.type === "both") {
                if (m.type === "SALE"    && (m.paymentStatus === "pending" || m.paymentMode === "Credit")) bal += m.total;
                if (m.type === "RECEIPT") bal -= m.total;
            }
            if (party.type === "supplier" || party.type === "both") {
                if (m.type === "PURCHASE" && (m.paymentStatus === "pending" || m.paymentMode === "Credit")) bal += m.total;
                if (m.type === "PAYMENT") bal -= m.total;
            }
        });
        return bal;
    };

    const matchesParty = (m: any, party: any): boolean => {
        const byId = m.partyId && (m.partyId === party.id || m.partyId === String(party.id));
        const byName = m.customerName === party.name || m.supplierName === party.name || m.supplier === party.name;
        return byId || byName;
    };

    const getTransactionCount = (party: any) =>
        shopMovements.filter((m: any) => matchesParty(m, party)).length;

    const getCreditAge = (party: any) => {
        const moves = shopMovements.filter((m: any) => {
            return matchesParty(m, party) && (m.paymentStatus === "pending" || m.paymentMode === "Credit") && (m.type === "SALE" || m.type === "PURCHASE");
        }).sort((a: any, b: any) => a.date - b.date);
        if (!moves.length) return 0;
        // Use the OLDEST unpaid credit movement — that's when the debt started
        return Math.floor((Date.now() - moves[0].date) / 86400000);
    };

    const typeFilter = view === "customers" ? "customer" : "supplier";
    const baseParties = useMemo(() =>
        shopParties.filter((p: any) => p.type === typeFilter || p.type === "both"), [shopParties, typeFilter]);

    const filtered = useMemo(() => {
        let list = baseParties.filter((p: any) =>
            !search || [p.name, p.phone, p.gstin, p.city].some((s: any) => (s || "").toLowerCase().includes(search.toLowerCase()))
        );
        list = [...list].sort((a: any, b: any) => {
            let cmp = 0;
            if (sortField === "name")    cmp = a.name.localeCompare(b.name);
            if (sortField === "balance") cmp = getBalance(a) - getBalance(b);
            if (sortField === "txns")    cmp = getTransactionCount(a) - getTransactionCount(b);
            return sortAsc ? cmp : -cmp;
        });
        return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseParties, search, sortField, sortAsc]);

    const totalOutstanding = filtered.reduce((s: number, p: any) => s + getBalance(p), 0);
    const withCredit       = filtered.filter((p: any) => getBalance(p) > 0).length;
    const aboveLimit       = filtered.filter((p: any) => { const b = getBalance(p); return b > 0 && p.creditLimit > 0 && b > p.creditLimit; }).length;
    const avgCycle         = useMemo(() => {
        const ages = filtered.map((p: any) => getCreditAge(p)).filter(a => a > 0);
        return ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered]);

    const agingBuckets = useMemo(() => {
        const b = { d30: 0, d60: 0, d60plus: 0 };
        filtered.forEach((p: any) => {
            const age = getCreditAge(p); const bal = getBalance(p);
            if (bal <= 0) return;
            if (age <= 30) b.d30 += bal; else if (age <= 60) b.d60 += bal; else b.d60plus += bal;
        });
        return b;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered, shopMovements]);

    const handleExportCSV = () => {
        // The Vehicles tab must export VEHICLES, not the parties list (it was always
        // exporting `filtered`, i.e. suppliers/customers, regardless of the tab).
        if (view === "vehicles") {
            const ownerName = (id: any) => (shopParties || []).find((p: any) => String(p.id) === String(id))?.name || "";
            const headers = ["Registration", "Make", "Model", "Year", "Fuel", "Engine", "Odometer", "Owner"];
            const rows = shopVehicles.map((v: any) => [
                v.registrationNumber || "", v.make || "", v.model || "", v.year || "",
                v.fuelType || "", v.engineType || "", v.odometer || "", ownerName(v.ownerId),
            ]);
            downloadCSV(`vehicles_${Date.now()}.csv`, generateCSV(headers, rows));
            toast?.("Exported!", "success");
            return;
        }
        const headers = ["Name", "Type", "Phone", "GSTIN", "City", "Credit Limit", "Outstanding", "Transactions", "Tags"];
        const rows = filtered.map((p: any) => [p.name, p.type, p.phone, p.gstin || "", p.city || "", p.creditLimit, getBalance(p), getTransactionCount(p), (p.tags || []).join(", ")]);
        downloadCSV(`${view}_${Date.now()}.csv`, generateCSV(headers, rows));
        toast?.("Exported!", "success");
    };

    const toggleSort = (field: "name" | "balance" | "txns") => {
        if (sortField === field) setSortAsc(v => !v);
        else { setSortField(field); setSortAsc(true); }
    };

    // ─── Tab pill ─────────────────────────────────────────────────────────────
    const TAB_DEFS = [
        { id: "customers", icon: "👤", label: "Customers" },
        { id: "suppliers", icon: "🏭", label: "Suppliers" },
        { id: "vehicles",  icon: "🚗", label: "Vehicles"  },
    ];

    // First-load skeleton: show until this page's own fetch resolves.
    if (!partiesLoaded && shopParties.length === 0) {
        return <Skeleton.Page kpis={4} cols={7} />;
    }

    return (
        <div className="page-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── TOP ROW: Tabs + Export + Add ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* Tab pills — horizontally scrollable so all three fit on narrow phones */}
                <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 0, overflowX: "auto", scrollbarWidth: "none" }}>
                    {TAB_DEFS.map(t => (
                        <button key={t.id} onClick={() => { setView(t.id); setSearch(""); }}
                            style={{
                                height: 38, padding: "0 14px", flexShrink: 0, borderRadius: 9, border: `1.5px solid ${view === t.id ? T.amber : T.border}`,
                                background: view === t.id ? T.amber : "#FFFFFF",
                                color: view === t.id ? "#FFFFFF" : T.t2,
                                fontSize: 13, fontWeight: view === t.id ? 700 : 500,
                                cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 6,
                                transition: "all 0.15s",
                            }}>
                            <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>

                {/* Right actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={handleExportCSV}
                        style={{ height: 38, padding: "0 16px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#FFFFFF", color: T.t2, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 6 }}>
                        ↓ Export
                    </button>
                    {view !== "vehicles" ? (
                        <button onClick={() => { setEditParty(null); setShowAddModal(true); }}
                            style={{ height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: T.amber, color: "#FFFFFF", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(139,30,30,0.25)" }}>
                            👤 Add {view === "customers" ? "Customer" : "Supplier"}
                        </button>
                    ) : (
                        <button onClick={() => setShowVehForm(v => !v)}
                            style={{ height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: T.amber, color: "#FFFFFF", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(139,30,30,0.25)" }}>
                            🚗 Add Vehicle
                        </button>
                    )}
                </div>
            </div>

            {/* ── VEHICLES TAB ── */}
            {view === "vehicles" && (
                <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", boxShadow: SHADOWS.xs }}>
                    {showVehForm && (
                        <div style={{ borderBottom: `1px solid ${T.border}`, padding: 20 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: T.amber, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14, fontFamily: FONT.ui }}>{editVehId ? "Edit Vehicle" : "New Vehicle"}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, alignItems: "end" }}>
                                <Field label="Make *">
                                    <select value={vehForm.makeId} onChange={e => {
                                        const mfg = manufacturers.find((m: any) => m.manufacturerId === parseInt(e.target.value, 10));
                                        setVehForm(p => ({ ...p, makeId: e.target.value, make: mfg?.name || "", modelId: "", model: "" }));
                                    }} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none" }}>
                                        <option value="">Select make…</option>
                                        {manufacturers.map((m: any) => <option key={m.manufacturerId} value={m.manufacturerId}>{m.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Model *">
                                    <select value={vehForm.modelId} onChange={e => {
                                        const mdl = vehModels.find((m: any) => m.modelId === parseInt(e.target.value, 10));
                                        setVehForm(p => ({ ...p, modelId: e.target.value, model: mdl?.name || "" }));
                                    }} disabled={!vehForm.makeId} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none" }}>
                                        <option value="">Select model…</option>
                                        {vehModels.map((m: any) => <option key={m.modelId} value={m.modelId}>{m.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Year">
                                    <select value={vehForm.year} onChange={e => setVF("year")(e.target.value)} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none" }}>
                                        <option value="">Year</option>
                                        {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </Field>
                                <Field label="Fuel Type">
                                    <select value={vehForm.fuelType} onChange={e => setVF("fuelType")(e.target.value)} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none" }}>
                                        {["Petrol","Diesel","CNG","Electric","Hybrid"].map(f => <option key={f}>{f}</option>)}
                                    </select>
                                </Field>
                                <Field label="Reg. Number *"><Input value={vehForm.registrationNumber} onChange={setVF("registrationNumber")} placeholder="TS09AB1234" /></Field>
                                <Field label="Owner">
                                    <select value={vehForm.ownerId} onChange={e => setVF("ownerId")(e.target.value)} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none" }}>
                                        <option value="">No owner</option>
                                        {shopParties.filter((p: any) => p.type === "customer" || p.type === "both").map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Engine Type"><Input value={vehForm.engineType} onChange={setVF("engineType")} placeholder="1.2L VTEC" /></Field>
                                <Field label="Odometer (km)"><Input type="number" value={vehForm.odometer} onChange={setVF("odometer")} placeholder="45000" suffix="km" /></Field>
                            </div>
                            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
                                <Btn variant="ghost" size="sm" onClick={resetVehForm}>Cancel</Btn>
                                <Btn size="sm" onClick={handleSaveVehicle}>🚗 {editVehId ? "Update Vehicle" : "Save Vehicle"}</Btn>
                            </div>
                        </div>
                    )}
                    <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.t2, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui }}>Registered Vehicles</span>
                        <span style={{ fontSize: 12, color: T.t3 }}>{shopVehicles.length} total</span>
                    </div>
                    <div style={{ padding: 16 }}>
                        {shopVehicles.length === 0 && !showVehForm ? (
                            <div style={{ textAlign: "center", padding: "48px 24px" }}>
                                <div style={{ fontSize: 48, opacity: 0.25, marginBottom: 14 }}>🚗</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: T.t2, marginBottom: 6 }}>No vehicles registered yet</div>
                                <div style={{ fontSize: 13, color: T.t3, marginBottom: 20 }}>Add a vehicle to track service history and compatible parts</div>
                                <button onClick={() => setShowVehForm(true)} style={{ height: 40, padding: "0 20px", borderRadius: 9, border: "none", background: T.amber, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>+ Add First Vehicle</button>
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                                            {[["Vehicle","left"],["Reg. No.","left"],["Owner","left"],["Engine","left"],["Odometer","right"],["","right"]].map(([h, al], i) => (
                                                <th key={i} style={{ padding: "10px 14px", textAlign: al as any, fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shopVehicles.map((v: any) => {
                                            const owner = shopParties.find((p: any) => String(p.id) === String(v.ownerId));
                                            return (
                                                <tr key={v.id} className="trow" style={{ borderBottom: `1px solid ${T.border}` }}>
                                                    <td style={{ padding: "10px 14px" }}>
                                                        <div style={{ fontWeight: 700, color: T.t1, fontSize: 13 }}>{v.make} {v.model}</div>
                                                        <div style={{ fontSize: 10, color: T.t3, marginTop: 1 }}>{[v.variant, v.year, v.fuelType].filter(Boolean).join(" · ")}</div>
                                                    </td>
                                                    <td style={{ padding: "10px 14px" }}><span style={{ background: T.skyBg, color: T.sky, padding: "3px 9px", borderRadius: 6, fontWeight: 800, fontFamily: FONT.mono, fontSize: 12, whiteSpace: "nowrap" }}>{v.registrationNumber}</span></td>
                                                    <td style={{ padding: "10px 14px", fontSize: 12, color: T.t2, fontWeight: 600 }}>{owner?.name || "—"}</td>
                                                    <td style={{ padding: "10px 14px", fontSize: 12, color: T.t2 }}>{v.engineType || "—"}</td>
                                                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: FONT.mono, color: T.amber, fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>{(v.odometer || 0).toLocaleString()} km</td>
                                                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                                                        <button onClick={() => openEditVehicle(v)}
                                                            style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: T.t2, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>✎ Edit</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {/* Footer */}
                    <div style={{ padding: "10px 18px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.ui }}>{shopVehicles.length} VEHICLES TOTAL</span>
                        <span style={{ fontSize: 10, color: T.t3, fontFamily: FONT.ui }}>AUTOSPACE ENTERPRISE V2.4</span>
                    </div>
                </div>
            )}

            {/* ── CUSTOMERS / SUPPLIERS TAB ── */}
            {view !== "vehicles" && (
                <>
                    {/* KPI Cards */}
                    <div className="kpi-grid-3" style={{ display: "grid", gap: 12 }}>
                        <KpiCard
                            label={`Total ${view === "customers" ? "Customers" : "Suppliers"}`}
                            value={baseParties.length.toLocaleString()}
                            sub={baseParties.length > 0 ? `+${Math.max(0, baseParties.filter((p: any) => p.createdAt > Date.now() - 30*86400000).length)} this month` : "No records yet"}
                            subColor={T.emerald}
                            icon="👥"
                        />
                        <KpiCard
                            label="Active Credit Lines"
                            value={String(withCredit)}
                            sub={aboveLimit > 0 ? `⚠ ${aboveLimit} above limit` : "All within limit"}
                            subColor={aboveLimit > 0 ? "#D97706" : T.emerald}
                            icon="📋"
                        />
                        <KpiCard
                            label="Total Outstanding"
                            value={fmt(totalOutstanding)}
                            sub={avgCycle > 0 ? `⏱ Avg. ${avgCycle} days cycle` : "No outstanding credit"}
                            subColor={totalOutstanding > 0 ? T.t3 : T.emerald}
                            icon="💰"
                        />
                    </div>

                    {/* Credit aging strip (only when data exists) */}
                    {(agingBuckets.d30 > 0 || agingBuckets.d60 > 0 || agingBuckets.d60plus > 0) && (
                        <div className="kpi-grid-3" style={{ display: "grid" }}>
                            {[
                                { label: "0–30 Days", val: agingBuckets.d30, color: T.emerald, note: "Recent credit" },
                                { label: "31–60 Days", val: agingBuckets.d60, color: T.amber, note: "Follow up needed" },
                                { label: "60+ Days", val: agingBuckets.d60plus, color: T.crimson, note: "Overdue — urgent" },
                            ].map(b => (
                                <div key={b.label} style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px", borderLeft: `3px solid ${b.color}` }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui, marginBottom: 4 }}>{b.label}</div>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: b.color, fontFamily: FONT.mono }}>{fmt(b.val)}</div>
                                    <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{b.note}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Overdue accounts banner — only shows for Customers tab when data loaded */}
                    {overdueLoaded && view === "customers" && overdueParties.length > 0 && (
                        <div style={{
                            background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.2)",
                            borderLeft: `4px solid ${T.crimson}`, borderRadius: "0 10px 10px 0",
                            padding: "12px 16px",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                <span style={{ fontSize: 16 }}>⚠️</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#991B1B" }}>
                                    {overdueParties.length} overdue account{overdueParties.length !== 1 ? "s" : ""} — past credit days
                                </span>
                                {overdueAtRisk.length > 0 && (
                                    <span style={{ fontSize: 11, color: "#92400E", background: "#FEF3C7", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                                        +{overdueAtRisk.length} at risk
                                    </span>
                                )}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {overdueParties.slice(0, 5).map((p: any) => (
                                    <div key={p.partyId} style={{
                                        background: "#fff", border: "1px solid rgba(220,38,38,0.2)",
                                        borderRadius: 8, padding: "5px 10px",
                                        fontSize: 11, color: "#991B1B",
                                    }}>
                                        <span style={{ fontWeight: 700 }}>{p.name}</span>
                                        <span style={{ color: T.t3, marginLeft: 6 }}>₹{fmt(p.outstanding)}</span>
                                        <span style={{ color: T.crimson, marginLeft: 6, fontSize: 10 }}>{p.daysSince}d overdue</span>
                                    </div>
                                ))}
                                {overdueParties.length > 5 && (
                                    <div style={{ fontSize: 11, color: T.t3, padding: "5px 6px" }}>+{overdueParties.length - 5} more</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Search + filter icons */}
                    <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", boxShadow: SHADOWS.xs }}>
                        <span style={{ fontSize: 15, color: T.t3 }}>🔍</span>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={`Search by name, phone or GSTIN…`}
                            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: T.t1, fontFamily: FONT.ui }}
                        />
                        {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 14 }}>✕</button>}
                        <div style={{ width: 1, height: 24, background: T.border }} />
                        {/* Sort buttons */}
                        {(["name","balance","txns"] as const).map(f => (
                            <button key={f} onClick={() => toggleSort(f)}
                                title={`Sort by ${f}`}
                                style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${sortField === f ? T.amber : T.border}`, background: sortField === f ? T.amberGlow : "#FFFFFF", color: sortField === f ? T.amber : T.t3, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: FONT.ui }}>
                                {f === "name" ? "Az" : f === "balance" ? "₹" : "#"}
                                {sortField === f ? (sortAsc ? " ↑" : " ↓") : ""}
                            </button>
                        ))}
                    </div>

                    {/* Party list card */}
                    <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden", boxShadow: SHADOWS.xs }}>
                        {filtered.length === 0 ? (
                            /* Empty state */
                            <div style={{ padding: "64px 24px", textAlign: "center" }}>
                                <div style={{ position: "relative", display: "inline-block", marginBottom: 20 }}>
                                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: T.bg, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, opacity: 0.5 }}>👤</div>
                                    <div style={{ position: "absolute", bottom: -4, right: -4, width: 28, height: 28, borderRadius: "50%", background: T.amber, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔍</div>
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: T.t1, letterSpacing: "0.04em", marginBottom: 8, textTransform: "uppercase" }}>
                                    No {view === "customers" ? "Customers" : "Suppliers"} Found
                                </div>
                                <div style={{ fontSize: 13, color: T.t3, maxWidth: 360, margin: "0 auto 28px", lineHeight: 1.6 }}>
                                    {search
                                        ? `No results match "${search}". Try a different name, phone or GSTIN.`
                                        : `Start by adding your first shop ${view === "customers" ? "customer" : "supplier"} to manage ledgers, outstanding credit, and service history.`}
                                </div>
                                {!search && (
                                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                                        <button onClick={() => { setEditParty(null); setShowAddModal(true); }}
                                            style={{ height: 42, padding: "0 24px", borderRadius: 10, border: "none", background: T.amber, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>
                                            Add First {view === "customers" ? "Customer" : "Supplier"}
                                        </button>
                                        <button onClick={handleExportCSV}
                                            style={{ height: 42, padding: "0 20px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "#FFFFFF", color: T.t2, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui }}>
                                            Import Contacts
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : isMobile ? (
                            <MobileCardList>
                                {filtered.map((p: any) => {
                                    const bal  = getBalance(p);
                                    const txns = getTransactionCount(p);
                                    const age  = getCreditAge(p);
                                    const ageColor = age > 60 ? T.crimson : age > 30 ? T.amber : T.emerald;
                                    const pct  = p.creditLimit > 0 ? Math.min(100, (bal / p.creditLimit) * 100) : 0;
                                    return (
                                        <MobileCard key={p.id} accent={bal > 0 ? T.crimson : T.emerald}>
                                            {/* Header: avatar + name + overdue badge */}
                                            <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
                                                <Avatar name={p.name} size={36} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700, color: T.t1, fontSize: 14 }}>{p.name}</div>
                                                    {p.email && <div style={{ fontSize: 10, color: T.t3 }}>{p.email}</div>}
                                                </div>
                                                {bal > 0 && age > 0 && (
                                                    <span style={{ fontSize: 9, fontWeight: 700, color: ageColor, background: `${ageColor}18`, padding: "2px 7px", borderRadius: 4 }}>{age}d overdue</span>
                                                )}
                                            </div>
                                            <CardField label="City" value={p.city || "—"} />
                                            <CardField label="GSTIN" value={p.gstin || "—"} mono />
                                            <CardField label="Txns" value={String(txns)} mono />
                                            {bal > 0 && (
                                                <div style={{ width: "100%", padding: "6px 0" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                                        <span style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Outstanding</span>
                                                        <span style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 14, color: T.crimson }}>{fmt(bal)}</span>
                                                    </div>
                                                    {p.creditLimit > 0 && (
                                                        <div style={{ height: 3, borderRadius: 2, background: T.border }}>
                                                            <div style={{ height: "100%", borderRadius: 2, background: pct > 80 ? T.crimson : pct > 50 ? T.amber : T.emerald, width: `${pct}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {(p.tags || []).length > 0 && (
                                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", width: "100%" }}>
                                                    {(p.tags || []).map((t: string) => (
                                                        <span key={t} style={{ background: `${T.amber}14`, color: T.amber, fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <CardActions>
                                                <button onClick={() => { setEditParty(p); setShowAddModal(true); }}
                                                    style={{ flex: 1, height: 38, borderRadius: 8, border: `1px solid ${T.border}`, background: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.t2, fontFamily: FONT.ui }}>
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteParty(p)}
                                                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "1px solid #fee2e2", background: "#fff", cursor: "pointer", color: "#dc2626", fontFamily: "inherit" }}
                                                >
                                                    Delete
                                                </button>
                                            </CardActions>
                                        </MobileCard>
                                    );
                                })}
                            </MobileCardList>
                        ) : (
                            <div className="table-scroll">
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr>
                                            {[
                                                { key: "name", label: "Name" },
                                                { key: null, label: "Phone" },
                                                { key: null, label: "GSTIN" },
                                                { key: null, label: "City" },
                                                { key: null, label: "Credit Limit" },
                                                { key: "balance", label: "Outstanding" },
                                                { key: "txns", label: "Txns" },
                                                { key: null, label: "Tags" },
                                                { key: null, label: "" },
                                            ].map((h, i) => (
                                                <th key={i} className={`th-cell${h.key ? " sortable" : ""}`}
                                                    onClick={() => h.key && toggleSort(h.key as any)}
                                                    style={{ cursor: h.key ? "pointer" : "default", userSelect: "none" }}>
                                                    {h.label}{h.key && sortField === h.key ? (sortAsc ? " ↑" : " ↓") : ""}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((p: any) => {
                                            const bal  = getBalance(p);
                                            const txns = getTransactionCount(p);
                                            const age  = getCreditAge(p);
                                            const ageColor = age > 60 ? T.crimson : age > 30 ? T.amber : T.emerald;
                                            const pct  = p.creditLimit > 0 ? Math.min(100, (bal / p.creditLimit) * 100) : 0;
                                            const isEx = expandedId === p.id;
                                            return (
                                                <>
                                                    <tr key={p.id} className="trow"
                                                        style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: isEx ? T.amberGlow : "transparent", borderLeft: isEx ? `3px solid ${T.amber}` : "3px solid transparent" }}
                                                        onClick={() => setExpandedId(isEx ? null : p.id)}>
                                                        <td style={{ padding: "13px 14px" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                                <Avatar name={p.name} size={32} />
                                                                <div>
                                                                    <div style={{ fontWeight: 700, color: T.t1, fontSize: 13 }}>{p.name}</div>
                                                                    {p.email && <div style={{ fontSize: 10, color: T.t3, marginTop: 1 }}>{p.email}</div>}
                                                                    {bal > 0 && age > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: ageColor, background: `${ageColor}18`, padding: "1px 6px", borderRadius: 4, marginTop: 3, display: "inline-block" }}>{age}d overdue</span>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: "13px 14px", fontFamily: FONT.mono, fontSize: 12, color: T.t2 }}>{p.phone || "—"}</td>
                                                        <td style={{ padding: "13px 14px", fontFamily: FONT.mono, fontSize: 11, color: p.gstin ? T.t2 : T.t4 }}>{p.gstin || "—"}</td>
                                                        <td style={{ padding: "13px 14px", fontSize: 12, color: T.t2 }}>{p.city || "—"}</td>
                                                        <td style={{ padding: "13px 14px", fontFamily: FONT.mono, fontSize: 12, color: T.t2 }}>{fmt(p.creditLimit || 0)}</td>
                                                        <td style={{ padding: "13px 14px" }}>
                                                            {bal > 0 ? (
                                                                <div>
                                                                    <span style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 14, color: T.crimson }}>{fmt(bal)}</span>
                                                                    {p.creditLimit > 0 && (
                                                                        <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: T.border }}>
                                                                            <div style={{ height: "100%", borderRadius: 2, background: pct > 80 ? T.crimson : pct > 50 ? T.amber : T.emerald, width: `${pct}%`, transition: "width 0.3s" }} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : <span style={{ color: T.t4, fontSize: 12 }}>—</span>}
                                                        </td>
                                                        <td style={{ padding: "13px 14px", fontFamily: FONT.mono, fontSize: 12, color: T.t2, textAlign: "center" }}>{txns}</td>
                                                        <td style={{ padding: "13px 14px" }}>
                                                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                                                {(p.tags || []).map((t: string) => (
                                                                    <span key={t} style={{ background: `${T.amber}14`, color: T.amber, fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>{t}</span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: "13px 14px" }}>
                                                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                                <button onClick={e => { e.stopPropagation(); setEditParty(p); setShowAddModal(true); }}
                                                                    style={{ height: 28, padding: "0 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: "#FFFFFF", color: T.t2, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui }}>Edit</button>
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); handleDeleteParty(p); }}
                                                                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "1px solid #fee2e2", background: "#fff", cursor: "pointer", color: "#dc2626", fontFamily: "inherit" }}
                                                                >
                                                                    Delete
                                                                </button>
                                                                {bal > 0 && p.phone && (
                                                                    <button onClick={e => {
                                                                        e.stopPropagation();
                                                                        const digits = (p.phone || "").replace(/\D/g, "");
                                                                        if (digits.length < 10 || digits.length > 15) { toast?.("Party phone number must be 10–15 digits to send WhatsApp", "warning"); return; }
                                                                        const waNum = digits.length === 10 ? `91${digits}` : digits;
                                                                        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(`Namaste ${p.name}, aapka hamare shop mein ${fmt(bal)} ka baki hai. Kripya jald payment karein.`)}`, "_blank");
                                                                        toast?.("WhatsApp reminder opened", "success");
                                                                    }} style={{ height: 28, padding: "0 10px", borderRadius: 6, border: `1px solid ${T.emerald}55`, background: `${T.emerald}10`, color: T.emerald, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>WA</button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded ledger row — real PartyLedger from API */}
                                                    {isEx && (
                                                        <tr key={p.id + "_detail"}>
                                                            <td colSpan={9} style={{ padding: "0 14px 14px 14px", background: `${T.bg}` }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 10px" }}>
                                                                    <div style={{ width: 3, height: 14, background: T.amber, borderRadius: 2 }} />
                                                                    <span style={{ fontSize: 9, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: FONT.ui }}>UDHAAR LEDGER</span>
                                                                    <div style={{ flex: 1, height: 1, background: T.border }} />
                                                                    <span style={{ fontSize: 10, color: T.emerald, fontWeight: 700, fontFamily: FONT.mono }}>Outstanding: {fmt(getBalance(p))}</span>
                                                                </div>
                                                                {ledgerLoading === p.id ? (
                                                                    <div style={{ color: T.t3, fontSize: 12, padding: "10px 0" }}>Loading ledger…</div>
                                                                ) : !ledgerCache[p.id] || ledgerCache[p.id].length === 0 ? (
                                                                    <div style={{ color: T.t3, fontSize: 12 }}>No ledger entries yet.</div>
                                                                ) : (
                                                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                                                        <thead>
                                                                            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                                                                                {["Date","Entry Type","Invoice","Debit (↑ owes)","Credit (↓ paid)","Balance"].map(h => (
                                                                                    <th key={h} style={{ padding: "5px 8px", textAlign: "left", color: T.t4, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT.ui }}>{h}</th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {ledgerCache[p.id].map((entry: LedgerEntry) => (
                                                                                <tr key={entry.ledgerId} style={{ borderBottom: `1px solid ${T.border}` }}>
                                                                                    <td style={{ padding: "6px 8px", color: T.t3, fontFamily: FONT.mono }}>{fmtDate(new Date(entry.createdAt).getTime())}</td>
                                                                                    <td style={{ padding: "6px 8px", color: T.t2, fontWeight: 600 }}>{entry.entryType.replace(/_/g, " ")}</td>
                                                                                    <td style={{ padding: "6px 8px", color: T.sky, fontFamily: FONT.mono, fontSize: 10 }}>{entry.invoice?.invoiceNumber || entry.referenceNo || "—"}</td>
                                                                                    <td style={{ padding: "6px 8px", fontFamily: FONT.mono, fontWeight: 700, color: entry.debitAmount > 0 ? T.crimson : T.t4 }}>
                                                                                        {entry.debitAmount > 0 ? fmt(entry.debitAmount) : "—"}
                                                                                    </td>
                                                                                    <td style={{ padding: "6px 8px", fontFamily: FONT.mono, fontWeight: 700, color: entry.creditAmount > 0 ? T.emerald : T.t4 }}>
                                                                                        {entry.creditAmount > 0 ? fmt(entry.creditAmount) : "—"}
                                                                                    </td>
                                                                                    <td style={{ padding: "6px 8px", fontFamily: FONT.mono, fontWeight: 700, color: entry.balanceAfter > 0 ? T.amber : T.emerald }}>
                                                                                        {fmt(entry.balanceAfter)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                )}
                                                                {p.notes && <div style={{ marginTop: 8, padding: "6px 10px", background: `${T.amber}08`, borderRadius: 6, fontSize: 11, color: T.t3 }}>📝 {p.notes}</div>}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer strip */}
                        <div style={{ padding: "10px 18px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT.ui }}>
                                {filtered.length} {view.toUpperCase()} TOTAL
                            </span>
                            <span style={{ fontSize: 10, color: T.t3, fontFamily: FONT.ui, letterSpacing: "0.04em" }}>AUTOSPACE ENTERPRISE V2.4</span>
                        </div>
                    </div>
                </>
            )}

            {/* Add/Edit Party Modal */}
            <PartyFormModal
                open={showAddModal}
                party={editParty}
                type={view === "customers" ? "customer" : "supplier"}
                onClose={() => { setShowAddModal(false); setEditParty(null); }}
                onSave={(p: any) => {
                    onSaveParty?.(p);
                    toast?.(editParty ? `${p.name} updated!` : `${p.name} added!`, "success");
                    setShowAddModal(false); setEditParty(null);
                }}
                activeShopId={activeShopId}
            />
        </div>
    );
}

// ── Party Form Modal ─────────────────────────────────────────────────────────
function PartyFormModal({ open, party, type, onClose, onSave, activeShopId }: any) {
    const isEdit = !!party;
    const blank = { name: "", phone: "", email: "", gstin: "", address: "", city: "", creditLimit: "0", creditDays: "30", loyaltyPoints: "0", openingBalance: "0", outstanding: "0", tags: "", notes: "" };
    const [f, setF] = useState(blank);

    useEffect(() => {
        if (party) setF({ ...party, creditLimit: String(party.creditLimit || 0), creditDays: String(party.creditDays || 30), loyaltyPoints: String(party.loyaltyPoints || 0), openingBalance: String(party.openingBalance || 0), outstanding: String(party.outstanding || 0), tags: (party.tags || []).join(", ") });
        else setF(blank);
    }, [party, open]);

    const set = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }));

    const handleSave = () => {
        if (!f.name.trim()) return;
        onSave({
            ...f, id: party?.id || (type === "customer" ? "cust" : "sup") + "_" + uid(),
            shopId: party?.shopId || activeShopId, type: party?.type || type,
            creditLimit: +f.creditLimit || 0, creditDays: +f.creditDays || 30,
            loyaltyPoints: +f.loyaltyPoints || 0, openingBalance: +f.openingBalance || 0,
            outstanding: +f.outstanding || 0,
            tags: f.tags ? f.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
            vehicles: party?.vehicles || [], isActive: true, createdAt: party?.createdAt || Date.now(),
        });
    };

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? `Edit ${type === "customer" ? "Customer" : "Supplier"}` : `Add ${type === "customer" ? "Customer" : "Supplier"}`} width={560}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "span 2" }}><Field label="Name" required><Input value={f.name} onChange={set("name")} placeholder="Business or person name" /></Field></div>
                <Field label="Phone"><Input value={f.phone} onChange={set("phone")} placeholder="+91 9876543210" /></Field>
                <Field label="Email"><Input value={f.email} onChange={set("email")} placeholder="email@example.com" /></Field>
                <Field label="GSTIN"><Input value={f.gstin} onChange={set("gstin")} placeholder="22AAAAA0000A1Z5" /></Field>
                <Field label="City"><Input value={f.city} onChange={set("city")} placeholder="Hyderabad" /></Field>
                <div style={{ gridColumn: "span 2" }}><Field label="Address"><Input value={f.address} onChange={set("address")} placeholder="Full address" /></Field></div>
                <Divider label="Credit & Finance" />
                <div style={{ gridColumn: "span 2" }} />
                <Field label="Credit Limit (₹)"><Input type="number" value={f.creditLimit} onChange={set("creditLimit")} prefix="₹" /></Field>
                <Field label="Credit Days"><Input type="number" value={f.creditDays} onChange={set("creditDays")} suffix="days" /></Field>
                <Field label="Opening Balance (₹)"><Input type="number" value={f.openingBalance} onChange={set("openingBalance")} prefix="₹" /></Field>
                {isEdit && type === "customer" && <Field label="Outstanding / Udhaar (₹)"><Input type="number" value={f.outstanding} onChange={set("outstanding")} prefix="₹" /></Field>}
                {type === "customer" && <Field label="Loyalty Points"><Input type="number" value={f.loyaltyPoints} onChange={set("loyaltyPoints")} /></Field>}
                <div style={{ gridColumn: "span 2" }}><Field label="Tags (comma-separated)"><Input value={f.tags} onChange={set("tags")} placeholder="regular, mechanic, credit" /></Field></div>
                <div style={{ gridColumn: "span 2" }}><Field label="Notes"><Input value={f.notes} onChange={set("notes")} placeholder="Internal notes" /></Field></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn variant="amber" onClick={handleSave}>💾 {isEdit ? "Save Changes" : `Add ${type === "customer" ? "Customer" : "Supplier"}`}</Btn>
            </div>
        </Modal>
    );
}
