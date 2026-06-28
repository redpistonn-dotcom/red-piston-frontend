import { api } from './client.js';

export const getParties = (type) => api.get('/api/shop/parties', type ? { type } : undefined);
export const createParty = (data) => api.post('/api/shop/parties', data);
export const getPartyLedger = (id) => api.get(`/api/shop/parties/${id}/ledger`);
export const recordPayment = (id, data) => api.post(`/api/shop/parties/${id}/payment`, data);
export const getOverdueParties = () => api.get('/api/shop/parties/summary/overdue');
export const updateParty = (id, data) => api.put(`/api/shop/parties/${id}`, data);
export const deleteParty = (id) => api.delete(`/api/shop/parties/${id}`);
export const addLedgerEntry = (id, data) => api.post(`/api/shop/parties/${id}/ledger`, data);
