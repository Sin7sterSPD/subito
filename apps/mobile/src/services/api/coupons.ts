import { apiClient } from '../api-client';
import { Coupon } from '../../types/api';

export const couponsApi = {
  getCoupons: (page = 1, limit = 20) =>
    apiClient.get<Coupon[]>(`/coupons?page=${page}&limit=${limit}`),

  getBestCoupon: (lat: number, lng: number) =>
    apiClient.get<Coupon | null>(`/coupons/best?lat=${lat}&long=${lng}`),

  applyCoupon: (code: string) =>
    apiClient.post<{ success: boolean; error?: string }>('/coupons/apply', { code }),

  removeCoupon: () =>
    apiClient.post<{ success: boolean }>('/coupons/apply', { code: null }),
};
