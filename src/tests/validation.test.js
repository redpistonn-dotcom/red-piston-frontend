/**
 * Validation tests — covers price validation, phone validation,
 * category normalization, and search field logic.
 * All pure functions — no DOM, no fetch mocks needed.
 */
import { describe, it, expect } from 'vitest';

// ─── Inline the validation helpers under test ────────────────────────────────
// These mirror the exact logic from ProductModal.tsx and CheckoutPage.tsx.

function validateProduct(f) {
  const e = {};
  if (!f.name || !f.name.trim()) e.name = 'Required';
  if (!f.sku  || !f.sku.trim())  e.sku  = 'Required';
  if (!f.buyPrice || isNaN(+f.buyPrice))       e.buyPrice  = 'Invalid';
  else if (+f.buyPrice < 0)                    e.buyPrice  = 'Cannot be negative';
  if (!f.sellPrice || isNaN(+f.sellPrice))     e.sellPrice = 'Invalid';
  else if (+f.sellPrice <= 0)                  e.sellPrice = 'Must be greater than 0';
  else if (+f.sellPrice < +f.buyPrice)         e.sellPrice = 'Sell price below buy price — margin will be negative';
  if (f.stock === '' || isNaN(+f.stock))       e.stock     = 'Required';
  return e;
}

function validatePhone(phone) {
  if (!phone || !phone.trim()) return false;
  return /^\d{10}$/.test(phone.trim());
}

const DB_TO_CATEGORY = {
  'Engine Oils': 'Engine', 'Fuel System': 'Engine', 'Exhaust': 'Engine',
  'Body & Exterior': 'Body', 'Clutch & Transmission': 'Clutch',
  'Ignition': 'Electrical', 'AC & Heating': 'Cooling',
  'Fluids': 'Cooling', 'Radiator': 'Cooling',
  'Wheel & Tyre': 'Tyres', 'Tyres & Wheels': 'Tyres',
  'Steering & Suspension': 'Suspension',
};
function normalizeCategory(raw) {
  if (!raw) return 'General';
  return DB_TO_CATEGORY[raw] ?? raw;
}

// ─── ProductModal validation ──────────────────────────────────────────────────
describe('ProductModal validation', () => {
  const base = { name: 'Oil Filter', sku: 'SKU001', buyPrice: '100', sellPrice: '150', stock: '10' };

  it('passes with valid data', () => {
    expect(validateProduct(base)).toEqual({});
  });

  it('rejects empty name', () => {
    expect(validateProduct({ ...base, name: '' }).name).toBe('Required');
  });
  it('rejects whitespace-only name', () => {
    expect(validateProduct({ ...base, name: '   ' }).name).toBe('Required');
  });

  it('rejects empty sku', () => {
    expect(validateProduct({ ...base, sku: '' }).sku).toBe('Required');
  });

  it('rejects negative buyPrice', () => {
    expect(validateProduct({ ...base, buyPrice: '-10' }).buyPrice).toBe('Cannot be negative');
  });
  it('allows buyPrice = 0 (free cost item)', () => {
    expect(validateProduct({ ...base, buyPrice: '0' }).buyPrice).toBeUndefined();
  });
  it('rejects non-numeric buyPrice', () => {
    expect(validateProduct({ ...base, buyPrice: 'abc' }).buyPrice).toBe('Invalid');
  });

  it('rejects sellPrice = 0', () => {
    expect(validateProduct({ ...base, sellPrice: '0' }).sellPrice).toBe('Must be greater than 0');
  });
  it('rejects negative sellPrice', () => {
    expect(validateProduct({ ...base, sellPrice: '-5' }).sellPrice).toBe('Must be greater than 0');
  });
  it('rejects sellPrice below buyPrice', () => {
    const e = validateProduct({ ...base, buyPrice: '200', sellPrice: '150' });
    expect(e.sellPrice).toMatch(/margin will be negative/);
  });
  it('allows sellPrice equal to buyPrice', () => {
    expect(validateProduct({ ...base, buyPrice: '100', sellPrice: '100' }).sellPrice).toBeUndefined();
  });

  it('rejects empty stock', () => {
    expect(validateProduct({ ...base, stock: '' }).stock).toBe('Required');
  });
  it('allows stock = 0', () => {
    expect(validateProduct({ ...base, stock: '0' }).stock).toBeUndefined();
  });

  it('returns multiple errors at once', () => {
    const e = validateProduct({ name: '', sku: '', buyPrice: '-1', sellPrice: '0', stock: '' });
    expect(Object.keys(e).length).toBeGreaterThanOrEqual(4);
  });
});

// ─── POS zero-price validation ────────────────────────────────────────────────
describe('POS price validation', () => {
  function posItemValid(price) {
    return price > 0;
  }

  it('rejects price = 0', ()  => { expect(posItemValid(0)).toBe(false); });
  it('rejects price < 0', ()  => { expect(posItemValid(-1)).toBe(false); });
  it('accepts price > 0', ()  => { expect(posItemValid(1)).toBe(true); });
  it('accepts price = 0.01', () => { expect(posItemValid(0.01)).toBe(true); });
  it('accepts price = 99999', () => { expect(posItemValid(99999)).toBe(true); });
});

