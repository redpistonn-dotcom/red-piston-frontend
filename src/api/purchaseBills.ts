import { api } from './client.js';

export const extractBill = (data: Record<string, any>) => api.post('/api/shop/purchase-bills/extract', data);
export const importBill = (id: number | string, data: Record<string, any>) =>
  api.post(`/api/shop/purchase-bills/${id}/import`, data);
export const getPurchaseBills = (params?: Record<string, any>) => api.get('/api/shop/purchase-bills', params);
export const getPurchaseBill = (id: number | string) => api.get(`/api/shop/purchase-bills/${id}`);
