import { describe, it, expect } from 'vitest';
import {
  computeGST,
  computeProfit,
  generateInvoiceNumber,
  computeSaleTotal,
} from '../utils/billing';

describe('computeGST', () => {
  it('returns 0 when rate is 0', () => {
    expect(computeGST(1000, 0)).toBe(0);
  });
  it('returns 0 when rate is missing', () => {
    expect(computeGST(1000, null)).toBe(0);
  });
  it('extracts 18% GST from inclusive total', () => {
    // 1180 = 1000 base + 180 GST
    expect(computeGST(1180, 18)).toBeCloseTo(180, 1);
  });
  it('extracts 28% GST from inclusive total', () => {
    expect(computeGST(1280, 28)).toBeCloseTo(280, 1);
  });
  it('extracts 5% GST correctly', () => {
    expect(computeGST(1050, 5)).toBeCloseTo(50, 1);
  });
});

describe('computeProfit', () => {
  it('computes correct profit without discount', () => {
    // sell 2 units at 500, cost 300 → profit = 2*(500-300) = 400
    expect(computeProfit(2, 500, 300)).toBe(400);
  });
  it('applies discount before computing profit', () => {
    // 10% discount: revenue = 2*500*0.9 = 900, cost = 600 → profit = 300
    expect(computeProfit(2, 500, 300, 10)).toBe(300);
  });
  it('returns negative profit when selling below cost', () => {
    expect(computeProfit(1, 200, 300)).toBe(-100);
  });
  it('handles zero buyPrice', () => {
    expect(computeProfit(3, 100, 0)).toBe(300);
  });
  it('handles undefined buyPrice as 0', () => {
    expect(computeProfit(1, 100, undefined)).toBe(100);
  });
});

describe('generateInvoiceNumber', () => {
  it('returns a non-empty string', () => {
    const inv = generateInvoiceNumber('SHOP001');
    expect(typeof inv).toBe('string');
    expect(inv.length).toBeGreaterThan(4);
  });
  it('includes the last 4 chars of shopId uppercased', () => {
    const inv = generateInvoiceNumber('s001');
    expect(inv.startsWith('S001-')).toBe(true);
  });
  it('includes prefix when provided', () => {
    const inv = generateInvoiceNumber('s001', 'EST');
    expect(inv.startsWith('EST-')).toBe(true);
  });
  it('produces a timestamp-based unique suffix', () => {
    const inv = generateInvoiceNumber('s1');
    // Format: <SUFFIX>-<BASE36_TS>
    expect(inv).toMatch(/^[A-Z0-9]+-[A-Z0-9]+$/);
  });
});

describe('computeSaleTotal', () => {
  it('computes correct totals without discount', () => {
    const r = computeSaleTotal({ qty: 2, sellPrice: 500, discount: 0, gstRate: 18, buyPrice: 300 });
    expect(r.subtotal).toBe(1000);
    expect(r.afterDiscount).toBe(1000);
    expect(r.discountAmount).toBe(0);
    expect(r.profit).toBe(400);
    expect(r.total).toBe(1000);
  });
  it('applies percentage discount correctly', () => {
    const r = computeSaleTotal({ qty: 1, sellPrice: 1000, discount: 10, gstRate: 0, buyPrice: 600 });
    expect(r.afterDiscount).toBe(900);
    expect(r.discountAmount).toBe(100);
    expect(r.profit).toBe(300);
  });
  it('uses zero discount and buyPrice as defaults', () => {
    const r = computeSaleTotal({ qty: 1, sellPrice: 500 });
    expect(r.total).toBe(500);
    expect(r.discountAmount).toBe(0);
    expect(r.profit).toBe(500); // buyPrice defaults to 0
  });
  it('gstAmount is included in total check', () => {
    const r = computeSaleTotal({ qty: 1, sellPrice: 118, discount: 0, gstRate: 18, buyPrice: 0 });
    // GST from 118 inclusive = 18
    expect(r.gstAmount).toBeCloseTo(18, 1);
  });
  it('handles zero qty', () => {
    const r = computeSaleTotal({ qty: 0, sellPrice: 500, buyPrice: 300 });
    expect(r.total).toBe(0);
    expect(r.profit).toBe(0);
  });
});
