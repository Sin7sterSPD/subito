import { apiClient } from '../api-client';
import { Booking, BookingSlot, PartnerLocation, RefundDetails, BookingStatus, BookingType } from '../../types/api';

interface BookingsQuery {
  page?: number;
  limit?: number;
  status?: BookingStatus[];
  bookingType?: BookingType[];
}

interface CreateBookingData {
  addressId: string;
  items: { catalogId: string; quantity: number; propertyConfig?: Record<string, unknown> }[];
  bookingType: BookingType;
  scheduledDate?: string;
  scheduledTime?: string;
  recurringType?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  couponCode?: string;
  customerNotes?: string;
}

interface CancelBookingData {
  bookingId: string;
  reason: string;
}

interface RescheduleData {
  rescheduleTo: string;
}

export const bookingsApi = {
  getBookings: (query: BookingsQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.status) {
      query.status.forEach((s) => params.append('status[]', s));
    }
    const queryString = params.toString();
    const endpoint = queryString ? `/bookings?${queryString}` : '/bookings';
    return apiClient.get<{ bookings: Booking[]; meta: { page: number; limit: number; total: number; hasMore: boolean } }>(endpoint);
  },

  getBookingsV2: (query: BookingsQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.status) {
      query.status.forEach((s) => params.append('status[]', s));
    }
    if (query.bookingType) {
      query.bookingType.forEach((t) => params.append('bookingType[]', t));
    }
    const queryString = params.toString();
    const endpoint = queryString ? `/bookings/v2?${queryString}` : '/bookings/v2';
    return apiClient.get<{ bookings: Booking[]; meta: { page: number; limit: number; total: number; hasMore: boolean } }>(endpoint);
  },

  getBookingById: (id: string) => apiClient.get<Booking>(`/bookings/${id}`),

  getLatestBooking: (userId: string) =>
    apiClient.get<Booking>(`/bookings/get-user-latest-booking/${userId}`),

  getSlots: (params: { lat: number; lng: number; bookingType?: BookingType; time?: string; days?: number }) => {
    const searchParams = new URLSearchParams();
    searchParams.append('lat', params.lat.toString());
    searchParams.append('lng', params.lng.toString());
    if (params.bookingType) searchParams.append('bookingType', params.bookingType);
    if (params.time) searchParams.append('time', params.time);
    if (params.days) searchParams.append('days', params.days.toString());
    return apiClient.get<{ slots: Record<string, BookingSlot[]>; availableDates: string[] }>(
      `/bookings/slots?${searchParams.toString()}`
    );
  },

  getPartnerLocation: (bookingId: string) =>
    apiClient.get<{ location: PartnerLocation | null }>(`/bookings/${bookingId}/partner-location`),

  getChildBookings: (bookingId: string) =>
    apiClient.get<{ parentBooking: Booking; instances: unknown[] }>(`/bookings/child-bookings/${bookingId}`),

  getRefundDetails: (bookingId: string) =>
    apiClient.get<{ booking: Booking; refunds: RefundDetails[] }>(`/bookings/refund/${bookingId}`),

  getBridgingContext: (bookingId: string) =>
    apiClient.get<{ bookingId: string; status: string; partnerId?: string }>(`/bookings/bridging/context/instance/${bookingId}`),

  createBooking: (data: CreateBookingData, idempotencyKey?: string) =>
    apiClient.post<{ booking: { id: string; bookingNumber: string; status: string; totalAmount: string }; order: { id: string; orderNumber: string; amount: string } | null }>(
      '/bookings',
      data
    ),

  cancelBooking: (data: CancelBookingData) =>
    apiClient.post<{ cancelled: boolean; bookingId: string }>('/bookings/cancel', data),

  extendBooking: (data: { bookingId: string; additionalItems: { catalogId: string; quantity: number }[]; paymentMethodId?: string }, idempotencyKey?: string) =>
    apiClient.post<{ bookingId: string; extensionOrder: { id: string; orderNumber: string; amount: string }; newTotal: string }>('/bookings/extend', data),

  rescheduleInstance: (instanceId: string, data: RescheduleData) =>
    apiClient.post<{ rescheduled: boolean; instanceId: string }>(`/bookings/instance/${instanceId}/reschedule`, data),

  cancelInstance: (instanceId: string, data: { reason: string }) =>
    apiClient.put<{ cancelled: boolean; instanceId: string }>(`/bookings/cancelInstance/${instanceId}`, data),
};
