import { useState, useMemo, useEffect, useContext, useCallback } from "react";
import { createPortal } from "react-dom";
import { T, FONT, SHADOWS } from "../theme";
import { fmt, fmtDate, uid, JOB_STATUS, generateCSV, downloadCSV } from "../utils";
import { Btn, Input, Select, Modal, Field, Divider, MobileCard, MobileCardList, CardField, CardActions, useIsMobile, Skeleton } from "../components/ui";
import { ImageUploader } from "../components/ImageUploader";
import { useStore } from "../store";
import { AppCtx } from "../AppCtx";
import { api } from "../api/client";
import { fetchJobCards, createJobCard, updateJobCardStatus } from "../api/jobcards";

// ─── Status config for table ──────────────────────────────────────────────────
const STATUS_DISPLAY: Record<string, { label: string; dot: string; color: string }> = {
    draft:       { label: "Draft",           dot: T.t3,     color: T.t3     },
    estimated:   { label: "Diagnosed",       dot: T.sky,    color: T.sky    },
    approved:    { label: "Waiting for Parts", dot: "#F59E0B", color: "#D97706" },
    in_progress: { label: "In Progress",     dot: T.crimson, color: T.crimson },
    completed:   { label: "Completed",       dot: T.emerald, color: T.emerald },
    invoiced:    { label: "Invoiced",        dot: T.violet,  color: T.violet  },
    cancelled:   { label: "Cancelled",       dot: T.t4,      color: T.t3     },
};

// ─── Avatar circle from name ──────────────────────────────────────────────────
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
    const initials = (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    // Deterministic pastel bg from name
    const colors = ["#1C1B1B","#374151","#1e3a5f","#3b1f5e","#1f4e3b"];
    const bg = colors[(name || "").charCodeAt(0) % colors.length];
    return (
        <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.38, fontWeight: 700, fontFamily: FONT.ui, flexShrink: 0 }}>
            {initials}
        </div>
    );
}

// ─── Service type badge ───────────────────────────────────────────────────────
function ServiceBadge({ label }: { label: string }) {
    const text = label?.slice(0, 22) || "Service";
    return (
        <span style={{ display: "inline-block", background: T.surfaceContainerHigh, color: T.t2, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7, fontFamily: FONT.ui, whiteSpace: "nowrap", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>
            {text}
        </span>
    );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_DISPLAY[status] || STATUS_DISPLAY.draft;
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: cfg.color, fontFamily: FONT.ui }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot, flexShrink: 0, display: "inline-block" }} />
            {cfg.label}
        </span>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, main, sub, subColor, icon }: { label: string; main: string; sub: string; subColor?: string; icon: string }) {
    return (
        <div className="card-hover" style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "22px 22px 18px", boxShadow: SHADOWS.xs }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui }}>{label}</span>
                <span style={{ fontSize: 26, opacity: 0.55, flexShrink: 0 }}>{icon}</span>
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: T.t1, fontFamily: FONT.mono, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 10 }}>{main}</div>
            <div style={{ fontSize: 12, color: subColor || T.t3, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 5 }}>
                {subColor && subColor !== T.t3 && <span style={{ fontSize: 14 }}>{subColor === T.emerald ? "↗" : subColor === T.crimson ? "🔴" : ""}</span>}
                {sub}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
