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
// saves it via a named <a download>. Throws on failure so callers can show
// their own error toast — this deliberately does NOT swallow errors silently.
//
// WHY <a download> and not window.open(blob:...): a blob: URL handed to an
// external/mobile PDF viewer can go stale before that viewer finishes
// reading it, producing "Failed to load PDF document" even though the
// fetch succeeded. A real download with a filename always leaves a
// complete file on disk (see the same fix in POSBillingPage/HistoryPage).
export const openExchangeInvoicePdf = async (id: number | string) => {
  const res = await fetch(getExchangePdfUrl(id), {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Could not load the exchange invoice (server returned ${res.status})`);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = `exchange-invoice-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 30000);
};

// Fetches the Exchange PDF and returns a blob URL for iframe preview.
// The caller is responsible for revoking the URL when done (URL.revokeObjectURL).
export const previewExchangePdf = async (id: number | string): Promise<string> => {
  const res = await fetch(getExchangePdfUrl(id), {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Could not load the exchange invoice (server returned ${res.status})`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

