import { api } from './client.js';

export const getAuditLog = (params?: { page?: number; limit?: number; action?: string; from?: string; to?: string }) =>
  api.get('/api/audit/shop', params);
export const getAuditStats = () => api.get('/api/audit/shop/stats');
