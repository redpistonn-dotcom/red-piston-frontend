/**
 * src/validation/schemas.ts — Zod schemas for all form modals.
 *
 * WHY Zod instead of inline validation:
 *   Before this, SaleModal, PurchaseModal, StockAdjustmentModal, and ProductModal
 *   each had 20–40 lines of manual if/else validation, duplicating the same
 *   rules in different forms (e.g. "qty must be a positive number" appears in
 *   all four). A bug fix in one place doesn't fix the others.
 *
 *   With Zod:
 *   - One source of truth per form
 *   - schema.safeParse(data) → { success, error } with structured error messages
 *   - TypeScript infer<typeof SaleSchema> gives the validated data type for free
 *   - Easy to unit-test without mounting React components
 */
import { z } from 'zod';

// ── Reusable refinements ──────────────────────────────────────────────────────

const positiveNumber = z.number({ invalid_type_error: 'Must be a number' }).positive('Must be greater than 0');
const nonNegativeNumber = z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Cannot be negative');
const positiveInt = z.number({ invalid_type_error: 'Must be a number' }).int('Must be a whole number').positive('Must be greater than 0');
const optionalString = z.string().optional().nullable();
const requiredString = z.string().min(1, 'Required');

// ── Sale / Quotation ──────────────────────────────────────────────────────────

export const SaleSchema = z.object({
  productId:    z.union([z.string(), z.number()]),
  qty:          positiveInt,
  sellPrice:    positiveNumber,
  discount:     nonNegativeNumber.max(100, 'Discount cannot exceed 100%').default(0),
  gstRate:      nonNegativeNumber.default(18),
  customerName: optionalString,
  customerPhone: optionalString,
  vehicleReg:   optionalString,
  mechanic:     optionalString,
  notes:        optionalString,
  paymentMode:  z.string().default('Cash'),
  type:         z.enum(['Sale', 'Quotation']).default('Sale'),
});

export type SaleFormData = z.infer<typeof SaleSchema>;

/** Validate sale form data — returns parsed data or throws ZodError */
export function validateSale(raw: unknown) {
  return SaleSchema.safeParse(raw);
}

// ── Multi-item POS Sale ───────────────────────────────────────────────────────

export const SaleLineSchema = z.object({
  productId:  z.union([z.string(), z.number()]),
  name:       requiredString,
  qty:        positiveInt,
  sellPrice:  positiveNumber,
  discount:   nonNegativeNumber.max(100).default(0),
  gstRate:    nonNegativeNumber.default(18),
  buyPrice:   nonNegativeNumber.default(0),
  maxStock:   z.number().optional(),
});

export const MultiSaleSchema = z.object({
  items:        z.array(SaleLineSchema).min(1, 'At least one item required'),
  customerName: optionalString,
  customerPhone:optionalString,
  vehicleReg:   optionalString,
  mechanic:     optionalString,
  notes:        optionalString,
  paymentMode:  z.string().default('Cash'),
  type:         z.enum(['Sale', 'Quotation']).default('Sale'),
});

export type MultiSaleFormData = z.infer<typeof MultiSaleSchema>;

// ── Purchase ──────────────────────────────────────────────────────────────────

export const PurchaseSchema = z.object({
  productId:     z.union([z.string(), z.number()]),
  qty:           positiveInt,
  buyPrice:      positiveNumber,
  newSellPrice:  z.number().optional().nullable(),
  supplier:      optionalString,
  invoiceNo:     optionalString,
  payment:       z.string().default('Cash'),
  creditDays:    z.number().int().min(0).default(30),
  gstRate:       nonNegativeNumber.default(18),
  notes:         optionalString,
}).refine(
  (d) => !d.newSellPrice || d.newSellPrice >= d.buyPrice,
  { message: 'Selling price should be at or above buying price', path: ['newSellPrice'] },
);

export type PurchaseFormData = z.infer<typeof PurchaseSchema>;

export function validatePurchase(raw: unknown) {
  return PurchaseSchema.safeParse(raw);
}

// ── Stock Adjustment ──────────────────────────────────────────────────────────

const ADJUST_TYPES = [
  'RETURN_IN', 'RETURN_OUT', 'CREDIT_NOTE', 'DEBIT_NOTE',
  'DAMAGE', 'THEFT', 'AUDIT', 'OPENING',
] as const;

export const AdjustmentSchema = z.object({
  productId:      z.union([z.string(), z.number()]),
  adjustType:     z.enum(ADJUST_TYPES),
  qty:            positiveInt,
  previousStock:  z.number().int(),
  reason:         optionalString,
  reasonDetail:   optionalString,
  refundMethod:   optionalString,
  refundAmount:   nonNegativeNumber.optional(),
  originalInvoice:optionalString,
  supplierName:   optionalString,
  notes:          optionalString,
}).refine(
  (d) => {
    // RETURN_IN requires a refund method if refundAmount > 0
    if (d.adjustType === 'RETURN_IN' && (d.refundAmount ?? 0) > 0) {
      return !!d.refundMethod;
    }
    return true;
  },
  { message: 'Refund method is required when refund amount is set', path: ['refundMethod'] },
);

export type AdjustmentFormData = z.infer<typeof AdjustmentSchema>;

export function validateAdjustment(raw: unknown) {
  return AdjustmentSchema.safeParse(raw);
}

// ── Product (Create / Edit) ───────────────────────────────────────────────────

export const ProductSchema = z.object({
  name:         requiredString.max(100, 'Name too long'),
  sku:          optionalString,
  category:     optionalString,
  brand:        optionalString,
  supplier:     optionalString,
  sellPrice:    positiveNumber,
  buyPrice:     nonNegativeNumber.default(0),
  stock:        z.number().int().min(0).default(0),
  minStock:     z.number().int().min(0).default(5),
  rack:         optionalString,
  hsnCode:      optionalString,
  gstRate:      nonNegativeNumber.default(18),
  isMarketplaceListed: z.boolean().default(false),
  description:  optionalString,
}).refine(
  (d) => d.sellPrice >= d.buyPrice,
  { message: 'Selling price should be at or above buying price', path: ['sellPrice'] },
);

export type ProductFormData = z.infer<typeof ProductSchema>;

export function validateProduct(raw: unknown) {
  return ProductSchema.safeParse(raw);
}

// ── Party (Customer / Supplier) ───────────────────────────────────────────────

export const PartySchema = z.object({
  name:         requiredString.max(100),
  phone:        z.string().regex(/^\d{10}$/, 'Must be a 10-digit number').optional().nullable(),
  gstin:        z.string().regex(/^[0-9A-Z]{15}$/, 'Invalid GST number format').optional().nullable(),
  address:      optionalString,
  type:         z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).default('CUSTOMER'),
  creditLimit:  nonNegativeNumber.default(0),
  creditDays:   z.number().int().min(0).default(30),
  notes:        optionalString,
});

export type PartyFormData = z.infer<typeof PartySchema>;

export function validateParty(raw: unknown) {
  return PartySchema.safeParse(raw);
}
