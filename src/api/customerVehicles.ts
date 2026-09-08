import { api } from './client.js';

export interface CustomerVehicle {
  id: number;
  userId: number;
  vehicleId: number | null;
  nickname: string | null;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  fuelType: string | null;
  registrationNo: string | null;
  purchaseYear: number | null;
  isDefault: boolean;
  createdAt: string;
}

export interface CustomerVehiclePayload {
  make: string;
  model: string;
  year: number;
  nickname?: string;
  variant?: string;
  fuelType?: string;
  registrationNo?: string;
  purchaseYear?: number;
  isDefault?: boolean;
}

export const getMyVehicles = () =>
  api.get<{ success: boolean; data: CustomerVehicle[] }>('/api/customer/garage');

export const addMyVehicle = (data: CustomerVehiclePayload) =>
  api.post<{ success: boolean; data: CustomerVehicle }>('/api/customer/garage', data);

export const deleteMyVehicle = (id: number) =>
  api.delete<{ success: boolean }>(`/api/customer/garage/${id}`);
