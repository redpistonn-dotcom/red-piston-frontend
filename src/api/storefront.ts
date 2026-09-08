import { api } from './client.js';
import type { Service } from './services.js';
import type { PortfolioItem } from './portfolio.js';
import type { ServiceReview } from './reviews.js';

export interface Storefront {
  shopId: number;
  slug: string;
  accentColor: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  aboutText: string | null;
  themeId: string;
}

export interface StorefrontPayload {
  slug: string;
  accentColor?: string | null;
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  aboutText?: string | null;
  themeId?: string;
}

export interface PublicStorefront {
  slug: string;
  accentColor: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  aboutText: string | null;
  themeId: string;
  shop: {
    shopId: number; name: string; phone: string; whatsappNumber: string | null;
    address: string | null; city: string | null; state: string | null;
    operatingHours: unknown; isVerified: boolean;
    latitude: number | null; longitude: number | null;
  };
  badges: {
    status: string; identityVerified: boolean; businessVerified: boolean;
    gstVerified: boolean; addressVerified: boolean;
  } | null;
  services: Service[];
  portfolio: PortfolioItem[];
  reviewSummary: { average: number | null; count: number };
  recentReviews: ServiceReview[];
}

export interface ShopVerification {
  shopId: number;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  identityVerified: boolean;
  businessVerified: boolean;
  gstVerified: boolean;
  addressVerified: boolean;
  rejectionReason: string | null;
  submittedAt: string | null;
}

// Public — full storefront page data by slug
export const getPublicStorefront = (slug: string) =>
  api.get<{ success: boolean; storefront: PublicStorefront }>(`/api/storefront/${encodeURIComponent(slug)}`);

// Shop owner
export const getMyStorefront = () =>
  api.get<{ success: boolean; storefront: Storefront | null }>('/api/storefront/mine');

export const saveMyStorefront = (data: StorefrontPayload) =>
  api.put<{ success: boolean; storefront: Storefront }>('/api/storefront/mine', data);

export const getMyVerification = () =>
  api.get<{ success: boolean; verification: ShopVerification | null }>('/api/storefront/mine/verification');

export const submitVerification = (documents?: unknown) =>
  api.post<{ success: boolean; verification: ShopVerification }>('/api/storefront/mine/verification/submit', { documents });
