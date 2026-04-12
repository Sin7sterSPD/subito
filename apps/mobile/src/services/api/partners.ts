import { apiClient } from '../api-client';
import { Partner, PartnerStatus } from '../../types/api';

interface AvailablePartnersData {
  latitude: number;
  longitude: number;
  serviceType?: string;
}

interface AssignPartnerData {
  bookingId: string;
  partnerId: string;
}

interface UpdatePartnerStatusData {
  status: PartnerStatus;
  location?: { lat: number; lng: number };
}

interface PartnerRating {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export const partnersApi = {
  getAvailablePartners: (data: AvailablePartnersData) =>
    apiClient.post<Partner[]>('/partners/available', data),

  assignPartner: (data: AssignPartnerData) =>
    apiClient.post<{ success: boolean; bookingId: string; partnerId: string }>('/partners/assign', data),

  getPartner: (partnerId: string) =>
    apiClient.get<Partner>(`/partners/${partnerId}`),

  updatePartnerStatus: (partnerId: string, data: UpdatePartnerStatusData) =>
    apiClient.put<{ success: boolean }>(`/partners/${partnerId}/status`, data),

  getPartnerRatings: (partnerId: string) =>
    apiClient.get<PartnerRating[]>(`/partners/${partnerId}/ratings`),
};
