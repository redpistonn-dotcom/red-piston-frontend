import { api } from './client.js';

export interface GstPeriodLock {
  id: number;
  shopId: number;
  period: string;
  lockedBy: number | null;
  lockedAt: string;
}

export const getGstPeriodLocks = () =>
  api.get<{ success: boolean; locks: GstPeriodLock[] }>('/api/shop/gst-periods');

export const lockGstPeriod = (period: string) =>
  api.post(`/api/shop/gst-periods/${period}/lock`);

export const unlockGstPeriod = (period: string) =>
  api.delete(`/api/shop/gst-periods/${period}/lock`);
