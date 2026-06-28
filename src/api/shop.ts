import { api } from './client.js';

export const getShopProfile = () => api.get('/api/shop/profile');
export const updateShopProfile = (data: Record<string, any>) => api.put('/api/shop/profile', data);
export const updateShopBank = (data: { bankAccountNumber: string; bankIfsc: string; bankAccountName: string }) =>
  api.put('/api/shop/profile/bank', data);
