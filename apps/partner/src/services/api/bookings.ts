import { apiClient } from "../api-client";

/** Full booking payload from GET /bookings/:id (partner-scoped). */
export type PartnerBookingDetail = Record<string, unknown>;

export const bookingsApi = {
  getById: (id: string) => apiClient.get<PartnerBookingDetail>(`/bookings/${id}`),
};