// `section` is driven by the route / sidebar item — Job Cards and Parts Listing
// are now SEPARATE sidebar entries, not in-page tabs.
export function WorkshopPage({ section = "jobs" }: { section?: "jobs" | "marketplace" } = {}) {
    const { jobCards, vehicles, parties, products, activeShopId, saveJobCards, saveProducts, logAudit } = useStore();
    const { toast } = useContext(AppCtx);

    const onSaveJobCard = useCallback(async (jc: any) => {
        const exists = (jobCards || []).find((x: any) => x.id === jc.id);
        // Optimistic local update for instant UI.
        saveJobCards(exists ? jobCards.map((x: any) => (x.id === jc.id ? jc : x)) : [...(jobCards || []), jc]);
        logAudit(exists ? "JOB_CARD_UPDATED" : "JOB_CARD_CREATED", "job_card", jc.id, `${jc.jobNumber} — ${jc.status}`);

        // Persist to the DB so job cards survive logout.
        try {
            if (jc.jobId) {
                // Existing DB job — sync its status.
                await updateJobCardStatus(jc.jobId, jc.status);
            } else if (!exists) {
                // New job — create in the DB (denormalize the local vehicle/customer).
                const veh = (vehicles || []).find((v: any) => v.id === jc.vehicleId);
                const cust = (parties || []).find((p: any) => p.id === jc.customerId);
                const labourCharge = (jc.labour || []).reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0);
                await createJobCard({
                    customerName: cust?.name || jc.customerName || "Walk-in",
                    customerPhone: cust?.phone || undefined,
                    vehicleMake: veh?.make || jc.vehicleMake || "Unknown",
                    vehicleModel: veh?.model || jc.vehicleModel || "Unknown",
                    vehicleYear: veh?.year || undefined,
                    vehicleReg: veh?.registrationNumber || undefined,
                    vehicleFuel: veh?.fuelType || undefined,
                    complaint: jc.complaints || undefined,
                    labourCharge,
                    notes: jc.notes || undefined,
                });
                // Re-sync from the DB so ids/jobNumbers reconcile.
                const fresh = await fetchJobCards();
                if (Array.isArray(fresh)) saveJobCards(fresh);
            }
        } catch (err) {
            console.error("[onSaveJobCard] DB sync failed — kept locally:", err);
        }
    }, [jobCards, saveJobCards, logAudit, vehicles, parties]);

    // Pull this shop's job cards fresh on mount so they survive logout (the
    // backend scopes to req.shopId). Mirrors how Inventory/Parties load.
    const [jobsLoaded, setJobsLoaded] = useState(false);
    useEffect(() => {
        fetchJobCards()
            .then(data => { if (Array.isArray(data)) saveJobCards(data); })
            .catch(() => {})
            .finally(() => setJobsLoaded(true));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    void jobsLoaded;

    const [workshopTab, setWorkshopTab]   = useState<"jobs" | "marketplace">(section);
    const [expandedId, setExpandedId]     = useState<string | null>(null);
    const [showCreate, setShowCreate]     = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch]             = useState("");
    const [now, setNow]                   = useState(Date.now());

    // Parts Marketplace state
    const [mpSearch, setMpSearch]         = useState("");
    const [mpFilter, setMpFilter]         = useState<"all" | "live" | "offline">("all");
    const [goLiveProd, setGoLiveProd]     = useState<any>(null);   // product being listed
    const [glQty, setGlQty]               = useState(0);
    const [glPrice, setGlPrice]           = useState(0);
    const [glSaving, setGlSaving]         = useState(false);
    const [glImages, setGlImages]         = useState<string[]>([]); // up to 3 product photos

    // Keep the active section in sync with the route/sidebar selection.
    useEffect(() => { setWorkshopTab(section); }, [section]);

    // Real inventory from DB
    const [inventory,   setInventory]     = useState<any[]>([]);
    const [invLoading,  setInvLoading]    = useState(false);
    const [detailIdx,   setDetailIdx]     = useState<number | null>(null);  // Parts Listing detail popup

    // Add Qty modal
    const [addQtyItem,   setAddQtyItem]   = useState<any>(null);
    const [addQtyAmount, setAddQtyAmount] = useState(1);
    const [addQtySaving, setAddQtySaving] = useState(false);

    // Edit mode: track whether Go Live modal is opened on an already-live item
    const [editMode,    setEditMode]    = useState(false);
    const [glTargetQty, setGlTargetQty] = useState(0); // target qty for edit mode

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);

    const shopJobs     = useMemo(() => (jobCards || []).filter((j: any) => String(j.shopId ?? "") === String(activeShopId ?? "")), [jobCards, activeShopId]);
    const shopVehicles = useMemo(() => (vehicles || []).filter((v: any) => String(v.shopId ?? "") === String(activeShopId ?? "")), [vehicles, activeShopId]);
    const shopParties  = useMemo(() => (parties  || []).filter((p: any) => p.shopId === activeShopId), [parties,  activeShopId]);

    const getVehicle = (id: string) => shopVehicles.find((v: any) => v.id === id);
    const getParty   = (id: string) => shopParties.find((p: any) => p.id === id);

    // KPI data
    const kpi = useMemo(() => {
        const active      = shopJobs.filter((j: any) => ["in_progress","approved","estimated"].includes(j.status));
        const technicians = [...new Set(shopJobs.filter((j: any) => j.assignedTo).map((j: any) => j.assignedTo))];
        const pending     = shopJobs.filter((j: any) => j.status === "completed");
        const overdue     = shopJobs.filter((j: any) => j.status === "completed" && j.completedAt && (Date.now() - j.completedAt) > 86400000 * 2);
        return {
            activeCount:   active.length,
            techAvail:     technicians.length,
            techOnLeave:   0,
            pendingDel:    pending.length,
            overdueDel:    overdue.length,
        };
    }, [shopJobs]);

    // Filtered jobs for the table
    const filtered = useMemo(() => {
        let list = [...shopJobs].sort((a: any, b: any) => b.createdAt - a.createdAt);
        if (statusFilter !== "all") list = list.filter((j: any) => j.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((j: any) => {
                const v = getVehicle(j.vehicleId);
                const c = getParty(j.customerId);
                return (
                    (j.jobNumber || "").toLowerCase().includes(q) ||
                    (j.complaints || "").toLowerCase().includes(q) ||
                    (v ? `${v.make} ${v.model} ${v.registrationNumber}`.toLowerCase().includes(q) : false) ||
                    (c ? c.name.toLowerCase().includes(q) : false)
                );
            });
        }
        return list;
    }, [shopJobs, statusFilter, search]);

    const handleExportCSV = () => {
        const headers = ["Job ID","Vehicle","Customer","Service Type","Status","Technician","Estimated"];
        const rows = filtered.map((j: any) => {
            const v = getVehicle(j.vehicleId);
            const c = getParty(j.customerId);
            return [
                j.jobNumber,
                v ? `${v.make} ${v.model} ${v.registrationNumber}` : "—",
                c?.name || "Walk-in",
                j.complaints || "—",
                STATUS_DISPLAY[j.status]?.label || j.status,
                j.assignedTo || "—",
                j.estimatedAmount || 0,
            ];
        });
        downloadCSV(`Workshop_Jobs_${Date.now()}.csv`, generateCSV(headers, rows));
        toast?.("Exported as CSV", "success");
    };

    const handleStatusChange = (job: any, newStatus: string) => {
        const updated = { ...job, status: newStatus };
        if (newStatus === "in_progress" && !job.startedAt) updated.startedAt = Date.now();
        if (newStatus === "completed") updated.completedAt = Date.now();
        onSaveJobCard(updated);
        toast?.(`Job ${job.jobNumber} → ${STATUS_DISPLAY[newStatus]?.label || newStatus}`, "success");
    };

    const getNextActions = (status: string) => {
        const flow: Record<string,string[]> = {
            draft:       ["estimated"],
            estimated:   ["approved","cancelled"],
            approved:    ["in_progress","cancelled"],
            in_progress: ["completed"],
            completed:   ["invoiced"],
        };
        return flow[status] || [];
    };

    const getElapsed = (job: any) => {
        if (!job.startedAt) return null;
        const ms = (job.completedAt || now) - job.startedAt;
        const h = ms / 3600000;
        return h < 1 ? `${Math.floor(h * 60)}m` : `${h.toFixed(1)}h`;
    };

    // ─── STATUS FILTER TABS DATA ──────────────────────────────────────────────
    const STATUS_TABS = [
        { key: "all",         label: "All" },
        { key: "in_progress", label: "In Progress" },
        { key: "approved",    label: "Waiting Parts" },
        { key: "completed",   label: "Completed" },
        { key: "invoiced",    label: "Invoiced" },
    ];

    // ── Map a real ShopInventory DB row to the shape the table expects ───────────
    const mapInv = (item: any) => {
        // Parse the JSON image array; primary imageUrl stays first. Cap at 3.
        let images: string[] = [];
        try { const parsed = item.images ? JSON.parse(item.images) : []; if (Array.isArray(parsed)) images = parsed; } catch { images = []; }
        const primary = item.imageUrl || item.masterPart?.imageUrl || null;
        if (primary && !images.includes(primary)) images = [primary, ...images];
        images = images.filter((u) => typeof u === "string" && u.startsWith("http")).slice(0, 3);
        return {
            id:              item.inventoryId,
            inventoryId:     item.inventoryId,
            name:            item.customPartName || item.masterPart?.partName || "—",
            sku:             String(item.masterPartId || item.inventoryId),
            category:        item.masterPart?.categoryL1 || "General",
            brand:           item.masterPart?.brand || "",
            image:           primary,
            images,
            stock:           item.computedStock ?? item.stockQty,
            sellPrice:       Number(item.sellingPrice || 0),
            buyPrice:        Number(item.buyingPrice  || 0),
            marketplaceLive: !!item.isMarketplaceListed,
            marketplaceQty:  item.computedStock ?? item.stockQty,
            marketplacePrice:Number(item.sellingPrice || 0),
        };
    };

    // Real inventory from DB (replaces local useStore products for marketplace tab)
    const shopProducts = useMemo(() => inventory.map(mapInv), [inventory]);

    // Fetch real inventory
    const loadInventory = useCallback(async () => {
        setInvLoading(true);
        try {
            const res = await api.get("/api/shop/inventory");
            setInventory((res as any)?.inventory || []);
        } catch { setInventory([]); }
        finally { setInvLoading(false); }
    }, []);

    // Load the shop's inventory on mount (used by BOTH the Parts Listing and the
    // job-card "Add part" dropdown) and refresh on window focus / shop change —
    // so it always reflects exactly what the shop has uploaded, freshly.
    useEffect(() => {
        loadInventory();
        const onFocus = () => loadInventory();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [activeShopId, loadInventory]);

    // Open the Go Live / Edit modal.
    // editMode = true  → already-live item: show target qty + take-offline option
    // editMode = false → unlisted item: show optional extra stock to add
    const openGoLive = (prod: any) => {
        setGoLiveProd(prod);
        setEditMode(!!prod.marketplaceLive);
        setGlQty(0);                       // extra stock to add (Go Live mode only)
        setGlTargetQty(prod.stock || 0);   // target qty (Edit mode)
        setGlPrice(prod.marketplacePrice || prod.sellPrice || 0);
        setGlImages((prod.images && prod.images.length) ? [...prod.images]
            : (prod.image && String(prod.image).startsWith("http") ? [prod.image] : []));
    };

    // Confirm go-live (new listing) or save edits (existing listing).
    // Edit mode:    adjust stock to the target qty (delta can be negative), update price.
    // Go Live mode: optionally add extra stock, update price, enable listing.
    const confirmGoLive = async () => {
        if (!goLiveProd) return;
        if (glPrice <= 0) { toast?.("Please enter a selling price", "warning"); return; }
        // Image is mandatory for new listings — customers need to see the product
        if (!editMode && glImages.length === 0) {
            toast?.("Upload at least one product image before listing on marketplace", "warning");
            return;
        }
        setGlSaving(true);
        try {
            // 1. Update the selling price
            await api.put(`/api/shop/inventory/${goLiveProd.inventoryId}`, { sellingPrice: glPrice });

            if (editMode) {
                // Edit mode: apply stock delta (signed — ADJUSTMENT supports negative qty)
                const delta = glTargetQty - (goLiveProd.stock || 0);
                if (delta !== 0) {
                    await api.post("/api/shop/inventory/adjust", {
                        inventoryId: goLiveProd.inventoryId,
                        type: "ADJUSTMENT",
                        qty: delta,
                        notes: `Stock ${delta > 0 ? "increased" : "decreased"} via marketplace manager (${delta > 0 ? "+" : ""}${delta})`,
                    });
                }
                await loadInventory();
                toast?.(`✅ ${goLiveProd.name} listing updated!`, "success");
            } else {
                // Go Live mode
                if (glQty > 0) {
                    await api.post("/api/shop/inventory/adjust", {
                        inventoryId: goLiveProd.inventoryId,
                        type: "ADJUSTMENT",
                        qty: glQty,
                        notes: "Stock added when listing on marketplace",
                    });
                }
                await api.patch(`/api/shop/inventory/${goLiveProd.inventoryId}/marketplace`, { listed: true });
                await loadInventory();
                toast?.(`🚀 ${goLiveProd.name} is now LIVE on marketplace!`, "success");
            }
            setGoLiveProd(null);
        } catch (err: any) {
            console.error("[confirmGoLive]", err);
            // Surface the real backend reason (e.g. "Adjustment would make stock
            // negative") instead of a generic failure so the user can act on it.
            const msg = err?.data?.error || err?.data?.error?.message || err?.message || "Failed — please try again.";
            toast?.(typeof msg === "string" ? msg : "Failed — please try again.", "error");
        }
        finally { setGlSaving(false); }
    };

    // Persist the current image set (up to 3) to the shop inventory item.
    // imageUrl stays the primary/first photo for back-compat; `images` is the
    // full JSON array. Updates the in-modal product + the list in place.
    const persistGoLiveImages = async (imgs: string[]) => {
        if (!goLiveProd) return;
        const next = imgs.slice(0, 3);
        try {
            await api.put(`/api/shop/inventory/${goLiveProd.inventoryId}`, {
                imageUrl: next[0] || null,
                images: JSON.stringify(next),
            });
            setGoLiveProd((p: any) => (p ? { ...p, image: next[0] || null, images: next } : p));
            setInventory(inv => inv.map(i => i.inventoryId === goLiveProd.inventoryId ? { ...i, imageUrl: next[0] || null, images: JSON.stringify(next) } : i));
        } catch (err) {
            console.error("[persistGoLiveImages]", err);
            toast?.("Image saved to cloud but couldn't be attached — try again.", "error");
        }
    };

    const handleGoLiveImageUpload = (url: string) => {
        setGlImages(prev => {
            if (prev.length >= 3) { toast?.("Up to 3 photos per product", "warning"); return prev; }
            const next = [...prev, url];
            persistGoLiveImages(next);
            toast?.(`📸 Photo ${next.length}/3 added`, "success");
            return next;
        });
    };

    const removeGoLiveImage = (url: string) => {
        setGlImages(prev => {
            const next = prev.filter(u => u !== url);
            persistGoLiveImages(next);
            return next;
        });
    };

    // Take a live item offline (from the table action column)
    const takeOffline = async (prod: any) => {
        try {
            await api.patch(`/api/shop/inventory/${prod.inventoryId}/marketplace`, { listed: false });
            // Optimistic update so UI responds instantly
            setInventory(inv => inv.map(i => i.inventoryId === prod.inventoryId ? { ...i, isMarketplaceListed: false } : i));
            toast?.(`⏸ ${prod.name} removed from marketplace.`, "info");
        } catch { toast?.("Failed — please try again.", "error"); }
    };

    // Take offline from within the Edit modal (with loading state so button disables)
    const takeOfflineFromModal = async () => {
        if (!goLiveProd) return;
        setGlSaving(true);
        try {
            await api.patch(`/api/shop/inventory/${goLiveProd.inventoryId}/marketplace`, { listed: false });
            setInventory(inv => inv.map(i => i.inventoryId === goLiveProd.inventoryId ? { ...i, isMarketplaceListed: false } : i));
            toast?.(`⏸ ${goLiveProd.name} removed from marketplace.`, "info");
            setGoLiveProd(null);
        } catch (err) {
            console.error("[takeOfflineFromModal]", err);
            toast?.("Failed — please try again.", "error");
        }
        finally { setGlSaving(false); }
    };

    // Add stock to an existing inventory item
    const confirmAddQty = async () => {
        if (!addQtyItem || addQtyAmount <= 0) return;
        setAddQtySaving(true);
        try {
            await api.post("/api/shop/inventory/adjust", { inventoryId: addQtyItem.inventoryId, type: "ADJUSTMENT", qty: addQtyAmount, notes: "Stock added from marketplace manager" });
            await loadInventory();
            toast?.(`Added ${addQtyAmount} units to ${addQtyItem.name}`, "success");
            setAddQtyItem(null);
            setAddQtyAmount(1);
        } catch { toast?.("Failed to add stock — please try again.", "error"); }
        finally { setAddQtySaving(false); }
    };

    const mpFiltered = useMemo(() => {
        let list = [...shopProducts];
        if (mpSearch.trim()) { const q = mpSearch.toLowerCase(); list = list.filter((p: any) => [p.name, p.sku, p.category, p.brand].some((s: any) => (s || "").toLowerCase().includes(q))); }
        if (mpFilter === "live")    list = list.filter((p: any) => p.marketplaceLive);
        if (mpFilter === "offline") list = list.filter((p: any) => !p.marketplaceLive);
        return list;
    }, [shopProducts, mpSearch, mpFilter]);

    const mpKpi = useMemo(() => {
        const live  = shopProducts.filter((p: any) => p.marketplaceLive);
        const value = live.reduce((s: number, p: any) => s + (p.marketplacePrice || p.sellPrice) * (p.marketplaceQty || 0), 0);
        return { liveCount: live.length, liveValue: value, totalStock: live.reduce((s: number, p: any) => s + (p.marketplaceQty || 0), 0) };
    }, [shopProducts]);

    const isMobile = useIsMobile();

    return (
        <div className="page-in rp-gap" style={{ display: "flex", flexDirection: "column" }}>

            {/* ── PARTS MARKETPLACE TAB ── */}
            {workshopTab === "marketplace" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* KPI strip */}
                    <div className="kpi-grid-3" style={{ display: "grid" }}>
                        {[
                            { label: "Items Live", val: String(mpKpi.liveCount), sub: mpKpi.liveCount > 0 ? "Active on marketplace" : "None listed yet", color: mpKpi.liveCount > 0 ? T.emerald : T.t3, icon: "🟢" },
                            { label: "Live Stock Value", val: `₹${(mpKpi.liveValue/1000).toFixed(1)}k`, sub: `${mpKpi.totalStock} units available`, color: T.sky, icon: "📦" },
                            { label: "Total SKUs", val: String(shopProducts.length), sub: `${shopProducts.length - mpKpi.liveCount} offline / unlisted`, color: T.t3, icon: "🏷" },
                        ].map(k => (
                            <div key={k.label} className="card-hover" style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 22px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui }}>{k.label}</span>
                                    <span style={{ fontSize: 22, opacity: 0.55 }}>{k.icon}</span>
                                </div>
                                <div style={{ fontSize: 30, fontWeight: 900, color: T.t1, fontFamily: FONT.mono, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }}>{k.val}</div>
                                <div style={{ fontSize: 12, color: k.color, fontWeight: 600, fontFamily: FONT.ui }}>{k.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Info banner */}
                    <div style={{ background: `${T.sky}10`, border: `1px solid ${T.sky}33`, borderRadius: 10, padding: "11px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: T.sky, fontWeight: 600, fontFamily: FONT.ui }}>
                        <span style={{ fontSize: 18 }}>ℹ</span>
                        Toggle any inventory item <strong>LIVE</strong> to list it on the marketplace. Set the quantity and price customers will see. Changes apply instantly.
                    </div>

                    {/* Parts table card */}
                    <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOWS.xs }}>

                        {/* Toolbar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: `1px solid ${T.border}`, flexWrap: "wrap" }}>
                            {/* Search */}
                            <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "0 12px", height: 36 }}>
                                <span style={{ fontSize: 13, color: T.t3, flexShrink: 0 }}>🔍</span>
                                <input value={mpSearch} onChange={e => setMpSearch(e.target.value)}
                                    placeholder="Search by name, SKU, category…"
                                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: T.t1, fontFamily: FONT.ui }} />
                                {mpSearch && <button onClick={() => setMpSearch("")} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>}
                            </div>
                            {/* Filter pills */}
                            <div style={{ display: "flex", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2 }}>
                                {(["all","live","offline"] as const).map(f => {
                                    const counts = { all: shopProducts.length, live: mpKpi.liveCount, offline: shopProducts.length - mpKpi.liveCount };
                                    const active = mpFilter === f;
                                    return (
                                        <button key={f} onClick={() => setMpFilter(f)}
                                            style={{ height: 28, padding: "0 12px", borderRadius: 7, border: "none", background: active ? (f === "live" ? T.emerald : f === "offline" ? T.t2 : T.amber) : "transparent", color: active ? "#FFFFFF" : T.t3, fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 5, transition: "all 0.13s" }}>
                                            {f === "live" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#FFFFFF" : T.emerald, display: "inline-block", flexShrink: 0 }} />}
                                            {f === "all" ? "All" : f === "live" ? "Live" : "Offline"}
                                            <span style={{ background: active ? "rgba(255,255,255,0.25)" : T.border, color: active ? "#fff" : T.t3, fontSize: 10, fontWeight: 700, padding: "0px 5px", borderRadius: 10 }}>{counts[f]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="table-scroll">
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                                        {[
                                            { label: "Product",  w: "auto" },
                                            { label: "SKU",      w: 140   },
                                            { label: "Category", w: 110   },
                                            { label: "Stock",    w: 70    },
                                            { label: "Sell Price", w: 100 },
                                            { label: "Marketplace Listing", w: 200 },
                                            { label: "Action",   w: 160   },
                                        ].map(h => (
                                            <th key={h.label} className="th-cell" style={{ width: h.w === "auto" ? undefined : h.w }}>{h.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {invLoading ? (
                                        [1,2,3,4].map(i => <Skeleton.Row key={i} cols={7} />)
                                    ) : mpFiltered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ padding: "56px 24px", textAlign: "center" }}>
                                                <div style={{ fontSize: 44, opacity: 0.2, marginBottom: 14 }}>📦</div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: T.t2, marginBottom: 6 }}>
                                                    {mpSearch ? `No results for "${mpSearch}"` : mpFilter === "live" ? "No items live yet" : "No inventory items"}
                                                </div>
                                                <div style={{ fontSize: 12, color: T.t3 }}>
                                                    {mpSearch ? "Try a different search term" : mpFilter === "live" ? "Click 🚀 Go Live on any product to list it" : "Add products to inventory first"}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : mpFiltered.map((prod: any, idx: number) => {
                                        const isLive  = !!prod.marketplaceLive;
                                        const mpPrice = prod.marketplacePrice || prod.sellPrice || 0;
                                        const mpQty   = prod.marketplaceQty ?? 0;
                                        const lowStock = prod.stock <= 5;
                                        const hasImage = typeof prod.image === "string" && prod.image.startsWith("http");
                                        return (
                                            <tr key={prod.id} className="trow" onClick={() => setDetailIdx(idx)} title="View details" style={{ borderBottom: `1px solid ${T.border}`, borderLeft: `3px solid ${isLive ? T.emerald : "transparent"}`, background: isLive ? `${T.emerald}05` : "transparent", transition: "background 0.15s", cursor: "pointer" }}>

                                                {/* PRODUCT */}
                                                <td style={{ padding: "12px 16px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                        <div style={{ width: 40, height: 40, borderRadius: 9, background: T.bg, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                                                            {hasImage
                                                                ? <img src={prod.image} alt={prod.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                                : <span style={{ fontSize: 18, opacity: 0.4 }}>🔧</span>
                                                            }
                                                        </div>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontWeight: 700, color: T.t1, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{prod.name}</div>
                                                            <div style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{prod.brand || "Generic"}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* SKU */}
                                                <td style={{ padding: "12px 16px" }}>
                                                    <span style={{ fontFamily: FONT.mono, fontSize: 11, color: T.t3, background: T.bg, padding: "3px 7px", borderRadius: 5 }}>{prod.sku || "—"}</span>
                                                </td>

                                                {/* CATEGORY */}
                                                <td style={{ padding: "12px 16px" }}>
                                                    <span style={{ background: T.surfaceContainerHigh, color: T.t2, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6 }}>{prod.category || "General"}</span>
                                                </td>

                                                {/* STOCK */}
                                                <td style={{ padding: "12px 16px" }}>
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                                                        <span style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: 900, color: lowStock ? T.crimson : T.t1 }}>{prod.stock ?? 0}</span>
                                                        {lowStock && <span style={{ fontSize: 9, color: T.crimson, fontWeight: 700, letterSpacing: "0.06em" }}>LOW</span>}
                                                    </div>
                                                </td>

                                                {/* SELL PRICE */}
                                                <td style={{ padding: "12px 16px", fontFamily: FONT.mono, fontSize: 13, color: T.t2 }}>{fmt(prod.sellPrice)}</td>

                                                {/* MARKETPLACE LISTING — shows summary pill when live */}
                                                <td style={{ padding: "12px 16px" }}>
                                                    {isLive ? (
                                                        <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.emerald, flexShrink: 0, display: "inline-block" }} />
                                                                <span style={{ fontSize: 13, fontWeight: 900, color: T.emerald, fontFamily: FONT.mono }}>{fmt(mpPrice)}</span>
                                                            </div>
                                                            <div style={{ fontSize: 10, color: T.t3, fontFamily: FONT.ui }}>
                                                                {mpQty} unit{mpQty !== 1 ? "s" : ""} listed · {mpQty > 0 && prod.buyPrice > 0 ? `+${(((mpPrice - prod.buyPrice) / prod.buyPrice) * 100).toFixed(0)}% margin` : ""}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: 12, color: T.t4, fontStyle: "italic" }}>Not listed yet</span>
                                                    )}
                                                </td>

                                                {/* ACTION — stopPropagation so buttons don't open the detail popup */}
                                                <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                                                    {isLive ? (
                                                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                            <button onClick={() => openGoLive(prod)}
                                                                style={{ height: 32, padding: "0 12px", borderRadius: 7, border: `1.5px solid ${T.amber}`, background: T.amberGlow, color: T.amber, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>
                                                                ✏ Edit
                                                            </button>
                                                            <button onClick={() => { setAddQtyItem(prod); setAddQtyAmount(1); }}
                                                                style={{ height: 32, padding: "0 12px", borderRadius: 7, border: `1.5px solid ${T.sky}`, background: `${T.sky}12`, color: T.sky, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>
                                                                + Qty
                                                            </button>
                                                            <button onClick={() => takeOffline(prod)}
                                                                style={{ height: 32, padding: "0 12px", borderRadius: 7, border: `1.5px solid ${T.crimson}44`, background: `${T.crimson}0D`, color: T.crimson, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap" }}>
                                                                ⏸ Off
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => openGoLive(prod)}
                                                            style={{ height: 34, padding: "0 18px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${T.amber}, #6A020A)`, color: "#FFFFFF", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(139,30,30,0.25)", display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.15s" }}
                                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
                                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}>
                                                            🚀 Go Live
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: "10px 20px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT.ui }}>
                                Showing {mpFiltered.length} of {shopProducts.length} products
                            </span>
                            <span style={{ fontSize: 10, fontFamily: FONT.ui, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, color: mpKpi.liveCount > 0 ? T.emerald : T.t4 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: mpKpi.liveCount > 0 ? T.emerald : T.t4, display: "inline-block" }} />
                                {mpKpi.liveCount > 0 ? `${mpKpi.liveCount} live listing${mpKpi.liveCount > 1 ? "s" : ""} on marketplace` : "No live listings yet"}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {workshopTab === "jobs" && (<>

            {/* ── 3 KPI CARDS ── */}
            <div className="kpi-grid-3 ws-kpis" style={{ display: "grid" }}>
                <KpiCard
                    label="Active Jobs"
                    main={String(kpi.activeCount).padStart(2, "0")}
                    sub={kpi.activeCount > 0 ? `+${kpi.activeCount} active this week` : "No active jobs"}
                    subColor={kpi.activeCount > 0 ? T.emerald : T.t3}
                    icon="👥"
                />
                <KpiCard
                    label="Technicians Available"
                    main={`${String(kpi.techAvail).padStart(2, "0")}/${Math.max(kpi.techAvail + 4, 12)}`}
                    sub={`${kpi.techOnLeave > 0 ? kpi.techOnLeave : "—"} on scheduled leave`}
                    icon="👤"
                />
                <KpiCard
                    label="Pending Deliveries"
                    main={String(kpi.pendingDel).padStart(2, "0")}
                    sub={kpi.overdueDel > 0 ? `${kpi.overdueDel} Critical (Overdue)` : "All on schedule"}
                    subColor={kpi.overdueDel > 0 ? T.crimson : T.t3}
                    icon="🚚"
                />
            </div>

            {/* ── ACTIVE JOB CARDS TABLE ── */}
            <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOWS.xs }}>

                {/* Table header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.border}`, gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: T.t1, fontFamily: FONT.display }}>Active Job Cards</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.emerald, background: T.emeraldBg, border: "1px solid rgba(22,163,74,0.2)", padding: "3px 10px", borderRadius: 20, letterSpacing: "0.07em", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.emerald, display: "inline-block" }} />
                            LIVE DATA
                        </span>
                    </div>
                    <div className="ws-jobs-tools" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {/* Search */}
                        <div className="ws-search" style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: T.t3, pointerEvents: "none" }}>🔍</span>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..."
                                style={{ height: 34, width: 180, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 10px 0 30px", fontSize: 12, color: T.t1, fontFamily: FONT.ui, outline: "none", background: T.bg }}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = T.amber; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = T.border; }}
                            />
                        </div>
                        {/* Filter dropdown */}
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            style={{ height: 34, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0 10px", fontSize: 12, color: T.t2, fontFamily: FONT.ui, outline: "none", background: "#FFFFFF", cursor: "pointer" }}>
                            {STATUS_TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                        {/* Export CSV */}
                        <button className="ws-export" onClick={handleExportCSV}
                            style={{ height: 34, padding: "0 14px", background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.t2, cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 6 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.amber; (e.currentTarget as HTMLButtonElement).style.color = T.amber; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; (e.currentTarget as HTMLButtonElement).style.color = T.t2; }}>
                            ⬆ Export CSV
                        </button>
                        {/* New Job */}
                        <button className="ws-newjob" onClick={() => setShowCreate(true)}
                            style={{ height: 34, padding: "0 14px", background: T.amber, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#FFFFFF", cursor: "pointer", fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 6 }}>
                            + New Job
                        </button>
                    </div>
                </div>

                {/* Mobile card view */}
                {isMobile && filtered.length === 0 && (
                    <div style={{ padding: "40px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: 42, opacity: 0.25, marginBottom: 16 }}>🔧</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.t2, marginBottom: 6 }}>No job cards found</div>
                        <button onClick={() => setShowCreate(true)} style={{ background: T.amber, border: "none", borderRadius: 9, padding: "10px 22px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New Job Card</button>
                    </div>
                )}
                {isMobile && filtered.length > 0 && (
                    <MobileCardList>
                        {filtered.map((job: any) => {
                            const vehicle  = getVehicle(job.vehicleId) || (job.vehicleMake ? { make: job.vehicleMake, model: job.vehicleModel, year: job.vehicleYear, registrationNumber: job.vehicleReg } : null);
                            const customer = getParty(job.customerId);
                            const sd = STATUS_DISPLAY[job.status];
                            const partsTotal  = (job.parts  || []).reduce((s: number, p: any) => s + p.qty * p.price, 0);
                            const labourTotal = (job.labour || []).reduce((s: number, l: any) => s + l.amount, 0);
                            return (
                                <MobileCard key={job.id} accent={sd?.dot}>
                                    {/* Header row */}
                                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div>
                                            <span style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 14, color: T.amber }}>{job.jobNumber || "—"}</span>
                                            {getElapsed(job) && <span style={{ fontSize: 10, color: T.sky, marginLeft: 8 }}>⏱ {getElapsed(job)}</span>}
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 700, background: `${sd?.dot}18`, color: sd?.dot, padding: "3px 9px", borderRadius: 99 }}>{sd?.label || job.status}</span>
                                    </div>
                                    {/* Vehicle */}
                                    <CardField label="Vehicle" width="full" value={vehicle ? `${vehicle.year ? vehicle.year + " " : ""}${vehicle.make} ${vehicle.model} · ${vehicle.registrationNumber}` : "No vehicle"} bold />
                                    <CardField label="Customer" value={customer?.name || "Walk-in"} />
                                    <CardField label="Technician" value={job.assignedTo || "—"} />
                                    <CardField label="Parts" value={fmt(partsTotal)} mono />
                                    <CardField label="Labour" value={fmt(labourTotal)} mono />
                                    <CardActions>
                                        {getNextActions(job.status).map((next: string) => (
                                            <button key={next} onClick={() => handleStatusChange(job, next)} style={{ flex: 1, height: 38, borderRadius: 8, border: "none", background: next === "cancelled" ? T.crimson : next === "completed" ? T.emerald : next === "invoiced" ? T.violet : T.amber, color: "#FFFFFF", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>
                                                {STATUS_DISPLAY[next]?.label || next} →
                                            </button>
                                        ))}
                                    </CardActions>
                                </MobileCard>
                            );
                        })}
                    </MobileCardList>
                )}

                {/* Desktop Table */}
                {!isMobile && <div className="table-scroll">
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                {["Job ID","Vehicle Details","Customer","Service Type","Status","Technician","Actions"].map(h => (
                                    <th key={h} className="th-cell">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: "64px 24px", textAlign: "center" }}>
                                        <div style={{ fontSize: 42, opacity: 0.25, marginBottom: 16 }}>🔧</div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: T.t2, marginBottom: 6 }}>No job cards found</div>
                                        <div style={{ fontSize: 12, color: T.t3, marginBottom: 18 }}>
                                            {search || statusFilter !== "all" ? "Try clearing filters" : "Create your first job card to get started"}
                                        </div>
                                        <button onClick={() => setShowCreate(true)}
                                            style={{ background: T.amber, border: "none", borderRadius: 9, padding: "9px 22px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>
                                            + New Job Card
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((job: any, i: number) => {
                                    const vehicle  = getVehicle(job.vehicleId) || (job.vehicleMake ? { make: job.vehicleMake, model: job.vehicleModel, year: job.vehicleYear, registrationNumber: job.vehicleReg } : null);
                                    const customer = getParty(job.customerId);
                                    const isExpanded = expandedId === job.id;
                                    const partsTotal  = (job.parts  || []).reduce((s: number, p: any) => s + p.qty * p.price, 0);
                                    const labourTotal = (job.labour || []).reduce((s: number, l: any) => s + l.amount, 0);
                                    const custName = customer?.name || "Walk-in";
                                    const serviceLabel = job.complaints || (JOB_STATUS as any)[job.status]?.label || "Service";
                                    const isLast = i === filtered.length - 1;

                                    return (
                                        <>
                                            <tr key={job.id} className="trow"
                                                onClick={() => setExpandedId(isExpanded ? null : job.id)}
                                                style={{ borderBottom: isExpanded ? "none" : (!isLast ? `1px solid ${T.border}` : "none"), cursor: "pointer", borderLeft: `3px solid ${STATUS_DISPLAY[job.status]?.dot || T.border}` }}>

                                                {/* JOB ID */}
                                                <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                                                    <span style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 13, color: T.amber }}>{job.jobNumber || "—"}</span>
                                                    {getElapsed(job) && (
                                                        <div style={{ fontSize: 10, color: T.sky, marginTop: 2 }}>⏱ {getElapsed(job)}</div>
                                                    )}
                                                </td>

                                                {/* VEHICLE DETAILS */}
                                                <td style={{ padding: "14px 16px" }}>
                                                    {vehicle ? (
                                                        <>
                                                            <div style={{ fontWeight: 700, fontSize: 13, color: T.t1 }}>{vehicle.year ? `${vehicle.year} ` : ""}{vehicle.make} {vehicle.model}</div>
                                                            <div style={{ fontSize: 11, color: T.t3, marginTop: 2, fontFamily: FONT.mono }}>Plate: {vehicle.registrationNumber}</div>
                                                        </>
                                                    ) : (
                                                        <span style={{ color: T.t4, fontSize: 12 }}>No vehicle</span>
                                                    )}
                                                </td>

                                                {/* CUSTOMER */}
                                                <td style={{ padding: "14px 16px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                                        <Avatar name={custName} size={30} />
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{custName}</span>
                                                    </div>
                                                </td>

                                                {/* SERVICE TYPE */}
                                                <td style={{ padding: "14px 16px" }}>
                                                    <ServiceBadge label={serviceLabel} />
                                                </td>

                                                {/* STATUS */}
                                                <td style={{ padding: "14px 16px" }}>
                                                    <StatusBadge status={job.status} />
                                                </td>

                                                {/* TECHNICIAN */}
                                                <td style={{ padding: "14px 16px", fontSize: 13, color: T.t2, fontWeight: 500 }}>
                                                    {job.assignedTo || <span style={{ color: T.t4 }}>Unassigned</span>}
                                                </td>

                                                {/* ACTIONS */}
                                                <td style={{ padding: "14px 16px" }}>
                                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                        <button title={isExpanded ? "Collapse" : "Expand"} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.t2 }}
                                                            onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : job.id); }}>
                                                            {isExpanded ? "▲" : "⋯"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Detail */}
                                            {isExpanded && (
                                                <tr key={`${job.id}-detail`}>
                                                    <td colSpan={7} style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: 0 }}>
                                                        <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn 0.15s ease" }}>
                                                            {/* Top info grid */}
                                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                                                <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
                                                                    <div style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Customer Complaint</div>
                                                                    <div style={{ fontSize: 13, color: T.t1 }}>{job.complaints || "—"}</div>
                                                                </div>
                                                                <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
                                                                    <div style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Diagnosis</div>
                                                                    <div style={{ fontSize: 13, color: T.t1 }}>{job.diagnosis || "—"}</div>
                                                                </div>
                                                            </div>

                                                            {/* Checklist */}
                                                            {(job.checklist || []).length > 0 && (
                                                                <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
                                                                    <div style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Service Checklist</div>
                                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                                        {(job.checklist || []).map((item: any, idx: number) => (
                                                                            <div key={idx} onClick={() => {
                                                                                const checklist = [...job.checklist];
                                                                                checklist[idx] = { ...checklist[idx], status: checklist[idx].status === "done" ? "pending" : "done" };
                                                                                onSaveJobCard({ ...job, checklist });
                                                                            }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 7, border: `1px solid ${T.border}`, background: item.status === "done" ? T.emeraldBg : "transparent", cursor: "pointer", fontSize: 12, color: item.status === "done" ? T.emerald : T.t2 }}>
                                                                                <span>{item.status === "done" ? "☑" : "☐"}</span>
                                                                                <span style={{ textDecoration: item.status === "done" ? "line-through" : "none" }}>{item.task}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Parts + Labour + Total */}
                                                            <div className="rp-grid-3" style={{ display: "grid" }}>
                                                                <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
                                                                    <div style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Parts</div>
                                                                    {(job.parts || []).length === 0 ? <span style={{ fontSize: 12, color: T.t4 }}>None</span> : (job.parts || []).map((p: any, i: number) => (
                                                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                                                            <span style={{ color: T.t2 }}>{p.name} ×{p.qty}</span>
                                                                            <span style={{ fontFamily: FONT.mono, color: T.amber, fontWeight: 700 }}>{fmt(p.qty * p.price)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
                                                                    <div style={{ fontSize: 9, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Labour</div>
                                                                    {(job.labour || []).length === 0 ? <span style={{ fontSize: 12, color: T.t4 }}>None</span> : (job.labour || []).map((l: any, i: number) => (
                                                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                                                            <span style={{ color: T.t2 }}>{l.description}</span>
                                                                            <span style={{ fontFamily: FONT.mono, color: T.sky, fontWeight: 700 }}>{fmt(l.amount)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div style={{ background: T.amberGlow, border: `1px solid rgba(139,30,30,0.15)`, borderRadius: 10, padding: "12px 16px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                                                                    <div style={{ fontSize: 9, color: T.amber, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Grand Total</div>
                                                                    <div style={{ fontSize: 22, fontWeight: 900, color: T.amber, fontFamily: FONT.mono }}>{fmt(partsTotal + labourTotal)}</div>
                                                                    {job.startedAt && <div style={{ fontSize: 10, color: T.t3, marginTop: 6 }}>Started: {fmtDate(job.startedAt)}</div>}
                                                                </div>
                                                            </div>

                                                            {/* Action buttons */}
                                                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                                                {getNextActions(job.status).map((next: string) => (
                                                                    <button key={next} onClick={() => handleStatusChange(job, next)}
                                                                        style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "none", background: next === "cancelled" ? T.crimson : next === "completed" ? T.emerald : next === "invoiced" ? T.violet : T.amber, color: "#FFFFFF", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}>
                                                                        {STATUS_DISPLAY[next]?.label || next} →
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>}

                {/* Footer */}
                <div style={{ padding: "10px 20px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        {filtered.length} of {shopJobs.length} total jobs
                    </span>
                    <span style={{ fontSize: 11, color: T.emerald, fontFamily: FONT.mono, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.emerald, display: "inline-block" }} />
                        SHOP ENGINE 2.4.0
                    </span>
                </div>
            </div>

            {/* Mobile-only floating "+" FAB (Stitch design) — hidden ≥768px via rp-mobile-flex */}
            <button className="rp-mobile-flex ws-fab" aria-label="New job card" onClick={() => setShowCreate(true)}>+</button>

            </>)} {/* end workshopTab === "jobs" */}

            {/* ── Parts Listing detail popup — clear photos + details + Next/Back ── */}
            {detailIdx !== null && mpFiltered[detailIdx] && createPortal(
                <div style={{ position: "fixed", inset: 0, zIndex: 2147483646, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
                    <div onClick={() => setDetailIdx(null)} style={{ position: "absolute", inset: 0, background: "rgba(28,27,27,0.6)", backdropFilter: "blur(4px)" }} />
                    {(() => {
                        const p: any = mpFiltered[detailIdx];
                        const imgs: string[] = (p.images && p.images.length) ? p.images : [];
                        const isLive = !!p.marketplaceLive;
                        const rows: [string, string][] = [
                            ["Stock", `${p.stock ?? 0} units`],
                            ["Sell Price", fmt(p.sellPrice)],
                            ["Buy Price", fmt(p.buyPrice)],
                            ["Brand", p.brand || "Generic"],
                        ];
                        if (isLive) { rows.push(["Marketplace Price", fmt(p.marketplacePrice)]); rows.push(["Units Listed", String(p.marketplaceQty ?? 0)]); }
                        return (
                            <div style={{ position: "relative", background: "#fff", borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.28)", animation: "fadeUp 0.2s ease", margin: "auto" }}>
                                {/* Header */}
                                <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 22px 14px", borderBottom: `1px solid ${T.border}` }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 17, fontWeight: 900, color: T.t1, fontFamily: FONT.display }}>{p.name}</div>
                                        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                                            <span style={{ background: T.bg, color: T.t3, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, fontFamily: FONT.mono }}>{p.sku}</span>
                                            <span style={{ background: T.surfaceContainerHigh, color: T.t2, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>{p.category}</span>
                                            <span style={{ background: isLive ? `${T.emerald}18` : T.bg, color: isLive ? T.emerald : T.t3, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{isLive ? "● Live" : "Not listed"}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setDetailIdx(null)} title="Close" style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${T.border}`, background: "#fff", cursor: "pointer", fontSize: 18, color: T.t3, flexShrink: 0, lineHeight: 1 }}>×</button>
                                </div>
                                {/* Body — gallery + details */}
                                <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
                                    {imgs.length > 0 ? (
                                        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                                            {imgs.map((u, i) => (
                                                <img key={i} src={u} alt="" style={{ width: imgs.length === 1 ? "100%" : 158, maxWidth: "100%", height: 175, objectFit: "cover", borderRadius: 12, border: `1px solid ${T.border}` }} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ height: 150, borderRadius: 12, border: `1.5px dashed ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.t4, marginBottom: 18, gap: 6 }}>
                                            <span style={{ fontSize: 32, opacity: 0.4 }}>🔧</span>
                                            <span style={{ fontSize: 12 }}>No photos yet — add up to 3 at Go Live</span>
                                        </div>
                                    )}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        {rows.map(([k, v]) => (
                                            <div key={k} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px" }}>
                                                <div style={{ fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{k}</div>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, fontFamily: FONT.mono }}>{v}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                                        <button onClick={() => { const prod = p; setDetailIdx(null); openGoLive(prod); }}
                                            style={{ flex: 1, height: 44, borderRadius: 10, border: "none", background: isLive ? `linear-gradient(135deg, #1e3a5f, #374151)` : `linear-gradient(135deg, ${T.amber}, #6A020A)`, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: FONT.ui }}>
                                            {isLive ? "✏ Edit Listing" : "🚀 Go Live"}
                                        </button>
                                    </div>
                                </div>
                                {/* Footer — Next / Back */}
                                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 22px", borderTop: `1px solid ${T.border}`, background: T.bg }}>
                                    <button disabled={detailIdx <= 0} onClick={() => setDetailIdx(i => Math.max(0, (i ?? 0) - 1))}
                                        style={{ height: 36, padding: "0 16px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "#fff", color: detailIdx <= 0 ? T.t4 : T.t2, fontSize: 12, fontWeight: 700, cursor: detailIdx <= 0 ? "not-allowed" : "pointer", fontFamily: FONT.ui }}>← Back</button>
                                    <span style={{ fontSize: 12, color: T.t3, fontFamily: FONT.mono }}>{(detailIdx ?? 0) + 1} of {mpFiltered.length}</span>
                                    <button disabled={detailIdx >= mpFiltered.length - 1} onClick={() => setDetailIdx(i => Math.min(mpFiltered.length - 1, (i ?? 0) + 1))}
                                        style={{ height: 36, padding: "0 16px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "#fff", color: detailIdx >= mpFiltered.length - 1 ? T.t4 : T.t2, fontSize: 12, fontWeight: 700, cursor: detailIdx >= mpFiltered.length - 1 ? "not-allowed" : "pointer", fontFamily: FONT.ui }}>Next →</button>
                                </div>
                            </div>
                        );
                    })()}
                </div>,
                document.body
            )}

            {/* ── Go Live / Edit Listing Modal ── rendered via portal to escape stacking context */}
            {goLiveProd && createPortal(
                <div style={{ position: "fixed", inset: 0, zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", overflowY: "auto" }}>
                    {/* Backdrop */}
                    <div onClick={() => !glSaving && setGoLiveProd(null)} style={{ position: "absolute", inset: 0, background: "rgba(28,27,27,0.6)", backdropFilter: "blur(4px)" }} />

                    {/* Modal card — capped to the viewport with an internally-scrolling
                        body so a tall form never runs off the top of the screen. */}
                    <div style={{ position: "relative", background: "#FFFFFF", borderRadius: 18, width: "100%", maxWidth: 500, maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.28)", overflow: "hidden", animation: "fadeUp 0.2s ease", margin: "auto" }}>

                        {/* Header — blue for Edit, red-amber for Go Live */}
                        <div style={{ flexShrink: 0, background: editMode ? `linear-gradient(135deg, #1e3a5f, #374151)` : `linear-gradient(135deg, ${T.amber}, #6A020A)`, padding: "22px 24px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 22 }}>{editMode ? "✏️" : "🚀"}</span>
                                <div>
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui }}>
                                        {editMode ? "Edit Listing" : "List on Marketplace"}
                                    </div>
                                    <div style={{ fontSize: 17, fontWeight: 900, color: "#FFFFFF", fontFamily: FONT.display, letterSpacing: "-0.01em" }}>{goLiveProd.name}</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                                {goLiveProd.sku && <span style={{ background: "rgba(255,255,255,0.18)", color: "#FFFFFF", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, fontFamily: FONT.mono }}>{goLiveProd.sku}</span>}
                                {goLiveProd.category && <span style={{ background: "rgba(255,255,255,0.18)", color: "#FFFFFF", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, fontFamily: FONT.ui }}>{goLiveProd.category}</span>}
                                <span style={{ background: "rgba(255,255,255,0.18)", color: "#FFFFFF", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, fontFamily: FONT.ui }}>📦 {goLiveProd.stock} in stock</span>
                            </div>
                        </div>

                        {/* Body — scrolls within the viewport-capped card */}
                        <div style={{ padding: "24px 24px 20px", overflowY: "auto", flex: 1 }}>

                            {editMode ? (
                                /* ── EDIT MODE: set a new target quantity ── */
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
                                        <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui, marginBottom: 4 }}>Current live stock</div>
                                        <div style={{ fontSize: 26, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{goLiveProd.stock} <span style={{ fontSize: 13, fontWeight: 600, color: T.t3 }}>units</span></div>
                                    </div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8, fontFamily: FONT.ui }}>
                                        Set new target quantity
                                    </label>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                        <button onClick={() => setGlTargetQty(q => Math.max(0, q - 1))}
                                            style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.t1 }}>−</button>
                                        <input type="number" value={glTargetQty} min={0}
                                            onChange={e => setGlTargetQty(Math.max(0, +e.target.value))}
                                            style={{ flex: 1, height: 48, background: T.bg, border: `2px solid ${T.sky}`, borderRadius: 10, textAlign: "center", fontSize: 24, fontWeight: 900, color: T.t1, fontFamily: FONT.mono, outline: "none" }} />
                                        <button onClick={() => setGlTargetQty(q => q + 1)}
                                            style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.t1 }}>+</button>
                                    </div>
                                    {/* Delta indicator */}
                                    {(() => {
                                        const delta = glTargetQty - (goLiveProd.stock || 0);
                                        if (delta === 0) return <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.ui }}>No stock change</div>;
                                        if (delta > 0) return <div style={{ fontSize: 12, color: T.emerald, fontWeight: 700, fontFamily: FONT.ui }}>↑ +{delta} units will be added to stock</div>;
                                        return <div style={{ fontSize: 12, color: T.crimson, fontWeight: 700, fontFamily: FONT.ui }}>↓ {Math.abs(delta)} units will be removed from stock</div>;
                                    })()}
                                </div>
                            ) : (
                                /* ── GO LIVE MODE: current stock + optional extra qty ── */
                                <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui, marginBottom: 2 }}>Current stock</div>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: T.t1, fontFamily: FONT.mono }}>{goLiveProd.stock} units</div>
                                    </div>
                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                        <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui, marginBottom: 4 }}>Add more stock? (optional)</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                                            <button onClick={() => setGlQty(q => Math.max(0, q - 1))}
                                                style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 7, border: `1px solid ${T.border}`, background: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" as const }}>−</button>
                                            <input type="number" value={glQty} min={0}
                                                onChange={e => setGlQty(Math.max(0, +e.target.value))}
                                                style={{ width: 54, height: 30, flexShrink: 0, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 7, textAlign: "center", fontSize: 15, fontWeight: 700, color: T.t1, fontFamily: FONT.mono, outline: "none", boxSizing: "border-box" as const, appearance: "textfield" as const, MozAppearance: "textfield" as const }} />
                                            <button onClick={() => setGlQty(q => q + 1)}
                                                style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 7, border: `1px solid ${T.border}`, background: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" as const }}>+</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Price — shared between both modes */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8, fontFamily: FONT.ui }}>
                                    Marketplace price per unit
                                </label>
                                <div style={{ position: "relative" }}>
                                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: T.t3, fontWeight: 700, pointerEvents: "none" }}>₹</span>
                                    <input type="number" value={glPrice} min={0}
                                        onChange={e => setGlPrice(Math.max(0, +e.target.value))}
                                        style={{ width: "100%", height: 52, background: T.bg, border: `2px solid ${editMode ? T.sky : T.amber}`, borderRadius: 10, padding: "0 16px 0 34px", fontSize: 22, fontWeight: 900, color: T.t1, fontFamily: FONT.mono, outline: "none", boxSizing: "border-box" as const }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                                    <span style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>Your sell price: ₹{(goLiveProd.sellPrice || 0).toLocaleString("en-IN")}</span>
                                    {glPrice > 0 && goLiveProd.buyPrice > 0 && (
                                        <span style={{ fontSize: 11, fontWeight: 700, color: glPrice > goLiveProd.buyPrice ? T.emerald : T.crimson, fontFamily: FONT.ui }}>
                                            {glPrice > goLiveProd.buyPrice ? `+${(((glPrice - goLiveProd.buyPrice) / goLiveProd.buyPrice) * 100).toFixed(1)}% margin` : "⚠ Below cost"}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Product photos — up to 3 per product; at least 1 required to go live */}
                            {(() => {
                                const needsImg = !editMode && glImages.length === 0;
                                return (
                                    <div style={{ background: needsImg ? "#FFF7ED" : T.bg, border: `1px solid ${needsImg ? "#FED7AA" : T.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: needsImg ? "#92400E" : T.t2, fontFamily: FONT.ui }}>
                                                🖼 Product photos <span style={{ color: T.t3, fontWeight: 600 }}>({glImages.length}/3)</span>
                                            </div>
                                            {needsImg && <span style={{ fontSize: 11, color: "#B45309", fontWeight: 600 }}>At least 1 required</span>}
                                        </div>
                                        {glImages.length > 0 && (
                                            <div style={{ display: "flex", gap: 8, marginBottom: glImages.length < 3 ? 12 : 0, flexWrap: "wrap" }}>
                                                {glImages.map((u, i) => (
                                                    <div key={i} style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
                                                        <img src={u} alt="" style={{ width: 88, height: 88, borderRadius: 8, objectFit: "cover", border: `1px solid ${T.border}` }} />
                                                        <button onClick={() => removeGoLiveImage(u)} title="Remove" style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: "none", background: T.crimson, color: "#fff", fontSize: 13, cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                                                        {i === 0 && <span style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>MAIN</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {glImages.length < 3 && (
                                            <ImageUploader
                                                folder="products"
                                                currentUrl={null}
                                                onUploaded={(url) => handleGoLiveImageUpload(url)}
                                                onError={(msg) => toast?.(msg, "error")}
                                                label={glImages.length === 0 ? "Upload Product Photo" : "Add another photo"}
                                                maxMb={5}
                                            />
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Action buttons */}
                            {editMode ? (
                                /* Edit mode: Cancel | Take Offline | Save Changes */
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button onClick={() => !glSaving && setGoLiveProd(null)}
                                        style={{ flex: 1, height: 44, background: "#FFFFFF", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t2, cursor: glSaving ? "not-allowed" : "pointer", fontFamily: FONT.ui }}>
                                        Cancel
                                    </button>
                                    <button onClick={takeOfflineFromModal} disabled={glSaving}
                                        style={{ flex: 1, height: 44, background: `${T.crimson}0D`, border: `1.5px solid ${T.crimson}66`, borderRadius: 10, fontSize: 12, fontWeight: 700, color: T.crimson, cursor: glSaving ? "not-allowed" : "pointer", fontFamily: FONT.ui, opacity: glSaving ? 0.6 : 1 }}>
                                        ⏸ Take Offline
                                    </button>
                                    <button onClick={confirmGoLive} disabled={glPrice <= 0 || glSaving}
                                        style={{ flex: 2, height: 44, background: glPrice > 0 ? `linear-gradient(135deg, #1e3a5f, #374151)` : T.surfaceContainerHigh, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800, color: glPrice > 0 ? "#FFFFFF" : T.t3, cursor: glPrice > 0 && !glSaving ? "pointer" : "not-allowed", fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: glSaving ? 0.7 : 1 }}>
                                        {glSaving ? "Saving…" : "✏ Save Changes"}
                                    </button>
                                </div>
                            ) : (
                                /* Go Live mode: Cancel | Confirm & Go Live */
                                <div style={{ display: "flex", gap: 10 }}>
                                    <button onClick={() => !glSaving && setGoLiveProd(null)}
                                        style={{ flex: 1, height: 44, background: "#FFFFFF", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t2, cursor: glSaving ? "not-allowed" : "pointer", fontFamily: FONT.ui }}>
                                        Cancel
                                    </button>
                                    <button onClick={confirmGoLive} disabled={glPrice <= 0 || glSaving}
                                        style={{ flex: 2, height: 44, background: glPrice > 0 ? `linear-gradient(135deg, ${T.amber}, #6A020A)` : T.surfaceContainerHigh, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, color: glPrice > 0 ? "#FFFFFF" : T.t3, cursor: glPrice > 0 && !glSaving ? "pointer" : "not-allowed", fontFamily: FONT.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: glPrice > 0 ? "0 3px 12px rgba(139,30,30,0.35)" : "none", opacity: glSaving ? 0.7 : 1 }}>
                                        {glSaving ? "Saving…" : "🚀 Confirm & Go Live"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Add Quantity Modal ── rendered via portal to escape stacking context */}
            {addQtyItem && createPortal(
                <div style={{ position: "fixed", inset: 0, zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                    <div onClick={() => !addQtySaving && setAddQtyItem(null)} style={{ position: "absolute", inset: 0, background: "rgba(28,27,27,0.6)", backdropFilter: "blur(4px)" }} />
                    <div style={{ position: "relative", background: "#FFFFFF", borderRadius: 18, width: "100%", maxWidth: 400, boxShadow: "0 32px 80px rgba(0,0,0,0.28)", overflow: "hidden", animation: "fadeUp 0.2s ease" }}>
                        <div style={{ background: `linear-gradient(135deg, ${T.sky}, #1e3a5f)`, padding: "20px 24px 16px" }}>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT.ui }}>Add Stock</div>
                            <div style={{ fontSize: 17, fontWeight: 900, color: "#FFFFFF", fontFamily: FONT.display }}>{addQtyItem.name}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>Current stock: {addQtyItem.stock} units</div>
                        </div>
                        <div style={{ padding: "24px" }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 10, fontFamily: FONT.ui }}>Units to Add</label>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                                <button onClick={() => setAddQtyAmount(q => Math.max(1, q - 1))}
                                    style={{ width: 38, height: 38, borderRadius: 9, border: `1px solid ${T.border}`, background: T.bg, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                                <input type="number" value={addQtyAmount} min={1}
                                    onChange={e => setAddQtyAmount(Math.max(1, +e.target.value))}
                                    style={{ flex: 1, height: 48, background: T.bg, border: `2px solid ${T.sky}`, borderRadius: 10, textAlign: "center", fontSize: 24, fontWeight: 900, color: T.t1, fontFamily: FONT.mono, outline: "none" }} />
                                <button onClick={() => setAddQtyAmount(q => q + 1)}
                                    style={{ width: 38, height: 38, borderRadius: 9, border: `1px solid ${T.border}`, background: T.bg, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                                <button onClick={() => !addQtySaving && setAddQtyItem(null)}
                                    style={{ flex: 1, height: 44, background: "#FFFFFF", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.t2, cursor: addQtySaving ? "not-allowed" : "pointer", fontFamily: FONT.ui }}>Cancel</button>
                                <button onClick={confirmAddQty} disabled={addQtySaving}
                                    style={{ flex: 2, height: 44, background: `linear-gradient(135deg, ${T.sky}, #1e3a5f)`, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, color: "#FFFFFF", cursor: addQtySaving ? "not-allowed" : "pointer", fontFamily: FONT.ui, opacity: addQtySaving ? 0.7 : 1 }}>
                                    {addQtySaving ? "Saving…" : `+ Add ${addQtyAmount} Unit${addQtyAmount !== 1 ? "s" : ""}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Create Job Card Modal */}
            <JobCardCreateModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                vehicles={shopVehicles}
                parties={shopParties}
                products={shopProducts}
                activeShopId={activeShopId}
                existingCount={shopJobs.length}
                onSave={(jc: any) => { onSaveJobCard(jc); setShowCreate(false); toast?.(`Job Card ${jc.jobNumber} created!`, "success", "🔧 Workshop"); }}
            />
        </div>
    );
}

// ─── Create Job Card Modal (unchanged logic) ──────────────────────────────────
function JobCardCreateModal({ open, onClose, vehicles, parties, products, activeShopId, existingCount, onSave }: any) {
    const [vehicleId, setVehicleId]       = useState("");
    const [customerId, setCustomerId]     = useState("");
    const [complaints, setComplaints]     = useState("");
    const [diagnosis, setDiagnosis]       = useState("");
    const [assignedTo, setAssignedTo]     = useState("");
    const [selectedParts, setSelectedParts] = useState<any[]>([]);
    const [labourDesc, setLabourDesc]     = useState("");
    const [labourAmt, setLabourAmt]       = useState("");

    const handleAddPart = (pId: string) => {
        const prod = products.find((p: any) => p.id === pId);
        if (prod && !selectedParts.find(sp => sp.itemId === pId)) {
            setSelectedParts(prev => [...prev, { itemId: pId, name: prod.name, qty: 1, price: prod.sellPrice }]);
        }
    };

    const handleSave = () => {
        if (!vehicleId || !complaints.trim()) return;
        const labour = labourDesc && labourAmt ? [{ description: labourDesc, amount: +labourAmt }] : [];
        const estimated = selectedParts.reduce((s, p) => s + p.qty * p.price, 0) + labour.reduce((s, l) => s + l.amount, 0);
        onSave({
            id: "jc_" + uid(),
            shopId: activeShopId,
            jobNumber: `#RP-${String(9000 + existingCount + 1)}`,
            vehicleId,
            customerId: customerId || vehicles.find((v: any) => v.id === vehicleId)?.ownerId || "",
            status: "draft",
            assignedTo: assignedTo || null,
            estimatedAmount: estimated,
            actualAmount: null,
            complaints,
            diagnosis,
            checklist: [
                { task: "Initial inspection",  status: "pending" },
                { task: "Parts procurement",   status: "pending" },
                { task: "Repair / Service",    status: "pending" },
                { task: "Quality check",       status: "pending" },
                { task: "Test drive",          status: "pending" },
            ],
            parts: selectedParts,
            labour,
            startedAt: null,
            completedAt: null,
            createdAt: Date.now(),
        });
        setVehicleId(""); setCustomerId(""); setComplaints(""); setDiagnosis(""); setAssignedTo(""); setSelectedParts([]); setLabourDesc(""); setLabourAmt("");
    };

    const customers = parties.filter((p: any) => p.type === "customer" || p.type === "both");

    return (
        <Modal open={open} onClose={onClose} title="🔧 New Job Card" subtitle="Create a workshop job card" width={640}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Vehicle" required>
                    <Select value={vehicleId} onChange={(v: string) => { setVehicleId(v); const veh = vehicles.find((x: any) => x.id === v); if (veh) setCustomerId(veh.ownerId); }}
                        options={[{ value: "", label: "Select vehicle…" }, ...vehicles.map((v: any) => ({ value: v.id, label: `${v.registrationNumber} — ${v.make} ${v.model}` }))]} />
                </Field>
                <Field label="Customer">
                    <Select value={customerId} onChange={setCustomerId}
                        options={[{ value: "", label: "Auto from vehicle" }, ...customers.map((c: any) => ({ value: c.id, label: c.name }))]} />
                </Field>
                <Field label="Technician">
                    <Input value={assignedTo} onChange={setAssignedTo} placeholder="e.g. David K." />
                </Field>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.ui }}>Job # auto-assigned as <span style={{ fontFamily: FONT.mono, color: T.amber }}>#RP-{9001 + existingCount}</span></div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                    <Field label="Customer Complaint" required>
                        <Input value={complaints} onChange={setComplaints} placeholder="Describe the issue…" />
                    </Field>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                    <Field label="Diagnosis">
                        <Input value={diagnosis} onChange={setDiagnosis} placeholder="Your assessment…" />
                    </Field>
                </div>

                <Divider label="Parts" />
                <div style={{ gridColumn: "span 2" }}>
                    <Select value="" onChange={handleAddPart}
                        options={[{ value: "", label: "Add part…" }, ...products.filter((p: any) => p.stock > 0).map((p: any) => ({ value: p.id, label: `${p.name} (${p.stock} in stock) — ${fmt(p.sellPrice)}` }))]} />
                    {selectedParts.length > 0 && (
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                            {selectedParts.map((sp, i) => (
                                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", background: T.bg, borderRadius: 6, fontSize: 12 }}>
                                    <span style={{ flex: 1, color: T.t1 }}>{sp.name}</span>
                                    <Input type="number" value={String(sp.qty)} onChange={(v: string) => { const arr = [...selectedParts]; arr[i] = { ...arr[i], qty: +v || 1 }; setSelectedParts(arr); }} style={{ width: 60 }} />
                                    <span style={{ fontFamily: FONT.mono, color: T.amber }}>{fmt(sp.qty * sp.price)}</span>
                                    <button onClick={() => setSelectedParts(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: T.crimson, cursor: "pointer", fontSize: 16 }}>✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Divider label="Labour" />
                <Field label="Labour Description"><Input value={labourDesc} onChange={setLabourDesc} placeholder="e.g. Full service labour" /></Field>
                <Field label="Labour Amount (₹)"><Input type="number" value={labourAmt} onChange={setLabourAmt} prefix="₹" /></Field>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
                <Btn variant="amber" onClick={handleSave}>🔧 Create Job Card</Btn>
            </div>
        </Modal>
    );
}
