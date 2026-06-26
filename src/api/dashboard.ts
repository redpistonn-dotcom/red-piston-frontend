import { api } from './client.js';

export const getDashboard = (period = 'today') => api.get('/api/shop/dashboard', { period });

export const getDashboardByRange = (from: string, to: string) =>
  api.get('/api/shop/dashboard', { from, to });

export const getDashboardTrend = (from: string, to: string) =>
  api.get('/api/shop/dashboard/trend', { from, to });
