import { api } from './client.js';

export interface CreditNote {
  creditNoteId: number;
  creditNoteNo: string;
  type: 'GST' | 'COMMERCIAL';
  issueDate: string;
  taxableValue: string;
  cgst: string;
  sgst: string;
  totalAmount: string;
  status: 'UNUSED' | 'PARTIALLY_USED' | 'FULLY_USED' | 'REFUNDED';
  remainingBalance: string;
  gstPeriodDeclared: string | null;
  reason: string | null;
  invoice?: { invoiceNumber: string };
  party?: { name: string; phone: string } | null;
}

export const getCreditNotes = (params?: Record<string, string>) =>
  api.get<{ success: boolean; creditNotes: CreditNote[]; total: number; outstandingCreditBalance: number }>('/api/shop/credit-notes', params);

export const getCreditNote = (id: number | string) =>
  api.get(`/api/shop/credit-notes/${id}`);

// Redeemable notes for a given party — used by POS to offer "apply credit" at billing time
export const getAvailableCreditNotes = (partyId: number | string) =>
  api.get<{ success: boolean; creditNotes: CreditNote[] }>('/api/shop/credit-notes', { partyId: String(partyId), available: 'true' });
