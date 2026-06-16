import { useState, useEffect, useCallback } from "react";
import { flushSync, createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { api } from "../api/client.js";
import { T, FONT } from "../theme.js"; // T kept for any remaining tokens
import { Avatar } from "../components/Avatar.jsx";
import { fetchVehicleManufacturers, fetchVehicleModelsByManufacturer } from "../api/marketplace.js";
import { importStore } from "../importProgress.js";

const C = {
  bg:       "#FAF6F0",
  surface:  "#FFFFFF",
  card:     "#FFFFFF",
  border:   "#E0D5C8",
  borderLight: "#F0E8DF",
  t1:       "#1A1205",
  t2:       "#5C4F40",
  t3:       "#9C8C7C",
  t4:       "#BFB0A0",
  red:      "#BE2B1A",
  redBg:    "rgba(190,43,26,0.08)",
  redDim:   "#DC2626",
  green:    "#16A34A",
  greenBg:  "rgba(22,163,74,0.08)",
  amber:    "#D97706",
  amberBg:  "rgba(217,119,6,0.08)",
  violet:   "#7C3AED",
  violetBg: "rgba(124,58,237,0.08)",
  sky:      "#0284C7",
  skyBg:    "rgba(2,132,199,0.08)",
};

// Color map by slug — uses C.* cream theme tokens
const SLUG_COLORS = {
  PLATFORM_ADMIN: { bg: C.violetBg, border: C.violet, text: C.violet },
  SHOP_OWNER:     { bg: C.greenBg,  border: C.green,  text: C.green  },
  CUSTOMER:       { bg: C.skyBg,    border: C.sky,    text: C.sky    },
  SHOP_STAFF:     { bg: C.amberBg,  border: C.amber,  text: C.amber  },
};

// Only show these 3 roles in filters/dropdowns
const ALLOWED_ROLE_SLUGS = ["PLATFORM_ADMIN", "SHOP_OWNER", "CUSTOMER"];

function RoleBadge({ slug, name }) {
  const c = SLUG_COLORS[slug] || { bg: C.borderLight, border: C.border, text: C.t3 };
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
    <span style={{ ...base, background: C.amberBg, border: `1px solid ${C.amber}`, color: C.amber }}>⏳ Pending</span>
  );
  if (status === "REJECTED") return (
    <span style={{ ...base, background: C.redBg, border: `1px solid ${C.red}`, color: C.red }}>✗ Rejected</span>
  );
  return (
    <span style={{ ...base, background: C.greenBg, border: `1px solid ${C.green}`, color: C.green }}>✓ Approved</span>
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

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(26,18,5,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: 32, maxWidth: 440, width: "100%", margin: "0 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.t1 }}>Add User</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ background: C.redBg, border: `1.5px solid ${C.red}`, borderRadius: 10, padding: "10px 14px", color: C.red, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 13, fontWeight: 600, color: C.t2, marginBottom: 6, display: "block" }}>Name <span style={{ color: C.t3, fontWeight: 400 }}>(optional)</span></label>
        <input
          style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box", marginBottom: 14 }}
          placeholder="e.g. Raju Sharma"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <label style={{ fontSize: 13, fontWeight: 600, color: C.t2, marginBottom: 6, display: "block" }}>Email *</label>
        <input
          style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box", marginBottom: 14 }}
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />

        <label style={{ fontSize: 13, fontWeight: 600, color: C.t2, marginBottom: 6, display: "block" }}>Password *</label>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <input
            style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "11px 44px 11px 14px", color: C.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box" }}
            type={showPw ? "text" : "password"}
            placeholder="Min 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          <button
            type="button"
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: C.t3, cursor: "pointer", fontSize: 16 }}
            onClick={() => setShowPw(v => !v)}
          >
            {showPw ? "🙈" : "👁"}
          </button>
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: C.t2, marginBottom: 6, display: "block" }}>User Type *</label>
        <select
          style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.t1, fontSize: 14, outline: "none", fontFamily: FONT.ui, boxSizing: "border-box", marginBottom: 24, cursor: "pointer" }}
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          {allowedTypes.map(ut => (
            <option key={ut.slug} value={ut.slug}>{ut.name}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, color: C.t3, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{ flex: 2, padding: "12px", background: loading ? C.amberBg : C.amber, border: "none", borderRadius: 10, color: loading ? C.t3 : "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: FONT.ui }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create User"}
          </button>
        </div>
      </div>
    </div>,
    document.body
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
  'mrp': 'mrp', 'max retail price': 'mrp', 'maximum retail price': 'mrp', 'selling price': 'mrp', 'sell price': 'mrp', 'derived mrp': 'mrp',
  'buy price': 'buyPrice', 'buying price': 'buyPrice', 'cost price': 'buyPrice', 'purchase price': 'buyPrice', 'pl01': 'buyPrice',
  'long description': 'description', 'remarks': 'description', 'product description': 'description',
  'alternate oem': 'alternateOem', 'alternate oem numbers': 'alternateOem', 'alt oem': 'alternateOem', 'cross reference': 'alternateOem',
  'weight': 'weightGrams', 'weight grams': 'weightGrams', 'weight (g)': 'weightGrams', 'weight (gm)': 'weightGrams', 'wt': 'weightGrams',
  // Part type
  'part type': 'partType', 'part_type': 'partType', 'oem/oes': 'partType', 'type': 'partType', 'catalog type': 'partType',
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
  { key: 'partType',     label: 'Part Type',             required: false, example: 'OEM',                            note: 'OEM = Original Equipment Manufacturer; OES = Original Equipment Supplier (aftermarket). Defaults to OEM if blank.' },
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

const BATCH_SIZE   = 200; // rows per API request — safe with raw-SQL backend
const CONCURRENCY  = 3;   // parallel requests per round — ~3× throughput

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

// VEHICLE_TYPES is now loaded from the DB — see useEffect below

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

/** Convert any cell value to a clean string — avoids 5.7155E+11 scientific notation */
function cellStr(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') {
    // Large integers stored as floats in Excel come out as 5.7155e+11
    // Use toFixed(0) for whole numbers; for decimals keep up to 6 sig. places
    if (Number.isFinite(v)) {
      return Number.isInteger(v) ? v.toFixed(0) : parseFloat(v.toPrecision(10)).toString();
    }
    return String(v);
  }
  return String(v).trim();
}

async function parseExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // raw: true keeps numbers as JS numbers so we can format them ourselves
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
  if (rows.length === 0) throw new Error('The file has no data rows');
  const headers = Object.keys(rows[0]);
  const colMap = {};
  for (const h of headers) {
    const norm = h.toLowerCase().trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').replace(/_+/g, ' ').trim();
    if (DETECT_MAP[norm]) {
      colMap[h] = DETECT_MAP[norm];
    } else {
      // Prefix fallback: "PL01 LP as on 22.09.2025" → matches key "pl01"
      const prefixKey = Object.keys(DETECT_MAP).find(k => norm.startsWith(k + ' ') || norm.startsWith(k));
      if (prefixKey) colMap[h] = DETECT_MAP[prefixKey];
    }
  }
  const parts = rows.map(row => {
    const p = {};
    for (const [col, field] of Object.entries(colMap)) {
      const s = cellStr(row[col]);
      if (s && s !== '') p[field] = s;
    }
    return p;
  }).filter(p => p.oemNumber || p.partName);

  // Detect duplicate OEM numbers within the file
  const oemCount = {};
  parts.forEach(p => {
    if (p.oemNumber) oemCount[p.oemNumber] = (oemCount[p.oemNumber] || 0) + 1;
  });
  const duplicates = Object.entries(oemCount)
    .filter(([, count]) => count > 1)
    .map(([oemNumber, count]) => ({
      oemNumber,
      partName: parts.find(p => p.oemNumber === oemNumber)?.partName || '',
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // For preview keep raw values as readable strings
  const preview = rows.slice(0, 5).map(row => {
    const out = {};
    for (const [k, v] of Object.entries(row)) out[k] = cellStr(v) ?? '';
    return out;
  });
  return { headers, colMap, parts, total: rows.length, mapped: parts.length, preview, duplicates };
}

// ─── Pending Parts Review ─────────────────────────────────────────────────────
function PendingPartsSection() {
  const [parts, setParts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/api/admin/catalog/parts?status=PENDING&q=${encodeURIComponent(search)}&limit=50`);
      setParts(res.parts || []);
      setTotal(res.total || 0);
    } catch (e) { console.error('[PendingParts]', e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const act = async (partId: number, action: 'approve' | 'reject') => {
    setActioning(partId);
    try {
      await api.patch(`/api/admin/catalog/parts/${partId}/${action}`, {});
      setMsg(`Part ${action}d`);
      setParts(p => p.filter(x => x.masterPartId !== partId));
      setTotal(t => t - 1);
      setTimeout(() => setMsg(''), 2000);
    } catch (e) { console.error('[PendingParts] action failed', e); }
    finally { setActioning(null); }
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: "'Inter', sans-serif" }}>
          Pending Part Reviews
          {total > 0 && <span style={{ marginLeft: 8, background: C.amber, color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 800 }}>{total}</span>}
        </div>
        <div style={{ flex: 1 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search part name…"
          style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: "'Inter', sans-serif", outline: 'none', width: 200 }}
        />
      </div>
      {msg && <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#166534', marginBottom: 10 }}>{msg}</div>}
      {loading ? (
        <div style={{ color: C.t3, fontSize: 13, padding: '16px 0', fontFamily: "'Inter', sans-serif" }}>Loading…</div>
      ) : parts.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '24px 20px', textAlign: 'center', color: C.t3, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
          ✅ No pending parts — all caught up.
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                {['Part Name', 'Brand', 'Category', 'OEM #', 'Added By Shop', 'Source', ''].map(h => (
                  <th key={h} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}`, textAlign: 'left', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parts.map(p => (
                <tr key={p.masterPartId} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: "'Inter', sans-serif" }}>{p.partName}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: C.t2, fontFamily: "'Inter', sans-serif" }}>{p.brand || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: C.t2, fontFamily: "'Inter', sans-serif" }}>{p.categoryL1 || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'monospace', color: C.amber }}>{p.oemNumber || (p.oemNumbers?.[0]) || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: C.t3, fontFamily: "'Inter', sans-serif" }}>{p.contributedByShop?.name || '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: C.t4, fontFamily: "'Inter', sans-serif" }}>{p.source || '—'}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <button
                      disabled={actioning === p.masterPartId}
                      onClick={() => act(p.masterPartId, 'approve')}
                      style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginRight: 6, fontFamily: "'Inter', sans-serif" }}
                    >✓ Approve</button>
                    <button
                      disabled={actioning === p.masterPartId}
                      onClick={() => act(p.masterPartId, 'reject')}
                      style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
                    >✕ Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CatalogTab() {
  const [fileData, setFileData] = useState(null);
  const [parsing, setParsing]   = useState(false);
  const [parseErr, setParseErr] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Init from module store so re-mounting while import is running restores state
  const [importing, setImporting]       = useState(() => importStore.get()?.active ?? false);
  const [importProg, setImportProg]     = useState(() => importStore.get());
  const [batchInFlight, setBatchInFlight] = useState(false); // pulse while awaiting API response

  // Keep local state in sync when store updates (handles re-mount mid-import)
  useEffect(() => importStore.subscribe(prog => {
    // clearUI signal: user clicked "Import Another File" — reset everything
    if (prog?.clearUI) {
      setFileData(null);
      setImportProg(null);
      setImporting(false);
      setAnalysisStep('idle');
      setImportPartType('OEM');
      setDefaultCategory('');
      setDefaultVehicleType('');
      setDefaultMake('');
      setDefaultModel('');
      setTimeout(() => importStore.set(null), 0);
      return;
    }
    setImportProg(prog);
    setImporting(prog?.active ?? false);
  }), []); // eslint-disable-line

  // 'idle' → 'analyzing' (show column analysis + confirm) → 'confirmed' (show import button)
  const [analysisStep, setAnalysisStep] = useState('idle');
  const [importPartType,     setImportPartType]     = useState('OEM'); // OEM | OES — applied to every row in the import
  const [defaultCategory,    setDefaultCategory]    = useState('');
  const [defaultVehicleType, setDefaultVehicleType] = useState('');
  const [defaultMake,        setDefaultMake]        = useState('');  // manufacturer name (for display + fitment)
  const [defaultMakeId,      setDefaultMakeId]      = useState('');  // manufacturer DB id (for model fetch)
  const [defaultModel,       setDefaultModel]       = useState('');

  // Vehicle data from DB — replaces hardcoded VEHICLE_TYPES / MANUFACTURERS / MODELS
  const [vehicleTypes,       setVehicleTypes]       = useState([]);
  const [importManufacturers,setImportManufacturers]= useState([]);
  const [importModels,       setImportModels]       = useState([]);

  // Load vehicle types once
  useEffect(() => {
    fetch('/api/marketplace/vehicles/types')
      .then(r => r.json())
      .then(j => setVehicleTypes((j.data || []).map(t => ({ slug: t.slug, label: t.name, icon: t.icon || '' }))))
      .catch(() => {});
  }, []);

  // Load manufacturers (re-fetch when type filter changes)
  useEffect(() => {
    const vt = defaultVehicleType || undefined;
    fetchVehicleManufacturers(vt)
      .then(data => setImportManufacturers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [defaultVehicleType]);

  // Load models when a manufacturer is picked
  useEffect(() => {
    if (!defaultMakeId) { setImportModels([]); return; }
    fetchVehicleModelsByManufacturer(parseInt(defaultMakeId, 10))
      .then(data => setImportModels(Array.isArray(data) ? data : []))
      .catch(() => setImportModels([]));
  }, [defaultMakeId]);

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
    fetchDbStats(); fetchDbParts('', 0);
  }, []); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => { setDbOffset(0); fetchDbParts(dbSearch, 0); }, 350);
    return () => clearTimeout(t);
  }, [dbSearch]); // eslint-disable-line

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { setParseErr('Upload an Excel (.xlsx, .xls) or CSV (.csv) file'); return; }
    setParsing(true); setParseErr(''); setFileData(null); setImportProg(null);
    setAnalysisStep('idle'); setImportPartType('OEM'); setDefaultCategory(''); setDefaultVehicleType(''); setDefaultMake(''); setDefaultModel('');
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
    const filename = fileData.name;
    let created = 0, updated = 0, unchanged = 0, invalid = 0, fitments = 0;
    const initial = { filename, done: 0, total: parts.length, created: 0, updated: 0, unchanged: 0, invalid: 0, fitments: 0, active: true, popup: false };
    importStore.set(initial);
    setImportProg(initial);
    await new Promise(r => setTimeout(r, 0)); // yield — lets React paint the initial state

    // Build the API payload for one batch slice
    const buildPayload = (batch) => ({
      parts: batch.map(p => ({
        partName:            p.partName || p.oemNumber,
        oemNumber:           p.oemNumber || null,
        brand:               p.brand || null,
        // Per-row partType from Excel takes precedence; otherwise use the global selector
        partType:            (['OEM','OES'].includes((p.partType||'').toUpperCase()) ? (p.partType||'').toUpperCase() : null) || importPartType,
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
        vehicleMake:         p.vehicleMake || defaultMake || null,
        vehicleModel:        p.vehicleModel || defaultModel || null,
        vehicleType:         defaultVehicleType || 'Car',
        yearFrom:            p.yearFrom ? parseInt(p.yearFrom) : undefined,
        yearTo:              p.yearTo ? parseInt(p.yearTo) : undefined,
        fuelType:            p.fuelType || null,
        variant:             p.variant || null,
      })),
    });

    // Process CONCURRENCY batches in parallel per round — ~3× throughput
    for (let i = 0; i < parts.length; i += BATCH_SIZE * CONCURRENCY) {
      // Slice up to CONCURRENCY batches for this round
      const batches = [];
      for (let c = 0; c < CONCURRENCY; c++) {
        const start = i + c * BATCH_SIZE;
        if (start >= parts.length) break;
        batches.push(parts.slice(start, Math.min(start + BATCH_SIZE, parts.length)));
      }
      setBatchInFlight(true);
      // Fire all batches in parallel; allSettled so one failure doesn't abort siblings
      const results = await Promise.allSettled(
        batches.map(batch => api.post('/api/admin/catalog/bulk-import', buildPayload(batch)))
      );
      setBatchInFlight(false);
      for (let c = 0; c < results.length; c++) {
        const r = results[c];
        if (r.status === 'fulfilled') {
          created   += r.value.data.created   || 0;
          updated   += r.value.data.updated   || 0;
          unchanged += r.value.data.unchanged || 0;
          invalid   += r.value.data.invalid   || 0;
          fitments  += r.value.data.fitments  || 0;
        } else {
          invalid += batches[c].length; // count failed batch rows as invalid
        }
      }
      const done = Math.min(i + BATCH_SIZE * CONCURRENCY, parts.length);
      const prog = { filename, done, total: parts.length, created, updated, unchanged, invalid, fitments, active: true, popup: false };
      importStore.set(prog);
      setImportProg({ ...prog });
      await new Promise(r => setTimeout(r, 0)); // yield — lets React paint progress
    }
    const final = { filename, done: parts.length, total: parts.length, created, updated, unchanged, invalid, fitments, duplicates: fileData.duplicates || [], active: false, popup: true };
    importStore.set(final);
    setImporting(false);
    fetchDbStats();
    // Clear the file upload UI — user sees popup; catalog view resets ready for next upload
    setFileData(null);
    setAnalysisStep('idle');
    setImportPartType('OEM');
    setDefaultCategory('');
    setDefaultVehicleType('');
    setDefaultMake('');
    setDefaultModel('');
    // Auto-clear the store (and widget) after 2 min — user has time to see the popup
    setTimeout(() => importStore.set(null), 120_000);
  };

  return (
    <>
      {/* ── keyframes ── */}
      <style>{`
        @keyframes rp-exhaust { 0%,100%{opacity:.8;transform:scale(1)} 50%{opacity:.2;transform:scale(1.5) translateX(-3px)} }
        @keyframes rp-bounce  { 0%,100%{transform:translateY(0) translateX(-50%)} 50%{transform:translateY(-3px) translateX(-50%)} }
        @keyframes rp-shimmer { 0%{background-position:-400% 0} 100%{background-position:400% 0} }
      `}</style>

      {/* ════════════ IMPORT STRIP ════════════ */}
      {parseErr && (
        <div style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 12, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          ⚠ {parseErr}
          <button onClick={() => setParseErr('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Case 1: No file — compact drop zone */}
      {!fileData && !parsing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: C.bg, border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: '12px 16px' }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: dragOver ? C.amberBg : C.bg, border: `1.5px dashed ${dragOver ? C.amber : C.border}`, borderRadius: 10, padding: '12px 16px', transition: 'all 0.15s' }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <span style={{ fontSize: 13, color: C.t3, fontFamily: "'Inter', sans-serif", flex: 1 }}>
            Drop Excel / CSV here to import parts, or
            <button onClick={() => document.getElementById('_xls_upload').click()}
              style={{ marginLeft: 8, background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 6, padding: '4px 12px', color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
              Choose File
            </button>
            <input id="_xls_upload" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
          </span>
          <button onClick={downloadTemplate} style={{ flexShrink: 0, background: C.skyBg, border: `1px solid ${C.sky}`, borderRadius: 7, padding: '7px 13px', color: C.sky, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>
            📥 Template
          </button>
        </div>
      )}

      {/* Case 2: Parsing */}
      {parsing && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '24px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>
          <div style={{ color: C.t3, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Reading and parsing file…</div>
        </div>
      )}

      {/* Case 3: File loaded */}
      {fileData && !parsing && (
        <div style={{ marginBottom: 20 }}>
          {/* File info bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.greenBg, border: `1px solid ${C.green}`, borderRadius: 9, padding: '10px 14px', marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>📄</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, color: C.t1, fontSize: 13, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>{fileData.name}</span>
              <span style={{ fontSize: 11, color: C.t3, marginLeft: 10, fontFamily: "'Inter', sans-serif" }}>
                {fileData.total.toLocaleString()} rows · <span style={{ color: C.green }}>{fileData.mapped.toLocaleString()} ready</span>
              </span>
            </div>
            {!importing && (
              <button onClick={() => { setFileData(null); setImportProg(null); setParseErr(''); setAnalysisStep('idle'); setDefaultCategory(''); setDefaultVehicleType(''); setDefaultMake(''); setDefaultModel(''); }}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.t3, cursor: 'pointer', padding: '3px 10px', fontSize: 11, fontFamily: "'Inter', sans-serif" }}>
                ✕ Clear
              </button>
            )}
          </div>

          {/* ── Analysis step ── */}
          {analysisStep === 'analyzing' && (() => {
            const dbToExcel = {};
            for (const [col, field] of Object.entries(fileData.colMap)) dbToExcel[field] = col;
            const unrecognized = fileData.headers.filter(h => !fileData.colMap[h]);
            const fitmentMapped = DB_FIELDS.filter(f => f.section === 'fitment' && dbToExcel[f.key]);
            const missingRequired = DB_FIELDS.filter(f => f.section === 'required' && !dbToExcel[f.key]);
            return (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px', marginBottom: 12 }}>
                {/* Vehicle + Category defaults */}
                <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>Step 1 — Set Batch Defaults</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.t3, marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>Vehicle Type</div>
                    <select value={defaultVehicleType} onChange={e => { setDefaultVehicleType(e.target.value); setDefaultMake(''); setDefaultMakeId(''); setDefaultModel(''); }}
                      style={{ width: '100%', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '7px 9px', color: C.t1, fontSize: 12, outline: 'none', fontFamily: "'Inter', sans-serif" }}>
                      <option value="">— Any Type —</option>
                      {vehicleTypes.map(t => <option key={t.slug} value={t.slug}>{t.icon} {t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: C.t3, marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>Manufacturer</div>
                    <select
                      value={defaultMakeId}
                      onChange={e => {
                        const mfg = importManufacturers.find(m => m.manufacturerId === parseInt(e.target.value, 10));
                        setDefaultMakeId(e.target.value);
                        setDefaultMake(mfg?.name || '');
                        setDefaultModel('');
                      }}
                      style={{ width: '100%', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '7px 9px', color: C.t1, fontSize: 12, outline: 'none', fontFamily: "'Inter', sans-serif" }}>
                      <option value="">— Any / Mixed —</option>
                      {importManufacturers.map(m => <option key={m.manufacturerId} value={m.manufacturerId}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: C.t3, marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>Model</div>
                    <select value={defaultModel} onChange={e => setDefaultModel(e.target.value)} disabled={!defaultMakeId}
                      style={{ width: '100%', background: defaultMakeId ? C.bg : C.borderLight, border: `1.5px solid ${defaultMakeId ? C.border : C.borderLight}`, borderRadius: 7, padding: '7px 9px', color: defaultMakeId ? C.t1 : C.t4, fontSize: 12, outline: 'none', fontFamily: "'Inter', sans-serif", cursor: defaultMakeId ? 'pointer' : 'not-allowed' }}>
                      <option value="">— All Models —</option>
                      {importModels.map(m => <option key={m.modelId} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                {defaultMake && (
                  <div style={{ background: C.violetBg, border: `1px solid ${C.violet}`, borderRadius: 6, padding: '6px 10px', marginBottom: 10, fontSize: 11, color: C.violet, fontFamily: "'Inter', sans-serif" }}>
                    🔗 Fitment: <strong>{defaultMake}</strong>{defaultModel ? ` → ${defaultModel}` : ' (all models)'}
                  </div>
                )}
                {/* OEM / OES selector — applies to every row unless per-row partType column is present */}
                <div style={{ fontSize: 10, color: C.t3, fontFamily: "'Inter', sans-serif", marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Part Type <span style={{ color: C.amber, fontSize: 10 }}>(applied to every row — choose before import)</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {(['OEM', 'OES'] as const).map(pt => (
                    <button
                      key={pt}
                      onClick={() => setImportPartType(pt)}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 8, border: `1.5px solid ${importPartType === pt ? (pt === 'OEM' ? '#2563eb' : '#16a34a') : C.border}`,
                        background: importPartType === pt ? (pt === 'OEM' ? '#1d4ed820' : '#15803d20') : C.bg,
                        color: importPartType === pt ? (pt === 'OEM' ? '#2563eb' : '#16a34a') : C.t2,
                        fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                        transition: 'all 0.15s',
                      }}
                    >
                      {pt === 'OEM' ? '🔵 OEM' : '🟢 OES'}
                      <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, color: importPartType === pt ? 'inherit' : C.t4 }}>
                        {pt === 'OEM' ? 'Original Equipment' : 'Aftermarket / Supplier'}
                      </div>
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: 10, color: C.t3, fontFamily: "'Inter', sans-serif", marginBottom: 5, textTransform: 'uppercase' }}>Parts Category (default)</div>
                <select value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)}
                  style={{ width: '100%', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', color: C.t1, fontSize: 12, outline: 'none', fontFamily: "'Inter', sans-serif", marginBottom: 16 }}>
                  {PART_CATEGORIES.map(c => <option key={c} value={c}>{c === '' ? '— Mixed / Multiple (leave blank)' : c}</option>)}
                </select>

                {/* Column analysis */}
                <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>
                  Step 2 — Column Match &nbsp;·&nbsp; <span style={{ color: C.green }}>{Object.keys(fileData.colMap).length} matched</span> / {fileData.headers.length} total
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 4, marginBottom: 10 }}>
                  {DB_FIELDS.filter(f => f.section === 'required').map(f => {
                    const col = dbToExcel[f.key];
                    return (
                      <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 7, background: col ? C.greenBg : C.redBg, border: `1px solid ${col ? C.green : C.red}`, borderRadius: 6, padding: '6px 9px' }}>
                        <span style={{ color: col ? C.green : C.red, fontSize: 12 }}>{col ? '✓' : '✗'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: col ? C.t1 : C.red, fontFamily: "'Inter', sans-serif" }}>{f.label}</div>
                          <div style={{ fontSize: 9, fontFamily: "'Inter', sans-serif", color: col ? C.green : C.red }}>{col ? `← "${col}"` : 'NOT FOUND'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 3, marginBottom: 8 }}>
                  {DB_FIELDS.filter(f => f.section === 'core').map(f => {
                    const col = dbToExcel[f.key];
                    return (
                      <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 7px', borderRadius: 5, background: col ? C.greenBg : 'transparent', border: `1px solid ${col ? C.green : C.border}` }}>
                        <span style={{ fontSize: 10, color: col ? C.green : C.t4 }}>{col ? '✓' : '—'}</span>
                        <span style={{ fontSize: 10, color: col ? C.t2 : C.t4, fontFamily: "'Inter', sans-serif" }}>{f.label}{col ? <span style={{ color: C.t3, fontFamily: "'Inter', sans-serif" }}> "{col}"</span> : ''}</span>
                      </div>
                    );
                  })}
                </div>
                {fitmentMapped.length > 0 && (
                  <div style={{ fontSize: 10, color: C.sky, fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>
                    🔗 {fitmentMapped.length} fitment column{fitmentMapped.length > 1 ? 's' : ''} detected: {fitmentMapped.map(f => dbToExcel[f.key]).join(', ')}
                  </div>
                )}
                {missingRequired.length > 0 && (
                  <div style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 7, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: C.red, fontFamily: "'Inter', sans-serif" }}>
                    ⚠ <strong>{missingRequired.map(f => f.label).join(' & ')}</strong> not found — rows missing both will be skipped.
                  </div>
                )}
                <button onClick={() => setAnalysisStep('confirmed')}
                  style={{ width: '100%', background: C.red, color: '#fff', border: 'none', borderRadius: 9, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", boxShadow: `0 0 18px ${C.redBg}` }}>
                  ✓ Analysis Done — Proceed to Import →
                </button>
              </div>
            );
          })()}

          {/* ── Confirmed step ── */}
          {analysisStep === 'confirmed' && !importing && (
            <div style={{ marginBottom: 12 }}>
              {/* Collapsed column summary */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '10px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' }}>
                    {Object.keys(fileData.colMap).length}/{fileData.headers.length} cols matched
                  </span>
                  {defaultMake && <span style={{ background: C.violetBg, border: `1px solid ${C.violet}`, color: C.violet, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontFamily: "'Inter', sans-serif" }}>🔗 {defaultMake}{defaultModel ? ` → ${defaultModel}` : ' (all)'}</span>}
                  {defaultCategory && <span style={{ background: C.amberBg, border: `1px solid ${C.amber}`, color: C.amber, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontFamily: "'Inter', sans-serif" }}>📂 {defaultCategory}</span>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                    {fileData.headers.map(h => { const m = fileData.colMap[h]; return <span key={h} style={{ background: m ? C.greenBg : C.borderLight, border: `1px solid ${m ? C.green : C.border}`, borderRadius: 4, padding: '2px 6px', fontSize: 9, color: m ? C.green : C.t4, fontFamily: "'Inter', sans-serif" }}>{h}{m ? ` → ${m}` : ''}</span>; })}
                  </div>
                  <button onClick={() => setAnalysisStep('analyzing')} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.t3, cursor: 'pointer', padding: '3px 9px', fontSize: 10, fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>← Re-analyze</button>
                </div>
              </div>
              {/* Preview table */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 9, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: "'Inter', sans-serif" }}>Preview — First 5 Rows</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                    <thead><tr>{fileData.headers.slice(0, 8).map(h => <th key={h} style={{ padding: '7px 11px', fontSize: 9, fontWeight: 700, color: fileData.colMap[h] ? C.green : C.t4, borderBottom: `1px solid ${C.border}`, textAlign: 'left', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>{h}</th>)}{fileData.headers.length > 8 && <th style={{ padding: '7px 11px', fontSize: 9, color: C.t4, borderBottom: `1px solid ${C.border}` }}>+{fileData.headers.length - 8}</th>}</tr></thead>
                    <tbody>{fileData.preview.map((row, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>{fileData.headers.slice(0, 8).map(h => <td key={h} style={{ padding: '6px 11px', fontSize: 11, color: C.t2, fontFamily: "'Inter', sans-serif", maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[h] != null ? String(row[h]) : <span style={{ color: C.t4 }}>—</span>}</td>)}{fileData.headers.length > 8 && <td />}</tr>)}</tbody>
                  </table>
                </div>
              </div>
              {/* Import button */}
              <button onClick={handleImport} disabled={!fileData.mapped}
                style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em', boxShadow: `0 0 20px ${C.redBg}`, width: '100%' }}>
                ⬆ Import {fileData.mapped.toLocaleString('en-IN')} Parts to Database
              </button>
            </div>
          )}

          {/* ── Importing — progress bar ── */}
          {importing && importProg && (
            <div style={{ marginBottom: 14 }}>
              {/* Progress bar — animated fill */}
              <div style={{ position: 'relative', height: 24, marginBottom: 10, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                {/* Fill — always shimmer-animated while importing */}
                {(() => {
                  const pct = (importProg.done / importProg.total) * 100;
                  // Minimum 2% visual width as soon as any rows are done (avoids invisible bar for huge files)
                  const barW = Math.max(importProg.done > 0 && importProg.active ? 2 : 0, pct);
                  const label = batchInFlight ? 'Uploading…' : (pct < 1 && pct > 0 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`);
                  return (<>
                    <div style={{ position: 'absolute', inset: 0, width: `${barW}%`, background: 'linear-gradient(90deg,#8B0000 0%,#FF1F3A 35%,#FF6B35 70%,#FFB347 100%)', backgroundSize: '300% auto', animation: 'rp-shimmer 1.2s linear infinite', borderRadius: '8px 0 0 8px', transition: 'width 0.5s ease' }} />
                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: "'JetBrains Mono', monospace", zIndex: 2, mixBlendMode: 'difference' }}>
                      {label}
                    </div>
                  </>);
                })()}
              </div>
              {/* Live counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 6 }}>
                {[
                  { label: 'Processed', val: `${importProg.done.toLocaleString('en-IN')}/${importProg.total.toLocaleString('en-IN')}`, color: C.t3 },
                  { label: 'Added',     val: importProg.created.toLocaleString('en-IN'),   color: C.green },
                  { label: 'Updated',   val: importProg.updated.toLocaleString('en-IN'),   color: C.sky },
                  { label: 'Unchanged', val: importProg.unchanged.toLocaleString('en-IN'), color: C.t3 },
                  { label: 'Skipped',   val: importProg.invalid.toLocaleString('en-IN'),   color: C.red },
                ].map(c => (
                  <div key={c.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: c.color, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", lineHeight: 1.2 }}>{c.val}</div>
                    <div style={{ fontSize: 8, color: C.t4, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── divider ── */}
      <div style={{ height: 1, background: C.border, margin: '4px 0 20px' }} />

      {/* ════════════ LIVE DATABASE ════════════ */}
      {dbStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 18 }}>
          {[
            { label: 'Total Parts',    val: dbStats.total,    color: C.red   },
            { label: 'Verified',       val: dbStats.verified, color: C.green },
            { label: 'Pending Review', val: dbStats.pending,  color: C.amber },
            { label: 'Rejected',       val: dbStats.rejected, color: C.red   },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderTop: `2px solid ${s.color}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", letterSpacing: '-0.02em' }}>{s.val?.toLocaleString('en-IN') ?? '—'}</div>
              <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.t4, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
          <input value={dbSearch} onChange={e => setDbSearch(e.target.value)} placeholder="Search by part name, OEM or brand…"
            style={{ width: '100%', background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 14px 10px 36px', color: C.t1, fontSize: 13, outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }} />
        </div>
        <button onClick={() => fetchDbParts(dbSearch, dbOffset)}
          style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 14px', color: C.t2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>↺ Refresh</button>
        <span style={{ fontSize: 11, color: C.t3, fontFamily: "'Inter', sans-serif" }}>{dbTotal.toLocaleString('en-IN')} parts</span>
      </div>

      {dbTotal === 0 && !dbLoading && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📦</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 6, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>Master catalog is empty</div>
          <div style={{ fontSize: 12, color: C.t3, fontFamily: "'Inter', sans-serif" }}>Upload a supplier Excel file above to get started.</div>
        </div>
      )}

      {(dbParts.length > 0 || dbLoading) && (
        <div className="admin-table-wrap">
          <div className="admin-table-wrap-inner">
            <table style={{ minWidth: 900, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['OEM Number', 'Part Name', 'Brand', 'Category', 'Part Type', 'GST %', 'Status', 'Shops', 'Created', 'Updated'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.09em', borderBottom: `1px solid ${C.border}`, textAlign: 'left', background: C.bg, whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dbLoading ? (
                  <tr><td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: C.t4, fontFamily: "'Inter', sans-serif" }}>Loading…</td></tr>
                ) : dbParts.map(p => (
                  <tr key={p.masterPartId} className="admin-table-row" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                    <td style={{ padding: '10px 14px', fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.t1, whiteSpace: 'nowrap' }}>{p.primaryOemNumber || <span style={{ color: C.t4 }}>—</span>}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: C.t1, fontFamily: "'Inter', sans-serif", maxWidth: 240 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.partName}</div></td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: C.t2, fontFamily: "'Inter', sans-serif" }}>{p.brand || <span style={{ color: C.t4 }}>—</span>}</td>
                    <td style={{ padding: '10px 14px', fontSize: 10, color: C.t3, fontFamily: "'Inter', sans-serif" }}>{p.categoryL1 || <span style={{ color: C.t4 }}>—</span>}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {p.partType === 'OES'
                        ? <span style={{ background: '#15803d20', border: '1px solid #16a34a', color: '#16a34a', borderRadius: 5, padding: '2px 7px', fontSize: 9, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>OES</span>
                        : <span style={{ background: '#1d4ed820', border: '1px solid #2563eb', color: '#2563eb', borderRadius: 5, padding: '2px 7px', fontSize: 9, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>OEM</span>
                      }
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: C.amber, fontFamily: "'Inter', sans-serif" }}>{p.gstRate}%</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ background: p.status === 'VERIFIED' ? C.greenBg : C.amberBg, border: `1px solid ${p.status === 'VERIFIED' ? C.green : C.amber}`, color: p.status === 'VERIFIED' ? C.green : C.amber, borderRadius: 5, padding: '2px 7px', fontSize: 9, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{p.status}</span></td>
                    <td style={{ padding: '10px 14px', fontSize: 10, color: C.sky, fontFamily: "'Inter', sans-serif" }}>{p._count?.inventory ?? 0}</td>
                    <td style={{ padding: '10px 14px', fontSize: 10, color: C.t3, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 10, color: C.t3, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {dbTotal > DB_LIMIT && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.t3, fontFamily: "'Inter', sans-serif", marginRight: 8 }}>
            {dbOffset + 1}–{Math.min(dbOffset + DB_LIMIT, dbTotal)} of {dbTotal.toLocaleString('en-IN')}
          </span>
          <button disabled={dbOffset === 0} onClick={() => { const o = dbOffset - DB_LIMIT; setDbOffset(o); fetchDbParts(dbSearch, o); }}
            style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 13px', color: dbOffset === 0 ? C.t4 : C.t2, fontSize: 12, fontWeight: 600, cursor: dbOffset === 0 ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif" }}>← Prev</button>
          <button disabled={dbOffset + DB_LIMIT >= dbTotal} onClick={() => { const o = dbOffset + DB_LIMIT; setDbOffset(o); fetchDbParts(dbSearch, o); }}
            style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 13px', color: dbOffset + DB_LIMIT >= dbTotal ? C.t4 : C.t2, fontSize: 12, fontWeight: 600, cursor: dbOffset + DB_LIMIT >= dbTotal ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif" }}>Next →</button>
        </div>
      )}
    </>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────
export function SuperAdminPage({ onImpersonate, currentUser, activeTab: propTab, setActiveTab: propSetTab }) {
  const [localTab, setLocalTab] = useState("users"); // "users" | "verifications"
  const activeTab = propTab ?? localTab;
  const setActiveTab = propSetTab ?? setLocalTab;
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

  // ── Autodukan tab state ──────────────────────────────────────────────────
  const [adStats, setAdStats]         = useState<any>(null);
  const [adLoading, setAdLoading]     = useState(false);
  const [adImporting, setAdImporting] = useState(false);
  const [adBatchSize, setAdBatchSize] = useState(500);
  const [adCategory, setAdCategory]   = useState("");
  const [adResult, setAdResult]       = useState<{ inserted: number; attempted: number; message: string } | null>(null);
  const [adError, setAdError]         = useState("");
  const [adJustImported, setAdJustImported] = useState<any[] | null>(null);

  // (Scraper control removed — scraping runs locally via scrape_autodukan_local.py)

  const ALL_AD_CATS = [
    "AIR CONDITIONING","BELT & CHAIN DRIVE","BODY PARTS","BRAKE SYSTEM",
    "CAR ACCESSORIES","CAR CARE","CLUTCH SYSTEM","COOLING SYSTEM",
    "ELECTRICAL","ENGINE PARTS","EXHAUST SYSTEM","FASTENERS",
    "FILTERS","FUEL SYSTEM","GASKET & SEALS","HYBRID & ELECTRIC DRIVE",
    "INTERIORS COMFORT & SAFETY","LIGHTING","OILS & FLUIDS","SERVICE KIT",
    "STEERING","SUSPENSION","TRANSMISSION","WHEELS & TYRE",
    "WINDSCREEN CLEANING SYSTEM",
  ];
  const TOTAL_EXPECTED_PRODUCTS = 1060600;

  const fetchAdStats = useCallback(async () => {
    setAdLoading(true);
    try {
      const res = await api.get("/api/admin/autodukan/stats");
      setAdStats(res.data);
    } catch (e: any) {
      setAdError(e.message || "Failed to load autodukan stats");
    }
    setAdLoading(false);
  }, []);

  const handleAdImport = async () => {
    setAdError("");
    setAdResult(null);
    setAdJustImported(null);
    setAdImporting(true);
    try {
      const res: any = await api.post("/api/admin/autodukan/import", {
        batchSize: adBatchSize,
        categoryFilter: adCategory || null,
      });
      setAdResult(res.data);
      if (res.data?.previewParts?.length) setAdJustImported(res.data.previewParts);
      fetchAdStats();
    } catch (e: any) {
      setAdError(e.message || "Import failed");
    }
    setAdImporting(false);
  };

  // Load stats when tab becomes active; re-fetch every 30s
  useEffect(() => {
    if (activeTab !== "autodukan") return;
    fetchAdStats();
    const t = setInterval(fetchAdStats, 30000);
    return () => clearInterval(t);
  }, [activeTab, fetchAdStats]);

  // Background import progress widget — reads from module store, survives tab switches
  const [bgImport, setBgImport] = useState(() => importStore.get());
  useEffect(() => importStore.subscribe(setBgImport), []);

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
    page: { minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: FONT.body },
    header: {
      background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      padding: "0 28px",
      position: "sticky", top: 0, zIndex: 99,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 56, gap: 16,
    },
    title: { display: "flex", alignItems: "center", gap: 12 },
    badge: {
      width: 32, height: 32, borderRadius: 6,
      background: C.red,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, boxShadow: `0 0 16px ${C.redBg}`,
      flexShrink: 0,
    },
    titleText: { fontSize: 15, fontWeight: 700, color: C.t1, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" },
    titleSub: { fontSize: 10, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Inter', sans-serif" },
    body: { padding: "28px 28px", maxWidth: 1300, margin: "0 auto" },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, marginBottom: 28 },
    statCard: (color) => ({
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderTop: `2px solid ${color}`,
      borderRadius: 12,
      padding: "18px 20px",
      transition: "border-color 0.2s, box-shadow 0.2s",
      cursor: "default",
    }),
    statVal: { fontSize: 26, fontWeight: 700, color: C.t1, marginBottom: 4, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", letterSpacing: "-0.02em" },
    statLabel: { fontSize: 10, color: C.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: "'Inter', sans-serif" },
    controls: { display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" },
    searchWrap: {
      flex: 1, minWidth: 220, position: "relative", display: "flex", alignItems: "center",
    },
    searchInput: {
      flex: 1, minWidth: 220, background: C.surface, border: `1.5px solid ${C.border}`,
      borderRadius: 10, padding: "10px 14px 10px 38px", color: C.t1, fontSize: 14,
      outline: "none", fontFamily: FONT.ui, width: "100%",
    },
    searchIcon: {
      position: "absolute", left: 13, color: C.t3, fontSize: 14, pointerEvents: "none",
    },
    select: {
      background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 10,
      padding: "10px 14px", color: C.t1, fontSize: 13, outline: "none",
      fontFamily: FONT.ui, cursor: "pointer",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
      padding: "11px 16px", fontSize: 10, fontWeight: 700, color: C.t3,
      textTransform: "uppercase", letterSpacing: "0.09em",
      borderBottom: `1px solid ${C.border}`, textAlign: "left",
      background: C.surface, whiteSpace: "nowrap",
    },
    td: {
      padding: "13px 16px", fontSize: 13, color: C.t2,
      borderBottom: `1px solid ${C.border}`,
      fontFamily: FONT.ui, verticalAlign: "middle",
    },
    row: { transition: "background 0.12s", cursor: "default" },
    btnImpersonate: {
      background: C.violetBg,
      border: `1px solid ${C.violet}`,
      borderRadius: 7, padding: "5px 11px",
      color: C.violet, fontSize: 11, fontWeight: 700, cursor: "pointer",
      fontFamily: FONT.ui, transition: "all 0.15s", whiteSpace: "nowrap",
    },
    btnToggle: (isActive) => ({
      background: isActive ? C.redBg : C.greenBg,
      border: `1px solid ${isActive ? C.red : C.green}`,
      borderRadius: 7, padding: "5px 10px",
      color: isActive ? C.red : C.green,
      fontSize: 11, fontWeight: 600,
      cursor: "pointer", fontFamily: FONT.ui, whiteSpace: "nowrap",
    }),
    pagination: { display: "flex", gap: 8, justifyContent: "space-between", marginTop: 18, alignItems: "center", flexWrap: "wrap" },
    pageBtn: (active) => ({
      background: active ? C.amber : "transparent",
      border: `1px solid ${active ? C.amber : C.border}`,
      borderRadius: 8, padding: "7px 16px", color: active ? "#fff" : C.t2,
      fontSize: 12, fontWeight: 700, cursor: active ? "default" : "pointer", fontFamily: FONT.ui,
      transition: "all 0.15s",
    }),
    btnAddUser: {
      background: C.amber, border: "none", borderRadius: 8, padding: "9px 18px",
      color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif",
      display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
      textTransform: "uppercase", letterSpacing: "0.06em",
      transition: "filter 0.15s, transform 0.15s",
      boxShadow: `0 0 16px ${C.amberBg}`,
    },
    tab: (active) => ({
      padding: "12px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
      border: "none", background: "none", fontFamily: FONT.ui,
      color: active ? C.amber : C.t3,
      borderBottom: active ? `2px solid ${C.amber}` : "2px solid transparent",
      transition: "all 0.15s",
    }),
    statusBadge: (isActive) => ({
      background: isActive ? C.greenBg : C.redBg,
      border: `1px solid ${isActive ? C.green : C.red}`,
      color: isActive ? C.green : C.red,
      borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, fontFamily: FONT.ui,
      letterSpacing: "0.04em", whiteSpace: "nowrap",
    }),
  };

  const pages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT);
  const filteredUserTypes = userTypes.filter(ut => ALLOWED_ROLE_SLUGS.includes(ut.slug));

  const ADMIN_CSS = `
    /* ── Stats grid ── */
    .admin-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 28px; }
    .admin-stat-card:hover { border-color: ${C.amber} !important; }

    /* ── Admin controls row ── */
    .admin-controls-row { display: flex; gap: 10px; margin-bottom: 18px; align-items: center; flex-wrap: wrap; }
    .admin-search-input { flex: 1; min-width: 200px; }

    /* ── Add user button hover ── */
    .admin-add-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }

    /* ── Table ── */
    .admin-table-wrap { background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 12px; overflow: hidden; }
    .admin-table-wrap-inner { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .admin-table-wrap-inner table { min-width: 900px; width: 100%; border-collapse: collapse; }
    .admin-table-row:hover { background: ${C.borderLight} !important; }

    /* ── User card layout for mobile ── */
    .admin-user-card { display: none; }

    /* ── Pagination ── */
    .admin-pagination { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; align-items: center; flex-wrap: wrap; }

    /* ── Impersonate / toggle btn hover ── */
    .btn-impersonate:hover { background: ${C.violetBg} !important; border-color: ${C.violet} !important; }
    .btn-toggle-active:hover { background: rgba(190,43,26,0.14) !important; }
    .btn-toggle-inactive:hover { background: rgba(22,163,74,0.14) !important; }

    /* ── Section heading ── */
    .admin-section-title { font-size: 14px; font-weight: 700; color: ${C.t1}; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }

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
        border-bottom: 1px solid ${C.border} !important;
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
    { label: "Total Users",  key: "totalUsers",  color: C.violet, icon: "👥",  glow: C.violetBg },
    { label: "Shop Owners",  key: "shopOwners",  color: C.green,  icon: "🏪",  glow: C.greenBg  },
    { label: "Customers",    key: "customers",   color: C.sky,    icon: "🛒",  glow: C.skyBg    },
    { label: "Total Shops",  key: "totalShops",  color: C.amber,  icon: "📦",  glow: C.amberBg  },
    { label: "Admins",       key: "admins",      color: C.violet, icon: "🛡️", glow: C.violetBg },
  ];

  return (
    <div style={S.page}>
      <style>{ADMIN_CSS}</style>

      {/* Header removed — brand + nav live in AdminShell header */}

      <div className="admin-page-body" style={S.body}>

        {/* Global error / success */}
        {error && (
          <div style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 10, padding: "11px 16px", color: C.red, fontSize: 13, marginBottom: 20, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 10 }}>
            <span>⚠</span> {error}
          </div>
        )}
        {successMsg && (
          <div style={{ background: C.greenBg, border: `1px solid ${C.green}`, borderRadius: 10, padding: "11px 16px", color: C.green, fontSize: 13, marginBottom: 20, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 10 }}>
            <span>✓</span> {successMsg}
          </div>
        )}

        {/* ── Stats Grid — only on All Users tab ── */}
        {activeTab === "users" && stats && (
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

        {/* ── Tabs — hidden when parent controls tabs via propTab ── */}
        {!propTab && (
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 24, gap: 0 }}>
            <button style={S.tab(activeTab === "users")} onClick={() => setActiveTab("users")}>
              Users
            </button>
            <button style={S.tab(activeTab === "verifications")} onClick={() => setActiveTab("verifications")}>
              Verifications
              {pendingCount > 0 && (
                <span style={{ marginLeft: 7, background: C.amber, color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{pendingCount}</span>
              )}
            </button>
            <button style={S.tab(activeTab === "catalog")} onClick={() => setActiveTab("catalog")}>
              Parts Catalog
            </button>
            <button style={S.tab(activeTab === "autodukan")} onClick={() => setActiveTab("autodukan")}>
              Autodukan Import
            </button>
          </div>
        )}

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
                          <div style={{ height: 56, background: `linear-gradient(90deg, ${C.surface} 25%, ${C.borderLight} 50%, ${C.surface} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite" }} />
                        </td></tr>
                      ))
                    ) : users.length === 0 ? (
                      <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: "48px 24px", color: C.t3 }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.t2 }}>No users found</div>
                        <div style={{ fontSize: 12, color: C.t4, marginTop: 4 }}>Try adjusting your search or filter</div>
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
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 2 }}>{u.name || <span style={{ color: C.t4, fontStyle: "italic" }}>No name</span>}</div>
                              <div style={{ fontSize: 11, color: C.t3, fontFamily: FONT.mono }}>{u.email || u.phone || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={S.td}><RoleBadge slug={u.userType?.slug || u.role} name={u.userType?.name} /></td>
                        <td style={S.td}>
                          <select
                            style={{
                              background: C.surface, color: C.t1, border: `1px solid ${C.border}`,
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
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{u.shop.name}</div>
                              <div style={{ fontSize: 11, color: C.t3 }}>{u.shop.city}</div>
                            </div>
                          ) : <span style={{ color: C.t4 }}>—</span>}
                        </td>
                        <td style={{ ...S.td, color: C.t3 }}>
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : <span style={{ color: C.t4 }}>Never</span>}
                        </td>
                        <td style={{ ...S.td, textAlign: "center", color: C.t2, fontWeight: 700 }}>{u.loginCount ?? 0}</td>
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
                  <div style={{ textAlign: "center", padding: 40, color: C.t3 }}>Loading users...</div>
                ) : users.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: C.t3 }}>No users found</div>
                ) : users.map(u => (
                  <div key={u.userId} style={{
                    borderBottom: `1px solid ${C.border}`,
                    padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,
                    background: "transparent", transition: "background 0.12s",
                  }}>
                    {/* Row 1: Avatar + name + status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar user={u} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, fontFamily: FONT.ui }}>{u.name || <span style={{ color: C.t4, fontStyle: "italic" }}>No name</span>}</div>
                        <div style={{ fontSize: 12, color: C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email || u.phone || "—"}</div>
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
                          background: C.surface, color: C.t1, border: `1px solid ${C.border}`,
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
                        <span style={{ fontSize: 12, color: C.t3, fontFamily: FONT.ui }}>🏪 {u.shop.name}, {u.shop.city}</span>
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
                <span style={{ fontSize: 12, color: C.t3, fontFamily: FONT.ui }}>
                  Showing <span style={{ color: C.t1, fontWeight: 700 }}>{offset + 1}–{Math.min(offset + LIMIT, total)}</span> of <span style={{ color: C.t1, fontWeight: 700 }}>{total}</span> users
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
              <div style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 10, padding: "11px 16px", color: C.red, fontSize: 13, marginBottom: 20, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 10 }}>
                <span>⚠</span> {verError}
              </div>
            )}
            {verSuccess && (
              <div style={{ background: C.greenBg, border: `1px solid ${C.green}`, borderRadius: 10, padding: "11px 16px", color: C.green, fontSize: 13, marginBottom: 20, fontFamily: FONT.ui, display: "flex", alignItems: "center", gap: 10 }}>
                <span>✓</span> {verSuccess}
              </div>
            )}

            {verLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ height: 160, borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, animation: "shimmer 1.5s ease infinite", backgroundImage: `linear-gradient(90deg, ${C.surface} 25%, ${C.borderLight} 50%, ${C.surface} 75%)`, backgroundSize: "200% 100%" }} />
                ))}
              </div>
            ) : verifications.length === 0 ? (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🎉</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, marginBottom: 6, fontFamily: FONT.ui }}>Queue is clear!</div>
                <div style={{ fontSize: 13, color: C.t3, fontFamily: FONT.ui }}>No pending shop owner applications to review.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                {verifications.map(v => (
                  <div key={v.userId} style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 16, overflow: "hidden",
                    boxShadow: v.verificationStatus === "PENDING" ? `0 0 0 1px ${C.amberBg}, 0 4px 20px rgba(26,18,5,0.1)` : `0 4px 20px rgba(26,18,5,0.06)`,
                    transition: "box-shadow 0.2s",
                  }}>
                    {/* Card top bar */}
                    <div style={{ padding: "14px 18px", background: C.bg, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Avatar user={v} size={40} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{v.name || <span style={{ fontStyle: "italic", color: C.t4 }}>No name</span>}</div>
                          <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{v.email || "—"}</div>
                        </div>
                      </div>
                      <VerificationBadge status={v.verificationStatus} />
                    </div>

                    {/* Card body */}
                    <div style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 10, color: C.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Registered</div>
                          <div style={{ fontSize: 12, color: C.t2 }}>
                            {v.createdAt ? new Date(v.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </div>
                        </div>
                        {v.verificationStatus === "REJECTED" && v.verificationNote && (
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, color: C.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Rejection Reason</div>
                            <div style={{ fontSize: 12, color: C.red, lineHeight: 1.4 }}>{v.verificationNote}</div>
                          </div>
                        )}
                      </div>

                      {rejectingId !== v.userId ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            style={{ flex: 1, background: C.greenBg, border: `1px solid ${C.green}`, color: C.green, borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(22,163,74,0.15)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.greenBg; }}
                            onClick={() => handleVerify(v.userId, "APPROVE")}
                          >
                            ✓ Approve
                          </button>
                          <button
                            style={{ flex: 1, background: C.redBg, border: `1px solid ${C.red}`, color: C.red, borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui, transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(190,43,26,0.14)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.redBg; }}
                            onClick={() => { setRejectingId(v.userId); setRejectReason(""); setVerError(""); }}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 8 }}>Rejection reason (required)</div>
                          <textarea
                            style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.red}`, borderRadius: 10, padding: "10px 14px", color: C.t1, fontSize: 13, fontFamily: FONT.ui, outline: "none", resize: "vertical", minHeight: 72, boxSizing: "border-box", marginBottom: 10 }}
                            placeholder="Explain why this application is being rejected..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            autoFocus
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              style={{ flex: 1, background: C.red, border: "none", color: "#fff", borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT.ui }}
                              onClick={() => {
                                if (!rejectReason.trim()) { setVerError("A rejection reason is required"); return; }
                                handleVerify(v.userId, "REJECT", rejectReason);
                              }}
                            >Confirm Reject</button>
                            <button
                              style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.t3, borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT.ui }}
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
        {activeTab === "catalog" && (
          <>
            <PendingPartsSection />
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.t1, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Inter', sans-serif" }}>
                📦 Bulk Import from Excel
              </div>
              <CatalogTab />
            </div>
          </>
        )}

        {/* ─── AUTODUKAN TAB ─── */}
        {activeTab === "autodukan" && (() => {
          const canImport = adStats
            ? adStats.importsLeft > 0 && !adStats.nextAvailableAt
            : false;
          const nowMs = Date.now();
          const nextMs = adStats?.nextAvailableAt ? new Date(adStats.nextAvailableAt).getTime() : null;
          const waitMin = nextMs ? Math.ceil((nextMs - nowMs) / 60000) : 0;
          const waitHr  = nextMs ? (waitMin / 60).toFixed(1) : "0";

          const overallPct = adStats?.stagingTotal
            ? Math.min(100, Math.round((adStats.stagingTotal / TOTAL_EXPECTED_PRODUCTS) * 100))
            : 0;

          return (
            <div style={{ maxWidth: 900 }}>
              {/* ── Header ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.t1, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
                  Autodukan Parts Pipeline
                </div>
                <div style={{ fontSize: 12, color: C.t3, fontFamily: FONT.ui, marginTop: 2 }}>
                  Scrape from autodukan.com → Staging DB → Import to Master Catalog · Auto-refreshes every 15s
                </div>
              </div>


              {/* ══ PIPELINE FLOW BAR ══ */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14, overflowX: 'auto' }}>
                  {[
                    { step: '1', label: 'Scrape', sub: 'Local script', color: C.t3, active: false },
                    { step: '→', label: '', sub: '', color: C.t4, active: false },
                    { step: '2', label: 'Staging DB', sub: (adStats?.stagingTotal || 0).toLocaleString() + ' parts', color: C.sky, active: false },
                    { step: '→', label: '', sub: '', color: C.t4, active: false },
                    { step: '3', label: 'Import', sub: (adStats?.todayCount ?? '—') + '/' + (adStats?.maxPerDay ?? 3) + ' today', color: C.amber, active: adImporting },
                    { step: '→', label: '', sub: '', color: C.t4, active: false },
                    { step: '4', label: 'Master Catalog', sub: (adStats?.alreadyInMaster || 0).toLocaleString() + ' parts', color: C.green, active: false },
                  ].map((s: any, i: number) => s.step === '→' ? (
                    <div key={i} style={{ fontSize: 18, color: C.t4, padding: '0 6px' }}>→</div>
                  ) : (
                    <div key={i} style={{ background: s.active ? `${s.color}22` : C.bg, border: `1.5px solid ${s.active ? s.color : C.border}`, borderRadius: 8, padding: '9px 14px', textAlign: 'center', minWidth: 110 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{s.step}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: s.active ? s.color : C.t1, fontFamily: FONT.ui, marginTop: 3 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: C.t3, fontFamily: FONT.ui, marginTop: 1 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: C.t3, fontFamily: FONT.ui }}>
                    Staging DB — {(adStats?.stagingTotal || 0).toLocaleString()} of {TOTAL_EXPECTED_PRODUCTS.toLocaleString()} products
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.amber, fontFamily: FONT.ui }}>{overallPct}%</span>
                </div>
                <div style={{ height: 6, background: C.borderLight, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${overallPct}%`, background: `linear-gradient(90deg, ${C.amber}, ${C.sky})`, borderRadius: 99, transition: 'width 0.6s ease' }} />
                </div>
              </div>

              {/* ══ IMPORT TO CATALOG ══ */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '18px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: FONT.ui, marginBottom: 12 }}>
                    Import to Master Catalog
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: C.t3, fontFamily: FONT.ui, marginBottom: 6 }}>
                      Daily limit — {adStats?.todayCount ?? 0} of {adStats?.maxPerDay ?? 3} imports used today
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {Array.from({ length: adStats?.maxPerDay ?? 3 }).map((_: any, i: number) => (
                        <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i < (adStats?.todayCount ?? 0) ? C.green : C.borderLight, transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    {adStats?.nextAvailableAt && (
                      <div style={{ fontSize: 11, color: C.amber, fontFamily: FONT.ui, marginTop: 6 }}>
                        ⏳ Cooldown — next import in {waitMin}m · {adStats.importsLeft} left today
                      </div>
                    )}
                    {!adStats?.nextAvailableAt && adStats?.importsLeft === 0 && (
                      <div style={{ fontSize: 11, color: C.red, fontFamily: FONT.ui, marginTop: 6 }}>Daily limit reached. Resets at UTC midnight.</div>
                    )}
                    {!adStats?.nextAvailableAt && (adStats?.importsLeft ?? 0) > 0 && (
                      <div style={{ fontSize: 11, color: C.t3, fontFamily: FONT.ui, marginTop: 6 }}>
                        {adStats?.importsLeft} import{adStats?.importsLeft !== 1 ? 's' : ''} remaining today · min 2h between imports
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    {[
                      { label: 'In Staging',  val: (adStats?.stagingTotal ?? 0).toLocaleString(),    color: C.sky   },
                      { label: 'In Master',   val: (adStats?.alreadyInMaster ?? 0).toLocaleString(), color: C.green },
                      { label: 'To Import',   val: (adStats?.remaining ?? 0).toLocaleString(),       color: C.amber },
                    ].map((s: any) => (
                      <div key={s.label} style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{s.val}</div>
                        <div style={{ fontSize: 9, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT.ui, marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <select value={adBatchSize} onChange={e => setAdBatchSize(Number(e.target.value))}
                      style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', color: C.t1, fontSize: 12, fontFamily: FONT.ui, outline: 'none' }}>
                      {[100, 250, 500, 1000, 2000].map((n: number) => <option key={n} value={n}>{n.toLocaleString()} parts</option>)}
                    </select>
                    <select value={adCategory} onChange={e => setAdCategory(e.target.value)}
                      style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', color: C.t1, fontSize: 12, fontFamily: FONT.ui, outline: 'none' }}>
                      <option value=''>All categories</option>
                      {(adStats?.categories || ALL_AD_CATS).map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button onClick={handleAdImport} disabled={adImporting || !canImport} style={{
                    width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 800, borderRadius: 9, border: 'none',
                    background: adImporting ? C.borderLight : canImport ? C.red : C.borderLight,
                    color: (adImporting || !canImport) ? C.t3 : '#fff',
                    cursor: (adImporting || !canImport) ? 'not-allowed' : 'pointer',
                    fontFamily: "'Plus Jakarta Sans','Inter',sans-serif",
                    boxShadow: canImport && !adImporting ? `0 4px 20px ${C.red}55` : 'none',
                    transition: 'all 0.15s',
                  }}>
                    {adImporting ? '⏳ Importing…' : canImport ? `Import ${adBatchSize.toLocaleString()} Parts to Master Catalog →` : adStats?.importsLeft === 0 ? 'Daily limit reached' : `Wait ${waitMin}m for cooldown`}
                  </button>
                  {adError && <div style={{ fontSize: 11, color: C.red, fontFamily: FONT.ui, marginTop: 8 }}>{adError}</div>}
                </div>
              </div>

              {/* ══ JUST IMPORTED PREVIEW ══ */}
              {adResult && (
                <div style={{ background: `${C.green}11`, border: `1.5px solid ${C.green}`, borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: adJustImported?.length ? 14 : 0 }}>
                    <div style={{ fontSize: 20 }}>✅</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.green, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                        Import complete — {adResult.inserted.toLocaleString()} new parts added
                      </div>
                      <div style={{ fontSize: 11, color: C.t3, fontFamily: FONT.ui }}>
                        {(adResult.attempted ?? 0).toLocaleString()} attempted · {(adResult.attempted ?? 0) - adResult.inserted} already in master
                        {adCategory ? ` · category: ${adCategory}` : ''}
                      </div>
                    </div>
                  </div>
                  {adJustImported && adJustImported.length > 0 && (
                    <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['Part Name', 'OEM Number', 'Brand', 'Category', 'Type', 'Status'].map((h: string) => (
                              <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: C.t3, textAlign: 'left', background: C.bg, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: FONT.ui, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {adJustImported.slice(0, 15).map((p: any) => (
                            <tr key={p.id}>
                              <td style={{ padding: '8px 12px', fontSize: 12, color: C.t1, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}`, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.partName}</td>
                              <td style={{ padding: '8px 12px', fontSize: 11, color: C.t2, fontFamily: "'Fira Code',monospace", borderBottom: `1px solid ${C.borderLight}` }}>{p.oemNumber}</td>
                              <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: C.amber, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>{p.brand}</td>
                              <td style={{ padding: '8px 12px', fontSize: 11, color: C.t3, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>{p.category}</td>
                              <td style={{ padding: '8px 12px', fontSize: 11, color: C.sky, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>{p.partType}</td>
                              <td style={{ padding: '8px 12px', borderBottom: `1px solid ${C.borderLight}` }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: '#f59e0b22', borderRadius: 4, padding: '2px 7px', fontFamily: FONT.ui }}>{p.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {adJustImported.length > 15 && (
                        <div style={{ padding: '8px 12px', fontSize: 11, color: C.t3, fontFamily: FONT.ui, background: C.bg, borderTop: `1px solid ${C.border}` }}>
                          + {adJustImported.length - 15} more parts imported
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ══ RECENTLY ADDED TO MASTER CATALOG ══ */}
              {adStats?.recentImports?.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: FONT.ui }}>
                      Recently Added to Master Catalog
                    </div>
                    <span style={{ fontSize: 10, color: C.t4, fontFamily: FONT.ui }}>last {adStats.recentImports.length} entries</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Part Name', 'OEM Number', 'Brand', 'Category', 'Type', 'Added'].map((h: string) => (
                          <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: C.t3, textAlign: 'left', background: C.bg, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: FONT.ui, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adStats.recentImports.map((p: any) => (
                        <tr key={p.id}>
                          <td style={{ padding: '8px 12px', fontSize: 12, color: C.t1, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}`, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.partName}</td>
                          <td style={{ padding: '8px 12px', fontSize: 11, color: C.t2, fontFamily: "'Fira Code',monospace", borderBottom: `1px solid ${C.borderLight}` }}>{p.oemNumber}</td>
                          <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: C.amber, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>{p.brand}</td>
                          <td style={{ padding: '8px 12px', fontSize: 11, color: C.t3, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>{p.category}</td>
                          <td style={{ padding: '8px 12px', fontSize: 11, color: C.sky, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>{p.partType}</td>
                          <td style={{ padding: '8px 12px', fontSize: 11, color: C.t3, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>
                            {new Date(p.addedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ══ IMPORT HISTORY ══ */}
              {adStats?.recentLogs?.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: FONT.ui }}>
                    Import History
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['When', 'By', 'Batch', 'Category', 'Inserted'].map((h: string) => (
                          <th key={h} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: C.t3, textAlign: 'left', background: C.bg, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: FONT.ui, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adStats.recentLogs.map((log: any) => (
                        <tr key={log.id}>
                          <td style={{ padding: '9px 12px', fontSize: 12, color: C.t2, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>
                            {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td style={{ padding: '9px 12px', fontSize: 12, color: C.t2, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>{log.adminEmail || '—'}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12, color: C.t2, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>{(log.batchSize || 0).toLocaleString()}</td>
                          <td style={{ padding: '9px 12px', fontSize: 12, color: C.t2, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>{log.categoryFilter || <span style={{ color: C.t4 }}>All</span>}</td>
                          <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 800, color: C.green, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>+{(log.insertedCount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ══ OEM BRAND BREAKDOWN ══ */}
              {adStats?.brandStats?.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: FONT.ui }}>
                      OEM Brand Breakdown — Staging
                    </div>
                    <span style={{ fontSize: 10, color: C.t4, fontFamily: FONT.ui }}>{adStats.brandStats.length} brands</span>
                  </div>
                  <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                          {['Brand', 'Total', 'OEM', 'OES', 'Categories'].map((h: string) => (
                            <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: C.t3, textAlign: h === 'Brand' ? 'left' : 'right', background: C.bg, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: FONT.ui, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {adStats.brandStats.map((b: any, i: number) => (
                          <tr key={b.brand} style={{ background: i % 2 === 0 ? 'transparent' : `${C.bg}88` }}>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: C.amber, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>{b.brand}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 800, color: C.t1, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}`, textAlign: 'right' }}>{b.total.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, color: C.sky, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}`, textAlign: 'right' }}>{b.oemCount.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, color: C.green, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}`, textAlign: 'right' }}>{b.oesCount.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', fontSize: 11, color: C.t3, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}`, textAlign: 'right' }}>{b.categoryCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ══ CATEGORY BREAKDOWN ══ */}
              {adStats?.categoryStats?.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: FONT.ui }}>
                      Category Breakdown — Staging
                    </div>
                    <span style={{ fontSize: 10, color: C.t4, fontFamily: FONT.ui }}>{adStats.categoryStats.length} categories</span>
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                          {['Category', 'Total', 'OEM', 'OES'].map((h: string) => (
                            <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: C.t3, textAlign: h === 'Category' ? 'left' : 'right', background: C.bg, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: FONT.ui, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {adStats.categoryStats.map((c: any, i: number) => (
                          <tr key={c.category} style={{ background: i % 2 === 0 ? 'transparent' : `${C.bg}88` }}>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: C.t1, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}` }}>{c.category}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 800, color: C.t1, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}`, textAlign: 'right' }}>{c.total.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, color: C.sky, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}`, textAlign: 'right' }}>{c.oemCount.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, color: C.green, fontFamily: FONT.ui, borderBottom: `1px solid ${C.borderLight}`, textAlign: 'right' }}>{c.oesCount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          );
        })()}

      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal
          userTypes={userTypes}
          onClose={() => setShowAddUser(false)}
          onSuccess={handleAddUserSuccess}
        />
      )}

      {/* ─── Import Completion Popup (appears even when on other sections) ─── */}
      {bgImport?.popup && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(26,18,5,0.5)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{ background: C.surface, border: `1px solid ${C.green}`, borderRadius: 18, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: `0 24px 80px rgba(26,18,5,0.18), 0 0 40px ${C.greenBg}` }}>
            {/* Header */}
            <div style={{ background: C.greenBg, padding: '20px 24px', borderBottom: `1px solid ${C.green}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 30 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.green, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>Import Complete!</div>
                <div style={{ fontSize: 11, color: C.t3, fontFamily: "'Inter', sans-serif", marginTop: 3 }}>
                  {bgImport.total.toLocaleString('en-IN')} rows processed from <span style={{ color: C.t2 }}>{bgImport.filename}</span>
                </div>
              </div>
              <button
                onClick={() => importStore.set({ ...bgImport, popup: false })}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 11px', color: C.t3, fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>
                ✕
              </button>
            </div>
            {/* Stat rows — only show rows with non-zero values */}
            <div style={{ padding: '6px 0' }}>
              {[
                { icon: '✨', label: 'Newly Added',          value: bgImport.created,   color: C.green,  bg: C.greenBg  },
                { icon: '✏️', label: 'Updated / Modified',   value: bgImport.updated,   color: C.sky,    bg: C.skyBg    },
                { icon: '✓',  label: 'No Changes',           value: bgImport.unchanged, color: C.t3,     bg: 'transparent' },
                { icon: '🔗', label: 'Fitment Links Created', value: bgImport.fitments,  color: C.violet, bg: C.violetBg },
                { icon: '⊘',  label: 'Skipped / Invalid',    value: bgImport.invalid,   color: C.red,    bg: C.redBg    },
              ].filter(row => row.value > 0).map((row, i, arr) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 24px', background: row.bg, borderBottom: i < arr.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
                  <span style={{ fontSize: 20, flexShrink: 0, width: 24 }}>{row.icon}</span>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.t2, fontFamily: "'Inter', sans-serif" }}>{row.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: row.color, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", letterSpacing: '-0.02em' }}>{row.value.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
            {/* Duplicates section */}
            {bgImport.duplicates?.length > 0 && (
              <div style={{ borderTop: `1px solid ${C.border}` }}>
                <div style={{ padding: '10px 24px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'Inter', sans-serif" }}>
                    ⚠ {bgImport.duplicates.length} Duplicate OEM{bgImport.duplicates.length > 1 ? 's' : ''} in File
                  </div>
                  <div style={{ fontSize: 10, color: C.t3, fontFamily: "'Inter', sans-serif" }}>only first occurrence imported</div>
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto', margin: '0 16px 12px', border: `1px solid ${C.amber}`, borderRadius: 8, background: C.amberBg }}>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 48px', padding: '6px 12px', borderBottom: `1px solid ${C.border}`, background: C.amberBg }}>
                    {['OEM Number', 'Part Name', 'Count'].map(h => (
                      <div key={h} style={{ fontSize: 9, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'Inter', sans-serif" }}>{h}</div>
                    ))}
                  </div>
                  {/* Rows — cap at 50, show remainder note */}
                  {bgImport.duplicates.slice(0, 50).map((d, i) => (
                    <div key={d.oemNumber} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 48px', padding: '6px 12px', borderBottom: i < Math.min(bgImport.duplicates.length, 50) - 1 ? `1px solid ${C.borderLight}` : 'none', alignItems: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.oemNumber}</div>
                      <div style={{ fontSize: 11, color: C.t2, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{d.partName || '—'}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.red, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", textAlign: 'right' }}>×{d.count}</div>
                    </div>
                  ))}
                  {bgImport.duplicates.length > 50 && (
                    <div style={{ padding: '6px 12px', fontSize: 10, color: C.t3, fontFamily: "'Inter', sans-serif", textAlign: 'center' }}>
                      +{bgImport.duplicates.length - 50} more duplicates not shown
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ padding: '16px 24px', display: 'flex', gap: 10, borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={() => { importStore.set({ ...bgImport, popup: false }); setActiveTab('catalog'); }}
                style={{ flex: 1, background: C.green, border: 'none', borderRadius: 9, padding: '12px 0', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                🗄 View in Database
              </button>
              {/* Note: "View in Database" keeps fileData so user can see what was imported; only "Import Another File" resets state */}
              <button
                onClick={() => importStore.set({ clearUI: true })}
                style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px 0', color: C.t2, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                Import Another File
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Floating Background Import Widget ─── */}
      {bgImport && !bgImport.popup && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 320, background: C.surface,
          border: `1px solid ${bgImport.active ? C.red : C.green}`,
          borderRadius: 14, padding: '14px 16px',
          boxShadow: bgImport.active ? `0 8px 40px rgba(26,18,5,0.12)` : `0 8px 40px rgba(26,18,5,0.1), 0 0 24px ${C.greenBg}`,
          display: 'flex', flexDirection: 'column', gap: 10,
          fontFamily: "'Inter', sans-serif",
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{bgImport.active ? '📥' : '✅'}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: bgImport.active ? C.t1 : C.green, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
                  {bgImport.active ? 'Importing Parts…' : 'Import Complete'}
                </div>
                <div style={{ fontSize: 10, color: C.t3, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
                  {bgImport.filename}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {bgImport.active && activeTab !== 'catalog' && (
                <button onClick={() => setActiveTab('catalog')} style={{
                  background: C.redBg, border: `1px solid ${C.red}`,
                  borderRadius: 6, padding: '4px 10px', color: C.red, fontSize: 10,
                  fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
                }}>View →</button>
              )}
              {!bgImport.active && (
                <button onClick={() => importStore.set(null)} style={{
                  background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6,
                  padding: '4px 8px', color: C.t3, fontSize: 10, cursor: 'pointer', lineHeight: 1,
                }}>✕</button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ position: 'relative', height: 8, borderRadius: 4, background: C.bg, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${Math.round((bgImport.done / bgImport.total) * 100)}%`, background: bgImport.active ? 'linear-gradient(90deg,#FF1F3A 0%,#FF6B35 50%,#FFB347 100%)' : '#10B981', backgroundSize: bgImport.active ? '300% auto' : '100% auto', animation: bgImport.active ? 'rp-shimmer 1.2s linear infinite' : 'none', borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>

          {/* Row count + percent */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: C.t3, fontFamily: "'Inter', sans-serif" }}>
              {bgImport.done.toLocaleString('en-IN')} / {bgImport.total.toLocaleString('en-IN')} rows
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: bgImport.active ? C.amber : C.green, fontFamily: "'Inter', sans-serif" }}>
              {Math.round((bgImport.done / bgImport.total) * 100)}%
            </span>
          </div>

          {/* Mini counters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: C.green, fontFamily: "'Inter', sans-serif" }}>✨ {bgImport.created.toLocaleString()} new</span>
            <span style={{ fontSize: 10, color: C.sky, fontFamily: "'Inter', sans-serif" }}>✏️ {bgImport.updated.toLocaleString()} updated</span>
            <span style={{ fontSize: 10, color: C.t3, fontFamily: "'Inter', sans-serif" }}>✓ {bgImport.unchanged.toLocaleString()} same</span>
            {bgImport.invalid > 0 && <span style={{ fontSize: 10, color: C.red, fontFamily: "'Inter', sans-serif" }}>⊘ {bgImport.invalid.toLocaleString()} skipped</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminPage;
