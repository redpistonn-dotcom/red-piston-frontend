import { api } from './client.js';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CUSTOMER_ARRIVED' | 'SERVICE_IN_PROGRESS' | 'DECLINED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';

export interface PriceSnapshot {
  serviceName: string;
  packageName: string | null;
  basePrice: number;
  addons: { name: string; price: number }[];
  addonsTotal: number;
  subtotal: number;
  gstPercent: number;
  cgst: number;
  sgst: number;
  total: number;
}

export interface Booking {
  id: number;
  bookingNumber: string;
  shopId: number;
  status: BookingStatus;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  priceSnapshot: PriceSnapshot;
  notes: string | null;
  cancelReason: string | null;
  version: number;
  createdAt: string;
  service: { id: number; name: string; gstPercent: number };
  package: { id: number; name: string } | null;
  addons: { id: number; name: string; price: number }[];
  shop?: { shopId: number; name: string; phone: string };
  customer?: { userId: number; name: string; phone: string | null; email: string | null };
  vehicle?: { id: number; make: string; model: string; registrationNo: string | null } | null;
  assignedStaff?: { userId: number; name: string } | null;
}

export interface AvailabilityResponse {
  success: boolean;
  date: string;
  slots: string[];
  hours: { open: string; close: string } | null;
}

export const getAvailability = (shopId: number, serviceId: number, date: string) =>
  api.get<AvailabilityResponse>('/api/bookings/availability', { shopId: String(shopId), serviceId: String(serviceId), date });

export interface CreateBookingPayload {
  shopId: number;
  serviceId: number;
  packageId?: number | null;
  addonIds?: number[];
  vehicleId?: number | null;
  vehicleCategory?: string;
  scheduledDate: string;
  scheduledStartTime: string;
  notes?: string;
}

export const createBooking = (data: CreateBookingPayload) =>
  api.post<{ success: boolean; booking: Booking }>('/api/bookings', data);

export const getMyBookings = () =>
  api.get<{ success: boolean; bookings: Booking[] }>('/api/bookings/mine');

export const cancelMyBooking = (id: number, reason?: string) =>
  api.patch<{ success: boolean }>(`/api/bookings/${id}/cancel`, { reason });

// Shop owner
export interface ShopBookingsParams {
  status?: BookingStatus;
  from?: string; // YYYY-MM-DD, used by the calendar week view
  to?: string;
}
export const getShopBookings = (params: ShopBookingsParams = {}) => {
  const query: Record<string, string> = {};
  if (params.status) query.status = params.status;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  return api.get<{ success: boolean; bookings: Booking[] }>('/api/bookings/shop', Object.keys(query).length ? query : undefined);
};

export const updateBookingStatus = (id: number, data: { status: BookingStatus; version: number; note?: string }) =>
  api.patch<{ success: boolean; booking: Booking }>(`/api/bookings/${id}/status`, data);

export const assignBooking = (id: number, staffId: number | null) =>
  api.patch<{ success: boolean; booking: Booking }>(`/api/bookings/${id}/assign`, { staffId });
