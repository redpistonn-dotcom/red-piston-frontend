import { api } from './client.js';

export interface ReturnableItem {
  invoiceItemId: number;
  inventoryId: number;
  partName: string;
  unitPrice: number;
  discount: number;
  gstRate: number;
  qtySold: number;
  qtyReturned: number;
  qtyReturnable: number;
}

export interface EligibleItemsResponse {
  success: boolean;
  invoice: { invoiceId: number; invoiceNumber: string; createdAt: string; partyId: number | null; partyName: string | null };
  items: ReturnableItem[];
  daysSinceSale: number;
  returnPolicyDays: number;
  withinPolicy: boolean;
}

export const getEligibleReturnItems = (invoiceId: number | string) =>
  api.get<EligibleItemsResponse>(`/api/shop/returns/invoice/${invoiceId}/eligible-items`);

export interface CreateReturnItem {
  invoiceItemId: number;
  qty: number;
  condition: 'SEALED' | 'GOOD' | 'DAMAGED' | 'USED';
}

export interface CreateReturnPayload {
  originalInvoiceId: number;
  items: CreateReturnItem[];
  reason: 'WRONG_PART' | 'DEFECTIVE' | 'WARRANTY' | 'CHANGED_MIND' | 'OTHER';
  refundMode: 'CASH' | 'UPI' | 'BANK' | 'STORE_CREDIT';
  notes?: string;
}

export const createSalesReturn = (data: CreateReturnPayload) =>
  api.post('/api/shop/returns', data);

export interface CreateWalkInReturnItem {
  inventoryId: number;
  qty: number;
  condition: 'SEALED' | 'GOOD' | 'DAMAGED' | 'USED';
  unitPrice: number;
}

export interface CreateWalkInReturnPayload {
  items: CreateWalkInReturnItem[];
  reason: 'WRONG_PART' | 'DEFECTIVE' | 'WARRANTY' | 'CHANGED_MIND' | 'OTHER';
  refundMode: 'CASH' | 'UPI' | 'BANK' | 'STORE_CREDIT';
  notes?: string;
  partyId?: number;
}

// Fallback when staff can't locate the original invoice (no name/phone on
// file, receipt lost, etc.) — always flagged for manager review server-side.
export const createWalkInSalesReturn = (data: CreateWalkInReturnPayload) =>
  api.post('/api/shop/returns/walk-in', data);

export const getSalesReturns = (params?: Record<string, string>) =>
  api.get('/api/shop/returns', params);

export const getSalesReturn = (id: number | string) =>
  api.get(`/api/shop/returns/${id}`);

// Returns the URL for the printable Credit Note / Return Invoice PDF.
// The caller must fetch this with an Authorization header.
export const getReturnPdfUrl = (id: number | string) => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return `${base}/api/shop/returns/${id}/pdf`;
};
