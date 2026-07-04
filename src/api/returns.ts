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

export const getSalesReturns = (params?: Record<string, string>) =>
  api.get('/api/shop/returns', params);

export const getSalesReturn = (id: number | string) =>
  api.get(`/api/shop/returns/${id}`);
