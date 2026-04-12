import { apiClient } from "../api-client";
import type { PartnerBookingListItem, PartnerProfile } from "../../types/api";

export const partnersApi = {
  getMe: () => apiClient.get<PartnerProfile>("/partners/me"),

  getMyBookings: () => apiClient.get<PartnerBookingListItem[]>("/partners/me/bookings"),

  updateStatus: (
    partnerId: string,
    data: {
      status: "EN_ROUTE" | "ARRIVED" | "WORKING" | "COMPLETED";
      bookingId: string;
    }
  ) => apiClient.put<{ updated: boolean; status: string }>(`/partners/${partnerId}/status`, data),

  updateLocation: (
    partnerId: string,
    data: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
    }
  ) => apiClient.put<{ updated: boolean }>(`/partners/${partnerId}/location`, data),

  acknowledgeRelease: (partnerId: string, bookingId: string) =>
    apiClient.post<{ acknowledged: boolean; bookingId: string }>(
      `/partners/${partnerId}/acknowledge-release`,
      { bookingId }
    ),
};
