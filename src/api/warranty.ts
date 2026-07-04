import { api } from './client.js';

export interface WarrantyClaim {
  claimId: number;
  claimNo: string;
  status: 'SENT_TO_SUPPLIER' | 'APPROVED' | 'REJECTED' | 'REPLACEMENT_RECEIVED' | 'RETURNED_TO_CUSTOMER';
  qty: number;
  sentDate: string;
  resolvedDate: string | null;
  notes: string | null;
  version: number;
  invoice?: { invoiceNumber: string };
  invoiceItem?: { partName: string };
}

export interface CreateWarrantyClaimPayload {
  originalInvoiceId: number;
  invoiceItemId: number;
  qty?: number;
  partyId?: number;
  notes?: string;
}

export const createWarrantyClaim = (data: CreateWarrantyClaimPayload) =>
  api.post<{ success: boolean; claim: WarrantyClaim; daysSinceSale: number; warrantyMonths: number | null; withinWarranty: boolean }>('/api/shop/warranty-claims', data);

export const getWarrantyClaims = (params?: Record<string, string>) =>
  api.get<{ success: boolean; claims: WarrantyClaim[]; total: number }>('/api/shop/warranty-claims', params);

export const getWarrantyClaim = (id: number | string) =>
  api.get(`/api/shop/warranty-claims/${id}`);

export const updateWarrantyClaimStatus = (
  id: number | string,
  data: { status: string; version: number; notes?: string }
) => api.patch<{ success: boolean; claim: WarrantyClaim }>(`/api/shop/warranty-claims/${id}/status`, data);
