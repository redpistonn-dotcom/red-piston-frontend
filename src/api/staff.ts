import { api } from './client.js';

export const getStaff = (params?: Record<string, any>) => api.get('/api/shop/staff', params);
export const inviteStaff = (data: { name: string; email?: string; phone?: string; role: string }) =>
  api.post('/api/shop/staff/invite', data);
export const updateStaffRole = (id: number | string, role: string) =>
  api.patch(`/api/shop/staff/${id}/role`, { role });
export const deactivateStaff = (id: number | string) =>
  api.patch(`/api/shop/staff/${id}/deactivate`, {});
export const reactivateStaff = (id: number | string) =>
  api.patch(`/api/shop/staff/${id}/reactivate`, {});
export const removeStaff = (id: number | string) =>
  api.delete(`/api/shop/staff/${id}`);
