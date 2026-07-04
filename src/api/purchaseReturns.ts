import { api } from './client.js';

export interface PurchaseReturnableItem {
  sourceMovementId: number;
  inventoryId: number;
  partName: string;
  unitPrice: number;
  gstRate: number;
  qtyReceived: number;
  qtyReturned: number;
  qtyReturnable: number;
}

export interface PurchaseEligibleItemsResponse {
  success: boolean;
  bill: { billId: number; invoiceNumber: string; supplierName: string | null; supplierGstin: string | null; createdAt: string };
  items: PurchaseReturnableItem[];
}

export const getEligiblePurchaseReturnItems = (billId: number | string) =>
  api.get<PurchaseEligibleItemsResponse>(`/api/shop/purchase-returns/bill/${billId}/eligible-items`);

export interface CreatePurchaseReturnPayload {
  originalBillId: number;
  items: { sourceMovementId: number; qty: number }[];
  reason: 'DAMAGED' | 'WRONG_ITEM' | 'EXCESS_SUPPLY' | 'QUALITY_ISSUE';
  resolution?: 'PENDING' | 'SUPPLIER_REFUND' | 'SUPPLIER_CREDIT' | 'REPLACEMENT';
  supplierCreditNoteNo?: string;
  partyId?: number;
  notes?: string;
}

export const createPurchaseReturn = (data: CreatePurchaseReturnPayload) =>
  api.post('/api/shop/purchase-returns', data);

export const getPurchaseReturns = (params?: Record<string, string>) =>
  api.get('/api/shop/purchase-returns', params);

export const getPurchaseReturn = (id: number | string) =>
  api.get(`/api/shop/purchase-returns/${id}`);

export const updatePurchaseReturnResolution = (
  id: number | string,
  data: { resolution: string; supplierCreditNoteNo?: string; version: number }
) => api.patch(`/api/shop/purchase-returns/${id}/resolution`, data);
