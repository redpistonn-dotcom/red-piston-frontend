import { api } from './client.js';

export interface ServiceReview {
  id: number;
  bookingId: number;
  shopId: number;
  serviceId: number;
  customerId: number;
  overallRating: number;
  qualityRating: number;
  valueRating: number;
  professionalismRating: number;
  timelinessRating: number;
  wouldRecommend: boolean;
  comment: string | null;
  shopResponse: string | null;
  shopRespondedAt: string | null;
  createdAt: string;
  customer?: { name: string };
  service?: { id: number; name: string };
}

export interface ReviewableBooking {
  id: number;
  bookingNumber: string;
  scheduledStart: string;
  priceSnapshot: { serviceName: string };
  service: { id: number; name: string };
  shop: { shopId: number; name: string };
}

export interface CreateReviewPayload {
  bookingId: number;
  overallRating: number;
  qualityRating: number;
  valueRating: number;
  professionalismRating: number;
  timelinessRating: number;
  wouldRecommend: boolean;
  comment?: string;
}

export const createReview = (data: CreateReviewPayload) =>
  api.post<{ success: boolean; review: ServiceReview }>('/api/reviews', data);

export const getShopReviews = (shopId: number | string, limit?: number, offset?: number) =>
  api.get<{ success: boolean; reviews: ServiceReview[]; total: number }>('/api/reviews', {
    shopId: String(shopId),
    ...(limit != null ? { limit: String(limit) } : {}),
    ...(offset != null ? { offset: String(offset) } : {}),
  });

export const getMyReviewStatus = () =>
  api.get<{ success: boolean; reviewableBookings: ReviewableBooking[]; myReviews: ServiceReview[] }>('/api/reviews/mine');

export const respondToReview = (id: number, response: string) =>
  api.post<{ success: boolean; review: ServiceReview }>(`/api/reviews/${id}/respond`, { response });
