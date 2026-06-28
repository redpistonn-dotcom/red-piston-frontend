import { api } from './client.js';

export const extractBill = (data: FormData) => api.post('/api/billing/extract', data);
export const importBill = (id: number | string, data: Record<string, any>) =>
  api.post(`/api/billing/${id}/import`, data);
export const getPurchaseBills = (params?: Record<string, any>) => api.get('/api/billing/purchase-bills', params);
export const getPurchaseBill = (id: number | string) => api.get(`/api/billing/purchase-bills/${id}`);
