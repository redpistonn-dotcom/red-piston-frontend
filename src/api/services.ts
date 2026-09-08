import { api } from './client.js';

export type PricingType = 'FIXED' | 'STARTING_FROM' | 'VEHICLE_DEPENDENT' | 'QUOTE_REQUIRED';
export type VehicleCategory = 'HATCHBACK' | 'SEDAN' | 'SUV' | 'LUXURY';

export interface ServicePackage {
  id?: number;
  name: string;
  description?: string | null;
  price: number;
  sortOrder?: number;
}

export interface ServiceAddon {
  id?: number;
  name: string;
  price: number;
  active?: boolean;
}

export interface ServiceVehiclePricing {
  id?: number;
  vehicleCategory: VehicleCategory;
  price: number;
}

export interface Service {
  id: number;
  shopId: number;
  name: string;
  description: string | null;
  category: string | null;
  pricingType: PricingType;
  basePrice: number | null;
  durationMinutes: number | null;
  gstPercent: number;
  images: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  packages: ServicePackage[];
  addons: ServiceAddon[];
  vehiclePricing: ServiceVehiclePricing[];
}

export interface ServicePayload {
  name: string;
  description?: string | null;
  category?: string | null;
  pricingType: PricingType;
  basePrice?: number | null;
  durationMinutes?: number | null;
  gstPercent?: number;
  images?: string[];
  active?: boolean;
  packages?: ServicePackage[];
  addons?: ServiceAddon[];
  vehiclePricing?: ServiceVehiclePricing[];
}

// Public — any shop's active services (used by the storefront page)
export const getShopServices = (shopId: number | string) =>
  api.get<{ success: boolean; services: Service[] }>('/api/services', { shopId: String(shopId) });

// Public — single service detail (includes shop info)
export const getService = (id: number | string) =>
  api.get<{ success: boolean; service: Service & { shop: { shopId: number; name: string; city: string | null; isVerified: boolean } } }>(`/api/services/${id}`);

// Shop owner — own services, including inactive ones
export const getMyServices = () =>
  api.get<{ success: boolean; services: Service[] }>('/api/services/mine');

export const createService = (data: ServicePayload) =>
  api.post<{ success: boolean; service: Service }>('/api/services', data);

export const updateService = (id: number, data: Partial<ServicePayload>) =>
  api.put<{ success: boolean; service: Service }>(`/api/services/${id}`, data);

export const deactivateService = (id: number) =>
  api.delete<{ success: boolean }>(`/api/services/${id}`);

export interface ServiceSearchResult {
  id: number;
  name: string;
  category: string | null;
  pricingType: PricingType;
  basePrice: number | null;
  gstPercent: number;
  durationMinutes: number | null;
  images: string[];
  distanceKm: number | null;
  shop: {
    shopId: number; name: string; city: string | null;
    logoUrl: string | null; isVerified: boolean; slug: string | null;
  };
}

export interface ServiceSearchParams {
  q?: string;
  category?: string;
  city?: string;
  priceMax?: number;
  verifiedOnly?: boolean;
  lat?: number;
  lng?: number;
  limit?: number;
  offset?: number;
}

// Public — cross-shop service discovery
export const searchServices = (params: ServiceSearchParams = {}) => {
  const query: Record<string, string> = {};
  if (params.q) query.q = params.q;
  if (params.category) query.category = params.category;
  if (params.city) query.city = params.city;
  if (params.priceMax != null) query.priceMax = String(params.priceMax);
  if (params.verifiedOnly) query.verifiedOnly = 'true';
  if (params.lat != null) query.lat = String(params.lat);
  if (params.lng != null) query.lng = String(params.lng);
  if (params.limit != null) query.limit = String(params.limit);
  if (params.offset != null) query.offset = String(params.offset);
  return api.get<{ success: boolean; results: ServiceSearchResult[]; total: number }>('/api/services/search', query);
};
