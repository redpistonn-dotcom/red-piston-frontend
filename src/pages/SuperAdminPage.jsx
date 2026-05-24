import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { api } from "../api/client.js";
import { T, FONT } from "../theme.js";
import { Avatar } from "../components/Avatar.jsx";
import { MANUFACTURERS, MODELS } from "../data/vehicleData.js";

// Color map by slug — uses T.* theme tokens
const SLUG_COLORS = {
  PLATFORM_ADMIN: { bg: T.violetBg, border: T.violet, text: T.violet },
  SHOP_OWNER:     { bg: T.emeraldBg, border: T.emerald, text: T.emerald },
  CUSTOMER:       { bg: T.skyBg,     border: T.sky,     text: T.sky     },
  SHOP_STAFF:     { bg: "rgba(251,191,36,0.1)", border: "#D97706", text: "#FBBF24" },
};

// Only show these 3 roles in filters/dropdowns
const ALLOWED_ROLE_SLUGS = ["PLATFORM_ADMIN", "SHOP_OWNER", "CUSTOMER"];

function RoleBadge({ slug, name }) {
  const c = SLUG_COLORS[slug] || { bg: "#1a1a2e", border: "#444", text: "#aaa" };
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
      letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>
      {name || slug}
    </span>
  );
}

function VerificationBadge({ status }) {
  const base = { borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: FONT.ui };
  if (status === "PENDING") return (
    <span style={{ ...base, background: "rgba(251,191,36,0.1)", border: "1px solid #D97706", color: "#FBBF24" }}>⏳ Pending</span>
  );
  if (status === "REJECTED") return (
    <span style={{ ...base, background: T.crimsonBg, border: `1px solid ${T.crimson}`, color: T.crimson }}>✗ Rejected</span>
  );
  return (
    <span style={{ ...base, background: T.emeraldBg, border: `1px solid ${T.emerald}`, color: T.emerald }}>✓ Approved</span>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
function AddUserModal({ userTypes, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState("CUSTOMER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allowedTypes = userTypes.filter(ut => ALLOWED_ROLE_SLUGS.includes(ut.slug));

  const handleSubmit = async () => {
    if (!email.trim()) { setError("Email is required"); return; }
    if (!password || password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!role) { setError("Select a user type"); return; }
    setError(""); setLoading(true);
    try {
      const res = await api.post("/api/admin/users/create", { name: name.trim() || undefined, email: email.trim(), password, role });
      onSuccess(res.data);
    } catch (e) {
      setError(e.data?.error?.message || e.message || "Failed to create user");
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
        padding: 32, maxWidth: 440, width: "100%", margin: "0 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>Add User</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.t3, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ background: "#1c0909", border: `1.5px solid ${T.crimson}`, borderRadius: 10, padding: "10px 14px", color: T.crimson, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 6, display: "block" }}>Name <span style={{ color: T.t3, fontWeight: 400 }}>(optional)</span></label>
        <input
          style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", color: T.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box", marginBottom: 14 }}
          placeholder="e.g. Raju Sharma"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <label style={{ fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 6, display: "block" }}>Email *</label>
        <input
          style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", color: T.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box", marginBottom: 14 }}
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />

        <label style={{ fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 6, display: "block" }}>Password *</label>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <input
            style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "11px 44px 11px 14px", color: T.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box" }}
            type={showPw ? "text" : "password"}
            placeholder="Min 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          <button
            type="button"
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: T.t3, cursor: "pointer", fontSize: 16 }}
            onClick={() => setShowPw(v => !v)}
          >
            {showPw ? "🙈" : "👁"}
          </button>
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 6, display: "block" }}>User Type *</label>
        <select
          style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", color: T.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box", marginBottom: 24, cursor: "pointer" }}
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          {allowedTypes.map(ut => (
            <option key={ut.slug} value={ut.slug}>{ut.name}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, color: T.t3, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{ flex: 2, padding: "12px", background: loading ? T.amberDim : T.amber, border: "none", borderRadius: 10, color: loading ? "#aaa" : "#000", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT.ui }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Catalog Tab — Upload Excel → DB Import ───────────────────────────────────

// Maps common Excel header names → DB field names (case-insensitive, underscore→space)
const DETECT_MAP = {
  'oem number': 'oemNumber', 'oem_number': 'oemNumber', 'part number': 'oemNumber',
  'part_number': 'oemNumber', 'part no': 'oemNumber', 'part no.': 'oemNumber',
  'partno': 'oemNumber', 'material': 'oemNumber', 'item code': 'oemNumber', 'item no': 'oemNumber',
  'part name': 'partName', 'part_name': 'partName', 'description': 'partName',
  'material description': 'partName', 'item name': 'partName', 'name': 'partName', 'product name': 'partName',
  'brand': 'brand', 'manufacturer': 'brand', 'make': 'brand',
  'category': 'categoryL1', 'category l1': 'categoryL1', 'category_l1': 'categoryL1', 'cat1': 'categoryL1',
  'category l2': 'categoryL2', 'category_l2': 'categoryL2', 'sub category': 'categoryL2',
  'category l3': 'categoryL3', 'category_l3': 'categoryL3',
  'hsn': 'hsnCode', 'hsn code': 'hsnCode', 'hsn_code': 'hsnCode',
  'gst': 'gstRate', 'gst rate': 'gstRate', 'gst_rate': 'gstRate', 'gst %': 'gstRate', 'gst%': 'gstRate',
  'unit': 'unitOfSale', 'unit of sale': 'unitOfSale', 'uom': 'unitOfSale',
  'mrp': 'mrp', 'max retail price': 'mrp', 'maximum retail price': 'mrp', 'selling price': 'mrp', 'sell price': 'mrp',
  'buy price': 'buyPrice', 'buying price': 'buyPrice', 'cost price': 'buyPrice', 'purchase price': 'buyPrice', 'pl01': 'buyPrice',
  'long description': 'description', 'remarks': 'description', 'product description': 'description',
  'alternate oem': 'alternateOem', 'alternate oem numbers': 'alternateOem', 'alt oem': 'alternateOem', 'cross reference': 'alternateOem',
  'weight': 'weightGrams', 'weight grams': 'weightGrams', 'weight (g)': 'weightGrams', 'weight (gm)': 'weightGrams', 'wt': 'weightGrams',
  // Vehicle fitment columns
  'vehicle make': 'vehicleMake', 'car make': 'vehicleMake', 'applicable make': 'vehicleMake',
  'vehicle model': 'vehicleModel', 'car model': 'vehicleModel', 'applicable model': 'vehicleModel', 'model name': 'vehicleModel',
  'year': 'yearFrom', 'year from': 'yearFrom', 'year start': 'yearFrom', 'applicable year': 'yearFrom',
  'year to': 'yearTo', 'year end': 'yearTo', 'to year': 'yearTo',
  'fuel type': 'fuelType', 'fuel': 'fuelType',
  'variant': 'variant', 'vehicle variant': 'variant', 'car variant': 'variant',
};

// Template columns shown in sample Excel
const TEMPLATE_COLS = [
  { key: 'oemNumber',    label: 'OEM Number',            required: true,  example: '265C0-00QAG',                   note: 'Primary OEM/part number — must be unique (required)' },
  { key: 'partName',     label: 'Part Name',             required: true,  example: 'Brake Pad Set Front',            note: 'Display name shown to customers (required)' },
  { key: 'brand',        label: 'Brand',                 required: false, example: 'Bosch',                          note: 'Manufacturer brand name' },
  { key: 'categoryL1',   label: 'Category L1',           required: false, example: 'Brakes',                         note: 'Top category: Brakes / Engine / Filters / Suspension / Electrical / Body' },
  { key: 'categoryL2',   label: 'Category L2',           required: false, example: 'Brake Pads',                     note: 'Sub-category under Category L1' },
  { key: 'categoryL3',   label: 'Category L3',           required: false, example: 'Disc Brake Pads',                note: 'Further classification' },
  { key: 'hsnCode',      label: 'HSN Code',              required: false, example: '87083000',                       note: 'HSN code for GST filing — required for invoicing' },
  { key: 'gstRate',      label: 'GST Rate',              required: false, example: '18',                             note: '18 or 28 — defaults to 18 if blank' },
  { key: 'unitOfSale',   label: 'Unit of Sale',          required: false, example: 'Piece',                          note: 'Piece / Set / Pair / Litre / KG / Box' },
  { key: 'mrp',          label: 'MRP',                   required: false, example: '850',                            note: 'Max Retail Price — reference for shops when setting their selling price' },
  { key: 'buyPrice',     label: 'Buy Price',             required: false, example: '600',                            note: 'Supplier cost price — reference for shops' },
  { key: 'description',  label: 'Description',           required: false, example: 'High-performance ceramic brake pads with low dust', note: 'Detailed product description' },
  { key: 'alternateOem', label: 'Alternate OEM Numbers', required: false, example: '265C0-00QAF, 34116776683',       note: 'Comma-separated cross-reference OEM numbers' },
  { key: 'weightGrams',  label: 'Weight Grams',          required: false, example: '420',                            note: 'Weight in grams (used for shipping calculation)' },
  // ── Vehicle Fitment (optional) ───────────────────────────────────────────────
  { key: 'vehicleMake',  label: 'Vehicle Make',           required: false, example: 'Maruti Suzuki',                  note: 'Vehicle manufacturer — creates fitment link in database' },
  { key: 'vehicleModel', label: 'Vehicle Model',          required: false, example: 'Swift',                          note: 'Vehicle model name — must be paired with Vehicle Make' },
  { key: 'yearFrom',     label: 'Year From',              required: false, example: '2015',                           note: 'Compatible from this year' },
  { key: 'yearTo',       label: 'Year To',                required: false, example: '2023',                           note: 'Compatible up to this year (blank = present)' },
  { key: 'fuelType',     label: 'Fuel Type',              required: false, example: 'Petrol',                         note: 'Petrol / Diesel / CNG / Electric' },
  { key: 'variant',      label: 'Variant',                required: false, example: 'VXI',                            note: 'Specific trim/variant — leave blank for all variants' },
];

const BATCH_SIZE = 200;

// All DB fields used for column analysis panel
const DB_FIELDS = [
  { key: 'oemNumber',    label: 'OEM Number',            section: 'required' },
  { key: 'partName',     label: 'Part Name',             section: 'required' },
  { key: 'brand',        label: 'Brand',                 section: 'core' },
  { key: 'categoryL1',   label: 'Category L1',           section: 'core' },
  { key: 'categoryL2',   label: 'Category L2',           section: 'core' },
  { key: 'categoryL3',   label: 'Category L3',           section: 'core' },
  { key: 'hsnCode',      label: 'HSN Code',              section: 'core' },
  { key: 'gstRate',      label: 'GST Rate',              section: 'core' },
  { key: 'unitOfSale',   label: 'Unit of Sale',          section: 'core' },
  { key: 'mrp',          label: 'MRP',                   section: 'core' },
  { key: 'buyPrice',     label: 'Buy Price',             section: 'core' },
  { key: 'description',  label: 'Description',           section: 'core' },
  { key: 'weightGrams',  label: 'Weight (grams)',        section: 'core' },
  { key: 'alternateOem', label: 'Alternate OEM Numbers', section: 'core' },
  { key: 'vehicleMake',  label: 'Vehicle Make',          section: 'fitment' },
  { key: 'vehicleModel', label: 'Vehicle Model',         section: 'fitment' },
  { key: 'yearFrom',     label: 'Year From',             section: 'fitment' },
  { key: 'yearTo',       label: 'Year To',               section: 'fitment' },
  { key: 'fuelType',     label: 'Fuel Type',             section: 'fitment' },
  { key: 'variant',      label: 'Variant',               section: 'fitment' },
];

const PART_CATEGORIES = [
  '', 'Brakes', 'Engine', 'Filters', 'Electrical', 'Suspension', 'Steering',
  'Transmission', 'Cooling System', 'Exhaust', 'Fuel System', 'Lighting',
  'Body Parts', 'Tyres & Wheels', 'AC & Heating', 'Lubricants & Oils',
  'Bearings', 'Gaskets & Seals', 'Belts & Chains', 'Clutch', 'Battery & Charging',
];

// Vehicle types stored in vehicle_types DB table — mirrored here for the import dropdown
const VEHICLE_TYPES = [
  { slug: 'car',         label: 'Car / Passenger Vehicle',      icon: '🚗' },
  { slug: '2wheeler',    label: 'Motorcycle / 2-Wheeler',        icon: '🏍️' },
  { slug: 'commercial',  label: 'Commercial Vehicle (LCV/HCV)',  icon: '🚚' },
  { slug: 'tractor',     label: 'Tractor / Farm Equipment',      icon: '🚜' },
  { slug: 'autorickshaw',label: 'Auto Rickshaw / 3-Wheeler',     icon: '🛺' },
  { slug: 'ev',          label: 'Electric Vehicle',              icon: '⚡' },
];

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const headers = TEMPLATE_COLS.map(c => c.label);
  const ex1 = TEMPLATE_COLS.map(c => c.example);
  const ex2 = ['580B7-01QAA', 'Oil Filter', 'Denso', 'Engine', 'Filters', 'Oil Filters', '84073290', '18', 'Piece', '320', '220', 'Genuine Denso oil filter for petrol engines', '', '185'];
  const ws = XLSX.utils.aoa_to_sheet([headers, ex1, ex2]);
  ws['!cols'] = TEMPLATE_COLS.map(c => ({ wch: Math.max(c.label.length, c.example.length) + 4 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Parts Template');
  const instrWs = XLSX.utils.aoa_to_sheet([
    ['Column Name', 'Required?', 'Example Value', 'Description'],
    ...TEMPLATE_COLS.map(c => [c.label, c.required ? 'REQUIRED' : 'Optional', c.example, c.note]),
  ]);
  instrWs['!cols'] = [{ wch: 26 }, { wch: 10 }, { wch: 38 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions');
  XLSX.writeFile(wb, 'RedPiston_Parts_Import_Template.xlsx');
}

async function parseExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
  if (rows.length === 0) throw new Error('The file has no data rows');
  const headers = Object.keys(rows[0]);
  const colMap = {};
  for (const h of headers) {
    const norm = h.toLowerCase().trim().replace(/_+/g, ' ');
    if (DETECT_MAP[norm]) colMap[h] = DETECT_MAP[norm];
  }
  const parts = rows.map(row => {
    const p = {};
    for (const [col, field] of Object.entries(colMap)) {
      const v = row[col];
      if (v !== null && v !== undefined && String(v).trim() !== '') p[field] = String(v).trim();
    }
    return p;
  }).filter(p => p.oemNumber || p.partName);
  return { headers, colMap, parts, total: rows.length, mapped: parts.length, preview: rows.slice(0, 5) };
}

function CatalogTab() {
  const [view, setView] = useState('import');

  const [fileData, setFileData] = useState(null);
  const [parsing, setParsing]   = useState(false);
  const [parseErr, setParseErr] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const [importing, setImporting]   = useState(false);
  const [importProg, setImportProg] = useState(null);
  const [importDone, setImportDone] = useState(false);

  // 'idle' → 'analyzing' (show column analysis + confirm) → 'confirmed' (show import button)
  const [analysisStep, setAnalysisStep] = useState('idle');
  const [defaultCategory,    setDefaultCategory]    = useState('');
  const [defaultVehicleType, setDefaultVehicleType] = useState('');
  const [defaultMake,        setDefaultMake]        = useState('');
  const [defaultModel,       setDefaultModel]       = useState('');

  const [dbParts, setDbParts]     = useState([]);
  const [dbTotal, setDbTotal]     = useState(0);
  const [dbStats, setDbStats]     = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbSearch, setDbSearch]   = useState('');
  const [dbOffset, setDbOffset]   = useState(0);
  const DB_LIMIT = 50;

  const fetchDbStats = useCallback(async () => {
    try { const res = await api.get('/api/admin/catalog/stats'); setDbStats(res.data); } catch { /* offline */ }
  }, []);

  const fetchDbParts = useCallback(async (q, off) => {
    setDbLoading(true);
    try {
      const params = { limit: DB_LIMIT, offset: off };
      if (q) params.q = q;
      const res = await api.get('/api/admin/catalog/parts', params);
      setDbParts(res.data || []);
      setDbTotal(res.total || 0);
    } catch { setDbParts([]); }
    setDbLoading(false);
  }, []);

  useEffect(() => {
    if (view === 'live') { fetchDbStats(); fetchDbParts('', 0); }
  }, [view]); // eslint-disable-line

  useEffect(() => {
    if (view !== 'live') return;
    const t = setTimeout(() => { setDbOffset(0); fetchDbParts(dbSearch, 0); }, 350);
    return () => clearTimeout(t);
  }, [dbSearch]); // eslint-disable-line

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { setParseErr('Upload an Excel (.xlsx, .xls) or CSV (.csv) file'); return; }
    setParsing(true); setParseErr(''); setFileData(null); setImportDone(false); setImportProg(null);
    setAnalysisStep('idle'); setDefaultCategory(''); setDefaultVehicleType(''); setDefaultMake(''); setDefaultModel('');
    try {
      const parsed = await parseExcel(file);
      setFileData({ name: file.name, ...parsed });
      setAnalysisStep('analyzing');
    }
    catch (e) { setParseErr(e.message || 'Failed to parse file — check the format'); }
    setParsing(false);
  };

  const handleImport = async () => {
    if (!fileData || importing) return;
    setImporting(true);
    const parts = fileData.parts;
    let created = 0, updated = 0, unchanged = 0, invalid = 0, fitments = 0;
    setImportProg({ done: 0, total: parts.length, created: 0, updated: 0, unchanged: 0, invalid: 0, fitments: 0 });
    for (let i = 0; i < parts.length; i += BATCH_SIZE) {
      const batch = parts.slice(i, i + BATCH_SIZE);
      try {
        const res = await api.post('/api/admin/catalog/bulk-import', {
          parts: batch.map(p => ({
            partName:            p.partName || p.oemNumber,
            oemNumber:           p.oemNumber || null,
            brand:               p.brand || null,
            categoryL1:          p.categoryL1 || defaultCategory || null,
            categoryL2:          p.categoryL2 || null,
            categoryL3:          p.categoryL3 || null,
            hsnCode:             p.hsnCode || null,
            gstRate:             p.gstRate ? parseFloat(p.gstRate) : undefined,
            unit:                p.unitOfSale || null,
            description:         p.description || null,
            mrp:                 p.mrp ? parseFloat(p.mrp) : undefined,
            buyPrice:            p.buyPrice ? parseFloat(p.buyPrice) : undefined,
            alternateOemNumbers: p.alternateOem ? p.alternateOem.split(',').map(s => s.trim()).filter(Boolean) : undefined,
            weightGrams:         p.weightGrams ? parseInt(p.weightGrams) : undefined,
            // Vehicle fitment — column values take priority; batch defaults fill gaps
            vehicleMake:         p.vehicleMake || defaultMake || null,
            vehicleModel:        p.vehicleModel || defaultModel || null,
            vehicleType:         defaultVehicleType || 'Car',
            yearFrom:            p.yearFrom ? parseInt(p.yearFrom) : undefined,
            yearTo:              p.yearTo ? parseInt(p.yearTo) : undefined,
            fuelType:            p.fuelType || null,
            variant:             p.variant || null,
          })),
        });
        created   += res.data.created;
        updated   += res.data.updated;
        unchanged += res.data.unchanged || 0;
        invalid   += res.data.invalid   || 0;
        fitments  += res.data.fitments  || 0;
      } catch (err) { invalid += batch.length; }
      setImportProg({ done: Math.min(i + BATCH_SIZE, parts.length), total: parts.length, created, updated, unchanged, invalid, fitments });
    }
    setImportDone(true); setImporting(false); fetchDbStats();
  };

  const S = {
    subTab: (active) => ({ padding: '10px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'none', fontFamily: "'Inter', sans-serif", color: active ? '#FF1F3A' : '#af8785', borderBottom: active ? '2px solid #FF1F3A' : '2px solid transparent', transition: 'all 0.15s', letterSpacing: '0.02em' }),
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #3F3F46', marginBottom: 24 }}>
        {[{ key: 'import', label: '⬆ Import Excel' }, { key: 'live', label: '🗄 Live Database' }].map(t => (
          <button key={t.key} onClick={() => setView(t.key)} style={S.subTab(view === t.key)}>{t.label}</button>
        ))}
      </div>

      {view === 'import' && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e3e1ec', fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>Import Parts to Master Catalog</div>
              <div style={{ fontSize: 12, color: '#af8785', fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
                Upload any supplier Excel or CSV. Columns are auto-detected and mapped — then sent to the live database in batches.
              </div>
            </div>
            <button onClick={downloadTemplate} style={{ flexShrink: 0, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '9px 16px', color: '#93C5FD', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              📥 Download Sample Template
            </button>
          </div>

          {parseErr && (
            <div style={{ background: '#1c0909', border: '1px solid #EF4444', borderRadius: 10, padding: '12px 16px', color: '#EF4444', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>⚠</span><span style={{ flex: 1 }}>{parseErr}</span>
              <button onClick={() => setParseErr('')} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          )}

          {parsing && (
            <div style={{ background: '#0d0e15', border: '1px solid #292931', borderRadius: 12, padding: '52px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⟳</div>
              <div style={{ color: '#af8785', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Reading and parsing file…</div>
            </div>
          )}

          {!fileData && !parsing && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => document.getElementById('_xls_upload').click()}
              style={{ background: dragOver ? 'rgba(255,31,58,0.04)' : '#0d0e15', border: `2px dashed ${dragOver ? '#FF1F3A' : '#3F3F46'}`, borderRadius: 12, padding: '56px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div style={{ fontSize: 48, marginBottom: 14 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e3e1ec', fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}>Drop your Excel or CSV file here</div>
              <div style={{ fontSize: 12, color: '#af8785', fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>
                Supports .xlsx · .xls · .csv &nbsp;·&nbsp; Column names auto-detected
              </div>
              <span style={{ background: 'rgba(255,31,58,0.1)', border: '1px solid rgba(255,31,58,0.4)', color: '#FF1F3A', borderRadius: 8, padding: '10px 22px', fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
                Choose File
              </span>
              <input id="_xls_upload" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
            </div>
          )}

          {fileData && !parsing && (
            <div>
              {/* File info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#e3e1ec', fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>{fileData.name}</div>
                  <div style={{ fontSize: 11, color: '#af8785', marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                    {fileData.total.toLocaleString()} rows &nbsp;·&nbsp;
                    <span style={{ color: '#10B981' }}>{fileData.mapped.toLocaleString()} parts ready</span>
                    {fileData.total !== fileData.mapped && <span> &nbsp;·&nbsp; {(fileData.total - fileData.mapped).toLocaleString()} skipped (no OEM and no Name)</span>}
                  </div>
                </div>
                <button onClick={() => { setFileData(null); setImportDone(false); setImportProg(null); setParseErr(''); setAnalysisStep('idle'); setDefaultCategory(''); setDefaultVehicleType(''); setDefaultMake(''); setDefaultModel(''); }}
                  style={{ background: 'none', border: '1px solid #3F3F46', borderRadius: 6, color: '#af8785', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
                  ✕ Clear
                </button>
              </div>

              {/* ── STEP 2: Column Analysis & Confirmation ──────────────── */}
              {analysisStep === 'analyzing' && (() => {
                const dbToExcel = {};
                for (const [col, field] of Object.entries(fileData.colMap)) dbToExcel[field] = col;
                const unrecognized = fileData.headers.filter(h => !fileData.colMap[h]);
                const fitmentMapped = DB_FIELDS.filter(f => f.section === 'fitment' && dbToExcel[f.key]);
                const missingRequired = DB_FIELDS.filter(f => f.section === 'required' && !dbToExcel[f.key]);
                return (
                  <div style={{ background: '#0d0e15', border: '1px solid #292931', borderRadius: 12, padding: '20px', marginBottom: 14 }}>

                    {/* Step 1 — Vehicle + Category defaults */}
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#af8785', textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
                        Step 1 — Set Batch Defaults
                      </div>
                      <div style={{ fontSize: 11, color: '#5e3f3d', fontFamily: "'Inter', sans-serif", marginBottom: 12 }}>
                        These values fill in rows that don't already have the column in the sheet. All optional.
                      </div>

                      {/* Vehicle type + Make + Model — 3 columns */}
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        🚗 Vehicle Fitment
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                        {/* Vehicle Type */}
                        <div>
                          <div style={{ fontSize: 10, color: '#af8785', fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>Vehicle Type</div>
                          <select
                            value={defaultVehicleType}
                            onChange={e => { setDefaultVehicleType(e.target.value); setDefaultMake(''); setDefaultModel(''); }}
                            style={{ width: '100%', background: '#1a1b22', border: '1.5px solid #3F3F46', borderRadius: 7, padding: '8px 10px', color: '#e3e1ec', fontSize: 12, outline: 'none', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}
                          >
                            <option value="">— Any Type —</option>
                            {VEHICLE_TYPES.map(t => (
                              <option key={t.slug} value={t.slug}>{t.icon} {t.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Make — filtered by vehicle type */}
                        <div>
                          <div style={{ fontSize: 10, color: '#af8785', fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>Make (Manufacturer)</div>
                          <select
                            value={defaultMake}
                            onChange={e => { setDefaultMake(e.target.value); setDefaultModel(''); }}
                            style={{ width: '100%', background: '#1a1b22', border: '1.5px solid #3F3F46', borderRadius: 7, padding: '8px 10px', color: '#e3e1ec', fontSize: 12, outline: 'none', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}
                          >
                            <option value="">— Any / Mixed —</option>
                            {MANUFACTURERS
                              .filter(m => !defaultVehicleType || m.vehicleType === defaultVehicleType)
                              .map(m => (
                                <option key={m.id} value={m.name}>{m.logo} {m.name}</option>
                              ))
                            }
                          </select>
                        </div>

                        {/* Model — filtered by selected Make */}
                        <div>
                          <div style={{ fontSize: 10, color: '#af8785', fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>
                            Model {!defaultMake && <span style={{ color: '#3F3F46' }}>(select Make first)</span>}
                          </div>
                          <select
                            value={defaultModel}
                            onChange={e => setDefaultModel(e.target.value)}
                            disabled={!defaultMake}
                            style={{ width: '100%', background: defaultMake ? '#1a1b22' : '#131418', border: `1.5px solid ${defaultMake ? '#3F3F46' : '#232328'}`, borderRadius: 7, padding: '8px 10px', color: defaultMake ? '#e3e1ec' : '#3F3F46', fontSize: 12, outline: 'none', fontFamily: "'Inter', sans-serif", cursor: defaultMake ? 'pointer' : 'not-allowed' }}
                          >
                            <option value="">— All Models —</option>
                            {(() => {
                              const mfg = MANUFACTURERS.find(mf => mf.name === defaultMake);
                              return mfg
                                ? MODELS
                                    .filter(m => m.mfgId === mfg.id)
                                    .map(m => (
                                      <option key={m.id} value={m.name}>{m.name} ({m.yearFrom}–{m.yearTo ?? 'present'})</option>
                                    ))
                                : null;
                            })()}
                          </select>
                        </div>
                      </div>

                      {/* Live preview of selected vehicle */}
                      {defaultMake && (
                        <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 7, padding: '7px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14 }}>🔗</span>
                          <span style={{ fontSize: 11, color: '#C4B5FD', fontFamily: "'JetBrains Mono', monospace" }}>
                            Fitment will be created for:&nbsp;
                            <strong>{defaultVehicleType ? VEHICLE_TYPES.find(t=>t.slug===defaultVehicleType)?.icon+' ' : ''}{defaultMake}</strong>
                            {defaultModel && <> → <strong>{defaultModel}</strong></>}
                            {!defaultModel && <span style={{ color: '#8B5CF6', fontWeight: 400 }}> (all models)</span>}
                          </span>
                        </div>
                      )}

                      {/* Parts category */}
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        📦 Parts Category
                      </div>
                      <select
                        value={defaultCategory}
                        onChange={e => setDefaultCategory(e.target.value)}
                        style={{ width: '100%', background: '#1a1b22', border: '1.5px solid #3F3F46', borderRadius: 7, padding: '8px 12px', color: '#e3e1ec', fontSize: 12, outline: 'none', fontFamily: "'Inter', sans-serif", cursor: 'pointer' }}
                      >
                        {PART_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c === '' ? '— Mixed / Multiple categories (leave blank)' : c}</option>
                        ))}
                      </select>
                      {defaultCategory && (
                        <div style={{ marginTop: 6, fontSize: 10, color: '#F59E0B', fontFamily: "'Inter', sans-serif" }}>
                          📂 All rows without a Category L1 column will be tagged as: <strong>{defaultCategory}</strong>
                        </div>
                      )}
                    </div>

                    {/* Step 2 — Column match analysis */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#af8785', textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>
                        Step 2 — Column Analysis &nbsp;·&nbsp;
                        <span style={{ color: '#10B981' }}>{Object.keys(fileData.colMap).length} matched</span>
                        &nbsp;/&nbsp;{fileData.headers.length} Excel columns
                        {unrecognized.length > 0 && <span style={{ color: '#5e3f3d' }}> &nbsp;·&nbsp; {unrecognized.length} unrecognized</span>}
                      </div>

                      {/* Required */}
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Required Fields</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 16 }}>
                        {DB_FIELDS.filter(f => f.section === 'required').map(f => {
                          const col = dbToExcel[f.key];
                          return (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: col ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${col ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.35)'}`, borderRadius: 7, padding: '7px 10px' }}>
                              <span style={{ fontSize: 13, color: col ? '#10B981' : '#EF4444', flexShrink: 0, marginTop: 1 }}>{col ? '✓' : '✗'}</span>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: col ? '#e3e1ec' : '#EF4444', fontFamily: "'Inter', sans-serif" }}>{f.label}</div>
                                <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                                  {col ? <span style={{ color: '#10B981' }}>← "{col}"</span> : <span style={{ color: '#EF4444' }}>NOT FOUND IN FILE</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Optional core */}
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#af8785', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Optional — Parts Data</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 16 }}>
                        {DB_FIELDS.filter(f => f.section === 'core').map(f => {
                          const col = dbToExcel[f.key];
                          return (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 8px', borderRadius: 6, background: col ? 'rgba(16,185,129,0.04)' : 'rgba(0,0,0,0.2)', border: `1px solid ${col ? 'rgba(16,185,129,0.15)' : '#1e1f26'}` }}>
                              <span style={{ fontSize: 11, color: col ? '#10B981' : '#3F3F46', flexShrink: 0, marginTop: 1 }}>{col ? '✓' : '—'}</span>
                              <div>
                                <div style={{ fontSize: 10, color: col ? '#c9c6c5' : '#5e3f3d', fontFamily: "'Inter', sans-serif" }}>{f.label}</div>
                                {col && <div style={{ fontSize: 9, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>"{col}"</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Vehicle fitment */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: fitmentMapped.length > 0 ? '#3B82F6' : '#5e3f3d', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>
                          Vehicle Fitment
                        </div>
                        {fitmentMapped.length > 0
                          ? <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6', borderRadius: 4, padding: '1px 8px', fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                              🔗 {fitmentMapped.length} column{fitmentMapped.length > 1 ? 's' : ''} detected — fitment records will be created in part_fitments table
                            </span>
                          : <span style={{ color: '#5e3f3d', fontSize: 9, fontFamily: "'Inter', sans-serif" }}>not found — parts will import without vehicle compatibility data</span>
                        }
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: fitmentMapped.length > 0 || unrecognized.length > 0 ? 16 : 0 }}>
                        {DB_FIELDS.filter(f => f.section === 'fitment').map(f => {
                          const col = dbToExcel[f.key];
                          return (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 8px', borderRadius: 6, background: col ? 'rgba(59,130,246,0.06)' : 'rgba(0,0,0,0.15)', border: `1px solid ${col ? 'rgba(59,130,246,0.2)' : '#1e1f26'}` }}>
                              <span style={{ fontSize: 11, color: col ? '#3B82F6' : '#3F3F46', flexShrink: 0, marginTop: 1 }}>{col ? '✓' : '—'}</span>
                              <div>
                                <div style={{ fontSize: 10, color: col ? '#93C5FD' : '#5e3f3d', fontFamily: "'Inter', sans-serif" }}>{f.label}</div>
                                {col && <div style={{ fontSize: 9, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>"{col}"</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Unrecognized columns */}
                      {unrecognized.length > 0 && (
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#5e3f3d', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 5 }}>
                            Unrecognized Columns ({unrecognized.length}) — will be ignored during import
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {unrecognized.map(h => (
                              <span key={h} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #292931', borderRadius: 4, padding: '2px 8px', fontSize: 10, color: '#5e3f3d', fontFamily: "'JetBrains Mono', monospace" }}>"{h}"</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Warning for missing required */}
                    {missingRequired.length > 0 && (
                      <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#EF4444', fontFamily: "'Inter', sans-serif" }}>
                        ⚠ <strong>{missingRequired.map(f => f.label).join(' and ')}</strong> not found in your file. Rows missing both OEM Number and Part Name will be skipped.
                      </div>
                    )}

                    {/* Confirm button */}
                    <button
                      onClick={() => setAnalysisStep('confirmed')}
                      style={{ width: '100%', background: '#FF1F3A', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em', boxShadow: '0 0 20px rgba(255,31,58,0.2)' }}
                    >
                      ✓ Analysis Done — Proceed to Import →
                    </button>
                  </div>
                );
              })()}

              {/* ── STEP 3: Confirmed — show preview + import button ────────── */}
              {analysisStep === 'confirmed' && (
                <>
                  {/* Column summary (collapsed) */}
                  <div style={{ background: '#0d0e15', border: '1px solid #292931', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#af8785', textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                        {Object.keys(fileData.colMap).length} / {fileData.headers.length} columns matched
                      </div>
                      {defaultMake && (
                        <span style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#C4B5FD', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                          🔗 {defaultMake}{defaultModel ? ` → ${defaultModel}` : ' (all models)'}
                        </span>
                      )}
                      {defaultCategory && (
                        <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                          📂 {defaultCategory}
                        </span>
                      )}
                      {Object.values(fileData.colMap).includes('vehicleMake') && !defaultMake && (
                        <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                          🔗 Vehicle fitment columns in sheet
                        </span>
                      )}
                      <button
                        onClick={() => setAnalysisStep('analyzing')}
                        style={{ marginLeft: 'auto', background: 'none', border: '1px solid #3F3F46', borderRadius: 6, color: '#af8785', cursor: 'pointer', padding: '3px 10px', fontSize: 11, fontFamily: "'Inter', sans-serif" }}
                      >
                        ← Re-analyze
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                      {fileData.headers.map(h => {
                        const m = fileData.colMap[h];
                        return (
                          <span key={h} style={{ background: m ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${m ? 'rgba(16,185,129,0.3)' : '#292931'}`, borderRadius: 5, padding: '3px 8px', fontSize: 10, color: m ? '#10B981' : '#5e3f3d', fontFamily: "'JetBrains Mono', monospace" }}>
                            {h}{m ? ` → ${m}` : ''}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preview table */}
                  <div style={{ background: '#0d0e15', border: '1px solid #292931', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #292931', fontSize: 10, fontWeight: 700, color: '#af8785', textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: "'JetBrains Mono', monospace" }}>
                      Preview — First 5 Rows
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                        <thead>
                          <tr>
                            {fileData.headers.slice(0, 8).map(h => (
                              <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: fileData.colMap[h] ? '#10B981' : '#5e3f3d', borderBottom: '1px solid #292931', textAlign: 'left', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                                {h}
                              </th>
                            ))}
                            {fileData.headers.length > 8 && <th style={{ padding: '8px 12px', fontSize: 10, color: '#3F3F46', borderBottom: '1px solid #292931' }}>+{fileData.headers.length - 8} more</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {fileData.preview.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #1a1a22' }}>
                              {fileData.headers.slice(0, 8).map(h => (
                                <td key={h} style={{ padding: '7px 12px', fontSize: 11, color: '#c9c6c5', fontFamily: "'Inter', sans-serif", maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {row[h] !== null && row[h] !== undefined ? String(row[h]) : <span style={{ color: '#3F3F46' }}>—</span>}
                                </td>
                              ))}
                              {fileData.headers.length > 8 && <td />}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {importDone ? (
                    /* ── Import Complete Summary ── */
                    <div style={{ background: '#0d0e15', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, overflow: 'hidden' }}>
                      {/* Header */}
                      <div style={{ background: 'rgba(16,185,129,0.08)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                        <span style={{ fontSize: 20 }}>✅</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#10B981', fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>Import Complete</div>
                          <div style={{ fontSize: 11, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>
                            {(importProg?.total ?? 0).toLocaleString()} rows processed from {fileData.name}
                          </div>
                        </div>
                        <button onClick={() => setView('live')}
                          style={{ background: '#FF1F3A', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                          View in DB →
                        </button>
                      </div>

                      {/* Breakdown rows */}
                      <div style={{ padding: '4px 0' }}>
                        {[
                          {
                            icon: '✨', label: 'Newly Added',
                            desc: 'New parts added to master catalog for the first time',
                            value: importProg?.created ?? 0,
                            color: '#10B981', bg: 'rgba(16,185,129,0.06)',
                          },
                          {
                            icon: '✏️', label: 'Updated / Modified',
                            desc: 'Existing parts updated with new data from this file',
                            value: importProg?.updated ?? 0,
                            color: '#3B82F6', bg: 'rgba(59,130,246,0.06)',
                          },
                          {
                            icon: '✓', label: 'Already Exist — No Changes',
                            desc: 'Found in database but data was identical — nothing to update',
                            value: importProg?.unchanged ?? 0,
                            color: '#6B7280', bg: 'transparent',
                          },
                          ...(importProg?.fitments ? [{
                            icon: '🔗', label: 'Vehicle Fitment Records Created',
                            desc: 'Part ↔ Vehicle compatibility links added to part_fitments table',
                            value: importProg.fitments,
                            color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)',
                          }] : []),
                          ...(importProg?.invalid ? [{
                            icon: '⊘', label: 'Skipped / Invalid',
                            desc: 'Rows with no OEM Number and no Part Name, or rows that errored',
                            value: importProg.invalid,
                            color: '#EF4444', bg: 'rgba(239,68,68,0.04)',
                          }] : []),
                        ].map((row, i, arr) => (
                          <div key={row.label} style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '12px 20px', background: row.bg,
                            borderBottom: i < arr.length - 1 ? '1px solid #1e1f26' : 'none',
                          }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{row.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: row.color, fontFamily: "'Inter', sans-serif" }}>{row.label}</div>
                              <div style={{ fontSize: 10, color: '#5e3f3d', fontFamily: "'Inter', sans-serif", marginTop: 1 }}>{row.desc}</div>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: row.color, fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>
                              {row.value.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <button onClick={handleImport} disabled={importing || !fileData.mapped}
                        style={{ background: (importing || !fileData.mapped) ? '#292931' : '#FF1F3A', color: (importing || !fileData.mapped) ? '#5e3f3d' : '#fff', border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 13, fontWeight: 700, cursor: (importing || !fileData.mapped) ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em', boxShadow: (importing || !fileData.mapped) ? 'none' : '0 0 20px rgba(255,31,58,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {importing ? `⟳ Importing… ${importProg?.done ?? 0} / ${importProg?.total ?? 0}` : `⬆ Import ${fileData.mapped.toLocaleString()} Parts to Database`}
                      </button>
                      {importProg && (
                        <div style={{ marginTop: 12 }}>
                          {/* Progress bar */}
                          <div style={{ height: 6, background: '#292931', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                            <div style={{ height: '100%', width: `${Math.round((importProg.done / importProg.total) * 100)}%`, background: 'linear-gradient(90deg,#FF1F3A,#FF6B35)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                          </div>
                          {/* Live counters while importing */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                            {[
                              { label: 'Processed', val: `${importProg.done.toLocaleString()} / ${importProg.total.toLocaleString()}`, color: '#af8785' },
                              { label: 'Added',     val: importProg.created.toLocaleString(),   color: '#10B981' },
                              { label: 'Updated',   val: importProg.updated.toLocaleString(),   color: '#3B82F6' },
                              { label: 'Unchanged', val: importProg.unchanged.toLocaleString(), color: '#6B7280' },
                              { label: 'Skipped',   val: importProg.invalid.toLocaleString(),   color: '#EF4444' },
                            ].map(c => (
                              <div key={c.label} style={{ background: '#1a1b22', borderRadius: 7, padding: '8px 10px', textAlign: 'center' }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: c.color, fontFamily: "'Outfit', sans-serif" }}>{c.val}</div>
                                <div style={{ fontSize: 9, color: '#5e3f3d', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{c.label}</div>
                              </div>
                            ))}
                          </div>
                          {(importProg.fitments ?? 0) > 0 && (
                            <div style={{ marginTop: 8, fontSize: 11, color: '#8B5CF6', fontFamily: "'JetBrains Mono', monospace" }}>
                              🔗 {importProg.fitments.toLocaleString()} vehicle fitment records created so far
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'live' && (
        <>
          {dbStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Total Parts', val: dbStats.total, color: '#FF1F3A' },
                { label: 'Verified', val: dbStats.verified, color: '#10B981' },
                { label: 'Pending Review', val: dbStats.pending, color: '#F59E0B' },
                { label: 'Rejected', val: dbStats.rejected, color: '#EF4444' },
              ].map(s => (
                <div key={s.label} style={{ background: 'linear-gradient(145deg, #1e1f26 0%, #12131a 100%)', border: '1px solid #3F3F46', borderTop: `2px solid ${s.color}`, borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>{s.val?.toLocaleString() ?? '—'}</div>
                  <div style={{ fontSize: 10, color: '#af8785', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5e3f3d', fontSize: 13, pointerEvents: 'none' }}>🔍</span>
              <input value={dbSearch} onChange={e => setDbSearch(e.target.value)} placeholder="Search by part name, OEM or brand…"
                style={{ width: '100%', background: '#1e1f26', border: '1.5px solid #3F3F46', borderRadius: 10, padding: '10px 14px 10px 36px', color: '#e3e1ec', fontSize: 13, outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }} />
            </div>
            <button onClick={() => fetchDbParts(dbSearch, dbOffset)}
              style={{ background: 'transparent', border: '1px solid #3F3F46', borderRadius: 8, padding: '9px 16px', color: '#c9c6c5', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
              ↺ Refresh
            </button>
            <span style={{ fontSize: 11, color: '#af8785', fontFamily: "'JetBrains Mono', monospace" }}>{dbTotal.toLocaleString()} parts in DB</span>
          </div>
          {dbTotal === 0 && !dbLoading && (
            <div style={{ background: '#0d0e15', border: '1px solid #292931', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e3e1ec', marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>Master catalog is empty</div>
              <div style={{ fontSize: 12, color: '#af8785', fontFamily: "'Inter', sans-serif", marginBottom: 16 }}>
                Use the <strong style={{ color: '#FF1F3A' }}>Import Excel</strong> tab to upload a supplier file.
              </div>
              <button onClick={() => setView('import')} style={{ background: '#FF1F3A', border: 'none', borderRadius: 8, padding: '10px 22px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                ⬆ Go to Import
              </button>
            </div>
          )}
          {(dbParts.length > 0 || dbLoading) && (
            <div className="admin-table-wrap">
              <div className="admin-table-wrap-inner">
                <table style={{ minWidth: 780, width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['OEM Number', 'Part Name', 'Brand', 'Category', 'GST %', 'Status', 'Shop Stock', 'Created At', 'Updated At'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#af8785', textTransform: 'uppercase', letterSpacing: '0.09em', borderBottom: '1px solid #3F3F46', textAlign: 'left', background: '#0d0e15', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dbLoading ? (
                      <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#5e3f3d', fontFamily: "'Inter', sans-serif" }}>Loading…</td></tr>
                    ) : dbParts.map(p => (
                      <tr key={p.masterPartId} className="admin-table-row" style={{ borderBottom: '1px solid #292931' }}>
                        <td style={{ padding: '11px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#e3e1ec', whiteSpace: 'nowrap' }}>{p.primaryOemNumber || <span style={{ color: '#3F3F46' }}>—</span>}</td>
                        <td style={{ padding: '11px 16px', fontSize: 13, color: '#e3e1ec', fontFamily: "'Inter', sans-serif", maxWidth: 260 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.partName}</div>
                        </td>
                        <td style={{ padding: '11px 16px', fontSize: 12, color: '#c9c6c5', fontFamily: "'Inter', sans-serif" }}>{p.brand || <span style={{ color: '#3F3F46' }}>—</span>}</td>
                        <td style={{ padding: '11px 16px', fontSize: 11, color: '#af8785', fontFamily: "'Inter', sans-serif" }}>{p.categoryL1 || <span style={{ color: '#3F3F46' }}>—</span>}</td>
                        <td style={{ padding: '11px 16px', fontSize: 12, color: '#F59E0B', fontFamily: "'JetBrains Mono', monospace" }}>{p.gstRate}%</td>
                        <td style={{ padding: '11px 16px' }}>
                          <span style={{ background: p.status === 'VERIFIED' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${p.status === 'VERIFIED' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`, color: p.status === 'VERIFIED' ? '#10B981' : '#F59E0B', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '11px 16px', fontSize: 11, color: '#3B82F6', fontFamily: "'JetBrains Mono', monospace" }}>{p._count?.inventory ?? 0} shops</td>
                        <td style={{ padding: '11px 16px', fontSize: 11, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : <span style={{ color: '#3F3F46' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 16px', fontSize: 11, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                          {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : <span style={{ color: '#3F3F46' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {dbTotal > DB_LIMIT && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#af8785', fontFamily: "'JetBrains Mono', monospace", marginRight: 8 }}>
                {dbOffset + 1}–{Math.min(dbOffset + DB_LIMIT, dbTotal)} of {dbTotal.toLocaleString()}
              </span>
              <button disabled={dbOffset === 0} onClick={() => { const o = dbOffset - DB_LIMIT; setDbOffset(o); fetchDbParts(dbSearch, o); }}
                style={{ background: 'transparent', border: '1px solid #3F3F46', borderRadius: 7, padding: '6px 14px', color: dbOffset === 0 ? '#3F3F46' : '#c9c6c5', fontSize: 12, fontWeight: 600, cursor: dbOffset === 0 ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif" }}>← Prev</button>
              <button disabled={dbOffset + DB_LIMIT >= dbTotal} onClick={() => { const o = dbOffset + DB_LIMIT; setDbOffset(o); fetchDbParts(dbSearch, o); }}
                style={{ background: 'transparent', border: '1px solid #3F3F46', borderRadius: 7, padding: '6px 14px', color: dbOffset + DB_LIMIT >= dbTotal ? '#3F3F46' : '#c9c6c5', fontSize: 12, fontWeight: 600, cursor: dbOffset + DB_LIMIT >= dbTotal ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif" }}>Next →</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SuperAdminPage({ onImpersonate, currentUser }) {
  const [activeTab, setActiveTab] = useState("users"); // "users" | "verifications"
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  // Verifications tab state
  const [verifications, setVerifications] = useState([]);
  const [verLoading, setVerLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null); // userId with reject textarea open
  const [rejectReason, setRejectReason] = useState("");
  const [verError, setVerError] = useState("");
  const [verSuccess, setVerSuccess] = useState("");

  // Add User modal
  const [showAddUser, setShowAddUser] = useState(false);

  const pendingCount = verifications.filter(v => v.verificationStatus === "PENDING").length;

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/stats");
      setStats(res.data);
    } catch {}
  }, []);

  const fetchUsers = useCallback(async (q, role, off) => {
    setLoading(true);
    try {
      const params = { limit: LIMIT, offset: off };
      if (q) params.q = q;
      if (role && role !== "ALL") params.role = role;
      const res = await api.get("/api/admin/users", params);
      setUsers(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e.message || "Failed to load users");
    }
    setLoading(false);
  }, []);

  const fetchVerifications = useCallback(async () => {
    setVerLoading(true);
    try {
      const res = await api.get("/api/admin/verifications");
      setVerifications(res.data || []);
    } catch (e) {
      setVerError(e.message || "Failed to load verifications");
    }
    setVerLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    api.get("/api/admin/usertypes")
      .then(res => setUserTypes(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); fetchUsers(search, roleFilter, 0); }, 300);
    return () => clearTimeout(t);
  }, [search, roleFilter, fetchUsers]);

  useEffect(() => {
    if (activeTab === "verifications") fetchVerifications();
  }, [activeTab, fetchVerifications]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleImpersonate = async (user) => {
    setImpersonatingId(user.userId);
    setError("");
    try {
      const res = await api.post(`/api/admin/impersonate/${user.userId}`);
      onImpersonate(res.data.user, res.data.accessToken);
    } catch (e) {
      setError(e.message || "Impersonation failed");
      setImpersonatingId(null);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await api.patch(`/api/admin/users/${user.userId}/toggle-active`);
      setUsers(prev => prev.map(u => u.userId === user.userId ? { ...u, isActive: res.data.isActive } : u));
    } catch (e) {
      setError(e.message || "Failed to update user");
    }
  };

  const handleChangeUserType = async (user, userTypeId) => {
    setError("");
    try {
      const res = await api.patch(`/api/admin/users/${user.userId}/usertype`, { userTypeId });
      setUsers(prev => prev.map(u =>
        u.userId === user.userId
          ? { ...u, role: res.data.role, userType: res.data.userType }
          : u
      ));
    } catch (e) {
      setError(e.message || "Failed to change user type");
    }
  };

  const handleVerify = async (userId, action, reason) => {
    setVerError(""); setVerSuccess("");
    try {
      await api.post(`/api/admin/users/${userId}/verify`, { action, reason });
      setVerifications(prev => prev.filter(v => v.userId !== userId));
      setRejectingId(null);
      setRejectReason("");
      setVerSuccess(action === "APPROVE" ? "Shop owner approved and notified by email." : "Application rejected and shop owner notified.");
      fetchStats();
      setTimeout(() => setVerSuccess(""), 5000);
    } catch (e) {
      setVerError(e.data?.error?.message || e.message || "Action failed");
    }
  };

  const handleAddUserSuccess = (newUser) => {
    setShowAddUser(false);
    showSuccess(`User "${newUser.email}" created successfully.`);
    fetchUsers(search, roleFilter, offset);
    fetchStats();
  };

  const S = {
    page: { minHeight: "100vh", background: T.bg, color: T.t1, fontFamily: FONT.body },
    header: {
      background: "#0d0e15",
      borderBottom: `1px solid ${T.border}`,
      padding: "0 28px",
      position: "sticky", top: 0, zIndex: 99,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 56, gap: 16,
    },
    title: { display: "flex", alignItems: "center", gap: 12 },
    badge: {
      width: 32, height: 32, borderRadius: 6,
      background: `#FF1F3A`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, boxShadow: `0 0 16px rgba(255,31,58,0.25)`,
      flexShrink: 0,
    },
    titleText: { fontSize: 15, fontWeight: 700, color: T.t1, fontFamily: "'Outfit', sans-serif" },
    titleSub: { fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" },
    body: { padding: "28px 28px", maxWidth: 1300, margin: "0 auto" },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, marginBottom: 28 },
    statCard: (color) => ({
      background: "linear-gradient(145deg, #1e1f26 0%, #12131a 100%)",
      border: `1px solid #3F3F46`,
      borderTop: `2px solid ${color}`,
      borderRadius: 12,
      padding: "18px 20px",
      transition: "border-color 0.2s, box-shadow 0.2s",
      cursor: "default",
    }),
    statVal: { fontSize: 26, fontWeight: 700, color: T.t1, marginBottom: 4, fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.02em" },
    statLabel: { fontSize: 10, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: "'Inter', sans-serif" },
    controls: { display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" },
    searchWrap: {
      flex: 1, minWidth: 220, position: "relative", display: "flex", alignItems: "center",
    },
    searchInput: {
      flex: 1, minWidth: 220, background: T.card, border: `1.5px solid ${T.border}`,
      borderRadius: 10, padding: "10px 14px 10px 38px", color: T.t1, fontSize: 14,
      outline: "none", fontFamily: FONT.ui, width: "100%",
    },
    searchIcon: {
      position: "absolute", left: 13, color: T.t3, fontSize: 14, pointerEvents: "none",
    },
    select: {
      background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 10,
      padding: "10px 14px", color: T.t1, fontSize: 13, outline: "none",
      fontFamily: FONT.ui, cursor: "pointer",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
      padding: "11px 16px", fontSize: 10, fontWeight: 700, color: T.t3,
      textTransform: "uppercase", letterSpacing: "0.09em",
      borderBottom: `1px solid ${T.border}`, textAlign: "left",
      background: T.card, whiteSpace: "nowrap",
    },
    td: {
      padding: "13px 16px", fontSize: 13, color: T.t2,
      borderBottom: `1px solid ${T.border}`,
      fontFamily: FONT.ui, verticalAlign: "middle",
    },
    row: { transition: "background 0.12s", cursor: "default" },
    btnImpersonate: {
      background: "rgba(124,58,237,0.12)",
      border: `1px solid rgba(124,58,237,0.35)`,
      borderRadius: 7, padding: "5px 11px",
      color: "#A78BFA", fontSize: 11, fontWeight: 700, cursor: "pointer",
      fontFamily: FONT.ui, transition: "all 0.15s", whiteSpace: "nowrap",
    },
    btnToggle: (isActive) => ({
      background: isActive ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
      border: `1px solid ${isActive ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
      borderRadius: 7, padding: "5px 10px",
      color: isActive ? T.crimson : T.emerald,
      fontSize: 11, fontWeight: 600,
      cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap",
    }),
    pagination: { display: "flex", gap: 8, justifyContent: "space-between", marginTop: 18, alignItems: "center", flexWrap: "wrap" },
    pageBtn: (active) => ({
      background: active ? T.amber : "transparent",
      border: `1px solid ${active ? T.amber : T.border}`,
      borderRadius: 8, padding: "7px 16px", color: active ? "#000" : T.t2,
      fontSize: 12, fontWeight: 700, cursor: active ? "default" : "pointer", fontFamily: FONT.ui,
      transition: "all 0.15s",
    }),
    btnAddUser: {
      background: T.amber, border: "none", borderRadius: 8, padding: "9px 18px",
      color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif",
      display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
      textTransform: "uppercase", letterSpacing: "0.06em",
      transition: "filter 0.15s, transform 0.15s",
      boxShadow: "0 0 16px rgba(255,31,58,0.2)",
    },
    tab: (active) => ({
      padding: "12px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
      border: "none", background: "none", fontFamily: FONT.ui,
      color: active ? T.amber : T.t3,
      borderBottom: active ? `2px solid ${T.amber}` : "2px solid transparent",
      transition: "all 0.15s",
    }),
    statusBadge: (isActive) => ({
      background: isActive ? T.emeraldBg : T.crimsonBg,
      border: `1px solid ${isActive ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"}`,
      color: isActive ? T.emerald : T.crimson,
      borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, fontFamily: FONT.ui,
      letterSpacing: "0.04em", whiteSpace: "nowrap",
    }),
  };

  const pages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT);
  const filteredUserTypes = userTypes.filter(ut => ALLOWED_ROLE_SLUGS.includes(ut.slug));

  const ADMIN_CSS = `
    /* ── Stats grid ── */
    .admin-stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 28px; }
    .admin-stat-card:hover { border-color: ${T.borderHi} !important; }

    /* ── Admin controls row ── */
    .admin-controls-row { display: flex; gap: 10px; margin-bottom: 18px; align-items: center; flex-wrap: wrap; }
    .admin-search-input { flex: 1; min-width: 200px; }

    /* ── Add user button hover ── */
    .admin-add-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }

    /* ── Table ── */
    .admin-table-wrap { background: linear-gradient(145deg, #1e1f26 0%, #12131a 100%); border: 1px solid #3F3F46; border-radius: 12px; overflow: hidden; }
    .admin-table-wrap-inner { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table-wrap-inner table { min-width: 900px; width: 100%; border-collapse: collapse; }
    .admin-table-row:hover { background: ${T.cardHover} !important; }

    /* ── User card layout for mobile ── */
    .admin-user-card { display: none; }

    /* ── Pagination ── */
    .admin-pagination { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; align-items: center; flex-wrap: wrap; }

    /* ── Impersonate / toggle btn hover ── */
    .btn-impersonate:hover { background: rgba(124,58,237,0.22) !important; border-color: rgba(124,58,237,0.6) !important; }
    .btn-toggle-active:hover { background: rgba(239,68,68,0.16) !important; }
    .btn-toggle-inactive:hover { background: rgba(16,185,129,0.16) !important; }

    /* ── Section heading ── */
    .admin-section-title { font-size: 14px; font-weight: 700; color: ${T.t1}; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }

    @media (max-width: 1280px) {
      .admin-stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
    }

    @media (max-width: 768px) {
      .admin-content-wrap { padding-left: 0 !important; padding-top: 58px !important; }

      .admin-sidebar {
        top: 0 !important; bottom: auto !important;
        left: 0 !important; right: 0 !important;
        width: 100% !important; height: 54px !important;
        flex-direction: row !important;
        align-items: center !important;
        padding: 0 14px !important;
        border-right: none !important;
        border-bottom: 1px solid ${T.border} !important;
        gap: 10px !important;
      }
      .admin-sidebar-label { display: none !important; }
      .sidebar-spacer { flex: 1 !important; display: block !important; }
      .admin-sidebar-user { flex-direction: row !important; }
      .admin-sidebar-logout { margin: 0 !important; }
      .admin-sidebar-logo { margin-bottom: 0 !important; width: 32px !important; height: 32px !important; font-size: 14px !important; }

      .admin-page-body { padding: 16px 14px 40px !important; }
      .admin-page-sticky-header { top: 54px !important; }

      .admin-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; margin-bottom: 18px !important; }
      .admin-stats-grid .stat-val { font-size: 22px !important; }
      .admin-stats-grid .stat-label { font-size: 10px !important; }

      .admin-controls-row { gap: 8px !important; }
      .admin-search-input { min-width: 0 !important; width: 100% !important; flex: none !important; order: 0 !important; }
      .admin-type-select { flex: 1 !important; min-width: 0 !important; }
      .admin-add-btn { flex-shrink: 0 !important; }

      .admin-table-wrap-inner { overflow: visible !important; }
      .admin-table-wrap-inner table { display: none !important; }
      .admin-user-card { display: block !important; }
    }

    @media (max-width: 480px) {
      .admin-page-body { padding: 12px 10px 80px !important; }
      .admin-stats-grid { gap: 8px !important; }
    }
  `;

  const STAT_CONFIG = [
    { label: "Total Users",  key: "totalUsers",  color: T.violet,  icon: "👥",  glow: "rgba(167,139,250,0.25)" },
    { label: "Shop Owners",  key: "shopOwners",  color: T.emerald, icon: "🏪",  glow: "rgba(16,185,129,0.25)" },
    { label: "Customers",    key: "customers",   color: T.sky,     icon: "🛒",  glow: "rgba(56,189,248,0.25)" },
    { label: "Total Shops",  key: "totalShops",  color: T.amber,   icon: "📦",  glow: "rgba(227,24,55,0.25)" },
    { label: "Active Users", key: "activeUsers", color: T.emerald, icon: "✅",  glow: "rgba(16,185,129,0.25)" },
    { label: "Admins",       key: "admins",      color: "#A78BFA", icon: "🛡️", glow: "rgba(167,139,250,0.25)" },
  ];

  return (
    <div style={S.page}>
      <style>{ADMIN_CSS}</style>

      {/* ── Header ── */}
      <div className="admin-page-sticky-header" style={S.header}>
        <div style={S.title}>
          <div style={S.badge}>⚡</div>
          <div>
            <div style={S.titleText}>Admin Console</div>
            <div style={S.titleSub}>PLATFORM MANAGEMENT</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 12, color: T.t3, fontFamily: FONT.ui }}>
            <span style={{ color: T.t1, fontWeight: 700 }}>{total}</span> users total
          </div>
          {currentUser && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar user={currentUser} size={28} />
              <span style={{ fontSize: 12, color: T.t2, fontWeight: 600 }}>{currentUser.name || currentUser.email}</span>
            </div>
          )}
        </div>
      </div>

      <div className="admin-page-body" style={S.body}>

        {/* Global error / success */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.07)", border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 10, padding: "11px 16px", color: T.crimson, fontSize: 13, marginBottom: 20, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 10 }}>
            <span>⚠</span> {error}
          </div>
        )}
        {successMsg && (
          <div style={{ background: "rgba(16,185,129,0.07)", border: `1px solid rgba(16,185,129,0.3)`, borderRadius: 10, padding: "11px 16px", color: T.emerald, fontSize: 13, marginBottom: 20, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 10 }}>
            <span>✓</span> {successMsg}
          </div>
        )}

        {/* ── Stats Grid ── */}
        {stats && (
          <div className="admin-stats-grid">
            {STAT_CONFIG.map((sc) => (
              <div key={sc.label} className="admin-stat-card" style={S.statCard(sc.color, sc.glow)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div className="stat-val" style={{ ...S.statVal, color: sc.color }}>{stats[sc.key] ?? "—"}</div>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${sc.color}14`, border: `1px solid ${sc.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{sc.icon}</div>
                </div>
                <div className="stat-label" style={S.statLabel}>{sc.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, marginBottom: 24, gap: 0 }}>
          <button style={S.tab(activeTab === "users")} onClick={() => setActiveTab("users")}>
            Users
          </button>
          <button style={S.tab(activeTab === "verifications")} onClick={() => setActiveTab("verifications")}>
            Verifications
            {pendingCount > 0 && (
              <span style={{ marginLeft: 7, background: T.amber, color: "#000", borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{pendingCount}</span>
            )}
          </button>
          <button style={S.tab(activeTab === "catalog")} onClick={() => setActiveTab("catalog")}>
            Parts Catalog
          </button>
        </div>

        {/* ─── USERS TAB ─── */}
        {activeTab === "users" && (
          <>
            {/* Controls */}
            <div className="admin-controls-row" style={S.controls}>
              <div className="admin-search-input" style={S.searchWrap}>
                <span style={S.searchIcon}>🔍</span>
                <input
                  style={S.searchInput}
                  placeholder="Search by name, email or phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="admin-type-select"
                style={S.select}
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="ALL">All Roles</option>
                {filteredUserTypes.map(ut => (
                  <option key={ut.slug} value={ut.slug}>{ut.name}</option>
                ))}
              </select>
              <button className="admin-add-btn" style={S.btnAddUser} onClick={() => setShowAddUser(true)}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add User
              </button>
            </div>

            {/* Table */}
            <div className="admin-table-wrap">
              {/* Desktop table */}
              <div className="admin-table-wrap-inner">
                <table style={S.table}>
                  <thead>
                    <tr>
                      {["User", "Role", "Change Type", "Shop", "Last Login", "Logins", "Status", "Actions"].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}><td colSpan={8} style={{ ...S.td, padding: 0 }}>
                          <div style={{ height: 56, background: `linear-gradient(90deg, ${T.card} 25%, ${T.cardHover} 50%, ${T.card} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite" }} />
                        </td></tr>
                      ))
                    ) : users.length === 0 ? (
                      <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: "48px 24px", color: T.t3 }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.t2 }}>No users found</div>
                        <div style={{ fontSize: 12, color: T.t4, marginTop: 4 }}>Try adjusting your search or filter</div>
                      </td></tr>
                    ) : users.map(u => (
                      <tr
                        key={u.userId}
                        className="admin-table-row"
                        style={S.row}
                      >
                        <td style={S.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Avatar user={u} size={36} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, marginBottom: 2 }}>{u.name || <span style={{ color: T.t4, fontStyle: "italic" }}>No name</span>}</div>
                              <div style={{ fontSize: 11, color: T.t3, fontFamily: FONT.mono }}>{u.email || u.phone || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={S.td}><RoleBadge slug={u.userType?.slug || u.role} name={u.userType?.name} /></td>
                        <td style={S.td}>
                          <select
                            style={{
                              background: T.card, color: T.t1, border: `1px solid ${T.border}`,
                              borderRadius: 7, padding: "4px 8px", fontSize: 12, fontFamily: FONT.ui,
                              cursor: currentUser?.userId === u.userId ? "not-allowed" : "pointer",
                              opacity: currentUser?.userId === u.userId ? 0.5 : 1, outline: "none",
                            }}
                            value={u.userType?.id || ""}
                            disabled={currentUser?.userId === u.userId}
                            onChange={e => handleChangeUserType(u, e.target.value)}
                          >
                            <option value="">— Select —</option>
                            {userTypes.map(ut => (
                              <option key={ut.id} value={ut.id}>{ut.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={S.td}>
                          {u.shop ? (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{u.shop.name}</div>
                              <div style={{ fontSize: 11, color: T.t3 }}>{u.shop.city}</div>
                            </div>
                          ) : <span style={{ color: T.t4 }}>—</span>}
                        </td>
                        <td style={{ ...S.td, color: T.t3 }}>
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : <span style={{ color: T.t4 }}>Never</span>}
                        </td>
                        <td style={{ ...S.td, textAlign: "center", color: T.t2, fontWeight: 700 }}>{u.loginCount ?? 0}</td>
                        <td style={S.td}>
                          <span style={S.statusBadge(u.isActive)}>
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {(u.userType?.slug || u.role) !== "PLATFORM_ADMIN" && (
                              <button
                                className="btn-impersonate"
                                style={{ ...S.btnImpersonate, opacity: impersonatingId === u.userId ? 0.55 : 1 }}
                                onClick={() => handleImpersonate(u)}
                                disabled={!!impersonatingId}
                                title={`Login as ${u.name || u.email}`}
                              >
                                {impersonatingId === u.userId ? "···" : "⚡ Login as"}
                              </button>
                            )}
                            <button
                              className={u.isActive ? "btn-toggle-active" : "btn-toggle-inactive"}
                              style={S.btnToggle(u.isActive)}
                              onClick={() => handleToggleActive(u)}
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards (shown via CSS when table is hidden) */}
              <div className="admin-user-card">
                {loading ? (
                  <div style={{ textAlign: "center", padding: 40, color: T.t3 }}>Loading users...</div>
                ) : users.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: T.t3 }}>No users found</div>
                ) : users.map(u => (
                  <div key={u.userId} style={{
                    borderBottom: `1px solid ${T.border}`,
                    padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,
                    background: "transparent", transition: "background 0.12s",
                  }}>
                    {/* Row 1: Avatar + name + status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar user={u} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, fontFamily: FONT.ui }}>{u.name || <span style={{ color: T.t4, fontStyle: "italic" }}>No name</span>}</div>
                        <div style={{ fontSize: 12, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email || u.phone || "—"}</div>
                      </div>
                      <span style={{ ...S.statusBadge(u.isActive), flexShrink: 0 }}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {/* Row 2: Role badge + type select + shop */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <RoleBadge slug={u.userType?.slug || u.role} name={u.userType?.name} />
                      <select
                        style={{
                          background: T.card, color: T.t1, border: `1px solid ${T.border}`,
                          borderRadius: 7, padding: "5px 8px", fontSize: 12, fontFamily: FONT.ui,
                          cursor: currentUser?.userId === u.userId ? "not-allowed" : "pointer",
                          opacity: currentUser?.userId === u.userId ? 0.5 : 1, outline: "none",
                        }}
                        value={u.userType?.id || ""}
                        disabled={currentUser?.userId === u.userId}
                        onChange={e => handleChangeUserType(u, e.target.value)}
                      >
                        <option value="">— Type —</option>
                        {userTypes.map(ut => (
                          <option key={ut.id} value={ut.id}>{ut.name}</option>
                        ))}
                      </select>
                      {u.shop && (
                        <span style={{ fontSize: 12, color: T.t3, fontFamily: FONT.ui }}>🏪 {u.shop.name}, {u.shop.city}</span>
                      )}
                    </div>
                    {/* Row 3: Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {(u.userType?.slug || u.role) !== "PLATFORM_ADMIN" && (
                        <button
                          style={{ ...S.btnImpersonate, opacity: impersonatingId === u.userId ? 0.6 : 1, flex: 1, padding: "9px 12px", fontSize: 12 }}
                          onClick={() => handleImpersonate(u)}
                          disabled={!!impersonatingId}
                        >
                          {impersonatingId === u.userId ? "Loading…" : "⚡ Impersonate"}
                        </button>
                      )}
                      <button
                        style={{ ...S.btnToggle(u.isActive), flex: 1, padding: "9px 12px", fontSize: 12 }}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="admin-pagination" style={S.pagination}>
                <span style={{ fontSize: 12, color: T.t3, fontFamily: FONT.ui }}>
                  Showing <span style={{ color: T.t1, fontWeight: 700 }}>{offset + 1}–{Math.min(offset + LIMIT, total)}</span> of <span style={{ color: T.t1, fontWeight: 700 }}>{total}</span> users
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    style={{ ...S.pageBtn(false), opacity: currentPage === 0 ? 0.4 : 1 }}
                    disabled={currentPage === 0}
                    onClick={() => { const o = offset - LIMIT; setOffset(o); fetchUsers(search, roleFilter, o); }}
                  >← Prev</button>
                  {Array.from({ length: Math.min(pages, 5) }, (_, i) => i).map(i => (
                    <button
                      key={i}
                      style={S.pageBtn(i === currentPage)}
                      onClick={() => { const o = i * LIMIT; setOffset(o); fetchUsers(search, roleFilter, o); }}
                    >{i + 1}</button>
                  ))}
                  <button
                    style={{ ...S.pageBtn(false), opacity: currentPage >= pages - 1 ? 0.4 : 1 }}
                    disabled={currentPage >= pages - 1}
                    onClick={() => { const o = offset + LIMIT; setOffset(o); fetchUsers(search, roleFilter, o); }}
                  >Next →</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── VERIFICATIONS TAB ─── */}
        {activeTab === "verifications" && (
          <>
            {verError && (
              <div style={{ background: "rgba(239,68,68,0.07)", border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 10, padding: "11px 16px", color: T.crimson, fontSize: 13, marginBottom: 20, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 10 }}>
                <span>⚠</span> {verError}
              </div>
            )}
            {verSuccess && (
              <div style={{ background: "rgba(16,185,129,0.07)", border: `1px solid rgba(16,185,129,0.3)`, borderRadius: 10, padding: "11px 16px", color: T.emerald, fontSize: 13, marginBottom: 20, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 10 }}>
                <span>✓</span> {verSuccess}
              </div>
            )}

            {verLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ height: 160, borderRadius: 14, background: T.card, border: `1px solid ${T.border}`, animation: "shimmer 1.5s ease infinite", backgroundImage: `linear-gradient(90deg, ${T.card} 25%, ${T.cardHover} 50%, ${T.card} 75%)`, backgroundSize: "200% 100%" }} />
                ))}
              </div>
            ) : verifications.length === 0 ? (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🎉</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 6, fontFamily: FONT.ui }}>Queue is clear!</div>
                <div style={{ fontSize: 13, color: T.t3, fontFamily: FONT.ui }}>No pending shop owner applications to review.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {verifications.map(v => (
                  <div key={v.userId} style={{
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 16, overflow: "hidden",
                    boxShadow: v.verificationStatus === "PENDING" ? `0 0 0 1px rgba(251,191,36,0.2), 0 4px 20px rgba(0,0,0,0.3)` : "0 4px 20px rgba(0,0,0,0.2)",
                    transition: "box-shadow 0.2s",
                  }}>
                    {/* Card top bar */}
                    <div style={{ padding: "14px 18px", background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Avatar user={v} size={40} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{v.name || <span style={{ fontStyle: "italic", color: T.t4 }}>No name</span>}</div>
                          <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{v.email || "—"}</div>
                        </div>
                      </div>
                      <VerificationBadge status={v.verificationStatus} />
                    </div>

                    {/* Card body */}
                    <div style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Registered</div>
                          <div style={{ fontSize: 12, color: T.t2 }}>
                            {v.createdAt ? new Date(v.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </div>
                        </div>
                        {v.verificationStatus === "REJECTED" && v.verificationNote && (
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Rejection Reason</div>
                            <div style={{ fontSize: 12, color: T.crimson, lineHeight: 1.4 }}>{v.verificationNote}</div>
                          </div>
                        )}
                      </div>

                      {rejectingId !== v.userId ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            style={{ flex: 1, background: "rgba(16,185,129,0.1)", border: `1px solid rgba(16,185,129,0.35)`, color: T.emerald, borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.2)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(16,185,129,0.1)"; }}
                            onClick={() => handleVerify(v.userId, "APPROVE")}
                          >
                            ✓ Approve
                          </button>
                          <button
                            style={{ flex: 1, background: "rgba(239,68,68,0.08)", border: `1px solid rgba(239,68,68,0.3)`, color: T.crimson, borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                            onClick={() => { setRejectingId(v.userId); setRejectReason(""); setVerError(""); }}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.crimson, marginBottom: 8 }}>Rejection reason (required)</div>
                          <textarea
                            style={{ width: "100%", background: T.bg, border: `1.5px solid rgba(239,68,68,0.4)`, borderRadius: 10, padding: "10px 14px", color: T.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", resize: "vertical", minHeight: 72, boxSizing: "border-box", marginBottom: 10 }}
                            placeholder="Explain why this application is being rejected..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            autoFocus
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              style={{ flex: 1, background: T.crimson, border: "none", color: "#fff", borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}
                              onClick={() => {
                                if (!rejectReason.trim()) { setVerError("A rejection reason is required"); return; }
                                handleVerify(v.userId, "REJECT", rejectReason);
                              }}
                            >Confirm Reject</button>
                            <button
                              style={{ flex: 1, background: "transparent", border: `1px solid ${T.border}`, color: T.t3, borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui }}
                              onClick={() => { setRejectingId(null); setRejectReason(""); }}
                            >Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

        {/* ─── CATALOG TAB ─── */}
        {activeTab === "catalog" && <CatalogTab />}

      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal
          userTypes={userTypes}
          onClose={() => setShowAddUser(false)}
          onSuccess={handleAddUserSuccess}
        />
      )}
    </div>
  );
}

export default SuperAdminPage;
