import { api, getAccessToken } from './client.js';

export interface CreateExchangePayload {
  /** Provide EITHER originalInvoiceId+returnItems (normal path) OR walkInItems (no invoice found). */
  originalInvoiceId?: number;
  returnItems?: { invoiceItemId: number; qty: number; condition: 'SEALED' | 'GOOD' | 'DAMAGED' | 'USED' }[];
  walkInItems?: { inventoryId: number; qty: number; condition: 'SEALED' | 'GOOD' | 'DAMAGED' | 'USED'; unitPrice: number }[];
  walkInPartyId?: number;
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

// Returns the URL for the printable Exchange Invoice PDF. The caller must
// fetch this with an Authorization header (see openExchangeInvoicePdf in
// ReturnsPage.tsx) — window.open()/a plain <a href> can't attach one, and
// this endpoint requires auth like every other shop-scoped route.
export const getExchangePdfUrl = (id: number | string) => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return `${base}/api/shop/exchanges/${id}/pdf`;
};

// Fetches the Exchange Invoice PDF as a blob (carrying the auth header) and
// opens it in a new tab. Throws on failure so callers can show their own
// error toast — this deliberately does NOT swallow errors silently.
export const openExchangeInvoicePdf = async (id: number | string) => {
  const res = await fetch(getExchangePdfUrl(id), {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Could not load the exchange invoice (server returned ${res.status})`);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  window.open(objUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
};
