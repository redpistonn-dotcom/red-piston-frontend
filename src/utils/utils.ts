import { T } from '../styles/theme.js';
import { useState, useEffect } from 'react';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const CATEGORIES = ["Engine", "Brakes", "Electrical", "Suspension", "Filters", "Cooling", "Body", "Tyres", "Lubrication", "Transmission", "Clutch", "Steering"];
export const POSITIONS = ["Front", "Rear", "Left", "Right"];
export const ENGINE_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric"];
export const TRANSMISSIONS = ["Manual", "Automatic", "CVT", "DCT"];
export const EMOJIS = ["🔧", "⚙️", "🔩", "🛢️", "⚡", "🔋", "🌀", "💧", "📯", "🔌", "🔑", "🛞", "🪛", "🔦", "📦", "🏷️", "🪝", "⛽", "🧴", "🔴", "🔵", "⬛"];

export const uid = () => Math.random().toString(36).slice(2, 10);

// ===== MOVEMENT TYPE TAXONOMY =====
export const MOVEMENT_TYPES = {
    PURCHASE: { label: "Purchase", icon: "📥", sym: "+", stockEffect: 1, revenueEffect: -1, color: T.sky, bg: T.skyBg },
    SALE: { label: "Sale", icon: "📤", sym: "−", stockEffect: -1, revenueEffect: 1, color: T.amber, bg: T.amberGlow },
    ESTIMATE: { label: "Quotation", icon: "📝", sym: "~", stockEffect: 0, revenueEffect: 0, color: T.t3, bg: `${T.t3}18` },
    RETURN_IN: { label: "Customer Return", icon: "↩️", sym: "+", stockEffect: 1, revenueEffect: -1, color: "#2DD4BF", bg: "rgba(45,212,191,0.12)" },
    RETURN_OUT: { label: "Vendor Return", icon: "📤", sym: "−", stockEffect: -1, revenueEffect: 0, color: "#FB923C", bg: "rgba(251,146,60,0.12)" },
    CREDIT_NOTE: { label: "Credit Note", icon: "📝", sym: "", stockEffect: 0, revenueEffect: -1, color: "#818CF8", bg: "rgba(129,140,248,0.12)" },
    DEBIT_NOTE: { label: "Debit Note", icon: "📋", sym: "", stockEffect: 0, revenueEffect: 1, color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
    DAMAGE: { label: "Damage", icon: "💥", sym: "−", stockEffect: -1, revenueEffect: 0, color: T.crimson, bg: T.crimsonBg },
    THEFT: { label: "Theft/Shrinkage", icon: "🚨", sym: "−", stockEffect: -1, revenueEffect: 0, color: T.crimson, bg: T.crimsonBg },
    AUDIT: { label: "Audit Correction", icon: "📋", sym: "±", stockEffect: 0, revenueEffect: 0, color: T.violet, bg: T.violetBg },
    OPENING: { label: "Opening Stock", icon: "📦", sym: "+", stockEffect: 1, revenueEffect: 0, color: T.sky, bg: T.skyBg },
    TRANSFER_OUT: { label: "Transfer Out", icon: "📦➡", sym: "−", stockEffect: -1, revenueEffect: 0, color: "#FB923C", bg: "rgba(251,146,60,0.12)" },
    TRANSFER_IN: { label: "Transfer In", icon: "➡📦", sym: "+", stockEffect: 1, revenueEffect: 0, color: T.sky, bg: T.skyBg },
    RECEIPT: { label: "Payment Received", icon: "💰", sym: "", stockEffect: 0, revenueEffect: 0, color: T.emerald, bg: T.emeraldBg },
    PAYMENT: { label: "Payment Made", icon: "💸", sym: "", stockEffect: 0, revenueEffect: 0, color: "#FB923C", bg: "rgba(251,146,60,0.12)" },
    ADJUST: { label: "Adjustment", icon: "⚖️", sym: "±", stockEffect: 0, revenueEffect: 0, color: T.violet, bg: T.violetBg },
};

export const getMovementConfig = (type) => MOVEMENT_TYPES[type] || MOVEMENT_TYPES.ADJUST;

// ===== SEED DATA =====
export const SEED_SHOPS = import.meta.env.DEV ? [
    { id: "s1", name: "Ravi Auto Parts", ownerName: "Ravi K", phone: "+91 9876543210", gstNo: "36AAXYZ1234X1Z5", address: "14/A, Jubilee Hills", city: "Hyderabad", pincode: "500033", rating: 4.8, totalOrders: 1420, imageEmoji: "🏭", createdAt: Date.now() - 365 * 86400000, isActive: true },
    { id: "s2", name: "Sri Durga Auto", ownerName: "Ramesh P", phone: "+91 9876543211", gstNo: "36BBXYZ5678X2Z6", address: "Shop 2, Ameerpet", city: "Hyderabad", pincode: "500016", rating: 4.5, totalOrders: 850, imageEmoji: "🔧", createdAt: Date.now() - 200 * 86400000, isActive: true },
    { id: "s3", name: "National Spares", ownerName: "Mohammed A", phone: "+91 9876543212", gstNo: "36CCXYZ9012X3Z7", address: "Afzal Gunj", city: "Hyderabad", pincode: "500012", rating: 4.9, totalOrders: 3200, imageEmoji: "⚙️", createdAt: Date.now() - 500 * 86400000, isActive: true }
] : [];

export const SEED_PRODUCTS = import.meta.env.DEV ? [
    // Shop 1 (Ravi Auto Parts — 12 products for a rich demo)
    { id: "p1", shopId: "s1", name: "Bosch Brake Pad Set — Front", sku: "BRK-F-0042", category: "Brakes", brand: "Bosch", supplier: "Bosch India Pvt Ltd", compatibleVehicles: ["Maruti Suzuki Swift", "Hyundai i20", "Maruti Suzuki Baleno"], buyPrice: 1200, sellPrice: 1850, mrp: 2200, gstRate: 18, stock: 24, reservedStock: 0, minStock: 10, location: "Rack A-12", unit: "set", image: "🔧", description: "Premium ceramic brake pads. Fits 2015-2023 models.", oemNumber: "04465-02220", position: "Front", engineType: "Petrol", transmission: "Manual", condition: "New", warranty: "1 Year", globalSku: "mp1", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p2", shopId: "s1", name: "Denso O2 Sensor Universal", sku: "ELC-O2-117", category: "Electrical", brand: "Denso", supplier: "Denso Asia Pacific", compatibleVehicles: ["Universal"], buyPrice: 890, sellPrice: 1400, mrp: 1800, gstRate: 18, stock: 6, reservedStock: 0, minStock: 8, location: "Rack B-04", unit: "pcs", image: "⚡", description: "Universal oxygen sensor.", condition: "New", warranty: "", globalSku: null, createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p3", shopId: "s1", name: "Mahle Oil Filter", sku: "ENG-OF-147", category: "Filters", brand: "Mahle", supplier: "Mahle Filter Systems", compatibleVehicles: ["Maruti Suzuki Swift", "Hyundai Creta"], buyPrice: 180, sellPrice: 320, mrp: 450, gstRate: 18, stock: 82, reservedStock: 0, minStock: 20, location: "Rack C-01", unit: "pcs", image: "🛢️", description: "High flow oil filter.", condition: "New", warranty: "", globalSku: "mp2", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p5", shopId: "s1", name: "Monroe Front Shock Absorber", sku: "SUS-SA-M220", category: "Suspension", brand: "Monroe", supplier: "Tenneco India", compatibleVehicles: ["Maruti Suzuki Swift", "Maruti Suzuki Dzire", "Maruti Suzuki Wagon R"], buyPrice: 2400, sellPrice: 3600, mrp: 4800, gstRate: 28, stock: 11, reservedStock: 0, minStock: 5, location: "Rack D-15", unit: "pcs", image: "🔩", description: "Gas-charged shock absorber.", oemNumber: "G16449", position: "Front", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p9", shopId: "s1", name: "NGK Spark Plug ILZKAR7B11", sku: "ENG-SP-NGK1", category: "Engine", brand: "NGK", supplier: "NGK India", compatibleVehicles: ["Maruti Suzuki Swift", "Maruti Suzuki Baleno", "Toyota Innova"], buyPrice: 280, sellPrice: 450, mrp: 550, gstRate: 18, stock: 64, reservedStock: 0, minStock: 30, location: "Rack A-02", unit: "pcs", image: "⚙️", description: "Iridium spark plug for modern engines.", oemNumber: "ILZKAR7B11", engineType: "Petrol", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p10", shopId: "s1", name: "Castrol Edge 5W-30 4L", sku: "LUB-CE-530", category: "Lubrication", brand: "Castrol", supplier: "Castrol India Ltd", compatibleVehicles: ["Universal"], buyPrice: 1850, sellPrice: 2650, mrp: 3200, gstRate: 18, stock: 18, reservedStock: 0, minStock: 10, location: "Rack E-01", unit: "can", image: "🛢️", description: "Full synthetic engine oil 4L.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p11", shopId: "s1", name: "Valeo Clutch Kit Complete", sku: "CLT-VL-001", category: "Clutch", brand: "Valeo", supplier: "Valeo India Pvt Ltd", compatibleVehicles: ["Maruti Suzuki Swift", "Maruti Suzuki Dzire"], buyPrice: 4200, sellPrice: 6800, mrp: 8500, gstRate: 28, stock: 3, reservedStock: 0, minStock: 2, location: "Rack D-08", unit: "set", image: "🔩", description: "Clutch plate + pressure plate + bearing kit.", oemNumber: "826303", transmission: "Manual", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p12", shopId: "s1", name: "Bosch Wiper Blade Pair 22\"", sku: "BOD-WP-22", category: "Body", brand: "Bosch", supplier: "Bosch India Pvt Ltd", compatibleVehicles: ["Hyundai Creta", "Hyundai i20", "Kia Seltos"], buyPrice: 380, sellPrice: 620, mrp: 800, gstRate: 18, stock: 0, reservedStock: 0, minStock: 5, location: "Rack F-03", unit: "pair", image: "🌀", description: "Aerotwin flat blade wipers.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p13", shopId: "s1", name: "Gates Radiator Hose Upper", sku: "COL-RH-001", category: "Cooling", brand: "Gates", supplier: "Gates India Pvt Ltd", compatibleVehicles: ["Maruti Suzuki Swift", "Maruti Suzuki Dzire"], buyPrice: 320, sellPrice: 550, mrp: 700, gstRate: 18, stock: 14, reservedStock: 0, minStock: 5, location: "Rack C-06", unit: "pcs", image: "💧", description: "EPDM rubber radiator hose.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p14", shopId: "s1", name: "MRF ZVTV 185/65 R15 Tyre", sku: "TYR-MRF-15", category: "Tyres", brand: "MRF", supplier: "MRF Ltd", compatibleVehicles: ["Maruti Suzuki Swift", "Hyundai i20", "Maruti Suzuki Baleno"], buyPrice: 3600, sellPrice: 4800, mrp: 5500, gstRate: 28, stock: 8, reservedStock: 0, minStock: 4, location: "Floor Bay 1", unit: "pcs", image: "🛞", description: "Tubeless radial tyre 185/65 R15.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p15", shopId: "s1", name: "Exide FFS0-EP44L Battery", sku: "ELC-BAT-EX1", category: "Electrical", brand: "Exide", supplier: "Exide Industries", compatibleVehicles: ["Universal"], buyPrice: 4200, sellPrice: 5800, mrp: 6500, gstRate: 28, stock: 5, reservedStock: 0, minStock: 3, location: "Floor Bay 2", unit: "pcs", image: "🔋", description: "Maintenance free battery 44Ah.", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p16", shopId: "s1", name: "Moog Tie Rod End", sku: "STR-TR-001", category: "Steering", brand: "Moog", supplier: "Federal-Mogul India", compatibleVehicles: ["Maruti Suzuki Swift", "Maruti Suzuki Dzire"], buyPrice: 680, sellPrice: 1100, mrp: 1400, gstRate: 18, stock: 9, reservedStock: 0, minStock: 4, location: "Rack D-10", unit: "pcs", image: "🔧", description: "Premium tie rod end with grease fitting.", condition: "New", warranty: "", globalSku: null, createdAt: Date.now(), updatedAt: Date.now(), isActive: true },

    // Shop 2 (Sri Durga) — Competitor products
    { id: "p4", shopId: "s2", name: "Bosch Brake Pad Set — Front", sku: "BRK-F-0042", category: "Brakes", brand: "Bosch", supplier: "Bosch India Pvt Ltd", compatibleVehicles: ["Maruti Suzuki Swift", "Hyundai i20", "Maruti Suzuki Baleno"], buyPrice: 1150, sellPrice: 1790, mrp: 2200, gstRate: 18, stock: 15, reservedStock: 0, minStock: 5, location: "Gdn-Front", unit: "set", image: "🔧", description: "Premium ceramic brake pads.", condition: "New", warranty: "1 Year", globalSku: "mp1", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p6", shopId: "s2", name: "NGK Spark Plug BKR6E", sku: "ENG-SP-BKR", category: "Engine", brand: "NGK", supplier: "NGK India", compatibleVehicles: ["Honda City", "Maruti Suzuki Swift"], buyPrice: 95, sellPrice: 165, mrp: 200, gstRate: 18, stock: 45, reservedStock: 0, minStock: 25, location: "Box-2", unit: "pcs", image: "⚙️", description: "Copper core spark plug.", condition: "New", warranty: "", globalSku: null, createdAt: Date.now(), updatedAt: Date.now(), isActive: true },

    // Shop 3 (National Spares)
    { id: "p7", shopId: "s3", name: "Bosch Brake Pad Set — Front", sku: "BRK-F-0042", category: "Brakes", brand: "Bosch", supplier: "Bosch India Pvt Ltd", compatibleVehicles: ["Maruti Suzuki Swift", "Hyundai i20", "Maruti Suzuki Baleno"], buyPrice: 1100, sellPrice: 1900, mrp: 2200, gstRate: 18, stock: 50, reservedStock: 0, minStock: 20, location: "Aisle 4", unit: "set", image: "🔧", description: "Premium ceramic brake pads.", condition: "New", warranty: "1 Year", globalSku: "mp1", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
    { id: "p8", shopId: "s3", name: "Exide FFS0-EP44L Battery", sku: "ELC-BAT-EX", category: "Electrical", brand: "Exide", supplier: "Exide Industries", compatibleVehicles: ["Universal"], buyPrice: 4200, sellPrice: 5800, mrp: 6500, gstRate: 28, stock: 12, reservedStock: 0, minStock: 4, location: "Floor", unit: "pcs", image: "🔋", description: "Maintenance free battery 44Ah.", condition: "New", warranty: "55 Months", globalSku: "mp13", createdAt: Date.now(), updatedAt: Date.now(), isActive: true },
] : [];

export const genSeededMovements = () => {
    if (!import.meta.env.DEV) return [];
    const now = Date.now();
    const d = 86400000;
    return [
        // Purchases
        { id: "m1", shopId: "s1", productId: "p1", productName: "Bosch Brake Pad Set — Front", type: "PURCHASE", qty: 12, unitPrice: 1200, sellingPrice: 1850, total: 14400, gstAmount: 2592, profit: null, date: now - 7 * d, note: "Monthly restock", supplier: "Bosch India Pvt Ltd", supplierName: "Bosch India Pvt Ltd", invoiceNo: "BINV-2024-1042", payment: "Credit", paymentMode: "Credit", paymentStatus: "pending", creditDays: 30 },
        { id: "m2", shopId: "s1", productId: "p3", productName: "Mahle Oil Filter", type: "PURCHASE", qty: 50, unitPrice: 180, sellingPrice: 320, total: 9000, gstAmount: 1620, profit: null, date: now - 5 * d, note: "Stock up", supplier: "Mahle Filter Systems", supplierName: "Mahle Filter Systems", invoiceNo: "MINV-0892", payment: "Cash", paymentMode: "Cash", paymentStatus: "paid" },
        { id: "m10", shopId: "s1", productId: "p10", productName: "Castrol Edge 5W-30 4L", type: "PURCHASE", qty: 10, unitPrice: 1850, sellingPrice: 2650, total: 18500, gstAmount: 3330, profit: null, date: now - 6 * d, note: "Monthly oil restock", supplier: "Castrol India Ltd", supplierName: "Castrol India Ltd", invoiceNo: "CINV-4421", payment: "Bank Transfer", paymentMode: "Bank Transfer", paymentStatus: "paid" },
        { id: "m11", shopId: "s1", productId: "p9", productName: "NGK Spark Plug ILZKAR7B11", type: "PURCHASE", qty: 30, unitPrice: 280, sellingPrice: 450, total: 8400, gstAmount: 1512, profit: null, date: now - 4 * d, note: "Quarterly restock", supplier: "NGK India", supplierName: "NGK India", invoiceNo: "NINV-7782", payment: "Credit", paymentMode: "Credit", paymentStatus: "pending", creditDays: 15 },

        // Sales
        { id: "m4", shopId: "s1", productId: "p5", productName: "Monroe Front Shock Absorber", type: "SALE", qty: 2, unitPrice: 3600, sellingPrice: 3600, total: 7200, gstAmount: 2016, profit: 2400, date: now - 3 * d, note: "Workshop offline order", customerName: "Sri Durga Motors", customerPhone: "+91 9988776655", payment: "UPI", paymentMode: "UPI", paymentStatus: "paid" },
        { id: "m7", shopId: "s1", productId: "p1", productName: "Bosch Brake Pad Set — Front", type: "SALE", qty: 3, unitPrice: 1850, sellingPrice: 1850, total: 5550, gstAmount: 999, profit: 1950, date: now - 0.4 * d, note: "Walk-in", customerName: "Hussain Auto", customerPhone: "+91 9123456789", payment: "Cash", paymentMode: "Cash", paymentStatus: "paid" },
        { id: "m8", shopId: "s1", productId: "p2", productName: "Denso O2 Sensor Universal", type: "SALE", qty: 4, unitPrice: 1400, sellingPrice: 1400, total: 5600, gstAmount: 1008, profit: 2040, date: now - 4 * d, note: "Mechanic Credit", customerName: "Raju Garage", customerPhone: "+91 9876501234", payment: "Credit", paymentMode: "Credit", paymentStatus: "pending", creditDays: 15 },
        { id: "m9", shopId: "s1", productId: "p3", productName: "Mahle Oil Filter", type: "SALE", qty: 10, unitPrice: 320, sellingPrice: 320, total: 3200, gstAmount: 576, profit: 1400, date: now - 1 * d, note: "Credit Sale", customerName: "Alpha Mechanics", customerPhone: "+91 9012345678", payment: "Credit", paymentMode: "Credit", paymentStatus: "pending", creditDays: 7 },
        { id: "m12", shopId: "s1", productId: "p9", productName: "NGK Spark Plug ILZKAR7B11", type: "SALE", qty: 6, unitPrice: 450, sellingPrice: 450, total: 2700, gstAmount: 486, profit: 1020, date: now - 2 * d, note: "Walk-in", customerName: "Rajesh Workshop", payment: "Cash", paymentMode: "Cash", paymentStatus: "paid" },
        { id: "m13", shopId: "s1", productId: "p10", productName: "Castrol Edge 5W-30 4L", type: "SALE", qty: 3, unitPrice: 2650, sellingPrice: 2650, total: 7950, gstAmount: 1431, profit: 2400, date: now - 1.5 * d, note: "Regular customer", customerName: "Sai Motors", customerPhone: "+91 9988112233", payment: "UPI", paymentMode: "UPI", paymentStatus: "paid" },
        { id: "m14", shopId: "s1", productId: "p11", productName: "Valeo Clutch Kit Complete", type: "SALE", qty: 1, unitPrice: 6800, sellingPrice: 6800, total: 6800, gstAmount: 1904, profit: 2600, date: now - 0.8 * d, note: "Mechanic order", customerName: "Durga Mechanics", customerPhone: "+91 9876549900", payment: "Cash:4000, UPI:2800", paymentMode: "Cash+UPI", paymentStatus: "paid" },

        // Adjustments
        { id: "m6", shopId: "s1", productId: "p2", productName: "Denso O2 Sensor Universal", type: "DAMAGE", qty: 2, unitPrice: 890, sellingPrice: 1400, total: 0, gstAmount: 0, profit: -1780, date: now - 2 * d, note: "Damaged in transit — packaging crushed", payment: "DAMAGE", paymentStatus: "completed", adjustmentMeta: { type: "DAMAGE", previousStock: 12, newStock: 10, reason: "Transit damage" } },
    ];
};

export const SEED_ORDERS = [];
export const SEED_PURCHASES = [];

// ===== FORMATTING =====
export const fmt = n => "₹" + Math.abs(+n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
export const fmtN = n => (+n || 0).toLocaleString("en-IN");
export const pct = (a, b) => b > 0 ? (((a) / b) * 100).toFixed(1) + "%" : "0%";
export const margin = (b, s) => s > 0 ? (((s - b) / s) * 100).toFixed(1) : 0;
export const gstAmt = (price, qty, gstRate) => ((price * qty) * gstRate) / 100;

export const fmtDate = ts => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
export const fmtTime = ts => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};
export const fmtDateTime = ts => `${fmtDate(ts)}, ${fmtTime(ts)}`;
export const daysAgo = ts => {
    const diff = Math.floor((Date.now() - ts) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return `${diff}d ago`;
};

// ===== STOCK STATUS =====
export const stockStatus = p => {
    if (p.stock <= 0) return "out";
    if (p.stock < p.minStock) return "low";
    return "ok";
};

export const STATUS = {
    ok: { label: "In Stock", bg: "rgba(16,185,129,0.12)", color: T.emerald, dot: T.emerald },
    low: { label: "Low Stock", bg: "rgba(245,158,11,0.12)", color: T.amber, dot: T.amber },
    out: { label: "Out of Stock", bg: "rgba(239,68,68,0.12)", color: T.crimson, dot: T.crimson },
};

// ===== STOCK COMPUTATION FROM LEDGER (immutable ledger approach) =====
export function computeStockFromLedger(productId, movements) {
    return movements
        .filter(m => m.productId === productId)
        .reduce((stock, m) => {
            const cfg = MOVEMENT_TYPES[m.type];
            if (!cfg) return stock;
            if (m.type === "ESTIMATE" || m.type === "RECEIPT" || m.type === "PAYMENT") return stock;
            // For AUDIT, use adjustmentMeta if available
            if (m.type === "AUDIT" && m.adjustmentMeta) {
                return m.adjustmentMeta.newStock;
            }
            return stock + (cfg.stockEffect * m.qty);
        }, 0);
}

// ===== DATA CONSISTENCY =====
export function verifyStockConsistency(products, movements) {
    const issues = [];
    products.forEach(p => {
        const computed = computeStockFromLedger(p.id, movements);
        if (computed !== p.stock) {
            issues.push({
                productId: p.id,
                productName: p.name,
                storedStock: p.stock,
                computedStock: computed,
                diff: p.stock - computed,
            });
        }
    });
    return issues;
}

// ===== DEBT AGING =====
export function getDebtAging(date) {
    const days = Math.floor((Date.now() - date) / 86400000);
    if (days <= 30) return { label: "0-30 days", color: T.emerald, severity: 0 };
    if (days <= 60) return { label: "31-60 days", color: T.amber, severity: 1 };
    if (days <= 90) return { label: "61-90 days", color: "#FB923C", severity: 2 };
    return { label: "90+ days", color: T.crimson, severity: 3 };
}

// ===== INVOICE NUMBER GENERATOR =====
let _invoiceCounter = 0;
export function generateInvoiceNumber(prefix = "INV") {
    _invoiceCounter++;
    const ts = Date.now().toString(36).toUpperCase().slice(-4);
    const seq = String(_invoiceCounter).padStart(4, "0");
    return `${prefix}-${ts}-${seq}`;
}

// ===== CSV EXPORT =====
export function generateCSV(headers, rows) {
    const escape = v => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(escape).join(",")];
    rows.forEach(row => lines.push(row.map(escape).join(",")));
    return lines.join("\n");
}

export function downloadCSV(filename, csvContent) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

export function exportMovementsCSV(movements) {
    const headers = ["Date", "Type", "Product", "Qty", "Unit Price", "Total", "GST", "Profit", "Invoice", "Party", "Payment", "Status", "Notes"];
    const rows = movements.map(m => [
        fmtDateTime(m.date), m.type, m.productName || "", m.qty, m.unitPrice || "", m.total || "", m.gstAmount || "", m.profit || "",
        m.invoiceNo || "", m.customerName || m.supplier || m.supplierName || "", m.payment || m.paymentMode || "", m.paymentStatus || "", m.note || ""
    ]);
    downloadCSV(`movements_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
}

export function exportInventoryCSV(products) {
    const headers = ["SKU", "Product", "Category", "Brand", "OEM Number", "Position", "Engine Type", "Transmission", "Buy Price", "Sell Price", "MRP", "Stock", "Min Stock", "Location", "GST Rate", "Inventory Value", "Status"];
    const rows = products.map(p => [
        p.sku, p.name, p.category, p.brand, p.oemNumber || "", p.position || "", p.engineType || "", p.transmission || "", p.buyPrice, p.sellPrice, p.mrp || "", p.stock, p.minStock,
        p.location, (p.gstRate || 18) + "%", (p.buyPrice * p.stock), stockStatus(p) === "ok" ? "In Stock" : stockStatus(p) === "low" ? "Low Stock" : "Out of Stock"
    ]);
    downloadCSV(`inventory_${fmtDate(Date.now()).replace(/\s/g, "_")}.csv`, generateCSV(headers, rows));
}

// ===== WEIGHTED AVERAGE COST =====
export function calculateWeightedAvgCost(movements, productId) {
    const purchases = movements.filter(m => m.productId === productId && m.type === "PURCHASE");
    if (purchases.length === 0) return 0;
    const totalQty = purchases.reduce((s, m) => s + m.qty, 0);
    const totalCost = purchases.reduce((s, m) => s + (m.unitPrice * m.qty), 0);
    return totalQty > 0 ? totalCost / totalQty : 0;
}

// ===== AMAZON HELPERS =====
export const getMrp = (product) => product.mrp || Math.round(product.sellPrice * 1.25);
export const getDiscount = (product) => {
    const mrp = getMrp(product);
    if (mrp <= product.sellPrice) return 0;
    return Math.round(((mrp - product.sellPrice) / mrp) * 100);
};
export const getDeliveryEta = () => {
    const h = new Date().getHours();
    if (h < 14) return { text: "Today by 4 PM", fast: true };
    if (h < 18) return { text: "Today by 9 PM", fast: true };
    return { text: "Tomorrow by 2 PM", fast: false };
};
export const getStarRating = (productId) => {
    const hash = String(productId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rating = 3.5 + (hash % 15) / 10;
    const count = 20 + (hash % 200);
    return { rating: Math.min(rating, 4.9).toFixed(1), count };
};
export const renderStars = (rating) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
};

// ===== SEED PARTIES (Customers + Suppliers) =====
export const SEED_PARTIES = import.meta.env.DEV ? [
    // Customers
    { id: "cust1", shopId: "s1", type: "customer", name: "Sri Durga Motors", phone: "+91 9988776655", email: "durga.motors@gmail.com", gstin: "36AADFD1234G1ZP", address: "15, Kukatpally", city: "Hyderabad", creditLimit: 50000, creditDays: 30, loyaltyPoints: 420, openingBalance: 0, tags: ["regular", "garage"], vehicles: ["v1"], notes: "Regular workshop customer", isActive: true, createdAt: Date.now() - 200 * 86400000 },
    { id: "cust2", shopId: "s1", type: "customer", name: "Hussain Auto", phone: "+91 9123456789", email: "", gstin: "", address: "Shop 4, Begumpet", city: "Hyderabad", creditLimit: 20000, creditDays: 15, loyaltyPoints: 180, openingBalance: 0, tags: ["walk-in"], vehicles: [], notes: "", isActive: true, createdAt: Date.now() - 90 * 86400000 },
    { id: "cust3", shopId: "s1", type: "customer", name: "Raju Garage", phone: "+91 9876501234", email: "rajugarage@yahoo.com", gstin: "36AADFR5678H2ZQ", address: "Ameerpet Main Rd", city: "Hyderabad", creditLimit: 100000, creditDays: 30, loyaltyPoints: 890, openingBalance: 5600, tags: ["regular", "mechanic", "credit"], vehicles: ["v2"], notes: "Huge volume buyer. Collects every Friday.", isActive: true, createdAt: Date.now() - 365 * 86400000 },
    { id: "cust4", shopId: "s1", type: "customer", name: "Alpha Mechanics", phone: "+91 9012345678", email: "alpha.mech@gmail.com", gstin: "", address: "SR Nagar", city: "Hyderabad", creditLimit: 30000, creditDays: 7, loyaltyPoints: 55, openingBalance: 3200, tags: ["credit"], vehicles: ["v3"], notes: "New customer, settling credit weekly", isActive: true, createdAt: Date.now() - 30 * 86400000 },
    { id: "cust5", shopId: "s1", type: "customer", name: "Sai Motors", phone: "+91 9988112233", email: "", gstin: "", address: "Madhapur", city: "Hyderabad", creditLimit: 10000, creditDays: 15, loyaltyPoints: 310, openingBalance: 0, tags: ["regular"], vehicles: [], notes: "", isActive: true, createdAt: Date.now() - 150 * 86400000 },
    // Suppliers
    { id: "sup1", shopId: "s1", type: "supplier", name: "Bosch India Pvt Ltd", phone: "+91 8001234567", email: "orders@boschindia.com", gstin: "36AABCB1234A1ZX", address: "Plot 42, MIDC Chakan", city: "Pune", creditLimit: 500000, creditDays: 45, loyaltyPoints: 0, openingBalance: 0, tags: ["premium", "brakes", "electrical"], vehicles: [], notes: "Primary supplier for brakes, wipers, electrical", isActive: true, createdAt: Date.now() - 500 * 86400000 },
    { id: "sup2", shopId: "s1", type: "supplier", name: "NGK India", phone: "+91 8009876543", email: "supply@ngkindia.co.in", gstin: "36AABCN5678B2ZY", address: "Sector 18, Udyog Vihar", city: "Gurugram", creditLimit: 200000, creditDays: 30, loyaltyPoints: 0, openingBalance: 8400, tags: ["spark-plugs", "engine"], vehicles: [], notes: "Spark plugs, O2 sensors. Monthly restock.", isActive: true, createdAt: Date.now() - 400 * 86400000 },
    { id: "sup3", shopId: "s1", type: "supplier", name: "Castrol India Ltd", phone: "+91 8005551234", email: "b2b@castrol.co.in", gstin: "36AABCC9012C3ZZ", address: "Andheri East", city: "Mumbai", creditLimit: 300000, creditDays: 60, loyaltyPoints: 0, openingBalance: 0, tags: ["lubrication", "oils"], vehicles: [], notes: "Engine oils, lubricants. Best margin.", isActive: true, createdAt: Date.now() - 300 * 86400000 },
] : [];

// ===== SEED VEHICLES =====
export const SEED_VEHICLES = import.meta.env.DEV ? [
    { id: "v1", shopId: "s1", ownerId: "cust1", registrationNumber: "TS09EA1234", vin: "MALB311AAJM12345", make: "Maruti Suzuki", model: "Swift", variant: "ZXI+", year: 2019, engineType: "1.2L K-Series", fuelType: "petrol", odometer: 42000, insuranceExpiry: "2026-08-15", pucExpiry: "2026-03-30", photos: [], notes: "Next service at 45000 km — oil change + filters", createdAt: Date.now() - 180 * 86400000 },
    { id: "v2", shopId: "s1", ownerId: "cust3", registrationNumber: "TS07FZ5678", vin: "MAHCR651AGT78901", make: "Hyundai", model: "Creta", variant: "SX(O)", year: 2021, engineType: "1.5L CRDi", fuelType: "diesel", odometer: 28000, insuranceExpiry: "2027-01-10", pucExpiry: "2026-06-15", photos: [], notes: "Customer wants only genuine parts", createdAt: Date.now() - 120 * 86400000 },
    { id: "v3", shopId: "s1", ownerId: "cust4", registrationNumber: "AP31AC9012", vin: "MA3ERC11S00234567", make: "Maruti Suzuki", model: "Baleno", variant: "Alpha", year: 2020, engineType: "1.2L DualJet", fuelType: "petrol", odometer: 35000, insuranceExpiry: "2026-05-20", pucExpiry: "2026-04-10", photos: [], notes: "", createdAt: Date.now() - 60 * 86400000 },
] : [];

// ===== SEED JOB CARDS =====
const d = 86400000;
export const SEED_JOB_CARDS = import.meta.env.DEV ? [
    { id: "jc1", shopId: "s1", jobNumber: "JC-2026-001", vehicleId: "v1", customerId: "cust1", status: "completed", assignedTo: null, estimatedAmount: 8500, actualAmount: 7850, complaints: "Brake squealing noise from front, vibration at high speed", diagnosis: "Front brake pads worn out, need replacement. Discs OK.", checklist: [{ task: "Remove front wheels", status: "done" }, { task: "Replace brake pads", status: "done" }, { task: "Check disc thickness", status: "done" }, { task: "Test drive", status: "done" }], parts: [{ itemId: "p1", name: "Bosch Brake Pad Set — Front", qty: 1, price: 1850 }], labour: [{ description: "Brake pad replacement labour", amount: 500 }], startedAt: Date.now() - 5 * d, completedAt: Date.now() - 4.5 * d, nextServiceDate: "2026-06-15", nextServiceKm: 45000, voucherId: null, createdAt: Date.now() - 5 * d },
    { id: "jc2", shopId: "s1", jobNumber: "JC-2026-002", vehicleId: "v2", customerId: "cust3", status: "in_progress", assignedTo: null, estimatedAmount: 12500, actualAmount: null, complaints: "Engine oil change, all filters, full service", diagnosis: "Routine 30K km service. Oil filter, air filter due.", checklist: [{ task: "Drain old oil", status: "done" }, { task: "Replace oil filter", status: "done" }, { task: "Replace air filter", status: "pending" }, { task: "Top up coolant", status: "pending" }, { task: "Test drive", status: "pending" }], parts: [{ itemId: "p10", name: "Castrol Edge 5W-30 4L", qty: 1, price: 2650 }, { itemId: "p3", name: "Mahle Oil Filter", qty: 1, price: 320 }], labour: [{ description: "Full service labour", amount: 1500 }], startedAt: Date.now() - 1 * d, completedAt: null, nextServiceDate: null, nextServiceKm: null, voucherId: null, createdAt: Date.now() - 1.5 * d },
    { id: "jc3", shopId: "s1", jobNumber: "JC-2026-003", vehicleId: "v3", customerId: "cust4", status: "estimated", assignedTo: null, estimatedAmount: 5200, actualAmount: null, complaints: "Spark plugs misfiring, rough idle", diagnosis: "Spark plugs fouled. Replace all 4.", checklist: [{ task: "Remove spark plugs", status: "pending" }, { task: "Check coil packs", status: "pending" }, { task: "Install new plugs", status: "pending" }, { task: "Engine diagnostic", status: "pending" }], parts: [{ itemId: "p9", name: "NGK Spark Plug ILZKAR7B11", qty: 4, price: 450 }], labour: [{ description: "Spark plug replacement", amount: 400 }], startedAt: null, completedAt: null, nextServiceDate: null, nextServiceKm: null, voucherId: null, createdAt: Date.now() - 0.5 * d },
] : [];

// ===== JOB CARD STATUS CONFIG =====
export const JOB_STATUS = {
    draft: { label: "Draft", color: T.t3, bg: `${T.t3}18`, icon: "📝" },
    estimated: { label: "Estimated", color: T.amber, bg: T.amberGlow, icon: "📋" },
    approved: { label: "Approved", color: T.sky, bg: T.skyBg, icon: "✅" },
    in_progress: { label: "In Progress", color: "#818CF8", bg: "rgba(129,140,248,0.12)", icon: "🔧" },
    completed: { label: "Completed", color: T.emerald, bg: T.emeraldBg, icon: "✓" },
    invoiced: { label: "Invoiced", color: T.amber, bg: T.amberGlow, icon: "🧾" },
    cancelled: { label: "Cancelled", color: T.crimson, bg: T.crimsonBg, icon: "✗" },
};

// ===== PARTY BALANCE CALCULATOR =====
export function getPartyBalance(partyId, partyType, movements, openingBalance = 0) {
    let balance = openingBalance || 0;
    movements.forEach(m => {
        if (partyType === "customer") {
            if (m.customerName && m.type === "SALE" && (m.paymentStatus === "pending" || m.paymentMode === "Credit")) balance += m.total;
            if (m.type === "RECEIPT" && m.customerName) balance -= m.total;
            if (m.type === "SALE_RETURN" || m.type === "RETURN_IN") balance -= m.total || 0;
        } else {
            if (m.supplierName && m.type === "PURCHASE" && (m.paymentStatus === "pending" || m.paymentMode === "Credit")) balance += m.total;
            if (m.type === "PAYMENT" && m.supplierName) balance -= m.total;
            if (m.type === "PURCHASE_RETURN" || m.type === "RETURN_OUT") balance -= m.total || 0;
        }
    });
    return balance;
}

// ===== FIFO VALUATION ENGINE =====
export function calculateFIFOCost(movements, productId) {
    // Build FIFO cost queue from purchases in chronological order
    const costQueue = []; // [{qty, unitCost, date}]
    const sorted = movements
        .filter(m => m.productId === productId)
        .sort((a, b) => (a.date || 0) - (b.date || 0));

    sorted.forEach(m => {
        if (m.type === "PURCHASE" || m.type === "OPENING") {
            costQueue.push({ qty: m.qty, unitCost: m.unitPrice || 0, date: m.date });
        } else if (m.type === "SALE" || m.type === "RETURN_OUT") {
            let remaining = m.qty;
            while (remaining > 0 && costQueue.length > 0) {
                if (costQueue[0].qty <= remaining) {
                    remaining -= costQueue[0].qty;
                    costQueue.shift();
                } else {
                    costQueue[0].qty -= remaining;
                    remaining = 0;
                }
            }
        } else if (m.type === "RETURN_IN") {
            // Return adds back to queue at original sell price as approximate cost
            costQueue.push({ qty: m.qty, unitCost: m.unitPrice || 0, date: m.date });
        }
    });

    // Current FIFO value = sum of remaining cost layers
    const totalQty = costQueue.reduce((s, l) => s + l.qty, 0);
    const totalValue = costQueue.reduce((s, l) => s + l.qty * l.unitCost, 0);
    return { totalQty, totalValue, avgCost: totalQty > 0 ? totalValue / totalQty : 0, layers: costQueue };
}

// Multi-valuation: get cost by method
export function getInventoryValuation(products, movements, method = "weighted_avg") {
    return products.map(p => {
        let costValue, avgCost;
        if (method === "fifo") {
            const fifo = calculateFIFOCost(movements, p.id);
            costValue = fifo.totalValue;
            avgCost = fifo.avgCost;
        } else {
            // Weighted average (default)
            avgCost = calculateWeightedAvgCost(movements, p.id) || p.buyPrice;
            costValue = avgCost * p.stock;
        }
        return { ...p, costValue, avgCost, marketValue: p.sellPrice * p.stock, unrealizedProfit: (p.sellPrice * p.stock) - costValue };
    });
}

// ===== PAYMENT REMINDER GENERATOR =====
export function getOverduePayments(movements, parties, daysThreshold = 0) {
    const now = Date.now();
    const DAY = 86400000;
    const pending = movements.filter(m =>
        m.paymentStatus === "pending" && m.type === "SALE" && m.total > 0
    );

    // Group by customer
    const byCustomer = {};
    pending.forEach(m => {
        const name = m.customerName || "Unknown";
        if (!byCustomer[name]) byCustomer[name] = { name, phone: m.customerPhone || "", total: 0, invoices: [], oldestDate: Infinity };
        byCustomer[name].total += m.total;
        byCustomer[name].invoices.push({ id: m.id, invoiceNo: m.invoiceNo, amount: m.total, date: m.date });
        if (m.date < byCustomer[name].oldestDate) byCustomer[name].oldestDate = m.date;
    });

    // Match with party data for credit days
    const results = Object.values(byCustomer).map(c => {
        const party = (parties || []).find(p => p.name === c.name);
        const creditDays = party?.creditDays || 30;
        const daysOverdue = Math.floor((now - c.oldestDate) / DAY) - creditDays;
        const isOverdue = daysOverdue > daysThreshold;
        return { ...c, creditDays, daysOverdue: Math.max(0, daysOverdue), isOverdue, party };
    });

    return results.filter(r => r.isOverdue).sort((a, b) => b.daysOverdue - a.daysOverdue);
}

// Generate WhatsApp reminder message
export function generateReminderMessage(customer, shopName = "AutoForge IMS") {
    const { name, total, invoices, daysOverdue } = customer;
    const invList = invoices.slice(0, 3).map(i => `${i.invoiceNo || "Invoice"}: ₹${Math.round(i.amount)}`).join("\n• ");
    return `Dear ${name},\n\nThis is a friendly reminder from ${shopName} regarding your outstanding balance of ₹${Math.round(total)}.\n\nPending invoices:\n• ${invList}${invoices.length > 3 ? `\n... and ${invoices.length - 3} more` : ""}\n\nOutstanding for: ${daysOverdue} days\n\nPlease arrange payment at your earliest convenience.\n\nThank you!`;
}

// ===== EXPIRING STOCK ALERTS =====
export function getExpiringProducts(products, daysAhead = 30) {
    const now = Date.now();
    const DAY = 86400000;
    const cutoff = now + daysAhead * DAY;

    return products
        .filter(p => p.trackBatch && p.expiryDate && p.stock > 0)
        .map(p => {
            const expiry = new Date(p.expiryDate).getTime();
            const daysLeft = Math.ceil((expiry - now) / DAY);
            const isExpired = daysLeft <= 0;
            return { ...p, daysLeft, isExpired, expiryTime: expiry };
        })
        .filter(p => p.expiryTime <= cutoff)
        .sort((a, b) => a.daysLeft - b.daysLeft);
}

// ===== STOCK TRANSFER HELPER =====
export function createStockTransfer(fromProduct, toShopId, qty, reason = "") {
    return {
        outMovement: {
            type: "TRANSFER_OUT", qty, productId: fromProduct.id,
            productName: fromProduct.name, note: `Transfer to shop ${toShopId}. ${reason}`.trim(),
        },
        inMovement: {
            type: "TRANSFER_IN", qty, productId: fromProduct.id,
            productName: fromProduct.name, note: `Transfer from shop ${fromProduct.shopId}. ${reason}`.trim(),
            shopId: toShopId,
        },
    };
}