// ─── Checkout phone validation ────────────────────────────────────────────────
describe('Checkout phone validation', () => {
  it('accepts exactly 10 digits', ()  => { expect(validatePhone('9876543210')).toBe(true); });
  it('rejects 9 digits', ()           => { expect(validatePhone('987654321')).toBe(false); });
  it('rejects 11 digits', ()          => { expect(validatePhone('98765432101')).toBe(false); });
  it('rejects letters', ()            => { expect(validatePhone('abcdefghij')).toBe(false); });
  it('rejects mixed alphanumeric', () => { expect(validatePhone('9876a43210')).toBe(false); });
  it('rejects empty string', ()       => { expect(validatePhone('')).toBe(false); });
  it('rejects spaces between digits',()=> { expect(validatePhone('98765 3210')).toBe(false); });
  it('rejects phone with + prefix',() => { expect(validatePhone('+9876543210')).toBe(false); });
  it('trims leading/trailing spaces before check', () => {
    expect(validatePhone(' 9876543210 ')).toBe(true);
  });
});

// ─── Category normalization ───────────────────────────────────────────────────
describe('normalizeCategory', () => {
  it('maps Engine Oils → Engine',          () => { expect(normalizeCategory('Engine Oils')).toBe('Engine'); });
  it('maps Fuel System → Engine',           () => { expect(normalizeCategory('Fuel System')).toBe('Engine'); });
  it('maps Exhaust → Engine',               () => { expect(normalizeCategory('Exhaust')).toBe('Engine'); });
  it('maps Body & Exterior → Body',         () => { expect(normalizeCategory('Body & Exterior')).toBe('Body'); });
  it('maps Clutch & Transmission → Clutch', () => { expect(normalizeCategory('Clutch & Transmission')).toBe('Clutch'); });
  it('maps Ignition → Electrical',          () => { expect(normalizeCategory('Ignition')).toBe('Electrical'); });
  it('maps AC & Heating → Cooling',         () => { expect(normalizeCategory('AC & Heating')).toBe('Cooling'); });
  it('maps Fluids → Cooling',               () => { expect(normalizeCategory('Fluids')).toBe('Cooling'); });
  it('maps Radiator → Cooling',             () => { expect(normalizeCategory('Radiator')).toBe('Cooling'); });
  it('maps Wheel & Tyre → Tyres',           () => { expect(normalizeCategory('Wheel & Tyre')).toBe('Tyres'); });
  it('maps Tyres & Wheels → Tyres',         () => { expect(normalizeCategory('Tyres & Wheels')).toBe('Tyres'); });
  it('maps Steering & Suspension → Suspension', () => { expect(normalizeCategory('Steering & Suspension')).toBe('Suspension'); });
  it('passes through unknown categories',   () => { expect(normalizeCategory('Brakes')).toBe('Brakes'); });
  it('returns General for null',            () => { expect(normalizeCategory(null)).toBe('General'); });
  it('returns General for empty string',    () => { expect(normalizeCategory('')).toBe('General'); });
  it('returns General for undefined',       () => { expect(normalizeCategory(undefined)).toBe('General'); });
});

// ─── Search field INV-002 regression ─────────────────────────────────────────
describe('Inventory search — INV-002 regression', () => {
  const products = [
    { name: 'Oil Filter', sku: 'SKU-001', brand: 'Bosch', oemNumber: 'B123' },
    { name: 'Air Filter', sku: 'SKU-002', brand: 'Mann',  oemNumber: null  },
    { name: 'Brake Pad',  sku: 'SKU-003', brand: null,    oemNumber: 'BP99' },
  ];

  function search(q) {
    if (!q) return products;
    const lq = q.toLowerCase();
    // This is the fixed search predicate — no p.supplier (undefined field removed)
    return products.filter(p =>
      [p.name, p.sku, p.brand, p.oemNumber].some(s => (s || '').toLowerCase().includes(lq))
    );
  }

  it('finds by name',      () => { expect(search('oil').map(p => p.name)).toEqual(['Oil Filter']); });
  it('finds by sku',       () => { expect(search('SKU-002').map(p => p.name)).toEqual(['Air Filter']); });
  it('finds by brand',     () => { expect(search('bosch').map(p => p.name)).toEqual(['Oil Filter']); });
  it('finds by oemNumber', () => { expect(search('BP99').map(p => p.name)).toEqual(['Brake Pad']); });
  it('returns empty for no match', () => { expect(search('xyz')).toHaveLength(0); });
  it('is case-insensitive', () => { expect(search('MANN')).toHaveLength(1); });
  it('undefined supplier field does not crash search', () => {
    const prods = [{ name: 'Test', sku: 'T1', brand: null, oemNumber: null, supplier: undefined }];
    const res = prods.filter(p => [p.name, p.sku, p.brand, p.oemNumber].some(s => (s || '').toLowerCase().includes('test')));
    expect(res).toHaveLength(1);
  });
});
