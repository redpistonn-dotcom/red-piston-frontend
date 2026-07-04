import { api } from './client.js';

export interface ReturnPolicyWindow {
  id: number;
  shopId: number;
  scope: 'CATEGORY' | 'BRAND';
  value: string;
  days: number;
}

export const getReturnPolicyWindows = () =>
  api.get<{ success: boolean; windows: ReturnPolicyWindow[] }>('/api/shop/return-policy-windows');

export const createReturnPolicyWindow = (data: { scope: 'CATEGORY' | 'BRAND'; value: string; days: number }) =>
  api.post('/api/shop/return-policy-windows', data);

export const deleteReturnPolicyWindow = (id: number) =>
  api.delete(`/api/shop/return-policy-windows/${id}`);
