import { apiClient } from "../api-client"
import type { PartnerBookingDetail } from "../../types/api"

export const bookingsApi = {
  getById: (id: string) =>
    apiClient.get<PartnerBookingDetail>(`/bookings/${id}`),
}
