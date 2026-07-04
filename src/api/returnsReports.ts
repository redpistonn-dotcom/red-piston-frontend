import { api } from './client.js';

const BASE = '/api/shop/returns-reports';

export const getSalesReturnsReport = (params?: Record<string, string>) => api.get(`${BASE}/sales-returns`, params);
export const getPurchaseReturnsReport = (params?: Record<string, string>) => api.get(`${BASE}/purchase-returns`, params);
export const getExchangesReport = (params?: Record<string, string>) => api.get(`${BASE}/exchanges`, params);
export const getWarrantyAgingReport = () => api.get(`${BASE}/warranty-aging`);
export const getReasonsParetoReport = (params?: Record<string, string>) => api.get(`${BASE}/reasons-pareto`, params);
export const getReturnRateByBrandReport = (params?: Record<string, string>) => api.get(`${BASE}/return-rate-by-brand`, params);
export const getInventoryAdjustmentsReport = (params?: Record<string, string>) => api.get(`${BASE}/inventory-adjustments`, params);
export const getCreditNoteRegister = (params?: Record<string, string>) => api.get(`${BASE}/credit-note-register`, params);

export const getCreditNoteRegisterExcelUrl = (params?: Record<string, string>) => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const qp = new URLSearchParams({ ...params, format: 'excel' });
  return `${base}${BASE}/credit-note-register?${qp}`;
};
