/**
 * Pure financial calculation utilities.
 * Extracted so they can be unit-tested without mounting any React component.
 */
import type { SaleTotalInput, SaleTotalResult } from '../types';

/** Extract GST component from a GST-inclusive total. */
export function computeGST(inclusiveTotal: number, gstRate: number | null | undefined): number {
  if (!gstRate || gstRate <= 0) return 0;
  return (inclusiveTotal * gstRate) / (100 + gstRate);
}

/** Gross profit on a single line item, after optional percentage discount. */
export function computeProfit(
  qty: number,
  sellPrice: number,
  buyPrice: number | undefined,
  discount = 0,
): number {
  const revenue = qty * sellPrice * (1 - discount / 100);
  const cost = qty * (buyPrice ?? 0);
  return revenue - cost;
}

/**
 * Generate a collision-proof invoice number.
 * Format: <SHOP_SUFFIX>-<BASE36_TIMESTAMP>
 */
export function generateInvoiceNumber(shopId: string | number, prefix = ''): string {
  const shopSuffix = String(shopId ?? '0000').slice(-4).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return prefix ? `${prefix}-${shopSuffix}-${ts}` : `${shopSuffix}-${ts}`;
}

/** Compute all totals for a single sale line from raw inputs. */
export function computeSaleTotal(input: SaleTotalInput): SaleTotalResult {
  const { qty, sellPrice, discount = 0, gstRate = 18, buyPrice = 0 } = input;
  const subtotal = qty * sellPrice;
  const discountAmount = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = computeGST(afterDiscount, gstRate);
  const profit = computeProfit(qty, sellPrice, buyPrice, discount);
  return { subtotal, discountAmount, afterDiscount, gstAmount, profit, total: afterDiscount };
}
