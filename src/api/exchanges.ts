import { api } from './client.js';

export interface CreateExchangePayload {
  originalInvoiceId: number;
  returnItems: { invoiceItemId: number; qty: number; condition: 'SEALED' | 'GOOD' | 'DAMAGED' | 'USED' }[];
  returnReason: 'WRONG_PART' | 'DEFECTIVE' | 'WARRANTY' | 'CHANGED_MIND' | 'OTHER';
  returnNotes?: string;
  newItems: { inventoryId: number; qty: number; unitPrice?: number; discount?: number }[];
  partyName?: string;
  partyPhone?: string;
  partyGstin?: string;
  paymentMode?: string;
  cashAmount?: number;
  upiAmount?: number;
  creditAmount?: number;
  notes?: string;
}

export const createExchange = (data: CreateExchangePayload) =>
  api.post('/api/shop/exchanges', data);

export const getExchanges = (params?: Record<string, string>) =>
  api.get('/api/shop/exchanges', params);

export const getExchange = (id: number | string) =>
  api.get(`/api/shop/exchanges/${id}`);
