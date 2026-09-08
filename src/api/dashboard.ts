import { api } from './client.js';

export const getDashboard = (period = 'today') => api.get('/api/shop/dashboard', { period });

export const getDashboardByRange = (from: string, to: string) =>
  api.get('/api/shop/dashboard', { from, to });

export const getDashboardTrend = (from: string, to: string) =>
  api.get('/api/shop/dashboard/trend', { from, to });

export interface BookingsSummary {
  success: boolean;
  todayCount: number;
  pendingCount: number;
  todayRevenue: number;
  upcoming: Array<{
    id: number; bookingNumber: string; status: string; scheduledStart: string;
    serviceName: string; customerName: string; total: number;
  }>;
  statusBreakdown: Record<string, number>;
}

export const getBookingsSummary = () =>
  api.get<BookingsSummary>('/api/shop/dashboard/bookings-summary');
