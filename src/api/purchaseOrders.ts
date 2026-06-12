import { api } from './client.js';

export const getPurchaseOrders = (params?: { status?: string; partyId?: number }) =>
  api.get('/api/shop/purchase-orders', params);

export const createPurchaseOrder = (data: unknown) =>
  api.post('/api/shop/purchase-orders', data);

export const getPurchaseOrder = (id: number) =>
  api.get(`/api/shop/purchase-orders/${id}`);

export const updatePurchaseOrder = (id: number, data: unknown) =>
  api.patch(`/api/shop/purchase-orders/${id}`, data);

export const updatePurchaseOrderStatus = (id: number, status: string, receivedItems?: unknown[]) =>
  api.patch(`/api/shop/purchase-orders/${id}/status`, { status, receivedItems });

export const getSupplierProducts = (partyId: number) =>
  api.get(`/api/shop/purchase-orders/supplier-products/${partyId}`);

export const getPurchaseOrderPdfUrl = (id: number) =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/shop/purchase-orders/${id}/pdf`;
