import { api } from './client.js';

export interface PortfolioItem {
  id: number;
  shopId: number;
  serviceId: number | null;
  beforeImageUrl: string;
  afterImageUrl: string;
  videoUrl: string | null;
  vehicleLabel: string | null;
  description: string | null;
  priceRangeLabel: string | null;
  workDate: string | null;
  createdAt: string;
  updatedAt: string;
  service: { id: number; name: string } | null;
}

export interface PortfolioItemPayload {
  serviceId?: number | null;
  beforeImageUrl: string;
  afterImageUrl: string;
  videoUrl?: string | null;
  vehicleLabel?: string | null;
  description?: string | null;
  priceRangeLabel?: string | null;
  workDate?: string | null;
}

// Public — a shop's portfolio (used by the storefront page)
export const getShopPortfolio = (shopId: number | string) =>
  api.get<{ success: boolean; items: PortfolioItem[] }>('/api/portfolio', { shopId: String(shopId) });

// Shop owner
export const getMyPortfolio = () =>
  api.get<{ success: boolean; items: PortfolioItem[] }>('/api/portfolio/mine');

export const createPortfolioItem = (data: PortfolioItemPayload) =>
  api.post<{ success: boolean; item: PortfolioItem }>('/api/portfolio', data);

export const updatePortfolioItem = (id: number, data: Partial<PortfolioItemPayload>) =>
  api.put<{ success: boolean; item: PortfolioItem }>(`/api/portfolio/${id}`, data);

export const deletePortfolioItem = (id: number) =>
  api.delete<{ success: boolean }>(`/api/portfolio/${id}`);
