import { api, BASE_URL } from './client.js';

export const createInvoice = (data) => api.post('/api/billing/invoice', data);
export const getInvoices = (params) => api.get('/api/billing/invoices', params);
export const getInvoicePdfUrl = (id: any, opts?: { showOem?: boolean; showMrp?: boolean }) => {
  const base = `${BASE_URL}/api/billing/invoice/${id}/pdf`;
  if (!opts?.showOem && !opts?.showMrp) return base;
  const params = new URLSearchParams();
  if (opts.showOem) params.set('showOem', 'true');
  if (opts.showMrp) params.set('showMrp', 'true');
  return `${base}?${params.toString()}`;
};
export const sendInvoiceWhatsApp = (id) => api.post(`/api/billing/invoice/${id}/send-whatsapp`, {});
export const getInvoice = (id) => api.get(`/api/billing/invoice/${id}`);
export const recordInvoicePayment = (id, data) => api.post(`/api/billing/invoice/${id}/payment`, data);
